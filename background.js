importScripts("db/indexeddb.js");
importScripts("sync/supabase-sync.js");

const OFFSCREEN_DOCUMENT = "offscreen/offscreen.html";
const SIDEBAR_STATE_KEY = "sidebarOpenByWindow";
const FLOATING_UI_STATE_KEY = "floatingUiStateByWindow";
const WELCOME_URL = "https://snipaze.in/";
const FLOATING_ICON_VISIBLE_KEY = "floatingIconVisible";
const EXTENSION_GENERATION_KEY = "extensionGeneration";
const CHECK_PRO_STATUS_URL = "https://mphdhzsxjwhvkdbxyrfv.supabase.co/functions/v1/check-pro-status";
const extensionGenerationReady = initializeExtensionGeneration();

let creatingOffscreenDocument;
const sidebarOpenByWindow = new Map();
const floatingUiStateByWindow = new Map();

const extensionReloadPatchReady = extensionGenerationReady.then(
  ({ created }) => (created ? patchExistingFloatingIconsInOpenTabs() : null),
).catch((error) => {
  console.debug("Snipaze reload guard startup skipped", error);
  return null;
});

chrome.runtime.onInstalled.addListener((details) => {
  createSelectionContextMenu();
  if (details.reason === "install") {
    chrome.tabs.create({
      url: WELCOME_URL,
      active: true,
    });
  }
});

chrome.runtime.onStartup.addListener(createSelectionContextMenu);

chrome.contextMenus.onClicked.addListener((info, tab) =>
  handleSelectionContextMenuClick(info, tab),
);
chrome.commands.onCommand.addListener((command) => handleCommand(command));

async function checkProStatus(token) {
  const response = await fetch(CHECK_PRO_STATUS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken: token }),
  });
  if (!response.ok) throw new Error("Unable to check Pro status.");
  const result = await response.json();
  await SnipThatDB.setSetting("proActive", result.isPaid === true);
  return result;
}

function getCachedAuthToken() {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, (result) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(typeof result === "string" ? result : result?.token || null);
    });
  });
}

// Unlike Drive sync, this runs directly in the service worker - a plain
// fetch() to an external URL has none of the "service worker messaging
// itself is unreliable" problems that Drive sync had, so there's no need to
// relay this to a content-script tab and wait for it to report back.
async function runSupabaseSyncAndRefresh() {
  const proActive = await SnipThatDB.getSetting("proActive", false);
  if (!proActive) return;
  const token = await getCachedAuthToken();
  if (!token) return;
  await SnipazeSupabaseSync.runSyncPass(token);
  // The sync may have pulled in content from another device - tell every
  // open tab to refresh, the same way an in-tab note change already does.
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map((tab) =>
      tab.id ? sendMessageToTab(tab.id, { type: "SYNC_WORKSPACE_STATE", reason: "supabase-sync" }) : null,
    ),
  );
}

// Every note-changing action (capture, OCR, copy/paste, reference save, manual
// edit - in the side panel or full view) already sends WORKSPACE_CHANGED, so
// hooking the immediate sync there covers all of them from one place instead
// of triggering it separately from each save site.
let supabaseSyncDebounceTimer = null;
function queueImmediateSupabaseSync() {
  clearTimeout(supabaseSyncDebounceTimer);
  supabaseSyncDebounceTimer = setTimeout(runSupabaseSyncAndRefresh, 500);
}

