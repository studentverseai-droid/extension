(() => {
  const FLOATING_HOST_ID = "snip-ocr-floating-host";

  const {
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
  } = globalThis.SnipazeSidebarEvents;

  const { syncCategoryAnimationHeights } = globalThis.SnipazeCategoryRender;
  const { updateSettingsStats } = globalThis.SnipThatSettings;
  const { getExtensionGenerationPromise } = globalThis.SnipazeCaptureFlow;

  let deps = null;
  let floatingIconVisible = true;

  function init(injectedDeps) {
    deps = injectedDeps;
  }

  function getExtensionAssetUrl(path) {
    try {
      return chrome.runtime.getURL(path);
    } catch {
      return "";
    }
  }

  function initFloatingUi() {
    if (deps.floatingUiState.floatingUi || document.getElementById(FLOATING_HOST_ID)) return;

    const host = document.createElement("div");
    host.id = FLOATING_HOST_ID;
    host.dataset.snipazeExtensionId = chrome.runtime.id;
    getExtensionGenerationPromise().then((generation) => {
      if (generation && host.isConnected) {
        host.dataset.snipazeGeneration = generation;
      }
    });
    hardenFloatingHost(host);
    document.documentElement.append(host);
    deps.floatingUiState.floatingHostObserver?.disconnect();
    deps.floatingUiState.floatingHostObserver = new MutationObserver(() => {
      if (host.isConnected) return;
      hardenFloatingHost(host);
      document.documentElement.append(host);
    });
    deps.floatingUiState.floatingHostObserver.observe(document.documentElement, { childList: true });

    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `${globalThis.SnipazeFloatingStyles()}\n${globalThis.SnipThatSettings.styles()}`;

    const icon = document.createElement("button");
    icon.className = "launcher";
    icon.type = "button";
    icon.title = "Open OCR tools";
    icon.setAttribute("aria-label", "Open OCR tools");
    icon.innerHTML = `<img src="${getExtensionAssetUrl("icons/icon128.png")}" alt="" draggable="false">`;
    icon.draggable = false;
    icon.addEventListener("dragstart", (event) => event.preventDefault());

    const sidebar = document.createElement("section");
    sidebar.className = "sidebar";
    sidebar.setAttribute("aria-label", "OCR tools sidebar");
    sidebar.innerHTML = `
      <header class="header">
        <div class="brand-row">
          <div class="brand-lockup">
            <img class="brand-mark" src="${getExtensionAssetUrl("icons/icon128.png")}" alt="" aria-hidden="true">
            <div class="brand-copy">
              <div class="brand-name">Snipaze</div>
              <div class="brand-desc">Your Research Companion</div>
            </div>
          </div>
          <div class="header-actions">
            <button class="tool pro-tool" type="button" data-action="open-pro" title="Snipaze Pro" aria-label="Snipaze Pro">
              <span class="pro-sheen" aria-hidden="true"></span>
              <span>Pro</span>
              <span class="pro-check" aria-hidden="true">&#10003;</span>
            </button>
            <button class="tool icon-tool settings-tool" type="button" data-action="settings" title="Settings" aria-label="Settings">
              <span aria-hidden="true">&#9881;</span>
            </button>
            <button class="tool icon-tool close" type="button" data-action="close" title="Close" aria-label="Close sidebar">&#10005;</button>
          </div>
        </div>
        <div class="tool-row" aria-label="Quick tools">
          <button class="tool action-tile compact-action" type="button" data-action="screenshot" title="Capture screenshot">
            <span class="tile-icon camera-icon" aria-hidden="true"></span>
            <span><strong>Capture</strong><small>Screenshot</small></span>
          </button>
          <button class="tool action-tile compact-action" type="button" data-action="ocr" title="Extract OCR text">
            <span class="tile-icon icon-ocr" aria-hidden="true">T</span>
            <span><strong>Extract</strong><small>OCR Text</small></span>
          </button>
          <label class="tool action-tile compact-action auto-save-control" title="Auto Save copied text">
            <input type="checkbox" data-action="toggle-auto-save" aria-label="Auto Save copied text">
            <span class="switch-track" aria-hidden="true"><span class="switch-knob"></span><span class="switch-text"></span></span>
            <span><strong data-auto-save-state>OFF</strong><small>Auto Save</small></span>
          </label>
          <label class="tool action-tile compact-action auto-save-control" title="Switch between light and dark theme">
            <input type="checkbox" data-action="toggle-theme" aria-label="Toggle light theme">
            <span class="switch-track" aria-hidden="true"><span class="switch-knob"></span><span class="switch-text"></span></span>
            <span><strong data-theme-state>DARK</strong><small>Theme</small></span>
          </label>
        </div>
        <button class="save-link-action" type="button" data-action="save-link">
          <span aria-hidden="true">&#128279;</span>
          <strong>Save Page Reference</strong>
          <small>Title, link, context & note</small>
        </button>
      </header>
      <div class="content">
        <div class="panel active" data-panel="home">
          <div class="search-wrap">
            <span class="search-icon" aria-hidden="true"></span>
            <input class="search-input" type="search" placeholder="Search notes" aria-label="Search notes">
          </div>

          <div class="filters" aria-label="Note filters">
            <label class="filter-shell">
              <span class="filter-icon layers-icon" aria-hidden="true"></span>
              <select class="filter-select" aria-label="Quick Filters">
              <option value="All">All Notes</option>
              <option>Pinned</option>
              <option>Recent</option>
              <option>Newest to Oldest</option>
              <option>Oldest to Newest</option>
              <option>A to Z</option>
              <option>Z to A</option>
              </select>
            </label>
            <label class="filter-shell">
              <span class="filter-icon calendar-icon" aria-hidden="true"></span>
              <select class="filter-select" aria-label="Filter by time">
              <option>All Time</option>
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
              </select>
            </label>
          </div>

          <div class="notes-heading">
            <h2>Notes</h2>
            <span class="notes-heading-actions">
              <button type="button" data-action="toggle-recent-notes" data-recent-toggle>Show Notes</button>
            </span>
          </div>
          <section class="notes-grid" aria-label="Filtered notes" hidden>
          </section>
          <div class="empty-state" hidden>No matching notes.</div>

          <section class="categories-block" aria-label="Categories">
            <div class="category-head">
              <span class="section-icon folder-icon" aria-hidden="true"></span>
              <button class="category-toggle" type="button" data-action="toggle-categories" aria-expanded="false">
                <span class="category-title-line">
                  <span class="category-caret" aria-hidden="true">&#9654;</span>
                  <span class="category-title-text">Categories</span>
                  <span class="category-count">(0)</span>
                </span>
                <small>Organize notes</small>
              </button>
              <button class="category-add" type="button" data-action="add-category" title="New category" aria-label="New category"><span>+</span> <span class="category-add-label">Add Category</span></button>
            </div>
            <div class="category-create" hidden>
              <input class="category-input" type="text" placeholder="New Category..." aria-label="New category name">
            </div>
            <div class="category-list" data-categories hidden>
            </div>
          </section>

          <section class="stats-grid" aria-label="Note filters">
            <button class="stat-card" type="button" data-action="set-note-stat-filter" data-stat-filter="total" aria-pressed="true">
              <span class="stat-icon stat-notes" aria-hidden="true"></span>
              <strong data-stat="total">0</strong>
              <span>Total Notes</span>
              <small>All your saved notes</small>
            </button>
            <button class="stat-card" type="button" data-action="set-note-stat-filter" data-stat-filter="today" aria-pressed="false">
              <span class="stat-icon stat-today" aria-hidden="true"></span>
              <strong data-stat="today">0</strong>
              <span>Today</span>
              <small>Notes added today</small>
            </button>
            <button class="stat-card" type="button" data-action="set-note-stat-filter" data-stat-filter="pinned" aria-pressed="false">
              <span class="stat-icon stat-pinned" aria-hidden="true"></span>
              <strong data-stat="pinned">0</strong>
              <span>Pinned</span>
              <small>Important notes</small>
            </button>
            <button class="stat-card stat-storage" type="button" tabindex="-1" aria-disabled="true">
              <span class="stat-icon stat-drive" aria-hidden="true"></span>
              <strong data-stat="storage">0 MB</strong>
              <span>Storage Used</span>
              <small>Local storage</small>
            </button>
          </section>

          <section class="focused-note-shell" data-focused-note-shell hidden aria-label="Opened note editor">
          </section>


        </div>
        <div class="panel" data-panel="settings"></div>
        <div class="panel pro-panel" data-panel="pro"></div>
      </div>
      <div class="floating-menu-layer" data-floating-menu-layer></div>
    `;
    sidebar.querySelector('[data-panel="settings"]').innerHTML =
      globalThis.SnipThatSettings.renderPanel();
    sidebar.querySelector('[data-panel="pro"]').innerHTML =
      SnipazePro.renderProPanelHtml(deps.workspaceState.proStatus);

    const handles = [
      "top",
      "right",
      "bottom",
      "left",
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ];

    for (const direction of handles) {
      const handle = document.createElement("span");
      handle.className = `resize-handle ${direction}`;
      handle.dataset.direction = direction;
      sidebar.append(handle);
    }

    shadow.append(style, icon, sidebar);

    deps.floatingUiState.floatingUi = {
      host,
      shadow,
      icon,
      sidebar,
      isOpen: false,
      moved: false,
      draggingLauncher: false,
      iconRect: { left: window.innerWidth - 82, top: 150 },
      sidebarRect: getHalfExpandedSidebarRect(),
    };

    positionFloatingIcon();
    positionSidebar();
    setTheme(deps.workspaceState.theme, { persist: false });

    icon.addEventListener("pointerdown", onLauncherPointerDown);
    icon.addEventListener("click", () => {
      const floatingUi = deps.floatingUiState.floatingUi;
      if (floatingUi.moved) {
        floatingUi.moved = false;
        return;
      }
      toggleSidebar();
    });

    sidebar.addEventListener("click", onSidebarClick);
    sidebar.addEventListener("input", onSidebarInput);
    sidebar.addEventListener("focusin", onSidebarFocusIn);
    sidebar.addEventListener("change", onSidebarChange);
    sidebar.addEventListener("paste", onSidebarPaste);
    sidebar.addEventListener("focusout", onSidebarFocusOut);
    sidebar.addEventListener("dragstart", onSidebarDragStart);
    sidebar.addEventListener("dragend", clearDraggedNotes);
    sidebar.addEventListener("dragover", onSidebarDragOver);
    sidebar.addEventListener("drop", onSidebarDrop);
    sidebar.addEventListener("pointerdown", onSidebarPointerDown);
    sidebar.addEventListener("keydown", onSidebarKeyDown);
    sidebar.addEventListener("keypress", stopSidebarTextEntryPropagation);
    sidebar.addEventListener("keyup", stopSidebarTextEntryPropagation);
    sidebar.addEventListener("toggle", onSidebarMenuToggle, true);
    installSearchPlaceholderFocusBehavior(sidebar);
    sidebar
      .querySelector(".content")
      ?.addEventListener("scroll", positionOpenMenus, { passive: true });
    window.addEventListener("resize", keepFloatingUiInBounds, {
      passive: true,
    });

    deps.hydrateWorkspace();
    hydrateSharedSidebarState();
    hydrateSharedFloatingUiState();
    hydrateFloatingIconVisibility();
  }

  async function hydrateFloatingIconVisibility() {
    const response = await deps.sendRuntimeMessage({
      type: "GET_FLOATING_ICON_VISIBLE",
    });
    setFloatingIconVisible(response?.visible !== false);
  }

  function hardenFloatingHost(host) {
    const importantStyles = {
      display: "block",
      visibility: "visible",
      opacity: "1",
      position: "fixed",
      inset: "0 auto auto 0",
      width: "0",
      height: "0",
      overflow: "visible",
      transform: "none",
      filter: "none",
      "z-index": "2147483647",
    };
    for (const [property, value] of Object.entries(importantStyles)) {
      host.style.setProperty(property, value, "important");
    }
  }
  function setFloatingIconVisible(visible) {
    const floatingUi = deps.floatingUiState.floatingUi;
    if (
      !floatingUi?.icon ||
      floatingUi.host?.dataset?.snipazeRetired === "true"
    )
      return;
    floatingIconVisible = visible !== false;
    floatingUi.icon.hidden = !floatingIconVisible;
    floatingUi.icon.style.setProperty(
      "display",
      floatingIconVisible ? "grid" : "none",
      "important",
    );
    if (floatingIconVisible) {
      hardenFloatingHost(floatingUi.host);
      if (!floatingUi.host.isConnected)
        document.documentElement.append(floatingUi.host);
      positionFloatingIcon();
    }
    if (!floatingIconVisible && floatingUi.isOpen) {
      setSidebarOpen(false, { sync: false });
    }
  }

  async function hydrateSharedSidebarState() {
    const response = await deps.sendRuntimeMessage({
      type: "GET_SIDEBAR_OPEN_STATE",
    });
    if (response?.ok && response.open) {
      setSidebarOpen(true, { sync: false });
    }
  }

  function onDatabaseError(event) {
    if (window.__snipOcrGeneration !== deps.scriptGeneration) return;
    const method = String(event?.detail?.method || "");
    const isWrite =
      /^(save|add|append|update|rename|delete|set|replace|put|remove|clear)/i.test(
        method,
      );
    showPersistenceStatus(
      isWrite
        ? "Snipaze could not save your latest change. Reload the page and try again."
        : "Snipaze could not load its saved data. Reload the page and try again.",
    );
  }

  function showPersistenceStatus(message) {
    const floatingUi = deps.floatingUiState.floatingUi;
    if (!floatingUi?.shadow) return;
    let status = floatingUi.shadow.querySelector("[data-persistence-status]");
    if (!status) {
      status = document.createElement("div");
      status.className = "persistence-status";
      status.dataset.persistenceStatus = "";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      floatingUi.shadow.append(status);
    }
    status.textContent = message;
    status.classList.add("visible");
    clearTimeout(deps.floatingUiState.persistenceErrorTimer);
    deps.floatingUiState.persistenceErrorTimer = setTimeout(() => {
      status?.classList.remove("visible");
    }, 6000);
  }

  async function hydrateSharedFloatingUiState() {
    const response = await deps.sendRuntimeMessage({
      type: "GET_FLOATING_UI_STATE",
    });
    if (response?.ok) {
      applySharedFloatingUiState(response.state);
    }
  }

  function onLauncherPointerDown(event) {
    if (event.button !== 0) return;
    event.preventDefault();

    const floatingUi = deps.floatingUiState.floatingUi;
    const startX = event.clientX;
    const startY = event.clientY;
    const initial = { ...floatingUi.iconRect };
    let latestLeft = initial.left;
    let latestTop = initial.top;
    let dragged = false;

    floatingUi.draggingLauncher = true;
    floatingUi.icon.classList.add("dragging");
    floatingUi.icon.setPointerCapture(event.pointerId);

    const queuePosition = () => {
      if (deps.floatingUiState.launcherDragFrame) return;
      deps.floatingUiState.launcherDragFrame = requestAnimationFrame(() => {
        deps.floatingUiState.launcherDragFrame = 0;
        floatingUi.iconRect.left = latestLeft;
        floatingUi.iconRect.top = latestTop;
        positionFloatingIcon();
      });
    };

    const move = (moveEvent) => {
      moveEvent.preventDefault();
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.hypot(dx, dy) > 4) {
        dragged = true;
        floatingUi.moved = true;
      }
      latestLeft = clamp(initial.left + dx, 8, window.innerWidth - 64);
      latestTop = clamp(initial.top + dy, 8, window.innerHeight - 64);
      queuePosition();
    };

    const finish = () => {
      if (deps.floatingUiState.launcherDragFrame) {
        cancelAnimationFrame(deps.floatingUiState.launcherDragFrame);
        deps.floatingUiState.launcherDragFrame = 0;
      }
      floatingUi.iconRect.left = latestLeft;
      floatingUi.iconRect.top = latestTop;
      positionFloatingIcon();
      floatingUi.draggingLauncher = false;
      floatingUi.icon.classList.remove("dragging");
      floatingUi.icon.removeEventListener("pointermove", move);
      floatingUi.icon.removeEventListener("pointerup", finish);
      floatingUi.icon.removeEventListener("pointercancel", finish);
      if (dragged) scheduleFloatingUiStateSync();
    };

    floatingUi.icon.addEventListener("pointermove", move);
    floatingUi.icon.addEventListener("pointerup", finish, { once: true });
    floatingUi.icon.addEventListener("pointercancel", finish, { once: true });
  }

  function onSidebarPointerDown(event) {
    if (globalThis.SnipazeSidebarEvents.isSidebarTextEntry(event.target)) {
      event.stopPropagation();
      return;
    }

    const handle = event.target?.dataset?.direction;
    if (!handle) return;

    event.preventDefault();
    const floatingUi = deps.floatingUiState.floatingUi;
    const startX = event.clientX;
    const startY = event.clientY;
    const initial = { ...floatingUi.sidebarRect };
    floatingUi.sidebar.setPointerCapture(event.pointerId);

    const move = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const next = { ...initial };

      if (handle.includes("right")) {
        next.width = initial.width + dx;
        next.right = initial.right - dx;
      }
      if (handle.includes("bottom")) next.height = initial.height + dy;
      if (handle.includes("left")) {
        next.width = initial.width - dx;
      }
      if (handle.includes("top")) {
        next.height = initial.height - dy;
        next.top = initial.top + dy;
      }

      floatingUi.sidebarRect = normalizeSidebarRect(next);
      positionSidebar();
      positionOpenMenus();
      scheduleFloatingUiStateSync();
    };

    const up = () => {
      floatingUi.sidebar.removeEventListener("pointermove", move);
      floatingUi.sidebar.removeEventListener("pointerup", up);
    };

    floatingUi.sidebar.addEventListener("pointermove", move);
    floatingUi.sidebar.addEventListener("pointerup", up, { once: true });
  }

  function toggleSidebar() {
    if (deps.floatingUiState.floatingUi.isOpen) {
      setSidebarOpen(false);
      return;
    }
    setSidebarOpen(true, { resetToHalf: true });
  }

  function setSidebarOpen(open, options = {}) {
    const floatingUi = deps.floatingUiState.floatingUi;
    if (!floatingUi) return;
    const nextOpen = open === true && floatingIconVisible;
    const changed = floatingUi.isOpen !== nextOpen;

    floatingUi.isOpen = nextOpen;
    if (nextOpen && options.resetToHalf) {
      floatingUi.sidebarRect = getHalfExpandedSidebarRect();
      positionSidebar();
      scheduleFloatingUiStateSync();
    }
    floatingUi.sidebar.classList.toggle("open", nextOpen);
    floatingUi.icon.classList.toggle("active", nextOpen);
    if (nextOpen) {
      showFloatingPanel("home");
      requestAnimationFrame(() => {
        syncCategoryAnimationHeights(
          floatingUi.sidebar.querySelector('[data-panel="home"]'),
        );
        positionOpenMenus();
      });
    }

    if (changed && options.sync !== false) {
      syncSharedSidebarState(nextOpen);
    }

    // Sync now lives entirely in background.js and runs off the same
    // WORKSPACE_CHANGED signal every other change already uses - opening the
    // sidebar just needs to send that signal sooner than waiting for the
    // periodic check, not call a sync engine directly.
    if (changed && nextOpen && deps.workspaceState.proActive) {
      deps.scheduleWorkspaceChanged("sidebar-open");
    }
  }

  // Called whenever the user finishes with a specific note (closes it or
  // switches to a different one) - syncs sooner than waiting for the
  // periodic timer, via the same WORKSPACE_CHANGED signal every other
  // change already uses (background.js owns the actual sync now).
  function handleNoteLeft(noteId) {
    if (!noteId || !deps.workspaceState.proActive) return;
    deps.scheduleWorkspaceChanged("note-left");
  }

  function syncSharedSidebarState(open) {
    deps.sendRuntimeMessage({ type: "SET_SIDEBAR_OPEN_STATE", open });
  }

  function applySharedFloatingUiState(state) {
    const floatingUi = deps.floatingUiState.floatingUi;
    if (!floatingUi || !state) return;

    if (state.iconRect && !floatingUi.draggingLauncher) {
      floatingUi.iconRect = {
        left: Number(state.iconRect.left),
        top: Number(state.iconRect.top),
      };
      positionFloatingIcon();
    }

    if (state.sidebarRect) {
      floatingUi.sidebarRect = {
        width: Number(state.sidebarRect.width),
        height: Number(state.sidebarRect.height),
        right: Number(state.sidebarRect.right),
        top: Number(state.sidebarRect.top),
      };
      positionSidebar();
      positionOpenMenus();
    }
  }

  function scheduleFloatingUiStateSync() {
    clearTimeout(deps.floatingUiState.floatingUiSyncTimer);
    deps.floatingUiState.floatingUiSyncTimer = setTimeout(() => {
      const floatingUi = deps.floatingUiState.floatingUi;
      if (!floatingUi) return;
      deps.sendRuntimeMessage({
        type: "SET_FLOATING_UI_STATE",
        state: {
          iconRect: floatingUi.iconRect,
          sidebarRect: floatingUi.sidebarRect,
        },
      });
    }, 80);
  }

  function showFloatingPanel(name) {
    deps.floatingUiState.floatingUi.sidebar.querySelectorAll(".panel").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panel === name);
    });
    syncSettingsControls();
    if (name === "settings") {
      updateSettingsStats();
      syncDeviceNameInput();
    }
  }

  async function syncDeviceNameInput() {
    const input = deps.floatingUiState.floatingUi.sidebar.querySelector(
      "[data-device-name-input]",
    );
    if (!input) return;
    input.value = await SnipazeDeviceIdentity.getDeviceName();
    if (input.dataset.wired) return;
    input.dataset.wired = "true";
    input.addEventListener("change", async () => {
      const saved = await SnipazeDeviceIdentity.setDeviceName(input.value);
      if (!saved) input.value = await SnipazeDeviceIdentity.getDeviceName();
    });
  }

  function getActivePanelName() {
    return (
      deps.floatingUiState.floatingUi.sidebar.querySelector(".panel.active")?.dataset.panel || "home"
    );
  }

  function toggleSettingsPanel() {
    showFloatingPanel(
      getActivePanelName() === "settings" ? "home" : "settings",
    );
  }

  function toggleProPanel() {
    const proPanel = deps.floatingUiState.floatingUi.sidebar.querySelector(
      '[data-panel="pro"]',
    );
    if (proPanel) proPanel.innerHTML = SnipazePro.renderProPanelHtml(deps.workspaceState.proStatus);
    showFloatingPanel(getActivePanelName() === "pro" ? "home" : "pro");
  }

  function installSearchPlaceholderFocusBehavior(sidebar) {
    const input = sidebar?.querySelector?.(".search-input");
    if (!input) return;
    const placeholder = input.getAttribute("placeholder") || "Search notes";
    input.addEventListener("focus", () => {
      input.dataset.placeholderText = placeholder;
      input.setAttribute("placeholder", "");
    });
    input.addEventListener("blur", () => {
      if (!input.value) {
        input.setAttribute(
          "placeholder",
          input.dataset.placeholderText || placeholder,
        );
      }
    });
  }
  function syncSettingsControls() {
    const floatingUi = deps.floatingUiState.floatingUi;
    const themeToggle = floatingUi.sidebar.querySelector(
      "[data-action='toggle-theme']",
    );
    if (themeToggle) themeToggle.checked = deps.workspaceState.theme === "light";
    const themeState = floatingUi.sidebar.querySelector("[data-theme-state]");
    if (themeState) themeState.textContent = deps.workspaceState.theme === "light" ? "LIGHT" : "DARK";
    const autoSaveToggle = floatingUi.sidebar.querySelector(
      "[data-action='toggle-auto-save']",
    );
    if (autoSaveToggle) autoSaveToggle.checked = deps.workspaceState.autoSaveOnCopy;
    const autoSaveState = floatingUi.sidebar.querySelector(
      "[data-auto-save-state]",
    );
    if (autoSaveState)
      autoSaveState.textContent = deps.workspaceState.autoSaveOnCopy ? "ON" : "OFF";
    SnipazePro.applyProToolState(floatingUi.sidebar, deps.workspaceState.proActive);
  }

  function setTheme(theme, options = {}) {
    deps.workspaceState.theme = theme === "light" ? "light" : "dark";
    deps.floatingUiState.floatingUi?.sidebar?.classList.toggle(
      "light-theme",
      deps.workspaceState.theme === "light",
    );
    if (options.persist !== false) {
      SnipThatDB.setSetting("theme", deps.workspaceState.theme);
      deps.scheduleWorkspaceChanged("theme");
    }
    syncSettingsControls();
  }

  function setAutoSaveOnCopy(enabled, options = {}) {
    deps.workspaceState.autoSaveOnCopy = Boolean(enabled);
    const host = document.getElementById(FLOATING_HOST_ID);
    if (host) {
      host.dataset.snipazeAutoSave = String(deps.workspaceState.autoSaveOnCopy);
    }
    if (options.persist !== false) {
      SnipThatDB.setSetting("autoSaveOnCopy", deps.workspaceState.autoSaveOnCopy);
    }
    syncSettingsControls();
  }

  async function updateGlobalAutoSaveSetting(enabled) {
    const previous = deps.workspaceState.autoSaveOnCopy;
    setAutoSaveOnCopy(enabled, { persist: false });
    const response = await deps.sendRuntimeMessage({
      type: "SET_AUTO_SAVE_SETTING",
      enabled,
    });
    if (!response?.ok) {
      setAutoSaveOnCopy(previous, { persist: false });
    }
  }
  async function clearAllNotes() {
    if (!confirm("Clear all Snipaze data?")) return;
    // Clearing "settings" would also wipe the sync engine's tracking state -
    // that state is what lets it notice "I used to track these, now they're
    // all gone locally" and push the deletions on the next sync. Without
    // preserving it here, the next sync would just pull everything straight
    // back from Supabase instead of deleting it there too.
    const supabaseSyncState = await SnipThatDB.getSetting("supabaseSyncState", null);
    await Promise.all([
      SnipThatDB.clear("categories"),
      SnipThatDB.clear("notes"),
      SnipThatDB.clear("noteBlocks"),
      SnipThatDB.clear("images"),
      SnipThatDB.clear("settings"),
      SnipThatDB.clear("uiState"),
    ]);
    if (supabaseSyncState) await SnipThatDB.setSetting("supabaseSyncState", supabaseSyncState);
    deps.workspaceState.categoriesExpanded = true;
    deps.workspaceState.expandedCategoryNames = [];
    deps.workspaceState.selectedCategory = "All Categories";
    deps.workspaceState.statsFilter = "total";
    deps.workspaceState.quickFilter = "All";
    deps.workspaceState.timeFilter = "All Time";
    deps.workspaceState.recentNotesVisible = false;
    deps.workspaceState.theme = "dark";
    deps.workspaceState.autoSaveOnCopy = false;
    deps.workspaceState.focusedNoteId = null;
    deps.workspaceState.renamingNoteId = null;
    deps.workspaceState.renamingNoteContext = null;
    await deps.ensureDefaultCategories();
    await deps.loadWorkspaceState();
    setTheme("dark", { persist: true });
    setAutoSaveOnCopy(false, { persist: true });
    deps.renderWorkspace();
    updateSettingsStats();
    deps.scheduleWorkspaceChanged("clear-all-data");
  }

  function positionFloatingIcon() {
    const floatingUi = deps.floatingUiState.floatingUi;
    const maxLeft = Math.max(8, window.innerWidth - 64);
    const maxTop = Math.max(8, window.innerHeight - 64);
    const requestedLeft = Number(floatingUi.iconRect.left);
    const requestedTop = Number(floatingUi.iconRect.top);
    floatingUi.iconRect.left = Number.isFinite(requestedLeft)
      ? clamp(requestedLeft, 8, maxLeft)
      : maxLeft;
    floatingUi.iconRect.top = Number.isFinite(requestedTop)
      ? clamp(requestedTop, 8, maxTop)
      : Math.min(150, maxTop);
    Object.assign(floatingUi.icon.style, {
      left: `${floatingUi.iconRect.left}px`,
      top: `${floatingUi.iconRect.top}px`,
    });
  }

  function positionSidebar() {
    const floatingUi = deps.floatingUiState.floatingUi;
    const rect = normalizeSidebarRect(floatingUi.sidebarRect);
    floatingUi.sidebarRect = rect;
    Object.assign(floatingUi.sidebar.style, {
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      top: `${rect.top}px`,
      right: `${rect.right}px`,
    });
  }

  function keepFloatingUiInBounds() {
    const floatingUi = deps.floatingUiState.floatingUi;
    floatingUi.iconRect.left = clamp(
      floatingUi.iconRect.left,
      8,
      window.innerWidth - 64,
    );
    floatingUi.iconRect.top = clamp(
      floatingUi.iconRect.top,
      8,
      window.innerHeight - 64,
    );
    floatingUi.sidebarRect = normalizeSidebarRect(floatingUi.sidebarRect);
    positionFloatingIcon();
    positionSidebar();
    syncCategoryAnimationHeights(
      floatingUi.sidebar.querySelector('[data-panel="home"]'),
    );
    positionOpenMenus();
  }

  function normalizeSidebarRect(rect) {
    const maxWidth = Math.max(340, window.innerWidth - 24);
    const maxHeight = Math.max(520, window.innerHeight - 24);
    const width = clamp(rect.width, 340, Math.min(560, maxWidth));
    const height = clamp(rect.height, 520, Math.min(860, maxHeight));
    const top = clamp(rect.top, 12, window.innerHeight - height - 12);
    const right = clamp(rect.right, 12, window.innerWidth - width - 12);

    return { width, height, top, right };
  }

  function getHalfExpandedSidebarRect() {
    const availableWidth = Math.max(340, window.innerWidth - 24);
    const availableHeight = Math.max(520, window.innerHeight - 24);
    return normalizeSidebarRect({
      width: clamp(
        Math.round(window.innerWidth * 0.32),
        420,
        Math.min(520, availableWidth),
      ),
      height: clamp(
        Math.round(window.innerHeight * 0.92),
        640,
        Math.min(860, availableHeight),
      ),
      right: 12,
      top: 12,
    });
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  globalThis.SnipazeFloatingShell = {
    init,
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
  };
})();
