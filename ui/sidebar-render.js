(() => {
  const { escapeAttribute, escapeHtml, sanitizeHtml } = globalThis.SnipazeHtmlUtils;
  const { renderMenuCategoryButtons } = globalThis.SnipazeCategoryRender;

  let deps = null;

  function init(injectedDeps) {
    deps = injectedDeps;
  }

  function renderNoteTitleControl(note, variant = "card") {
    if (
      deps.workspaceState.renamingNoteId === note.id &&
      deps.workspaceState.renamingNoteContext === variant
    ) {
      return `
        <span class="title-entry rename-title-entry" data-title-entry>
          <span class="title-entry-row">
            <input
              class="${variant === "mini" ? "mini-title-input" : "note-title-input"}"
              type="text"
              value="${escapeAttribute(note.title || "Untitled note")}"
              data-note-rename-input
              data-note-id="${escapeAttribute(note.id)}"
              data-rename-context="${escapeAttribute(variant)}"
              aria-label="Rename note"
            >
            <button class="title-entry-cancel" type="button" data-action="cancel-note-rename">Cancel</button>
          </span>
          <span class="title-suggestions" data-title-suggestions hidden></span>
        </span>
      `;
    }

    const className = variant === "mini" ? "mini-title" : "note-title-button";
    return `
      <button class="${className}" type="button" data-action="open-note" title="Open note">
        ${escapeHtml(note.title || "Untitled note")}
      </button>
    `;
  }

  function renderNotes(panel) {
    const grid = panel.querySelector(".notes-grid");
    if (!grid) return;

    grid.innerHTML = deps.workspaceState.notes
      .map((note) => renderNoteListRow(note))
      .join("");
  }

  function renderNoteListRow(note) {
    const menuCategoryOptions = renderMenuCategoryButtons(
      note.category,
      "move-note",
    );
    const title = renderNoteTitleControl(note, "card");
    const category = deps.workspaceState.categories.find(
      (item) => item.name === note.category,
    );
    const color = category?.color || "blue";

    return `
        <article class="note-card note-list-row" data-note-card data-note-id="${escapeAttribute(note.id)}" data-note-type="${escapeAttribute(note.type || "manual")}" data-pinned="${String(Boolean(note.pinned))}" data-recent="${String(deps.isRecentNote(note.createdAt))}" data-category="${escapeAttribute(note.category)}" data-time="${escapeAttribute(deps.getTimeBucket(note.createdAt))}" draggable="true">
          <div class="note-list-main">
            <h3>${title}</h3>
            <span class="note-created-time">${escapeHtml(deps.formatCreatedTimestamp(note.createdAt))}</span>
          </div>
          <div class="note-actions" aria-label="Note actions">
            <span class="note-list-category ${escapeAttribute(color)}">${escapeHtml(note.category || "Uncategorized")}</span>
            ${deps.renderNoteExportMenu()}
            <details class="note-menu" draggable="false">
              <summary aria-label="Note options" title="Note options" draggable="false">&#8942;</summary>
              <div class="note-menu-popover">
                <button type="button" data-action="rename-note">Rename</button>
                <button type="button" data-action="pin-note">${note.pinned ? "Unpin" : "Pin"}</button>
                <button type="button" data-action="archive-note">${note.archived ? "Unarchive" : "Archive"}</button>
                <button type="button" data-action="toggle-note-move">Move</button>
                <div class="menu-move-panel" hidden>
                  <div class="menu-category-list">${menuCategoryOptions}</div>
                </div>
                <button type="button" data-action="delete-note" class="danger">Delete</button>
              </div>
            </details>
          </div>
        </article>
      `;
  }

  function renderNoteCard(note, options = {}) {
    const focused = Boolean(options.focused);
    const editor = Boolean(options.editor);
    const category = deps.workspaceState.categories.find(
      (item) => item.name === note.category,
    );
    const color = category?.color || "blue";
    const metadata = note.metadata || deps.getCaptureMetadata();
    const image = note.imageDataUrl
      ? `<img class="inline-shot" data-legacy-note-image contenteditable="false" src="${escapeAttribute(note.imageDataUrl)}" alt="Inline screenshot">`
      : "";
    const menuCategoryOptions = renderMenuCategoryButtons(
      note.category,
      "move-note",
    );
    const title = renderNoteTitleControl(note, editor ? "editor" : "card");

    return `
        <article class="note-card ${focused ? "focused-note" : ""}" ${editor ? "data-note-editor" : "data-note-card"} data-note-id="${escapeAttribute(note.id)}" data-note-type="${escapeAttribute(note.type || "manual")}" data-pinned="${String(Boolean(note.pinned))}" data-recent="${String(deps.isRecentNote(note.createdAt))}" data-category="${escapeAttribute(note.category)}" data-time="${escapeAttribute(deps.getTimeBucket(note.createdAt))}" draggable="${focused ? "false" : "true"}">
          <div class="note-card-top">
            <span class="note-badge ${escapeAttribute(color)}">${escapeHtml(note.category)}</span>
            ${focused ? `<button class="full-note-button" type="button" data-action="open-full-note">Open Full View</button>` : ""}
            ${focused ? `<button class="structured-edit-toggle" type="button" data-edit-note>Edit</button>` : ""}
            ${focused ? `<button class="collapse-note" type="button" data-action="collapse-note" title="Collapse note" aria-label="Collapse note">&#8722;</button>` : ""}
            ${deps.renderNoteExportMenu()}
            ${renderNoteMenu(note, menuCategoryOptions)}
          </div>
          <div class="note-title-stack">
            <h3>${title}</h3>
            <span class="note-created-time">${escapeHtml(deps.formatCreatedTimestamp(note.createdAt))}</span>
          </div>
          <div class="note-body" contenteditable="true" data-note-body>${note.contentHtml ? sanitizeHtml(note.contentHtml) : escapeHtml(note.content || "")}${image}</div>
        </article>
      `;
  }

  function renderNoteMenu(note, menuCategoryOptions) {
    return `
      <div class="note-actions" aria-label="Note actions">
        <details class="note-menu" draggable="false">
          <summary aria-label="Note options" title="Note options" draggable="false">&#8942;</summary>
          <div class="note-menu-popover">
            <button type="button" data-action="rename-note">Rename</button>
            <button type="button" data-action="pin-note">${note.pinned ? "Unpin" : "Pin"}</button>
            <button type="button" data-action="archive-note">${note.archived ? "Unarchive" : "Archive"}</button>
            <button type="button" data-action="toggle-note-move">Move</button>
            <div class="menu-move-panel" hidden>
              <div class="menu-category-list">${menuCategoryOptions}</div>
            </div>
            <button type="button" data-action="delete-note" class="danger">Delete</button>
          </div>
        </details>
      </div>
    `;
  }

  function renderStats(panel) {
    const today = new Date().toDateString();
    const total = deps.workspaceState.notes.length;
    const todayCount = deps.workspaceState.notes.filter(
      (note) => new Date(note.createdAt).toDateString() === today,
    ).length;
    const pinned = deps.workspaceState.notes.filter((note) => note.pinned).length;
    const storageBytes =
      deps.workspaceState.notes.reduce(
        (sum, note) => sum + deps.byteLength(JSON.stringify(note || {})),
        0,
      ) +
      deps.workspaceState.categories.reduce(
        (sum, category) => sum + deps.byteLength(JSON.stringify(category || {})),
        0,
      );

    panel.querySelector('[data-stat="total"]').textContent = total;
    panel.querySelector('[data-stat="today"]').textContent = todayCount;
    panel.querySelector('[data-stat="pinned"]').textContent = pinned;
    panel.querySelector('[data-stat="storage"]').textContent =
      deps.formatStorageSize(storageBytes);
    panel.querySelectorAll("[data-stat-filter]").forEach((button) => {
      const active = button.dataset.statFilter === deps.workspaceState.statsFilter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  globalThis.SnipazeSidebarRender = {
    init,
    renderNotes,
    renderNoteCard,
    renderStats,
    renderNoteTitleControl,
  };
})();
