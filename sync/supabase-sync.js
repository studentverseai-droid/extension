
"use strict";
(() => {
  const SYNC_PULL_URL = "https://mphdhzsxjwhvkdbxyrfv.supabase.co/functions/v1/sync-pull";
  const SYNC_PUSH_URL = "https://mphdhzsxjwhvkdbxyrfv.supabase.co/functions/v1/sync-push";
  const SYNC_STATE_KEY = "supabaseSyncState";
  const SYNC_STATE_VERSION = 4;
  const PUSH_BATCH_LIMIT = 50;

  function toNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function getRemoteSequence(record) {
    return toNumber(record?.sync_sequence ?? record?.server_updated_at ?? record?.deleted_at ?? record?.updated_at ?? record?.created_at, 0);
  }

  function normalizeNoteState(value, needsSequenceRefresh) {
    if (typeof value === "number") {
      return { clientUpdatedAt: value, serverRevision: 0, syncSequence: 0, serverUpdatedAt: 0 };
    }
    return {
      clientUpdatedAt: toNumber(value?.clientUpdatedAt, 0),
      serverRevision: toNumber(value?.serverRevision, 0),
      syncSequence: needsSequenceRefresh ? 0 : toNumber(value?.syncSequence ?? value?.serverUpdatedAt, 0),
      serverUpdatedAt: toNumber(value?.serverUpdatedAt, 0),
    };
  }

  function normalizeCategoryState(value, needsSequenceRefresh) {
    if (typeof value === "number") {
      return { clientCreatedAt: value, serverRevision: 0, syncSequence: 0, serverUpdatedAt: 0 };
    }
    return {
      clientCreatedAt: toNumber(value?.clientCreatedAt ?? value?.createdAt, 0),
      serverRevision: toNumber(value?.serverRevision, 0),
      syncSequence: needsSequenceRefresh ? 0 : toNumber(value?.syncSequence ?? value?.serverUpdatedAt, 0),
      serverUpdatedAt: toNumber(value?.serverUpdatedAt, 0),
    };
  }

  async function getSyncState() {
    const state = await SnipThatDB.getSetting(SYNC_STATE_KEY, { lastPulledSequence: 0, notes: {}, categories: {} });
    if (!state || typeof state !== "object") return { version: SYNC_STATE_VERSION, lastPulledSequence: 0, notes: {}, categories: {} };
    const needsSequenceRefresh = state.version !== SYNC_STATE_VERSION;
    const notes = {};
    for (const [id, value] of Object.entries(state.notes || {})) notes[id] = normalizeNoteState(value, needsSequenceRefresh);
    const categories = {};
    for (const [name, value] of Object.entries(state.categories || {})) categories[name] = normalizeCategoryState(value, needsSequenceRefresh);
    return {
      ...state,
      version: SYNC_STATE_VERSION,
      lastPulledSequence: needsSequenceRefresh ? 0 : toNumber(state.lastPulledSequence ?? state.lastServerSyncAt ?? state.lastPullAt, 0),
      lastServerSyncAt: undefined,
      notes,
      categories,
    };
  }

  async function setSyncState(state) {
    return SnipThatDB.setSetting(SYNC_STATE_KEY, state);
  }

  async function getSyncQueue() {
    if (typeof SnipThatDB.getSyncQueue === "function") return SnipThatDB.getSyncQueue();
    if (typeof SnipThatDB.getAll === "function") return SnipThatDB.getAll("syncQueue").catch(() => []);
    return [];
  }

  async function removeQueueItem(operationId) {
    if (!operationId) return;
    if (typeof SnipThatDB.removeSyncQueueItem === "function") return SnipThatDB.removeSyncQueueItem(operationId);
    return SnipThatDB.remove("syncQueue", operationId).catch(() => null);
  }

  function noteFromServer(note) {
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      contentHtml: note.content_html,
      imageDataUrl: note.image_data_url,
      category: note.category,
      metadata: note.metadata,
      type: note.type,
      pinned: note.pinned,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      localRevision: toNumber(note.revision, 0),
      serverRevision: toNumber(note.revision, 0),
      syncSequence: getRemoteSequence(note),
      serverUpdatedAt: toNumber(note.server_updated_at, 0),
      syncStatus: "synced",
      deleted: false,
      deletedAt: null,
    };
  }

  function categoryFromServer(category) {
    return {
      name: category.name,
      color: category.color,
      createdAt: category.created_at,
      localRevision: toNumber(category.revision, 0),
      serverRevision: toNumber(category.revision, 0),
      syncSequence: getRemoteSequence(category),
      serverUpdatedAt: toNumber(category.server_updated_at, 0),
      syncStatus: "synced",
      deleted: false,
      deletedAt: null,
    };
  }

  async function pull(token, syncState) {
    const response = await fetch(SYNC_PULL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: token, sinceSequence: syncState.lastPulledSequence }),
    });
    if (!response.ok) {
      console.error("Snipaze Supabase pull failed", response.status, await response.text().catch(() => ""));
      return;
    }
    const { notes, categories } = await response.json();
    const queue = await getSyncQueue();
    const queuedKeys = new Set((queue || []).map((item) => `${item.entityType}:${item.entityId}`));

    const localNotesBeforeCategoryPull = await SnipThatDB.getNotes();
    const localCategories = await SnipThatDB.getCategories();
    for (const category of categories ?? []) {
      const local = localCategories.find((item) => item.name === category.name);
      const remoteSequence = getRemoteSequence(category);
      const hasQueuedLocalEdit = queuedKeys.has(`category:${category.name}`) || (local && local.syncStatus === "pending");
      const deletedAt = toNumber(category.deleted_at, 0);
      const hasProtectedNoteInCategory = localNotesBeforeCategoryPull.some((note) => note.category === category.name && (queuedKeys.has(`note:${note.id}`) || note.syncStatus === "pending" || toNumber(note.updatedAt, 0) >= deletedAt));
      if (category.deleted_at) {
        if (local && !hasQueuedLocalEdit && !hasProtectedNoteInCategory) await SnipThatDB.deleteCategoryWithNotes(category.name, { skipSyncQueue: true });
      } else if (!local || !hasQueuedLocalEdit) {
        await SnipThatDB.addCategory(categoryFromServer(category), { skipSyncQueue: true });
      }
      syncState.categories[category.name] = {
        clientCreatedAt: toNumber(category.created_at, 0),
        serverRevision: toNumber(category.revision, 0),
        syncSequence: remoteSequence,
        serverUpdatedAt: toNumber(category.server_updated_at, 0),
      };
      syncState.lastPulledSequence = Math.max(syncState.lastPulledSequence, remoteSequence);
    }

    const localNotes = await SnipThatDB.getNotes();
    for (const note of notes ?? []) {
      const local = localNotes.find((item) => item.id === note.id);
      const remoteSequence = getRemoteSequence(note);
      const hasQueuedLocalEdit = queuedKeys.has(`note:${note.id}`) || (local && local.syncStatus === "pending");
      if (note.deleted_at) {
        if (local && !hasQueuedLocalEdit) await SnipThatDB.deleteNote(note.id, { skipSyncQueue: true });
      } else if (!local || !hasQueuedLocalEdit) {
        await SnipThatDB.addNote(noteFromServer(note), { skipSyncQueue: true });
      }
      syncState.notes[note.id] = {
        clientUpdatedAt: toNumber(note.updated_at, 0),
        serverRevision: toNumber(note.revision, 0),
        syncSequence: remoteSequence,
        serverUpdatedAt: toNumber(note.server_updated_at, 0),
      };
      syncState.lastPulledSequence = Math.max(syncState.lastPulledSequence, remoteSequence);
    }
  }

  function queuedUpdateItems(queue, entityType) {
    return (queue || [])
      .filter((item) => item.entityType === entityType && item.operation !== "delete")
      .sort((a, b) => toNumber(a.createdAt, 0) - toNumber(b.createdAt, 0))
      .slice(0, PUSH_BATCH_LIMIT);
  }

  function queuedDeleteItems(queue, entityType) {
    return (queue || [])
      .filter((item) => item.entityType === entityType && item.operation === "delete")
      .sort((a, b) => toNumber(a.createdAt, 0) - toNumber(b.createdAt, 0))
      .slice(0, PUSH_BATCH_LIMIT);
  }

  async function push(token, syncState) {
    const localNotes = await SnipThatDB.getNotes();
    const localNotesBeforeCategoryPull = await SnipThatDB.getNotes();
    const localCategories = await SnipThatDB.getCategories();
    const queue = await getSyncQueue();
    const noteUpdates = queuedUpdateItems(queue, "note");
    const categoryUpdates = queuedUpdateItems(queue, "category");
    const noteDeletes = queuedDeleteItems(queue, "note");
    const categoryDeletes = queuedDeleteItems(queue, "category");

    const notesToPush = noteUpdates.length
      ? noteUpdates.map((item) => localNotes.find((note) => note.id === item.entityId)).filter(Boolean)
      : localNotes.filter((note) => !syncState.notes[note.id] || note.updatedAt > toNumber(syncState.notes[note.id]?.clientUpdatedAt, 0));
    const categoriesToPush = categoryUpdates.length
      ? categoryUpdates.map((item) => localCategories.find((category) => category.name === item.entityId)).filter(Boolean)
      : localCategories.filter((category) => !syncState.categories[category.name] || category.createdAt > toNumber(syncState.categories[category.name]?.clientCreatedAt, 0));

    const deletedNoteIds = noteDeletes.length
      ? noteDeletes.map((item) => ({ id: item.entityId, baseServerRevision: toNumber(item.baseServerRevision, 0), operationId: item.operationId }))
      : Object.keys(syncState.notes).filter((id) => !localNotes.some((note) => note.id === id)).map((id) => ({ id, baseServerRevision: toNumber(syncState.notes[id]?.serverRevision, 0) }));
    const deletedCategoryNames = categoryDeletes.length
      ? categoryDeletes.map((item) => ({ name: item.entityId, baseServerRevision: toNumber(item.baseServerRevision, 0), operationId: item.operationId }))
      : Object.keys(syncState.categories).filter((name) => !localCategories.some((category) => category.name === name)).map((name) => ({ name, baseServerRevision: toNumber(syncState.categories[name]?.serverRevision, 0) }));

    if (!notesToPush.length && !categoriesToPush.length && !deletedNoteIds.length && !deletedCategoryNames.length) return;

    const queueByKey = new Map((queue || []).map((item) => [`${item.entityType}:${item.entityId}`, item]));
    const notesPayload = notesToPush.map((note) => {
      const queueItem = queueByKey.get(`note:${note.id}`);
      const state = syncState.notes[note.id] || {};
      return {
        ...note,
        localRevision: toNumber(note.localRevision || note.updatedAt, note.updatedAt),
        baseServerRevision: toNumber(queueItem?.baseServerRevision ?? note.serverRevision ?? state.serverRevision, 0),
        operationId: queueItem?.operationId,
      };
    });
    const categoriesPayload = categoriesToPush.map((category) => {
      const queueItem = queueByKey.get(`category:${category.name}`);
      const state = syncState.categories[category.name] || {};
      return {
        ...category,
        localRevision: toNumber(category.localRevision || category.createdAt, category.createdAt),
        baseServerRevision: toNumber(queueItem?.baseServerRevision ?? category.serverRevision ?? state.serverRevision, 0),
        operationId: queueItem?.operationId,
      };
    });

    const response = await fetch(SYNC_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: token, notes: notesPayload, categories: categoriesPayload, deletedNoteIds, deletedCategoryNames }),
    });
    if (!response.ok) {
      console.error("Snipaze Supabase push failed", response.status, await response.text().catch(() => ""));
      return;
    }

    const { appliedNotes = {}, appliedCategories = {} } = await response.json().catch(() => ({}));
    for (const note of notesToPush) {
      const applied = appliedNotes[note.id];
      const queueItem = queueByKey.get(`note:${note.id}`);
      if (applied?.status === "accepted" || applied?.clientUpdatedAt != null) {
        const serverRevision = toNumber(applied.serverRevision ?? applied.revision, toNumber(note.serverRevision, 0));
        const syncSequence = toNumber(applied.syncSequence ?? applied.serverUpdatedAt, 0);
        const localNotesNow = await SnipThatDB.getNotes();
        const current = localNotesNow.find((item) => item.id === note.id);
        if (current) {
          const currentLocalRevision = toNumber(current.localRevision || current.updatedAt, 0);
          const pushedLocalRevision = toNumber(queueItem?.localRevision || note.localRevision || note.updatedAt, 0);
          const synced = currentLocalRevision <= pushedLocalRevision;
          await SnipThatDB.updateNote(note.id, {
            serverRevision,
            syncSequence,
            serverUpdatedAt: toNumber(applied.serverUpdatedAt, 0),
            syncStatus: synced ? "synced" : "pending",
          }, { skipSyncQueue: true });
          if (synced && queueItem?.operationId) await removeQueueItem(queueItem.operationId);
        }
        syncState.notes[note.id] = {
          clientUpdatedAt: toNumber(applied.clientUpdatedAt ?? note.updatedAt, 0),
          serverRevision,
          syncSequence,
          serverUpdatedAt: toNumber(applied.serverUpdatedAt, 0),
        };
        syncState.lastPulledSequence = Math.max(syncState.lastPulledSequence, syncSequence);
      } else if (applied?.status === "conflict") {
        if (applied.serverRecord && !applied.serverRecord.deleted_at) {
          const serverNote = noteFromServer(applied.serverRecord);
          await SnipThatDB.addNote(serverNote, { skipSyncQueue: true });
          syncState.notes[note.id] = {
            clientUpdatedAt: toNumber(applied.serverRecord.updated_at, 0),
            serverRevision: toNumber(applied.serverRevision ?? applied.serverRecord.revision, 0),
            syncSequence: toNumber(applied.syncSequence ?? applied.serverRecord.sync_sequence, 0),
            serverUpdatedAt: toNumber(applied.serverUpdatedAt ?? applied.serverRecord.server_updated_at, 0),
          };
          syncState.lastPulledSequence = Math.max(syncState.lastPulledSequence, syncState.notes[note.id].syncSequence);
          if (queueItem?.operationId) await removeQueueItem(queueItem.operationId);
        } else {
          const syncSequence = toNumber(applied.syncSequence, toNumber(note.syncSequence, 0));
          const isFreshLocalCreate = toNumber(queueItem?.baseServerRevision ?? note.serverRevision, 0) === 0;
          if (isFreshLocalCreate) {
            await SnipThatDB.updateNote(note.id, {
              syncSequence: Math.max(toNumber(note.syncSequence, 0), syncSequence),
              serverUpdatedAt: toNumber(applied.serverUpdatedAt, toNumber(note.serverUpdatedAt, 0)),
              syncStatus: "pending",
            }, { skipSyncQueue: true }).catch(() => null);
            syncState.lastPulledSequence = Math.max(syncState.lastPulledSequence, syncSequence);
          } else {
            await SnipThatDB.deleteNote(note.id, { skipSyncQueue: true }).catch(() => null);
            delete syncState.notes[note.id];
            syncState.lastPulledSequence = Math.max(syncState.lastPulledSequence, syncSequence);
            if (queueItem?.operationId) await removeQueueItem(queueItem.operationId);
          }
        }
      }
    }

    for (const category of categoriesToPush) {
      const applied = appliedCategories[category.name];
      const queueItem = queueByKey.get(`category:${category.name}`);
      if (applied?.status === "accepted" || applied?.clientCreatedAt != null) {
        const serverRevision = toNumber(applied.serverRevision ?? applied.revision, toNumber(category.serverRevision, 0));
        const syncSequence = toNumber(applied.syncSequence ?? applied.serverUpdatedAt, 0);
        await SnipThatDB.updateCategory(category.name, {
          serverRevision,
          syncSequence,
          serverUpdatedAt: toNumber(applied.serverUpdatedAt, 0),
          syncStatus: "synced",
        }, { skipSyncQueue: true }).catch(() => null);
        if (queueItem?.operationId) await removeQueueItem(queueItem.operationId);
        syncState.categories[category.name] = {
          clientCreatedAt: toNumber(applied.clientCreatedAt ?? category.createdAt, 0),
          serverRevision,
          syncSequence,
          serverUpdatedAt: toNumber(applied.serverUpdatedAt, 0),
        };
        syncState.lastPulledSequence = Math.max(syncState.lastPulledSequence, syncSequence);
      }
    }

    for (const item of deletedNoteIds) {
      const applied = appliedNotes[item.id];
      if (applied?.status === "accepted") {
        delete syncState.notes[item.id];
        if (item.operationId) await removeQueueItem(item.operationId);
        syncState.lastPulledSequence = Math.max(syncState.lastPulledSequence, toNumber(applied.syncSequence, 0));
      }
    }
    for (const item of deletedCategoryNames) {
      const applied = appliedCategories[item.name];
      if (applied?.status === "accepted") {
        delete syncState.categories[item.name];
        if (item.operationId) await removeQueueItem(item.operationId);
        syncState.lastPulledSequence = Math.max(syncState.lastPulledSequence, toNumber(applied.syncSequence, 0));
      }
    }
  }

  let syncInProgress = false;

  async function runSyncPass(token) {
    if (!token || syncInProgress) return;
    syncInProgress = true;
    try {
      const syncState = await getSyncState();
      await push(token, syncState);
      await pull(token, syncState);
      await setSyncState(syncState);
    } catch (error) {
      console.debug("Snipaze Supabase sync pass failed", error);
    } finally {
      syncInProgress = false;
    }
  }

  globalThis.SnipazeSupabaseSync = { runSyncPass };
})();



