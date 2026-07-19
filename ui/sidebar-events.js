(() => {
  const { escapeHtml, sanitizeHtml } = globalThis.SnipazeHtmlUtils;

  const {
    cancelNoteRename,
    collapseFocusedNote,
    commitNoteRename,
    createBlankNote,
    createCategoryFromInput,
    createNoteFromCategoryInput,
    deleteCategory,
    deleteNote,
    hideCategoryCreator,
    hideCategoryNoteCreator,
    moveNoteToCategory,
    openFocusedNote,
    queueNoteEdit,
    renameCategory,
    saveNoteEdit,
    startNoteRename,
    toggleCategoryCreator,
    toggleCategoryNoteCreator,
    toggleNotePinned,
    toggleNoteArchived,
  } = globalThis.SnipazeNoteActions;

  const { exportAllData, exportCategory, exportNote, importBackupFile } =
    globalThis.SnipazeExportActions;

  const {
    hasExtensionRuntime,
    wasExtensionReloadedOnPage,
    captureVisibleScreenshot,
    normalizeCaptureError,
    startSelectionMode,
    showSavedPageLinkPicker,
  } = globalThis.SnipazeCaptureFlow;

  const { show: showCaptureResultPopup } = globalThis.SnipazeCaptureModal;
  const { closeCopiedTextNotePicker } = globalThis.SnipazeNotePicker;

  let deps = null;

  function init(injectedDeps) {
    deps = injectedDeps;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  async function onSidebarClick(event) {
    const sourceLink = event.target?.closest?.(".source-meta a");
    if (sourceLink) {
      event.preventDefault();
      window.open(sourceLink.href, "_blank", "noopener,noreferrer");
      return;
    }

    if (isSidebarTextEntry(event.target)) {
      event.stopPropagation();
      return;
    }

    const menuSummary = event.target?.closest?.(
      ".mini-menu summary, .note-menu summary, .note-export-menu summary, .category-export summary",
    );
    if (menuSummary) {
      const menu = menuSummary.closest("details");
      closeNoteMenus(menu);
      requestAnimationFrame(() => positionMenuPopover(menu));
      return;
    }

    if (!event.target?.closest?.(".settings-export-menu")) {
      closeSettingsExportMenus();
    }

    if (
      !event.target?.closest?.(
        ".mini-menu, .note-menu, .note-export-menu, .category-export, .mini-menu-popover, .note-menu-popover, .note-export-popover, .category-export-popover",
      )
    ) {
      closeNoteMenus();
    }

    const actionEl = event.target?.closest?.("[data-action]");
    const action = actionEl?.dataset?.action;

    if (action === "use-title-suggestion") {
      const input = actionEl.closest("[data-title-entry]")?.querySelector("input");
      if (input) { input.value = actionEl.dataset.suggestedTitle || ""; deps.refreshTitleSuggestions(input, input.dataset.noteId || ""); input.focus(); }
      return;
    }
    if (action === "cancel-category-note") { hideCategoryNoteCreator(actionEl.closest("[data-category-group]")); return; }
    if (action === "cancel-note-rename") { cancelNoteRename(); return; }

    if (
      (action === "screenshot" || action === "ocr") &&
      (!hasExtensionRuntime() || (await wasExtensionReloadedOnPage()))
    ) {
      event.preventDefault();
      event.stopPropagation();
      showCaptureResultPopup({
        type: action,
        text: "Extension reloaded. Please refresh the page.",
        imageDataUrl: "",
      });
      return;
    }

    if (action === "toggle-categories") {
      closeNoteMenus();
      deps.setCategoriesExpanded(!deps.workspaceState.categoriesExpanded);
      return;
    }

    if (action === "add-category") {
      event.preventDefault();
      event.stopPropagation();
      closeNoteMenus();
      toggleCategoryCreator();
      return;
    }

    if (action === "toggle-category-panel") {
      closeNoteMenus();
      deps.toggleCategoryPanel(
        event.target.closest("[data-category-group]")?.dataset.category,
      );
      return;
    }

    if (action === "add-category-note") {
      event.preventDefault();
      event.stopPropagation();
      closeNoteMenus();
      toggleCategoryNoteCreator(
        event.target.closest("[data-category-group]")?.dataset.category,
      );
      return;
    }

    if (action === "rename-mini-note") {
      closeNoteMenus();
      startNoteRename(getMenuActionNoteId(event.target), "mini");
      return;
    }

    if (action === "pin-mini-note") {
      closeNoteMenus();
      toggleNotePinned(getMenuActionNoteId(event.target));
      return;
    }

    if (action === "toggle-mini-move") {
      toggleMenuMovePanel(event.target.closest(".mini-menu-popover"));
      return;
    }

    if (action === "move-mini-note") {
      closeNoteMenus();
      moveNoteToCategory(
        getMenuActionNoteId(event.target),
        actionEl.dataset.category,
      );
      return;
    }

    if (action === "delete-mini-note") {
      closeNoteMenus();
      deleteNote(getMenuActionNoteId(event.target));
      return;
    }

    if (action === "rename-category") {
      closeNoteMenus();
      renameCategory(actionEl.dataset.category);
      return;
    }

    if (action === "delete-category") {
      closeNoteMenus();
      deleteCategory(actionEl.dataset.category);
      return;
    }

    if (action === "export-category") {
      closeNoteMenus();
      exportCategory(actionEl.dataset.category, actionEl.dataset.format);
      return;
    }

    if (action === "rename-note") {
      closeNoteMenus();
      startNoteRename(
        getMenuActionNoteId(event.target),
        getMenuActionNoteContext(event.target),
      );
      return;
    }

    if (action === "pin-note") {
      closeNoteMenus();
      toggleNotePinned(getMenuActionNoteId(event.target));
      return;
    }

    if (action === "archive-note") {
      closeNoteMenus();
      toggleNoteArchived(getMenuActionNoteId(event.target));
      return;
    }

    if (action === "toggle-note-move") {
      toggleMenuMovePanel(event.target.closest(".note-menu-popover"));
      return;
    }

    if (action === "move-note") {
      closeNoteMenus();
      moveNoteToCategory(
        getMenuActionNoteId(event.target),
        actionEl.dataset.category,
      );
      return;
    }

    if (action === "export-note") {
      closeNoteMenus();
      exportNote(getMenuActionNoteId(event.target), actionEl.dataset.format);
      return;
    }

    if (action === "delete-note") {
      closeNoteMenus();
      deleteNote(getMenuActionNoteId(event.target));
      return;
    }

    if (action === "open-note") {
      openFocusedNote(
        event.target.closest("[data-note-card], [data-mini-note]")?.dataset
          .noteId,
      );
      return;
    }

    if (action === "open-full-note") {
      const noteId = event.target.closest("[data-note-editor]")?.dataset.noteId;
      if (noteId) deps.sendRuntimeMessage({ type: "OPEN_FULL_NOTE", noteId });
      return;
    }
    if (action === "collapse-note") {
      collapseFocusedNote();
      return;
    }

    if (action === "set-note-stat-filter") {
      deps.setStatsFilter(actionEl.dataset.statFilter);
      return;
    }

    if (action === "toggle-recent-notes") {
      deps.toggleRecentNotes();
      return;
    }

    if (action === "new-note") {
      createBlankNote();
      return;
    }

    if (action === "toggle-theme") {
      deps.setTheme(event.target.checked ? "light" : "dark");
      return;
    }


    if (action === "clear-notes") {
      deps.clearAllNotes();
      return;
    }

    if (action === "export-all-data") {
      closeSettingsExportMenus();
      exportAllData(actionEl.dataset.format);
      return;
    }

    if (action === "import-backup") {
      return;
    }

    if (action === "open-link") {
      const url = actionEl.dataset.url;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    const categoryButton = event.target?.closest?.(".category-select");
    if (categoryButton) {
      closeNoteMenus();
      deps.toggleCategoryPanel(categoryButton.dataset.category);
      return;
    }

    const categoryRowEl = event.target?.closest?.(".category-row");
    if (
      categoryRowEl &&
      !event.target.closest(".category-note-add") &&
      !event.target.closest(".category-actions") &&
      !event.target.closest(".category-export") &&
      !event.target.closest("[data-action='toggle-category-panel']")
    ) {
      deps.toggleCategoryPanel(
        categoryRowEl.closest("[data-category-group]")?.dataset.category,
      );
      return;
    }

    if (!action) return;

    if (action === "close") {
      deps.setSidebarOpen(false);
    } else if (action === "settings") {
      deps.toggleSettingsPanel();
    } else if (action === "open-pro") {
      deps.toggleProPanel();
    } else if (action === "start-pro-signin") {
      SnipazePro.handleProCtaClick(actionEl);
    } else if (action === "open-pricing") {
      SnipazePro.handleUpgradeClick(actionEl);
    } else if (action === "screenshot") {
      closeCopiedTextNotePicker();
      deps.prepareFocusedNoteInsertion();
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
    } else if (action === "ocr") {
      closeCopiedTextNotePicker();
      deps.prepareFocusedNoteInsertion();
      startSelectionMode({ mode: "ocr" });
    } else if (action === "save-link") {
      showSavedPageLinkPicker();
    }
  }

  function onSidebarFocusIn(event) {
    if (event.target.matches(".category-note-input, [data-note-rename-input]")) {
      deps.refreshTitleSuggestions(event.target, event.target.dataset.noteId || "");
    }
  }

  function onSidebarInput(event) {
    if (isSidebarTextEntry(event.target)) {
      event.stopPropagation();
    }

    const panel = event.target?.closest?.('[data-panel="home"]');
    if (!panel) return;
    if (event.target.matches(".search-input, .filter-select")) {
      deps.showNotesForFiltering(panel);
      if (event.target.matches(".filter-select")) {
        const [quickFilter, timeFilter] =
          panel.querySelectorAll(".filter-select");
        deps.workspaceState.quickFilter = quickFilter?.value || "All";
        deps.workspaceState.timeFilter = timeFilter?.value || "All Time";
        deps.persistFilterUiState();
      }
      deps.filterNoteCards(panel);
    } else if (event.target.matches(".category-note-input, [data-note-rename-input]")) {
      deps.refreshTitleSuggestions(event.target, event.target.dataset.noteId || "");
    } else if (event.target.matches("[data-note-body]")) {
      globalThis.SnipazeStructuredEditor?.touchActiveBlockTimestamp(event.target);
      queueNoteEdit(
        event.target.closest("[data-note-card], [data-note-editor]"),
      );
    }
  }

  async function onSidebarChange(event) {
    if (event.target.matches("[data-action='toggle-auto-save']")) {
      await deps.updateGlobalAutoSaveSetting(event.target.checked);
      return;
    }

    if (event.target.matches("[data-import-backup-input]")) {
      importBackupFile(event.target.files?.[0]);
      event.target.value = "";
      return;
    }

    if (event.target.matches("[data-note-category]")) {
      closeNoteMenus();
      moveNoteToCategory(
        event.target.closest("[data-note-card], [data-note-editor]")?.dataset
          .noteId,
        event.target.value,
      );
    }
  }

  function onSidebarPaste(event) {
    const body = event.target?.closest?.("[data-note-body]");
    if (!body) return;

    const text = event.clipboardData?.getData("text/plain")?.trim();
    const lastInlineSourceCapture = deps.getLastInlineSourceCapture();

    if (
      text &&
      lastInlineSourceCapture.text === text &&
      Date.now() - lastInlineSourceCapture.at < 3000
    ) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    const rawHtml = event.clipboardData?.getData("text/html");
    const safeHtml = rawHtml
      ? sanitizeHtml(rawHtml)
      : escapeHtml(text || "").replace(/\n/g, "<br>");
    document.execCommand("insertHTML", false, safeHtml);
  }

  function onSidebarFocusOut(event) {
    if (event.target.matches("[data-note-body]")) {
      saveNoteEdit(
        event.target.closest("[data-note-card], [data-note-editor]"),
      );
    } else if (
      event.target.matches("[data-note-rename-input]") &&
      event.target.dataset.committing !== "true" &&
      !event.relatedTarget?.closest?.("[data-title-entry]")
    ) {
      cancelNoteRename();
    }
  }

  function onSidebarKeyDown(event) {
    if (isSidebarTextEntry(event.target)) {
      event.stopPropagation();
    }

    if (event.target.matches(".category-input") && event.key === "Enter") {
      event.preventDefault();
      createCategoryFromInput(event.target);
      return;
    }

    if (event.target.matches(".category-input") && event.key === "Escape") {
      event.preventDefault();
      hideCategoryCreator();
      return;
    }

    if (event.target.matches(".category-note-input") && event.key === "Enter") {
      event.preventDefault();
      createNoteFromCategoryInput(event.target);
      return;
    }

    if (
      event.target.matches(".category-note-input") &&
      event.key === "Escape"
    ) {
      event.preventDefault();
      hideCategoryNoteCreator(event.target.closest("[data-category-group]"));
      return;
    }

    if (
      event.target.matches("[data-note-rename-input]") &&
      event.key === "Enter"
    ) {
      event.preventDefault();
      event.target.dataset.committing = "true";
      commitNoteRename(event.target);
      return;
    }

    if (
      event.target.matches("[data-note-rename-input]") &&
      event.key === "Escape"
    ) {
      event.preventDefault();
      event.target.dataset.committing = "true";
      cancelNoteRename();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      const input = deps.getFloatingUi().sidebar.querySelector(".search-input");
      if (input && deps.getFloatingUi().isOpen) {
        event.preventDefault();
        input.focus();
        input.select();
      }
    }
  }

  function stopSidebarTextEntryPropagation(event) {
    if (isSidebarTextEntry(event.target)) {
      event.stopPropagation();
    }
  }

  function isSidebarTextEntry(target) {
    return Boolean(
      target?.matches?.(
        ".category-input, .category-note-input, .search-input, [data-note-rename-input], [data-note-body]",
      ),
    );
  }

  function onSidebarDragStart(event) {
    if (
      event.target?.closest?.(
        ".mini-menu, .note-menu, .note-export-menu, button, select, input, textarea, [contenteditable='true']",
      )
    ) {
      event.preventDefault();
      return;
    }

    const card = event.target?.closest?.("[data-note-card], [data-mini-note]");
    if (!card) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", card.dataset.noteId);
    card.classList.add("dragging");
  }

  function onSidebarDragOver(event) {
    if (
      event.target?.closest?.(
        ".category-group, [data-note-card], [data-mini-note]",
      )
    ) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  }

  function onSidebarDrop(event) {
    const targetCategory =
      event.target?.closest?.(".category-group")?.dataset.category;
    const noteId = event.dataTransfer.getData("text/plain");

    clearDraggedNotes();

    if (noteId && targetCategory) {
      event.preventDefault();
      moveNoteToCategory(noteId, targetCategory);
    }
  }

  function clearDraggedNotes() {
    deps.getFloatingUi().sidebar.querySelectorAll(".dragging").forEach((node) => {
      node.classList.remove("dragging");
    });
  }

  function getMenuActionNoteId(target) {
    return (
      target?.closest?.(
        "[data-mini-note], [data-note-card], [data-note-editor]",
      )?.dataset.noteId ||
      target?.closest?.(
        ".mini-menu-popover, .note-menu-popover, .note-export-popover",
      )?.dataset.noteId
    );
  }

  function getMenuActionNoteContext(target) {
    const noteOwner = target?.closest?.("[data-note-editor], [data-note-card]");
    if (noteOwner?.matches?.("[data-note-editor]")) return "editor";
    return (
      target?.closest?.(".note-menu-popover, .note-export-popover")?.dataset
        .noteContext || "card"
    );
  }

  function closeNoteMenus(except) {
    deps.getFloatingUi()?.sidebar
      ?.querySelectorAll?.(
        ".mini-menu[open], .note-menu[open], .note-export-menu[open], .category-export[open]",
      )
      .forEach((menu) => {
        if (menu !== except) {
          menu.removeAttribute("open");
          resetMenuPosition(menu);
        }
      });
  }

  function closeSettingsExportMenus() {
    deps.getFloatingUi()?.sidebar
      ?.querySelectorAll?.(".settings-export-menu[open]")
      .forEach((menu) => {
        menu.removeAttribute("open");
      });
  }

  function onSidebarMenuToggle(event) {
    const menu = event.target?.closest?.(
      ".mini-menu, .note-menu, .note-export-menu, .category-export",
    );
    if (!menu) return;
    if (menu.open) {
      closeNoteMenus(menu);
      requestAnimationFrame(() => positionMenuPopover(menu));
    } else {
      resetMenuPosition(menu);
    }
  }

  function toggleMenuMovePanel(menu) {
    const panel = menu?.querySelector(".menu-move-panel");
    if (!panel) return;
    panel.hidden = !panel.hidden;
    requestAnimationFrame(() => positionMenuPopover(getPopoverOwnerMenu(menu)));
  }

  function positionOpenMenus() {
    deps.getFloatingUi()?.sidebar
      ?.querySelectorAll?.(
        ".mini-menu[open], .note-menu[open], .note-export-menu[open], .category-export[open]",
      )
      .forEach(positionMenuPopover);
  }

  function positionMenuPopover(menu) {
    if (!menu?.open) return;

    const summary = menu.querySelector("summary");
    const popover = getMenuPopover(menu);
    if (!summary || !popover) return;

    const layer = deps.getFloatingUi().sidebar.querySelector(
      "[data-floating-menu-layer]",
    );
    if (!layer) return;

    const owner = menu.closest(
      "[data-mini-note], [data-note-card], [data-note-editor]",
    );
    if (owner?.dataset.noteId) popover.dataset.noteId = owner.dataset.noteId;
    if (owner?.matches?.("[data-note-editor]")) {
      popover.dataset.noteContext = "editor";
    } else if (owner?.matches?.("[data-note-card]")) {
      popover.dataset.noteContext = "card";
    } else {
      delete popover.dataset.noteContext;
    }

    popover.__snipMenuOwner = menu;
    menu.__snipPopover = popover;
    if (popover.parentElement !== layer) layer.append(popover);

    const sidebarRect = deps.getFloatingUi().sidebar.getBoundingClientRect();
    const summaryRect = summary.getBoundingClientRect();

    popover.style.position = "absolute";
    popover.style.left = "0px";
    popover.style.right = "auto";
    popover.style.top = "0px";
    popover.style.bottom = "auto";
    popover.style.maxHeight = "";
    popover.style.overflowY = "";
    popover.style.transformOrigin = "";

    const popoverRect = popover.getBoundingClientRect();
    const gap = 5;
    const margin = 8;
    const spaceBelow = window.innerHeight - summaryRect.bottom - margin;
    const spaceAbove = summaryRect.top - margin;
    const openUp = spaceBelow < popoverRect.height && spaceAbove > spaceBelow;
    const availableHeight = Math.max(
      96,
      (openUp ? spaceAbove : spaceBelow) - gap,
    );
    const top = openUp
      ? Math.max(margin, summaryRect.top - popoverRect.height - gap)
      : Math.min(
          summaryRect.bottom + gap,
          window.innerHeight -
            margin -
            Math.min(popoverRect.height, availableHeight),
        );
    const left = clamp(
      summaryRect.right - popoverRect.width,
      margin,
      window.innerWidth - popoverRect.width - margin,
    );

    popover.style.left = `${left - sidebarRect.left}px`;
    popover.style.top = `${top - sidebarRect.top}px`;
    popover.style.maxHeight = `${availableHeight}px`;
    popover.style.overflowY = "auto";
    popover.style.transformOrigin = openUp ? "bottom right" : "top right";

    menu.dataset.menuPlacement = openUp ? "up" : "down";
  }

  function resetMenuPosition(menu) {
    const popover = getMenuPopover(menu);
    if (!popover) return;
    if (popover.parentElement !== menu) menu.append(popover);
    delete popover.__snipMenuOwner;
    delete menu.__snipPopover;
    delete popover.dataset.noteId;
    delete popover.dataset.noteContext;
    popover.style.position = "";
    popover.style.left = "";
    popover.style.right = "";
    popover.style.top = "";
    popover.style.bottom = "";
    popover.style.maxHeight = "";
    popover.style.overflowY = "";
    popover.style.transformOrigin = "";
    delete menu.dataset.menuPlacement;
  }

  function getMenuPopover(menu) {
    return (
      menu?.__snipPopover ||
      menu?.querySelector?.(
        ".mini-menu-popover, .note-menu-popover, .note-export-popover, .category-export-popover",
      )
    );
  }

  function getPopoverOwnerMenu(popover) {
    return popover?.__snipMenuOwner || popover?.closest?.("details");
  }

  globalThis.SnipazeSidebarEvents = {
    init,
    onSidebarClick,
    onSidebarFocusIn,
    onSidebarInput,
    onSidebarChange,
    onSidebarPaste,
    onSidebarFocusOut,
    onSidebarDragStart,
    onSidebarDragOver,
    onSidebarDrop,
    clearDraggedNotes,
    onSidebarKeyDown,
    stopSidebarTextEntryPropagation,
    onSidebarMenuToggle,
    positionOpenMenus,
    closeNoteMenus,
    isSidebarTextEntry,
  };
})();
