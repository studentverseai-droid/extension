"use strict";

globalThis.SnipazeFloatingStyles = function floatingStyles() {
  return (
    (globalThis.SnipazeSidebarThemeStyles || "") +
    (globalThis.SnipazeProSidebarStyles || "")
  );
};
