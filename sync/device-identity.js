"use strict";
(() => {
  const DEVICE_NAME_KEY = "syncDeviceName";
  const DEVICE_ID_KEY = "syncDeviceId";

  function detectDefaultDeviceName() {
    const ua = navigator.userAgent || "";
    let os = "Unknown OS";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "Mac";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    else if (ua.includes("Linux")) os = "Linux";
    return `Snipaze on ${os}`;
  }

  async function getDeviceName() {
    const existing = await SnipThatDB.getSetting(DEVICE_NAME_KEY, "");
    if (existing) return existing;
    const defaultName = detectDefaultDeviceName();
    await SnipThatDB.setSetting(DEVICE_NAME_KEY, defaultName);
    return defaultName;
  }

  async function setDeviceName(name) {
    const trimmed = String(name || "").trim();
    if (!trimmed) return false;
    await SnipThatDB.setSetting(DEVICE_NAME_KEY, trimmed);
    return true;
  }

  // Stable, invisible identifier for telling devices apart internally (sync
  // conflict detection, activity log entries) - never shown to the user and
  // never changes, unlike the editable device name which two devices could
  // easily share.
  async function getDeviceId() {
    const existing = await SnipThatDB.getSetting(DEVICE_ID_KEY, "");
    if (existing) return existing;
    const newId = crypto.randomUUID();
    await SnipThatDB.setSetting(DEVICE_ID_KEY, newId);
    return newId;
  }

  globalThis.SnipazeDeviceIdentity = {
    DEVICE_NAME_KEY,
    DEVICE_ID_KEY,
    getDeviceName,
    setDeviceName,
    getDeviceId,
    detectDefaultDeviceName,
  };
})();
