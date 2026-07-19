(() => {
  const { showCaptureInsertNotePicker } = globalThis.SnipazeNotePicker;

  const ROOT_ID = "snip-ocr-root";

  let deps = null;

  function init(injectedDeps) {
    deps = injectedDeps;
  }

  function show({
    type,
    text = "",
    imageDataUrl = "",
    confidence = null,
  }) {
    globalThis.SnipazeCaptureFlow.removeRoot();
    globalThis.SnipazeCaptureFlow.ensureStyles();

    const captureType = type === "screenshot" ? "Screenshot" : "OCR";
    const isScreenshot = type === "screenshot";
    const isReloadWarning =
      text.trim() === "Extension reloaded. Please refresh the page." &&
      !imageDataUrl;
    const metadata = deps.getCaptureMetadata(captureType);
    const root = document.createElement("div");
    root.id = ROOT_ID;

    const backdrop = document.createElement("div");
    backdrop.className = "snip-ocr-modal-backdrop";
    backdrop.addEventListener("click", () => {
      if (root.classList.contains("snip-ocr-minimized")) return;
      root.classList.add("snip-ocr-backgrounded");
      deps.setSidebarOpen(true);
    });

    const modal = document.createElement("div");
    modal.className = "snip-ocr-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-label", `${captureType} result`);
    modal.addEventListener("pointerdown", () => {
      root.classList.remove("snip-ocr-backgrounded");
    });

    const header = document.createElement("div");
    header.className = "snip-ocr-modal-header";

    const title = document.createElement("div");
    title.className = "snip-ocr-title";
    title.textContent = `${captureType} result`;

    const confidenceBadge = document.createElement("span");
    confidenceBadge.className = "snip-ocr-confidence";
    const numericConfidence = Number(confidence);
    const showConfidence =
      Number.isFinite(numericConfidence) &&
      numericConfidence > 0 &&
      Boolean(text);
    confidenceBadge.textContent =
      numericConfidence >= 80 ? "High confidence" : "May need review";
    confidenceBadge.dataset.level = numericConfidence >= 80 ? "high" : "review";
    confidenceBadge.hidden = !showConfidence;

    const headerActions = document.createElement("div");
    headerActions.className = "snip-ocr-header-actions";

    const minimize = document.createElement("button");
    minimize.className = "snip-ocr-icon-button snip-ocr-minimize";
    minimize.type = "button";
    minimize.title = "Minimize";
    minimize.textContent = "−";
    minimize.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      root.classList.add("snip-ocr-minimized");
      root.classList.remove("snip-ocr-backgrounded");
      deps.setSidebarOpen(true);
    });

    const restore = document.createElement("button");
    restore.className = "snip-ocr-icon-button snip-ocr-restore";
    restore.type = "button";
    restore.title = "Restore";
    restore.textContent = "□";
    restore.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      root.classList.remove("snip-ocr-minimized", "snip-ocr-backgrounded");
    });

    const close = document.createElement("button");
    close.className = "snip-ocr-icon-button";
    close.type = "button";
    close.title = "Close";
    close.textContent = "✕";
    close.addEventListener("click", () => globalThis.SnipazeCaptureFlow.removeRoot());

    const body = document.createElement("textarea");
    body.className = "snip-ocr-text";
    body.value = text || "";
    body.placeholder = imageDataUrl ? "No extracted text." : "No text found.";
    body.readOnly = true;

    const preview = document.createElement("img");
    preview.className = "snip-ocr-result-image";
    preview.src = imageDataUrl;
    preview.alt = `${captureType} screenshot preview`;
    preview.hidden = !imageDataUrl;

    const insertChoice = document.createElement("select");
    insertChoice.className = "snip-ocr-insert-choice";
    insertChoice.setAttribute("aria-label", "Choose insert content");
    insertChoice.innerHTML = `
      <option value="text">Text only</option>
      <option value="image">Screenshot only</option>
      <option value="both">Text + Screenshot</option>
    `;
    insertChoice.value =
      imageDataUrl && text ? "both" : imageDataUrl ? "image" : "text";
    insertChoice.hidden = isScreenshot;

    const syncCaptureResultView = () => {
      if (isScreenshot) {
        body.hidden = Boolean(imageDataUrl);
        preview.hidden = !imageDataUrl;
        modal.dataset.viewMode = imageDataUrl ? "image" : "text";
        return;
      }
      const showText = insertChoice.value !== "image";
      const showImage = insertChoice.value !== "text" && Boolean(imageDataUrl);
      body.hidden = !showText;
      preview.hidden = !showImage;
      modal.dataset.viewMode = insertChoice.value;
    };
    const blockStaleChoice = (event) => {
      if (!isReloadWarning && root.dataset.extensionReloaded !== "true") return;
      event.preventDefault();
      event.stopPropagation();
      flashReloadWarning(body);
    };
    insertChoice.addEventListener("click", blockStaleChoice);
    insertChoice.addEventListener("change", (event) => {
      if (isReloadWarning || root.dataset.extensionReloaded === "true") {
        blockStaleChoice(event);
        return;
      }
      syncCaptureResultView();
    });

    const footer = document.createElement("div");
    footer.className = "snip-ocr-footer";

    const copy = document.createElement("button");
    copy.className = "snip-ocr-copy";
    copy.type = "button";
    copy.textContent = "Copy";
    copy.addEventListener("click", async () => {
      if (isReloadWarning || root.dataset.extensionReloaded === "true") {
        flashReloadWarning(body);
        return;
      }
      if (imageDataUrl && (!text || insertChoice.value === "image")) {
        await copyImage(imageDataUrl, preview);
      } else {
        await copyText(text || "", body);
      }
      copy.textContent = "Copied";
      setTimeout(() => {
        copy.textContent = "Copy";
      }, 1200);
    });

    const create = document.createElement("button");
    create.className = "snip-ocr-copy";
    create.type = "button";
    create.textContent = "Create Note";
    create.addEventListener("click", () => {
      if (isReloadWarning || root.dataset.extensionReloaded === "true") {
        flashReloadWarning(body);
        return;
      }
      showCaptureInsertNotePicker({
        text: body.value,
        imageDataUrl,
        metadata,
        include: getCaptureInclude(
          isScreenshot ? "image" : insertChoice.value,
          { text: body.value, imageDataUrl },
        ),
        fallbackTitle: deps.createTitleFromText(
          body.value || `${captureType} capture`,
        ),
        createOnly: true,
        autoOpenCreate: true,
        onInserted: () => {
          create.textContent = "Created";
          setTimeout(() => globalThis.SnipazeCaptureFlow.removeRoot(), 450);
        },
      });
    });

    const insert = document.createElement("button");
    insert.className = "snip-ocr-copy";
    insert.type = "button";
    insert.textContent = "Insert into Note";
    insert.addEventListener("click", async () => {
      if (isReloadWarning || root.dataset.extensionReloaded === "true") {
        flashReloadWarning(body);
        return;
      }
      const include = getCaptureInclude(
        isScreenshot ? "image" : insertChoice.value,
        { text: body.value, imageDataUrl },
      );
      const insertedAtCursor = await deps.insertInlineCaptureIntoFocusedNote({
        html: deps.createCaptureInlineHtml({ text: body.value, imageDataUrl, metadata, include }),
        plainText: body.value || "Capture",
      });
      if (insertedAtCursor) {
        setTimeout(() => globalThis.SnipazeCaptureFlow.removeRoot(), 250);
        return;
      }
      showCaptureInsertNotePicker({
        text: body.value,
        imageDataUrl,
        metadata,
        include,
        fallbackTitle: deps.createTitleFromText(
          body.value || `${captureType} capture`,
        ),
        onInserted: () => setTimeout(() => globalThis.SnipazeCaptureFlow.removeRoot(), 250),
      });
    });

    headerActions.append(minimize, restore, close);
    const titleGroup = document.createElement("div");
    titleGroup.className = "snip-ocr-title-group";
    titleGroup.append(title, confidenceBadge);
    header.append(titleGroup, headerActions);
    footer.append(copy, create, insertChoice, insert);
    if (isReloadWarning) {
      root.dataset.extensionReloaded = "true";
      footer.setAttribute("aria-disabled", "true");
    }
    modal.append(header, preview, body, footer);
    root.append(backdrop, modal);
    document.documentElement.append(root);
    syncCaptureResultView();

    document.addEventListener("keydown", closeModalOnEscape, true);
    if (text) {
      body.focus();
      body.select();
    }
  }

  function flashReloadWarning(body) {
    if (!body) return;
    body.value = "Extension reloaded. Please refresh the page.";
    body.hidden = false;
    body.dataset.reloadBlink = String(
      Number(body.dataset.reloadBlink || "0") + 1,
    );
    body.focus();
    body.select();
    body.animate?.(
      [
        { backgroundColor: "#ffffff", color: "#111827" },
        { backgroundColor: "#fef2f2", color: "#b91c1c" },
        { backgroundColor: "#ffffff", color: "#111827" },
      ],
      { duration: 650, easing: "ease-in-out" },
    );
  }
  function getCaptureInclude(choice, { text, imageDataUrl }) {
    if (choice === "text") return { text: Boolean(text), image: false };
    if (choice === "image")
      return { text: false, image: Boolean(imageDataUrl) };
    return { text: Boolean(text), image: Boolean(imageDataUrl) };
  }

  function closeModalOnEscape(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      globalThis.SnipazeCaptureFlow.removeRoot();
    }
  }

  async function copyText(text, fallbackElement) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      fallbackElement.focus();
      fallbackElement.select();
      document.execCommand("copy");
    }
  }

  async function copyImage(dataUrl, fallbackElement) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type || "image/png"]: blob }),
      ]);
      return;
    } catch {
      fallbackElement.focus();
      fallbackElement.select?.();
      await navigator.clipboard.writeText(dataUrl);
    }
  }

  function cleanup() {
    document.removeEventListener("keydown", closeModalOnEscape, true);
  }

  globalThis.SnipazeCaptureModal = {
    init,
    cleanup,
    show,
  };
})();