// Supabase can push changes instantly (a future enhancement), but for now
// checking periodically is simplest and already proven reliable. chrome.alarms
// (not setInterval) is what keeps this running even when the service worker
// goes idle and gets woken back up, so this works with the sidebar fully closed.
const SUPABASE_PERIODIC_SYNC_ALARM = "snipazeSupabasePeriodicSync";
chrome.alarms.create(SUPABASE_PERIODIC_SYNC_ALARM, { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SUPABASE_PERIODIC_SYNC_ALARM) runSupabaseSyncAndRefresh();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GET_EXTENSION_GENERATION") {
    extensionGenerationReady
      .then(({ generation }) => sendResponse({ ok: true, generation }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error?.message || "Unable to read extension generation.",
        }),
      );
    return true;
  }
  if (message?.type === "SNIPTHAT_DB") {
    (async () => {
      try {
        const value = await handleIndexedDbMessage(message);
        sendResponse({
          ok: true,
          value: message.method === "dbInit" ? true : value,
        });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error?.message || "IndexedDB operation failed.",
        });
      }
    })();
    return true;
  }

  if (message?.type === "RUN_TAB_ACTION") {
    (async () => {
      const tabId = Number(message.tabId);
      const allowedActions = new Set([
        "TOOLBAR_CAPTURE_SCREENSHOT",
        "TOOLBAR_EXTRACT_OCR",
        "TOOLBAR_SAVE_LINK",
      ]);
      if (!Number.isInteger(tabId) || !allowedActions.has(message.action)) {
        sendResponse({ ok: false, error: "Unsupported tab action." });
        return;
      }
      try {
        const delivered = await dispatchTabAction(tabId, message.action);
        sendResponse(
          delivered
            ? { ok: true }
            : { ok: false, error: "Unable to reach this webpage." },
        );
      } catch (error) {
        sendResponse({
          ok: false,
          error: error?.message || "Unable to reach this webpage.",
        });
      }
    })();
    return true;
  }

  if (message?.type === "GET_SIDEBAR_OPEN_STATE") {
    (async () => {
      const windowId = sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
      sendResponse({ ok: true, open: await getSidebarOpenState(windowId) });
    })();
    return true;
  }

  if (message?.type === "SET_SIDEBAR_OPEN_STATE") {
    (async () => {
      const windowId = sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
      const open = message.open === true;
      await setSidebarOpenState(windowId, open);
      await broadcastSidebarState(windowId, open, sender.tab?.id);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === "GET_FLOATING_UI_STATE") {
    (async () => {
      const windowId = sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
      sendResponse({ ok: true, state: await getFloatingUiState(windowId) });
    })();
    return true;
  }

  if (message?.type === "SET_FLOATING_UI_STATE") {
    (async () => {
      const windowId = sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
      const state = sanitizeFloatingUiState(message.state);
      await setFloatingUiState(windowId, state);
      await broadcastMessageToWindow(
        windowId,
        {
          type: "SYNC_FLOATING_UI_STATE",
          state,
        },
        sender.tab?.id,
      );
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === "WORKSPACE_CHANGED") {
    (async () => {
      const windowId = Number.isInteger(message.targetWindowId)
        ? message.targetWindowId
        : (sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT);
      await broadcastMessageToWindow(
        windowId,
        {
          type: "SYNC_WORKSPACE_STATE",
          reason: message.reason || "workspace",
          deletedNoteId: message.deletedNoteId || "",
        },
        sender.tab?.id,
      );
      sendResponse({ ok: true });
      // "supabase-sync" means this WORKSPACE_CHANGED came from a sync that
      // just finished refreshing tabs, not from an actual edit - triggering
      // another sync on that signal would make every sync trigger the next
      // one forever.
      if (message.reason !== "supabase-sync") queueImmediateSupabaseSync();
    })();
    return true;
  }

  if (message?.type === "RUN_SUPABASE_SYNC") {
    (async () => {
      await runSupabaseSyncAndRefresh();
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === "OPEN_FULL_NOTE") {
    const noteId = encodeURIComponent(String(message.noteId || ""));
    chrome.tabs.create({
      url: chrome.runtime.getURL(`reader/reader.html?note=${noteId}`),
    });
    sendResponse({ ok: true });
    return false;
  }
  if (message?.type === "GET_FLOATING_ICON_VISIBLE") {
    (async () => {
      const visible = await SnipThatDB.getSetting(
        FLOATING_ICON_VISIBLE_KEY,
        true,
      );
      sendResponse({ ok: true, visible: visible !== false });
    })();
    return true;
  }
  if (message?.type === "SET_FLOATING_ICON_VISIBLE") {
    (async () => {
      const visible = message.visible !== false;
      await SnipThatDB.setSetting(FLOATING_ICON_VISIBLE_KEY, visible);
      await broadcastMessageToAllTabs({
        type: "SYNC_FLOATING_ICON_VISIBLE",
        visible,
      });
      sendResponse({ ok: true, visible });
    })();
    return true;
  }
  if (message?.type === "SET_AUTO_SAVE_SETTING") {
    (async () => {
      const enabled = message.enabled === true;
      await SnipThatDB.setSetting("autoSaveOnCopy", enabled);
      await broadcastMessageToAllTabs({
        type: "SYNC_AUTO_SAVE_SETTING",
        enabled,
      });
      sendResponse({ ok: true, enabled });
    })();
    return true;
  }
  if (message?.type === "GOOGLE_SIGN_IN") {
    (async () => {
      try {
        const token = await new Promise((resolve, reject) => {
          chrome.identity.getAuthToken({ interactive: true }, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message || "Sign-in was cancelled."));
              return;
            }
            const authToken = typeof result === "string" ? result : result?.token;
            if (!authToken) {
              reject(new Error("Sign-in was cancelled."));
              return;
            }
            resolve(authToken);
          });
        });
        const response = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) throw new Error("Unable to verify Google account.");
        const profile = await response.json();
        await SnipThatDB.setSetting("googleEmail", profile.email || "");
        const proStatus = await checkProStatus(token).catch(() => null);
        sendResponse({
          ok: true,
          email: profile.email || "",
          isPaid: proStatus?.isPaid === true,
          accessToken: token,
        });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error?.message || "Google sign-in failed.",
        });
      }
    })();
    return true;
  }
  if (message?.type === "REFRESH_PRO_STATUS") {
    (async () => {
      try {
        const token = await getCachedAuthToken();
        if (!token) {
          sendResponse({ ok: true, isPaid: false, signedIn: false });
          return;
        }
        const result = await checkProStatus(token);
        sendResponse({
          ok: true,
          isPaid: result.isPaid === true,
          signedIn: true,
          plan: result.plan ?? null,
          currentPeriodEnd: result.currentPeriodEnd ?? null,
          monthlyStartedAt: result.monthlyStartedAt ?? null,
          yearlyStartedAt: result.yearlyStartedAt ?? null,
          pendingYearlyTransition: result.pendingYearlyTransition === true,
          bonusMonthPending: result.bonusMonthPending === true,
        });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error?.message || "Unable to refresh Pro status.",
        });
      }
    })();
    return true;
  }
  if (message?.target === "background" && message?.type === "OCR_PROGRESS") {
    if (Number.isInteger(message.tabId))
      sendMessageToTab(message.tabId, {
        type: "OCR_PROGRESS",
        requestId: message.requestId,
        status: message.status,
      });
    return false;
  }
  if (message?.type === "CANCEL_OCR") {
    (async () => {
      try {
        await setupOffscreenDocument();
        await chrome.runtime.sendMessage({
          target: "offscreen",
          type: "CANCEL_OCR",
          requestId: message.requestId,
        });
      } catch {}
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (
    ![
      "PROCESS_SELECTION",
      "PROCESS_SCREENSHOT",
      "PROCESS_VISIBLE_SCREENSHOT",
    ].includes(message?.type)
  ) {
    return false;
  }

  (async () => {
    try {
      const result = await processCapture(message, sender);

      if (
        message.type === "PROCESS_SCREENSHOT" ||
        message.type === "PROCESS_VISIBLE_SCREENSHOT"
      ) {
        sendResponse({ ok: true, dataUrl: result.dataUrl || "" });
      } else {
        sendResponse({
          ok: true,
          text: result.text || "",
          confidence: Number(result.confidence) || 0,
        });
      }
    } catch (error) {
      sendResponse({
        ok: false,
        error: error?.message || "Unable to process the selection.",
      });
    }
  })();

  return true;
});

async function handleIndexedDbMessage(message) {
  const allowedMethods = new Set([
    "dbInit",
    "getCategories",
    "saveCategories",
    "addCategory",
    "updateCategory",
    "renameCategory",
    "deleteCategory",
    "deleteCategoryWithNotes",
    "getNotes",
    "saveNotes",
    "addNote",
    "updateNote",
    "updateNoteIfUnchanged",
    "appendNoteHtml",
    "deleteNote",
    "getSetting",
    "setSetting",
    "getUiState",
    "setUiState",
    "getAll",
    "replaceAll",
    "put",
    "remove",
    "clear",
    "getSyncQueue",
    "removeSyncQueueItem",
  ]);

  if (
    !allowedMethods.has(message.method) ||
    typeof SnipThatDB[message.method] !== "function"
  ) {
    throw new Error(`Unsupported IndexedDB method: ${message.method}`);
  }

  return SnipThatDB[message.method](
    ...(Array.isArray(message.args) ? message.args : []),
  );
}

chrome.windows.onRemoved.addListener((windowId) => {
  sidebarOpenByWindow.delete(windowId);
  floatingUiStateByWindow.delete(windowId);
  persistSidebarState();
  persistFloatingUiState();
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  void syncSidebarStateToTab(tabId, windowId);
});
async function handleSelectionContextMenuClick(info, tab) {
  try {
    if (info.menuItemId !== "snipaze-save-selection") return;
    const text = String(info.selectionText || "").trim();
    if (!text) return;
    await SnipThatDB.setSetting("pendingClipboardCapture", {
      captureId:
        globalThis.crypto?.randomUUID?.() ||
        `capture-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text,
      metadata: createSelectionMetadata(tab),
    });
    await openSelectionPickerWindow();
  } catch (error) {
    console.debug("Snipaze selection save skipped", error);
  }
}

async function handleCommand(command) {
  try {
    const messageType = {
      "capture-screenshot": "TOOLBAR_CAPTURE_SCREENSHOT",
      "extract-ocr-text": "TOOLBAR_EXTRACT_OCR",
    }[command];
    if (!messageType) return;
    await extensionReloadPatchReady;
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (!tab?.id) return;
    await dispatchTabAction(tab.id, messageType);
  } catch (error) {
    console.debug("Snipaze command skipped", command, error);
  }
}

async function initializeExtensionGeneration() {
  const stored = await chrome.storage.session.get(EXTENSION_GENERATION_KEY);
  let generation = stored?.[EXTENSION_GENERATION_KEY];
  const created = typeof generation !== "string" || !generation;
  if (created) {
    generation =
      globalThis.crypto?.randomUUID?.() ||
      `generation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await chrome.storage.session.set({
      [EXTENSION_GENERATION_KEY]: generation,
    });
  }
  return { generation, created };
}
async function getSidebarOpenState(windowId) {
  if (sidebarOpenByWindow.has(windowId)) {
    return sidebarOpenByWindow.get(windowId) === true;
  }

  const saved = await readPersistedSidebarState();
  for (const [id, open] of Object.entries(saved)) {
    sidebarOpenByWindow.set(Number(id), open === true);
  }

  return sidebarOpenByWindow.get(windowId) === true;
}

async function setSidebarOpenState(windowId, open) {
  sidebarOpenByWindow.set(windowId, open === true);
  await persistSidebarState();
}

async function readPersistedSidebarState() {
  try {
    return await SnipThatDB.getUiState(SIDEBAR_STATE_KEY, {});
  } catch {
    return {};
  }
}

async function persistSidebarState() {
  try {
    await SnipThatDB.setUiState(
      SIDEBAR_STATE_KEY,
      Object.fromEntries(sidebarOpenByWindow),
    );
  } catch {}
}

async function getFloatingUiState(windowId) {
  if (floatingUiStateByWindow.has(windowId)) {
    return floatingUiStateByWindow.get(windowId);
  }

  const saved = await readPersistedFloatingUiState();
  for (const [id, state] of Object.entries(saved)) {
    floatingUiStateByWindow.set(Number(id), sanitizeFloatingUiState(state));
  }

  return floatingUiStateByWindow.get(windowId) || null;
}

async function setFloatingUiState(windowId, state) {
  if (!state) return;
  floatingUiStateByWindow.set(windowId, state);
  await persistFloatingUiState();
}

async function readPersistedFloatingUiState() {
  try {
    return await SnipThatDB.getUiState(FLOATING_UI_STATE_KEY, {});
  } catch {
    return {};
  }
}

async function persistFloatingUiState() {
  try {
    await SnipThatDB.setUiState(
      FLOATING_UI_STATE_KEY,
      Object.fromEntries(floatingUiStateByWindow),
    );
  } catch {}
}

function sanitizeFloatingUiState(state) {
  if (!state || typeof state !== "object") return null;
  const iconRect = state.iconRect && {
    left: Number(state.iconRect.left),
    top: Number(state.iconRect.top),
  };
  const sidebarRect = state.sidebarRect && {
    width: Number(state.sidebarRect.width),
    height: Number(state.sidebarRect.height),
    right: Number(state.sidebarRect.right),
    top: Number(state.sidebarRect.top),
  };

  return {
    ...(iconRect &&
    Number.isFinite(iconRect.left) &&
    Number.isFinite(iconRect.top)
      ? { iconRect }
      : {}),
    ...(sidebarRect &&
    Number.isFinite(sidebarRect.width) &&
    Number.isFinite(sidebarRect.height) &&
    Number.isFinite(sidebarRect.right) &&
    Number.isFinite(sidebarRect.top)
      ? { sidebarRect }
      : {}),
  };
}

async function broadcastSidebarState(windowId, open, sourceTabId) {
  await broadcastMessageToWindow(
    windowId,
    {
      type: "SYNC_SIDEBAR_OPEN_STATE",
      open,
    },
    sourceTabId,
  );
}

async function syncSidebarStateToTab(tabId, windowId) {
  await sendSidebarStateToTab(tabId, await getSidebarOpenState(windowId));
  await sendMessageToTab(tabId, {
    type: "SYNC_FLOATING_UI_STATE",
    state: await getFloatingUiState(windowId),
  });
}

async function sendSidebarStateToTab(tabId, open) {
  await sendMessageToTab(tabId, {
    type: "SYNC_SIDEBAR_OPEN_STATE",
    open,
  });
}

async function broadcastMessageToWindow(windowId, message, sourceTabId) {
  const tabs = await chrome.tabs.query({ windowId });

  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id || tab.id === sourceTabId) return;
      await sendMessageToTab(tab.id, message);
    }),
  );
}

