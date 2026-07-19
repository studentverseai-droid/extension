const { sortNotesForDisplay } = globalThis.SnipazeNoteSort;
const listEl = document.querySelector("[data-note-list]");
const readerEl = document.querySelector("[data-reader]");
const searchEl = document.querySelector("[data-search]");
const statusEl = document.querySelector("[data-status]");
let notes = [];
let activeId = "";
let saveTimer = null;
let saveFailed = false;
let savePromise = Promise.resolve();
let titleSuggestionBox = null;
let renameDecisionPromise = null;

function matchingTitles(value, excludeId = "") {
  const query = String(value || "").trim().toLocaleLowerCase();
  return notes.filter((note) => note.id !== excludeId && (!query || String(note.title || "").toLocaleLowerCase().includes(query))).slice(0, 8);
}
function hideTitleSuggestions() {
  const boxToRemove = titleSuggestionBox;
  setTimeout(() => {
    boxToRemove?.remove();
    if (titleSuggestionBox === boxToRemove) titleSuggestionBox = null;
  }, 120);
}
function showTitleSuggestions(titleElement) {
  titleSuggestionBox?.remove();
  const matches = matchingTitles(titleElement.textContent, activeId);
  if (!matches.length) return;
  const rect = titleElement.getBoundingClientRect();
  const box = document.createElement("div"); titleSuggestionBox = box;
  box.className = "reader-title-suggestions";
  Object.assign(box.style,{left:`${rect.left}px`,top:`${rect.bottom+4}px`,width:`${Math.min(Math.max(rect.width,280),520)}px`});
  matches.forEach((note)=>{const button=document.createElement("button");button.type="button";button.textContent=`${note.title || "Untitled note"} - ${note.category || "Uncategorized"}`;button.addEventListener("mousedown",(event)=>{event.preventDefault();titleElement.textContent=note.title || "Untitled note";box.remove();titleSuggestionBox=null;titleElement.focus();});box.append(button);});
  document.body.append(box);
}
function chooseRenameDuplicate(title, matches) {
  if (!matches.length) return Promise.resolve({action:"rename"});
  return new Promise((resolve)=>{
    const overlay=document.createElement("div");overlay.className="reader-duplicate-overlay";
    const panel=document.createElement("div");panel.className="reader-duplicate-panel";
    const heading=document.createElement("strong");heading.textContent="Note name already exists";
    const message=document.createElement("p");message.textContent=matches.length===1?`A note named "${title}" already exists in "${matches[0].category||"Uncategorized"}".`:`${matches.length} notes named "${title}" already exist. Choose one to open.`;
    const select=document.createElement("select");matches.forEach((note)=>{const option=document.createElement("option");option.value=note.id;option.textContent=`${note.title} - ${note.category||"Uncategorized"}`;select.append(option);});if(matches.length===1)select.hidden=true;
    const actions=document.createElement("div");actions.className="reader-duplicate-actions";
    const done=(action)=>{overlay.remove();resolve({action,note:matches.find((note)=>note.id===select.value)||matches[0]});};
    [["Cancel","cancel"],["Rename Anyway","rename"],["Open Existing","existing"]].forEach(([label,action])=>{const button=document.createElement("button");button.type="button";button.textContent=label;button.addEventListener("click",()=>done(action));actions.append(button);});panel.append(heading,message,select,actions);overlay.append(panel);document.body.append(overlay);
  });
}

let proActive = false;
let proStatus = null;
const ACTIVE_SUPABASE_SYNC_INTERVAL_MS = 5000;
let activeSupabaseSyncTimer = null;
let activeSupabaseSyncRunning = false;

function showProOverlay() {
  const overlay = document.createElement("div"); overlay.className = "reader-duplicate-overlay";
  const panel = document.createElement("div"); panel.className = "reader-duplicate-panel";
  panel.innerHTML = SnipazePro.renderProPanelHtml(proStatus);
  const actions = document.createElement("div"); actions.className = "reader-duplicate-actions";
  const ctaButton = panel.querySelector(".pro-cta");
  if (ctaButton) {
    actions.append(ctaButton);
    if (ctaButton.dataset.action === "start-pro-signin") {
      ctaButton.addEventListener("click", (event) => SnipazePro.handleProCtaClick(event.currentTarget));
    } else if (ctaButton.dataset.action === "open-pricing") {
      ctaButton.addEventListener("click", (event) => SnipazePro.handleUpgradeClick(event.currentTarget));
    }
  }
  const closeButton = document.createElement("button"); closeButton.type = "button"; closeButton.textContent = "Close";
  closeButton.addEventListener("click", () => overlay.remove());
  actions.append(closeButton);
  panel.append(actions);
  overlay.append(panel);
  document.body.append(overlay);
}

