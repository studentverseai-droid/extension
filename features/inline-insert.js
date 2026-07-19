(() => {
  const { escapeAttribute, escapeHtml, sanitizeHtml } = globalThis.SnipazeHtmlUtils;
  const { queueNoteEdit } = globalThis.SnipazeNoteActions;

  let deps = null;
  let pendingNoteInsertionMarkerId = null;

  function init(injectedDeps) {
    deps = injectedDeps;
  }

  function prepareFocusedNoteInsertion() {
    const active = document.activeElement;
    const body = active?.closest?.("[data-note-body]");
    if (!body) return;
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!body.contains(range.commonAncestorContainer)) return;
    const marker = document.createElement("span");
    marker.id = `snipaze-insertion-${deps.createId()}`;
    marker.hidden = true;
    range.insertNode(marker);
    pendingNoteInsertionMarkerId = marker.id;
  }

  function renderNoteExportMenu() {
    return `
      <details class="note-export-menu" draggable="false">
        <summary aria-label="Download note" title="Download note" draggable="false">&#8681;</summary>
        <div class="note-menu-popover">
          <button type="button" data-action="export-note" data-format="txt">TXT</button>
          <button type="button" data-action="export-note" data-format="word">Word</button>
          <button type="button" data-action="export-note" data-format="pdf">PDF</button>
        </div>
      </details>
    `;
  }

  async function insertInlineCaptureIntoFocusedNote({ html, plainText }) {
    const marker = pendingNoteInsertionMarkerId
      ? document.getElementById(pendingNoteInsertionMarkerId)
      : null;
    const card = marker?.closest?.("[data-note-editor], [data-note-card]") ||
      deps.getFloatingUi()?.sidebar?.querySelector("[data-note-editor]");
    if (!card?.dataset?.noteId) return false;
    if (marker) {
      marker.replaceWith(createFragmentWithContinuation(html));
      pendingNoteInsertionMarkerId = null;
      queueNoteEdit(card);
      return true;
    }
    return insertInlineCaptureIntoNote(card.dataset.noteId, { html, plainText });
  }

  async function insertInlineCaptureIntoNote(noteId, { html, plainText }) {
    const note = deps.workspaceState.notes.find((item) => item.id === noteId);
    if (!note) return null;
    const updatedAt = Date.now();
    const updatedNote = await SnipThatDB.appendNoteHtml(noteId, sanitizeHtml(html), updatedAt);
    const next = {
      ...note,
      ...updatedNote,
      content: `${note.content || ""}${note.content ? "\n\n" : ""}${plainText || ""}`,
      contentHtml: updatedNote?.contentHtml || `${note.contentHtml || ""}${sanitizeHtml(html)}`,
      updatedAt,
    };
    deps.scheduleWorkspaceChanged("notes");
    deps.upsertWorkspaceNote(next);
    return next;
  }

  function createCaptureInlineHtml({ text = "", imageDataUrl = "", metadata = deps.getCaptureMetadata(), include = { text: true, image: true } }) {
    const showText = include?.text !== false && text;
    const showImage = include?.image !== false && imageDataUrl;
    return `
      <section class="source-snippet capture-entry" data-timestamp="${Date.now()}">
        ${showImage ? `<img class="inline-shot" contenteditable="false" src="${escapeAttribute(imageDataUrl)}" alt="${escapeAttribute(metadata.captureType || "Screenshot")}">` : ""}
        ${createInlineSourceHtml(showText ? text : "", metadata)}
      </section>
    `;
  }

  function createInlineSourceHtml(text, metadata = deps.getCaptureMetadata()) {
    const body = text
      ? `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`
      : "";
    return `
      ${body}
      <p class="source-meta">
        Source: ${escapeHtml(metadata.title || metadata.host || "Current page")}<br>
        Link: <a href="${escapeAttribute(metadata.url || location.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(metadata.url || location.href)}</a><br>
        Type: ${escapeHtml(metadata.captureType || "Text")}<br>
        Captured: ${escapeHtml(metadata.fullDate || new Date().toLocaleDateString())} ? ${escapeHtml(metadata.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}
      </p>
    `;
  }

  function createCopiedTextInlineHtml(text, metadata = deps.getCaptureMetadata("Copied Text")) {
    return `
      <section class="source-snippet copied-text-card" data-timestamp="${Date.now()}">
        ${createInlineSourceHtml(text, metadata)}
      </section>
    `;
  }

  function createInlineScreenshotHtml(imageDataUrl, metadata = deps.getCaptureMetadata("Screenshot")) {
    return `
      <section class="source-snippet screenshot-card" data-timestamp="${Date.now()}">
        <img class="inline-shot" contenteditable="false" src="${escapeAttribute(imageDataUrl)}" alt="${escapeAttribute(metadata.captureType || "Screenshot")}">
        ${createInlineSourceHtml("", metadata)}
      </section>
    `;
  }

  function createFragmentWithContinuation(html) {
    const template = document.createElement("template");
    template.innerHTML = sanitizeHtml(html);
    return template.content;
  }

  function repairDuplicateCaptureMetadata(html) {
    if (!html || !html.includes("source-snippet")) return html;
    const template = document.createElement("template");
    template.innerHTML = html;
    let changed = false;
    template.content.querySelectorAll(".source-snippet").forEach((entry) => {
      const nestedSnippet = Array.from(entry.children).find((child) =>
        child.matches?.(".source-snippet"),
      );
      if (!nestedSnippet) return;
      const nestedMeta = nestedSnippet.querySelector(".source-meta");
      const directMeta = Array.from(entry.children).find((child) =>
        child.matches?.(".source-meta"),
      );
      const normalize = (el) => el.textContent.replace(/\s+/g, " ").trim();
      if (directMeta && nestedMeta && normalize(directMeta) === normalize(nestedMeta)) {
        directMeta.remove();
      }
      // a .source-snippet nested inside another .source-snippet renders as a
      // bordered card inside a bordered card; unwrap it into the parent entry.
      while (nestedSnippet.firstChild) {
        entry.insertBefore(nestedSnippet.firstChild, nestedSnippet);
      }
      nestedSnippet.remove();
      changed = true;
    });
    return changed ? template.innerHTML : html;
  }

  globalThis.SnipazeInlineInsert = {
    init,
    prepareFocusedNoteInsertion,
    renderNoteExportMenu,
    insertInlineCaptureIntoFocusedNote,
    insertInlineCaptureIntoNote,
    createCaptureInlineHtml,
    createInlineSourceHtml,
    createCopiedTextInlineHtml,
    createInlineScreenshotHtml,
    repairDuplicateCaptureMetadata,
  };
})();
