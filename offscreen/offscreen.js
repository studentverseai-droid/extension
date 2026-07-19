let ocrWorkerPromise;
let activeOcrRequestId = null;
const cancelledOcrRequests = new Set();
let ocrQueue = Promise.resolve();

const OCR_CONFIDENCE_RETRY_THRESHOLD = 70;
const OCR_MAX_PIXELS = 8_000_000;
const OCR_MAX_DIMENSION = 3200;

// The offscreen document is a single shared instance for the whole browser, and
// getOcrWorker() returns one singleton Tesseract worker. If two OCR requests
// (e.g. from two different tabs) overlapped, their setOcrLayout()/recognize()
// calls could interleave on that shared worker, applying the wrong page-segmentation
// settings to the wrong image. Routing every OCR job through this queue guarantees
// only one recognizeWithEnhancement() runs against the worker at a time.
function enqueueOcrTask(task) {
  const run = ocrQueue.then(task, task);
  ocrQueue = run.then(() => {}, () => {});
  return run;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target === "offscreen" && message?.type === "CANCEL_OCR") {
    cancelOcr(message.requestId).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (
    message?.target !== "offscreen" ||
    !["OCR_CAPTURE", "CROP_CAPTURE"].includes(message?.type)
  ) {
    return false;
  }

  (async () => {
    const requestId = String(message.requestId || "");
    try {
      const croppedDataUrl = await cropCapture(
        message.dataUrl,
        message.rect,
        message.viewport
      );

      if (message.type === "CROP_CAPTURE") {
        sendResponse({
          ok: true,
          dataUrl: croppedDataUrl
        });
        return;
      }

      const result = await enqueueOcrTask(async () => {
        assertOcrNotCancelled(requestId);
        activeOcrRequestId = requestId;
        reportOcrProgress(message, "preparing");
        try {
          return await recognizeWithEnhancement(croppedDataUrl, message);
        } finally {
          if (activeOcrRequestId === requestId) activeOcrRequestId = null;
        }
      });

      sendResponse({
        ok: true,
        text: (result.data.text || "").trim(),
        confidence: Number(result.data.confidence) || 0
      });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error?.message || String(error) || "OCR failed."
      });
    } finally {
      cancelledOcrRequests.delete(requestId);
    }
  })();

  return true;
});

async function recognizeWithEnhancement(originalDataUrl, context) {
  const requestId = String(context.requestId || "");
  const worker = await getOcrWorker();

  try {
    assertOcrNotCancelled(requestId);
    const image = await loadImage(originalDataUrl);
    const profile = getOcrProfile(image.naturalWidth, image.naturalHeight);
    const primaryDataUrl = createEnhancedOcrImage(image, {
      scale: profile.scale,
      adaptiveThreshold: false
    });

    await setOcrLayout(worker, profile.primaryPageSegMode);
    reportOcrProgress(context, "reading");
    const primaryResult = await worker.recognize(primaryDataUrl);
    assertOcrNotCancelled(requestId);

    if (!shouldRetryOcr(primaryResult)) {
      return primaryResult;
    }

    try {
      reportOcrProgress(context, "retrying");
      const retryDataUrl = createEnhancedOcrImage(image, {
        scale: profile.scale,
        adaptiveThreshold: true
      });
      await setOcrLayout(worker, profile.retryPageSegMode);
      const retryResult = await worker.recognize(retryDataUrl);
      assertOcrNotCancelled(requestId);
      return chooseBetterOcrResult(primaryResult, retryResult);
    } catch {
      return primaryResult;
    }
  } catch {
    assertOcrNotCancelled(requestId);
    await setOcrLayout(worker, "3").catch(() => {});
    reportOcrProgress(context, "reading");
    return worker.recognize(originalDataUrl);
  }
}

function getOcrProfile(width, height) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const aspectRatio = safeWidth / safeHeight;
  let scale = 1;

  if (safeHeight < 90) {
    scale = 3;
  } else if (safeHeight < 260 || safeWidth < 700) {
    scale = 2;
  }

  scale = Math.min(
    scale,
    OCR_MAX_DIMENSION / Math.max(safeWidth, safeHeight),
    Math.sqrt(OCR_MAX_PIXELS / (safeWidth * safeHeight))
  );

  if (aspectRatio >= 4.5 && safeHeight <= 300) {
    return {
      scale,
      primaryPageSegMode: "7",
      retryPageSegMode: "7"
    };
  }

  if (safeWidth * safeHeight >= 1_400_000 && aspectRatio >= 0.65 && aspectRatio <= 1.8) {
    return {
      scale,
      primaryPageSegMode: "3",
      retryPageSegMode: "6"
    };
  }

  return {
    scale,
    primaryPageSegMode: "6",
    retryPageSegMode: "11"
  };
}

