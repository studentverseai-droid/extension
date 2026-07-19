const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("playwright");

const extensionPath = path.resolve(__dirname, "..");
const fixture = fs.readFileSync(
  path.join(__dirname, "fixtures", "sample-page.html"),
);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "snipaze-e2e-"));
const server = http.createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(fixture);
});

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const executablePath = process.env.SNIPAZE_CHROMIUM_PATH;
  const context = await chromium.launchPersistentContext(profile, {
    ...(executablePath ? { executablePath } : {}),
    headless: false,
    args: [
      "--disable-features=DisableLoadExtensionCommandLineSwitch",
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    let worker = context.serviceWorkers()[0];
    if (!worker) worker = await context.waitForEvent("serviceworker");
    const extensionId = new URL(worker.url()).host;
    const browserErrors = [];
    worker.on("console", (message) => {
      if (message.type() === "error")
        browserErrors.push(`worker: ${message.text()}`);
    });
    const commands = await worker.evaluate(() => chrome.commands.getAll());
    const shortcuts = Object.fromEntries(
      commands.map((command) => [command.name, command.shortcut]),
    );
    if (shortcuts["capture-screenshot"] !== "Alt+S")
      throw new Error("Alt+S is not registered");
    if (shortcuts["extract-ocr-text"] !== "Alt+T")
      throw new Error("Alt+T is not registered");

    const page = await context.newPage();
    page.on("pageerror", (error) =>
      browserErrors.push(`page: ${error.message}`),
    );
    page.on("console", (message) => {
      if (message.type() === "error")
        browserErrors.push(`page console: ${message.text()}`);
    });
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.waitForSelector("#snip-ocr-floating-host", {
      state: "attached",
    });
    const floatingHostIsVisible = await page.evaluate(() => {
      const host = document.getElementById("snip-ocr-floating-host");
      const point = document.elementFromPoint(window.innerWidth - 54, 178);
      return host?.isConnected === true && point === host;
    });
    if (!floatingHostIsVisible)
      throw new Error("Floating icon is attached but not visibly clickable");

    await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      await chrome.tabs.sendMessage(tab.id, {
        type: "SYNC_FLOATING_UI_STATE",
        state: { iconRect: { left: 999999, top: 999999 } },
      });
    });
    const offscreenPositionRecovered = await page.evaluate(() => {
      const host = document.getElementById("snip-ocr-floating-host");
      return (
        document.elementFromPoint(
          window.innerWidth - 36,
          window.innerHeight - 36,
        ) === host
      );
    });
    if (!offscreenPositionRecovered)
      throw new Error(
        "Floating icon did not recover from an off-screen saved position",
      );

    await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      await chrome.tabs.sendMessage(tab.id, {
        type: "SYNC_FLOATING_ICON_VISIBLE",
        visible: false,
      });
    });
    const hiddenIconStillClickable = await page.evaluate(
      () =>
        document.elementFromPoint(
          window.innerWidth - 36,
          window.innerHeight - 36,
        )?.id === "snip-ocr-floating-host",
    );
    if (hiddenIconStillClickable)
      throw new Error("Floating icon remains clickable after Hide");
    await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      await chrome.tabs.sendMessage(tab.id, {
        type: "SYNC_FLOATING_ICON_VISIBLE",
        visible: true,
      });
    });
    const shownIconIsClickable = await page.evaluate(
      () =>
        document.elementFromPoint(
          window.innerWidth - 36,
          window.innerHeight - 36,
        )?.id === "snip-ocr-floating-host",
    );
    if (!shownIconIsClickable)
      throw new Error(
        "Floating icon did not become visibly clickable after Show",
      );

    const metadataDownloadPromise = page.waitForEvent("download");
    await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          await globalThis.SnipazeNoteExport.exportNote(
            {
              id: "pdf-metadata-test",
              title: "PDF metadata test",
              category: "General",
              createdAt: Date.now(),
              updatedAt: Date.now(),
              contentHtml:
                '<section class="source-snippet"><div>Captured body</div><p class="source-meta">Source: Example Source<br>Link: <a href="https://example.com/">https://example.com/</a><br>Captured: Today at Now</p></section>',
            },
            "pdf",
          );
        },
      });
    });
    const metadataDownload = await metadataDownloadPromise;
    const metadataPdfPath = path.join(profile, "metadata-test.pdf");
    await metadataDownload.saveAs(metadataPdfPath);
    const metadataPdf = fs.readFileSync(metadataPdfPath, "latin1");
    for (const expected of [
      "Source: Example Source",
      "Link: https://example.com/",
      "Captured: Today at Now",
    ]) {
      if (!metadataPdf.includes(`(${expected}) Tj`))
        throw new Error(`PDF metadata line missing: ${expected}`);
    }
    if (
      /Source: Example SourceLink:|example\.com\/Captured:/.test(metadataPdf)
    ) {
      throw new Error("PDF metadata labels were concatenated");
    }

    await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      await chrome.tabs.sendMessage(tab.id, { type: "TOOLBAR_EXTRACT_OCR" });
    });
    await page.waitForSelector("#snip-ocr-root");
    await page.mouse.move(45, 45);
    await page.mouse.down();
    await page.mouse.move(420, 145);
    await page.mouse.up();
    await page.waitForSelector(".snip-ocr-cancel:not([hidden])", {
      timeout: 10_000,
    });
    await page.waitForSelector("#snip-ocr-root textarea", { timeout: 30_000 });
    const confidenceText = await page
      .locator(".snip-ocr-confidence:not([hidden])")
      .textContent();
    if (!["High confidence", "May need review"].includes(confidenceText))
      throw new Error("OCR confidence message missing");

    await page.locator(".snip-ocr-icon-button[title=Close]").click();
    await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      await chrome.tabs.sendMessage(tab.id, { type: "TOOLBAR_EXTRACT_OCR" });
    });
    await page.mouse.move(45, 45);
    await page.mouse.down();
    await page.mouse.move(420, 145);
    await page.mouse.up();
    await page.locator(".snip-ocr-cancel:not([hidden])").click();
    await page.waitForSelector("#snip-ocr-root", { state: "detached" });

    // A cancelled worker must be recreated cleanly for the very next OCR.
    await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      await chrome.tabs.sendMessage(tab.id, { type: "TOOLBAR_EXTRACT_OCR" });
    });
    await page.mouse.move(45, 45);
    await page.mouse.down();
    await page.mouse.move(420, 145);
    await page.mouse.up();
    await page.waitForSelector("#snip-ocr-root textarea", { timeout: 30_000 });
    await page.locator(".snip-ocr-icon-button[title=Close]").click();

    const errorsPage = await context.newPage();
    await errorsPage.goto(`chrome://extensions/?errors=${extensionId}`);
    await errorsPage.waitForTimeout(800);
    const parameterWarnings = await errorsPage
      .getByText(/Parameter not found/i)
      .allTextContents();
    await errorsPage.close();
    if (parameterWarnings.length)
      throw new Error(
        `English OCR produced extension warnings: ${parameterWarnings.join(" | ")}`,
      );

    // Existing visible-area screenshot behavior must remain intact.
    await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      await chrome.tabs.sendMessage(tab.id, {
        type: "TOOLBAR_CAPTURE_SCREENSHOT",
      });
    });
    await page.waitForSelector(
      "#snip-ocr-root .snip-ocr-result-image:not([hidden])",
      { timeout: 15_000 },
    );
    await page.waitForTimeout(500);
    await page.locator(".snip-ocr-icon-button[title=Minimize]").click();
    if (!(await page.locator("#snip-ocr-root").evaluate((root) => root.classList.contains("snip-ocr-minimized"))))
      throw new Error("Screenshot result did not minimize");
    await page.locator(".snip-ocr-icon-button[title=Restore]").click();
    if (await page.locator("#snip-ocr-root").evaluate((root) => root.classList.contains("snip-ocr-minimized")))
      throw new Error("Screenshot result did not restore");
    await page.locator(".snip-ocr-modal-backdrop").click({ position: { x: 10, y: 10 } });
    if (!(await page.locator("#snip-ocr-root").evaluate((root) => root.classList.contains("snip-ocr-backgrounded"))))
      throw new Error("Screenshot backdrop did not background the result");
    await page.locator(".snip-ocr-modal-header").dispatchEvent("pointerdown");
    if (await page.locator("#snip-ocr-root").evaluate((root) => root.classList.contains("snip-ocr-backgrounded")))
      throw new Error("Screenshot result did not return to the foreground");
    await page.locator(".snip-ocr-icon-button[title=Close]").click();
    await page.waitForSelector("#snip-ocr-root", { state: "detached" });

    await worker.evaluate(async () => {
      await SnipThatDB.addCategory({
        name: "Before",
        color: "blue",
        createdAt: Date.now(),
      });
      await SnipThatDB.addNote({
        id: "rename-test-note",
        title: "Rename test",
        category: "Before",
        content: "Safe",
        contentHtml: "Safe",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await SnipThatDB.renameCategory("Before", {
        name: "After",
        color: "blue",
        createdAt: Date.now(),
      });
      const notes = await SnipThatDB.getNotes();
      const note = notes.find((item) => item.id === "rename-test-note");
      if (note?.category !== "After")
        throw new Error("Atomic category rename failed");
    });

    await worker.evaluate(async () => {
      await SnipThatDB.setSetting("pendingClipboardCapture", {
        text: "PDF append text",
        metadata: {
          url: "https://example.com/file.pdf",
          title: "PDF",
          fullDate: "Today",
          time: "Now",
        },
      });
    });
    const appendPicker = await context.newPage();
    await appendPicker.goto(
      `chrome-extension://${extensionId}/clipboard-picker/clipboard-picker.html?mode=choose`,
    );
    await appendPicker.locator('[data-note="rename-test-note"]').click();
    await appendPicker.waitForEvent("close");
    await worker.evaluate(async () => {
      const note = (await SnipThatDB.getNotes()).find(
        (item) => item.id === "rename-test-note",
      );
      if (!note?.contentHtml?.includes("PDF append text"))
        throw new Error("PDF selection existing-note append failed");
      await SnipThatDB.setSetting("pendingClipboardCapture", {
        text: "PDF second append",
        metadata: {
          url: "https://example.com/file.pdf",
          title: "PDF",
          fullDate: "Today",
          time: "Now",
        },
      });
    });
    const secondAppendPicker = await context.newPage();
    await secondAppendPicker.goto(
      `chrome-extension://${extensionId}/clipboard-picker/clipboard-picker.html?mode=choose`,
    );
    await secondAppendPicker.locator('[data-note="rename-test-note"]').click();
    await secondAppendPicker.waitForEvent("close");
    await worker.evaluate(async () => {
      const note = (await SnipThatDB.getNotes()).find(
        (item) => item.id === "rename-test-note",
      );
      if (
        !note?.contentHtml?.includes("PDF append text") ||
        !note.contentHtml.includes("PDF second append")
      ) {
        throw new Error(
          "PDF selection second save did not preserve both entries",
        );
      }
      await SnipThatDB.setSetting("pendingClipboardCapture", {
        text: "PDF new note text",
        metadata: {
          url: "https://example.com/file.pdf",
          title: "PDF",
          fullDate: "Today",
          time: "Now",
        },
      });
    });
    const createPicker = await context.newPage();
    await createPicker.goto(
      `chrome-extension://${extensionId}/clipboard-picker/clipboard-picker.html?mode=choose`,
    );
    await createPicker.locator("[data-create-toggle]").click();
    await createPicker.locator("[data-title]").fill("PDF saved note");
    await createPicker
      .locator('[data-create-form] button[type="submit"]')
      .click();
    await createPicker.waitForEvent("close");
    await worker.evaluate(async () => {
      const note = (await SnipThatDB.getNotes()).find(
        (item) => item.title === "PDF saved note",
      );
      if (note?.content !== "PDF new note text")
        throw new Error("PDF selection new-note creation failed");
      await SnipThatDB.setSetting("pendingClipboardCapture", {
        text: "Visibility check",
        metadata: {
          url: "https://example.com/file.pdf",
          title: "PDF",
          fullDate: "Today",
          time: "Now",
        },
      });
    });
    const visibilityPicker = await context.newPage();
    await visibilityPicker.goto(
      `chrome-extension://${extensionId}/clipboard-picker/clipboard-picker.html?mode=choose`,
    );
    await visibilityPicker
      .locator("[data-note]", { hasText: "PDF saved note" })
      .waitFor({ state: "visible", timeout: 15_000 });
    await visibilityPicker.close();

    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await popupPage.waitForSelector('[data-action="floating-icon"]');
    if (await popupPage.locator('[data-action="clipboard-access"]').count())
      throw new Error("Obsolete clipboard toggle is still visible");
    const shortcutWarningHidden = await popupPage
      .locator('[data-action="shortcut-settings"]')
      .evaluate((element) => element.hidden);
    if (!shortcutWarningHidden)
      throw new Error("Shortcut warning shown despite registered shortcuts");
    const allNotesPagePromise = context.waitForEvent("page");
    await popupPage.locator('[data-action="open-all-notes"]').click();
    const allNotesPage = await allNotesPagePromise;
    await allNotesPage.waitForURL(`chrome-extension://${extensionId}/reader/reader.html`);
    await allNotesPage.waitForSelector("[data-note-list]");
    await allNotesPage.close();
    if (!popupPage.isClosed()) await popupPage.close();

    const clickClosedShadowAction = async (action) => {
      const cdp = await context.newCDPSession(page);
      await cdp.send("DOM.enable");
      const { nodes } = await cdp.send("DOM.getFlattenedDocument", {
        depth: -1,
        pierce: true,
      });
      const actionNode = nodes.find((node) => {
        const attributes = node.attributes || [];
        for (let index = 0; index < attributes.length; index += 2) {
          if (
            attributes[index] === "data-action" &&
            attributes[index + 1] === action
          )
            return true;
        }
        return false;
      });
      if (!actionNode) throw new Error(`Closed-shadow action missing: ${action}`);
      const { object } = await cdp.send("DOM.resolveNode", {
        nodeId: actionNode.nodeId,
      });
      await cdp.send("Runtime.callFunctionOn", {
        objectId: object.objectId,
        functionDeclaration: "function () { this.click(); }",
      });
      await cdp.detach();
    };

    // Switching tabs must not be mistaken for an extension reload.
    const switchPage = await context.newPage();
    await switchPage.goto(`http://127.0.0.1:${port}/?switch-test`);
    await page.bringToFront();
    await clickClosedShadowAction("screenshot");
    await page.waitForSelector(
      "#snip-ocr-root .snip-ocr-result-image:not([hidden])",
      { timeout: 15_000 },
    );
    await page.locator(".snip-ocr-icon-button[title=Close]").click();
    await switchPage.close();

    // A real extension reload must make the old Screenshot button show the warning.
    const autoSaveOffPage = await context.newPage();
    const autoSaveOffUrl = `http://127.0.0.1:${port}/?auto-save-off`;
    await autoSaveOffPage.goto(autoSaveOffUrl);
    await autoSaveOffPage.waitForSelector("#snip-ocr-floating-host", {
      state: "attached",
    });
    await worker.evaluate(
      async ({ mainUrl, offUrl }) => {
        const tabs = await chrome.tabs.query({});
        const mainTab = tabs.find((item) => item.url === mainUrl);
        const offTab = tabs.find((item) => item.url === offUrl);
        if (!mainTab?.id || !offTab?.id) throw new Error("Auto Save test tabs missing");
        await chrome.tabs.sendMessage(mainTab.id, {
          type: "SYNC_AUTO_SAVE_SETTING",
          enabled: true,
        });
        await chrome.tabs.sendMessage(offTab.id, {
          type: "SYNC_AUTO_SAVE_SETTING",
          enabled: false,
        });
      },
      {
        mainUrl: `http://127.0.0.1:${port}/`,
        offUrl: autoSaveOffUrl,
      },
    );
    await page.waitForFunction(
      () =>
        document.getElementById("snip-ocr-floating-host")?.dataset
          .snipazeAutoSave === "true",
    );
    await autoSaveOffPage.waitForFunction(
      () =>
        document.getElementById("snip-ocr-floating-host")?.dataset
          .snipazeAutoSave === "false",
    );
    await page.bringToFront();
    await worker.evaluate(() => chrome.runtime.reload()).catch(() => {});
    await clickClosedShadowAction("screenshot");
    await page.waitForFunction(
      () =>
        document.querySelector("#snip-ocr-root .snip-ocr-text")?.value ===
        "Extension reloaded. Please refresh the page.",
      null,
      { timeout: 15_000 },
    );
    const exerciseStaleResultActions = () =>
      page.evaluate(() => {
        const root = document.getElementById("snip-ocr-root");
        const body = root?.querySelector(".snip-ocr-text");
        const footer = root?.querySelector(".snip-ocr-footer");
        const before = Number(body?.dataset.reloadBlink || "0");
        footer?.querySelectorAll("button, select").forEach((control) =>
          control.click(),
        );
        return {
          visible: footer?.hidden === false,
          blinked: Number(body?.dataset.reloadBlink || "0") > before,
          pickerOpen: Boolean(
            document.getElementById("snip-ocr-capture-insert-picker-root"),
          ),
        };
      });
    const screenshotActions = await exerciseStaleResultActions();
    if (!screenshotActions.visible || !screenshotActions.blinked || screenshotActions.pickerOpen)
      throw new Error("Reloaded Screenshot actions were not safely intercepted");
    await page.locator(".snip-ocr-icon-button[title=Close]").click();

    await clickClosedShadowAction("ocr");
    await page.waitForFunction(
      () =>
        document.querySelector("#snip-ocr-root .snip-ocr-text")?.value ===
          "Extension reloaded. Please refresh the page." &&
        document.querySelector("#snip-ocr-root .snip-ocr-modal")?.getAttribute(
          "aria-label",
        ) === "OCR result",
      null,
      { timeout: 15_000 },
    );
    const ocrActions = await exerciseStaleResultActions();
    if (!ocrActions.visible || !ocrActions.blinked || ocrActions.pickerOpen)
      throw new Error("Reloaded OCR actions were not safely intercepted");    await page.locator(".snip-ocr-icon-button[title=Close]").click();
    await page.evaluate(() => {
      const target = document.getElementById("ocr-target");
      const selection = getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
    });
    await page.keyboard.press("Control+C");
    await page.waitForSelector("#snipaze-reload-copy-notice", {
      state: "visible",
      timeout: 15_000,
    });
    const staleCopySafe = await page.evaluate(() =>
      !document.getElementById("snip-ocr-copy-picker-root") &&
      document.getElementById("snipaze-reload-copy-notice")?.textContent ===
        "Extension reloaded. Please refresh the page.",
    );
    if (!staleCopySafe)
      throw new Error("Reloaded Ctrl+C opened the copied-text note picker");

    await autoSaveOffPage.bringToFront();
    await autoSaveOffPage.evaluate(() => {
      const target = document.getElementById("ocr-target");
      const selection = getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
    });
    await autoSaveOffPage.keyboard.press("Control+C");
    await autoSaveOffPage.waitForTimeout(500);
    const autoSaveOffStayedNative = await autoSaveOffPage.evaluate(
      () =>
        !document.getElementById("snipaze-reload-copy-notice") &&
        !document.getElementById("snip-ocr-copy-picker-root"),
    );
    if (!autoSaveOffStayedNative)
      throw new Error("Reloaded Ctrl+C reacted while Auto Save was OFF");
    await autoSaveOffPage.close();

    if (browserErrors.length)
      throw new Error(`Browser errors detected:\n${browserErrors.join("\n")}`);
    console.log(
      "PASS Chrome E2E: extension load, PDF selection picker repeated-save/create flow, shortcuts, OCR progress/cancel/recovery/confidence, screenshot, atomic rename, popup",
    );
  } finally {
    await context.close();
    server.close();
    try {
      fs.rmSync(profile, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 200,
      });
    } catch {}
  }
})().catch((error) => {
  server.close();
  try {
    fs.rmSync(profile, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  } catch {}
  console.error(error);
  process.exitCode = 1;
});
