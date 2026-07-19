const { sortNotesForDisplay } = globalThis.SnipazeNoteSort;
const pickerSection = document.querySelector("[data-picker]");
const statusElement = document.querySelector("[data-status]");
const notesElement = document.querySelector("[data-notes]");
const categoryElement = document.querySelector("[data-category]");
const createForm = document.querySelector("[data-create-form]");
const titleInput = document.querySelector("[data-title]");
let capture = null,
  notes = [],
  categories = [],
  writeFailed = false;
window.addEventListener("snipaze:db-error", (event) => {
  if (
    /^(add|append|update|delete|save|set|put|remove|clear|replace)/i.test(
      String(event?.detail?.method || ""),
    )
  ) {
    writeFailed = true;
    setStatus("Save failed. Keep this window open and try again.");
  }
});
initialize();
async function initialize() {
  SnipazeThemeManager.applyTheme(document.body, await SnipThatDB.getSetting("theme", "dark"));
  await loadPicker();
}
document.querySelector("[data-close]").addEventListener("click", closePicker);
document.querySelector("[data-create-toggle]").addEventListener("click", () => {
  createForm.hidden = false;
  titleInput.focus();
});
document.querySelector("[data-create-cancel]").addEventListener("click", () => {
  createForm.hidden = true;
  titleInput.value = "";
});
createForm.addEventListener("submit", createNewNote);
const titleSuggestions = document.createElement("div");
titleSuggestions.hidden = true;
titleSuggestions.className = "picker-title-suggestions";
titleSuggestions.style.display = "none";
titleInput.insertAdjacentElement("afterend", titleSuggestions);
function refreshTitleSuggestions() {
  const query = titleInput.value.trim().toLocaleLowerCase();
  const matches = notes
    .filter((note) => !query || String(note.title || "").toLocaleLowerCase().includes(query))
    .slice(0, 8);
  titleSuggestions.replaceChildren(...matches.map((note) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "picker-title-suggestion";
    const title = document.createElement("span");
    title.textContent = note.title || "Untitled note";
    const category = document.createElement("small");
    category.textContent = note.category || "Uncategorized";
    category.className = "picker-title-suggestion-category";
    button.append(title, category);
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      titleInput.value = note.title || "Untitled note";
      titleInput.setSelectionRange(titleInput.value.length, titleInput.value.length);
      titleSuggestions.replaceChildren();
      titleSuggestions.hidden = true;
      titleSuggestions.style.display = "none";
    });
    return button;
  }));
  titleSuggestions.hidden = !matches.length;
  titleSuggestions.style.display = matches.length ? "grid" : "none";
}
titleInput.addEventListener("focus", refreshTitleSuggestions);
titleInput.addEventListener("input", refreshTitleSuggestions);
titleInput.addEventListener("blur", () => setTimeout(() => { titleSuggestions.hidden = true; titleSuggestions.style.display = "none"; }, 0));
async function loadWorkspaceForCapture() {
  [notes, categories] = await Promise.all([
    SnipThatDB.getNotes(),
    SnipThatDB.getCategories(),
  ]);
  notes = sortNotesForDisplay(notes);
  if (!categories.length) {
    const category = {
      name: "Research",
      color: "green",
      createdAt: Date.now(),
    };
    await SnipThatDB.addCategory(category);
    categories = [category];
  }
  categoryElement.innerHTML = categories
    .map(
      (c) =>
        `<option value="${escapeAttribute(c.name)}"${c.name === "Research" ? " selected" : ""}>${escapeHtml(c.name)}</option>`,
    )
    .join("");
  renderNotes();
  pickerSection.hidden = false;
  setStatus("");
}
async function loadPicker() {
  capture = await SnipThatDB.getSetting("pendingClipboardCapture", null);
  if (!capture?.text) {
    setStatus(
      "No selected text found. Select text, right-click, and try again.",
    );
    return;
  }
  await loadWorkspaceForCapture();
}
function renderNotes() {
  notesElement.innerHTML = notes.length
    ? notes
        .map((n) => {
          const color =
            categories.find((c) => c.name === n.category)?.color || "blue";
          return `<button type="button" data-note="${escapeAttribute(n.id)}"><span>${escapeHtml(n.title || "Untitled note")}</span><small class="${escapeAttribute(color)}">${escapeHtml(n.category || "Uncategorized")}</small></button>`;
        })
        .join("")
    : '<div class="empty">No notes available.</div>';
  notesElement
    .querySelectorAll("[data-note]")
    .forEach((button) =>
      button.addEventListener("click", () => appendToNote(button.dataset.note)),
    );
}
async function appendToNote(id) {
  const note = notes.find((item) => item.id === id);
  if (!note || !capture) return;
  writeFailed = false;
  await SnipThatDB.appendNoteHtml(id, createSourceHtml(), Date.now());
  if (writeFailed) return;
  await finish("Saved to note.");
}
function findNotesWithTitle(title) {
  const normalized = String(title || "").trim().toLocaleLowerCase();
  return notes.filter((note) => String(note?.title || "").trim().toLocaleLowerCase() === normalized);
}
function chooseDuplicateTitle(title) {
  const matches = findNotesWithTitle(title);
  if (!matches.length) return Promise.resolve({ action: "new" });
  return new Promise((resolve) => {
    document.querySelector("[data-duplicate-prompt]")?.remove();
    const overlay=document.createElement("div"); overlay.dataset.duplicatePrompt=""; overlay.className="picker-duplicate-overlay";
    const panel=document.createElement("div"); panel.className="picker-duplicate-panel";
    const heading=document.createElement("strong"); heading.textContent="Note name already exists";
    const message=document.createElement("p"); message.textContent=matches.length===1?`A note named "${title}" already exists in "${matches[0].category||"Uncategorized"}".`:`${matches.length} notes named "${title}" already exist. Choose one to use.`;
    const select=document.createElement("select");
    matches.forEach((note)=>{const option=document.createElement("option");option.value=note.id;option.textContent=`${note.title} - ${note.category||"Uncategorized"}`;select.append(option);}); if(matches.length===1)select.hidden=true;
    const actions=document.createElement("div");actions.className="picker-duplicate-actions";
    const finishChoice=(action)=>{document.removeEventListener("keydown",onKeydown,true);overlay.remove();resolve({action,note:matches.find((note)=>note.id===select.value)||matches[0]});};
    const makeButton=(label,action)=>{const button=document.createElement("button");button.type="button";button.textContent=label;button.addEventListener("click",()=>finishChoice(action));return button;};
    const onKeydown=(event)=>{if(event.key==="Escape")finishChoice("cancel");};
    actions.append(makeButton("Cancel","cancel"),makeButton("Create New","new"),makeButton("Use Existing","existing"));panel.append(heading,message,select,actions);overlay.append(panel);
    overlay.addEventListener("click",(event)=>{if(event.target===overlay)finishChoice("cancel");});document.body.append(overlay);document.addEventListener("keydown",onKeydown,true);
  });
}
async function createNewNote(event) {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    return;
  }
  const choice = await chooseDuplicateTitle(title);
  if (choice.action === "cancel") return;
  if (choice.action === "existing") { await appendToNote(choice.note.id); return; }
  const now = Date.now();
  writeFailed = false;
  await SnipThatDB.addNote({
    id: `${now}-${Math.random().toString(16).slice(2)}`,
    title,
    type: "copy",
    content: capture.text,
    contentHtml: createSourceHtml(),
    category: categoryElement.value || categories[0].name,
    imageDataUrl: "",
    metadata: capture.metadata,
    pinned: false,
    createdAt: now,
    updatedAt: now,
  });
  if (writeFailed) return;
  await finish("New note created.");
}
function createSourceHtml() {
  const m = capture.metadata || {};
  return `<section class="source-snippet" data-timestamp="${Date.now()}"><div>${escapeHtml(capture.text).replace(/\n/g, "<br>")}</div><p class="source-meta">Source: ${escapeHtml(m.title || m.host || "Current document")}<br>Link: <a href="${escapeAttribute(m.url || "")}" target="_blank" rel="noopener noreferrer">${escapeHtml(m.url || "")}</a><br>Captured: ${escapeHtml(m.fullDate || "")} &bull; ${escapeHtml(m.time || "")}</p></section>`;
}
async function finish(message) {
  await clearPendingCaptureIfCurrent();
  await sendMessage({
    type: "WORKSPACE_CHANGED",
    reason: "selection-save",
    targetWindowId: capture?.metadata?.windowId,
  });
  setStatus(message);
  setTimeout(closePickerWindow, 350);
}
async function closePicker() {
  await clearPendingCaptureIfCurrent();
  await closePickerWindow();
}

async function clearPendingCaptureIfCurrent() {
  const pending = await SnipThatDB.getSetting("pendingClipboardCapture", null);
  if (!pending || !capture) return;
  const sameCapture = capture.captureId
    ? pending.captureId === capture.captureId
    : !pending.captureId && pending.text === capture.text;
  if (sameCapture) {
    await SnipThatDB.setSetting("pendingClipboardCapture", null);
  }
}
async function closePickerWindow() {
  try {
    const current = await chrome.windows.getCurrent();
    if (current?.type === "popup" && Number.isInteger(current.id)) {
      await chrome.windows.remove(current.id);
      return;
    }
  } catch {}
  window.close();
}
function setStatus(text) {
  statusElement.textContent = text;
}
function sendMessage(message) {
  return new Promise((resolve) =>
    chrome.runtime.sendMessage(message, (response) =>
      resolve(chrome.runtime.lastError ? null : response),
    ),
  );
}
const { escapeHtml, escapeAttribute } = globalThis.SnipazeHtmlUtils;
