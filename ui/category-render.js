(() => {
  const { escapeAttribute, escapeHtml } = globalThis.SnipazeHtmlUtils;

  let deps = null;

  function init(injectedDeps) {
    deps = injectedDeps;
  }

  function renderCategoryFilter(panel) {
    const [quickFilter, timeFilter] = panel.querySelectorAll(".filter-select");
    if (quickFilter) quickFilter.value = deps.workspaceState.quickFilter || "All";
    if (timeFilter) timeFilter.value = deps.workspaceState.timeFilter || "All Time";
  }

  function renderCategories(panel) {
    const list = panel.querySelector("[data-categories]");
    const count = panel.querySelector(".category-count");
    const caret = panel.querySelector(".category-caret");
    const toggle = panel.querySelector(".category-toggle");
    if (!list || !count || !caret || !toggle) return;

    count.textContent = `(${deps.workspaceState.categories.length})`;
    list.innerHTML = deps.workspaceState.categories
      .map(
        (category) => `
      ${renderCategoryGroup(category)}
    `,
      )
      .join("");
    setCategoriesExpanded(deps.workspaceState.categoriesExpanded, {
      persist: false,
      animate: false,
    });
    syncCategoryAnimationHeights(panel);
  }

  function setCategoriesExpanded(expanded, options = {}) {
    deps.workspaceState.categoriesExpanded = expanded;
    if (options.persist !== false) {
      SnipThatDB.setUiState("categoriesExpanded", expanded);
    }

    const panel = deps.getFloatingUi()?.sidebar?.querySelector('[data-panel="home"]');
    const list = panel?.querySelector("[data-categories]");
    const caret = panel?.querySelector(".category-caret");
    const toggle = panel?.querySelector(".category-toggle");
    if (!list || !caret || !toggle) return;

    caret.innerHTML = "&#9654;";
    toggle.setAttribute("aria-expanded", String(expanded));
    list.hidden = false;
    if (options.animate === false) {
      list.style.setProperty(
        "--category-list-height",
        expanded ? `${list.scrollHeight}px` : "0px",
      );
    } else {
      animateMeasuredCollapse(list, expanded, "--category-list-height");
    }
    list.classList.toggle("expanded", expanded);
    list.classList.toggle("collapsed", !expanded);
  }

  function toggleCategoryPanel(categoryName) {
    if (!categoryName) return;
    const isOpen = deps.workspaceState.expandedCategoryNames.includes(categoryName);
    deps.workspaceState.expandedCategoryNames = isOpen
      ? deps.workspaceState.expandedCategoryNames.filter(
          (name) => name !== categoryName,
        )
      : [...deps.workspaceState.expandedCategoryNames, categoryName];
    deps.saveExpandedCategoryNames();

    const group = Array.from(
      deps.getFloatingUi().sidebar.querySelectorAll("[data-category-group]"),
    ).find((item) => item.dataset.category === categoryName);
    if (!group) return;
    const panel = deps.getFloatingUi().sidebar.querySelector('[data-panel="home"]');
    animateMeasuredCollapse(
      group.querySelector(".category-note-list"),
      !isOpen,
      "--category-notes-height",
      () => {
        syncCategoryAnimationHeights(panel);
      },
    );
    group.classList.toggle("open", !isOpen);
    group
      .querySelector(".category-disclosure")
      ?.setAttribute("aria-expanded", String(!isOpen));
    requestAnimationFrame(() => syncCategoryAnimationHeights(panel));
  }

  function syncCategoryAnimationHeights(panel) {
    const list = panel?.querySelector("[data-categories]");
    if (list && deps.workspaceState.categoriesExpanded) {
      list.style.setProperty(
        "--category-list-height",
        `${list.scrollHeight}px`,
      );
    }

    panel?.querySelectorAll("[data-category-group]").forEach((group) => {
      const noteList = group.querySelector(".category-note-list");
      if (noteList && group.classList.contains("open")) {
        noteList.style.setProperty(
          "--category-notes-height",
          `${noteList.scrollHeight}px`,
        );
      }
    });
  }

  function animateMeasuredCollapse(element, expand, propertyName, onFinish) {
    if (!element) return;

    const animatedParent = element.closest(".category-group");
    const animationId = `${Date.now()}-${Math.random()}`;
    element.dataset.categoryAnimationId = animationId;
    element.classList.add("is-animating");
    animatedParent?.classList.add("is-animating");

    element.style.maxHeight = `${element.scrollHeight}px`;
    element.style.setProperty(propertyName, `${element.scrollHeight}px`);
    element.getBoundingClientRect();

    if (expand) {
      element.style.maxHeight = "0px";
      element.style.setProperty(propertyName, "0px");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const targetHeight = `${element.scrollHeight}px`;
          element.style.maxHeight = targetHeight;
          element.style.setProperty(propertyName, targetHeight);
        });
      });
    } else {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          element.style.maxHeight = "0px";
          element.style.setProperty(propertyName, "0px");
        });
      });
    }

    const finish = () => {
      if (element.dataset.categoryAnimationId !== animationId) return;
      delete element.dataset.categoryAnimationId;
      element.classList.remove("is-animating");
      animatedParent?.classList.remove("is-animating");
      if (expand) {
        const targetHeight = `${element.scrollHeight}px`;
        element.style.setProperty(propertyName, targetHeight);
      }
      element.style.maxHeight = "";
      onFinish?.();
    };

    const onTransitionEnd = (event) => {
      if (event.target === element && event.propertyName === "max-height") {
        element.removeEventListener("transitionend", onTransitionEnd);
        finish();
      }
    };

    element.addEventListener("transitionend", onTransitionEnd);
    setTimeout(() => {
      element.removeEventListener("transitionend", onTransitionEnd);
      finish();
    }, 320);
  }

  function renderCategoryGroup(category) {
    const notes = deps.workspaceState.notes.filter(
      (note) => note.category === category.name,
    );
    const expanded = deps.workspaceState.expandedCategoryNames.includes(
      category.name,
    );
    const noteRows = notes.map((note) => renderCategoryMiniNote(note)).join("");

    return `
      <section class="category-group ${expanded ? "open" : ""}" data-category-group data-category="${escapeAttribute(category.name)}">
        <div class="category-row">
          <button class="category-disclosure" type="button" data-action="toggle-category-panel" aria-expanded="${String(expanded)}" title="Expand category">
            <span class="category-mini-caret" aria-hidden="true">&#9654;</span>
          </button>
          <div class="category-select ${deps.workspaceState.selectedCategory === category.name ? "active" : ""}" role="button" tabindex="0" data-category="${escapeAttribute(category.name)}">
            <span class="dot ${escapeAttribute(category.color)}"></span>
            <span class="category-name" title="${escapeAttribute(category.name)}">${escapeHtml(category.name)}</span>
            <span class="category-note-count">${notes.length}</span>
            <span class="category-inline-actions">
              <button class="category-note-add" type="button" data-action="add-category-note" title="Add note to ${escapeAttribute(category.name)}" aria-label="Add note to ${escapeAttribute(category.name)}">+</button>
              <span class="category-actions">
                ${renderCategoryExportMenu(category.name)}
                <span class="chip-icon" role="button" tabindex="0" data-action="rename-category" data-category="${escapeAttribute(category.name)}" title="Rename" aria-label="Rename category">Edit</span>
                <span class="chip-icon danger" role="button" tabindex="0" data-action="delete-category" data-category="${escapeAttribute(category.name)}" title="Delete" aria-label="Delete category">Del</span>
              </span>
            </span>
          </div>
        </div>
        <div class="category-note-create" hidden>
          <div class="title-entry" data-title-entry>
            <div class="title-entry-row">
              <input class="category-note-input" type="text" placeholder="+ Add note..." data-note-category-name="${escapeAttribute(category.name)}" aria-label="Add note to ${escapeAttribute(category.name)}">
              <button class="title-entry-cancel" type="button" data-action="cancel-category-note">Cancel</button>
            </div>
            <div class="title-suggestions" data-title-suggestions hidden></div>
          </div>
        </div>
        <div class="category-note-list">
          ${noteRows || `<div class="category-empty">No notes yet</div>`}
        </div>
      </section>
    `;
  }

  function renderCategoryMiniNote(note) {
    const categoryOptions = renderMenuCategoryButtons(
      note.category,
      "move-mini-note",
    );
    const title = deps.renderNoteTitleControl(note, "mini");

    return `
      <div class="category-mini-note" data-mini-note data-note-id="${escapeAttribute(note.id)}" draggable="true">
        <div class="mini-note-main">
          ${title}
          <span class="note-created-time">${escapeHtml(deps.formatCreatedTimestamp(note.createdAt))}</span>
        </div>
        <div class="note-actions compact" aria-label="Note actions">
          ${deps.renderNoteExportMenu()}
          <details class="mini-menu" draggable="false">
            <summary aria-label="Note options" title="Note options" draggable="false">&#8942;</summary>
            <div class="mini-menu-popover">
              <button type="button" data-action="rename-mini-note">Rename</button>
              <button type="button" data-action="pin-mini-note">${note.pinned ? "Unpin" : "Pin"}</button>
              <button type="button" data-action="toggle-mini-move">Move</button>
              <div class="menu-move-panel" hidden>
                <div class="menu-category-list">${categoryOptions}</div>
              </div>
              <button type="button" data-action="delete-mini-note" class="danger">Delete</button>
            </div>
          </details>
        </div>
      </div>
    `;
  }

  function renderCategoryExportMenu(categoryName) {
    return `
      <details class="category-export" draggable="false">
        <summary aria-label="Download category" title="Download category" draggable="false">Download</summary>
        <div class="category-export-popover">
          <button type="button" data-action="export-category" data-category="${escapeAttribute(categoryName)}" data-format="txt">TXT zip</button>
          <button type="button" data-action="export-category" data-category="${escapeAttribute(categoryName)}" data-format="word">Word zip</button>
          <button type="button" data-action="export-category" data-category="${escapeAttribute(categoryName)}" data-format="pdf">PDF zip</button>
        </div>
      </details>
    `;
  }

  function renderMenuCategoryButtons(activeCategory, action) {
    return deps.workspaceState.categories
      .map(
        (category) => `
      <button
        type="button"
        data-action="${escapeAttribute(action)}"
        data-category="${escapeAttribute(category.name)}"
        class="${category.name === activeCategory ? "active" : ""}"
      >${escapeHtml(category.name)}</button>
    `,
      )
      .join("");
  }

  globalThis.SnipazeCategoryRender = {
    init,
    renderCategoryFilter,
    renderCategories,
    renderMenuCategoryButtons,
    setCategoriesExpanded,
    toggleCategoryPanel,
    syncCategoryAnimationHeights,
  };
})();
