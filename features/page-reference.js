(() => {
  const { escapeAttribute, escapeHtml } = globalThis.SnipazeHtmlUtils;

  function createHtml(metadata, personalNote = "") {
    const description = metadata.description || "";
    const selectedText = metadata.selectedText || "";
    const favicon = metadata.favicon
      ? `<img class="page-reference-favicon" src="${escapeAttribute(metadata.favicon)}" alt="${escapeAttribute(metadata.host || "Website")} favicon">`
      : "";
    return `
      <section class="source-snippet saved-link-card page-reference-card" data-timestamp="${Date.now()}">
        <div class="page-reference-title">${favicon}<a href="${escapeAttribute(metadata.url)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(metadata.title || metadata.host || "Saved webpage")}</strong></a></div>
        ${description ? `<p class="page-reference-description">${escapeHtml(description)}</p>` : ""}
        ${selectedText ? `<blockquote class="page-reference-selection">${escapeHtml(selectedText).replace(/\n/g, "<br>")}</blockquote>` : ""}
        ${personalNote ? `<p class="page-reference-personal-note"><strong>My note:</strong> ${escapeHtml(personalNote).replace(/\n/g, "<br>")}</p>` : ""}
        <p class="source-meta">
          Website: ${escapeHtml(metadata.host || "Current page")}<br>
          Link: <a href="${escapeAttribute(metadata.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(metadata.url)}</a><br>
          Saved: ${escapeHtml(metadata.fullDate)} at ${escapeHtml(metadata.time)}
        </p>
      </section>
    `;
  }

  function createPlainText(metadata, personalNote = "") {
    return [
      metadata.title || metadata.host || "Saved webpage",
      metadata.url,
      metadata.description ? `Description: ${metadata.description}` : "",
      metadata.selectedText ? `Selected text: ${metadata.selectedText}` : "",
      personalNote ? `My note: ${personalNote}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function show({ metadata, showCaptureInsertNotePicker }) {
    const plainTextFactory = (personalNote = "") =>
      createPlainText(metadata, personalNote);
    showCaptureInsertNotePicker({
      text: plainTextFactory(),
      imageDataUrl: "",
      metadata,
      include: { text: true, image: false },
      fallbackTitle: metadata.title || metadata.host || "Saved webpage",
      htmlFactory: (personalNote) => createHtml(metadata, personalNote),
      plainTextFactory,
    });
  }

  globalThis.SnipazePageReference = {
    createHtml,
    createPlainText,
    show,
  };
})();
