"use strict";
(() => {
  const THEME_SETTING_KEY = "theme";
  const DEFAULT_THEME = "dark";
  const LIGHT_CLASS = "light-theme";

  function normalizeTheme(theme) {
    return theme === "light" ? "light" : "dark";
  }

  function applyTheme(root, theme) {
    root?.classList?.toggle(LIGHT_CLASS, normalizeTheme(theme) === "light");
  }

  globalThis.SnipazeThemeManager = {
    THEME_SETTING_KEY,
    DEFAULT_THEME,
    LIGHT_CLASS,
    normalizeTheme,
    applyTheme,
  };
})();
