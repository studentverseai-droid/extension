(() => {
  const {
    showCopiedTextNotePicker,
    closeCopiedTextNotePicker,
    showCaptureInsertNotePicker,
    closeCaptureInsertNotePicker,
    cleanup: cleanupNotePicker,
    ensureStyles,
  } = globalThis.SnipazeNotePicker;

  const ROOT_ID = "snip-ocr-root";
  const COPY_PICKER_ROOT_ID = "snip-ocr-copy-picker-root";
  const CAPTURE_INSERT_PICKER_ROOT_ID = "snip-ocr-capture-insert-picker-root";
  const MIN_SIZE = 8;

  let deps = null;
  let selectionState = null;
  let lastOcrConfidence = null;
  let extensionGenerationPromise = null;

  function init(injectedDeps) {
    deps = injectedDeps;
    extensionGenerationPromise = requestExtensionGeneration();
  }

  function startSelectionMode(options = {}) {
    cleanupSelection();
    removeRoot();
    closeCopiedTextNotePicker();

    const mode = options.mode || "ocr";
    const root = document.createElement("div");
    root.id = ROOT_ID;

    const shade = document.createElement("div");
    shade.className = "snip-ocr-shade";

    const box = document.createElement("div");
    box.className = "snip-ocr-box";

    const hint = document.createElement("div");
    hint.className = "snip-ocr-hint";
    const hintText = document.createElement("span");
    hintText.textContent =
      mode === "screenshot"
        ? "Drag to capture a screenshot. Esc cancels."
        : "Drag to select text. Esc cancels.";
    const cancelButton = document.createElement("button");
    cancelButton.className = "snip-ocr-cancel";
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.hidden = true;
    cancelButton.addEventListener("click", cancelActiveOcr);
    hint.append(hintText, cancelButton);

    root.append(shade, box, hint);
    document.documentElement.append(root);
    ensureStyles();

    selectionState = {
      root,
      box,
      hint,
      hintText,
      cancelButton,
      operation: null,
      dragging: false,
      startX: 0,
      startY: 0,
      rect: null,
      mode,
    };

    document.addEventListener("keydown", onKeyDown, true);
    root.addEventListener("pointerdown", onPointerDown, true);
    root.addEventListener("pointermove", onPointerMove, true);
    root.addEventListener("pointerup", onPointerUp, true);
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (selectionState?.operation) cancelActiveOcr();
      else cleanupSelection();
    }
  }

  function onPointerDown(event) {
    if (!selectionState) return;

    event.preventDefault();
    selectionState.dragging = true;
    selectionState.startX = event.clientX;
    selectionState.startY = event.clientY;
    selectionState.rect = null;
    selectionState.root.setPointerCapture(event.pointerId);
    updateSelectionBox(event.clientX, event.clientY);
  }

  function onPointerMove(event) {
    if (!selectionState?.dragging) return;

    event.preventDefault();
    updateSelectionBox(event.clientX, event.clientY);
  }

  async function onPointerUp(event) {
    if (!selectionState?.dragging) return;

    event.preventDefault();
    updateSelectionBox(event.clientX, event.clientY);

    const rect = selectionState.rect;
    const root = selectionState.root;
    selectionState.dragging = false;

    if (!rect || rect.width < MIN_SIZE || rect.height < MIN_SIZE) {
      cleanupSelection();
      return;
    }

    const operation = { requestId: createOcrRequestId(), cancelled: false };
    selectionState.operation = operation;
    root.style.pointerEvents = "none";
    selectionState.hint.style.pointerEvents = "auto";
    setSelectionProgress("Preparing image", true);
    root.classList.add("snip-ocr-busy");

    try {
      if (selectionState.mode === "screenshot") {
        const imageDataUrl = await captureScreenshotSelection(
          rect,
          root,
          operation.requestId,
        );
        const ocrText = await recognizeSelection(
          rect,
          root,
          operation.requestId,
        ).catch(() => "");
        if (operation.cancelled) return;
        cleanupSelection(false);
        globalThis.SnipazeCaptureModal.show({
          type: "screenshot",
          text: ocrText,
          imageDataUrl,
          confidence: lastOcrConfidence,
        });
        return;
      }

      const imageDataUrl = await captureScreenshotSelection(
        rect,
        root,
        operation.requestId,
      ).catch(() => "");
      const text = await recognizeSelection(rect, root, operation.requestId);
      if (operation.cancelled) return;
      cleanupSelection(false);
      globalThis.SnipazeCaptureModal.show({
        type: "ocr",
        text: text || "",
        imageDataUrl,
        confidence: lastOcrConfidence,
      });
    } catch (error) {
      if (operation.cancelled || /OCR cancelled/i.test(error?.message || ""))
        return;
      cleanupSelection(false);
      globalThis.SnipazeCaptureModal.show({
        type: "ocr",
        text: error?.message || "OCR failed.",
        imageDataUrl: "",
      });
    }
  }

  function updateSelectionBox(currentX, currentY) {
    const left = Math.min(selectionState.startX, currentX);
    const top = Math.min(selectionState.startY, currentY);
    const width = Math.abs(currentX - selectionState.startX);
    const height = Math.abs(currentY - selectionState.startY);

    selectionState.rect = { left, top, width, height };
    Object.assign(selectionState.box.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
  }

  async function recognizeSelection(rect, overlayRoot, requestId) {
    return processSelectedArea(
      "PROCESS_SELECTION",
      rect,
      overlayRoot,
      "text",
      requestId,
    );
  }

  async function captureScreenshotSelection(rect, overlayRoot, requestId) {
    return processSelectedArea(
      "PROCESS_SCREENSHOT",
      rect,
      overlayRoot,
      "dataUrl",
      requestId,
    );
  }

  async function captureVisibleScreenshot() {
    return captureWithFloatingUiHidden(() =>
      sendCaptureRequest("PROCESS_VISIBLE_SCREENSHOT", null, "dataUrl"),
    );
  }

  async function processSelectedArea(
    type,
    rect,
    overlayRoot,
    responseKey,
    requestId,
  ) {
    if (!hasExtensionRuntime()) {
      throw new Error("Extension reloaded. Please refresh the page.");
    }

    overlayRoot.style.visibility = "hidden";
    await nextFrame();
    await nextFrame();

    try {
      let response;
      try {
        response = await sendCaptureRequest(type, rect, null, requestId);
      } catch (error) {
        throw new Error(normalizeCaptureError(error));
      }

      if (!response?.ok) {
        throw new Error(
          normalizeCaptureError(
            response?.error || "Unable to process the selection.",
          ),
        );
      }

      if (responseKey === "text")
        lastOcrConfidence = Number(response.confidence) || 0;
      return response[responseKey] || "";
    } finally {
      overlayRoot.style.visibility = "";
    }
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
  }

  function hasExtensionRuntime() {
    try {
      return Boolean(globalThis.chrome?.runtime?.id);
    } catch {
      return false;
    }
  }

  async function requestExtensionGeneration() {
    const response = await deps.sendRuntimeMessage({
      type: "GET_EXTENSION_GENERATION",
    });
    return response?.ok && typeof response.generation === "string"
      ? response.generation
      : null;
  }

  async function wasExtensionReloadedOnPage() {
    let originalGeneration = await extensionGenerationPromise;
    if (!originalGeneration) {
      originalGeneration = await requestExtensionGeneration();
      extensionGenerationPromise = Promise.resolve(originalGeneration);
    }
    const currentGeneration = await requestExtensionGeneration();
    return (
      !originalGeneration ||
      !currentGeneration ||
      originalGeneration !== currentGeneration
    );
  }
  async function captureWithFloatingUiHidden(callback) {
    const floatingUi = deps.getFloatingUi();
    const previousSidebarVisibility =
      floatingUi?.sidebar?.style.visibility || "";
    const previousIconVisibility = floatingUi?.icon?.style.visibility || "";
    if (floatingUi?.sidebar) floatingUi.sidebar.style.visibility = "hidden";
    if (floatingUi?.icon) floatingUi.icon.style.visibility = "hidden";
    await nextFrame();
    await nextFrame();
    try {
      return await callback();
    } finally {
      if (floatingUi?.sidebar)
        floatingUi.sidebar.style.visibility = previousSidebarVisibility;
      if (floatingUi?.icon)
        floatingUi.icon.style.visibility = previousIconVisibility;
    }
  }

  async function sendCaptureRequest(type, rect, responseKey, requestId) {
    const response = await deps.sendRuntimeMessage({
      type,
      rect,
      requestId,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
    if (!response) {
      throw new Error("Extension reloaded. Please refresh the page.");
    }
    if (!response.ok) {
      throw new Error(
        normalizeCaptureError(
          response.error || "Unable to process the selection.",
        ),
      );
    }
    return responseKey ? response?.[responseKey] || "" : response;
  }

  function createOcrRequestId() {
    return (
      globalThis.crypto?.randomUUID?.() ||
      `ocr-${Date.now()}-${Math.random().toString(16).slice(2)}`
    );
  }

  function setSelectionProgress(text, canCancel = true) {
    if (!selectionState) return;
    selectionState.hintText.textContent = text;
    selectionState.cancelButton.hidden = !canCancel;
  }

  function updateOcrProgress(message) {
    if (
      !selectionState?.operation ||
      selectionState.operation.requestId !== message.requestId
    )
      return;
    selectionState.root.style.visibility = "";
    const labels = {
      preparing: "Preparing image",
      reading: "Reading text",
      retrying: "Retrying for better accuracy",
    };
    if (labels[message.status])
      setSelectionProgress(labels[message.status], true);
  }

  function cancelActiveOcr(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const operation = selectionState?.operation;
    if (operation) {
      operation.cancelled = true;
      deps.sendRuntimeMessage({
        type: "CANCEL_OCR",
        requestId: operation.requestId,
      });
    }
    cleanupSelection();
  }

  function normalizeCaptureError(error) {
    const message = String(error?.message || error || "");
    if (
      /extension context invalidated|context invalidated|receiving end does not exist|extension capture service is not available/i.test(
        message,
      )
    ) {
      return "Extension reloaded. Please refresh the page.";
    }
    return message || "Unable to process the selection.";
  }

  function onPageCopy(event) {
    globalThis.SnipazeClipboardCapture?.onPageCopy(event, {
      floatingHostId: deps.floatingHostId,
      getGeneration: () => window.__snipOcrGeneration,
      getSelectionText: () => getSelection()?.toString(),
      handleCopiedText,
      hasSelectionState: () => Boolean(selectionState),
      isAutoSaveEnabled: () => deps.workspaceState.autoSaveOnCopy,
      rootId: ROOT_ID,
      scriptGeneration: deps.scriptGeneration,
    });
  }

  async function handleCopiedText(text) {
    return globalThis.SnipazeClipboardCapture?.handleCopiedText(text, {
      closeCopiedTextNotePicker,
      getCaptureMetadata: deps.getCaptureMetadata,
      showCopiedTextNotePicker,
      showCopyReloadNotice,
      wasExtensionReloadedOnPage,
    });
  }

  function showCopyReloadNotice() {
    return globalThis.SnipazeClipboardCapture?.showReloadNotice(document);
  }


  function showSavedPageLinkPicker() {
    globalThis.SnipazePageReference?.show({
      metadata: deps.getCaptureMetadata("Page Reference"),
      showCaptureInsertNotePicker,
    });
  }


  function cleanupSelection(remove = true) {
    if (!selectionState) return;

    document.removeEventListener("keydown", onKeyDown, true);
    selectionState = null;

    if (remove) removeRoot();
  }

  function removeRoot() {
    globalThis.SnipazeCaptureModal?.cleanup();
    closeCaptureInsertNotePicker();
    document.getElementById(ROOT_ID)?.remove();
  }

  function cleanup() {
    document.removeEventListener("keydown", onKeyDown, true);
    globalThis.SnipazeCaptureModal?.cleanup();
    cleanupNotePicker();
  }

  globalThis.SnipazeCaptureFlow = {
    init,
    cleanup,
    startSelectionMode,
    onPageCopy,
    handleCopiedText,
    showCopyReloadNotice,
    showSavedPageLinkPicker,
    updateOcrProgress,
    hasExtensionRuntime,
    wasExtensionReloadedOnPage,
    normalizeCaptureError,
    captureVisibleScreenshot,
    getExtensionGenerationPromise: () => extensionGenerationPromise,
    removeRoot,
    ensureStyles,
  };
})();
