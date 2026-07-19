(() => {
  let deps = null;

  function init(injectedDeps) {
    deps = injectedDeps;
  }

  function byteLength(value) {
    return new TextEncoder().encode(String(value || "")).length;
  }

  async function updateSettingsStats() {
    const floatingUi = deps.getFloatingUi();
    if (!floatingUi?.sidebar) return;
    const settingsPanel = floatingUi.sidebar.querySelector(
      '[data-panel="settings"]',
    );
    if (!settingsPanel) return;

    const [noteBlocks, images, settings, uiState] = await Promise.all([
      deps.getAllFromStore("noteBlocks"),
      deps.getAllFromStore("images"),
      deps.getAllFromStore("settings"),
      deps.getAllFromStore("uiState"),
    ]);
    const imageCount =
      images.length + countEmbeddedImages(deps.workspaceState.notes);
    const storageBytes = [
      deps.workspaceState.notes,
      deps.workspaceState.categories,
      noteBlocks,
      images,
      settings,
      uiState,
    ].reduce(
      (sum, items) =>
        sum +
        items.reduce(
          (inner, item) => inner + byteLength(JSON.stringify(item || {})),
          0,
        ),
      0,
    );

    setSettingsStat("notes", deps.workspaceState.notes.length);
    setSettingsStat("categories", deps.workspaceState.categories.length);
    setSettingsStat("images", imageCount);
    setSettingsStat("storage", formatStorageSize(storageBytes));
  }

  function setSettingsStat(name, value) {
    const el = deps.getFloatingUi()?.sidebar?.querySelector(
      `[data-settings-stat="${name}"]`,
    );
    if (el) el.textContent = String(value);
  }

  function countEmbeddedImages(notes) {
    return notes.reduce((count, note) => {
      const inlineImages =
        String(note.contentHtml || "").match(/<img\b/gi)?.length || 0;
      return count + inlineImages + (note.imageDataUrl ? 1 : 0);
    }, 0);
  }

  function formatStorageSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  const HELP_URL = "https://snipaze.in/help.html";
  const PRIVACY_URL = "https://snipaze.in/privacy-policy.html";
  const SUPPORT_URL = "https://snipaze.in/support.html";
  const WEBSITE_URL = "https://snipaze.in/";
  const RATE_EXTENSION_URL = "https://chromewebstore.google.com/detail/snipaze/gblmjcjjlamhpolcnipflhibaannpglk";
  const LOGO_URL = chrome.runtime.getURL("icons/icon128.png");

  function renderPanel() {
    return `
      <div class="settings-title">
        <h2>Settings</h2>
      </div>

      <div class="settings-top-grid">
        <section class="settings-group" aria-label="Data management">
          <h3><span aria-hidden="true">&#128230;</span> Data Management</h3>
          <div class="setting-row setting-export-row">
            <span>Export All Data</span>
            <details class="settings-export-menu">
              <summary aria-label="Choose export format" title="Choose export format">&#8942;</summary>
              <div class="settings-export-actions" aria-label="Export all data format">
                <button type="button" data-action="export-all-data" data-format="txt">TXT</button>
                <button type="button" data-action="export-all-data" data-format="word">Word</button>
                <button type="button" data-action="export-all-data" data-format="pdf">PDF</button>
              </div>
            </details>
          </div>
          <button class="setting-row setting-row-disabled" type="button" data-action="import-backup" disabled aria-disabled="true">
            <span>Import Backup</span>
          </button>
          <button class="setting-row settings-danger" type="button" data-action="clear-notes">
            <span>Clear All Data</span>
          </button>
          <input type="file" data-import-backup-input accept="application/json,.json" hidden disabled>
        </section>

        <section class="settings-group" aria-label="Statistics">
          <h3><span aria-hidden="true">&#128202;</span> Statistics</h3>
          <div class="storage-usage" aria-label="Storage usage">
            <div><span>Notes Count</span><strong data-settings-stat="notes">0</strong></div>
            <div><span>Categories Count</span><strong data-settings-stat="categories">0</strong></div>
            <div><span>Images Count</span><strong data-settings-stat="images">0</strong></div>
            <div><span>Storage Used</span><strong data-settings-stat="storage">0 MB</strong></div>
          </div>
        </section>
      </div>

      <section class="settings-group" aria-label="Sync">
        <h3><span aria-hidden="true">&#128246;</span> Sync</h3>
        <div class="setting-row">
          <span>Device name</span>
          <input type="text" data-device-name-input placeholder="This device">
        </div>
      </section>

      <section class="settings-group support-hub" aria-label="Help, support, and about">
        <h3><span aria-hidden="true">&#128214;</span> Help &amp; Support</h3>
        <div class="support-grid">
          <button class="support-tile" type="button" data-action="open-link" data-url="${HELP_URL}">
            <span class="support-tile-icon" aria-hidden="true">&#128196;</span>
            <span>Help &amp; User Guide</span>
          </button>
          <button class="support-tile" type="button" data-action="open-link" data-url="${SUPPORT_URL}">
            <span class="support-tile-icon" aria-hidden="true">&#9993;</span>
            <span>Send Feedback</span>
          </button>
          <button class="support-tile" type="button" data-action="open-link" data-url="${PRIVACY_URL}">
            <span class="support-tile-icon" aria-hidden="true">&#128274;</span>
            <span>Privacy Policy</span>
          </button>
          <button class="support-tile" type="button" data-action="open-link" data-url="${RATE_EXTENSION_URL}">
            <span class="support-tile-icon" aria-hidden="true">&#9733;</span>
            <span>Rate Extension</span>
          </button>
        </div>
        <div class="support-footer">
          <div class="support-brand">
            <img class="support-brand-mark" src="${LOGO_URL}" alt="" aria-hidden="true">
            <span class="support-brand-copy">
              <strong>Snipaze</strong>
              <span>Your Research Companion</span>
              <small>Version 1.0.2</small>
            </span>
          </div>
          <div class="support-footer-actions">
            <button type="button" data-action="open-link" data-url="${WEBSITE_URL}">Website</button>
            <button type="button" data-action="open-link" data-url="${SUPPORT_URL}">Support</button>
          </div>
        </div>
      </section>
    `;
  }

  function styles() {
    return globalThis.SnipazeSettingsThemeStyles || "";
  }

  globalThis.SnipThatSettings = {
    init,
    renderPanel,
    styles,
    updateSettingsStats,
    byteLength,
    formatStorageSize,
  };
})();
