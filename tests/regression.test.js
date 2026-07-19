const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const zlib = require("node:zlib");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("manifest references existing extension files", () => {
  const manifest = JSON.parse(read("manifest.json"));
  const files = [
    manifest.background.service_worker,
    manifest.action.default_popup,
    ...manifest.content_scripts.flatMap((entry) => entry.js),
    "offscreen/offscreen.html",
    "offscreen/offscreen.js",
    "popup/popup.js",
    "popup/popup.css",
    "clipboard-picker/clipboard-picker.html",
    "clipboard-picker/clipboard-picker.js",
    "clipboard-picker/clipboard-picker.css"
  ];
  for (const file of files) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `Missing ${file}`);
  }
});

test("manifest loads split UI modules and exposes only required page assets", () => {
  const manifest = JSON.parse(read("manifest.json"));
  const scripts = manifest.content_scripts.flatMap((entry) => entry.js);
  assert.ok(scripts.includes("themes/sidebar-styles.js"));
  assert.ok(scripts.includes("themes/settings-styles.js"));
  assert.ok(scripts.includes("themes/capture-modal-styles.js"));
  assert.ok(scripts.includes("themes/reload-guard-styles.js"));
  assert.ok(scripts.includes("themes/export-styles.js"));
  assert.ok(scripts.includes("ui/content-styles.js"));
  assert.ok(scripts.indexOf("themes/sidebar-styles.js") < scripts.indexOf("ui/content-styles.js"));
  assert.ok(scripts.indexOf("themes/settings-styles.js") < scripts.indexOf("ui/settings.js"));
  assert.ok(scripts.indexOf("themes/capture-modal-styles.js") < scripts.indexOf("content.js"));
  assert.ok(scripts.indexOf("themes/reload-guard-styles.js") < scripts.indexOf("ui/reload-guard.js"));
  assert.ok(scripts.indexOf("themes/export-styles.js") < scripts.indexOf("features/note-export.js"));
  assert.ok(scripts.indexOf("ui/content-styles.js") < scripts.indexOf("content.js"));
  assert.deepEqual(manifest.web_accessible_resources[0].resources, ["icons/*"]);
});

test("only the configured OCR runtime assets are required", () => {
  const required = [
    "vendor/tesseract/tesseract.min.js",
    "vendor/tesseract/worker.min.js",
    "vendor/tesseract/tesseract-core-lstm.wasm.js",
    "vendor/tesseract/lang-data/eng.traineddata.gz"
  ];
  for (const file of required) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `Missing ${file}`);
  }
  assert.match(read("offscreen/offscreen.js"), /corePath:\s*`\$\{base\}tesseract-core-lstm\.wasm\.js`/);
});

