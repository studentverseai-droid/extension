(() => {
  const { escapeHtml, escapeAttribute, sanitizeHtml } = globalThis.SnipazeHtmlUtils;
  const EXPORT_DIVIDER = "------------------------------";
  const CRC_TABLE = createCrcTable();

  function createNoteExportHtml(note) {
    // note.contentHtml here is always container.innerHTML from createWordExportDocument,
    // which already ran through createNoteExportContainer's sanitizeHtml() and then had its
    // <img src> rewritten to bare MHTML resource filenames (e.g. "snip-ocr-image-1.jpg").
    // Re-sanitizing would strip those srcs since they don't match https:/data:image/, so this
    // content is used as-is rather than sanitized a second time.
    const bodyHtml = formatHtmlForWordExport(note.contentHtml || escapeHtml(note.content || "").replace(/\n/g, "<br>"));
    const image = note.imageDataUrl
      ? `<p><img src="${escapeAttribute(note.imageDataUrl)}" alt="Inline screenshot"></p>`
      : "";
    const exportMeta = getNoteExportMeta(note);

    return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <meta name="ProgId" content="Word.Document">
  <meta name="Generator" content="Snip OCR">
  <meta name="Originator" content="Snip OCR">
  <title>${escapeHtml(note.title || "Untitled note")}</title>
  <style>${globalThis.SnipazeExportDocumentStyles || ""}</style>
</head>
<body>
  <div class="WordSection1">
    <p class="report-kicker">Research Note</p>
    <h1>${escapeHtml(note.title || "Untitled note")}</h1>
    <p class="note-meta">
      Category: ${escapeHtml(exportMeta.category)}<br>
      Created: ${escapeHtml(exportMeta.created)}<br>
      Updated: ${escapeHtml(exportMeta.updated)}
    </p>
    <div class="section-rule"></div>
    ${bodyHtml}
    ${image}
  </div>
</body>
</html>`;
  }

  function createWordExportDocument(note) {
    const container = createNoteExportContainer(note);
    const resources = [];
    let imageIndex = 0;

    container.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      const parsed = parseDataUrl(src);
      if (!parsed) return;

      imageIndex += 1;
      const extension = mimeToExtension(parsed.mimeType);
      const filename = `snip-ocr-image-${imageIndex}.${extension}`;
      const dimensions = getImageDimensionsFromDataUrl(parsed);
      const displaySize = dimensions
        ? fitImageSize(dimensions.width, dimensions.height, getExportImageMaxWidth(), getExportImageMaxHeight())
        : null;
      img.setAttribute("src", filename);
      img.removeAttribute("height");
      if (displaySize) {
        img.setAttribute("width", String(displaySize.width));
        img.setAttribute("height", String(displaySize.height));
        img.style.width = `${displaySize.width}px`;
        img.style.height = `${displaySize.height}px`;
      }
      img.style.maxWidth = `${getExportImageMaxWidth()}px`;
      img.style.maxHeight = `${getExportImageMaxHeight()}px`;
      resources.push({
        filename,
        mimeType: parsed.mimeType,
        data: parsed.data
      });
    });

    const wordHtml = createNoteExportHtml({
      ...note,
      contentHtml: container.innerHTML,
      imageDataUrl: ""
    });
    if (resources.length === 0) return wordHtml;

    const boundary = `----=_SnipOCR_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const parts = [
      "MIME-Version: 1.0",
      `Content-Type: multipart/related; boundary="${boundary}"; type="text/html"`,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=\"utf-8\"",
      "Content-Transfer-Encoding: quoted-printable",
      "Content-Location: snip-ocr-note.html",
      "",
      encodeQuotedPrintable(wordHtml)
    ];

    resources.forEach((resource) => {
      parts.push(
        `--${boundary}`,
        `Content-Type: ${resource.mimeType}`,
        "Content-Transfer-Encoding: base64",
        `Content-Location: ${resource.filename}`,
        "",
        chunkBase64(resource.data)
      );
    });

    parts.push(`--${boundary}--`, "");
    return parts.join("\r\n");
  }

  function getExportImageMaxWidth() {
    return Number(globalThis.SnipazeExportImageMaxWidth) || 520;
  }

  function getExportImageMaxHeight() {
    return Number(globalThis.SnipazeExportImageMaxHeight) || 360;
  }
  function compactConsecutiveCaptureSpacers(root) {
    const captures = Array.from(root.querySelectorAll(".source-snippet"));
    for (let index = 0; index < captures.length - 1; index += 1) {
      try {
        const range = document.createRange();
        range.setStartAfter(captures[index]);
        range.setEndBefore(captures[index + 1]);
        const between = range.cloneContents();
        const hasContent = Boolean((between.textContent || "").trim()) || Boolean(between.querySelector("img, .source-snippet"));
        if (!hasContent) range.deleteContents();
      } catch {
      }
    }
  }

  function createWordCaptureRulePair() {
    const table = document.createElement("table");
    table.className = "word-capture-rule-pair";
    table.setAttribute("role", "presentation");
    table.setAttribute("width", "100%");
    table.setAttribute("cellpadding", "0");
    table.setAttribute("cellspacing", "0");
    table.style.cssText = globalThis.SnipazeWordCaptureRuleTableStyle || "";
    // Word divider row styling, including height:3px, lives in themes/export-styles.js.
    table.innerHTML = globalThis.SnipazeWordCaptureRuleTableRows || "";

    return table;
  }

  function formatHtmlForWordExport(html) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html || "";
    compactConsecutiveCaptureSpacers(wrapper);
    const captureRules = [];
    wrapper.querySelectorAll(".source-snippet").forEach((section) => {
      const before = document.createElement("hr");
      before.className = "capture-rule";
      const after = document.createElement("hr");
      after.className = "capture-rule";
      section.before(before);
      section.after(after);
      captureRules.push({ before, after });
    });
    for (let index = 0; index < captureRules.length - 1; index += 1) {
      const pair = createWordCaptureRulePair();
      captureRules[index + 1].before.before(pair);
      captureRules[index].after.remove();
      captureRules[index + 1].before.remove();
    }
    wrapper.querySelectorAll(".source-meta").forEach(styleSourceMetaForRichExport);
    return wrapper.innerHTML;
  }
  function noteToPlainText(note) {
    const container = createNoteExportContainer(note);
    const exportMeta = getNoteExportMeta(note);
    compactConsecutiveCaptureSpacers(container);
    let body = htmlNodeToPlainText(container).replace(/\n{3,}/g, "\n\n").trim();
    body = body.replace(
      new RegExp(`${EXPORT_DIVIDER}\\n(?:[ \\t]*\\n)*${EXPORT_DIVIDER}`, "g"),
      `${EXPORT_DIVIDER}\n${EXPORT_DIVIDER}`
    );
    return [
      "RESEARCH NOTE",
      "=============",
      "",
      note.title || "Untitled note",
      "-".repeat(Math.max(12, String(note.title || "Untitled note").length)),
      `Category: ${exportMeta.category}`,
      `Created: ${exportMeta.created}`,
      `Updated: ${exportMeta.updated}`,
      "",
      "Captured Content",
      "----------------",
      body || "No content.",
      ""
    ].join("\n");
  }

  function getNoteExportMeta(note) {
    return {
      category: note.category || "Uncategorized",
      created: new Date(note.createdAt || Date.parse(note.metadata?.timestamp || "") || Date.now()).toLocaleString(),
      updated: new Date(note.updatedAt || note.createdAt || Date.now()).toLocaleString()
    };
  }

  function createNoteExportContainer(note) {
    const container = document.createElement("div");
    container.innerHTML = `${note.contentHtml ? sanitizeHtml(note.contentHtml) : escapeHtml(note.content || "").replace(/\n/g, "<br>")}${note.imageDataUrl ? `<p><img src="${escapeAttribute(note.imageDataUrl)}" alt="Inline screenshot"></p>` : ""}`;
    container.querySelectorAll(".page-reference-favicon").forEach((favicon) => favicon.remove());
    return container;
  }

  function htmlNodeToPlainText(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const tag = node.tagName.toLowerCase();
    if (node.classList?.contains("source-snippet")) {
      return `\n${EXPORT_DIVIDER}\n\n${textFromChildren(node).trim()}\n\n${EXPORT_DIVIDER}\n\n`;
    }

    if (node.classList?.contains("source-meta")) {
      return formatSourceMetaForPlainExport(node);
    }

    if (node.classList?.contains("page-reference-title")) {
      return `${node.querySelector("a")?.textContent?.trim() || node.textContent?.trim() || "Saved webpage"}\n\n`;
    }

    if (tag === "br") return "\n";
    if (tag === "img") {
      return `\n[Inline image/screenshot: ${node.getAttribute("alt") || "screenshot"}]\n`;
    }
    if (tag === "a") {
      const label = textFromChildren(node).trim();
      const href = node.getAttribute("href") || node.href || "";
      return href && href !== label ? `${label} (${href})` : label;
    }

    const childText = textFromChildren(node);
    if (tag === "p" || tag === "div" || tag === "section" || tag === "article") return `${childText.trim()}\n\n`;
    if (/^h[1-6]$/.test(tag)) return `${childText.trim()}\n\n`;
    if (tag === "li") return `- ${childText.trim()}\n`;
    if (tag === "ul" || tag === "ol") return `${childText}\n`;
    if (tag === "tr") return `${childText.trim()}\n`;
    if (tag === "td" || tag === "th") return `${childText.trim()}\t`;
    return childText;
  }

  function textFromChildren(node) {
    return Array.from(node.childNodes).map(htmlNodeToPlainText).join("");
  }

  function formatSourceMetaForPlainExport(node) {
    const lines = getSourceMetaExportLines(node);
    return `\n${lines.map((line) => line.href ? `${line.label}: ${line.href}` : line.text).filter(Boolean).join("\n")}\n`;
  }
  function styleSourceMetaForRichExport(node) {
    const lines = getSourceMetaExportLines(node);
    if (lines.length === 0) return;
    node.innerHTML = lines.map(({ label, text, href, highlight }) => {
      const className = highlight ? ` class="source-meta-highlight"` : "";
      const content = href
        ? `${escapeHtml(label)}: <a href="${escapeAttribute(href)}">${escapeHtml(href)}</a>`
        : escapeHtml(text);
      return `<span${className}>${content}</span>`;
    }).join("<br>");
  }

  function getSourceMetaExportLines(node) {
    const rawLines = getSourceMetaTextWithBreaks(node)
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const linkHref = node.querySelector?.("a")?.href || "";

    return rawLines.map((line) => {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (!match) return { label: "", text: line, highlight: false };
      const label = match[1].trim();
      const value = match[2].trim().replace(/[•·]/g, " at ").replace(/\s{2,}/g, " ");
      const key = label.toLowerCase();
      const highlight = ["source", "link", "captured"].includes(key);
      return {
        label,
        text: `${label}: ${value}`,
        href: key === "link" ? linkHref || value : "",
        highlight
      };
    });
  }

  function getSourceMetaTextWithBreaks(node) {
    const readNode = (current) => {
      if (current.nodeType === Node.TEXT_NODE) return current.textContent || "";
      if (current.nodeType !== Node.ELEMENT_NODE) return "";
      if (current.tagName.toLowerCase() === "br") return "\n";
      return Array.from(current.childNodes).map(readNode).join("");
    };
    return Array.from(node.childNodes).map(readNode).join("");
  }

  function parseDataUrl(value) {
    const match = String(value || "").match(/^data:([^;,]+)(?:;[^,]*)?;base64,(.*)$/i);
    if (!match) return null;
    return {
      mimeType: match[1].toLowerCase(),
      data: match[2].replace(/\s/g, "")
    };
  }

  function getImageDimensionsFromDataUrl(parsed) {
    try {
      const bytes = base64ToBytes(parsed.data);
      if (parsed.mimeType === "image/png" && bytes.length >= 24) {
        return {
          width: readUint32BigEndian(bytes, 16),
          height: readUint32BigEndian(bytes, 20)
        };
      }
      if ((parsed.mimeType === "image/jpeg" || parsed.mimeType === "image/jpg") && bytes.length > 4) {
        return getJpegDimensions(bytes);
      }
    } catch {
    }
    return null;
  }

  function readUint32BigEndian(bytes, offset) {
    return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
  }

  function getJpegDimensions(bytes) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
      if (length < 2) break;
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          height: (bytes[offset + 5] << 8) + bytes[offset + 6],
          width: (bytes[offset + 7] << 8) + bytes[offset + 8]
        };
      }
      offset += 2 + length;
    }
    return null;
  }

  function fitImageSize(width, height, maxWidth, maxHeight) {
    const scale = Math.min(maxWidth / width, maxHeight / height, 1);
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale))
    };
  }

  function mimeToExtension(mimeType) {
    if (mimeType === "image/jpeg" || mimeType === "image/jpg") return "jpg";
    if (mimeType === "image/gif") return "gif";
    if (mimeType === "image/webp") return "webp";
    if (mimeType === "image/svg+xml") return "svg";
    return "png";
  }

  function chunkBase64(value) {
    return String(value || "").replace(/(.{1,76})/g, "$1\r\n").trim();
  }

  function encodeQuotedPrintable(value) {
    const bytes = new TextEncoder().encode(String(value || ""));
    let line = "";
    const lines = [];

    bytes.forEach((byte) => {
      let token;
      if ((byte >= 33 && byte <= 60) || (byte >= 62 && byte <= 126)) {
        token = String.fromCharCode(byte);
      } else if (byte === 9 || byte === 32) {
        token = String.fromCharCode(byte);
      } else {
        token = `=${byte.toString(16).toUpperCase().padStart(2, "0")}`;
      }

      if (line.length + token.length > 72) {
        lines.push(`${line}=`);
        line = "";
      }
      line += token;
    });

    if (line) lines.push(line);
    return lines.join("\r\n").replace(/[ \t]$/gm, (match) => `=${match.charCodeAt(0).toString(16).toUpperCase()}`);
  }

  function downloadTextFile(filename, content, type) {
    const blob = new Blob([content], { type });
    downloadBlob(filename, blob);
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.documentElement.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function createZipBlob(entries) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    entries.forEach((entry) => {
      const nameBytes = new TextEncoder().encode(entry.name);
      const data = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data);
      const crc = crc32(data);
      const localHeader = createZipLocalHeader(nameBytes, data.length, crc);
      localParts.push(localHeader, nameBytes, data);

      centralParts.push(createZipCentralHeader(nameBytes, data.length, crc, offset), nameBytes);
      offset += localHeader.length + nameBytes.length + data.length;
    });

    const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
    const end = createZipEndRecord(entries.length, centralSize, offset);
    return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
  }

  function createZipLocalHeader(nameBytes, size, crc) {
    const header = new Uint8Array(30);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    return header;
  }

  function createZipCentralHeader(nameBytes, size, crc, offset) {
    const header = new Uint8Array(46);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0800, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, crc, true);
    view.setUint32(20, size, true);
    view.setUint32(24, size, true);
    view.setUint16(28, nameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, offset, true);
    return header;
  }

  function createZipEndRecord(count, centralSize, centralOffset) {
    const record = new Uint8Array(22);
    const view = new DataView(record.buffer);
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(8, count, true);
    view.setUint16(10, count, true);
    view.setUint32(12, centralSize, true);
    view.setUint32(16, centralOffset, true);
    view.setUint16(20, 0, true);
    return record;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function createCrcTable() {
    return Array.from({ length: 256 }, (_, index) => {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      return value >>> 0;
    });
  }

  // Walks nodes looking for <img> elements at any nesting depth (not just direct
  // children), so an image wrapped in a <p> or other container is still emitted as
  // its own "image" block instead of silently disappearing into plain-text extraction.
  async function collectPdfBlocksFromNodes(nodes, blocks) {
    let textBuffer = "";
    const flushText = () => {
      const cleaned = textBuffer.replace(/\n{3,}/g, "\n\n").trim();
      if (cleaned) blocks.push({ type: "text", text: cleaned });
      textBuffer = "";
    };

    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        textBuffer += node.textContent || "";
        continue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      if (node.tagName.toLowerCase() === "img") {
        flushText();
        const image = await imageToJpegResource(node);
        if (image) blocks.push({ type: "image", image });
        continue;
      }

      if (node.classList.contains("source-meta")) {
        flushText();
        const metaLines = getSourceMetaExportLines(node);
        metaLines.forEach((line) => blocks.push({
          type: line.highlight ? "meta" : "text",
          text: line.href ? `${line.label}: ${line.href}` : line.text
        }));
        continue;
      }

      if (node.querySelector?.("img")) {
        flushText();
        await collectPdfBlocksFromNodes(Array.from(node.childNodes), blocks);
      } else {
        textBuffer += htmlNodeToPlainText(node);
      }
    }
    flushText();
  }

  async function createStructuredPdfBlocks(container) {
    const blocks = [];
    for (const node of Array.from(container.childNodes)) {
      if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains("source-snippet")) {
        blocks.push({ type: "divider" });
        await collectPdfBlocksFromNodes(Array.from(node.childNodes), blocks);
        blocks.push({ type: "divider" }, { type: "space" });
        continue;
      }

      await collectPdfBlocksFromNodes([node], blocks);
    }

    for (let index = 0; index < blocks.length - 2; index += 1) {
      if (blocks[index].type === "divider" && blocks[index + 1].type === "space" && blocks[index + 2].type === "divider") {
        blocks.splice(index, 3, { type: "double-divider" });
      }
    }
    if (blocks.length === 0) blocks.push({ type: "text", text: "No content." });
    return blocks;
  }

  async function createSimplePdfBytes(note) {
    const container = createNoteExportContainer(note);
    const exportMeta = getNoteExportMeta(note);
    const pdfBlocks = await createStructuredPdfBlocks(container);
    const lines = [
      "RESEARCH NOTE",
      "=============",
      "",
      note.title || "Untitled note",
      "-".repeat(Math.max(12, String(note.title || "Untitled note").length)),
      `Category: ${exportMeta.category}`,
      `Created: ${exportMeta.created}`,
      `Updated: ${exportMeta.updated}`,
      "",
      "Captured Content",
      "----------------"
    ];
    const objects = [];
    const pages = [];
    const pageWidth = 612;
    const pageHeight = 792;
    const margin = 48;
    const contentWidth = pageWidth - margin * 2;
    let pageOps = [];
    let pageXObjects = [];
    let y = pageHeight - margin;

    const flushPage = () => {
      if (pageOps.length === 0) return;
      const resources = pageXObjects.length
        ? `/XObject << ${pageXObjects.map((item) => `/${item.name} ${item.objectId} 0 R`).join(" ")} >>`
        : "";
      pages.push({ content: pageOps.join("\n"), resources });
      pageOps = [];
      pageXObjects = [];
      y = pageHeight - margin;
    };

    const addLine = (line, options = {}) => {
      const font = options.bold ? "F2" : "F1";
      const color = options.blue ? "0.11 0.30 0.72 rg" : "0 0 0 rg";
      const wrapped = wrapTextForPdf(line, 88);
      wrapped.forEach((wrappedLine) => {
        if (y < margin + 18) flushPage();
        pageOps.push(`BT\n${color}\n/${font} 11 Tf\n${margin} ${y} Td\n(${escapePdfText(wrappedLine)}) Tj\nET`);
        y -= 14;
      });
    };

    const addText = (text) => {
      String(text || "").split(/\n/).forEach(addLine);
    };

    const addMetaText = (text) => {
      String(text || "").split(/\n/).forEach((line) => addLine(line, { bold: true, blue: true }));
    };

    const addDivider = () => {
      if (y < margin + 26) flushPage();
      pageOps.push(`0.6 w\n${margin} ${y} m\n${pageWidth - margin} ${y} l\nS`);
      y -= 18;
    };

    const addDoubleDivider = () => {
      if (y < margin + 26) flushPage();
      pageOps.push(`0.6 w\n${margin} ${y} m\n${pageWidth - margin} ${y} l\nS`);
      y -= 4;
      pageOps.push(`0.6 w\n${margin} ${y} m\n${pageWidth - margin} ${y} l\nS`);
      y -= 18;
    };

    const addImage = (image) => {
      const imageObjectId = objects.length + 1;
      objects.push({
        binary: true,
        content: image.data,
        dictionary: `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>`
      });
      const scale = Math.min(contentWidth / image.width, 240 / image.height, 1);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      if (y - height < margin) flushPage();
      const x = Math.round((pageWidth - width) / 2);
      const imageName = `Im${objects.length}`;
      pageXObjects.push({ name: imageName, objectId: imageObjectId });
      pageOps.push(`q\n${width} 0 0 ${height} ${x} ${y - height} cm\n/${imageName} Do\nQ`);
      y -= height + 14;
    };

    lines.forEach(addLine);
    addLine("");

    for (const block of pdfBlocks) {
      if (block.type === "text") {
        addText(block.text);
        continue;
      }
      if (block.type === "meta") {
        addMetaText(block.text);
        continue;
      }
      if (block.type === "divider") {
        addDivider();
        continue;
      }
      if (block.type === "double-divider") {
        addDoubleDivider();
        continue;
      }
      if (block.type === "space") {
        y -= 8;
        if (y < margin) flushPage();
        continue;
      }
      if (block.type !== "image" || !block.image) continue;
      addImage(block.image);
    }
    flushPage();

    if (pages.length === 0) {
      pages.push({ content: "BT\n/F1 11 Tf\n48 744 Td\n(Empty note) Tj\nET", resources: "" });
    }

    return buildPdfDocument(objects, pages);
  }

  function buildPdfDocument(extraObjects, pages) {
    const encoder = new TextEncoder();
    const chunks = [encoder.encode("%PDF-1.4\n")];
    const offsets = [0];
    const objects = [...extraObjects];
    const fontObjectId = objects.length + 1;
    objects.push({ content: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" });
    const boldFontObjectId = objects.length + 1;
    objects.push({ content: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>" });
    const pageObjectIds = pages.map(() => objects.length + 1).map((id, index) => id + index * 2);
    const contentObjectIds = pageObjectIds.map((id) => id + 1);
    pages.forEach((page, index) => {
      const contentBytes = encoder.encode(page.content);
      objects.push({
        content: `<< /Type /Page /Parent PAGES_REF /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjectId} 0 R /F2 ${boldFontObjectId} 0 R >> ${page.resources || ""} >> /Contents ${contentObjectIds[index]} 0 R >>`
      });
      objects.push({
        binary: true,
        content: contentBytes,
        dictionary: `<< /Length ${contentBytes.length} >>`
      });
    });
    const pagesObjectId = objects.length + 1;
    const catalogObjectId = objects.length + 2;
    objects.push({ content: `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>` });
    objects.push({ content: `<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>` });

    objects.forEach((object, index) => {
      const id = index + 1;
      offsets[id] = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const prefix = encoder.encode(`${id} 0 obj\n${(object.dictionary || object.content).replace?.(/PAGES_REF/g, `${pagesObjectId} 0 R`) || object.dictionary}\n`);
      chunks.push(prefix);
      if (object.binary) {
        chunks.push(encoder.encode("stream\n"), object.content, encoder.encode("\nendstream\n"));
      }
      chunks.push(encoder.encode("endobj\n"));
    });

    const xrefOffset = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const xref = ["xref", `0 ${objects.length + 1}`, "0000000000 65535 f "];
    for (let i = 1; i <= objects.length; i += 1) {
      xref.push(`${String(offsets[i]).padStart(10, "0")} 00000 n `);
    }
    chunks.push(encoder.encode(`${xref.join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root ${catalogObjectId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
    return concatUint8Arrays(chunks);
  }

  function wrapTextForPdf(text, width) {
    if (!text.trim()) return [""];
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach((word) => {
      if ((line ? `${line} ${word}` : word).length > width) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function escapePdfText(value) {
    return String(value || "").replace(/[\\()]/g, "\\$&").replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
  }

  async function imageToJpegResource(img) {
    const src = img.getAttribute("src") || "";
    if (!src) return null;
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const maxWidth = 900;
          const scale = Math.min(1, maxWidth / image.naturalWidth);
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
          const parsed = parseDataUrl(dataUrl);
          resolve(parsed ? {
            width: canvas.width,
            height: canvas.height,
            data: base64ToBytes(parsed.data)
          } : null);
        } catch {
          resolve(null);
        }
      };
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function concatUint8Arrays(arrays) {
    const length = arrays.reduce((total, array) => total + array.length, 0);
    const output = new Uint8Array(length);
    let offset = 0;
    arrays.forEach((array) => {
      output.set(array, offset);
      offset += array.length;
    });
    return output;
  }

  function slugifyFilename(value) {
    return String(value || "untitled-note")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "untitled-note";
  }


  function createExportFilename(title, format) {
    const extension = format === "word" ? "doc" : format;
    return `${slugifyFilename(title || "untitled-note")}.${extension}`;
  }

  async function exportNote(note, format) {
    if (!note || !["txt", "word", "pdf"].includes(format)) return false;
    const filename = createExportFilename(note.title, format);
    if (format === "txt") downloadTextFile(filename, noteToPlainText(note), "text/plain;charset=utf-8");
    else if (format === "word") downloadTextFile(filename, createWordExportDocument(note), "application/msword;charset=utf-8");
    else downloadBlob(filename, new Blob([await createSimplePdfBytes(note)], { type: "application/pdf" }));
    return true;
  }

  globalThis.SnipazeNoteExport = Object.freeze({
    exportNote,
    noteToPlainText,
    createWordExportDocument,
    createSimplePdfBytes,
    createZipBlob,
    downloadBlob,
    slugifyFilename
  });
})();