function createEnhancedOcrImage(image, options) {
  const scale = Math.max(1, Number(options?.scale) || 1);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Unable to prepare the image for OCR.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const grayscale = createContrastGrayscale(imageData.data);
  const sharpened = sharpenGrayscale(grayscale, width, height);
  const prepared = options?.adaptiveThreshold
    ? adaptiveThreshold(sharpened, width, height)
    : normalizeDarkBackground(sharpened);

  for (let pixel = 0, offset = 0; pixel < prepared.length; pixel += 1, offset += 4) {
    const value = prepared[pixel];
    imageData.data[offset] = value;
    imageData.data[offset + 1] = value;
    imageData.data[offset + 2] = value;
    imageData.data[offset + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

function createContrastGrayscale(rgba) {
  const grayscale = new Uint8ClampedArray(rgba.length / 4);
  const histogram = new Uint32Array(256);
  let sum = 0;

  for (let offset = 0, pixel = 0; offset < rgba.length; offset += 4, pixel += 1) {
    const value = Math.round(
      (rgba[offset] * 0.299) +
      (rgba[offset + 1] * 0.587) +
      (rgba[offset + 2] * 0.114)
    );
    grayscale[pixel] = value;
    histogram[value] += 1;
    sum += value;
  }

  const low = findHistogramPercentile(histogram, grayscale.length, 0.02);
  const high = findHistogramPercentile(histogram, grayscale.length, 0.98);
  const midpoint = (low + high) / 2;
  const contrast = Math.min(1.6, 255 / Math.max(32, high - low));
  const average = sum / Math.max(1, grayscale.length);
  const invert = average < 105;

  for (let index = 0; index < grayscale.length; index += 1) {
    let value = 128 + ((grayscale[index] - midpoint) * contrast);
    value = clamp(Math.round(value), 0, 255);
    grayscale[index] = invert ? 255 - value : value;
  }

  return grayscale;
}

function findHistogramPercentile(histogram, total, percentile) {
  const target = Math.max(0, Math.min(total - 1, Math.floor(total * percentile)));
  let count = 0;
  for (let value = 0; value < histogram.length; value += 1) {
    count += histogram[value];
    if (count > target) return value;
  }
  return 255;
}

function sharpenGrayscale(source, width, height) {
  if (width < 3 || height < 3) return source;
  const output = new Uint8ClampedArray(source);
  const amount = 0.35;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = (y * width) + x;
      const neighborAverage = (
        source[index - 1] +
        source[index + 1] +
        source[index - width] +
        source[index + width]
      ) / 4;
      output[index] = clamp(
        Math.round(source[index] + (amount * (source[index] - neighborAverage))),
        0,
        255
      );
    }
  }

  return output;
}

function normalizeDarkBackground(source) {
  let darkPixels = 0;
  for (const value of source) {
    if (value < 128) darkPixels += 1;
  }
  if (darkPixels <= source.length * 0.58) return source;

  const output = new Uint8ClampedArray(source.length);
  for (let index = 0; index < source.length; index += 1) {
    output[index] = 255 - source[index];
  }
  return output;
}

function adaptiveThreshold(source, width, height) {
  const normalized = normalizeDarkBackground(source);
  const integralWidth = width + 1;
  const integral = new Uint32Array(integralWidth * (height + 1));
  const output = new Uint8ClampedArray(source.length);
  const radius = Math.max(8, Math.min(24, Math.round(Math.min(width, height) / 18)));

  for (let y = 1; y <= height; y += 1) {
    let rowSum = 0;
    for (let x = 1; x <= width; x += 1) {
      rowSum += normalized[((y - 1) * width) + (x - 1)];
      integral[(y * integralWidth) + x] =
        integral[((y - 1) * integralWidth) + x] + rowSum;
    }
  }

  for (let y = 0; y < height; y += 1) {
    const top = Math.max(0, y - radius);
    const bottom = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x += 1) {
      const left = Math.max(0, x - radius);
      const right = Math.min(width - 1, x + radius);
      const area = (right - left + 1) * (bottom - top + 1);
      const sum =
        integral[((bottom + 1) * integralWidth) + (right + 1)] -
        integral[(top * integralWidth) + (right + 1)] -
        integral[((bottom + 1) * integralWidth) + left] +
        integral[(top * integralWidth) + left];
      const localMean = sum / area;
      const index = (y * width) + x;
      output[index] = normalized[index] < localMean - 9 ? 0 : 255;
    }
  }

  return output;
}

