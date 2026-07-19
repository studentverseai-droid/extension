(() => {
  const { escapeAttribute, escapeHtml, sanitizeHtml } = globalThis.SnipazeHtmlUtils;

  const ROOT_ID = "snip-ocr-root";
  const COPY_PICKER_ROOT_ID = "snip-ocr-copy-picker-root";
  const CAPTURE_INSERT_PICKER_ROOT_ID = "snip-ocr-capture-insert-picker-root";

  let deps = null;

  function init(injectedDeps) {
    deps = injectedDeps;
  }

  function ensureStyles() {
    if (document.getElementById("snip-ocr-styles")) return;

    const style = document.createElement("style");
    style.id = "snip-ocr-styles";
    style.textContent = globalThis.SnipazeCaptureModalStyles
      ? globalThis.SnipazeCaptureModalStyles(ROOT_ID, COPY_PICKER_ROOT_ID, CAPTURE_INSERT_PICKER_ROOT_ID)
      : "";

    document.documentElement.append(style);
  }

  function findNotesWithTitle(title, notes = deps.workspaceState.notes) {
    const normalized = String(title || "").trim().toLocaleLowerCase();
    if (!normalized) return [];
    return notes.filter((note) => String(note?.title || "").trim().toLocaleLowerCase() === normalized);
  }

  function chooseDuplicateTitle(title, notes = deps.workspaceState.notes, options = {}) {
    const matches = findNotesWithTitle(title, notes);
    if (!matches.length) return Promise.resolve({ action: "new" });
    return new Promise((resolve) => {
      document.getElementById("snipaze-duplicate-title-prompt")?.remove();
      const overlay = document.createElement("div");
      overlay.id = "snipaze-duplicate-title-prompt";
      overlay.className = "snipaze-duplicate-title-overlay";
      const panel = document.createElement("div");
      panel.className = "snipaze-duplicate-title-panel";
      const heading = document.createElement("strong"); heading.className = "snipaze-duplicate-title-heading"; heading.textContent = "Note name already exists";
      const message = document.createElement("p");
      message.textContent = matches.length === 1 ? `A note named "${title}" already exists in "${matches[0].category || "Uncategorized"}".` : `${matches.length} notes named "${title}" already exist. Choose one to use.`;
      const select = document.createElement("select");
      select.className = "snipaze-duplicate-title-select";
      matches.forEach((note) => { const option=document.createElement("option"); option.value=note.id; option.textContent=`${note.title} - ${note.category || "Uncategorized"}`; select.append(option); });
      if (matches.length === 1) select.hidden = true;
      const actions = document.createElement("div"); actions.className = "snipaze-duplicate-title-actions";
      const finishChoice = (action) => { document.removeEventListener("keydown", onKeydown, true); overlay.remove(); resolve({ action, note: matches.find((note) => note.id === select.value) || matches[0] }); };
      const makeButton = (label, action) => { const button=document.createElement("button"); button.type="button"; button.textContent=label; button.className = action === "existing" ? "snipaze-duplicate-title-button primary" : "snipaze-duplicate-title-button"; button.addEventListener("click",()=>finishChoice(action)); return button; };
      const onKeydown = (event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finishChoice("cancel"); } };
      actions.append(makeButton("Cancel","cancel"),makeButton(options.newLabel || "Create New","new"),makeButton(options.existingLabel || "Use Existing","existing"));
      panel.append(heading,message,select,actions); overlay.append(panel);
      overlay.addEventListener("click",(event)=>{if(event.target===overlay) finishChoice("cancel");});
      document.documentElement.append(overlay); document.addEventListener("keydown",onKeydown,true);
    });
  }

  function attachPickerTitleSuggestions(input, excludeId = "") {
    globalThis.SnipazeTitleSuggestions?.attach(input, {
      getNotes: () => deps.workspaceState.notes,
      excludeId,
    });
  }
  function showCopiedTextNotePicker(text, metadata) {
    document.getElementById(COPY_PICKER_ROOT_ID)?.remove();
    ensureStyles();

    const root = document.createElement("div");
    root.id = COPY_PICKER_ROOT_ID;
    root.classList.toggle("light-theme", deps.workspaceState.theme === "light");

    const backdrop = document.createElement("div");
    backdrop.className = "snip-ocr-copy-picker-backdrop";
    backdrop.addEventListener("click", closeCopiedTextNotePicker);

    const modal = document.createElement("div");
    modal.className = "snip-ocr-copy-picker";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-label", "Select note to paste");
    modal.addEventListener("click", (clickEvent) =>
      clickEvent.stopPropagation(),
    );

    const notes = deps.workspaceState.notes;
    modal.innerHTML = `
      <div class="snip-ocr-copy-picker-header">
        <strong>Select note to paste</strong>
      </div>
      <div class="snip-ocr-copy-picker-list">
        <button class="snip-ocr-copy-picker-create" type="button" data-copy-create-note>
          + Create New Note
        </button>
        <div class="snip-ocr-copy-new-note" data-copy-new-note hidden>
          <label>
            <span>New Note Name</span>
            <input type="text" data-copy-new-note-title placeholder="Enter note name...">
          </label>
          <label>
            <span>Category</span>
            <select data-copy-new-note-category>
              ${deps.renderNoteCategoryOptions("Research")}
            </select>
          </label>
          <div class="snip-ocr-copy-new-actions">
            <button type="button" data-copy-confirm-create>Create</button>
            <button type="button" data-copy-cancel-create>Cancel</button>
          </div>
        </div>
        ${
          notes.length
            ? notes
                .map(
                  (note) => `
          <button type="button" data-copy-note-id="${escapeAttribute(note.id)}">
            ${renderPickerNoteLabel(note)}
          </button>
        `,
                )
                .join("")
            : `<div class="snip-ocr-copy-picker-empty">No notes available.</div>`
        }
      </div>
      <button class="snip-ocr-copy-picker-cancel" type="button" data-copy-picker-cancel>Cancel</button>
    `;

    modal
      .querySelector("[data-copy-picker-cancel]")
      ?.addEventListener("click", closeCopiedTextNotePicker);
    const createForm = modal.querySelector("[data-copy-new-note]");
    const createInput = modal.querySelector("[data-copy-new-note-title]");
    const createCategory = modal.querySelector("[data-copy-new-note-category]");
    const createButton = modal.querySelector("[data-copy-create-note]");
    attachPickerTitleSuggestions(createInput);

    const submitNewNote = async () => {
      const title = createInput.value.trim();
      if (!title) {
        createInput.focus();
        return;
      }
      const choice = await chooseDuplicateTitle(title);
      if (choice.action === "cancel") return;
      if (choice.action === "existing") {
        await deps.insertInlineCaptureIntoNote(choice.note.id, { html: deps.createCopiedTextInlineHtml(text, metadata), plainText: text });
        closeCopiedTextNotePicker();
        return;
      }
      await createNoteFromCopiedText(text, metadata, title, createCategory?.value);
      closeCopiedTextNotePicker();
    };
    createButton?.addEventListener("click", () => {
      createForm.hidden = false;
      createButton.hidden = true;
      requestAnimationFrame(() => createInput.focus());
    });
    modal
      .querySelector("[data-copy-confirm-create]")
      ?.addEventListener("click", submitNewNote);
    modal
      .querySelector("[data-copy-cancel-create]")
      ?.addEventListener("click", () => {
        createInput.value = "";
        createForm.hidden = true;
        createButton.hidden = false;
      });
    createInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitNewNote();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        createInput.value = "";
        createForm.hidden = true;
        createButton.hidden = false;
      }
    });
    modal.querySelectorAll("[data-copy-note-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (button.disabled) return;
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        const previousLabel = button.innerHTML;
        button.textContent = "Saving...";
        try {
          await deps.insertInlineCaptureIntoNote(button.dataset.copyNoteId, {
            html: deps.createCopiedTextInlineHtml(text, metadata),
            plainText: text,
          });
          closeCopiedTextNotePicker();
        } catch (error) {
          button.disabled = false;
          button.removeAttribute("aria-busy");
          button.innerHTML = previousLabel;
          throw error;
        }
      });
    });

    root.append(backdrop, modal);
    document.documentElement.append(root);
    document.addEventListener("keydown", closeCopiedTextPickerOnEscape, true);
  }

  async function createNoteFromCopiedText(text, metadata, title, categoryName) {
    await deps.ensureDefaultCategories();
    const category = await deps.getWritableCategory("Research", categoryName);
    const note = deps.createNote({
      title: title || deps.createTitleFromText(text) || "Copied text",
      content: text,
      contentHtml: deps.createCopiedTextInlineHtml(text, metadata),
      category,
      metadata,
      type: "copy",
    });
    const savedNote = await SnipThatDB.addNote(note);
    deps.scheduleWorkspaceChanged("notes");
    deps.upsertWorkspaceNote(savedNote);
  }

  function renderPickerNoteLabel(note) {
    const category = deps.workspaceState.categories.find(
      (item) => item.name === note.category,
    );
    const color = category?.color || "blue";
    return `
      <span class="snip-ocr-picker-note-main">${escapeHtml(note.title || "Untitled note")}</span>
      <span class="snip-ocr-picker-note-category ${escapeAttribute(color)}">${escapeHtml(note.category || "Uncategorized")}</span>
    `;
  }

  function closeCopiedTextNotePicker() {
    document.getElementById(COPY_PICKER_ROOT_ID)?.remove();
    document.removeEventListener(
      "keydown",
      closeCopiedTextPickerOnEscape,
      true,
    );
  }

  function closeCopiedTextPickerOnEscape(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCopiedTextNotePicker();
    }
  }

  function showCaptureInsertNotePicker({
    text,
    imageDataUrl,
    metadata,
    include,
    fallbackTitle,
    onInserted,
    createOnly = false,
    autoOpenCreate = false,
    htmlOverride = "",
    htmlFactory = null,
    plainTextFactory = null,
  }) {
    document.getElementById(CAPTURE_INSERT_PICKER_ROOT_ID)?.remove();
    document
      .getElementById(ROOT_ID)
      ?.classList.add("snip-ocr-insert-picker-open");
    ensureStyles();

    const root = document.createElement("div");
    root.id = CAPTURE_INSERT_PICKER_ROOT_ID;
    root.classList.toggle("light-theme", deps.workspaceState.theme === "light");

    const backdrop = document.createElement("div");
    backdrop.className = "snip-ocr-copy-picker-backdrop";
    backdrop.addEventListener("click", closeCaptureInsertNotePicker);

    const modal = document.createElement("div");
    modal.className = "snip-ocr-copy-picker";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-label", "Select note to insert");
    modal.addEventListener("click", (clickEvent) =>
      clickEvent.stopPropagation(),
    );

    const notes = deps.workspaceState.notes;
    modal.innerHTML = `
      <div class="snip-ocr-copy-picker-header">
        <strong>Select note to insert</strong>
      </div>
      ${metadata?.captureType === "Page Reference" ? `<label class="snip-ocr-page-reference-note"><span>Personal note (optional)</span><textarea data-page-reference-note placeholder="Why are you saving this page?"></textarea></label>` : ""}
      <div class="snip-ocr-copy-picker-list">
        <button class="snip-ocr-copy-picker-create" type="button" data-capture-create-note>
          + Create New Note
        </button>
        <div class="snip-ocr-copy-new-note" data-capture-new-note hidden>
          <label>
            <span>New Note Name</span>
            <input type="text" data-capture-new-note-title placeholder="Enter note name...">
          </label>
          <label>
            <span>Category</span>
            <select data-capture-new-note-category>
              ${deps.renderNoteCategoryOptions(metadata?.captureType === "Screenshot" ? "General" : "Research")}
            </select>
          </label>
          <div class="snip-ocr-copy-new-actions">
            <button type="button" data-capture-confirm-create>Create</button>
            <button type="button" data-capture-cancel-create>Cancel</button>
          </div>
        </div>
        ${
          !createOnly && notes.length
            ? notes
                .map(
                  (note) => `
          <button type="button" data-capture-insert-note-id="${escapeAttribute(note.id)}">
            ${renderPickerNoteLabel(note)}
          </button>
        `,
                )
                .join("")
            : createOnly
              ? ""
              : `<div class="snip-ocr-copy-picker-empty">No notes available.</div>`
        }
      </div>
      <button class="snip-ocr-copy-picker-cancel" type="button" data-capture-picker-cancel>Cancel</button>
    `;

    const pageReferenceNote = modal.querySelector("[data-page-reference-note]");
    const resolveHtml = () =>
      htmlFactory?.(pageReferenceNote?.value.trim() || "") ||
      htmlOverride ||
      deps.createCaptureInlineHtml({ text, imageDataUrl, metadata, include });
    const resolvePlainText = () =>
      plainTextFactory?.(pageReferenceNote?.value.trim() || "") ||
      text ||
      "Capture";
    const createForm = modal.querySelector("[data-capture-new-note]");
    const createInput = modal.querySelector("[data-capture-new-note-title]");
    const createCategory = modal.querySelector(
      "[data-capture-new-note-category]",
    );
    const createButton = modal.querySelector("[data-capture-create-note]");
    attachPickerTitleSuggestions(createInput);

    const finish = async (callback) => {
      await callback();
      closeCaptureInsertNotePicker();
      onInserted?.();
    };
    const submitNewNote = async () => {
      const title = createInput.value.trim();
      if (!title) {
        createInput.focus();
        return;
      }
      const choice = await chooseDuplicateTitle(title);
      if (choice.action === "cancel") return;
      if (choice.action === "existing") {
        await finish(() => deps.insertInlineCaptureIntoNote(choice.note.id, { html: resolveHtml(), plainText: resolvePlainText() }));
        return;
      }
      await finish(() =>
        createNoteFromCaptureInsert({
          title,
          html: resolveHtml(),
          plainText: resolvePlainText(),
          metadata,
          categoryName: createCategory?.value,
        }),
      );
    };

    modal
      .querySelector("[data-capture-picker-cancel]")
      ?.addEventListener("click", closeCaptureInsertNotePicker);
    createButton?.addEventListener("click", () => {
      createForm.hidden = false;
      createButton.hidden = true;
      createInput.value = fallbackTitle || "";
      requestAnimationFrame(() => {
        createInput.focus();
        createInput.select();
      });
    });
    modal
      .querySelector("[data-capture-confirm-create]")
      ?.addEventListener("click", submitNewNote);
    modal
      .querySelector("[data-capture-cancel-create]")
      ?.addEventListener("click", () => {
        createInput.value = "";
        createForm.hidden = true;
        createButton.hidden = false;
      });
    createInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitNewNote();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        createInput.value = "";
        createForm.hidden = true;
        createButton.hidden = false;
      }
    });
    if (autoOpenCreate) {
      createForm.hidden = false;
      createButton.hidden = true;
      createInput.value = fallbackTitle || "";
      requestAnimationFrame(() => {
        createInput.focus();
        createInput.select();
      });
    }
    modal
      .querySelectorAll("[data-capture-insert-note-id]")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          if (button.disabled) return;
          button.disabled = true;
          button.setAttribute("aria-busy", "true");
          const previousLabel = button.innerHTML;
          button.textContent = "Saving...";
          try {
            await finish(() =>
              deps.insertInlineCaptureIntoNote(button.dataset.captureInsertNoteId, {
                html: resolveHtml(),
                plainText: resolvePlainText(),
              }),
            );
          } catch (error) {
            button.disabled = false;
            button.removeAttribute("aria-busy");
            button.innerHTML = previousLabel;
            throw error;
          }
        });
      });

    root.append(backdrop, modal);
    document.documentElement.append(root);
    document.addEventListener(
      "keydown",
      closeCaptureInsertPickerOnEscape,
      true,
    );
  }

  async function createNoteFromCaptureInsert({
    title,
    html,
    plainText,
    metadata,
    categoryName,
  }) {
    await deps.ensureDefaultCategories();
    const category = await deps.getWritableCategory(
      metadata?.captureType === "Screenshot" ? "General" : "Research",
      categoryName,
    );
    const note = deps.createNote({
      title,
      content: plainText,
      contentHtml: sanitizeHtml(html),
      category,
      metadata,
      type:
        metadata?.captureType === "Screenshot"
          ? "screenshot"
          : ["Page Reference", "Saved Link"].includes(metadata?.captureType)
            ? "link"
            : "ocr",
    });
    const savedNote = await SnipThatDB.addNote(note);
    deps.scheduleWorkspaceChanged("notes");
    deps.upsertWorkspaceNote(savedNote);
  }

  function closeCaptureInsertNotePicker() {
    document.getElementById(CAPTURE_INSERT_PICKER_ROOT_ID)?.remove();
    document
      .getElementById(ROOT_ID)
      ?.classList.remove("snip-ocr-insert-picker-open");
    document.removeEventListener(
      "keydown",
      closeCaptureInsertPickerOnEscape,
      true,
    );
  }

  function closeCaptureInsertPickerOnEscape(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCaptureInsertNotePicker();
    }
  }

  function cleanup() {
    document.removeEventListener("keydown", closeCopiedTextPickerOnEscape, true);
    document.removeEventListener("keydown", closeCaptureInsertPickerOnEscape, true);
  }

  globalThis.SnipazeNotePicker = {
    init,
    cleanup,
    chooseDuplicateTitle,
    showCopiedTextNotePicker,
    closeCopiedTextNotePicker,
    showCaptureInsertNotePicker,
    closeCaptureInsertNotePicker,
    ensureStyles,
  };
})();
