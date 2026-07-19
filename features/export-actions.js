(() => {
  let deps = null;

  function init(injectedDeps) {
    deps = injectedDeps;
  }

  async function exportNote(id, format) {
    const note = deps.workspaceState.notes.find((item) => item.id === id);
    if (!note) return;
    if (SnipazeNoteExport?.exportNote) {
      await SnipazeNoteExport.exportNote(note, format);
      return;
    }
    const blob = new Blob([JSON.stringify(note, null, 2)], {
      type: "application/json",
    });
    SnipazeNoteExport?.downloadBlob?.(createExportFilename(note.title, "json"), blob);
  }

  function createExportFilename(title, format) {
    const extension =
      format === "word" ? "doc" : format === "pdf" ? "pdf" : format === "txt" ? "txt" : "json";
    return `${SnipazeNoteExport?.slugifyFilename?.(title || "untitled-note") || "untitled-note"}.${extension}`;
  }

  async function exportCategory(categoryName, format) {
    const notes = deps.workspaceState.notes.filter((note) => note.category === categoryName);
    if (!notes.length) return;
    const blob = await createCategoryNotesZipBlob(notes, format);
    SnipazeNoteExport?.downloadBlob?.(
      `${SnipazeNoteExport?.slugifyFilename?.(categoryName || "category") || "category"}-${format || "txt"}.zip`,
      blob,
    );
  }

  async function createCategoryNotesZipBlob(notes, format) {
    const usedNames = new Set();
    const entries = [];
    for (let index = 0; index < notes.length; index += 1) {
      const entry = await createNoteZipEntry(notes[index], index, format);
      entry.name = getUniqueZipEntryName(entry.name, usedNames);
      usedNames.add(entry.name);
      entries.push(entry);
    }
    return SnipazeNoteExport?.createZipBlob?.(entries);
  }

  async function createNoteZipEntry(note, index, format) {
    const baseName = `${String(index + 1).padStart(2, "0")}-${SnipazeNoteExport?.slugifyFilename?.(note.title || "untitled-note") || "untitled-note"}`;
    if (format === "pdf") {
      return {
        name: `${baseName}.pdf`,
        data: await SnipazeNoteExport.createSimplePdfBytes(note),
      };
    }
    if (format === "word") {
      return {
        name: `${baseName}.doc`,
        data: new TextEncoder().encode(SnipazeNoteExport.createWordExportDocument(note)),
      };
    }
    if (format === "json") {
      return {
        name: `${baseName}.json`,
        data: new TextEncoder().encode(JSON.stringify(note, null, 2)),
      };
    }
    return {
      name: `${baseName}.txt`,
      data: new TextEncoder().encode(SnipazeNoteExport.noteToPlainText(note)),
    };
  }

  async function exportAllData(format) {
    if (format === "json") {
      const backup = {
        exportedAt: new Date().toISOString(),
        categories: deps.workspaceState.categories,
        notes: deps.workspaceState.notes,
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      SnipazeNoteExport?.downloadBlob?.("snipaze-backup.json", blob);
      return;
    }
    const blob = await createCategoryNotesZipBlob(deps.workspaceState.notes, format);
    SnipazeNoteExport?.downloadBlob?.(`snipaze-notes-${format || "txt"}.zip`, blob);
  }

  function getUniqueZipEntryName(name, usedNames) {
    if (!usedNames.has(name)) return name;
    const dotIndex = name.lastIndexOf(".");
    const base = dotIndex > -1 ? name.slice(0, dotIndex) : name;
    const extension = dotIndex > -1 ? name.slice(dotIndex) : "";
    let count = 2;
    let candidate = `${base}-${count}${extension}`;
    while (usedNames.has(candidate)) {
      count += 1;
      candidate = `${base}-${count}${extension}`;
    }
    return candidate;
  }

  async function importBackupFile(file) {
    if (!file) return;
    const data = JSON.parse(await file.text());
    const categories = Array.isArray(data?.categories) ? data.categories : [];
    const notes = Array.isArray(data?.notes) ? data.notes : [];
    if (!confirm("Import this Snipaze backup? This replaces current notes and categories.")) return;
    await SnipThatDB.replaceAll("categories", categories);
    await SnipThatDB.replaceAll("notes", notes);
    deps.scheduleWorkspaceChanged("import");
    await deps.loadWorkspaceState();
    deps.renderWorkspace();
  }

  globalThis.SnipazeExportActions = {
    init,
    exportNote,
    exportCategory,
    exportAllData,
    importBackupFile,
  };
})();
