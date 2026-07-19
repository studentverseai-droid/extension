(() => {
  function onPageCopy(event, deps) {
    if (deps.getGeneration() !== deps.scriptGeneration) return;
    if (deps.hasSelectionState()) return;
    if (!deps.isAutoSaveEnabled()) return;
    if (
      event
        .composedPath?.()
        .some((node) => node?.id === deps.floatingHostId || node?.id === deps.rootId)
    ) {
      return;
    }

    const text = String(deps.getSelectionText?.() || "").trim();
    if (!text) return;

    void deps.handleCopiedText(text);
  }

  async function handleCopiedText(text, deps) {
    if (await deps.wasExtensionReloadedOnPage()) {
      deps.closeCopiedTextNotePicker();
      deps.showCopyReloadNotice();
      return;
    }
    deps.showCopiedTextNotePicker(text, deps.getCaptureMetadata("Copied Text"));
  }

  function showReloadNotice(doc = document) {
    const id = "snipaze-reload-copy-notice";
    let notice = doc.getElementById(id);
    if (!notice) {
      notice = doc.createElement("div");
      notice.id = id;
      notice.className = "snipaze-reload-copy-notice";
      notice.textContent = "Extension reloaded. Please refresh the page.";
      doc.documentElement.append(notice);
    }
    notice.animate?.(
      [{ opacity: 0.35 }, { opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }],
      { duration: 700, easing: "ease-in-out" },
    );
    clearTimeout(notice._removeTimer);
    notice._removeTimer = setTimeout(() => notice.remove(), 2800);
  }

  globalThis.SnipazeClipboardCapture = {
    handleCopiedText,
    onPageCopy,
    showReloadNotice,
  };
})();
