(() => {
  const { renderStats } = globalThis.SnipazeSidebarRender;

  let deps = null;

  function init(injectedDeps) {
    deps = injectedDeps;
  }

  function setStatsFilter(filter) {
    if (!["total", "today", "pinned"].includes(filter)) return;
    deps.workspaceState.statsFilter = filter;

    const panel = deps.getFloatingUi().sidebar.querySelector('[data-panel="home"]');
    panel.querySelector(".search-input").value = "";
    const [quickFilter, timeFilter] = panel.querySelectorAll(".filter-select");
    if (quickFilter) quickFilter.value = "All";
    if (timeFilter) timeFilter.value = "All Time";
    deps.workspaceState.quickFilter = "All";
    deps.workspaceState.timeFilter = "All Time";
    deps.workspaceState.selectedCategory = "All Categories";
    persistFilterUiState();
    showNotesForFiltering(panel);

    filterNoteCards(panel);
    renderStats(panel);
  }

  function toggleRecentNotes() {
    deps.workspaceState.recentNotesVisible = !deps.workspaceState.recentNotesVisible;
    const panel = deps.getFloatingUi().sidebar.querySelector('[data-panel="home"]');
    filterNoteCards(panel);
  }

  function showNotesForFiltering(panel) {
    if (!panel) return;
    deps.workspaceState.recentNotesVisible = true;
    syncRecentNotesVisibility(panel);
  }

  function filterNoteCards(panel) {
    const search =
      panel.querySelector(".search-input")?.value.trim().toLowerCase() || "";
    const [quickFilter, timeFilter] = Array.from(
      panel.querySelectorAll(".filter-select"),
    ).map((select) => select.value);
    const activeCategory = deps.workspaceState.selectedCategory || "All Categories";
    const grid = panel.querySelector(".notes-grid");
    const noteById = new Map(
      deps.workspaceState.notes.map((note) => [note.id, note]),
    );
    let visibleCount = 0;

    panel.querySelectorAll(".category-select").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.category === activeCategory,
      );
    });

    panel.querySelectorAll("[data-note-card]").forEach((card) => {
      const text = card.textContent.toLowerCase();
      const matchesSearch = !search || text.includes(search);
      const matchesCategory =
        activeCategory === "All Categories" ||
        card.dataset.category === activeCategory;
      const matchesQuickFilter = matchesQuickNoteFilter(card, quickFilter);
      const matchesTime = matchesTimeFilter(
        noteById.get(card.dataset.noteId),
        timeFilter,
      );
      const matchesStatsFilter = matchesStatsNoteFilter(
        card,
        deps.workspaceState.statsFilter,
      );
      const visible =
        matchesSearch &&
        matchesCategory &&
        matchesQuickFilter &&
        matchesTime &&
        matchesStatsFilter;

      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    if (grid) {
      grid.hidden = !deps.workspaceState.recentNotesVisible;
      Array.from(grid.querySelectorAll("[data-note-card]"))
        .sort((a, b) => compareNoteCards(a, b, quickFilter, noteById))
        .forEach((card) => grid.append(card));
    }

    const emptyState = panel.querySelector(".empty-state");
    if (emptyState) {
      emptyState.textContent = getStatsEmptyMessage(deps.workspaceState.statsFilter);
      emptyState.hidden =
        !deps.workspaceState.recentNotesVisible || visibleCount > 0;
    }
    syncRecentNotesVisibility(panel);
  }

  function syncRecentNotesVisibility(panel) {
    if (!panel) return;
    const grid = panel.querySelector(".notes-grid");
    const toggle = panel.querySelector("[data-recent-toggle]");
    if (grid) grid.hidden = !deps.workspaceState.recentNotesVisible;
    if (toggle) {
      toggle.textContent = deps.workspaceState.recentNotesVisible
        ? "Hide Notes"
        : "Show Notes";
    }
  }

  function persistFilterUiState() {
    SnipThatDB.setUiState("selectedCategory", deps.workspaceState.selectedCategory);
    SnipThatDB.setUiState("statsFilter", deps.workspaceState.statsFilter);
    SnipThatDB.setUiState("quickFilter", deps.workspaceState.quickFilter);
    SnipThatDB.setUiState("timeFilter", deps.workspaceState.timeFilter);
  }

  function matchesQuickNoteFilter(card, quickFilter) {
    if (!quickFilter || quickFilter === "All") return true;
    if (quickFilter === "Pinned") return card.dataset.pinned === "true";
    return true;
  }

  function compareNoteCards(a, b, quickFilter, noteById) {
    const noteA = noteById.get(a.dataset.noteId) || {};
    const noteB = noteById.get(b.dataset.noteId) || {};
    const titleA = String(noteA.title || "").toLowerCase();
    const titleB = String(noteB.title || "").toLowerCase();
    const createdA = Number(noteA.createdAt) || 0;
    const createdB = Number(noteB.createdAt) || 0;
    const updatedA = Number(noteA.updatedAt || noteA.createdAt) || 0;
    const updatedB = Number(noteB.updatedAt || noteB.createdAt) || 0;

    if (quickFilter === "Recent") return updatedB - updatedA;
    if (quickFilter === "Newest to Oldest") return createdB - createdA;
    if (quickFilter === "Oldest to Newest") return createdA - createdB;
    if (quickFilter === "A to Z") return titleA.localeCompare(titleB);
    if (quickFilter === "Z to A") return titleB.localeCompare(titleA);
    return deps.compareNotesForDisplay(noteA, noteB);
  }

  function matchesStatsNoteFilter(card, statsFilter) {
    if (statsFilter === "today") return card.dataset.time === "Today";
    if (statsFilter === "pinned") return card.dataset.pinned === "true";
    return true;
  }

  function matchesTimeFilter(note, timeFilter) {
    if (!timeFilter || timeFilter === "All Time") return true;
    const timestamp = getNoteFilterTimestamp(note);
    if (!timestamp) return false;

    const noteDate = new Date(timestamp);
    const now = new Date();

    if (timeFilter === "Today") {
      return noteDate.toDateString() === now.toDateString();
    }

    if (timeFilter === "This Week") {
      return timestamp >= getStartOfWeek(now).getTime();
    }

    if (timeFilter === "This Month") {
      return (
        noteDate.getFullYear() === now.getFullYear() &&
        noteDate.getMonth() === now.getMonth()
      );
    }

    return true;
  }

  function getNoteFilterTimestamp(note) {
    return Math.max(
      Number(note?.createdAt) || 0,
      Number(note?.updatedAt) || 0,
      Date.parse(note?.metadata?.timestamp || "") || 0,
    );
  }

  function getStartOfWeek(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    return start;
  }

  function getStatsEmptyMessage(statsFilter) {
    if (statsFilter === "today") return "No notes created today.";
    if (statsFilter === "pinned") return "No pinned notes.";
    return "No notes available.";
  }

  globalThis.SnipazeNoteFilters = {
    init,
    setStatsFilter,
    toggleRecentNotes,
    showNotesForFiltering,
    filterNoteCards,
    persistFilterUiState,
  };
})();