async function setOcrLayout(worker, pageSegMode) {
  await worker.setParameters({
    tessedit_pageseg_mode: String(pageSegMode),
    preserve_interword_spaces: "1"
  });
}

function shouldRetryOcr(result) {
  const text = String(result?.data?.text || "").trim();
  const confidence = Number(result?.data?.confidence);
  return !text || !Number.isFinite(confidence) || confidence < OCR_CONFIDENCE_RETRY_THRESHOLD;
}

function chooseBetterOcrResult(primary, retry) {
  const primaryText = String(primary?.data?.text || "").trim();
  const retryText = String(retry?.data?.text || "").trim();
  if (!primaryText) return retry;
  if (!retryText) return primary;

  const primaryScore = getOcrResultScore(primary);
  const retryScore = getOcrResultScore(retry);
  return retryScore > primaryScore ? retry : primary;
}

function getOcrResultScore(result) {
  const text = String(result?.data?.text || "").trim();
  const confidence = Number(result?.data?.confidence);
  const readableCharacters = (text.match(/[A-Za-z0-9]/g) || []).length;
  const suspiciousCharacters = (text.match(/[�□■]/g) || []).length;
  return (Number.isFinite(confidence) ? confidence : 0)
    + Math.min(8, readableCharacters / 20)
    - (suspiciousCharacters * 3);
}

async function cropCapture(dataUrl, rect, viewport) {
  const image = await loadImage(dataUrl);
  const viewportWidth = Math.max(1, Number(viewport?.width) || image.naturalWidth);
  const viewportHeight = Math.max(1, Number(viewport?.height) || image.naturalHeight);
  const scaleX = image.naturalWidth / viewportWidth;
  const scaleY = image.naturalHeight / viewportHeight;
  const cropLeft = clamp(Math.round(rect.left * scaleX), 0, image.naturalWidth - 1);
  const cropTop = clamp(Math.round(rect.top * scaleY), 0, image.naturalHeight - 1);
  const cropWidth = clamp(
    Math.round(rect.width * scaleX),
    1,
    image.naturalWidth - cropLeft
  );
  const cropHeight = clamp(
    Math.round(rect.height * scaleY),
    1,
    image.naturalHeight - cropTop
  );

  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    cropLeft,
    cropTop,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  return canvas.toDataURL("image/png");
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load captured image."));
    image.src = src;
  });
}

async function getOcrWorker() {
  if (!ocrWorkerPromise) {
    const base = chrome.runtime.getURL("vendor/tesseract/");

    ocrWorkerPromise = Tesseract.createWorker("eng", 1, {
      workerPath: `${base}worker.min.js`,
      workerBlobURL: false,
      corePath: `${base}tesseract-core-lstm.wasm.js`,
      langPath: `${base}lang-data`,
      cacheMethod: "none",
      gzip: true
    });
  }

  return ocrWorkerPromise;
}


function reportOcrProgress(context, status) {
  chrome.runtime.sendMessage({ target: "background", type: "OCR_PROGRESS", tabId: context.tabId, requestId: context.requestId, status }).catch(() => {});
}

function isOcrCancelled(requestId) {
  return cancelledOcrRequests.has(String(requestId || ""));
}

function assertOcrNotCancelled(requestId) {
  if (isOcrCancelled(requestId)) throw new Error("OCR cancelled.");
}

async function cancelOcr(requestId) {
  const normalizedId = String(requestId || "");
  cancelledOcrRequests.add(normalizedId);
  if (normalizedId && normalizedId === activeOcrRequestId) await resetOcrWorker();
}

async function resetOcrWorker() {
  const workerPromise = ocrWorkerPromise;
  ocrWorkerPromise = null;
  if (!workerPromise) return;
  try { const worker = await workerPromise; await worker.terminate(); } catch {}
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
