(() => {
  const DB_NAME = "SnipThatDB";
  const DB_VERSION = 2;
  const STORES = ["categories", "notes", "noteBlocks", "images", "settings", "uiState", "syncQueue", "syncMetadata"];
  const isServiceWorker = typeof ServiceWorkerGlobalScope !== "undefined" && globalThis instanceof ServiceWorkerGlobalScope;

  if (!isServiceWorker) {
    const isContextInvalidatedError = (error) =>
      /extension context invalidated|context invalidated|receiving end does not exist|could not establish connection|message (?:channel|port) closed|channel closed before a response|port closed before a response|asynchronous response[\s\S]*channel closed|snipaze (?:runtime is unavailable|was refreshed)|cannot read properties of (?:undefined|null)[\s\S]*sendMessage/i.test(String(error?.message || error || ""));
    const WRITE_METHODS = new Set([
      "saveCategories", "addCategory", "updateCategory", "renameCategory", "deleteCategory",
      "deleteCategoryWithNotes", "saveNotes", "addNote", "updateNote", "updateNoteIfUnchanged", "appendNoteHtml", "deleteNote",
      "setSetting", "setUiState", "replaceAll", "put", "remove", "clear", "getSyncQueue", "removeSyncQueueItem"
    ]);
    const notifyFailure = (method, error) => {
      try {
        globalThis.dispatchEvent(new CustomEvent("snipaze:db-error", {
          detail: {
            method,
            message: String(error?.message || error || "Unable to save Snipaze data.")
          }
        }));
      } catch {
      }
    };

    const fallbackValue = (method, args = []) => {
      if (method === "dbInit") return true;
      if (["getCategories", "getNotes", "getAll"].includes(method)) return [];
      if (["getSetting", "getUiState"].includes(method)) return args[1];
      if (["addCategory", "addNote", "put", "setSetting", "setUiState"].includes(method)) return args[0] ?? args[1] ?? null;
      if (["updateCategory", "updateNote", "updateNoteIfUnchanged"].includes(method)) return { id: args[0], ...(args[1] || {}) };
      if (["saveCategories", "saveNotes", "replaceAll", "deleteCategory", "deleteCategoryWithNotes", "deleteNote", "remove", "clear", "removeSyncQueueItem"].includes(method)) return null;
      if (["getSyncQueue"].includes(method)) return [];
      return null;
    };

    if (typeof globalThis.addEventListener === "function" && !globalThis.__snipThatRuntimeRejectionGuard) {
      globalThis.__snipThatRuntimeRejectionGuard = true;
      globalThis.addEventListener("unhandledrejection", (event) => {
        if (isContextInvalidatedError(event.reason) || event.reason?.isSnipazeDbError) {
          event.preventDefault();
        }
      });
    }

    const settleFailure = (method, args, error, resolve, reject) => {
      const isNoteConflict = /changed in another Snipaze view|deleted elsewhere/i.test(String(error?.message || error || ""));
      if (!isNoteConflict) notifyFailure(method, error);
      if (WRITE_METHODS.has(method)) {
        error.isSnipazeDbError = true;
        reject(error);
        return;
      }
      let runtimeUnavailable = false;
      try {
        runtimeUnavailable = !globalThis.chrome?.runtime?.id;
      } catch {
        runtimeUnavailable = true;
      }
      if (!runtimeUnavailable && !isContextInvalidatedError(error)) {
        console.warn(`Snipaze IndexedDB read failed: ${method}`, error);
      }
      resolve(fallbackValue(method, args));
    };

    const call = (method, args = []) => new Promise((resolve, reject) => {
      try {
        if (!globalThis.chrome?.runtime?.id) {
          settleFailure(method, args, new Error("Snipaze was refreshed. Reconnecting to the extension."), resolve, reject);
          return;
        }
        chrome.runtime.sendMessage({ type: "SNIPTHAT_DB", method, args }, (response) => {
          try {
            if (chrome.runtime.lastError) {
              settleFailure(method, args, new Error(chrome.runtime.lastError.message || "Snipaze runtime is unavailable."), resolve, reject);
              return;
            }
            if (!response?.ok) {
              settleFailure(method, args, new Error(response?.error || `IndexedDB operation failed: ${method}`), resolve, reject);
              return;
            }
            resolve(response.value);
          } catch (error) {
            settleFailure(method, args, error, resolve, reject);
          }
        });
      } catch (error) {
        settleFailure(method, args, error, resolve, reject);
      }
    });

    const proxy = {
      DB_NAME,
      DB_VERSION,
      STORES,
      dbInit: () => call("dbInit"),
      getCategories: () => call("getCategories"),
      saveCategories: (categories) => call("saveCategories", [categories]),
      addCategory: (category) => call("addCategory", [category]),
      updateCategory: (categoryId, patch) => call("updateCategory", [categoryId, patch]),
      renameCategory: (categoryId, category) => call("renameCategory", [categoryId, category]),
      deleteCategory: (categoryId) => call("deleteCategory", [categoryId]),
      deleteCategoryWithNotes: (categoryId) => call("deleteCategoryWithNotes", [categoryId]),
      getNotes: () => call("getNotes"),
      saveNotes: (notes) => call("saveNotes", [notes]),
      addNote: (note) => call("addNote", [note]),
      updateNote: (noteId, patch) => call("updateNote", [noteId, patch]),
      updateNoteIfUnchanged: (noteId, patch, expectedUpdatedAt) => call("updateNoteIfUnchanged", [noteId, patch, expectedUpdatedAt]),
      appendNoteHtml: (noteId, html, updatedAt) => call("appendNoteHtml", [noteId, html, updatedAt]),
      deleteNote: (noteId) => call("deleteNote", [noteId]),
      getSetting: (key, defaultValue) => call("getSetting", [key, defaultValue]),
      setSetting: (key, value) => call("setSetting", [key, value]),
      getUiState: (key, defaultValue) => call("getUiState", [key, defaultValue]),
      setUiState: (key, value) => call("setUiState", [key, value]),
      getAll: (storeName) => call("getAll", [storeName]),
      replaceAll: (storeName, items) => call("replaceAll", [storeName, items]),
      put: (storeName, value) => call("put", [storeName, value]),
      remove: (storeName, key) => call("remove", [storeName, key]),
      clear: (storeName) => call("clear", [storeName]),
      getSyncQueue: () => call("getSyncQueue"),
      removeSyncQueueItem: (operationId) => call("removeSyncQueueItem", [operationId])
    };

    globalThis.SnipThatDB = proxy;
    return;
  }

  let dbPromise = null;

  function dbInit() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("categories")) {
          db.createObjectStore("categories", { keyPath: "name" });
        }
        if (!db.objectStoreNames.contains("notes")) {
          db.createObjectStore("notes", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("noteBlocks")) {
          db.createObjectStore("noteBlocks", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("images")) {
          db.createObjectStore("images", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("uiState")) {
          db.createObjectStore("uiState", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("syncQueue")) {
          db.createObjectStore("syncQueue", { keyPath: "operationId" });
        }
        if (!db.objectStoreNames.contains("syncMetadata")) {
          db.createObjectStore("syncMetadata", { keyPath: "key" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("Snipaze IndexedDB upgrade blocked."));
    });

    return dbPromise;
  }

  async function transaction(storeName, mode, callback) {
    const db = await dbInit();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let callbackResult;

      tx.oncomplete = () => resolve(callbackResult);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted."));

      callbackResult = callback(store);
    });
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getAll(storeName) {
    return transaction(storeName, "readonly", (store) => requestToPromise(store.getAll()));
  }

  async function replaceAll(storeName, items) {
    await transaction(storeName, "readwrite", (store) => {
      store.clear();
      for (const item of Array.isArray(items) ? items : []) {
        store.put(item);
      }
    });
  }

  async function put(storeName, value) {
    await transaction(storeName, "readwrite", (store) => {
      store.put(value);
    });
    return value;
  }

  async function remove(storeName, key) {
    await transaction(storeName, "readwrite", (store) => {
      store.delete(key);
    });
  }

  async function clear(storeName) {
    await transaction(storeName, "readwrite", (store) => {
      store.clear();
    });
  }

  async function getKeyValue(storeName, key, defaultValue) {
    const row = await transaction(storeName, "readonly", (store) => requestToPromise(store.get(key)));
    return row && Object.prototype.hasOwnProperty.call(row, "value") ? row.value : defaultValue;
  }

  async function setKeyValue(storeName, key, value) {
    await put(storeName, { key, value });
    return value;
  }


  function normalizeLocalRevision(record) {
    return Number(record?.localRevision || record?.updatedAt || record?.createdAt || Date.now()) || Date.now();
  }

  function normalizeServerRevision(record) {
    return Number(record?.serverRevision || 0) || 0;
  }

  function normalizeSyncSequence(record) {
    return Number(record?.syncSequence || 0) || 0;
  }

  function makeSyncQueueItem(entityType, entityId, operation, record, previousRecord) {
    const localRevision = normalizeLocalRevision(record || previousRecord);
    return {
      operationId: `${entityType}:${entityId}`,
      entityType,
      entityId,
      operation,
      localRevision,
      baseServerRevision: normalizeServerRevision(previousRecord || record),
      retryCount: 0,
      createdAt: new Date().toISOString()
    };
  }

  function prepareLocalNote(note, previousNote, { skipSyncQueue = false } = {}) {
    if (skipSyncQueue) return note;
    return {
      ...note,
      localRevision: Math.max(normalizeLocalRevision(previousNote) + 1, Number(note?.updatedAt || Date.now()) || Date.now()),
      serverRevision: normalizeServerRevision(previousNote || note),
      syncSequence: normalizeSyncSequence(previousNote || note),
      syncStatus: "pending",
      deleted: false,
      deletedAt: null
    };
  }

  function prepareLocalCategory(category, previousCategory, { skipSyncQueue = false } = {}) {
    if (skipSyncQueue) return category;
    return {
      ...category,
      localRevision: Math.max(normalizeLocalRevision(previousCategory) + 1, Number(category?.createdAt || Date.now()) || Date.now()),
      serverRevision: normalizeServerRevision(previousCategory || category),
      syncSequence: normalizeSyncSequence(previousCategory || category),
      syncStatus: "pending",
      deleted: false,
      deletedAt: null
    };
  }

  async function updateByKey(storeName, key, patch) {
    const db = await dbInit();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const getRequest = store.get(key);
      let next;

      getRequest.onsuccess = () => {
        try {
          const current = getRequest.result;
          if (!current) {
            // An update on something that no longer exists must fail loudly,
            // not silently build a new record from {} and put it back - that
            // would resurrect something that was deliberately deleted (e.g.
            // a queued autosave arriving after the note was deleted elsewhere).
            const error = new Error("This item was deleted elsewhere.");
            error.name = "SnipazeItemDeletedError";
            throw error;
          }
          next = {
            ...current,
            ...(typeof patch === "function" ? patch(current) : patch)
          };
          store.put(next);
        } catch (error) {
          tx.abort();
          reject(error);
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
      tx.oncomplete = () => resolve(next);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted."));
    });
  }

  async function getCategories() {
    return getAll("categories");
  }

  async function saveCategories(categories) {
    await replaceAll("categories", categories);
  }

  async function addCategory(category, options = {}) {
    const db = await dbInit();
    const nextCategory = prepareLocalCategory(category, null, options);
    await new Promise((resolve, reject) => {
      const storeNames = options.skipSyncQueue ? ["categories"] : ["categories", "syncQueue"];
      const tx = db.transaction(storeNames, "readwrite");
      tx.objectStore("categories").put(nextCategory);
      if (!options.skipSyncQueue) tx.objectStore("syncQueue").put(makeSyncQueueItem("category", nextCategory.name, "update", nextCategory, null));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Category add transaction aborted."));
    });
    return nextCategory;
  }

  async function updateCategory(categoryId, patch, options = {}) {
    if (options.skipSyncQueue) return updateByKey("categories", categoryId, patch);
    const db = await dbInit();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["categories", "syncQueue"], "readwrite");
      const categoryStore = tx.objectStore("categories");
      const queueStore = tx.objectStore("syncQueue");
      const getRequest = categoryStore.get(categoryId);
      let next;
      getRequest.onsuccess = () => {
        try {
          const current = getRequest.result;
          if (!current) throw new Error("This item was deleted elsewhere.");
          next = prepareLocalCategory({ ...current, ...(typeof patch === "function" ? patch(current) : patch) }, current);
          categoryStore.put(next);
          queueStore.put(makeSyncQueueItem("category", categoryId, "update", next, current));
        } catch (error) {
          tx.abort();
          reject(error);
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
      tx.oncomplete = () => resolve(next);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Category update transaction aborted."));
    });
  }

  async function deleteCategory(categoryId, options = {}) {
    if (options.skipSyncQueue) {
      await remove("categories", categoryId);
      return;
    }
    const db = await dbInit();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(["categories", "syncQueue"], "readwrite");
      const categoryStore = tx.objectStore("categories");
      const queueStore = tx.objectStore("syncQueue");
      const getRequest = categoryStore.get(categoryId);
      getRequest.onsuccess = () => {
        const current = getRequest.result;
        categoryStore.delete(categoryId);
        queueStore.put(makeSyncQueueItem("category", categoryId, "delete", current, current));
      };
      getRequest.onerror = () => reject(getRequest.error);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Category delete transaction aborted."));
    });
  }

  async function deleteCategoryWithNotes(categoryId, options = {}) {
    if (options.skipSyncQueue) {
      const db = await dbInit();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(["categories", "notes"], "readwrite");
        const categoryStore = tx.objectStore("categories");
        const noteStore = tx.objectStore("notes");
        let deletedNotes = 0;
        categoryStore.delete(categoryId);
        const cursorRequest = noteStore.openCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) return;
          if (cursor.value?.category === categoryId) {
            cursor.delete();
            deletedNotes += 1;
          }
          cursor.continue();
        };
        cursorRequest.onerror = () => reject(cursorRequest.error);
        tx.oncomplete = () => resolve({ deletedNotes });
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("Category delete transaction aborted."));
      });
    }
    const db = await dbInit();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["categories", "notes", "syncQueue"], "readwrite");
      const categoryStore = tx.objectStore("categories");
      const noteStore = tx.objectStore("notes");
      const queueStore = tx.objectStore("syncQueue");
      let deletedNotes = 0;
      // Fetch the category first so its delete queue item carries the real
      // baseServerRevision - without this, the server always sees revision 0
      // where the actual row is at 1+, rejects the delete as a conflict, and
      // (with no conflict recovery for categories) it silently never applies,
      // leaving the category stuck forever on every other device.
      const getRequest = categoryStore.get(categoryId);
      getRequest.onsuccess = () => {
        categoryStore.delete(categoryId);
        queueStore.put(makeSyncQueueItem("category", categoryId, "delete", getRequest.result, getRequest.result));
      };
      getRequest.onerror = () => reject(getRequest.error);
      const cursorRequest = noteStore.openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        if (cursor.value?.category === categoryId) {
          queueStore.put(makeSyncQueueItem("note", cursor.value.id, "delete", cursor.value, cursor.value));
          cursor.delete();
          deletedNotes += 1;
        }
        cursor.continue();
      };
      cursorRequest.onerror = () => reject(cursorRequest.error);
      tx.oncomplete = () => resolve({ deletedNotes });
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Category delete transaction aborted."));
    });
  }

  async function renameCategory(categoryId, category, options = {}) {
    if (options.skipSyncQueue) {
      const db = await dbInit();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(["categories", "notes"], "readwrite");
        const categoryStore = tx.objectStore("categories");
        const noteStore = tx.objectStore("notes");
        let updatedNotes = 0;
        categoryStore.put(category);
        const cursorRequest = noteStore.openCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) {
            categoryStore.delete(categoryId);
            return;
          }
          if (cursor.value?.category === categoryId) {
            cursor.update({ ...cursor.value, category: category.name, updatedAt: Date.now() });
            updatedNotes += 1;
          }
          cursor.continue();
        };
        cursorRequest.onerror = () => reject(cursorRequest.error);
        tx.oncomplete = () => resolve({ category, updatedNotes });
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("Category rename transaction aborted."));
      });
    }
    const db = await dbInit();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["categories", "notes", "syncQueue"], "readwrite");
      const categoryStore = tx.objectStore("categories");
      const noteStore = tx.objectStore("notes");
      const queueStore = tx.objectStore("syncQueue");
      let updatedNotes = 0;
      const nextCategory = prepareLocalCategory(category, null);
      categoryStore.put(nextCategory);
      queueStore.put(makeSyncQueueItem("category", nextCategory.name, "update", nextCategory, null));
      // Same fix as deleteCategoryWithNotes: fetch the old category first so
      // its delete queue item carries the real baseServerRevision, not 0.
      const getRequest = categoryStore.get(categoryId);
      getRequest.onsuccess = () => {
        queueStore.put(makeSyncQueueItem("category", categoryId, "delete", getRequest.result, getRequest.result));
      };
      getRequest.onerror = () => reject(getRequest.error);
      const cursorRequest = noteStore.openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) {
          categoryStore.delete(categoryId);
          return;
        }
        if (cursor.value?.category === categoryId) {
          const nextNote = prepareLocalNote({ ...cursor.value, category: category.name, updatedAt: Date.now() }, cursor.value);
          cursor.update(nextNote);
          queueStore.put(makeSyncQueueItem("note", nextNote.id, "update", nextNote, cursor.value));
          updatedNotes += 1;
        }
        cursor.continue();
      };
      cursorRequest.onerror = () => reject(cursorRequest.error);
      tx.oncomplete = () => resolve({ category: nextCategory, updatedNotes });
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Category rename transaction aborted."));
    });
  }

  async function getNotes() {
    return getAll("notes");
  }

  async function saveNotes(notes) {
    await replaceAll("notes", notes);
  }

  async function addNote(note, options = {}) {
    const db = await dbInit();
    const nextNote = prepareLocalNote(note, null, options);
    await new Promise((resolve, reject) => {
      const storeNames = options.skipSyncQueue ? ["notes"] : ["notes", "syncQueue"];
      const tx = db.transaction(storeNames, "readwrite");
      tx.objectStore("notes").put(nextNote);
      if (!options.skipSyncQueue) tx.objectStore("syncQueue").put(makeSyncQueueItem("note", nextNote.id, "update", nextNote, null));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Note add transaction aborted."));
    });
    return nextNote;
  }

  async function updateNote(noteId, patch, options = {}) {
    if (options.skipSyncQueue) return updateByKey("notes", noteId, patch);
    const db = await dbInit();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["notes", "syncQueue"], "readwrite");
      const noteStore = tx.objectStore("notes");
      const queueStore = tx.objectStore("syncQueue");
      const getRequest = noteStore.get(noteId);
      let next;
      getRequest.onsuccess = () => {
        try {
          const current = getRequest.result;
          if (!current) throw new Error("This item was deleted elsewhere.");
          next = prepareLocalNote({ ...current, ...(typeof patch === "function" ? patch(current) : patch) }, current);
          noteStore.put(next);
          queueStore.put(makeSyncQueueItem("note", noteId, "update", next, current));
        } catch (error) {
          tx.abort();
          reject(error);
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
      tx.oncomplete = () => resolve(next);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Note update transaction aborted."));
    });
  }

  async function updateNoteIfUnchanged(noteId, patch, expectedUpdatedAt, options = {}) {
    return updateNote(noteId, (current) => {
      if (Number(current?.updatedAt || 0) !== Number(expectedUpdatedAt || 0)) {
        const error = new Error("This note was changed in another Snipaze view.");
        error.name = "SnipazeNoteConflictError";
        throw error;
      }
      return patch;
    }, options);
  }

  async function appendNoteHtml(noteId, html, updatedAt = Date.now(), options = {}) {
    return updateNote(noteId, (current) => ({
      contentHtml: `${current?.contentHtml || String(current?.content || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}${html || ""}`,
      updatedAt
    }), options);
  }

  async function deleteNote(noteId, options = {}) {
    if (options.skipSyncQueue) {
      await remove("notes", noteId);
      return;
    }
    const db = await dbInit();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(["notes", "syncQueue"], "readwrite");
      const noteStore = tx.objectStore("notes");
      const queueStore = tx.objectStore("syncQueue");
      const getRequest = noteStore.get(noteId);
      getRequest.onsuccess = () => {
        const current = getRequest.result;
        noteStore.delete(noteId);
        queueStore.put(makeSyncQueueItem("note", noteId, "delete", current, current));
      };
      getRequest.onerror = () => reject(getRequest.error);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Note delete transaction aborted."));
    });
  }

  async function getSyncQueue() {
    return getAll("syncQueue");
  }

  async function removeSyncQueueItem(operationId) {
    await remove("syncQueue", operationId);
  }

  async function getSetting(key, defaultValue) {
    return getKeyValue("settings", key, defaultValue);
  }

  async function setSetting(key, value) {
    return setKeyValue("settings", key, value);
  }

  async function getUiState(key, defaultValue) {
    return getKeyValue("uiState", key, defaultValue);
  }

  async function setUiState(key, value) {
    return setKeyValue("uiState", key, value);
  }

  globalThis.SnipThatDB = {
    DB_NAME,
    DB_VERSION,
    STORES,
    dbInit,
    getCategories,
    saveCategories,
    addCategory,
    updateCategory,
    renameCategory,
    deleteCategory,
    deleteCategoryWithNotes,
    getNotes,
    saveNotes,
    addNote,
    updateNote,
    updateNoteIfUnchanged,
    appendNoteHtml,
    deleteNote,
    getSetting,
    setSetting,
    getUiState,
    setUiState,
    getAll,
    replaceAll,
    put,
    remove,
    clear,
    getSyncQueue,
    removeSyncQueueItem
  };
})();