init();

async function refreshProState() {
  const response = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "REFRESH_PRO_STATUS" }, (result) => {
      resolve(chrome.runtime.lastError ? null : result);
    });
  });
  proActive = response?.ok && response.isPaid === true;
  proStatus = response?.ok ? response : null;
  SnipazePro.applyProToolState(document, proActive);
}

async function init() {
  SnipazeThemeManager.applyTheme(document.body, await SnipThatDB.getSetting("theme", "dark"));
  await refreshProState();
  notes = sortNotesForDisplay(await SnipThatDB.getNotes());
  activeId =
    new URL(location.href).searchParams.get("note") || notes[0]?.id || "";
  if (!notes.some((note) => note.id === activeId))
    activeId = notes[0]?.id || "";
  render();
  startActiveSupabaseSyncPolling();
  if (location.hash === "#pro") showProOverlay();
}

function shouldRunActiveSupabaseSync() {
  return document.visibilityState === "visible" && proActive === true;
}

async function runActiveSupabaseSync() {
  if (!shouldRunActiveSupabaseSync() || activeSupabaseSyncRunning) return;
  activeSupabaseSyncRunning = true;
  try {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "RUN_SUPABASE_SYNC", source: "full-view" }, () => resolve());
    });
  } finally {
    activeSupabaseSyncRunning = false;
  }
}

function startActiveSupabaseSyncPolling() {
  clearInterval(activeSupabaseSyncTimer);
  activeSupabaseSyncTimer = setInterval(runActiveSupabaseSync, ACTIVE_SUPABASE_SYNC_INTERVAL_MS);
  document.addEventListener("visibilitychange", runActiveSupabaseSync);
  window.addEventListener("beforeunload", () => clearInterval(activeSupabaseSyncTimer), { once: true });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "SYNC_WORKSPACE_STATE") {
    SnipThatDB.getSetting("theme", "dark").then((theme) =>
      SnipazeThemeManager.applyTheme(document.body, theme),
    );
    refreshProState();
    refreshNotes();
  }
});

function render() {
  titleSuggestionBox?.remove();
  titleSuggestionBox = null;
  const query = searchEl.value.trim().toLowerCase();
  const visible = notes.filter((note) =>
    `${note.title || ""} ${note.category || ""} ${plainText(note)}`
      .toLowerCase()
      .includes(query),
  );
  listEl.innerHTML = visible.length
    ? visible
        .map(
          (note) =>
            `<button class="note-item ${note.id === activeId ? "active" : ""}" data-id="${escapeAttr(note.id)}"><strong>${escapeHtml(note.title || "Untitled note")}</strong><small>${escapeHtml(note.category || "Uncategorized")}</small></button>`,
        )
        .join("")
    : '<div class="empty">No matching notes.</div>';
  listEl
    .querySelectorAll("[data-id]")
    .forEach((button) =>
      button.addEventListener("click", () => openNote(button.dataset.id)),
    );

  const note = notes.find((item) => item.id === activeId);
  if (!note) {
    const editButton = document.querySelector("[data-edit-note]");
    if (editButton) { editButton.disabled = true; editButton.textContent = "Edit"; editButton.onclick = null; }
    readerEl.innerHTML = '<div class="empty">Select a note to read.</div>';
    updateButtons();
    return;
  }
  const editButton = document.querySelector("[data-edit-note]");
  if (editButton) editButton.disabled = false;
  readerEl.innerHTML = `<h1 contenteditable="true" data-title>${escapeHtml(note.title || "Untitled note")}</h1><div class="meta"><span class="badge">${escapeHtml(note.category || "Uncategorized")}</span><span>${escapeHtml(formatDate(note.updatedAt || note.createdAt))}</span></div><div class="body" contenteditable="true" data-body>${note.contentHtml ? sanitizeHtml(note.contentHtml) : escapeHtml(note.content || "").replace(/\n/g, "<br>")}${note.imageDataUrl ? `<img class="note-image" data-legacy-note-image contenteditable="false" src="${escapeAttr(note.imageDataUrl)}" alt="Captured screenshot">` : ""}</div>`;
  globalThis.SnipazeStructuredEditor?.enhance(readerEl.querySelector("[data-body]"), { toggle: document.querySelector("[data-edit-note]") });
  readerEl.querySelector("[data-title]").addEventListener("input", (event) => { statusEl.textContent = "Editing title"; showTitleSuggestions(event.currentTarget); });
  readerEl.querySelector("[data-body]").addEventListener("input", (event) => {
    globalThis.SnipazeStructuredEditor?.touchActiveBlockTimestamp(event.currentTarget);
    queueSave();
  });
  readerEl.querySelector("[data-title]").addEventListener("blur", () => { hideTitleSuggestions(); saveNow(); });
  readerEl.querySelector("[data-body]").addEventListener("blur", saveNow);
  readerEl
    .querySelector("[data-title]")
    .addEventListener("paste", onTitlePaste);
  readerEl.querySelector("[data-body]").addEventListener("paste", onBodyPaste);
  history.replaceState(null, "", `?note=${encodeURIComponent(activeId)}`);
  document.title = `${note.title || "Untitled note"} - Snipaze`;
  updateButtons();
}

