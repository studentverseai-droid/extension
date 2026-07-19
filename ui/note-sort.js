"use strict";

(() => {
  function compareNotesForDisplay(a, b) {
    const pinned = Number(Boolean(b?.pinned)) - Number(Boolean(a?.pinned));
    if (pinned) return pinned;
    const updated =
      Number(b?.updatedAt || b?.createdAt) -
      Number(a?.updatedAt || a?.createdAt);
    if (updated) return updated;
    const created = Number(b?.createdAt) - Number(a?.createdAt);
    if (created) return created;
    const title = String(a?.title || "").localeCompare(
      String(b?.title || ""),
      undefined,
      { sensitivity: "base" },
    );
    return title || String(a?.id || "").localeCompare(String(b?.id || ""));
  }

  function sortNotesForDisplay(items) {
    return [...items].sort(compareNotesForDisplay);
  }

  globalThis.SnipazeNoteSort = { compareNotesForDisplay, sortNotesForDisplay };
})();