async function getTabExtensionGeneration(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () =>
        document.getElementById("snip-ocr-floating-host")?.dataset
          .snipazeGeneration || "",
    });
    return typeof result?.result === "string" ? result.result : "";
  } catch {
    return null;
  }
}

async function dispatchTabAction(tabId, actionType) {
  const { generation } = await extensionGenerationReady;
  const pageGeneration = await getTabExtensionGeneration(tabId);
  if (pageGeneration === null) return false;
  if (pageGeneration !== generation) {
    await patchExistingFloatingIconsInTab(tabId);
  }
  try {
    await chrome.tabs.sendMessage(tabId, { type: actionType });
    return true;
  } catch {
    return false;
  }
}
async function sendMessageToTab(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {}
}

async function processCapture(message, sender) {
  const windowId = sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
    format: "png",
  });

  if (message.type === "PROCESS_VISIBLE_SCREENSHOT") {
    return { dataUrl };
  }

  await setupOffscreenDocument();

  const result = await chrome.runtime.sendMessage({
    target: "offscreen",
    type:
      message.type === "PROCESS_SCREENSHOT" ? "CROP_CAPTURE" : "OCR_CAPTURE",
    dataUrl,
    rect: message.rect,
    viewport: message.viewport,
    requestId: message.requestId,
    tabId: sender.tab?.id,
  });

  if (!result?.ok) {
    throw new Error(result?.error || "Unable to process capture.");
  }

  return result;
}

