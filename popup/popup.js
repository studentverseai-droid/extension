const autoSaveInput = document.querySelector('[data-action="auto-save"]');
const floatingIconInput = document.querySelector(
  '[data-action="floating-icon"]',
);
const autoSaveLabel = document.querySelector("[data-auto-save-label]");
const floatingIconLabel = document.querySelector("[data-icon-label]");
const statusElement = document.querySelector(".status");
const shortcutWarning = document.querySelector(
  "[data-action='shortcut-settings']",
);

initialize();

document
  .querySelector('[data-action="screenshot"]')
  .addEventListener("click", () => {
    runTabAction("TOOLBAR_CAPTURE_SCREENSHOT");
  });

document.querySelector('[data-action="ocr"]').addEventListener("click", () => {
  runTabAction("TOOLBAR_EXTRACT_OCR");
});
document
  .querySelector('[data-action="save-link"]')
  .addEventListener("click", () => {
    runTabAction("TOOLBAR_SAVE_LINK");
  });

document
  .querySelector('[data-action="open-all-notes"]')
  .addEventListener("click", async () => {
    await chrome.tabs.create({ url: chrome.runtime.getURL("reader/reader.html") });
    window.close();
  });
document
  .querySelector("[data-open-pro]")
  .addEventListener("click", async () => {
    await chrome.tabs.create({ url: chrome.runtime.getURL("reader/reader.html#pro") });
    window.close();
  });
autoSaveInput.addEventListener("change", async () => {
  const response = await sendRuntimeMessage({
    type: "SET_AUTO_SAVE_SETTING",
    enabled: autoSaveInput.checked,
  });
  if (!response?.ok) {
    autoSaveInput.checked = !autoSaveInput.checked;
    showStatus("Unable to update Auto Save.");
  }
  syncLabels();
});

shortcutWarning.addEventListener("click", async () => {
  await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  window.close();
});

floatingIconInput.addEventListener("change", async () => {
  const response = await sendRuntimeMessage({
    type: "SET_FLOATING_ICON_VISIBLE",
    visible: floatingIconInput.checked,
  });
  if (!response?.ok) {
    floatingIconInput.checked = !floatingIconInput.checked;
    showStatus("Unable to update floating icon.");
  }
  syncLabels();
});

async function initialize() {
  const [autoSave, floatingIcon, commands, theme, proStatus] = await Promise.all([
    sendDbMessage("getSetting", ["autoSaveOnCopy", false]),
    sendRuntimeMessage({ type: "GET_FLOATING_ICON_VISIBLE" }),
    getCommands(),
    sendDbMessage("getSetting", ["theme", "dark"]),
    sendRuntimeMessage({ type: "REFRESH_PRO_STATUS" }),
  ]);
  SnipazeThemeManager.applyTheme(document.body, theme?.ok ? theme.value : "dark");
  SnipazePro.applyProToolState(document, proStatus?.ok && proStatus.isPaid === true);
  autoSaveInput.checked = autoSave?.ok && autoSave.value === true;
  floatingIconInput.checked = floatingIcon?.visible !== false;
  const commandNames = ["capture-screenshot", "extract-ocr-text"];
  const requiredCommands = commands.filter((command) =>
    commandNames.includes(command.name),
  );
  const missingCommands = commandNames.filter(
    (name) =>
      !requiredCommands.find((command) => command.name === name)?.shortcut,
  );
  shortcutWarning.hidden = missingCommands.length === 0;
  if (missingCommands.length) {
    const labels = {
      "capture-screenshot": "Alt+S",
      "extract-ocr-text": "Alt+T",
    };
    shortcutWarning.innerHTML = `${missingCommands.map((name) => labels[name]).join(", ")} unavailable <span>Set shortcuts</span>`;
  }
  syncLabels();
}

async function runTabAction(type) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showStatus("No active webpage found.");
    return;
  }

  const response = await sendRuntimeMessage({
    type: "RUN_TAB_ACTION",
    tabId: tab.id,
    action: type,
  });
  if (response?.ok) {
    window.close();
    return;
  }
  showStatus("Open a normal webpage, then try again.");
}

function getCommands() {
  return new Promise((resolve) => {
    chrome.commands.getAll((commands) => {
      if (chrome.runtime.lastError) return resolve([]);
      resolve(Array.isArray(commands) ? commands : []);
    });
  });
}

function syncLabels() {
  autoSaveLabel.textContent = autoSaveInput.checked ? "ON" : "OFF";
  floatingIconLabel.textContent = floatingIconInput.checked ? "SHOW" : "HIDE";
}

function showStatus(message) {
  statusElement.textContent = message;
}

function sendDbMessage(method, args) {
  return sendRuntimeMessage({ type: "SNIPTHAT_DB", method, args });
}

function sendRuntimeMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response || null);
    });
  });
}