test("OCR preprocessing respects layout and memory limits", () => {
  const context = {
    console,
    Uint8ClampedArray,
    Uint32Array,
    Math,
    Number,
    String,
    chrome: {
      storage: { session: { get: async () => ({}), set: async () => {} } },
      runtime: {
        onMessage: { addListener() {} },
        getURL(value) { return value; }
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(read("offscreen/offscreen.js"), context);

  assert.equal(context.getOcrProfile(1200, 120).primaryPageSegMode, "7");
  assert.equal(context.getOcrProfile(600, 400).primaryPageSegMode, "6");
  assert.equal(context.getOcrProfile(1400, 1200).primaryPageSegMode, "3");

  for (const [width, height] of [[3840, 2160], [5000, 3000], [15000, 10000]]) {
    const profile = context.getOcrProfile(width, height);
    const outputWidth = Math.round(width * profile.scale);
    const outputHeight = Math.round(height * profile.scale);
    assert.ok(outputWidth * outputHeight <= 8_007_000);
    assert.ok(Math.max(outputWidth, outputHeight) <= 3201);
  }
});

test("English OCR language data is intact", () => {
  const compressed = fs.readFileSync(path.join(root, "vendor/tesseract/lang-data/eng.traineddata.gz"));
  const languageData = zlib.gunzipSync(compressed);
  assert.ok(languageData.length > 1_000_000);
});

test("category rename is atomic and orphan notes are recovered", () => {
  assert.match(read("db/indexeddb.js"), /transaction\(\["categories", "notes"\], "readwrite"\)/);
  assert.match(read("content.js"), /Recovered Notes/);
  assert.doesNotMatch(read("content.js"), /orphanNotes\)[\s\S]{0,120}deleteNote/);
});

test("deleting or renaming a category sends its real server revision, not a hardcoded 0", () => {
  const dbSource = read("db/indexeddb.js");
  const deleteFn = dbSource.match(/async function deleteCategoryWithNotes\(categoryId, options = \{\}\) \{[\s\S]*?\n  \}/)?.[0] || "";
  const renameFn = dbSource.match(/async function renameCategory\(categoryId, category, options = \{\}\) \{[\s\S]*?\n  \}/)?.[0] || "";
  assert.ok(deleteFn && renameFn, "could not find deleteCategoryWithNotes/renameCategory in db/indexeddb.js");
  // Hardcoding baseServerRevision to 0 (via a literal null,null) makes the
  // server's revision-guard reject the delete as a conflict almost every time
  // (real rows are at revision 1+), and since there's no conflict recovery for
  // categories, that rejected delete silently never applies - the category
  // stays stuck on the server and on every other device forever.
  assert.doesNotMatch(deleteFn, /makeSyncQueueItem\("category", categoryId, "delete", null, null\)/,
    "deleteCategoryWithNotes must fetch the category's current record instead of hardcoding baseServerRevision to 0");
  assert.match(deleteFn, /categoryStore\.get\(categoryId\)[\s\S]*makeSyncQueueItem\("category", categoryId, "delete", getRequest\.result, getRequest\.result\)/);
  assert.doesNotMatch(renameFn, /makeSyncQueueItem\("category", categoryId, "delete", null, null\)/,
    "renameCategory has the same bug for the old name's delete - the old name never actually gets removed server-side, leaving a ghost copy on other devices");
  assert.match(renameFn, /categoryStore\.get\(categoryId\)[\s\S]*makeSyncQueueItem\("category", categoryId, "delete", getRequest\.result, getRequest\.result\)/);
});

test("reinjection cleanup and database error feedback are installed", () => {
  const content = read("content.js");
  assert.match(content, /window\.__snipazeCleanup\?\.\(\)/);
  assert.match(content, /removeListener\(onRuntimeMessage\)/);
  assert.match(content, /snipaze:db-error/);
  assert.match(read("ui/floating-shell.js"), /could not save your latest change/i);
});


test("English-only OCR progress, cancellation, confidence, and shortcuts are wired", () => {
  const captureFlow = read("features/capture-flow.js");
  const captureModal = read("ui/capture-modal.js");
  const offscreen = read("offscreen/offscreen.js");
  const background = read("background.js");
  const settings = read("ui/settings.js");
  const popup = read("popup/popup.js");
  const manifest = JSON.parse(read("manifest.json"));

  for (const label of ["Preparing image", "Reading text", "Retrying for better accuracy"]) {
    assert.match(captureFlow, new RegExp(label));
  }
  assert.match(captureFlow, /CANCEL_OCR/);
  assert.match(offscreen, /worker\.terminate\(\)/);
  assert.match(background, /OCR_PROGRESS/);
  assert.match(captureModal, /High confidence/);
  assert.match(captureModal, /May need review/);
  assert.doesNotMatch(settings, /ocr-language|value="hin"/);
  assert.match(offscreen, /createWorker\("eng"/);
  assert.doesNotMatch(offscreen, /projectnaptha|REMOTE_LANGUAGE_PATH/);
  assert.deepEqual(manifest.host_permissions, ["<all_urls>"]);
  assert.match(popup, /chrome\.commands\.getAll/);
  assert.match(popup, /chrome:\/\/extensions\/shortcuts/);
});


test("PDF selection saving uses a context menu and leaves webpage Ctrl+C intact", () => {
  const manifest = JSON.parse(read("manifest.json"));
  const background = read("background.js");
  const picker = read("clipboard-picker/clipboard-picker.js");
  assert.ok(manifest.permissions.includes("contextMenus"));
  assert.equal(manifest.optional_permissions, undefined);
  assert.equal(manifest.commands["save-clipboard-text"], undefined);
  assert.match(background, /Save selected text to Snipaze/);
  assert.match(background, /info\.selectionText/);
  assert.match(background, /openSelectionPickerWindow/);
  assert.match(picker, /pendingClipboardCapture/);
  assert.doesNotMatch(picker, /navigator\.clipboard|clipboardRead|Alt\+C/);
  assert.match(read("features/capture-flow.js"), /function onPageCopy/);
  assert.match(read("features/capture-flow.js"), /handleCopiedText[\s\S]*wasExtensionReloadedOnPage/);
  assert.match(read("features/capture-flow.js"), /showCopyReloadNotice/);
  assert.match(read("ui/reload-guard.js"), /blockStaleCopiedTextPicker/);
  assert.match(read("ui/reload-guard.js"), /dataset\.snipazeAutoSave !== "true"/);
  assert.match(read("ui/floating-shell.js"), /host\.dataset\.snipazeAutoSave/);
  assert.match(read("content.js"), /updateGlobalAutoSaveSetting/);
  assert.match(read("ui/floating-shell.js"), /type: "SET_AUTO_SAVE_SETTING"/);
  assert.doesNotMatch(read("content.js"), /if \(action === "toggle-auto-save"\)[\s\S]{0,120}setAutoSaveOnCopy/);
  assert.match(read("ui/reload-guard.js"), /SYNC_AUTO_SAVE_SETTING/);
  assert.match(read("ui/reload-guard.js"), /addEventListener\("copy", blockStaleCopiedTextPicker, true\)/);
});


test("right-click selection opens the note picker with selected PDF text", async () => {
  const saved = [];
  const windows = [];
  const listeners = {};
  const context = { console, URL, Date, Math, Promise, setTimeout, clearTimeout, importScripts() {}, self: { clients: { matchAll: async () => [] } },
    SnipThatDB: { setSetting: async (key,value) => saved.push([key,value]), getSetting: async (_k,f)=>f },
    chrome: { storage:{session:{get:async()=>({}),set:async()=>{}}}, commands:{onCommand:{addListener(){}}}, contextMenus:{onClicked:{addListener(fn){listeners.clicked=fn}},remove(_id,cb){cb()},create(){}}, runtime:{onInstalled:{addListener(){}},onStartup:{addListener(){}},onMessage:{addListener(){}},getURL:p=>"chrome-extension://test/"+p,getContexts:async()=>[{}],sendMessage:async()=>({ok:true}),lastError:null}, tabs:{query:async()=>[],sendMessage:async()=>{},onActivated:{addListener(){}}}, windows:{WINDOW_ID_CURRENT:-2,onRemoved:{addListener(){}},create:async options=>{windows.push(options)}}, action:{setBadgeBackgroundColor:async()=>{},setBadgeText:async()=>{}}, scripting:{executeScript:async()=>{}}, offscreen:{createDocument:async()=>{}}, alarms:{create(){},onAlarm:{addListener(){}}} }
  };
  vm.createContext(context); vm.runInContext(read("background.js"),context);
  await listeners.clicked({menuItemId:"snipaze-save-selection",selectionText:"Selected PDF text"},{id:7,windowId:1,url:"https://example.com/report.pdf",title:"Report"});
  assert.equal(saved.length,1);
  assert.equal(saved[0][0],"pendingClipboardCapture");
  assert.equal(saved[0][1].text,"Selected PDF text");
  assert.equal(windows.length,1);
  assert.match(windows[0].url,/clipboard-picker\/clipboard-picker\.html\?mode=choose/);
});


test("pending clipboard capture survives picker load and stale pickers cannot clear newer captures", () => {
  const picker = read("clipboard-picker/clipboard-picker.js");
  const loadStart = picker.indexOf("async function loadPicker()");
  const loadEnd = picker.indexOf("function renderNotes()", loadStart);
  assert.doesNotMatch(picker.slice(loadStart, loadEnd), /setSetting\("pendingClipboardCapture", null\)/);
  assert.match(picker, /function clearPendingCaptureIfCurrent/);
  assert.match(picker, /pending\.captureId === capture\.captureId/);
  assert.match(read("background.js"), /captureId:[\s\S]*randomUUID/);
});test("all note lists use pinned then modified then created ordering", () => {
  const content = read("content.js");
  const reader = read("reader/reader.js");
  const picker = read("clipboard-picker/clipboard-picker.js");
  const noteSort = read("ui/note-sort.js");

  assert.match(content, /validNotes\.sort\(compareNotesForDisplay\)/);
  assert.match(content, /const \{ compareNotesForDisplay \} = globalThis\.SnipazeNoteSort;/);
  assert.match(reader, /sortNotesForDisplay\(await SnipThatDB\.getNotes\(\)\)/);
  assert.match(reader, /notes = sortNotesForDisplay\(latest\)/);
  assert.match(reader, /const \{ sortNotesForDisplay \} = globalThis\.SnipazeNoteSort;/);
  assert.match(picker, /notes = sortNotesForDisplay\(notes\)/);
  assert.match(picker, /const \{ sortNotesForDisplay \} = globalThis\.SnipazeNoteSort;/);

  assert.match(noteSort, /Number\(Boolean\(b\?\.pinned\)\) - Number\(Boolean\(a\?\.pinned\)\)/);
  assert.match(noteSort, /Number\(b\?\.updatedAt \|\| b\?\.createdAt\)/);
  assert.match(noteSort, /Number\(b\?\.createdAt\) - Number\(a\?\.createdAt\)/);
  assert.match(noteSort, /globalThis\.SnipazeNoteSort = \{ compareNotesForDisplay, sortNotesForDisplay \}/);
});
test("full note reader reuses storage without replacing the side-panel workflow", () => {
  for (const file of ["reader/reader.html", "reader/reader.css", "reader/reader.js", "features/note-export.js"]) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} is missing`);
  }
  const content = read("content.js");
  const background = read("background.js");
  const reader = read("reader/reader.js");
  assert.match(read("ui/sidebar-render.js"), /data-action="open-full-note"/);
  assert.match(read("ui/sidebar-events.js"), /OPEN_FULL_NOTE/);
  assert.match(read("popup/popup.html"), /data-action="open-all-notes"/);
  assert.match(read("popup/popup.js"), /chrome\.runtime\.getURL\("reader\/reader\.html"\)/);
  assert.match(background, /reader\/reader\.html\?note=/);
  assert.match(reader, /SnipThatDB\.getNotes\(\)/);
  assert.match(reader, /SnipThatDB\.updateNote/);
  assert.match(reader, /SnipThatDB\.deleteNote/);
  assert.match(reader, /WORKSPACE_CHANGED/);
  const readerHtml = read("reader/reader.html");
  assert.doesNotMatch(readerHtml, /data-copy/);
  assert.doesNotMatch(reader, /navigator\.clipboard\.writeText/);
  const exporter = read("features/note-export.js");
  assert.match(readerHtml, /data-export-format="txt"/);
  assert.match(readerHtml, /data-export-format="word"/);
  assert.match(readerHtml, /data-export-format="pdf"/);
  assert.match(readerHtml, /note-export\.js/);
  assert.match(reader, /SnipazeNoteExport\.exportNote/);
  assert.match(read("features/export-actions.js"), /SnipazeNoteExport\?\.exportNote/);
  assert.match(exporter, /createWordExportDocument/);
  assert.match(exporter, /createSimplePdfBytes/);
  assert.match(exporter, /noteToPlainText/);
  assert.match(exporter, /compactConsecutiveCaptureSpacers/);
  assert.match(exporter, /document\.createRange\(\)/);
  assert.match(exporter, /captureRules\[index\]\.after/);
  assert.match(exporter, /word-capture-rule-pair/);
  assert.match(exporter, /createElement\("table"\)/);
  assert.match(exporter, /height:3px/);
  assert.match(exporter, /captureRules\[index\]\.after\.remove\(\)/);
  assert.match(exporter, /captureRules\[index \+ 1\]\.before\.remove\(\)/);
  assert.match(exporter, /querySelectorAll\("\.source-snippet"\)/);
  assert.match(exporter, /captureRules\.push\(\{ before, after \}\)/);
  assert.doesNotMatch(exporter, /querySelectorAll\("\.source-snippet:not\(\.saved-link-card\)"\)/);
  assert.match(exporter, /new RegExp\(`\$\{EXPORT_DIVIDER\}\\\\n/);
  assert.match(exporter, /globalThis\.SnipazeNoteExport/);
  assert.match(read("features/note-actions.js"), /function openFocusedNote/);
  assert.ok(JSON.parse(read("manifest.json")).content_scripts[0].js.includes("features/note-export.js"));
});

test("shortcuts and toolbar actions share generation-aware dispatch", () => {
  const background = read("background.js");
  assert.match(background, /commands\.onCommand\.addListener[\s\S]*dispatchTabAction/);
  assert.match(background, /RUN_TAB_ACTION[\s\S]*dispatchTabAction/);
  assert.match(background, /getTabExtensionGeneration/);
});
test("Page Reference saves useful context and preserves capture and OCR actions", () => {
  const content = read("content.js");
  const captureFlow = read("features/capture-flow.js");
  const notePicker = read("ui/note-picker.js");
  const pageReference = read("features/page-reference.js");
  const popup = read("popup/popup.js");
  const popupHtml = read("popup/popup.html");
  assert.match(popupHtml, /data-action="save-link"/);
  assert.match(popupHtml, /Save Reference/);
  assert.match(popup, /TOOLBAR_SAVE_LINK/);
  assert.doesNotMatch(popup, /hasClipboardPermission/);
  assert.match(popup, /RUN_TAB_ACTION/);
  assert.match(read("background.js"), /RUN_TAB_ACTION[\s\S]*chrome\.tabs\.sendMessage/);
  assert.match(content, /TOOLBAR_SAVE_LINK/);
  assert.match(captureFlow, /getCaptureMetadata\("Page Reference"\)/);
  assert.match(pageReference, /htmlFactory:\s*\(personalNote\)\s*=>\s*createHtml/);
  assert.match(notePicker, /plainTextFactory/);
  assert.match(notePicker, /Personal note \(optional\)/);
  assert.match(content, /description: getPageDescription\(\)/);
  assert.match(content, /selectedText: getSelectedPageText\(\)/);
  assert.match(pageReference, /page-reference-favicon/);
  assert.match(pageReference, /page-reference-selection/);
  assert.match(read("features/note-export.js"), /querySelectorAll\("\.page-reference-favicon"\).*favicon\.remove/);
  assert.match(read("features/note-export.js"), /classList\?\.contains\("page-reference-title"\)/);
  assert.match(pageReference, /Saved: \$\{escapeHtml\(metadata\.fullDate\)\} at \$\{escapeHtml\(metadata\.time\)\}/);
  assert.match(read("features/note-export.js"), /formatSourceMetaForPlainExport[\s\S]*getSourceMetaExportLines/);
  assert.match(notePicker, /\["Page Reference", "Saved Link"\]\.includes/);
  assert.match(pageReference, /target="_blank" rel="noopener noreferrer"/);
  assert.match(content, /TOOLBAR_CAPTURE_SCREENSHOT/);
  assert.match(content, /TOOLBAR_EXTRACT_OCR/);
});
test("Full View and PDF picker do not claim success after failed writes", () => {
  const reader = read("reader/reader.js");
  const picker = read("clipboard-picker/clipboard-picker.js");
  assert.match(reader, /savePromise = savePromise\.catch\(\(\) => false\)\.then/);
  assert.match(reader, /async function refreshNotes[\s\S]*await savePromise/);
  assert.match(reader, /await SnipThatDB\.updateNote[\s\S]*if \(saveFailed\) return false/);
  assert.match(reader, /await SnipThatDB\.deleteNote[\s\S]*if \(saveFailed\) return/);
  assert.match(picker, /writeFailed\s*=\s*false;[\s\S]*await SnipThatDB\.(?:updateNote|appendNoteHtml)[\s\S]*if \(writeFailed\) return;[\s\S]*await finish/);
  assert.match(picker, /writeFailed\s*=\s*false;[\s\S]*await SnipThatDB\.addNote[\s\S]*if \(writeFailed\) return;[\s\S]*await finish/);
  assert.match(picker, /Save failed\. Keep this window open and try again\./);
});
test("closed database response channels are treated as extension reload lifecycle events", async () => {
  const warnings = [];
  const events = [];
  class CustomEventMock {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
  }
  const context = {
    CustomEvent: CustomEventMock,
    console: { warn: (...args) => warnings.push(args) },
    addEventListener() {},
    dispatchEvent: (event) => events.push(event),
    chrome: {
      storage: { session: { get: async () => ({}), set: async () => {} } },
      runtime: {
        id: "test-extension",
        lastError: {
          message: "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received"
        },
        sendMessage(_message, callback) { callback(undefined); }
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(read("db/indexeddb.js"), context);
  const notes = await context.SnipThatDB.getNotes();
  assert.deepEqual(Array.from(notes), []);
  context.chrome.runtime.lastError.message =
    "Could not establish connection. Receiving end does not exist.";
  const categories = await context.SnipThatDB.getCategories();
  assert.deepEqual(Array.from(categories), []);
  assert.equal(warnings.length, 0, "expected extension reload channel closure not to reach console.warn");
  assert.equal(events.length, 2);
  assert.equal(events[0].detail.method, "getNotes");
  assert.equal(events[1].detail.method, "getCategories");
});
test("database write failures reject while read failures keep safe fallbacks", async () => {
  const events = [];
  class CustomEventMock {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
  }
  const context = {
    CustomEvent: CustomEventMock,
    console: { warn() {} },
    addEventListener() {},
    dispatchEvent: (event) => events.push(event),
    chrome: {
      storage: { session: { get: async () => ({}), set: async () => {} } },
      runtime: {
        id: "test-extension",
        lastError: null,
        sendMessage(_message, callback) { callback({ ok: false, error: "disk full" }); }
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(read("db/indexeddb.js"), context);

  const notes = await context.SnipThatDB.getNotes();
  assert.deepEqual(Array.from(notes), []);
  await assert.rejects(context.SnipThatDB.addNote({ id: "n1" }), /disk full/);
  assert.equal(events.at(-1).detail.method, "addNote");
});

test("welcome page opens only on first install, not extension updates", () => {
  const listeners = {};
  const createdTabs = [];
  const noopEvent = { addListener() {} };
  const context = {
    console, URL, Date, Math, Promise, setTimeout, clearTimeout,
    importScripts() {},
    self: { clients: { matchAll: async () => [] } },
    SnipThatDB: {
      getSetting: async (_key, fallback) => fallback,
      getUiState: async (_key, fallback) => fallback,
      setSetting: async () => {},
      setUiState: async () => {}
    },
    chrome: {
      storage: { session: { get: async () => ({}), set: async () => {} } },
      runtime: {
        onInstalled: { addListener(fn) { listeners.installed = fn; } },
        onStartup: noopEvent, onMessage: noopEvent,
        getURL: (path) => path, getContexts: async () => []
      },
      tabs: {
        create: async (options) => createdTabs.push(options),
        query: async () => [], sendMessage: async () => {},
        onActivated: noopEvent, onUpdated: noopEvent
      },
      contextMenus: { remove(_id, cb) { cb(); }, create() {}, onClicked: noopEvent },
      commands: { onCommand: noopEvent }, windows: { onRemoved: noopEvent },
      action: { setBadgeBackgroundColor: async () => {}, setBadgeText: async () => {} },
      scripting: { executeScript: async () => {} },
      offscreen: { createDocument: async () => {} },
      alarms: { create() {}, onAlarm: noopEvent }
    }
  };
  vm.createContext(context);
  vm.runInContext(read("background.js"), context);
  listeners.installed({ reason: "update" });
  assert.equal(createdTabs.length, 0);
  listeners.installed({ reason: "install" });
  assert.equal(createdTabs.length, 1);
  assert.equal(createdTabs[0].url, "https://snipaze.in/");
});

test("full note opening survives extension reload lifecycle invalidation", () => {
  const sidebarEvents = read("ui/sidebar-events.js");
  assert.match(sidebarEvents, /if \(noteId\) deps\.sendRuntimeMessage\(\{ type: "OPEN_FULL_NOTE", noteId \}\);/);
  assert.doesNotMatch(sidebarEvents, /if \(noteId\) chrome\.runtime\.sendMessage\(\{ type: "OPEN_FULL_NOTE", noteId \}\);/);
});
test("captured entries have before-and-after dividers in views and exports", () => {
  const content = read("content.js");
  const styles = read("themes/sidebar-styles.js");
  const readerCss = read("reader/reader.css");
  assert.match(styles, /\.source-snippet::before/);
  assert.match(styles, /\.source-snippet::after/);
  assert.match(styles, /margin: 8px 0/);
  assert.match(styles, /:has\(\+ p \+ br \+ \.source-snippet\)/);
  assert.match(readerCss, /margin: 8px 0/);
  assert.match(readerCss, /\.source-snippet::before/);
  assert.match(readerCss, /\.source-snippet::after/);
  const exporter = read("features/note-export.js");
  assert.match(exporter, /formatHtmlForWordExport[\s\S]*section\.before\(before\)[\s\S]*section\.after\(after\)/);
  assert.match(exporter, /compactConsecutiveCaptureSpacers/);
  assert.match(exporter, /word-capture-rule-pair/);
  assert.match(exporter, /createWordCaptureRulePair/);
  assert.match(exporter, /classList\?\.contains\("source-snippet"\)[\s\S]*EXPORT_DIVIDER[\s\S]*EXPORT_DIVIDER/);
  assert.match(exporter, /createStructuredPdfBlocks[\s\S]*blocks\.push\(\{ type: "divider" \}\)[\s\S]*blocks\.push\(\{ type: "divider" \}/);
});
test("stale Screenshot and OCR buttons show a refresh-page popup", () => {
  const content = read("content.js");
  const captureFlow = read("features/capture-flow.js");
  const captureModal = read("ui/capture-modal.js");
  assert.match(read("ui/sidebar-events.js"), /\(action === "screenshot" \|\| action === "ocr"\)[\s\S]{0,120}!hasExtensionRuntime\(\)/);
  assert.match(content, /Extension reloaded\. Please refresh the page\./);
  assert.match(content, /wasExtensionReloadedOnPage\(\)/);
  assert.match(captureFlow, /extensionGenerationPromise/);
  assert.match(captureFlow, /GET_EXTENSION_GENERATION/);
  assert.match(captureFlow, /originalGeneration !== currentGeneration/);
  assert.match(read("background.js"), /chrome\.storage\.session\.get\(EXTENSION_GENERATION_KEY\)/);
  assert.doesNotMatch(content, /SNIPAZE_LIFECYCLE|extensionLifecycleInvalidated/);
  assert.doesNotMatch(content, /Extension context was refreshed|Extension capture service is not available/);
  assert.match(content, /showCaptureResultPopup\(\{/);
  assert.match(captureModal, /body\.hidden = Boolean\(imageDataUrl\)/);
  assert.match(captureModal, /footer\.setAttribute\("aria-disabled", "true"\)/);
  assert.match(captureModal, /flashReloadWarning\(body\)/);
  assert.match(captureModal, /root\.dataset\.extensionReloaded === "true"/);
});

test("an open Screenshot or OCR result is replaced with the reload warning", () => {
  const reloadGuard = read("ui/reload-guard.js");
  assert.match(reloadGuard, /function markOpenCaptureAsStale/);
  assert.doesNotMatch(reloadGuard, /markPageAsStale|snipazeExtensionReloaded/);
  assert.match(reloadGuard, /Extension reloaded\. Please refresh the page\./);
  assert.match(reloadGuard, /body\.hidden = false/);
  assert.match(reloadGuard, /preview\.hidden = true/);
  assert.match(reloadGuard, /preview\.removeAttribute\("src"\)/);
  assert.match(reloadGuard, /blockStaleResultAction/);
  assert.match(reloadGuard, /event\.stopImmediatePropagation\(\)/);
  assert.match(reloadGuard, /reloadBlink/);
  assert.match(reloadGuard, /CAPTURE_PICKER_ROOT_ID/);
  assert.match(reloadGuard, /function showReloadResult/);
  assert.match(reloadGuard, /TOOLBAR_CAPTURE_SCREENSHOT/);
  assert.match(reloadGuard, /TOOLBAR_EXTRACT_OCR/);
  assert.match(reloadGuard, /belongsToOlderGeneration/);
  assert.match(reloadGuard, /pageGeneration !== currentGeneration/);
  assert.match(reloadGuard, /markOpenCaptureAsStale\(\)/);
});

test("floating launcher prevents native image drag ghosts", () => {
  const content = read("ui/floating-shell.js");
  const styles = read("themes/sidebar-styles.js");
  assert.match(content, /draggable="false"/);
  assert.match(content, /icon\.draggable = false/);
  assert.match(content, /icon\.addEventListener\("dragstart", \(event\) => event\.preventDefault\(\)\)/);
  assert.match(styles, /-webkit-user-drag: none/);
  assert.match(styles, /pointer-events: none/);
});

test("existing floating host prevents an overlapping reload-generation icon", () => {
  const content = read("content.js");
  const guard = content.indexOf('document.querySelectorAll("#snip-ocr-floating-host")');
  const cleanup = content.indexOf("window.__snipazeCleanup?.()");
  const initialization = content.indexOf("initFloatingUi();");
  assert.ok(guard >= 0 && guard < cleanup && cleanup < initialization);
});

test("extension reload never dynamically injects a second floating UI", () => {
  const background = read("background.js");
  const content = read("content.js");
  assert.match(background, /files: \["themes\/reload-guard-styles\.js", "ui\/reload-guard\.js"\]/);
  assert.doesNotMatch(background, /files:\s*\[[^\]]*content\.js/);
  assert.match(background, /patchExistingFloatingIconsInOpenTabs/);
  assert.match(background, /patchExistingFloatingIconsInTab/);
  const reloadGuard = read("ui/reload-guard.js");
  assert.match(reloadGuard, /function suppressDuplicateHosts/);
  assert.match(reloadGuard, /new MutationObserver\(suppressDuplicateHosts\)/);
  assert.match(reloadGuard, /container\.append\(host\)/);  assert.doesNotMatch(background, /ensureContentScriptInTab/);
  assert.doesNotMatch(background, /reconnectContentScript/);
  assert.doesNotMatch(background, /chrome\.tabs\.onUpdated/);
  assert.match(background, /chrome\.tabs\.onActivated\.addListener[\s\S]*syncSidebarStateToTab/);
  assert.doesNotMatch(background, /chrome\.tabs\.onActivated\.addListener[\s\S]{0,120}patchExistingFloatingIconsInTab/);
  assert.match(content, /existingFloatingHosts\.slice\(1\)/);
  assert.match(content, /\.composedPath\(\)/);
  assert.match(content, /event\.stopImmediatePropagation\(\)/);
  assert.doesNotMatch(content, /snipaze-retired-floating-host/);
});

test("all captured entry types export through TXT Word and PDF in both views", () => {
  const content = read("content.js");
  const inlineInsert = read("features/inline-insert.js");
  const exporter = read("features/note-export.js");
  const reader = read("reader/reader.js");
  const readerHtml = read("reader/reader.html");

  assert.match(read("features/page-reference.js"), /function createHtml[\s\S]*?<section class="source-snippet/);

  for (const creator of [
    "createInlineScreenshotHtml",
    "createInlineSourceHtml",
    "createCopiedTextInlineHtml"
  ]) {
    assert.match(inlineInsert, new RegExp(`function ${creator}[\\s\\S]*?<section class="source-snippet`));
  }

  assert.match(exporter, /function noteToPlainText/);
  assert.match(exporter, /function formatHtmlForWordExport/);
  assert.match(exporter, /function createStructuredPdfBlocks/);
  assert.match(exporter, /querySelectorAll\("\.source-snippet"\)/);
  assert.doesNotMatch(exporter, /querySelectorAll\("\.source-snippet:not\(\.saved-link-card\)"\)/);
  assert.doesNotMatch(content, /function noteToPlainText/);
  assert.doesNotMatch(content, /function createSimplePdfBytes/);

  assert.match(read("features/export-actions.js"), /SnipazeNoteExport\?\.exportNote/);
  assert.match(reader, /SnipazeNoteExport\.exportNote/);
  for (const format of ["txt", "word", "pdf"]) {
    assert.match(readerHtml, new RegExp(`data-export-format="${format}"`));
  }
});
test("detached export metadata preserves BR line breaks in both exporters", () => {
  const content = read("content.js");
  const exporter = read("features/note-export.js");
  assert.match(exporter, /function getSourceMetaTextWithBreaks\(node\)/);
  assert.match(exporter, /current\.tagName\.toLowerCase\(\) === "br"\) return "\\n"/);
  assert.match(exporter, /const rawLines = getSourceMetaTextWithBreaks\(node\)/);
  assert.doesNotMatch(exporter, /const rawLines = String\(node\.innerText \|\| node\.textContent/);
  assert.doesNotMatch(content, /function getSourceMetaTextWithBreaks/);
});
test("all entry types use compact two-line spacing in views TXT Word and PDF", () => {
  const content = read("content.js");
  const styles = read("themes/sidebar-styles.js");
  const readerCss = read("reader/reader.css");
  const exporter = read("features/note-export.js");

  assert.match(styles, /\.source-snippet::before/);
  assert.match(styles, /\.source-snippet::after/);
  assert.doesNotMatch(styles, /\.source-snippet:not\(\.saved-link-card\)::/);
  assert.match(readerCss, /\.source-snippet::before/);
  assert.match(readerCss, /\.source-snippet::after/);
  assert.doesNotMatch(readerCss, /\.source-snippet:not\(\.saved-link-card\)::/);

  assert.match(exporter, /new RegExp\(`\$\{EXPORT_DIVIDER\}\\\\n/);
  assert.match(exporter, /word-capture-rule-pair/);
  assert.match(exporter, /captureRules\.push\(\{ before, after \}\)/);
  assert.match(exporter, /type: "double-divider"/);
  assert.match(exporter, /const addDoubleDivider = \(\) =>/);
  assert.match(exporter, /y -= 4/);
  assert.doesNotMatch(content, /word-capture-rule-pair/);
});

test("note saves flush promptly, reject stale edits, and append captures atomically", () => {
  const db = read("db/indexeddb.js");
  const background = read("background.js");
  const reader = read("reader/reader.js");
  const content = read("content.js");
  const picker = read("clipboard-picker/clipboard-picker.js");
  assert.match(db, /updateNoteIfUnchanged/);
  assert.match(db, /appendNoteHtml/);
  assert.match(background, /"updateNoteIfUnchanged"/);
  assert.match(background, /"appendNoteHtml"/);
  assert.match(reader, /setTimeout\(saveNow, 250\)/);
  assert.match(reader, /addEventListener\("pagehide"/);
  assert.match(reader, /document\.hidden && saveTimer/);
  assert.match(reader, /updateNoteIfUnchanged/);
  assert.match(read("features/note-actions.js"), /updateNoteIfUnchanged/);
  assert.match(read("features/inline-insert.js"), /appendNoteHtml/);
  assert.match(picker, /appendNoteHtml\(id, createSourceHtml\(\), Date\.now\(\)\)/);
  assert.doesNotMatch(picker, /createSourceHtml\(\)\}<p><br><\/p>/);
});


test("save recovery and metadata-only note updates preserve newer content", () => {
  const reader = read("reader/reader.js");
  const noteActions = read("features/note-actions.js");
  assert.match(reader, /savePromise = savePromise\.catch\(\(\) => false\)\.then/);
  assert.match(reader, /\.catch\(\(error\) => \{[\s\S]*statusEl\.textContent = "Save failed";[\s\S]*return false/);
  assert.match(read("ui/floating-shell.js"), /\^\(save\|add\|append\|update/);
  assert.match(noteActions, /const renamedNote = await SnipThatDB\.updateNote\(note\.id, \{[\s\S]*title,/);
  assert.match(noteActions, /const updatedNote = await SnipThatDB\.updateNote\(note\.id, \{[\s\S]*pinned:/);
});


function runSupabaseSyncScenario({ localNotes = [], localCategories = [], syncQueue = [], syncState, pullResponse, pushHandler, pushApplied }) {
  const notes = [...localNotes];
  const categories = [...localCategories];
  const settings = { supabaseSyncState: syncState || { lastPulledSequence: 0, notes: {}, categories: {} } };
  const queue = [...syncQueue];
  const pushCalls = [];
  const deletedNoteIds = [];
  const deletedCategoryNames = [];

  const context = {
    console,
    SnipThatDB: {
      getNotes: async () => notes,
      getCategories: async () => categories,
      getSetting: async (key, fallback) => (key in settings ? settings[key] : fallback),
      setSetting: async (key, value) => { settings[key] = value; },
      addNote: async (note) => {
        const index = notes.findIndex((item) => item.id === note.id);
        if (index >= 0) notes[index] = note;
        else notes.push(note);
      },
      updateNote: async (id, patch) => {
        const index = notes.findIndex((item) => item.id === id);
        if (index >= 0) notes[index] = { ...notes[index], ...(typeof patch === "function" ? patch(notes[index]) : patch) };
        return notes[index];
      },
      addCategory: async (category) => {
        const index = categories.findIndex((item) => item.name === category.name);
        if (index >= 0) categories[index] = category;
        else categories.push(category);
      },
      updateCategory: async (name, patch) => {
        const index = categories.findIndex((item) => item.name === name);
        if (index >= 0) categories[index] = { ...categories[index], ...(typeof patch === "function" ? patch(categories[index]) : patch) };
        return categories[index];
      },
      deleteNote: async (id) => {
        deletedNoteIds.push(id);
        const index = notes.findIndex((item) => item.id === id);
        if (index >= 0) notes.splice(index, 1);
      },
      deleteCategoryWithNotes: async (name) => {
        deletedCategoryNames.push(name);
        const index = categories.findIndex((item) => item.name === name);
        if (index >= 0) categories.splice(index, 1);
      },
      getSyncQueue: async () => queue,
      removeSyncQueueItem: async (operationId) => {
        const index = queue.findIndex((item) => item.operationId === operationId);
        if (index >= 0) queue.splice(index, 1);
      },
    },
    fetch: async (url, options) => {
      const body = JSON.parse(options.body);
      if (String(url).includes("sync-pull")) {
        return { ok: true, json: async () => (typeof pullResponse === "function" ? pullResponse(body) : pullResponse) || { notes: [], categories: [] } };
      }
      if (String(url).includes("sync-push")) {
        pushCalls.push(body);
        pushHandler?.(body);
        // By default, simulate a clean, uncontested push: the server confirms
        // exactly what was sent, same as upsert_note_if_newer's WHERE guard
        // passing with nothing else racing it. Tests that need to simulate a
        // lost race (the RPC's WHERE guard skipping the write) pass pushApplied.
        const appliedNotes = pushApplied?.notes ?? Object.fromEntries(body.notes.map((n, index) => [n.id, { status: "accepted", clientUpdatedAt: n.updatedAt, serverRevision: Number(n.baseServerRevision || 0) + 1, syncSequence: n.updatedAt + 10000 + index, serverUpdatedAt: n.updatedAt + 10000 + index }]));
        const appliedCategories = pushApplied?.categories ?? Object.fromEntries(body.categories.map((c, index) => [c.name, { status: "accepted", clientCreatedAt: c.createdAt, serverRevision: Number(c.baseServerRevision || 0) + 1, syncSequence: c.createdAt + 10000 + index, serverUpdatedAt: c.createdAt + 10000 + index }]));
        return { ok: true, json: async () => ({ ok: true, appliedNotes, appliedCategories }) };
      }
      return { ok: false };
    },
  };
  vm.createContext(context);
  vm.runInContext(read("sync/supabase-sync.js"), context);
  return context.SnipazeSupabaseSync.runSyncPass("fake-token").then(() => ({
    notes, categories, pushCalls, deletedNoteIds, deletedCategoryNames, syncQueue: queue, syncState: settings.supabaseSyncState,
  }));
}

test("supabase sync pushes a new local note through revision RPC and records server sequence", async () => {
  const result = await runSupabaseSyncScenario({
    localNotes: [{ id: "n1", title: "New note", updatedAt: 1000, createdAt: 1000 }],
    pullResponse: { notes: [], categories: [] },
  });
  assert.equal(result.pushCalls.length, 1);
  assert.equal(result.pushCalls[0].notes.length, 1);
  assert.equal(result.pushCalls[0].notes[0].id, "n1");
  assert.equal(result.pushCalls[0].notes[0].baseServerRevision, 0);
  assert.equal(result.syncState.notes.n1.clientUpdatedAt, 1000);
  assert.equal(result.syncState.notes.n1.serverRevision, 1);
  assert.equal(result.syncState.notes.n1.syncSequence, 11000);
});

test("supabase sync pulls a new remote note by sequence and saves it locally as synced", async () => {
  const result = await runSupabaseSyncScenario({
    localNotes: [],
    pullResponse: {
      notes: [{ id: "n2", title: "From Device B", content: "", content_html: "", image_data_url: "", category: "General", metadata: {}, type: "manual", pinned: false, created_at: 500, updated_at: 500, deleted_at: null, revision: 3, sync_sequence: 44, server_updated_at: 900 }],
      categories: [],
    },
  });
  assert.equal(result.notes.length, 1);
  assert.equal(result.notes[0].title, "From Device B");
  assert.equal(result.notes[0].serverRevision, 3);
  assert.equal(result.notes[0].syncSequence, 44);
  assert.equal(result.syncState.lastPulledSequence, 44);
});

test("supabase sync protects pending local edits from being overwritten during pull", async () => {
  const result = await runSupabaseSyncScenario({
    localNotes: [{ id: "n3", title: "Local edit", updatedAt: 2000, createdAt: 100, localRevision: 8, serverRevision: 5, syncStatus: "pending" }],
    syncQueue: [{ operationId: "note:n3", entityType: "note", entityId: "n3", operation: "update", localRevision: 8, baseServerRevision: 5, createdAt: "2026-01-01T00:00:00.000Z" }],
    syncState: { version: 4, lastPulledSequence: 10, notes: { n3: { clientUpdatedAt: 1000, serverRevision: 5, syncSequence: 10 } }, categories: {} },
    pullResponse: (body) => ({
      notes: Number(body.sinceSequence || 0) >= 20 ? [] : [{ id: "n3", title: "Remote edit", content: "", content_html: "", image_data_url: "", category: "", metadata: {}, type: "manual", pinned: false, created_at: 100, updated_at: 1000, deleted_at: null, revision: 6, sync_sequence: 20 }],
      categories: [],
    }),
  });
  assert.equal(result.notes.find((note) => note.id === "n3").title, "Local edit");
  assert.equal(result.pushCalls[0].notes[0].baseServerRevision, 5);
});

test("supabase sync applies a newer remote server sequence when there is no pending local edit", async () => {
  const result = await runSupabaseSyncScenario({
    localNotes: [{ id: "n4", title: "Stale local", updatedAt: 100, createdAt: 100, serverRevision: 1, syncSequence: 10, syncStatus: "synced" }],
    syncState: { version: 4, lastPulledSequence: 10, notes: { n4: { clientUpdatedAt: 100, serverRevision: 1, syncSequence: 10 } }, categories: {} },
    pullResponse: {
      notes: [{ id: "n4", title: "Fresher remote", content: "", content_html: "", image_data_url: "", category: "", metadata: {}, type: "manual", pinned: false, created_at: 100, updated_at: 2000, deleted_at: null, revision: 2, sync_sequence: 30 }],
      categories: [],
    },
  });
  assert.equal(result.notes[0].title, "Fresher remote");
  assert.equal(result.pushCalls.length, 0, "the local copy is now up to date, nothing new to push");
});

test("supabase sync refreshes old cursor state once and pulls by sinceSequence", async () => {
  let pullBody = null;
  const result = await runSupabaseSyncScenario({
    localNotes: [{ id: "xyz", title: "Old xyz", updatedAt: 1000, createdAt: 100 }],
    syncState: { lastServerSyncAt: 9000, notes: { xyz: { clientUpdatedAt: 1000, serverUpdatedAt: 9000 } }, categories: {} },
    pullResponse: (body) => {
      pullBody = body;
      return {
        notes: [{ id: "xyz", title: "Updated xyz", content: "", content_html: "", image_data_url: "", category: "upppp", metadata: {}, type: "manual", pinned: false, created_at: 100, updated_at: 2000, deleted_at: null, revision: 4, sync_sequence: 5000 }],
        categories: [],
      };
    },
  });
  assert.equal(pullBody.sinceSequence, 0);
  assert.equal(result.notes[0].title, "Updated xyz");
  assert.equal(result.notes[0].category, "upppp");
});

test("supabase sync applies remote deletions by sequence unless this device has a queued local edit", async () => {
  const applied = await runSupabaseSyncScenario({
    localNotes: [{ id: "n5", title: "Old note", updatedAt: 100, createdAt: 100, serverRevision: 2, syncStatus: "synced" }],
    syncState: { version: 4, lastPulledSequence: 0, notes: { n5: { clientUpdatedAt: 100, serverRevision: 2, syncSequence: 1 } }, categories: {} },
    pullResponse: { notes: [{ id: "n5", deleted_at: 900, updated_at: 100, revision: 3, sync_sequence: 50 }], categories: [] },
  });
  assert.equal(applied.notes.length, 0, "remote deletion should remove synced local note");

  const protectedLocal = await runSupabaseSyncScenario({
    localNotes: [{ id: "n6", title: "Queued local edit", updatedAt: 5000, createdAt: 100, serverRevision: 2, syncStatus: "pending" }],
    syncQueue: [{ operationId: "note:n6", entityType: "note", entityId: "n6", operation: "update", localRevision: 9, baseServerRevision: 2, createdAt: "2026-01-01T00:00:00.000Z" }],
    syncState: { version: 4, lastPulledSequence: 0, notes: { n6: { clientUpdatedAt: 100, serverRevision: 2, syncSequence: 1 } }, categories: {} },
    pullResponse: { notes: [{ id: "n6", deleted_at: 900, updated_at: 100, revision: 3, sync_sequence: 50 }], categories: [] },
  });
  assert.equal(protectedLocal.notes.length, 1, "queued local edit must not be wiped by a remote delete");
});

test("supabase sync sends local deletion queue items with base server revision", async () => {
  const result = await runSupabaseSyncScenario({
    localNotes: [],
    syncQueue: [{ operationId: "note:gone-note", entityType: "note", entityId: "gone-note", operation: "delete", localRevision: 10, baseServerRevision: 7, createdAt: "2026-01-01T00:00:00.000Z" }],
    syncState: { version: 4, lastPulledSequence: 0, notes: { "gone-note": { clientUpdatedAt: 100, serverRevision: 7, syncSequence: 3 } }, categories: {} },
    pullResponse: { notes: [], categories: [] },
    pushApplied: { notes: { "gone-note": { status: "accepted", serverRevision: 8, syncSequence: 99, serverUpdatedAt: 999 } }, categories: {} },
  });
  assert.deepEqual(result.pushCalls[0].deletedNoteIds, [{ id: "gone-note", baseServerRevision: 7, operationId: "note:gone-note" }]);
  assert.equal("gone-note" in result.syncState.notes, false);
  assert.equal(result.syncQueue.length, 0);
});

test("supabase sync resolves a note conflict without creating a conflict copy", async () => {
  const result = await runSupabaseSyncScenario({
    localNotes: [{ id: "n7", title: "Raced edit", updatedAt: 2000, createdAt: 100, localRevision: 8, serverRevision: 5, syncStatus: "pending" }],
    syncQueue: [{ operationId: "note:n7", entityType: "note", entityId: "n7", operation: "update", localRevision: 8, baseServerRevision: 5, createdAt: "2026-01-01T00:00:00.000Z" }],
    syncState: { version: 4, lastPulledSequence: 0, notes: { n7: { clientUpdatedAt: 100, serverRevision: 5, syncSequence: 1 } }, categories: {} },
    pullResponse: { notes: [], categories: [] },
    pushApplied: { notes: { n7: { status: "conflict", serverRevision: 6, syncSequence: 7, serverUpdatedAt: 3000, serverRecord: { id: "n7", title: "Server won", content: "", content_html: "", image_data_url: "", category: "General", type: "text", metadata: {}, pinned: false, created_at: 100, updated_at: 1500, revision: 6, sync_sequence: 7, server_updated_at: 3000 } } }, categories: {} },
  });
  assert.equal(result.notes.some((note) => /Conflict copy/.test(note.title)), false);
  assert.equal(result.notes.find((note) => note.id === "n7")?.title, "Server won");
  assert.equal(result.syncQueue.some((item) => item.entityId === "n7"), false, "the rejected original queue item is removed so the same conflict cannot create copies repeatedly");
});

test("supabase sync resolves a note conflict against a deletion without leaving the note re-pushable on a later pass", async () => {
  const result = await runSupabaseSyncScenario({
    localNotes: [{ id: "n8", title: "Edited before delete", updatedAt: 2000, createdAt: 100, localRevision: 8, serverRevision: 5, syncStatus: "pending" }],
    syncQueue: [{ operationId: "note:n8", entityType: "note", entityId: "n8", operation: "update", localRevision: 8, baseServerRevision: 5, createdAt: "2026-01-01T00:00:00.000Z" }],
    syncState: { version: 4, lastPulledSequence: 0, notes: { n8: { clientUpdatedAt: 100, serverRevision: 5, syncSequence: 1 } }, categories: {} },
    pullResponse: { notes: [], categories: [] },
    pushApplied: { notes: { n8: { status: "conflict", serverRevision: 6, syncSequence: 7, serverUpdatedAt: 3000, serverRecord: { id: "n8", deleted_at: 3000, revision: 6, sync_sequence: 7, server_updated_at: 3000, updated_at: 1500 } } }, categories: {} },
  });
  assert.equal(result.notes.some((note) => /Conflict copy/.test(note.title)), false, "conflicts should not create extra notes");
  assert.equal(result.notes.some((note) => note.id === "n8"), false, "a server-side deletion conflict should remove the local note instead of creating a conflict copy");
  assert.equal(result.syncState.notes.n8, undefined);
});


test("supabase sync does not delete a fresh local note when the server reports a deleted-row conflict", async () => {
  const result = await runSupabaseSyncScenario({
    localNotes: [{ id: "fresh-screenshot", title: "Screenshot capture", updatedAt: 2000, createdAt: 2000, localRevision: 2001, serverRevision: 0, syncStatus: "pending" }],
    syncQueue: [{ operationId: "note:fresh-screenshot", entityType: "note", entityId: "fresh-screenshot", operation: "update", localRevision: 2001, baseServerRevision: 0, createdAt: "2026-01-01T00:00:00.000Z" }],
    syncState: { version: 4, lastPulledSequence: 0, notes: {}, categories: {} },
    pullResponse: { notes: [], categories: [] },
    pushApplied: { notes: { "fresh-screenshot": { status: "conflict", serverRevision: 6, syncSequence: 7, serverUpdatedAt: 3000, serverRecord: { id: "fresh-screenshot", deleted_at: 3000, revision: 6, sync_sequence: 7, server_updated_at: 3000, updated_at: 1500 } } }, categories: {} },
  });
  const note = result.notes.find((item) => item.id === "fresh-screenshot");
  assert.ok(note, "fresh local screenshot note must not vanish because of an old server tombstone");
  assert.equal(note.syncStatus, "pending");
  assert.equal(result.syncQueue.some((item) => item.entityId === "fresh-screenshot"), true, "the fresh local create must remain queued for retry");
});
test("supabase sync does not let an older deleted category remove a newer local note", async () => {
  const result = await runSupabaseSyncScenario({
    localNotes: [{ id: "new-shot", title: "Screenshot capture", category: "General", updatedAt: 5000, createdAt: 5000, localRevision: 2, serverRevision: 1, syncStatus: "synced" }],
    localCategories: [{ name: "General", color: "blue", createdAt: 1000, localRevision: 1, serverRevision: 1, syncStatus: "synced" }],
    syncState: { version: 4, lastPulledSequence: 0, notes: { "new-shot": { clientUpdatedAt: 5000, serverRevision: 1, syncSequence: 20 } }, categories: { General: { clientCreatedAt: 1000, serverRevision: 1, syncSequence: 10 } } },
    pullResponse: { notes: [], categories: [{ name: "General", color: "blue", created_at: 1000, deleted_at: 3000, revision: 2, sync_sequence: 30, server_updated_at: 3000 }] },
  });
  assert.equal(result.deletedCategoryNames.includes("General"), false, "an older category tombstone must not delete newer local notes inside that category");
  assert.equal(result.notes.some((note) => note.id === "new-shot"), true, "the newer local note must remain visible locally");
});
test("delete synchronization uses revision-guarded RPCs instead of timestamp guards", () => {
  const push = read("supabase/functions/sync-push/index.ts");
  assert.match(push, /supabase\.rpc\("delete_note_if_revision"/);
  assert.match(push, /p_base_server_revision: Number\(item\.baseServerRevision \|\| 0\)/);
  assert.doesNotMatch(push, /\.lte\("updated_at"|\.lte\("created_at"/,
    "deletes should use the same server revision guard as updates, not local timestamp comparisons");
});

test("Supabase schema keeps soft deletes for sync, then exposes a locked-down 90-day tombstone purge", () => {
  const schema = read("notes/supabase-sync-schema.sql");
  assert.match(schema, /create or replace function purge_deleted_sync_tombstones\(/);
  assert.match(schema, /p_retention_days integer default 90/);
  assert.match(schema, /delete from notes[\s\S]*deleted_at is not null[\s\S]*deleted_at < cutoff_ms/);
  assert.match(schema, /delete from categories[\s\S]*deleted_at is not null[\s\S]*deleted_at < cutoff_ms/);
  assert.match(schema, /revoke execute on function purge_deleted_sync_tombstones\(integer\) from authenticated/);
});


test("new note creation paths use sync-aware addNote so fresh captures are queued before sync runs", () => {
  const noteActions = read("features/note-actions.js");
  const notePicker = read("ui/note-picker.js");
  assert.match(functionBody(notePicker, "createNoteFromCopiedText"), /SnipThatDB\.addNote\(note\)/);
  assert.match(functionBody(notePicker, "createNoteFromCaptureInsert"), /SnipThatDB\.addNote\(note\)/);
  assert.match(functionBody(noteActions, "createNoteFromCategoryInput"), /SnipThatDB\.addNote\(createdNote\)/);
  assert.match(functionBody(noteActions, "createBlankNote"), /SnipThatDB\.addNote\(createdNote\)/);
  assert.match(functionBody(noteActions, "duplicateNote"), /SnipThatDB\.addNote\(copy\)/);
});

test("choosing to overwrite after a same-device note conflict goes through the normal queue-aware update, not a raw store write", () => {
  const noteActions = read("features/note-actions.js");
  const saveNoteEdit = functionBody(noteActions, "saveNoteEdit");
  assert.ok(saveNoteEdit, "could not find saveNoteEdit in features/note-actions.js");
  // A raw deps.putInStore("notes", next) write never creates a sync-queue
  // entry, so the edit the user just chose to keep here would never actually
  // reach the server - the next sync pass would still see the *other*
  // device's older revision as authoritative and silently overwrite this
  // "kept" edit right back out from under the user again. reader.js's
  // equivalent overwrite branch already calls SnipThatDB.updateNote(...) for
  // this exact reason.
  assert.doesNotMatch(saveNoteEdit, /await deps\.putInStore\("notes", next\)/,
    "the overwrite branch must not bypass the sync queue with a raw store write");
  assert.match(saveNoteEdit, /await SnipThatDB\.updateNote\(note\.id, \{[\s\S]*title: next\.title,[\s\S]*contentHtml: next\.contentHtml,[\s\S]*imageDataUrl: next\.imageDataUrl,[\s\S]*updatedAt: next\.updatedAt,[\s\S]*\}\)/);
});

test("Supabase upserts can revive soft-deleted rows but delete RPCs remain revision-guarded", () => {
  const schema = read("notes/supabase-sync-schema.sql");
  const noteUpsert = schema.match(/create or replace function upsert_note_if_newer\([\s\S]*?\$\$ language plpgsql;/)?.[0] || "";
  const categoryUpsert = schema.match(/create or replace function upsert_category_if_newer\([\s\S]*?\$\$ language plpgsql;/)?.[0] || "";
  const noteDelete = schema.match(/create or replace function delete_note_if_revision\([\s\S]*?\$\$ language plpgsql;/)?.[0] || "";
  const categoryDelete = schema.match(/create or replace function delete_category_if_revision\([\s\S]*?\$\$ language plpgsql;/)?.[0] || "";
  assert.match(noteUpsert, /current_row\.deleted_at is not null and p_base_server_revision = 0/);
  assert.match(categoryUpsert, /current_row\.deleted_at is not null and p_base_server_revision = 0/);
  assert.doesNotMatch(noteDelete, /current_row\.deleted_at is not null and p_base_server_revision = 0/);
  assert.doesNotMatch(categoryDelete, /current_row\.deleted_at is not null and p_base_server_revision = 0/);
});
test("supabase sync applies categories before notes, so a note from a brand new category isn't mistaken for orphaned", () => {
  const module = read("sync/supabase-sync.js");
  const pullFn = module.match(/async function pull\(token, syncState\) \{[\s\S]*?\n  \}/)?.[0] || "";
  const categoriesIndex = pullFn.indexOf("localCategories");
  const notesIndex = pullFn.indexOf("localNotes = await SnipThatDB.getNotes()");
  assert.ok(categoriesIndex >= 0 && notesIndex > categoriesIndex,
    "categories must be applied locally before notes are processed, or a note from a new category could look orphaned");
});

test("supabase sync is wired into background.js directly (no relay-to-a-tab needed, unlike the old Drive version)", () => {
  const background = read("background.js");
  assert.match(background, /importScripts\("sync\/supabase-sync\.js"\)/);
  assert.match(background, /await SnipazeSupabaseSync\.runSyncPass\(token\)/);
  assert.doesNotMatch(background, /RUN_DRIVE_SYNC|DRIVE_UPLOAD_NOTE|DRIVE_DOWNLOAD_NOTE|DRIVE_DELETE_NOTE|DRIVE_SYNC_CATEGORIES|DRIVE_DELETE_CATEGORY|DRIVE_GET_DELETED_ITEMS|DRIVE_LIST_NOTES|DRIVE_ENSURE_FOLDERS/,
    "all Drive-specific message handlers must be fully removed, not left dangling alongside the new Supabase sync");
  assert.match(background, /if \(message\.reason !== "supabase-sync"\) queueImmediateSupabaseSync\(\);/);
});

test("the Supabase sync-pull/sync-push edge functions verify identity the same way check-pro-status already does, and use conditional upserts for newest-wins", () => {
  const pull = read("supabase/functions/sync-pull/index.ts");
  const push = read("supabase/functions/sync-push/index.ts");
  for (const fn of [pull, push]) {
    assert.match(fn, /https:\/\/www\.googleapis\.com\/oauth2\/v2\/userinfo/);
    assert.match(fn, /createClient\(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY\)/);
  }
  assert.match(push, /supabase\.rpc\("upsert_note_if_newer"/);
  assert.match(push, /p_base_server_revision: Number\(note\.baseServerRevision \|\| 0\)/);
  assert.match(read("notes/supabase-sync-schema.sql"), /current_row\.revision = p_base_server_revision/);
  assert.match(push, /supabase\.rpc\("upsert_category_if_newer"/);
  assert.match(push, /supabase\.rpc\("delete_note_if_revision"/);
});

test("sync-pull uses sync_sequence as the cross-device cursor, so timestamp collisions cannot skip edited notes or deletions", () => {
  const pull = read("supabase/functions/sync-pull/index.ts");
  const notesQueryMatch = pull.match(/from\("notes"\)[\s\S]*?;/);
  const categoriesQueryMatch = pull.match(/from\("categories"\)[\s\S]*?;/);
  assert.ok(notesQueryMatch, "could not find the notes query in sync-pull");
  assert.ok(categoriesQueryMatch, "could not find the categories query in sync-pull");
  assert.match(pull, /sinceSequence/);
  assert.match(notesQueryMatch[0], /\.gt\("sync_sequence", since\)/,
    "notes must be fetched by sync_sequence, not timestamp fields");
  assert.match(categoriesQueryMatch[0], /\.gt\("sync_sequence", since\)/,
    "categories must use the same sequence cursor as notes");
  assert.doesNotMatch(notesQueryMatch[0], /server_updated_at|updated_at\.gt|deleted_at\.gt/,
    "pulling by timestamps can skip notes when timestamps collide or clocks differ");
});

test("the side panel does not rebuild the notes grid (wiping unsaved keystrokes) while a debounced save is still pending, even if focus moved elsewhere (e.g. the DevTools console) - DOM focus alone was not a reliable signal for 'is there unsaved typing right now'", () => {
  const noteActions = read("features/note-actions.js");
  const content = read("content.js");
  assert.match(noteActions, /deps\.workspaceState\.pendingSaveNoteId\s*=\s*card\.dataset\.noteId;[\s\S]{0,80}card\._saveTimer\s*=\s*setTimeout/,
    "queueNoteEdit must mark the note as having a pending save before starting the debounce timer");
  assert.match(noteActions, /finally\s*\{[\s\S]*?pendingSaveNoteId[\s\S]*?=\s*null/,
    "saveNoteEdit must clear pendingSaveNoteId once the save settles, on every exit path (success, conflict, or deleted-elsewhere), not just the happy path");
  assert.match(content, /!editingBody\s*&&\s*!editingRename\s*&&\s*!workspaceState\.pendingSaveNoteId/,
    "syncWorkspaceFromSharedStore's render-skip check must also cover pendingSaveNoteId, not just focus-based editingBody/editingRename");
});

test("full-view's refreshNotes reloads its data even while a save is queued for the open note (same pattern as the side panel's syncWorkspaceFromSharedStore), so a pending save's conflict check doesn't compare against a stale updatedAt from before a same-device edit made in the other view", () => {
  const reader = read("reader/reader.js");
  const refreshFn = reader.match(/async function refreshNotes\(\) \{[\s\S]*?\n\}/)?.[0] || "";
  assert.ok(refreshFn, "could not find refreshNotes in reader.js");
  const dbFetchIndex = refreshFn.indexOf("SnipThatDB.getNotes()");
  const secondSaveTimerGuardIndex = refreshFn.indexOf("if (saveTimer) return;");
  assert.ok(dbFetchIndex >= 0 && secondSaveTimerGuardIndex > dbFetchIndex,
    "the data refresh (SnipThatDB.getNotes()) must happen before the saveTimer guard that skips render(), not be skipped by it - otherwise a same-device edit made in the side panel while this view is mid-type never updates this view's stale updatedAt, and this view's own save then wrongly treats it as a conflicting external edit");
});

function functionBody(source, name) {
  const match = source.match(new RegExp(`(?:async )?function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}`));
  return match?.[0] || "";
}

test("every note/category-creating and note-editing function signals the sync engine (deps.scheduleWorkspaceChanged), not just the ones caught by manual testing", () => {
  const noteActions = read("features/note-actions.js");
  const notePicker = read("ui/note-picker.js");
  const content = read("content.js");

  const noteActionFns = [
    "createNoteFromCategoryInput", "createCategoryFromInput", "createBlankNote",
    "saveNoteEdit", "renameCategory", "deleteCategory", "duplicateNote",
    "deleteNote", "moveNoteToCategory", "toggleNotePinned", "toggleNoteArchived",
  ];
  for (const name of noteActionFns) {
    const body = functionBody(noteActions, name);
    assert.ok(body, `could not find function ${name} in features/note-actions.js`);
    assert.match(body, /deps\.scheduleWorkspaceChanged\(/,
      `${name} writes to the database but never calls deps.scheduleWorkspaceChanged - the edit would only reach other devices on the next once-a-minute periodic sync instead of near-instantly`);
  }

  const notePickerFns = ["createNoteFromCopiedText", "createNoteFromCaptureInsert"];
  for (const name of notePickerFns) {
    const body = functionBody(notePicker, name);
    assert.ok(body, `could not find function ${name} in ui/note-picker.js`);
    assert.match(body, /deps\.scheduleWorkspaceChanged\(/,
      `${name} writes to the database but never calls deps.scheduleWorkspaceChanged`);
  }
  assert.match(content, /initNotePicker\(\{[\s\S]*?scheduleWorkspaceChanged,?[\s\S]*?\}\)/,
    "ui/note-picker.js's deps must actually receive scheduleWorkspaceChanged, or the calls above would throw (deps.scheduleWorkspaceChanged is not a function)");
});

test("manifest no longer requests the Drive scope, but keeps the email scope sync-pull/sync-push identity checks need", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.ok(!manifest.oauth2.scopes.includes("https://www.googleapis.com/auth/drive.file"));
  assert.ok(manifest.oauth2.scopes.includes("https://www.googleapis.com/auth/userinfo.email"));
  assert.ok(!manifest.content_scripts.some((entry) => entry.js.includes("sync/sync-engine.js")));
});