async function openNote(id) {
  const saveResult = await saveNow();
  if (saveResult?.openedExisting) return;
  activeId = id;
  statusEl.textContent = "Ready";
  render();
}

function queueSave() {
  statusEl.textContent = "Saving...";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 250);
}

async function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  const note = notes.find((item) => item.id === activeId);
  const body = readerEl.querySelector("[data-body]");
  const title = readerEl.querySelector("[data-title]");
  if (!note || !body || !title) return;
  const nextTitle = title.textContent.trim() || "Untitled note";
  let titleToSave = nextTitle;
  let existingNoteToOpen = null;
  if (nextTitle.toLocaleLowerCase() !== String(note.title || "").trim().toLocaleLowerCase()) {
    const matches = notes.filter((item) => item.id !== note.id && String(item.title || "").trim().toLocaleLowerCase() === nextTitle.toLocaleLowerCase());
    if (!renameDecisionPromise) {
      renameDecisionPromise = chooseRenameDuplicate(nextTitle, matches).finally(() => { renameDecisionPromise = null; });
    }
    const choice = await renameDecisionPromise;
    if (choice.action === "cancel") {
      titleToSave = note.title || "Untitled note";
      title.textContent = titleToSave;
      statusEl.textContent = "Rename cancelled; saving content...";
    }
    if (choice.action === "existing") {
      titleToSave = note.title || "Untitled note";
      existingNoteToOpen = choice.note;
    }
  }
  const patch = {
    title: titleToSave,
    contentHtml: sanitizeHtml(globalThis.SnipazeStructuredEditor?.serialize(body) ?? body.innerHTML),
    imageDataUrl: globalThis.SnipazeStructuredEditor?.hasDeletedLegacyImage(body) ? "" : note.imageDataUrl,
    updatedAt: Date.now(),
  };
  const noteId = note.id;
  savePromise = savePromise.catch(() => false).then(async () => {
    saveFailed = false;
    try {
      await SnipThatDB.updateNoteIfUnchanged(noteId, patch, note.updatedAt);
    } catch (error) {
      if (error?.name === "SnipazeItemDeletedError") {
        // The note was deleted elsewhere while this edit was queued - it must
        // stay deleted, not get recreated from a stale local edit.
        statusEl.textContent = "This note was deleted.";
        notes = sortNotesForDisplay(await SnipThatDB.getNotes());
        render();
        return false;
      }
      if (error?.name !== "SnipazeNoteConflictError" && !/changed in another Snipaze view/i.test(String(error?.message || ""))) throw error;
      const overwrite = confirm("This note was changed in another Snipaze view. Replace that newer version with your current edit?");
      if (!overwrite) {
        statusEl.textContent = "Reloading newer version...";
        notes = sortNotesForDisplay(await SnipThatDB.getNotes());
        render();
        return false;
      }
      await SnipThatDB.updateNote(noteId, patch);
    }
    if (saveFailed) return false;
    Object.assign(note, patch);
    if (activeId === noteId) statusEl.textContent = "Saved";
    chrome.runtime.sendMessage({
      type: "WORKSPACE_CHANGED",
      reason: "full-view-edit",
    });
    return true;
  }).catch((error) => {
    saveFailed = true;
    statusEl.textContent = "Save failed";
    return false;
  });
  const saved = await savePromise;
  if (existingNoteToOpen && saved !== false) {
    activeId = existingNoteToOpen.id;
    render();
    return { openedExisting: true };
  }
  return saved;
}

