(() => {
  const HOST_ID = "snip-ocr-floating-host";
  const RESULT_ROOT_ID = "snip-ocr-root";
  const CAPTURE_PICKER_ROOT_ID = "snip-ocr-capture-insert-picker-root";
  const COPY_PICKER_ROOT_ID = "snip-ocr-copy-picker-root";
  const RETIRED_CONTAINER_ID = "snipaze-reload-retired-hosts";
  const RELOAD_MESSAGE = "Extension reloaded. Please refresh the page.";

  function markOpenCaptureAsStale() {
    const root = document.getElementById(RESULT_ROOT_ID);
    if (!root) return;

    const body = root.querySelector(".snip-ocr-text");
    const preview = root.querySelector(".snip-ocr-result-image");
    const footer = root.querySelector(".snip-ocr-footer");
    if (!body && !preview) return;

    if (body) {
      body.value = RELOAD_MESSAGE;
      body.textContent = RELOAD_MESSAGE;
      body.hidden = false;
    }
    if (preview) {
      preview.hidden = true;
      preview.removeAttribute("src");
    }
    if (footer) footer.setAttribute("aria-disabled", "true");
    document.getElementById(CAPTURE_PICKER_ROOT_ID)?.remove();
    root.classList.remove("snip-ocr-minimized", "snip-ocr-backgrounded");
    root.dataset.extensionReloaded = "true";
  }

  function flashReloadWarning(body) {
    if (!body) return;
    body.value = RELOAD_MESSAGE;
    body.textContent = RELOAD_MESSAGE;
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

  function blockStaleResultAction(event) {
    const control = event.target?.closest?.(
      ".snip-ocr-footer button, .snip-ocr-footer select",
    );
    if (!control) return;
    const root = control.closest(`#${RESULT_ROOT_ID}`);
    const body = root?.querySelector(".snip-ocr-text");
    const isStale =
      root?.dataset.extensionReloaded === "true" ||
      body?.value?.trim() === RELOAD_MESSAGE;
    if (!isStale) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    root.dataset.extensionReloaded = "true";
    root.querySelector(".snip-ocr-footer")?.setAttribute(
      "aria-disabled",
      "true",
    );
    document.getElementById(CAPTURE_PICKER_ROOT_ID)?.remove();
    flashReloadWarning(body);
  }
  function ensureReloadResultStyles() {
    const styleId = "snipaze-reload-result-styles";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = globalThis.SnipazeReloadGuardStyles
      ? globalThis.SnipazeReloadGuardStyles(RESULT_ROOT_ID)
      : "";

    document.documentElement.append(style);
  }

  function showReloadResult(type) {
    ensureReloadResultStyles();
    document.getElementById(CAPTURE_PICKER_ROOT_ID)?.remove();
    document.getElementById(RESULT_ROOT_ID)?.remove();

    const captureType = type === "ocr" ? "OCR" : "Screenshot";
    const root = document.createElement("div");
    root.id = RESULT_ROOT_ID;
    root.dataset.extensionReloaded = "true";

    const backdrop = document.createElement("div");
    backdrop.className = "snip-ocr-modal-backdrop";
    backdrop.addEventListener("click", () => {
      if (!root.classList.contains("snip-ocr-minimized"))
        root.classList.add("snip-ocr-backgrounded");
    });

    const modal = document.createElement("div");
    modal.className = "snip-ocr-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-label", `${captureType} result`);
    modal.addEventListener("pointerdown", () =>
      root.classList.remove("snip-ocr-backgrounded"),
    );

    const header = document.createElement("div");
    header.className = "snip-ocr-modal-header";
    const title = document.createElement("div");
    title.className = "snip-ocr-title";
    title.textContent = `${captureType} result`;
    const actions = document.createElement("div");
    actions.className = "snip-ocr-header-actions";

    const minimize = document.createElement("button");
    minimize.className = "snip-ocr-icon-button snip-ocr-minimize";
    minimize.type = "button";
    minimize.title = "Minimize";
    minimize.textContent = "\u2212";
    minimize.addEventListener("click", () => {
      root.classList.add("snip-ocr-minimized");
      root.classList.remove("snip-ocr-backgrounded");
      Object.assign(modal.style, { top: "18px", right: "12px", bottom: "auto" });
    });

    const restore = document.createElement("button");
    restore.className = "snip-ocr-icon-button snip-ocr-restore";
    restore.type = "button";
    restore.title = "Restore";
    restore.textContent = "\u25a1";
    restore.addEventListener("click", () => {
      root.classList.remove("snip-ocr-minimized", "snip-ocr-backgrounded");
      Object.assign(modal.style, { top: "18px", right: "12px", bottom: "auto" });
    });

    const close = document.createElement("button");
    close.className = "snip-ocr-icon-button";
    close.type = "button";
    close.title = "Close";
    close.textContent = "\u2715";
    close.addEventListener("click", () => root.remove());

    const body = document.createElement("textarea");
    body.className = "snip-ocr-text";
    body.value = RELOAD_MESSAGE;
    body.readOnly = true;

    const footer = document.createElement("div");
    footer.className = "snip-ocr-footer";
    footer.setAttribute("aria-disabled", "true");
    for (const label of ["Copy", "Create Note"]) {
      const button = document.createElement("button");
      button.className = "snip-ocr-copy";
      button.type = "button";
      button.textContent = label;
      footer.append(button);
    }
    if (captureType === "OCR") {
      const select = document.createElement("select");
      select.className = "snip-ocr-insert-choice";
      select.innerHTML =
        '<option>Text only</option><option>Screenshot only</option><option>Text + Screenshot</option>';
      footer.append(select);
    }
    const insert = document.createElement("button");
    insert.className = "snip-ocr-copy";
    insert.type = "button";
    insert.textContent = "Insert into Note";
    footer.append(insert);

    actions.append(minimize, restore, close);
    header.append(title, actions);
    modal.append(header, body, footer);
    root.append(backdrop, modal);
    document.documentElement.append(root);
    body.focus();
    body.select();
  }

  function requestCurrentGeneration() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(
          { type: "GET_EXTENSION_GENERATION" },
          (response) => {
            if (chrome.runtime.lastError) return resolve(null);
            resolve(response?.ok ? response.generation || null : null);
          },
        );
      } catch {
        resolve(null);
      }
    });
  }

  async function belongsToOlderGeneration() {
    const host = document.getElementById(HOST_ID);
    if (!host) return false;
    let pageGeneration = host.dataset.snipazeGeneration || "";
    if (!pageGeneration) {
      await new Promise((resolve) => setTimeout(resolve, 60));
      pageGeneration = host.dataset.snipazeGeneration || "";
    }
    const currentGeneration = await requestCurrentGeneration();
    return (
      !pageGeneration ||
      !currentGeneration ||
      pageGeneration !== currentGeneration
    );
  }

  function installReloadCommandListener() {
    if (globalThis.__snipazeReloadCommandListenerInstalled) return;
    globalThis.__snipazeReloadCommandListenerInstalled = true;
    try {
      chrome.runtime.onMessage.addListener((message) => {
        if (message?.type === "SYNC_AUTO_SAVE_SETTING") {
          const host = document.getElementById(HOST_ID);
          if (host) {
            host.dataset.snipazeAutoSave = String(message.enabled === true);
          }
          return;
        }
        const type =
          message?.type === "TOOLBAR_CAPTURE_SCREENSHOT"
            ? "screenshot"
            : message?.type === "TOOLBAR_EXTRACT_OCR"
              ? "ocr"
              : "";
        if (!type) return;
        void belongsToOlderGeneration().then((isOlder) => {
          if (isOlder) showReloadResult(type);
        });
      });
    } catch {}
  }

  function showCopyReloadNotice() {
    const id = "snipaze-reload-copy-notice";
    let notice = document.getElementById(id);
    if (!notice) {
      notice = document.createElement("div");
      notice.id = id;
      notice.className = "snipaze-reload-copy-notice";
      notice.textContent = RELOAD_MESSAGE;
      document.documentElement.append(notice);
    }
    notice.animate?.(
      [{ opacity: 0.35 }, { opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }],
      { duration: 700, easing: "ease-in-out" },
    );
    clearTimeout(notice._removeTimer);
    notice._removeTimer = setTimeout(() => notice.remove(), 2800);
  }

  function blockStaleCopiedTextPicker() {
    const host = document.getElementById(HOST_ID);
    if (host?.dataset.snipazeAutoSave !== "true") return;
    void belongsToOlderGeneration().then((isOlder) => {
      if (!isOlder) return;
      setTimeout(() => {
        document.getElementById(COPY_PICKER_ROOT_ID)?.remove();
        showCopyReloadNotice();
      }, 0);
    });
  }
  installReloadCommandListener();
  if (globalThis.__snipazeReloadGuardInstalled) {
    markOpenCaptureAsStale();
    return;
  }
  globalThis.__snipazeReloadGuardInstalled = true;
  function getRetiredContainer() {
    let container = document.getElementById(RETIRED_CONTAINER_ID);
    if (container) return container;
    container = document.createElement("div");
    container.id = RETIRED_CONTAINER_ID;
    container.hidden = true;
    container.inert = true;
    container.setAttribute("aria-hidden", "true");
    container.style.setProperty("display", "none", "important");
    document.documentElement.append(container);
    return container;
  }

  function suppressDuplicateHosts() {
    const hosts = [...document.querySelectorAll(`#${HOST_ID}`)];
    if (hosts.length <= 1) return;
    const container = getRetiredContainer();
    hosts.slice(1).forEach((host, index) => {
      host.id = `snipaze-reload-retired-host-${Date.now()}-${index}`;
      host.hidden = true;
      host.inert = true;
      host.style.setProperty("display", "none", "important");
      host.style.setProperty("pointer-events", "none", "important");
      container.append(host);
    });
  }

  document.addEventListener("click", blockStaleResultAction, true);
  document.addEventListener("change", blockStaleResultAction, true);
  document.addEventListener("copy", blockStaleCopiedTextPicker, true);
  document.addEventListener(
    "dragstart",
    (event) => {
      if (event.composedPath().some((node) => node?.id === HOST_ID)) {
        event.preventDefault();
      }
    },
    true,
  );

  new MutationObserver(suppressDuplicateHosts).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  suppressDuplicateHosts();
})();
