(() => {
  // Patch an older generation already present on this page before deciding whether to initialize.
  const existingFloatingHosts = [
    ...document.querySelectorAll("#snip-ocr-floating-host"),
  ];
  if (existingFloatingHosts.length) {
    document.addEventListener(
      "dragstart",
      (event) => {
        if (
          event
            .composedPath()
            .some((node) => node?.id === "snip-ocr-floating-host")
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );
    existingFloatingHosts.slice(1).forEach((host) => {
      host.hidden = true;
      host.setAttribute("aria-hidden", "true");
      host.style.setProperty("display", "none", "important");
      host.style.setProperty("visibility", "hidden", "important");
      host.style.setProperty("pointer-events", "none", "important");
    });
    return;
  }
  try {
    window.__snipazeCleanup?.();
  } catch {}
  document
    .querySelectorAll(
      "#snip-ocr-root, #snip-ocr-copy-picker-root, #snip-ocr-capture-insert-picker-root",
    )
    .forEach((node) => node.remove());
  window.__snipOcrContentLoaded = true;
  window.__snipOcrGeneration = (window.__snipOcrGeneration || 0) + 1;
  const SCRIPT_GENERATION = window.__snipOcrGeneration;

  const ROOT_ID = "snip-ocr-root";
  const COPY_PICKER_ROOT_ID = "snip-ocr-copy-picker-root";
  const CAPTURE_INSERT_PICKER_ROOT_ID = "snip-ocr-capture-insert-picker-root";
  const FLOATING_HOST_ID = "snip-ocr-floating-host";
  const MIN_SIZE = 8;
  const DEFAULT_CATEGORIES = [
    "General",
    "Research",
    "Code",
    "References",
    "Ideas",
  ];
  const RECOVERED_CATEGORY = "Recovered Notes";
  const CATEGORY_COLORS = ["purple", "green", "red", "blue", "amber"];
  const EXPORT_DIVIDER = "------------------------------";
  const { cssEscape, escapeAttribute, escapeHtml, sanitizeHtml } = globalThis.SnipazeHtmlUtils;
  const { compareNotesForDisplay } = globalThis.SnipazeNoteSort;

  let lastInlineSourceCapture = { text: "", at: 0 };
  let workspaceSyncTimer = null;
  const ACTIVE_SUPABASE_SYNC_INTERVAL_MS = 5000;
  let activeSupabaseSyncTimer = null;
  let activeSupabaseSyncRunning = false;
  let localWorkspaceRenderTimer = null;
  let localWorkspaceListRenderTimer = null;
  const floatingUiState = {
    floatingUi: null,
    floatingHostObserver: null,
    launcherDragFrame: 0,
    floatingUiSyncTimer: null,
    persistenceErrorTimer: null,
  };
  let workspaceState = {
    categories: [],
    notes: [],
    categoriesExpanded: true,
    selectedCategory: "All Categories",
    expandedCategoryNames: [],
    focusedNoteId: null,
    renamingNoteId: null,
    renamingNoteContext: null,
    pendingSaveNoteId: null,
    statsFilter: "total",
    quickFilter: "All",
    timeFilter: "All Time",
    recentNotesVisible: false,
    autoSaveOnCopy: false,
    theme: "dark",
    proActive: false,
    proStatus: null,
  };

  const {
    init: initFloatingShell,
    initFloatingUi,
    onDatabaseError,
    keepFloatingUiInBounds,
    setSidebarOpen,
    applySharedFloatingUiState,
    setFloatingIconVisible,
    setAutoSaveOnCopy,
    setTheme,
    toggleSettingsPanel,
    toggleProPanel,
    handleNoteLeft,
    updateGlobalAutoSaveSetting,
    clearAllNotes,
  } = globalThis.SnipazeFloatingShell;

  initFloatingShell({
    workspaceState,
    floatingUiState,
    scriptGeneration: SCRIPT_GENERATION,
    sendRuntimeMessage,
    ensureDefaultCategories,
    loadWorkspaceState,
    renderWorkspace,
    scheduleWorkspaceChanged,
    syncWorkspaceFromSharedStore,
    hydrateWorkspace,
  });

  const {
    init: initInlineInsert,
    prepareFocusedNoteInsertion,
    renderNoteExportMenu,
    insertInlineCaptureIntoNote,
    insertInlineCaptureIntoFocusedNote,
    createCaptureInlineHtml,
    createCopiedTextInlineHtml,
  } = globalThis.SnipazeInlineInsert;

  initInlineInsert({
    workspaceState,
    getFloatingUi: () => floatingUiState.floatingUi,
    createId,
    scheduleWorkspaceChanged,
    upsertWorkspaceNote,
    getCaptureMetadata,
    ensureDefaultCategories,
    getWritableCategory,
    createNote,
    createTitleFromText,
    putInStore,
  });

  const {
    init: initNotePicker,
    cleanup: cleanupNotePicker,
    chooseDuplicateTitle,
    closeCopiedTextNotePicker,
  } = globalThis.SnipazeNotePicker;

  initNotePicker({
    workspaceState,
    renderNoteCategoryOptions,
    ensureDefaultCategories,
    getWritableCategory,
    createNote,
    putInStore,
    upsertWorkspaceNote,
    createTitleFromText,
    insertInlineCaptureIntoNote,
    createCaptureInlineHtml,
    createCopiedTextInlineHtml,
    scheduleWorkspaceChanged,
  });

  const { init: initCaptureModal, show: showCaptureResultPopup } =
    globalThis.SnipazeCaptureModal;

  initCaptureModal({
    getCaptureMetadata,
    setSidebarOpen,
    createTitleFromText,
    createCaptureInlineHtml,
    insertInlineCaptureIntoFocusedNote,
  });

  const {
    init: initSidebarRender,
    renderNotes,
    renderNoteCard,
    renderStats,
    renderNoteTitleControl,
  } = globalThis.SnipazeSidebarRender;

  const {
    init: initSettings,
    updateSettingsStats,
    byteLength,
    formatStorageSize,
  } = globalThis.SnipThatSettings;

  initSettings({
    getFloatingUi: () => floatingUiState.floatingUi,
    workspaceState,
    getAllFromStore,
  });

  initSidebarRender({
    workspaceState,
    getCaptureMetadata,
    getTimeBucket,
    isRecentNote,
    formatCreatedTimestamp,
    formatStorageSize,
    renderNoteExportMenu,
    byteLength,
  });

  const {
    init: initCategoryRender,
    renderCategoryFilter,
    renderCategories,
    setCategoriesExpanded,
    toggleCategoryPanel,
    syncCategoryAnimationHeights,
  } = globalThis.SnipazeCategoryRender;

  initCategoryRender({
    workspaceState,
    getFloatingUi: () => floatingUiState.floatingUi,
    renderNoteTitleControl,
    formatCreatedTimestamp,
    renderNoteExportMenu,
    saveExpandedCategoryNames,
  });

  const {
    init: initNoteFilters,
    setStatsFilter,
    toggleRecentNotes,
    showNotesForFiltering,
    filterNoteCards,
    persistFilterUiState,
  } = globalThis.SnipazeNoteFilters;

  initNoteFilters({
    workspaceState,
    getFloatingUi: () => floatingUiState.floatingUi,
    compareNotesForDisplay,
  });

  const { init: initSidebarEvents, closeNoteMenus } =
    globalThis.SnipazeSidebarEvents;

  initSidebarEvents({
    workspaceState,
    getFloatingUi: () => floatingUiState.floatingUi,
    getLastInlineSourceCapture: () => lastInlineSourceCapture,
    clearAllNotes,
    filterNoteCards,
    persistFilterUiState,
    prepareFocusedNoteInsertion,
    refreshTitleSuggestions,
    sendRuntimeMessage,
    setCategoriesExpanded,
    setSidebarOpen,
    setStatsFilter,
    setTheme,
    showNotesForFiltering,
    toggleCategoryPanel,
    toggleRecentNotes,
    toggleSettingsPanel,
    toggleProPanel,
    updateGlobalAutoSaveSetting,
  });

  const {
    init: initNoteActions,
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
  } = globalThis.SnipazeNoteActions;

  initNoteActions({
    workspaceState,
    getFloatingUi: () => floatingUiState.floatingUi,
    setCategoriesExpanded,
    toggleCategoryPanel,
    chooseDuplicateTitle,
    createNote,
    putInStore,
    upsertWorkspaceNote,
    saveExpandedCategoryNames,
    renderWorkspace,
    getCaptureMetadata,
    loadWorkspaceState,
    scheduleWorkspaceChanged,
    persistFilterUiState,
    createId,
    deleteFromStore,
    scheduleWorkspaceListRender,
    closeNoteMenus,
    handleNoteLeft,
    sendRuntimeMessage,
  });

  const {
    init: initExportActions,
    exportNote,
    exportCategory,
    exportAllData,
    importBackupFile,
  } = globalThis.SnipazeExportActions;

  initExportActions({
    workspaceState,
    scheduleWorkspaceChanged,
    loadWorkspaceState,
    renderWorkspace,
  });

  const {
    init: initCaptureFlow,
    cleanup: cleanupCaptureFlow,
    startSelectionMode,
    onPageCopy,
    updateOcrProgress,
    hasExtensionRuntime,
    wasExtensionReloadedOnPage,
    normalizeCaptureError,
    captureVisibleScreenshot,
    showSavedPageLinkPicker,
    getExtensionGenerationPromise,
  } = globalThis.SnipazeCaptureFlow;

  initCaptureFlow({
    workspaceState,
    getFloatingUi: () => floatingUiState.floatingUi,
    scriptGeneration: SCRIPT_GENERATION,
    floatingHostId: FLOATING_HOST_ID,
    getCaptureMetadata,
    sendRuntimeMessage,
  });

  const onRuntimeMessage = async (message) => {
    if (message?.type === "OCR_PROGRESS") {
      updateOcrProgress(message);
    }

    if (message?.type === "START_SELECTION") {
      startSelectionMode();
    }

    if (message?.type === "SYNC_SIDEBAR_OPEN_STATE") {
      setSidebarOpen(message.open === true, { sync: false });
    }

    if (message?.type === "SYNC_WORKSPACE_STATE") {
      /* Previous sync did not receive deletion details:
      syncWorkspaceFromSharedStore();
      */
      syncWorkspaceFromSharedStore(
        message.reason,
        message.deletedNoteId,
      );
    }

    if (message?.type === "SYNC_FLOATING_UI_STATE") {
      applySharedFloatingUiState(message.state);
    }


    if (message?.type === "TOOLBAR_CAPTURE_SCREENSHOT") {
      if (!hasExtensionRuntime() || (await wasExtensionReloadedOnPage())) {
        showCaptureResultPopup({
          type: "screenshot",
          text: "Extension reloaded. Please refresh the page.",
          imageDataUrl: "",
        });
        return;
      }
      closeCopiedTextNotePicker();
      prepareFocusedNoteInsertion();
      captureVisibleScreenshot()
        .then((imageDataUrl) =>
          showCaptureResultPopup({ type: "screenshot", imageDataUrl }),
        )
        .catch((error) =>
          showCaptureResultPopup({
            type: "screenshot",
            text: normalizeCaptureError(error),
            imageDataUrl: "",
          }),
        );
    }

    if (message?.type === "TOOLBAR_EXTRACT_OCR") {
      if (!hasExtensionRuntime() || (await wasExtensionReloadedOnPage())) {
        showCaptureResultPopup({
          type: "ocr",
          text: "Extension reloaded. Please refresh the page.",
          imageDataUrl: "",
        });
        return;
      }
      closeCopiedTextNotePicker();
      prepareFocusedNoteInsertion();
      startSelectionMode({ mode: "ocr" });
    }

    if (message?.type === "TOOLBAR_SAVE_LINK") {
      showSavedPageLinkPicker();
    }
    if (message?.type === "SYNC_FLOATING_ICON_VISIBLE") {
      setFloatingIconVisible(message.visible !== false);
    }

    if (message?.type === "SYNC_AUTO_SAVE_SETTING") {
      setAutoSaveOnCopy(message.enabled === true, { persist: false });
    }
  };

  try {
    chrome.runtime.onMessage.addListener(onRuntimeMessage);
  } catch {}

  initFloatingUi();
  document.addEventListener("copy", onPageCopy, true);
  document.addEventListener("snipaze:db-error", onDatabaseError);
  startActiveSupabaseSyncPolling();
  window.__snipazeCleanup = () => {
    try {
      chrome.runtime.onMessage.removeListener(onRuntimeMessage);
    } catch {}
    document.removeEventListener("copy", onPageCopy, true);
    document.removeEventListener("snipaze:db-error", onDatabaseError);
    cleanupCaptureFlow();
    window.removeEventListener("resize", keepFloatingUiInBounds);
    clearTimeout(workspaceSyncTimer);
    clearInterval(activeSupabaseSyncTimer);
    activeSupabaseSyncTimer = null;
    document.removeEventListener("visibilitychange", runActiveSupabaseSync);
    clearTimeout(floatingUiState.floatingUiSyncTimer);
    clearTimeout(localWorkspaceRenderTimer);
    clearTimeout(localWorkspaceListRenderTimer);
    localWorkspaceRenderTimer = null;
    localWorkspaceListRenderTimer = null;
    clearTimeout(floatingUiState.persistenceErrorTimer);
    cancelAnimationFrame(floatingUiState.launcherDragFrame);
    floatingUiState.floatingHostObserver?.disconnect();
    floatingUiState.floatingHostObserver = null;
    document.getElementById(ROOT_ID)?.remove();
    document.getElementById(COPY_PICKER_ROOT_ID)?.remove();
    document.getElementById(CAPTURE_INSERT_PICKER_ROOT_ID)?.remove();
    document.getElementById(FLOATING_HOST_ID)?.remove();
  };

  function refreshTitleSuggestions(input, excludeId = "") {
    globalThis.SnipazeTitleSuggestions?.refresh(input, {
      notes: workspaceState.notes,
      excludeId,
    });
  }



  function upsertWorkspaceNote(note, { render = "deferred" } = {}) {
    if (!note?.id) return;
    const index = workspaceState.notes.findIndex((item) => item.id === note.id);
    if (index >= 0) workspaceState.notes[index] = note;
    else workspaceState.notes.push(note);
    workspaceState.notes.sort(compareNotesForDisplay);
    if (render === "immediate") {
      clearTimeout(localWorkspaceRenderTimer);
      localWorkspaceRenderTimer = null;
      renderWorkspace();
      return;
    }
    if (render === "none") return;
    clearTimeout(localWorkspaceRenderTimer);
    localWorkspaceRenderTimer = setTimeout(() => {
      localWorkspaceRenderTimer = null;
      renderWorkspace();
    }, 0);
  }


  async function hydrateWorkspace() {
    await SnipThatDB.dbInit();
    await loadWorkspacePreferences();

    let [categories, notes] = await Promise.all([
      getAllFromStore("categories"),
      getAllFromStore("notes"),
    ]);

    const seededDefaultCategories = categories.length === 0;
    if (seededDefaultCategories) {
      for (const [index, name] of DEFAULT_CATEGORIES.entries()) {
        await putInStore("categories", {
          name,
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
          createdAt: Date.now() + index,
        });
      }
    }

    if (notes.length === 0 && seededDefaultCategories) {
      const metadata = getCaptureMetadata();
      await putInStore(
        "notes",
        createNote({
          id: "default-capture-text",
          title: "Capture text from the page",
          content: "Use OCR to extract text from any selected screen area.",
          category: "Research",
          metadata,
          type: "manual",
        }),
      );
      await putInStore(
        "notes",
        createNote({
          id: "default-save-visual-selection",
          title: "Save a visual selection",
          content: "Grab a selected region and preview it before copying.",
          category: "General",
          metadata,
          type: "manual",
        }),
      );
    }

    await loadWorkspaceState();
    renderWorkspace();
  }

  async function loadWorkspaceState() {
    const [categories, notes] = await Promise.all([
      getAllFromStore("categories"),
      getAllFromStore("notes"),
    ]);

    workspaceState.categories = categories.sort(
      (a, b) => a.createdAt - b.createdAt,
    );
    const validCategoryNames = new Set(
      workspaceState.categories.map((category) => category.name),
    );
    const validNotes = [];
    const orphanNotes = [];
    for (const note of notes) {
      if (validCategoryNames.has(note.category)) validNotes.push(note);
      else orphanNotes.push(note);
    }
    if (orphanNotes.length) {
      let recoveredCategory = workspaceState.categories.find(
        (category) => category.name === RECOVERED_CATEGORY,
      );
      if (!recoveredCategory) {
        recoveredCategory = {
          name: RECOVERED_CATEGORY,
          color: "amber",
          createdAt: Date.now(),
        };
        await SnipThatDB.addCategory(recoveredCategory);
        workspaceState.categories.push(recoveredCategory);
      }
      for (const note of orphanNotes) {
        const recoveredNote = {
          ...note,
          category: RECOVERED_CATEGORY,
          updatedAt: Date.now(),
        };
        await SnipThatDB.addNote(recoveredNote);
        validNotes.push(recoveredNote);
      }
      scheduleWorkspaceChanged("orphan-notes-recovered");
    }
    let repairedMetadataCount = 0;
    for (const note of validNotes) {
      const fixedHtml = globalThis.SnipazeInlineInsert?.repairDuplicateCaptureMetadata?.(
        note.contentHtml,
      );
      if (fixedHtml && fixedHtml !== note.contentHtml) {
        await SnipThatDB.updateNote(note.id, { contentHtml: fixedHtml });
        note.contentHtml = fixedHtml;
        repairedMetadataCount += 1;
      }
    }
    if (repairedMetadataCount) {
      scheduleWorkspaceChanged("duplicate-metadata-repaired");
    }
    workspaceState.notes = validNotes.sort(compareNotesForDisplay);

    if (
      workspaceState.focusedNoteId &&
      !workspaceState.notes.some(
        (note) => note.id === workspaceState.focusedNoteId,
      )
    ) {
      workspaceState.focusedNoteId = null;
    }
    if (
      workspaceState.renamingNoteId &&
      !workspaceState.notes.some(
        (note) => note.id === workspaceState.renamingNoteId,
      )
    ) {
      workspaceState.renamingNoteId = null;
      workspaceState.renamingNoteContext = null;
    }
    if (
      workspaceState.selectedCategory !== "All Categories" &&
      !workspaceState.categories.some(
        (category) => category.name === workspaceState.selectedCategory,
      )
    ) {
      workspaceState.selectedCategory = "All Categories";
    }
  }

  /* Previous signature:
  async function syncWorkspaceFromSharedStore() {
  */
  async function syncWorkspaceFromSharedStore(
    reason = "",
    deletedNoteId = "",
  ) {
    const activeElement = floatingUiState.floatingUi?.sidebar?.getRootNode?.()?.activeElement;
    const editingBody = activeElement?.matches?.("[data-note-body]");
    const editingRename = activeElement?.matches?.(
      "[data-note-rename-input], .category-input, .category-note-input",
    );

    const deletedNoteWasFocused =
      reason === "full-view-delete" &&
      Boolean(deletedNoteId) &&
      workspaceState.focusedNoteId === deletedNoteId;

    await loadWorkspaceState();
    // pendingSaveNoteId also guards this, not just editingBody/editingRename -
    // a debounced save can still be waiting on its 600ms timer after focus
    // moved elsewhere (e.g. the DevTools console), and rebuilding the notes
    // grid here would wipe those unsaved keystrokes before the save fires.
    if (!editingBody && !editingRename && !workspaceState.pendingSaveNoteId) {
      renderWorkspace();
    } else if (reason === "full-view-delete" && deletedNoteId) {
      floatingUiState.floatingUi?.sidebar
        ?.querySelectorAll(
          `[data-note-id="${cssEscape(deletedNoteId)}"]`,
        )
        .forEach((element) => element.remove());

      /* Checking workspaceState.focusedNoteId here was too late because
      loadWorkspaceState() already clears a deleted focused note.
      */
      if (deletedNoteWasFocused) {
        renderWorkspace();
      }
    }
  }

  function scheduleWorkspaceListRender() {
    clearTimeout(localWorkspaceListRenderTimer);
    localWorkspaceListRenderTimer = setTimeout(() => {
      localWorkspaceListRenderTimer = null;
      if (!floatingUiState.floatingUi?.sidebar) return;
      const panel = floatingUiState.floatingUi.sidebar.querySelector('[data-panel="home"]');
      if (!panel) return;
      renderCategoryFilter(panel);
      renderCategories(panel);
      renderNotes(panel);
      renderStats(panel);
      filterNoteCards(panel);
    }, 0);
  }

  function renderWorkspace() {
    if (!floatingUiState.floatingUi?.sidebar) return;
    closeNoteMenus();

    const panel = floatingUiState.floatingUi.sidebar.querySelector('[data-panel="home"]');
    if (!panel) return;

    panel.classList.toggle(
      "note-editor-open",
      Boolean(workspaceState.focusedNoteId),
    );
    renderCategoryFilter(panel);
    renderCategories(panel);
    renderFocusedNoteEditor(panel);
    renderNotes(panel);
    renderStats(panel);
    filterNoteCards(panel);
  }


  function renderFocusedNoteEditor(panel) {
    const shell = panel.querySelector("[data-focused-note-shell]");
    if (!shell) return;

    const note = workspaceState.notes.find(
      (item) => item.id === workspaceState.focusedNoteId,
    );
    if (!note) {
      shell.hidden = true;
      shell.innerHTML = "";
      return;
    }

    shell.hidden = false;
    shell.innerHTML = renderNoteCard(note, { focused: true, editor: true });
    globalThis.SnipazeStructuredEditor?.enhance(shell.querySelector("[data-note-body]"), { toggle: shell.querySelector("[data-edit-note]") });
  }


  async function loadWorkspacePreferences() {
    const [
      categoriesExpanded,
      expandedCategoryNames,
      theme,
      autoSaveOnCopy,
      statsFilter,
      selectedCategory,
      quickFilter,
      timeFilter,
      proActive,
    ] = await Promise.all([
      SnipThatDB.getUiState("categoriesExpanded", true),
      SnipThatDB.getUiState("expandedCategoryNames", []),
      SnipThatDB.getSetting("theme", "dark"),
      SnipThatDB.getSetting("autoSaveOnCopy", false),
      SnipThatDB.getUiState("statsFilter", "total"),
      SnipThatDB.getUiState("selectedCategory", "All Categories"),
      SnipThatDB.getUiState("quickFilter", "All"),
      SnipThatDB.getUiState("timeFilter", "All Time"),
      SnipThatDB.getSetting(SnipazePro.SETTING_KEY, false),
    ]);

    workspaceState.categoriesExpanded = categoriesExpanded !== false;
    workspaceState.expandedCategoryNames = Array.isArray(expandedCategoryNames)
      ? expandedCategoryNames.filter((name) => typeof name === "string")
      : [];
    workspaceState.theme = theme === "light" ? "light" : "dark";
    workspaceState.autoSaveOnCopy = autoSaveOnCopy === true;
    workspaceState.statsFilter = ["total", "today", "pinned"].includes(
      statsFilter,
    )
      ? statsFilter
      : "total";
    workspaceState.selectedCategory =
      typeof selectedCategory === "string"
        ? selectedCategory
        : "All Categories";
    workspaceState.quickFilter =
      typeof quickFilter === "string" ? quickFilter : "All";
    workspaceState.timeFilter =
      typeof timeFilter === "string" ? timeFilter : "All Time";
    workspaceState.proActive = proActive === true;
    setTheme(workspaceState.theme, { persist: false });
    setAutoSaveOnCopy(workspaceState.autoSaveOnCopy, { persist: false });
    refreshProStatus();
  }

  async function refreshProStatus() {
    const response = await sendRuntimeMessage({ type: "REFRESH_PRO_STATUS" });
    if (!response?.ok) return;
    workspaceState.proActive = response.isPaid === true;
    workspaceState.proStatus = response;
    SnipazePro.applyProToolState(
      floatingUiState.floatingUi?.sidebar,
      workspaceState.proActive,
    );
  }


  async function ensureDefaultCategories() {
    if (workspaceState.categories.length) return;
    const defaults = DEFAULT_CATEGORIES.map((name, index) => ({
      name,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      createdAt: Date.now() + index,
    }));
    for (const category of defaults) {
      await putInStore("categories", category);
    }
    workspaceState.categories = defaults;
    scheduleWorkspaceChanged("categories");
  }

  function renderNoteCategoryOptions(preferredName) {
    const categoryNames = workspaceState.categories.length
      ? workspaceState.categories.map((category) => category.name)
      : DEFAULT_CATEGORIES;
    const preferred = preferredName || categoryNames[0] || "Research";
    return categoryNames
      .map(
        (name) =>
          `<option value="${escapeAttribute(name)}" ${name === preferred ? "selected" : ""}>${escapeHtml(name)}</option>`,
      )
      .join("");
  }

  async function getWritableCategory(preferredName, selectedName) {
    await ensureDefaultCategories();
    const requestedName = selectedName || preferredName || workspaceState.categories[0]?.name || "Research";
    const existing = workspaceState.categories.find((category) => category.name === requestedName);
    if (existing) return existing.name;
    const category = {
      name: requestedName,
      color: CATEGORY_COLORS[workspaceState.categories.length % CATEGORY_COLORS.length] || "blue",
      createdAt: Date.now(),
    };
    await putInStore("categories", category);
    workspaceState.categories.push(category);
    scheduleWorkspaceChanged("categories");
    return category.name;
  }

  function createNote({ id, title, content = "", contentHtml = "", imageDataUrl = "", category = "Research", metadata = getCaptureMetadata(), type = "manual" }) {
    const now = Date.now();
    return {
      id: id || createId(),
      title: title || "Untitled note",
      content,
      contentHtml: contentHtml ? sanitizeHtml(contentHtml) : escapeHtml(content).replace(/\n/g, "<br>"),
      imageDataUrl,
      category,
      metadata,
      type,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  function createTitleFromText(text) {
    return String(text || "").trim().split(/\s+/).slice(0, 6).join(" ").slice(0, 80);
  }

  function getCaptureMetadata(captureType = "Text") {
    const now = new Date();
    const url = location.href;
    return {
      captureType,
      title: document.title || location.hostname || "Current page",
      url,
      host: location.hostname,
      favicon: getFaviconUrl(url),
      description: getPageDescription(),
      selectedText: getSelectedPageText(),
      date: now.toISOString(),
      fullDate: now.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  }

  function getFaviconUrl(url) {
    try {
      return new URL("/favicon.ico", url).href;
    } catch {
      return "";
    }
  }

  function getPageDescription() {
    return (
      document.querySelector('meta[name="description"]')?.content ||
      document.querySelector('meta[property="og:description"]')?.content ||
      ""
    ).trim();
  }

  function getSelectedPageText() {
    return String(window.getSelection?.() || "").trim();
  }

  function getTimeBucket(timestamp) {
    const created = new Date(timestamp);
    const now = new Date();
    if (created.toDateString() === now.toDateString()) return "today";
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (Number(timestamp || 0) >= weekAgo) return "week";
    return "older";
  }

  function isRecentNote(timestamp) {
    return Number(timestamp || 0) >= Date.now() - 24 * 60 * 60 * 1000;
  }

  function formatCreatedTimestamp(timestamp) {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function createId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function saveExpandedCategoryNames() {
    SnipThatDB.setUiState("expandedCategoryNames", Array.from(workspaceState.expandedCategoryNames));
  }

  async function getAllFromStore(storeName) {
    return SnipThatDB.getAll(storeName);
  }

  async function putInStore(storeName, value) {
    const result = await SnipThatDB.put(storeName, value);
    scheduleWorkspaceChanged(storeName);
    return result;
  }

  async function deleteFromStore(storeName, itemKey) {
    await SnipThatDB.remove(storeName, itemKey);
    scheduleWorkspaceChanged(storeName);
  }

  function scheduleWorkspaceChanged(reason = "workspace") {
    clearTimeout(workspaceSyncTimer);
    workspaceSyncTimer = setTimeout(() => {
      sendRuntimeMessage({ type: "WORKSPACE_CHANGED", reason });
    }, 80);
  }

  function shouldRunActiveSupabaseSync() {
    return (
      document.visibilityState === "visible" &&
      workspaceState.proActive === true &&
      floatingUiState.floatingUi?.isOpen === true
    );
  }

  async function runActiveSupabaseSync() {
    if (!shouldRunActiveSupabaseSync() || activeSupabaseSyncRunning) return;
    activeSupabaseSyncRunning = true;
    try {
      await sendRuntimeMessage({ type: "RUN_SUPABASE_SYNC", source: "side-panel" });
    } finally {
      activeSupabaseSyncRunning = false;
    }
  }

  function startActiveSupabaseSyncPolling() {
    clearInterval(activeSupabaseSyncTimer);
    activeSupabaseSyncTimer = setInterval(runActiveSupabaseSync, ACTIVE_SUPABASE_SYNC_INTERVAL_MS);
    document.addEventListener("visibilitychange", runActiveSupabaseSync);
  }

  function sendRuntimeMessage(message) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          try {
            if (chrome.runtime.lastError) {
              resolve(null);
              return;
            }
            resolve(response || null);
          } catch {
            resolve(null);
          }
        });
      } catch {
        resolve(null);
      }
    });
  }

})();