async function refreshNotes() {
  // No document.hidden check here - this also runs when told a note changed
  // elsewhere (e.g. deleted from the side panel), and that must refresh even
  // while this tab is in the background, not just on visibilitychange.
  if (!saveTimer) await savePromise;
  // The data is refreshed even while a save is queued for the note being
  // typed here (same pattern as the side panel's syncWorkspaceFromSharedStore,
  // which always reloads its data and only skips the render) - otherwise a
  // pending save's "changed elsewhere" check would compare against a stale
  // updatedAt, e.g. if the side panel just saved this same note, and wrongly
  // treat this device's own other view as a conflicting edit.
  const latest = await SnipThatDB.getNotes();
  notes = sortNotesForDisplay(latest);
  if (saveTimer) return;
  if (!notes.some((note) => note.id === activeId))
    activeId = notes[0]?.id || "";
  render();
}

searchEl.addEventListener("input", render);
document.addEventListener("visibilitychange", refreshNotes);
document
  .querySelector("[data-prev]")
  .addEventListener("click", () => navigate(-1));
document
  .querySelector("[data-next]")
  .addEventListener("click", () => navigate(1));
document
  .querySelector("[data-open-pro]")
  .addEventListener("click", showProOverlay);

document.querySelectorAll("[data-export-format]").forEach((button) =>
  button.addEventListener("click", async () => {
    await saveNow();
    const note = notes.find((item) => item.id === activeId);
    if (!note) return;
    statusEl.textContent = "Preparing downloadâ€¦";
    try {
      await SnipazeNoteExport.exportNote(note, button.dataset.exportFormat);
      statusEl.textContent = "Downloaded";
      document.querySelector("[data-download-menu]")?.removeAttribute("open");
    } catch {
      statusEl.textContent = "Download failed";
    }
  }),
);
document.querySelector("[data-delete]").addEventListener("click", async () => {
  const index = notes.findIndex((note) => note.id === activeId);
  if (index < 0 || !confirm("Delete this note?")) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  await savePromise;
  saveFailed = false;
  /* Previous deletion used activeId directly:
  await SnipThatDB.deleteNote(activeId);
  */
  const deletedNoteId = activeId;
  await SnipThatDB.deleteNote(deletedNoteId);
  if (saveFailed) return;
  notes.splice(index, 1);
  activeId = notes[Math.min(index, notes.length - 1)]?.id || "";
  /* Previous notification did not include or await the deleted note ID:
  chrome.runtime.sendMessage({
    type: "WORKSPACE_CHANGED",
    reason: "full-view-delete",
  });
  */
  await chrome.runtime.sendMessage({
    type: "WORKSPACE_CHANGED",
    reason: "full-view-delete",
    deletedNoteId,
  });
  statusEl.textContent = "Deleted";
  render();
});
window.addEventListener("beforeunload", () => {
  if (saveTimer) saveNow();
});
window.addEventListener("pagehide", () => {
  if (saveTimer) saveNow();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && saveTimer) saveNow();
});
window.addEventListener("snipaze:db-error", () => {
  saveFailed = true;
  statusEl.textContent = "Save failed";
});

function navigate(step) {
  const index = notes.findIndex((note) => note.id === activeId);
  if (index < 0 || notes.length < 2) return;
  openNote(notes[(index + step + notes.length) % notes.length].id);
}
function updateButtons() {
  const disabled = notes.length < 2;
  document.querySelector("[data-prev]").disabled = disabled;
  document.querySelector("[data-next]").disabled = disabled;
  document.querySelector("[data-delete]").disabled = !activeId;

  document.querySelectorAll("[data-export-format]").forEach((button) => {
    button.disabled = !activeId;
  });
}
function plainText(note) {
  const doc = new DOMParser().parseFromString(
    note.contentHtml || note.content || "",
    "text/html",
  );
  return doc.body.textContent || "";
}
function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "";
}
const { escapeHtml, sanitizeHtml } = globalThis.SnipazeHtmlUtils;
function escapeAttr(value) {
  return escapeHtml(value);
}

function onTitlePaste(event) {
  event.preventDefault();
  const text = event.clipboardData?.getData("text/plain") || "";
  document.execCommand("insertText", false, text.replace(/\r?\n/g, " "));
}

function onBodyPaste(event) {
  event.preventDefault();
  const rawHtml = event.clipboardData?.getData("text/html");
  const text = event.clipboardData?.getData("text/plain") || "";
  const safeHtml = rawHtml
    ? sanitizeHtml(rawHtml)
    : escapeHtml(text).replace(/\n/g, "<br>");
  document.execCommand("insertHTML", false, safeHtml);
}