async function setupOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT);

  if ("getContexts" in chrome.runtime) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [offscreenUrl],
    });

    if (contexts.length > 0) return;
  } else {
    const clients = await self.clients.matchAll();
    if (clients.some((client) => client.url === offscreenUrl)) return;
  }

  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT,
      reasons: ["WORKERS", "BLOBS"],
      justification:
        "Run local OCR in an extension page without page CSP blocking workers.",
    });
  }

  try {
    await creatingOffscreenDocument;
  } finally {
    creatingOffscreenDocument = null;
  }
}

async function patchExistingFloatingIconsInOpenTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    await Promise.all(
      tabs.map((tab) =>
        tab.id && /^https?:/i.test(tab.url || "")
          ? patchExistingFloatingIconsInTab(tab.id)
          : null,
      ),
    );
  } catch (error) {
    console.debug("Snipaze reload guard startup could not scan tabs", error);
  }
}

async function patchExistingFloatingIconsInTab(tabId) {
  if (!Number.isInteger(tabId)) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["themes/reload-guard-styles.js", "ui/reload-guard.js"],
    });
  } catch (error) {
    console.debug("Snipaze reload guard could not reach tab", tabId, error);
  }
}

async function broadcastMessageToAllTabs(message) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map((tab) => (tab.id ? sendMessageToTab(tab.id, message) : null)),
  );
}
function createSelectionContextMenu() {
  chrome.contextMenus.remove("snipaze-save-selection", () => {
    void chrome.runtime.lastError;
    chrome.contextMenus.create(
      {
        id: "snipaze-save-selection",
        title: "Save selected text to Snipaze",
        contexts: ["selection"],
      },
      () => void chrome.runtime.lastError,
    );
  });
}

function createSelectionMetadata(tab) {
  const now = new Date();
  const url = tab?.url || "";
  let host = "PDF document";
  try {
    host = new URL(url).hostname || host;
  } catch {}
  return {
    url,
    host,
    title: tab?.title || host,
    favicon: tab?.favIconUrl || "",
    timestamp: now.toISOString(),
    fullDate: now.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    time: now.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
    captureType: "Selected Text",
    windowId: tab?.windowId,
  };
}

async function openSelectionPickerWindow() {
  await chrome.windows.create({
    url: chrome.runtime.getURL("clipboard-picker/clipboard-picker.html?mode=choose"),
    type: "popup",
    width: 390,
    height: 590,
    focused: true,
  });
}

