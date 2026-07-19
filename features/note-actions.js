(() => {
  const { cssEscape, sanitizeHtml } = globalThis.SnipazeHtmlUtils;
  const CATEGORY_COLORS = ["purple", "green", "red", "blue", "amber"];

  let deps = null;

  function init(injectedDeps) {
    deps = injectedDeps;
  }

  function showCategoryCreator() {
    const creator = deps.getFloatingUi().sidebar.querySelector(".category-create");
    const input = deps.getFloatingUi().sidebar.querySelector(".category-input");
    if (!creator || !input) return;

    creator.hidden = false;
    creator.dataset.open = "true";
    deps.setCategoriesExpanded(true);
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  function toggleCategoryCreator() {
    const creator = deps.getFloatingUi().sidebar.querySelector(".category-create");
    if (!creator) return;

    const isOpen = creator.hidden === false || creator.dataset.open === "true";
    if (isOpen) {
      hideCategoryCreator();
      return;
    }

    showCategoryCreator();
  }

  function hideCategoryCreator() {
    const creator = deps.getFloatingUi().sidebar.querySelector(".category-create");
    const input = deps.getFloatingUi().sidebar.querySelector(".category-input");
    if (!creator || !input) return;

    input.value = "";
    creator.hidden = true;
    creator.dataset.open = "false";
  }

  function showCategoryNoteCreator(categoryName) {
    const group = Array.from(
      deps.getFloatingUi().sidebar.querySelectorAll("[data-category-group]"),
    ).find((item) => item.dataset.category === categoryName);
    const creator = group?.querySelector(".category-note-create");
    const input = group?.querySelector(".category-note-input");
    if (!group || !creator || !input) return;

    if (!deps.workspaceState.expandedCategoryNames.includes(categoryName)) {
      deps.toggleCategoryPanel(categoryName);
    }

    creator.hidden = false;
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  function toggleCategoryNoteCreator(categoryName) {
    const group = Array.from(
      deps.getFloatingUi().sidebar.querySelectorAll("[data-category-group]"),
    ).find((item) => item.dataset.category === categoryName);
    const creator = group?.querySelector(".category-note-create");
    if (!group || !creator) return;

    const isOpen = creator.hidden === false || creator.dataset.open === "true";
    if (isOpen) {
      hideCategoryNoteCreator(group);
      return;
    }

    showCategoryNoteCreator(categoryName);
  }

  function hideCategoryNoteCreator(group) {
    const creator = group?.querySelector(".category-note-create");
    const input = group?.querySelector(".category-note-input");
    if (!creator || !input) return;

    input.value = "";
    creator.hidden = true;
    creator.dataset.open = "false";
  }

  async function createNoteFromCategoryInput(input) {
    const title = input.value.trim();
    const category = input.dataset.noteCategoryName;
    if (!title || !category) {
      hideCategoryNoteCreator(input.closest("[data-category-group]"));
      return;
    }

    const choice = await deps.chooseDuplicateTitle(title);
    if (choice.action === "cancel") return;
    if (choice.action === "existing") {
      hideCategoryNoteCreator(input.closest("[data-category-group]"));
      openFocusedNote(choice.note.id);
      return;
    }
    const createdNote = deps.createNote({ title, content: "", category, metadata: deps.getCaptureMetadata(), type: "manual" });
    const savedNote = await SnipThatDB.addNote(createdNote);
    deps.scheduleWorkspaceChanged("notes");

    input.value = "";
    deps.upsertWorkspaceNote(savedNote, { render: "none" });
    if (!deps.workspaceState.expandedCategoryNames.includes(category)) {
      deps.workspaceState.expandedCategoryNames.push(category);
      deps.saveExpandedCategoryNames();
    }
    deps.renderWorkspace();

    openFocusedNote(createdNote.id);
  }

  async function createCategoryFromInput(input) {
    const name = input.value.trim();
    if (
      !name ||
      deps.workspaceState.categories.some(
        (category) => category.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      hideCategoryCreator();
      return;
    }

    await deps.putInStore("categories", {
      name,
      color:
        CATEGORY_COLORS[
          deps.workspaceState.categories.length % CATEGORY_COLORS.length
        ],
      createdAt: Date.now(),
    });
    deps.scheduleWorkspaceChanged("categories");
    hideCategoryCreator();
    await deps.loadWorkspaceState();
    deps.workspaceState.categoriesExpanded = true;
    SnipThatDB.setUiState("categoriesExpanded", true);
    deps.renderWorkspace();
  }

  async function createBlankNote() {
    const title = "Untitled note";
    const choice = await deps.chooseDuplicateTitle(title);
    if (choice.action === "cancel") return;
    if (choice.action === "existing") { openFocusedNote(choice.note.id); return; }
    const createdNote = deps.createNote({ title, content: "", category: deps.workspaceState.categories[0]?.name || "Research", metadata: deps.getCaptureMetadata(), type: "manual" });
    const savedNote = await SnipThatDB.addNote(createdNote);
    deps.scheduleWorkspaceChanged("notes");
    deps.upsertWorkspaceNote(savedNote, { render: "none" });
    openFocusedNote(savedNote.id);
  }

  async function renameCategory(name) {
    const nextName = prompt("Rename category", name)?.trim();
    if (!nextName || nextName === name) return;
    if (
      deps.workspaceState.categories.some(
        (category) => category.name.toLowerCase() === nextName.toLowerCase(),
      )
    )
      return;

    const category = deps.workspaceState.categories.find(
      (item) => item.name === name,
    );
    if (!category) return;

    await SnipThatDB.renameCategory(name, { ...category, name: nextName });
    // A rename is really "old name goes away, new name appears" - the sync
    // engine notices the old name is no longer present locally and pushes
    // the deletion on its own, same as any other delete; no explicit call
    // needed here.
    deps.scheduleWorkspaceChanged("category-renamed");

    if (deps.workspaceState.selectedCategory === name)
      deps.workspaceState.selectedCategory = nextName;
    deps.workspaceState.expandedCategoryNames =
      deps.workspaceState.expandedCategoryNames.map((item) =>
        item === name ? nextName : item,
      );
    deps.saveExpandedCategoryNames();
    deps.persistFilterUiState();
    await deps.loadWorkspaceState();
    deps.renderWorkspace();
  }

  async function deleteCategory(name) {
    if (deps.workspaceState.categories.length <= 1) return;
    const noteIdsInCategory = deps.workspaceState.notes
      .filter((item) => item.category === name)
      .map((item) => item.id);
    const noteCount = noteIdsInCategory.length;
    const warning =
      noteCount > 0
        ? `Delete category "${name}" and its ${noteCount} note${noteCount === 1 ? "" : "s"}? This cannot be undone.`
        : `Delete category "${name}"?`;
    if (!confirm(warning)) return;
    await SnipThatDB.deleteCategoryWithNotes(name);
    // The sync engine notices the category and its notes are no longer
    // present locally and pushes the deletions on its own next pass - no
    // explicit call needed here.
    deps.scheduleWorkspaceChanged("categories");

    if (deps.workspaceState.selectedCategory === name)
      deps.workspaceState.selectedCategory = "All Categories";
    deps.workspaceState.expandedCategoryNames =
      deps.workspaceState.expandedCategoryNames.filter((item) => item !== name);
    deps.saveExpandedCategoryNames();
    deps.persistFilterUiState();
    await deps.loadWorkspaceState();
    deps.renderWorkspace();
  }

  // Ensures the note being left has its just-typed content actually written to
  // SnipThatDB before a sync pass reads it - queueNoteEdit/saveNoteEdit run on
  // a debounce/async timer, so without this a "leave note" sync can fire and
  // read stale content that hasn't finished saving yet.
  async function flushNoteSaveIfPending(id) {
    if (!id) return;
    const editor = deps.getFloatingUi().sidebar.querySelector(
      `[data-note-editor][data-note-id="${cssEscape(id)}"]`,
    );
    if (!editor) return;
    clearTimeout(editor._saveTimer);
    await saveNoteEdit(editor);
  }

  async function openFocusedNote(id) {
    if (!id) return;
    const previousId = deps.workspaceState.focusedNoteId;
    if (previousId && previousId !== id) await flushNoteSaveIfPending(previousId);
    deps.closeNoteMenus();
    deps.workspaceState.focusedNoteId = id;
    deps.workspaceState.renamingNoteId = null;
    deps.workspaceState.renamingNoteContext = null;
    deps.renderWorkspace();
    requestAnimationFrame(() => {
      const editor = deps.getFloatingUi().sidebar.querySelector(
        `[data-note-editor][data-note-id="${cssEscape(id)}"]`,
      );
      editor?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      editor?.querySelector("[data-note-body]")?.focus();
    });
    if (previousId && previousId !== id) deps.handleNoteLeft(previousId);
  }

  async function collapseFocusedNote() {
    const previousId = deps.workspaceState.focusedNoteId;
    if (previousId) await flushNoteSaveIfPending(previousId);
    deps.workspaceState.focusedNoteId = null;
    deps.workspaceState.renamingNoteId = null;
    deps.workspaceState.renamingNoteContext = null;
    deps.renderWorkspace();
    if (previousId) deps.handleNoteLeft(previousId);
  }

  function startNoteRename(id, context = "card") {
    if (!id) return;
    deps.workspaceState.renamingNoteId = id;
    deps.workspaceState.renamingNoteContext = context;
    deps.renderWorkspace();
    requestAnimationFrame(() => {
      const input = deps.getFloatingUi().sidebar.querySelector(
        `[data-note-rename-input][data-note-id="${cssEscape(id)}"][data-rename-context="${cssEscape(context)}"]`,
      );
      input?.focus();
      input?.select();
    });
  }

  function cancelNoteRename() {
    if (!deps.workspaceState.renamingNoteId) return;
    deps.workspaceState.renamingNoteId = null;
    deps.workspaceState.renamingNoteContext = null;
    deps.renderWorkspace();
  }

  async function commitNoteRename(input) {
    const id = input?.dataset.noteId;
    const note = deps.workspaceState.notes.find((item) => item.id === id);
    if (!note) {
      cancelNoteRename();
      return;
    }

    const title = input.value.trim() || "Untitled note";
    if (title.toLocaleLowerCase() !== String(note.title || "").trim().toLocaleLowerCase()) {
      const choice = await deps.chooseDuplicateTitle(title, deps.workspaceState.notes.filter((item) => item.id !== id), { newLabel: "Rename Anyway", existingLabel: "Open Existing" });
      if (choice.action === "cancel") {
        input.dataset.committing = "false";
        input.focus();
        return;
      }
      if (choice.action === "existing") {
        deps.workspaceState.renamingNoteId = null;
        deps.workspaceState.renamingNoteContext = null;
        openFocusedNote(choice.note.id);
        return;
      }
    }
    deps.workspaceState.renamingNoteId = null;
    deps.workspaceState.renamingNoteContext = null;
    const renamedNote = await SnipThatDB.updateNote(note.id, {
      title,
      updatedAt: Date.now(),
    });
    deps.scheduleWorkspaceChanged("notes");
    deps.upsertWorkspaceNote(renamedNote, { render: "none" });
    deps.renderWorkspace();
  }

  function queueNoteEdit(card) {
    clearTimeout(card?._saveTimer);
    if (!card) return;
    // Marks this note as having unsaved keystrokes still waiting on the
    // debounce, independent of DOM focus - a workspace refresh arriving while
    // focus has moved elsewhere (e.g. to the DevTools console) must not
    // rebuild this note's card and wipe the pending edit out from under it.
    deps.workspaceState.pendingSaveNoteId = card.dataset.noteId;
    card._saveTimer = setTimeout(() => saveNoteEdit(card), 600);
  }

  async function saveNoteEdit(card) {
    if (!card) return;
    const note = deps.workspaceState.notes.find(
      (item) => item.id === card.dataset.noteId,
    );
    if (!note) return;

    try {
      const body = card.querySelector("[data-note-body]");
      const deletedLegacyImage = globalThis.SnipazeStructuredEditor?.hasDeletedLegacyImage(body) === true;
      const next = {
        ...note,
        contentHtml: sanitizeHtml(
          globalThis.SnipazeStructuredEditor?.serialize(body) ?? body?.innerHTML ?? "",
        ),
        imageDataUrl: deletedLegacyImage ? "" : note.imageDataUrl,
        updatedAt: Date.now(),
      };
      try {
        await SnipThatDB.updateNoteIfUnchanged(note.id, {
          title: next.title,
          contentHtml: next.contentHtml,
          imageDataUrl: next.imageDataUrl,
          updatedAt: next.updatedAt,
        }, note.updatedAt);
      } catch (error) {
        if (error?.name === "SnipazeItemDeletedError") {
          // The note was deleted elsewhere while this edit was queued - it must
          // stay deleted, not get recreated from a stale local edit.
          await deps.loadWorkspaceState();
          deps.renderWorkspace();
          return;
        }
        if (!/changed in another Snipaze view/i.test(String(error?.message || ""))) throw error;
        const overwrite = confirm("This note was changed in another Snipaze view. Replace that newer version with your current edit?");
        if (!overwrite) {
          await deps.loadWorkspaceState();
          deps.renderWorkspace();
          return;
        }
        // Must go through the normal queue-aware update (same as reader.js's
        // equivalent overwrite branch), not a raw store write - a raw write
        // skips recording this as a pending sync-queue change, so the very
        // edit the user just chose to keep would never actually reach the
        // server. The next sync pass would then still see the *other*
        // device's older revision as authoritative and silently overwrite
        // this "kept" edit right back out from under the user again.
        await SnipThatDB.updateNote(note.id, {
          title: next.title,
          contentHtml: next.contentHtml,
          imageDataUrl: next.imageDataUrl,
          updatedAt: next.updatedAt,
        });
      }
      deps.scheduleWorkspaceChanged("notes");
      deps.upsertWorkspaceNote(next, { render: "none" });
      deps.scheduleWorkspaceListRender();
    } finally {
      if (deps.workspaceState.pendingSaveNoteId === card.dataset.noteId) {
        deps.workspaceState.pendingSaveNoteId = null;
      }
    }
  }

  async function toggleNotePinned(id) {
    const note = deps.workspaceState.notes.find((item) => item.id === id);
    if (!note) return;
    const updatedNote = await SnipThatDB.updateNote(note.id, {
      pinned: !note.pinned,
      updatedAt: Date.now(),
    });
    deps.scheduleWorkspaceChanged("notes");
    deps.upsertWorkspaceNote(updatedNote, { render: "none" });
    deps.renderWorkspace();
  }

  async function toggleNoteArchived(id) {
    const note = deps.workspaceState.notes.find((item) => item.id === id);
    if (!note) return;
    const updatedNote = await SnipThatDB.updateNote(note.id, {
      archived: !note.archived,
      updatedAt: Date.now(),
    });
    deps.scheduleWorkspaceChanged("notes");
    deps.upsertWorkspaceNote(updatedNote, { render: "none" });
    deps.renderWorkspace();
  }

  async function duplicateNote(id) {
    const note = deps.workspaceState.notes.find((item) => item.id === id);
    if (!note) return;
    const copy = {
      ...note,
      id: deps.createId(),
      title: `${note.title || "Untitled note"} Copy`,
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const savedCopy = await SnipThatDB.addNote(copy);
    deps.scheduleWorkspaceChanged("notes");
    deps.upsertWorkspaceNote(savedCopy);
  }

  async function deleteNote(id) {
    if (!id) return;
    if (!confirm("Delete this note?")) return;
    await SnipThatDB.deleteNote(id);
    deps.workspaceState.notes = deps.workspaceState.notes.filter((note) => note.id !== id);
    if (deps.workspaceState.focusedNoteId === id) deps.workspaceState.focusedNoteId = null;
    deps.scheduleWorkspaceChanged("notes");
    deps.renderWorkspace();
  }

  async function moveNoteToCategory(id, category) {
    const note = deps.workspaceState.notes.find((item) => item.id === id);
    if (!note || !category || note.category === category) return;
    const updatedNote = await SnipThatDB.updateNote(id, {
      category,
      updatedAt: Date.now(),
    });
    deps.scheduleWorkspaceChanged("notes");
    deps.upsertWorkspaceNote(updatedNote, { render: "none" });
    deps.renderWorkspace();
  }

  globalThis.SnipazeNoteActions = {
    init,
    showCategoryCreator,
    toggleCategoryCreator,
    hideCategoryCreator,
    showCategoryNoteCreator,
    toggleCategoryNoteCreator,
    hideCategoryNoteCreator,
    createNoteFromCategoryInput,
    createCategoryFromInput,
    createBlankNote,
    renameCategory,
    deleteCategory,
    openFocusedNote,
    collapseFocusedNote,
    startNoteRename,
    cancelNoteRename,
    commitNoteRename,
    queueNoteEdit,
    saveNoteEdit,
    toggleNotePinned,
    toggleNoteArchived,
    duplicateNote,
    deleteNote,
    moveNoteToCategory,
  };
})();
