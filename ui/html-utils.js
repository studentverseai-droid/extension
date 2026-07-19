"use strict";

(() => {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  const SANITIZE_ALLOWED_TAGS = new Set([
    "A",
    "B",
    "STRONG",
    "I",
    "EM",
    "U",
    "S",
    "STRIKE",
    "MARK",
    "P",
    "DIV",
    "SPAN",
    "BR",
    "UL",
    "OL",
    "LI",
    "BLOCKQUOTE",
    "PRE",
    "CODE",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "IMG",
    "TABLE",
    "THEAD",
    "TBODY",
    "TR",
    "TD",
    "TH",
    "HR",
    "SUB",
    "SUP",
    "SECTION",
  ]);
  const SANITIZE_ALLOWED_ATTRS = {
    A: ["href", "title"],
    IMG: ["src", "alt", "title"],
  };
  const SANITIZE_SAFE_URL = /^(?:https?:|mailto:)/i;
  const SANITIZE_SAFE_IMG_URL = /^(?:https?:|data:image\/)/i;
  const SANITIZE_MAX_DEPTH = 200;

  function sanitizeHtml(html) {
    if (!html) return "";
    let doc;
    try {
      doc = new DOMParser().parseFromString(String(html), "text/html");
    } catch {
      return escapeHtml(String(html));
    }
    doc
      .querySelectorAll(
        "script, style, iframe, object, embed, link, meta, base, form, svg, math",
      )
      .forEach((el) => el.remove());

    const walk = (node, depth) => {
      if (depth > SANITIZE_MAX_DEPTH) {
        Array.from(node.childNodes).forEach((child) => child.remove());
        return;
      }
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child, depth + 1);
          const tag = child.tagName;
          if (!SANITIZE_ALLOWED_TAGS.has(tag)) {
            while (child.firstChild) node.insertBefore(child.firstChild, child);
            node.removeChild(child);
            return;
          }
          const allowedAttrs = SANITIZE_ALLOWED_ATTRS[tag] || [];
          Array.from(child.attributes).forEach((attr) => {
            const name = attr.name.toLowerCase();
            if (name === "class" || name === "data-timestamp") return;
            if (!allowedAttrs.includes(name)) {
              child.removeAttribute(attr.name);
              return;
            }
            if (name === "href" && !SANITIZE_SAFE_URL.test(attr.value.trim()))
              child.removeAttribute(attr.name);
            if (
              name === "src" &&
              tag === "IMG" &&
              !SANITIZE_SAFE_IMG_URL.test(attr.value.trim())
            )
              child.removeAttribute(attr.name);
          });
          if (tag === "A") {
            child.setAttribute("target", "_blank");
            child.setAttribute("rel", "noopener noreferrer");
          }
        } else if (child.nodeType !== Node.TEXT_NODE) {
          node.removeChild(child);
        }
      });
    };
    try {
      walk(doc.body, 0);
    } catch {
      return escapeHtml(doc.body.textContent || "");
    }
    return doc.body.innerHTML;
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(value);
    return String(value).replace(/["\\]/g, "\\$&");
  }

  globalThis.SnipazeHtmlUtils = {
    cssEscape,
    escapeAttribute,
    escapeHtml,
    sanitizeHtml,
  };
})();
