"use strict";

globalThis.SnipazeSidebarThemeStyles = String.raw`
      :host {
        all: initial;
      }

      *, *::before, *::after {
        box-sizing: border-box;
        letter-spacing: 0;
      }

      .persistence-status {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 2147483646;
        max-width: min(360px, calc(100vw - 36px));
        border: 1px solid rgba(248, 113, 113, 0.5);
        border-radius: 10px;
        background: rgba(69, 10, 10, 0.96);
        box-shadow: 0 16px 36px rgba(15, 23, 42, 0.34);
        color: #fee2e2;
        opacity: 0;
        padding: 10px 12px;
        pointer-events: none;
        transform: translateY(8px);
        transition: opacity 160ms ease, transform 160ms ease;
        font: 800 12px/1.4 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .persistence-status.visible {
        opacity: 1;
        transform: translateY(0);
      }

      .launcher:hover,
      .launcher.active {
        transform: translateY(-1px) scale(1.03);
        box-shadow: 0 22px 58px rgba(15, 23, 42, 0.38);
      }

      .launcher:active {
        cursor: grabbing;
        transform: scale(0.98);
      }

      .sidebar.open {
        opacity: 1;
        pointer-events: auto;
        transform: translateX(0) scale(1);
      }

      .floating-menu-layer {
        position: absolute;
        inset: 0;
        z-index: 214748380;
        overflow: visible;
        pointer-events: none;
      }

      .floating-menu-layer .mini-menu-popover,
      .floating-menu-layer .note-menu-popover,
      .floating-menu-layer .note-export-popover,
      .floating-menu-layer .category-export-popover {
        pointer-events: auto;
      }

      .header::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(90deg, rgba(255, 255, 255, 0.14), transparent 36%, rgba(255, 255, 255, 0.1)),
          rgba(255, 255, 255, 0.04);
      }

      .brand-row,
      .tool-row {
        position: relative;
        z-index: 1;
      }

      .save-link-action {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: 24px auto minmax(0, 1fr);
        align-items: center;
        gap: 7px;
        width: 100%;
        min-height: 34px;
        margin-top: 8px;
        border: 1px solid rgba(255, 255, 255, 0.24);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        cursor: pointer;
        padding: 6px 10px;
        text-align: left;
      }

      .save-link-action:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .save-link-action strong {
        font: 850 11px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        white-space: nowrap;
      }

      .sidebar .save-link-action small {
        overflow: hidden;
        color: rgba(226, 232, 240, 0.76);
        text-overflow: ellipsis;
        white-space: nowrap;
        font: 700 10.5px/1.2 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .tool:hover {
        border-color: rgba(255, 255, 255, 0.42);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.14)),
          rgba(255, 255, 255, 0.18);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.26),
          0 12px 28px rgba(15, 23, 42, 0.22),
          0 0 24px rgba(125, 211, 252, 0.18);
        transform: translateY(-1px) scale(1.01);
      }

      .tool:active {
        transform: translateY(0) scale(0.98);
      }

      .tool.close:hover {
        border-color: rgba(255, 255, 255, 0.5);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.3),
          0 12px 28px rgba(15, 23, 42, 0.22),
          0 0 30px rgba(255, 255, 255, 0.22);
      }

      .settings-title h2,
      .settings-group h3 {
        margin: 0;
        color: #f8fafc;
        font: 900 15px/1.2 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .settings-group {
        display: grid;
        gap: 8px;
        border: 1px solid rgba(129, 140, 248, 0.18);
        border-radius: 10px;
        background: rgba(15, 23, 42, 0.2);
        padding: 10px;
      }

      .settings-top-grid {
        display: grid;
        grid-template-columns: 1fr;
        align-items: stretch;
        gap: 12px;
      }

      /* Removed breakpoint block 2026-07-08 to keep side-panel resizing stable. */

      .settings-group h3 {
        margin: 0;
        color: #f8fafc;
        font: 900 15px/1.2 Inter, ui-sans-serif, system-ui, sans-serif;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }

      .setting-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 42px;
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 9px;
        background: rgba(15, 23, 42, 0.24);
        color: #e0e7ff;
        padding: 0 12px;
        font: 800 12px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      button.setting-row {
        cursor: pointer;
        text-align: left;
      }

      .setting-row input {
        width: 38px;
        height: 20px;
        accent-color: #8b5cf6;
      }

      .setting-row-disabled {
        align-items: flex-start;
        flex-direction: column;
        justify-content: center;
        min-height: 50px;
        color: #94a3b8;
      }

      button.setting-row-disabled {
        cursor: not-allowed;
        opacity: 0.72;
      }

      .setting-export-row {
        align-items: center;
        min-height: 48px;
        overflow: visible;
        position: relative;
      }

      .settings-export-menu {
        position: relative;
      }

      .settings-export-menu summary {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        border: 1px solid rgba(129, 140, 248, 0.28);
        border-radius: 8px;
        background: rgba(30, 41, 72, 0.5);
        color: #bfdbfe;
        cursor: pointer;
        font: 900 18px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        list-style: none;
      }

      .settings-export-actions {
        position: absolute;
        top: calc(100% + 6px);
        right: 0;
        z-index: 4;
        display: flex;
        min-width: 112px;
        flex-direction: column;
        gap: 6px;
        border: 1px solid rgba(129, 140, 248, 0.28);
        border-radius: 9px;
        background: rgba(15, 23, 42, 0.96);
        box-shadow: 0 16px 34px rgba(2, 6, 23, 0.34);
        padding: 6px;
      }

      .settings-export-actions button {
        min-height: 28px;
        border: 1px solid rgba(129, 140, 248, 0.28);
        border-radius: 8px;
        background: rgba(30, 41, 72, 0.5);
        color: #bfdbfe;
        cursor: pointer;
        padding: 0 9px;
        text-align: left;
        font: 900 11px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .settings-export-menu summary:hover,
      .settings-export-menu[open] summary,
      .settings-export-actions button:hover {
        border-color: rgba(129, 140, 248, 0.46);
        background: rgba(99, 102, 241, 0.2);
      }

      .setting-row-disabled small {
        color: #94a3b8;
        font: 700 11px/1.35 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .storage-usage {
        display: grid;
        gap: 7px;
      }

      .storage-usage div {
        display: flex;
        justify-content: space-between;
        align-items: center;
        min-height: 28px;
        color: #cbd5e1;
        font: 800 12px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .storage-usage strong {
        color: #60a5fa;
        font-size: 13px;
      }

      .support-hub {
        gap: 12px;
      }

      .support-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 8px;
      }

      .support-tile {
        display: grid;
        grid-template-columns: 34px minmax(0, 1fr);
        align-items: center;
        gap: 9px;
        min-height: 64px;
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 9px;
        background: rgba(15, 23, 42, 0.24);
        color: #e0e7ff;
        cursor: pointer;
        padding: 9px;
        text-align: left;
        font: 900 12px/1.25 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .support-tile-icon {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border-radius: 8px;
        background: rgba(99, 102, 241, 0.2);
        color: #bfdbfe;
        font-size: 15px;
      }

      button.setting-row-disabled:hover {
        border-color: rgba(148, 163, 184, 0.16);
        background: rgba(15, 23, 42, 0.24);
      }

      .support-footer {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        border-top: 1px solid rgba(148, 163, 184, 0.16);
        padding-top: 12px;
      }

      .support-brand {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 10px;
        color: #cbd5e1;
        font: 800 12px/1.3 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .support-brand-mark {
        width: 42px;
        height: 42px;
        border-radius: 10px;
        object-fit: cover;
      }

      .support-brand-copy {
        min-width: 0;
        display: grid;
        gap: 3px;
      }

      .support-brand-copy strong {
        color: #f8fafc;
        font-size: 15px;
      }

      .support-brand-copy small {
        color: #60a5fa;
        font: 800 10px/1.2 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .support-footer-actions {
        display: grid;
        grid-template-columns: minmax(112px, 1fr);
        justify-self: end;
        width: min(100%, 140px);
        gap: 8px;
      }

      .support-footer-actions button {
        min-height: 32px;
        border: 1px solid rgba(129, 140, 248, 0.18);
        border-radius: 8px;
        background: rgba(30, 41, 72, 0.5);
        color: #bfdbfe;
        cursor: pointer;
        font: 900 12px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      button.setting-row:hover,
      .support-tile:hover,
      .support-footer-actions button:hover {
        border-color: rgba(129, 140, 248, 0.38);
        background: rgba(99, 102, 241, 0.2);
      }



      .settings-danger {
        min-height: 38px;
        border: 1px solid rgba(248, 113, 113, 0.28);
        border-radius: 9px;
        background: rgba(127, 29, 29, 0.24);
        color: #fecaca;
        cursor: pointer;
        font: 900 12px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .settings-danger:hover {
        background: rgba(127, 29, 29, 0.38);
        border-color: rgba(248, 113, 113, 0.46);
      }

      .sidebar.light-theme button.setting-row-disabled:hover {
        background: rgba(255, 255, 255, 0.72);
      }

      .sidebar.light-theme .support-tile,
      .sidebar.light-theme .support-footer-actions button,
      .sidebar.light-theme .settings-export-menu summary,
      .sidebar.light-theme .settings-export-actions button {
        background: rgba(255, 255, 255, 0.72);
        color: #1e293b;
      }

      .sidebar.light-theme .settings-export-actions {
        background: rgba(248, 250, 252, 0.98);
        box-shadow: 0 16px 34px rgba(15, 23, 42, 0.16);
      }

      .sidebar.light-theme .settings-title h2,
      .sidebar.light-theme .settings-group h3,
      .sidebar.light-theme .support-brand-copy strong {
        color: #0f172a;
      }

      .sidebar.light-theme .storage-usage div,
      .sidebar.light-theme .support-brand {
        color: #334155;
      }

      .search-wrap {
        position: relative;
        min-width: 0;
      }

      .search-icon::after {
        content: "";
        position: absolute;
        right: -6px;
        bottom: -5px;
        width: 7px;
        height: 2px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.86);
        transform: rotate(45deg);
      }

      .search-input,
      .filter-select {
        width: 100%;
        min-width: 0;
        height: 42px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 8px;
        background: rgba(30, 41, 72, 0.86);
        color: #f8fafc;
        outline: 0;
        font: 500 14px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        transition: border-color 150ms ease, box-shadow 150ms ease, background 150ms ease;
      }

      .search-input::placeholder {
        color: rgba(148, 163, 184, 0.76);
      }

      .search-input:focus,
      .filter-select:focus {
        border-color: rgba(129, 140, 248, 0.82);
        background: rgba(32, 45, 82, 0.95);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
      }

      .category-toggle,
      .category-add {
        border: 0;
        color: #dbeafe;
        cursor: pointer;
        transition: transform 150ms ease, background 150ms ease, box-shadow 150ms ease;
      }

      .category-toggle:hover {
        background: rgba(129, 140, 248, 0.12);
      }

      .category-caret,
      .category-count {
        color: #8ea2ff;
      }

      .category-add:hover {
        background: rgba(99, 102, 241, 0.42);
        box-shadow: 0 0 22px rgba(129, 140, 248, 0.24);
        transform: translateY(-1px);
      }

      .category-create {
        overflow: hidden;
        animation: snipSlideDown 170ms ease both;
      }

      .category-input {
        width: 100%;
        height: 34px;
        border: 1px solid rgba(129, 140, 248, 0.3);
        border-radius: 9px;
        background: rgba(30, 41, 72, 0.92);
        color: #f8fafc;
        outline: 0;
        padding: 0 10px;
        font: 700 13px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .category-list {
        display: grid;
        gap: 10px;
        overflow: hidden;
        max-height: 0;
        opacity: 0;
        transform: translateY(-3px);
        transition: max-height 220ms ease, opacity 180ms ease, transform 180ms ease;
        will-change: max-height, opacity, transform;
      }

      .category-list:has(.category-export[open]),
      .category-list:has(.mini-menu[open]),
      .category-list:has(.note-export-menu[open]),
      .category-group:has(.category-export[open]),
      .category-group:has(.mini-menu[open]),
      .category-group:has(.note-export-menu[open]) {
        overflow: visible;
      }

      .category-group:has(.category-export[open]) {
        overflow: visible;
        z-index: 214748350;
      }

      .category-group:not(.is-animating):hover,
      .category-group.open {
        border-color: rgba(129, 140, 248, 0.3);
        background: rgba(30, 41, 72, 0.38);
      }

      .category-row:hover {
        background: rgba(99, 102, 241, 0.08);
      }

      .category-note-add,
      .category-actions {
        cursor: default;
      }

      .category-disclosure,
      .category-note-add {
        display: grid;
        place-items: center;
        border: 0;
        cursor: pointer;
        color: #dbeafe;
        background: rgba(99, 102, 241, 0.18);
        transition: background 150ms ease, box-shadow 150ms ease;
      }

      .category-disclosure:hover,
      .category-note-add:hover {
        background: rgba(99, 102, 241, 0.34);
        box-shadow: 0 0 18px rgba(129, 140, 248, 0.16);
      }

      .category-mini-caret {
        display: inline-block;
        color: #8ea2ff;
        font-size: 10px;
        transition: transform 180ms ease;
      }

      .category-toggle[aria-expanded="true"] .category-caret,
      .category-group.open .category-mini-caret {
        transform: rotate(90deg);
      }

      .category-select:hover,
      .category-select.active {
        background: rgba(96, 111, 207, 0.2);
        border-color: rgba(129, 140, 248, 0.42);
        box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.08), 0 8px 18px rgba(15, 23, 42, 0.14);
      }

      .category-export {
        position: relative;
        z-index: 214748320;
      }

      .category-export summary:hover,
      .note-export-menu summary:hover {
        background: rgba(99, 102, 241, 0.32);
        color: #ffffff;
      }

      .category-export-popover {
        position: absolute;
        right: -4px;
        top: calc(100% + 5px);
        z-index: 214748360;
        display: grid;
        gap: 5px;
        width: 122px;
        border: 1px solid rgba(191, 219, 254, 0.18);
        border-radius: 10px;
        background: rgba(15, 23, 42, 0.88);
        padding: 7px;
        box-shadow: 0 16px 34px rgba(2, 6, 23, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(14px);
        transform-origin: top right;
        animation: noteMenuIn 150ms ease both;
      }

      .category-export-popover button {
        min-height: 26px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: #e0e7ff;
        cursor: pointer;
        padding: 6px 7px;
        text-align: left;
        font: 800 11px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .category-note-input {
        width: 100%;
        height: 31px;
        border: 1px solid rgba(129, 140, 248, 0.28);
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.42);
        color: #f8fafc;
        outline: 0;
        padding: 0 9px;
        font: 700 12px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .title-entry { position: relative; display: block; min-width: 0; width: 100%; }
      .title-entry-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
      .title-entry-row input { flex: 1 1 auto; min-width: 0; }
      .title-entry-cancel { flex: 0 0 auto; min-height: 28px; padding: 0 8px; border: 1px solid rgba(248, 113, 113, .38); border-radius: 7px; background: rgba(127, 29, 29, .2); color: #fecaca; cursor: pointer; font: 700 10px/1 Inter, ui-sans-serif, system-ui, sans-serif; }
      .title-suggestions { position: absolute; z-index: 214748360; left: 0; right: 0; top: calc(100% + 4px); max-height: 180px; overflow: auto; padding: 5px; border: 1px solid rgba(96, 122, 188, .7); border-radius: 9px; background: #111b38; box-shadow: 0 12px 30px rgba(0,0,0,.4); }
      .category-note-create .title-suggestions { position: relative; top: auto; margin-top: 4px; }
      .title-suggestions button { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 8px; padding: 8px; border: 0; border-radius: 6px; background: transparent; color: #f8fafc; cursor: pointer; text-align: left; }
      .title-suggestions button:hover { background: rgba(59, 130, 246, .18); }
      .title-suggestions button small { flex: 0 0 auto; color: #93c5fd; font-size: 9px; }
      .rename-title-entry {
        overflow: visible;
        display: grid;
        width: 100%;
      }
      .rename-title-entry .title-entry-row {
        width: 100%;
      }
      .rename-title-entry .title-suggestions {
        position: relative;
        left: auto;
        right: auto;
        top: auto;
        width: 100%;
        margin-top: 4px;
        max-height: 140px;
      }

      .category-group.open .category-note-list {
        max-height: var(--category-notes-height, 0px);
        opacity: 1;
        transform: translateY(0);
      }

      .category-group.open .category-note-list:not(.is-animating) {
        max-height: none;
        overflow: visible;
      }

      .category-list.collapsed,
      .category-list.is-animating,
      .category-group.is-animating,
      .category-note-list.is-animating {
        pointer-events: none;
      }

      .category-mini-note {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 8px;
        position: relative;
        z-index: 1;
        overflow: visible;
        min-height: 34px;
        border: 1px solid rgba(148, 163, 184, 0.1);
        border-radius: 8px;
        background: rgba(2, 6, 23, 0.18);
        padding: 5px 7px;
        animation: snipSlideDown 150ms ease both;
        transition: background 140ms ease, border-color 140ms ease, opacity 140ms ease;
      }

      .category-mini-note:hover {
        background: rgba(30, 41, 72, 0.5);
        border-color: rgba(129, 140, 248, 0.24);
      }

      .mini-note-main {
        display: grid;
        gap: 3px;
        min-width: 0;
      }

      .mini-title {
        display: block;
        min-width: 0;
        width: 100%;
        border: 0;
        background: transparent;
        overflow: hidden;
        color: #e0e7ff;
        cursor: pointer;
        outline: 0;
        padding: 0;
        text-align: left;
        text-overflow: ellipsis;
        white-space: nowrap;
        font: 800 12px/1.25 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .mini-title-input,
      .note-title-input {
        width: 100%;
        min-width: 0;
        border: 1px solid rgba(129, 140, 248, 0.38);
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.42);
        color: #f8fafc;
        outline: 0;
        padding: 0 8px;
        font: 800 12px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .mini-title-input {
        width: 100%;
        min-width: 0;
        border: 1px solid rgba(129, 140, 248, 0.38);
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.42);
        color: #f8fafc;
        outline: 0;
        padding: 0 8px;
        font: 800 12px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        height: 26px;
      }

      .mini-menu,
      .note-menu,
      .note-export-menu {
        position: relative;
        justify-self: end;
        z-index: 214748320;
      }

      .category-export[open],
      .mini-menu[open],
      .note-menu[open],
      .note-export-menu[open] {
        z-index: 214748360;
      }

      .mini-menu summary,
      .note-menu summary {
        display: grid;
        place-items: center;
        width: 26px;
        height: 26px;
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.32);
        color: #dbeafe;
        cursor: pointer;
        list-style: none;
        font: 900 16px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .mini-menu-popover,
      .note-menu-popover,
      .note-export-popover {
        position: absolute;
        right: 0;
        top: calc(100% + 5px);
        z-index: 214748360;
        pointer-events: auto;
        display: grid;
        gap: 4px;
        min-width: 132px;
        border: 1px solid rgba(129, 140, 248, 0.24);
        border-radius: 9px;
        background: rgba(15, 23, 42, 0.98);
        padding: 6px;
        box-shadow: 0 16px 34px rgba(2, 6, 23, 0.42);
        transform-origin: top right;
        animation: noteMenuIn 130ms ease both;
      }

      .category-export[data-menu-placement="up"] .category-export-popover,
      .mini-menu[data-menu-placement="up"] .mini-menu-popover,
      .note-menu[data-menu-placement="up"] .note-menu-popover,
      .note-export-menu[data-menu-placement="up"] .note-export-popover {
        top: auto;
        bottom: calc(100% + 5px);
        transform-origin: bottom right;
      }

      .mini-menu-popover button,
      .note-menu-popover button,
      .note-export-popover button,
      .menu-move-panel {
        display: grid;
        gap: 4px;
        width: 100%;
        min-height: 26px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: #e0e7ff;
        cursor: pointer;
        padding: 6px 7px;
        text-align: left;
        font: 800 11px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .category-export-popover button:hover,
      .mini-menu-popover button:hover,
      .note-menu-popover button:hover,
      .note-export-popover button:hover {
        background: rgba(99, 102, 241, 0.2);
      }

      .menu-category-list {
        display: grid;
        gap: 3px;
      }

      .menu-category-list button {
        min-height: 24px;
        padding: 0 7px;
      }

      .menu-category-list button.active {
        background: rgba(99, 102, 241, 0.24);
        color: #ffffff;
      }

      .chip-icon.danger:hover,
      .mini-menu-popover .danger,
      .note-menu-popover .danger {
        color: #fecaca;
      }

      .mini-menu-popover select,
      .note-menu-popover select {
        width: 100%;
        height: 28px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 7px;
        background: rgba(30, 41, 72, 0.95);
        color: #f8fafc;
        padding: 0 6px;
        font: 800 11px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .category-empty {
        min-height: 28px;
        display: grid;
        align-items: center;
        border: 1px dashed rgba(148, 163, 184, 0.14);
        border-radius: 8px;
        color: rgba(203, 213, 225, 0.54);
        padding: 0 8px;
        font: 800 11px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .dot {
        width: 9px;
        height: 9px;
        flex: 0 0 auto;
        border-radius: 999px;
      }

      .purple { background: #8b5cf6; }
      .green { background: #20c997; }
      .red { background: #ff4d4f; }
      .blue { background: #4f8df7; }
      .amber { background: #fbbf24; }

      .notes-grid {
        display: grid;
        gap: 12px;
        padding-top: 2px;
      }

      .focused-note-shell {
        display: grid;
        gap: 12px;
      }

      .note-card {
        display: grid;
        gap: 12px;
        position: relative;
        overflow: visible;
        min-width: 0;
        border: 1px solid rgba(129, 140, 248, 0.22);
        border-radius: 10px;
        background: rgba(31, 45, 82, 0.76);
        padding: 12px;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.04),
          0 14px 28px rgba(15, 23, 42, 0.12);
        transition: transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease, opacity 150ms ease;
      }

      .note-list-row .note-actions {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        justify-self: end;
      }

      .note-list-main {
        display: grid;
        gap: 5px;
        min-width: 0;
      }

      .note-list-category {
        display: inline-flex;
        align-items: center;
        justify-self: start;
        max-width: 92px;
        min-height: 20px;
        border-radius: 999px;
        padding: 0 8px;
        color: #ffffff;
        font: 800 10px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .category-group:has(.mini-menu[open]),
      .category-mini-note:has(.mini-menu[open]),
      .note-card:has(.note-menu[open]),
      .note-card:has(.note-export-menu[open]),
      .category-mini-note:has(.note-export-menu[open]) {
        z-index: 214748350;
      }

      .note-card.focused-note {
        min-height: 320px;
        border-color: rgba(129, 140, 248, 0.46);
        background: rgba(15, 23, 42, 0.88);
      }

      .note-card.focused-note:hover {
        transform: none;
      }

      .note-card:hover {
        border-color: rgba(129, 140, 248, 0.4);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.06),
          0 18px 34px rgba(15, 23, 42, 0.2);
      }

      .note-list-row:hover {
        background: rgba(30, 41, 72, 0.52);
        box-shadow: none;
      }

      .note-card.dragging {
        opacity: 0.58;
        transform: scale(0.98);
      }

      .note-card-top {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 28px 28px 28px;
        align-items: center;
        gap: 8px;
        min-height: 30px;
      }

      .note-badge {
        display: inline-flex;
        align-items: center;
        min-height: 22px;
        max-width: 100%;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        border-radius: 999px;
        padding: 0 9px;
        color: #ffffff;
        font: 800 11px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .note-created-time {
        display: block;
        min-width: 0;
        overflow: hidden;
        color: rgba(203, 213, 225, 0.7);
        text-overflow: ellipsis;
        white-space: nowrap;
        font: 700 10px/1.2 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .note-actions {
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: 5px;
      }

      .note-card-top .note-actions,
      .note-actions.compact {
        justify-self: end;
      }

      .note-actions button {
        min-height: 24px;
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 7px;
        background: rgba(15, 23, 42, 0.28);
        color: #dbeafe;
        cursor: pointer;
        padding: 0 7px;
        font: 900 10px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        transition: background 140ms ease, transform 140ms ease, border-color 140ms ease;
      }

      .note-actions button:hover {
        background: rgba(99, 102, 241, 0.28);
        border-color: rgba(129, 140, 248, 0.38);
        transform: translateY(-1px);
      }

      .note-actions .note-menu-popover button {
        min-height: 26px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: #e0e7ff;
        padding: 6px 7px;
        transform: none;
      }

      .note-actions .note-menu-popover button:hover {
        background: rgba(99, 102, 241, 0.2);
        border-color: transparent;
        transform: none;
      }

      .note-card h3 {
        margin: 0;
        color: #f8fafc;
        font: 800 14px/1.25 Inter, ui-sans-serif, system-ui, sans-serif;
        outline: 0;
      }

      .note-title-stack {
        display: grid;
        gap: 4px;
        min-width: 0;
      }

      .note-title-button {
        display: block;
        width: 100%;
        border: 0;
        background: transparent;
        color: #f8fafc;
        cursor: pointer;
        padding: 0;
        text-align: left;
        font: inherit;
      }

      .support-brand-copy > span,
      .title-suggestions button span,
      .note-list-row .note-title-button {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .note-title-input {
        width: 100%;
        min-width: 0;
        border: 1px solid rgba(129, 140, 248, 0.38);
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.42);
        color: #f8fafc;
        outline: 0;
        padding: 0 8px;
        font: 800 12px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        height: 34px;
        font-size: 14px;
      }

      .focused-note .note-card-top {
        grid-template-columns: minmax(44px, 1fr) minmax(0, auto) minmax(0, auto) 28px 28px 28px;
      }

      .full-note-button {
        min-height: 28px;
        min-width: 0;
        border: 1px solid rgba(129, 140, 248, 0.42);
        border-radius: 8px;
        background: linear-gradient(135deg, rgba(49, 94, 215, 0.82), rgba(112, 59, 210, 0.82));
        color: #ffffff;
        cursor: pointer;
        padding: 0 10px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font: 800 10px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .full-note-button:hover {
        filter: brightness(1.12);
      }
      .collapse-note {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.34);
        color: #dbeafe;
        cursor: pointer;
        font: 900 18px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .mini-menu summary:hover,
      .note-menu summary:hover,
      .collapse-note:hover {
        background: rgba(99, 102, 241, 0.28);
        border-color: rgba(129, 140, 248, 0.38);
      }



      .structured-editor-toolbar { display: flex; justify-content: flex-end; margin: 4px 0 8px; }
      .structured-edit-toggle { min-height: 30px; min-width: 0; padding: 0 14px; border: 1px solid rgba(129, 140, 248, .52); border-radius: 8px; background: linear-gradient(135deg, rgba(49, 94, 215, .85), rgba(112, 59, 210, .82)); color: #fff; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 800 11px/1 Inter, ui-sans-serif, system-ui, sans-serif; }
      .structured-edit-gap { display: block; width: 100%; height: 18px; margin: 3px 0; padding: 0; border: 0; border-radius: 7px; background: transparent; cursor: text; position: relative; }
      .structured-edit-gap::after { content: "+ Add writing space here"; position: absolute; inset: 2px 0; display: grid; place-items: center; border: 1px dashed rgba(96, 165, 250, .42); border-radius: 6px; color: rgba(147, 197, 253, .8); background: rgba(30, 64, 175, .08); font: 700 9px/1 Inter, ui-sans-serif, system-ui, sans-serif; opacity: .72; }
      .structured-edit-gap:hover::after { opacity: 1; background: rgba(30, 64, 175, .2); }
      .personal-note-text { min-height: 1.4em; margin: 8px 0; padding: 3px 8px; border-left: 2px solid rgba(167, 139, 250, .7); color: #d8b4fe; outline: none; }

      .structured-block-actions { display: flex; justify-content: flex-end; gap: 6px; margin: 6px 0 4px; }

      .structured-move-button { padding: 5px 9px; border: 1px solid rgba(96, 165, 250, .5); border-radius: 7px; background: rgba(30, 64, 175, .16); color: #bfdbfe; cursor: pointer; font: 700 9px/1 Inter, ui-sans-serif, system-ui, sans-serif; }
      .structured-move-button:hover:not(:disabled) { background: rgba(37, 99, 235, .3); color: #fff; }
      .structured-move-button:disabled { opacity: .35; cursor: not-allowed; }

      .structured-content-block { transition: opacity 140ms ease, transform 140ms ease, box-shadow 140ms ease; }

      .structured-delete-block { display: block; width: auto; margin: 5px 0 3px auto; padding: 5px 8px; border: 1px solid rgba(248, 113, 113, .48); border-radius: 7px; background: rgba(127, 29, 29, .18); color: #fecaca; cursor: pointer; font: 700 9px/1 Inter, ui-sans-serif, system-ui, sans-serif; }
      .structured-delete-block:hover { background: rgba(185, 28, 28, .3); color: #fff; }
      .structured-editing .structured-draggable { cursor: grab; }
      .structured-editing .structured-draggable:active {
        cursor: grabbing;
      }
      .structured-dragging { opacity: .45; }
      .structured-edit-gap.drag-target::after { border-style: solid; border-color: #60a5fa; background: rgba(37, 99, 235, .28); color: #fff; opacity: 1; }
      .personal-note-block { position: relative; margin: 9px 0; padding: 22px 12px 10px; border: 1px solid rgba(167, 139, 250, .48); border-left: 3px solid #a78bfa; border-radius: 9px; background: rgba(124, 58, 237, .10); color: #ede9fe; }
      .personal-note-block::before { content: "My Note"; position: absolute; top: 6px; left: 12px; color: #c4b5fd; font: 800 9px/1 Inter, ui-sans-serif, system-ui, sans-serif; letter-spacing: .05em; text-transform: uppercase; }
      .personal-note-block p { min-height: 1.4em; margin: 0; outline: none; }

      .structured-add-below,
      .structured-add-end {
        display: block;
        width: 100%;
        margin: 7px 0;
        padding: 7px 10px;
        border: 1px dashed rgba(125, 183, 255, .48);
        border-radius: 8px;
        background: rgba(59, 130, 246, .08);
        color: #bfdbfe;
        cursor: pointer;
        font: 700 11px/1.2 Inter, ui-sans-serif, system-ui, sans-serif;
        text-align: center;
      }
      .structured-add-below:hover,
      .structured-add-end:hover { background: rgba(59, 130, 246, .18); color: #fff; }
      .structured-add-end {
        display: block;
        width: 100%;
        margin: 7px 0;
        padding: 7px 10px;
        border: 1px dashed rgba(125, 183, 255, .48);
        border-radius: 8px;
        background: rgba(59, 130, 246, .08);
        color: #bfdbfe;
        cursor: pointer;
        font: 700 11px/1.2 Inter, ui-sans-serif, system-ui, sans-serif;
        text-align: center;
        margin-top: 10px;
        border-style: solid;
      }
      [data-note-body] > p { min-height: 1.4em; }

      .note-body {
        min-width: 0;
        min-height: 42px;
        color: rgba(203, 213, 225, 0.86);
        outline: 0;
        overflow-wrap: anywhere;
        word-break: break-word;
        font: 13px/1.5 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .focused-note .note-body {
        width: 100%;
        max-width: 100%;
        min-height: 220px;
        max-height: min(420px, 58vh);
        overflow: auto;
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 10px;
        background: rgba(2, 6, 23, 0.22);
        padding: 12px;
      }

      .source-snippet {
        display: grid;
        gap: 8px;
        position: relative;
        margin: 0;
        padding: 14px 14px 14px 16px;
        border-radius: 10px;
        border-top: 2px solid rgba(125, 211, 252, 0.9);
        border-bottom: 2px solid rgba(125, 211, 252, 0.9);
        border-left: 3px solid rgba(45, 212, 191, 0.85);
        background: rgba(20, 184, 166, 0.1);
      }

      .source-snippet::before,
      .source-snippet::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        border-top: 2px solid rgba(125, 211, 252, 0.9);
        pointer-events: none;
      }

      .source-snippet::before {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        border-top: 2px solid rgba(125, 211, 252, 0.9);
        pointer-events: none;
        top: 0;
      }

      .source-snippet::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        border-top: 2px solid rgba(125, 211, 252, 0.9);
        pointer-events: none;
        bottom: 0;
      }

      .source-snippet + .source-snippet,
      .capture-rule + .source-snippet {
        margin-top: 0;
      }

      .capture-rule {
        border: 0;
        border-top: 1px dashed rgba(148, 163, 184, 0.34);
        margin: 22px 0;
      }

      .page-reference-title {
        display: flex;
        align-items: center;
        gap: 9px;
      }

      .page-reference-title a {
        min-width: 0;
        flex: 1 1 auto;
        overflow-wrap: break-word;
      }

      .page-reference-title .page-reference-favicon {
        flex: 0 0 auto;
        width: 24px;
        height: 24px;
        border-radius: 6px;
        object-fit: contain;
      }

      .page-reference-description,
      .page-reference-personal-note {
        margin: 0;
      }

      .page-reference-selection {
        margin: 2px 0;
        border-left: 3px solid rgba(125, 211, 252, 0.72);
        padding: 7px 10px;
        color: rgba(226, 232, 240, 0.9);
        background: rgba(15, 23, 42, 0.24);
      }

      .source-meta {
        margin: 0;
        border-left: 2px solid rgba(129, 140, 248, 0.45);
        color: rgba(203, 213, 225, 0.72);
        padding-left: 9px;
        font: 700 11px/1.55 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .note-body h2 {
        margin: 4px 0;
        font-size: 15px;
      }

      .note-body pre {
        overflow: auto;
        margin: 4px 0;
        padding: 9px;
        border-radius: 8px;
        background: rgba(2, 6, 23, 0.5);
        color: #bfdbfe;
        font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }

      .note-body img {
        display: block;
        max-width: 100%;
        width: 100%;
        height: auto;
        max-height: 320px;
        object-fit: contain;
        border-radius: 8px;
        background: rgba(2, 6, 23, 0.42);
        margin: 0;
      }

      .note-body table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }

      .note-body td,
      .note-body th {
        border: 1px solid rgba(148, 163, 184, 0.26);
        padding: 5px;
      }

      .note-body a {
        color: #93c5fd;
        text-decoration: none;
        border-bottom: 1px solid rgba(147, 197, 253, 0.34);
        cursor: pointer;
      }

      .note-body a:hover {
        color: #bfdbfe;
        border-bottom-color: rgba(191, 219, 254, 0.72);
      }

      .inline-shot {
        display: block;
        width: 100%;
        max-width: 100%;
        height: auto;
        max-height: 320px;
        object-fit: contain;
        border-radius: 8px;
        background: rgba(2, 6, 23, 0.42);
        margin: 0;
      }

      @keyframes snipSlideDown {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes noteMenuIn {
        from {
          opacity: 0;
          transform: translateY(-4px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .empty-state {
        min-height: 56px;
        display: grid;
        place-items: center;
        border: 1px dashed rgba(148, 163, 184, 0.26);
        border-radius: 8px;
        color: rgba(203, 213, 225, 0.78);
        font: 700 13px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .stat-card:hover,
      .stat-card.active {
        border-color: rgba(129, 140, 248, 0.62);
        background: rgba(58, 77, 139, 0.86);
      }

      .launcher {
        position: fixed;
        z-index: 2147483600;
        width: 56px;
        height: 56px;
        border-radius: 18px;
        color: #ffffff;
        box-shadow: 0 18px 44px rgba(15, 23, 42, 0.32);
        cursor: grab;
        font: 800 13px/1 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
        user-select: none;
        border: 0;
        background: transparent;
        padding: 0;
        overflow: hidden;
        touch-action: none;
        will-change: left, top, transform;
      }

      .launcher.dragging {
        cursor: grabbing;
        transition: none;
      }

      .launcher img {
        width: 100%;
        user-select: none;
        -webkit-user-drag: none;
        pointer-events: none;
        height: 100%;
        display: block;
        border-radius: 18px;
        object-fit: cover;
        image-rendering: auto;
      }

      .tool {
        min-width: 0;
        border: 1px solid rgba(255, 255, 255, 0.24);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.09)),
          rgba(255, 255, 255, 0.12);
        color: #ffffff;
        cursor: pointer;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18),
          0 8px 18px rgba(15, 23, 42, 0.14);
        font: 800 12px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        transition: background 170ms ease,
          box-shadow 170ms ease,
          transform 170ms ease,
          border-color 170ms ease,
          filter 170ms ease;
        height: 62px;
        border-radius: 8px;
      }

      .action-tile {
        display: grid;
        grid-template-columns: 40px minmax(0, 1fr);
        align-items: center;
        gap: 12px;
        padding: 0 14px;
        text-align: left;
      }

      .action-tile strong,
      .quick-action strong {
        display: block;
        overflow: hidden;
        color: #ffffff;
        text-overflow: ellipsis;
        white-space: nowrap;
        font: 900 14px/1.2 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .action-tile small,
      .quick-action small,
      .stat-card small,
      .category-toggle small {
        display: block;
        margin-top: 6px;
        overflow: hidden;
        color: rgba(203, 213, 225, 0.78);
        text-overflow: ellipsis;
        white-space: nowrap;
        font: 650 11px/1.25 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .tile-icon,
      .quick-icon,
      .stat-icon,
      .section-icon,
      .filter-icon {
        position: relative;
        display: inline-grid;
        place-items: center;
        flex: 0 0 auto;
      }

      .tile-icon,
      .quick-icon {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
      }

      .quick-icon,
      .tile-icon {
        position: relative;
        display: inline-grid;
        place-items: center;
        flex: 0 0 auto;
        width: 40px;
        height: 40px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
      }

      .icon-ocr {
        font: 900 25px/1 Georgia, serif;
      }

      .icon-screenshot::before,
      .icon-screenshot::after {
        content: "";
        position: absolute;
        inset: 9px;
        border: 3px dashed currentColor;
        border-radius: 6px;
      }

      .icon-screenshot::after {
        content: "";
        position: absolute;
        border-radius: 6px;
        inset: 18px;
        border: 0;
        width: 16px;
        height: 3px;
        background: currentColor;
        transform: rotate(45deg);
      }

      .icon-settings::before {
        content: "";
        width: 22px;
        height: 22px;
        border: 4px solid currentColor;
        border-radius: 50%;
        box-shadow: 0 -12px 0 -8px currentColor, 0 12px 0 -8px currentColor, 12px 0 0 -8px currentColor, -12px 0 0 -8px currentColor;
      }

      .tool.close {
        flex: 0 0 auto;
        display: grid;
        place-items: center;
        color: #ffffff;
        line-height: 1;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.1)),
          rgba(255, 255, 255, 0.14);
        width: 52px;
        height: 52px;
        border-radius: 18px;
        font-size: 30px;
      }

      .search-input {
        width: 100%;
        min-width: 0;
        border: 1px solid rgba(148, 163, 184, 0.22);
        color: #f8fafc;
        outline: 0;
        font: 500 14px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        transition: border-color 150ms ease, box-shadow 150ms ease, background 150ms ease;
        height: 58px;
        border-radius: 14px;
        background: rgba(4, 16, 34, 0.92);
        padding: 0 16px 0 58px;
        font-size: 16px;
        font-weight: 650;
      }

      .search-icon {
        position: absolute;
        top: 50%;
        border: 2px solid rgba(148, 163, 184, 0.86);
        border-radius: 999px;
        transform: translateY(-50%);
        pointer-events: none;
        left: 22px;
        width: 20px;
        height: 20px;
      }

      .search-shortcut {
        position: absolute;
        right: 22px;
        top: 50%;
        transform: translateY(-50%);
        color: rgba(203, 213, 225, 0.82);
        font: 700 13px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        pointer-events: none;
      }

      .filters {
        display: grid;
        gap: 10px;
        grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
      }

      .filter-shell {
        position: relative;
        display: block;
        margin: 0;
      }

      .filter-shell .filter-icon {
        position: absolute;
        left: 20px;
        top: 50%;
        width: 24px;
        height: 24px;
        transform: translateY(-50%);
        color: #9aa9c8;
        pointer-events: none;
      }

      .filter-select {
        width: 100%;
        min-width: 0;
        border: 1px solid rgba(148, 163, 184, 0.22);
        outline: 0;
        font: 500 14px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        transition: border-color 150ms ease, box-shadow 150ms ease, background 150ms ease;
        padding: 0 34px 0 12px;
        cursor: pointer;
        height: 56px;
        border-radius: 14px;
        background: rgba(6, 18, 37, 0.92);
        color: #f8fafc;
        padding-left: 58px;
        padding-right: 44px;
        font-size: 15px;
        font-weight: 850;
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
      }

      .filter-shell::after {
        content: "";
        position: absolute;
        right: 22px;
        top: 50%;
        width: 10px;
        height: 10px;
        border-right: 2px solid #9aa9c8;
        border-bottom: 2px solid #9aa9c8;
        transform: translateY(-70%) rotate(45deg);
        pointer-events: none;
      }

      .filter-shell .layers-icon {
        width: 20px;
        height: 3px;
        background: currentColor;
        border-radius: 2px;
      }

      .layers-icon::before,
      .layers-icon::after {
        content: "";
        position: absolute;
        left: 50%;
        height: 3px;
        background: currentColor;
        border-radius: 2px;
        transform: translateX(-50%);
      }

      .layers-icon::before {
        top: -7px;
        width: 26px;
      }

      .layers-icon::after {
        top: 7px;
        width: 14px;
      }

      .calendar-icon::before {
        content: "";
        width: 22px;
        height: 22px;
        border: 3px solid currentColor;
        border-radius: 5px;
        box-shadow: inset 0 7px 0 -4px currentColor;
      }

      .categories-block,
      .quick-actions {
        border: 1px solid rgba(48, 73, 112, 0.64);
        border-radius: 14px;
        background: rgba(5, 17, 34, 0.8);
        padding: 18px;
      }

      .categories-block {
        display: grid;
        gap: 8px;
        padding: 18px;
        border: 1px solid rgba(48, 73, 112, 0.64);
        border-radius: 14px;
        background: rgba(5, 17, 34, 0.8);
      }

      .category-head {
        justify-content: space-between;
        display: grid;
        align-items: center;
        gap: 12px;
        grid-template-columns: 34px minmax(100px, 1fr) minmax(0, auto);
      }

      .folder-icon {
        width: 28px;
        height: 22px;
        border: 3px solid #f6a638;
        border-radius: 5px;
      }

      .folder-icon::before {
        content: "";
        position: absolute;
        left: 1px;
        top: -8px;
        width: 14px;
        height: 8px;
        border: 3px solid #f6a638;
        border-bottom: 0;
        border-radius: 5px 5px 0 0;
      }

      .category-toggle {
        border: 0;
        color: #dbeafe;
        cursor: pointer;
        transition: transform 150ms ease, background 150ms ease, box-shadow 150ms ease;
        min-width: 0;
        gap: 7px;
        border-radius: 8px;
        font: 900 12px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        display: flex;
        align-items: center;
        height: auto;
        background: transparent;
        padding: 0;
        text-transform: none;
        text-align: left;
        width: 100%;
        max-width: 100%;
        flex-wrap: wrap;
        justify-self: start;
        justify-content: flex-start;
        column-gap: 6px !important;
        row-gap: 2px;
        min-height: 42px;
      }

      .category-toggle small {
        display: block;
        overflow: hidden;
        color: rgba(203, 213, 225, 0.78);
        text-overflow: ellipsis;
        white-space: nowrap;
        font: 650 11px/1.25 Inter, ui-sans-serif, system-ui, sans-serif;
        margin-top: 0;
        flex: 0 0 100%;
      }

      .category-title-text {
        flex: 0 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #f8fafc;
        font-size: 16px;
      }

      .category-title-line {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 50px;
        flex: 1 1 auto;
      }

      .category-caret {
        color: #8ea2ff;
        display: inline-block;
        transition: transform 180ms ease;
        will-change: transform;
        width: auto;
        flex: 0 0 auto;
        margin-right: 0;
      }

      .category-count {
        color: #8ea2ff;
        flex: 0 0 auto;
        margin-left: 6px;
        white-space: nowrap;
      }

      .category-add {
        border: 0;
        cursor: pointer;
        transition: transform 150ms ease, background 150ms ease, box-shadow 150ms ease;
        place-items: center;
        font: 900 17px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        color: #ffffff;
        width: auto;
        min-width: 0;
        height: 36px;
        display: inline-flex;
        border-radius: 10px;
        background: linear-gradient(135deg, #6d45ff, #3d31c8);
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        font-size: 13px;
      }

      .category-add > span:first-child {
        flex: 0 0 auto;
        font-size: 24px;
        line-height: 1;
      }

      .category-add-label {
        flex: 0 1 auto;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
      }

      .category-list.expanded {
        max-height: var(--category-list-height, 0px);
        opacity: 1;
        transform: translateY(0);
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 12px;
        align-items: start;
      }

      .category-list.expanded:not(.is-animating) {
        max-height: none;
        overflow: visible;
        display: grid;
      }

      .category-group {
        position: relative;
        transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease;
        display: grid;
        gap: 8px;
        border: 1px solid rgba(65, 92, 142, 0.34);
        border-radius: 12px;
        background: rgba(7, 21, 42, 0.46);
        padding: 8px;
        min-width: 0;
      }

      .category-row {
        display: grid;
        align-items: center;
        cursor: pointer;
        border-radius: 7px;
        transition: background 150ms ease;
        grid-template-columns: minmax(0, 1fr);
        gap: 8px;
        min-height: 42px;
      }

      .category-disclosure {
        place-items: center;
        border: 0;
        cursor: pointer;
        color: #dbeafe;
        background: rgba(99, 102, 241, 0.18);
        transition: background 150ms ease, box-shadow 150ms ease;
        width: 24px;
        height: 24px;
        border-radius: 8px;
        display: none;
      }

      .category-note-add,
      .chip-icon {
        min-height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(129, 140, 248, 0.2);
        border-radius: 9px;
        background: rgba(99, 102, 241, 0.16);
        color: #dbeafe;
        cursor: pointer;
        padding: 0 10px;
        font: 900 11px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        white-space: nowrap;
      }

      .category-note-add {
        place-items: center;
        transition: background 150ms ease, box-shadow 150ms ease;
        cursor: pointer;
        display: inline-flex;
        border: 1px solid rgba(129, 140, 248, 0.2);
        color: #dbeafe;
        background: rgba(99, 102, 241, 0.16);
        border-radius: 9px;
        font: 900 16px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        min-height: 30px;
        align-items: center;
        justify-content: center;
        padding: 0 10px;
        white-space: nowrap;
        width: auto;
        height: 30px;
      }

      .category-note-add::after {
        content: "";
      }

      .category-actions {
        cursor: default;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        justify-content: flex-start;
        opacity: 1;
        position: static;
        z-index: 1;
        flex-wrap: nowrap;
        width: max-content;
        max-width: 100%;
        transform: none;
      }

      .category-actions .chip-icon {
        display: inline-flex;
      }

      .category-export summary,
      .note-export-menu summary {
        display: grid;
        place-items: center;
        border: 0;
        cursor: pointer;
        list-style: none;
        font: 900 12px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        width: 30px;
        height: 30px;
        border-radius: 9px;
        background: rgba(99, 102, 241, 0.18);
        color: #dbeafe;
        min-width: 30px;
        padding: 0;
        font-size: 0;
      }

      .category-export summary::before,
      .note-export-menu summary::before {
        content: "\21E9";
        font: 900 15px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .chip-icon {
        font: 900 11px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        min-height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(129, 140, 248, 0.2);
        border-radius: 9px;
        background: rgba(99, 102, 241, 0.16);
        cursor: pointer;
        white-space: nowrap;
        color: transparent;
        padding: 0;
        width: 30px;
        overflow: hidden;
        font-size: 0;
      }

      .chip-icon::before {
        color: #dbeafe;
        font: 900 13px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .chip-icon[data-action="rename-category"]::before {
        content: "\270E";
      }

      .chip-icon[data-action="delete-category"]::before {
        content: "\2715";
        color: #fecaca;
      }

      .category-select {
        min-width: 0;
        gap: 7px;
        max-width: 100%;
        border: 1px solid rgba(148, 163, 184, 0.16);
        color: #eef2ff;
        cursor: pointer;
        text-align: left;
        font: 800 12px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        contain: paint;
        backface-visibility: hidden;
        transform: translateZ(0);
        transition: background 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        min-height: 40px;
        border-radius: 10px;
        background: rgba(17, 31, 55, 0.88);
        padding: 9px 12px;
        width: 100%;
        font-size: 13px;
      }

      .category-select .dot,
      .category-select .category-note-count,
      .category-select .category-inline-actions {
        flex: 0 0 auto;
      }

      .category-name {
        flex: 1 1 auto;
        max-width: none;
        overflow: visible;
        text-overflow: clip;
        white-space: normal;
        min-width: 50px;
        overflow-wrap: break-word;
        line-height: 1.25;
      }

      .category-inline-actions {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-left: 6px;
        white-space: nowrap;
      }

      .category-note-count {
        color: #60a5fa;
        font-size: 13px;
        margin-left: auto;
        min-width: 24px;
        min-height: 24px;
        display: inline-grid;
        place-items: center;
        border-radius: 999px;
        background: rgba(59, 130, 246, 0.16);
      }

      .category-note-create {
        overflow: hidden;
        animation: snipSlideDown 150ms ease both;
        display: block;
      }

      .panel,
      .settings-export-menu summary::-webkit-details-marker,
      .category-export summary::-webkit-details-marker,
      .title-suggestions[hidden],
      .mini-menu summary::-webkit-details-marker,
      .note-menu summary::-webkit-details-marker,
      .note-export-menu summary::-webkit-details-marker,
      .menu-move-panel[hidden],
      .notes-grid[hidden],
      .focused-note-shell[hidden],
      .note-card[hidden],
      .focused-note > .note-actions,
      .source-snippet:has(+ p + br + .source-snippet) + p,
      .source-snippet + p:has(+ br + .source-snippet) + br,
      .empty-state[hidden],
      .category-note-create[hidden] {
        display: none;
      }

      .category-note-list {
        gap: 8px;
        max-height: 0;
        opacity: 0;
        overflow: hidden;
        transform: translateY(-3px);
        transition: max-height 220ms ease, opacity 170ms ease, transform 170ms ease;
        will-change: max-height, opacity, transform;
        display: grid;
      }

      .category-group.open {
        border-color: rgba(96, 122, 188, 0.58);
        background: rgba(7, 21, 42, 0.72);
      }

      .stat-card span {
        max-width: 100%;
        font: 700 11px/1.1 Inter, ui-sans-serif, system-ui, sans-serif;
        color: #f8fafc;
        text-align: left;
        text-transform: none;
        font-size: 14px;
        font-weight: 900;
      }

      .stat-storage {
        cursor: default !important;
      }

      .quick-actions {
        border: 1px solid rgba(48, 73, 112, 0.64);
        border-radius: 14px;
        background: rgba(5, 17, 34, 0.8);
        padding: 18px;
        display: grid;
        gap: 14px;
      }

      .save-link-action span,
      .quick-actions h2,
      .notes-heading h2 {
        font-size: 16px;
      }

      .quick-action-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }

      .quick-action {
        min-width: 0;
        min-height: 74px;
        display: grid;
        grid-template-columns: 42px minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        border: 1px solid rgba(48, 73, 112, 0.58);
        border-radius: 10px;
        background: rgba(17, 31, 55, 0.76);
        color: #ffffff;
        cursor: pointer;
        padding: 12px;
        text-align: left;
      }

      .quick-action b {
        color: #7dd3fc;
        font-size: 28px;
        line-height: 1;
      }

      .camera-icon::before,
      .note-icon::before,
      .stat-notes::before,
      .stat-today::before,
      .stat-pinned::before,
      .stat-drive::before {
        content: "";
        width: 22px;
        height: 22px;
        border: 3px solid currentColor;
        border-radius: 5px;
      }

      .camera-icon,
      .stat-drive {
        color: #38bdf8;
      }

      .note-icon {
        color: #2dd4bf;
        background: rgba(20, 184, 166, 0.18);
      }

      .notes-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .notes-heading-actions {
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }

      .notes-heading button {
        border: 0;
        background: transparent;
        color: #9d6bff;
        cursor: pointer;
        font: 900 14px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .note-list-row {
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 8px;
        border-color: rgba(129, 140, 248, 0.16);
        box-shadow: none;
        min-height: 58px;
        padding: 12px 14px;
        border-radius: 10px;
        background: rgba(6, 18, 37, 0.82);
      }

      .header {
        position: relative;
        display: grid;
        overflow: hidden;
        border-bottom: 1px solid rgba(255, 255, 255, 0.22);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28),
          0 18px 42px rgba(15, 23, 42, 0.28);
        backdrop-filter: blur(22px) saturate(1.45);
        -webkit-backdrop-filter: blur(22px) saturate(1.45);
        border-radius: 24px 24px 0 0;
        background: linear-gradient(112deg, rgba(26, 67, 220, 0.98) 0%, rgba(105, 40, 220, 0.96) 56%, rgba(31, 132, 221, 0.92) 100%);
        gap: 10px;
        padding: 12px 14px 10px;
      }

      .brand-row {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .brand-lockup {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 9px;
      }

      .brand-mark {
        flex: 0 0 auto;
        place-items: center;
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.08)),
          rgba(255, 255, 255, 0.16);
        color: #ffffff;
        font: 900 18px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        text-shadow: 0 2px 12px rgba(15, 23, 42, 0.28);
        display: block;
        border: 0;
        object-fit: cover;
        width: 38px;
        height: 38px;
        border-radius: 12px;
        box-shadow: 0 8px 18px rgba(2, 6, 23, 0.24);
      }

      .brand-copy {
        min-width: 0;
        display: grid;
        gap: 1px;
      }

      .brand-name {
        overflow: hidden;
        color: #ffffff;
        text-overflow: ellipsis;
        white-space: nowrap;
        font: 900 19px/1.1 Inter, ui-sans-serif, system-ui, sans-serif;
        text-shadow: 0 2px 18px rgba(15, 23, 42, 0.22);
        font-size: 19px;
        line-height: 1.05;
      }

      .brand-desc {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font: 700 11px/1.2 Inter, ui-sans-serif, system-ui, sans-serif;
        color: rgba(222, 229, 255, 0.82);
        text-transform: none;
        font-size: 10px;
        line-height: 1.15;
      }

      .header-actions {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex: 0 0 auto;
      }

      .tool.icon-tool {
        width: 34px;
        height: 34px;
        min-width: 34px;
        display: grid;
        place-items: center;
        border-radius: 11px;
        padding: 0;
        font-size: 20px;
      }

      .tool.icon-tool .icon-settings {
        position: relative;
        width: 22px;
        height: 22px;
        display: grid;
        place-items: center;
      }

      .tool.icon-tool .icon-settings::before {
        width: 15px;
        height: 15px;
        border-width: 3px;
        box-shadow: 0 -9px 0 -6px currentColor, 0 9px 0 -6px currentColor, 9px 0 0 -6px currentColor, -9px 0 0 -6px currentColor;
      }

      .tool.icon-tool.close {
        width: 34px;
        height: 34px;
        border-radius: 11px;
        font-size: 22px;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        padding-top: 2px;
      }

      .stat-card {
        min-width: 0;
        cursor: pointer;
        transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
        justify-items: start;
        min-height: 112px;
        display: grid;
        place-items: unset;
        align-content: start;
        gap: 7px 12px;
        border: 1px solid rgba(44, 66, 104, 0.7);
        border-radius: 8px;
        background: radial-gradient(circle at 18% 0%, rgba(35, 67, 121, 0.28), transparent 42%),
          linear-gradient(145deg, rgba(7, 20, 40, 0.98), rgba(3, 12, 25, 0.96));
        grid-template-columns: 44px minmax(0, 1fr);
        padding: 14px;
        grid-template-rows: 44px 21px 18px;
        align-items: center;
        overflow: hidden;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
      }

      .stat-card:hover,
      .stat-card.active,
      .stat-card.active {
        border-color: rgba(88, 110, 168, 0.72);
        background: radial-gradient(circle at 18% 0%, rgba(50, 84, 148, 0.32), transparent 42%),
          linear-gradient(145deg, rgba(9, 24, 48, 0.98), rgba(4, 14, 29, 0.96));
      }

      .stat-card:hover {
        transform: translateY(-1px);
        border-color: rgba(88, 110, 168, 0.72);
        background: radial-gradient(circle at 18% 0%, rgba(50, 84, 148, 0.32), transparent 42%),
          linear-gradient(145deg, rgba(9, 24, 48, 0.98), rgba(4, 14, 29, 0.96));
      }

      .stat-icon {
        position: relative;
        display: inline-grid;
        place-items: center;
        flex: 0 0 auto;
        background: rgba(99, 102, 241, 0.22);
        width: 44px;
        height: 44px;
        grid-row: 1;
        border-radius: 12px;
        grid-column: 1;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.09), 0 10px 22px rgba(2, 6, 23, 0.18);
      }

      .stat-card strong {
        font-size: 30px;
        color: #8b5cf6;
        font: 900 30px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        grid-column: 2;
        grid-row: 1;
        align-self: center;
        justify-self: start;
      }

      .stat-card span:not(.stat-icon) {
        grid-column: 1 / -1;
        grid-row: 2;
        align-self: end;
        justify-self: stretch;
        display: block;
        width: 100%;
        overflow: hidden;
        color: #f8fafc;
        text-align: left;
        text-transform: none;
        text-overflow: ellipsis;
        white-space: nowrap;
        font: 900 15px/1.1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .stat-card small {
        margin-top: 0;
        display: block;
        overflow: hidden;
        color: #aab6d3;
        text-overflow: ellipsis;
        white-space: nowrap;
        font: 650 12px/1.15 Inter, ui-sans-serif, system-ui, sans-serif;
        grid-column: 1 / -1;
        grid-row: 3;
        align-self: start;
        justify-self: stretch;
        width: 100%;
        margin: 0;
        text-align: left;
      }

      .stat-notes {
        color: #c4b5fd;
        background: linear-gradient(145deg, rgba(126, 65, 240, 0.84), rgba(74, 48, 186, 0.9));
      }

      .stat-today {
        color: #67e885;
        background: linear-gradient(145deg, rgba(35, 143, 74, 0.82), rgba(23, 84, 51, 0.9));
      }

      .stat-pinned {
        color: #ffa438;
        background: linear-gradient(145deg, rgba(137, 82, 32, 0.86), rgba(83, 48, 27, 0.94));
      }

      .stat-drive {
        color: #4f9cff;
        background: linear-gradient(145deg, rgba(36, 96, 190, 0.88), rgba(20, 60, 142, 0.94));
      }

      .stat-card:has(.stat-today) strong {
        color: #4ade80;
      }

      .stat-card:has(.stat-pinned) strong {
        color: #ffa438;
      }

      .stat-card:has(.stat-drive) strong {
        color: #3b82f6;
        font-size: 24px;
      }

      .stat-icon::before,
      .stat-icon::after {
        content: "";
        position: absolute;
        box-sizing: border-box;
      }

      .stat-notes::before {
        content: "";
        width: 20px;
        height: 24px;
        border: 3px solid currentColor;
        border-radius: 4px;
      }

      .stat-notes::after {
        top: 13px;
        right: 13px;
        width: 8px;
        height: 8px;
        border-top: 3px solid currentColor;
        border-right: 3px solid currentColor;
        border-radius: 0 3px 0 0;
      }

      .stat-today::before {
        content: "";
        width: 23px;
        height: 23px;
        border: 3px solid currentColor;
        border-radius: 5px;
        box-shadow: inset 0 8px 0 -4px currentColor;
      }

      .stat-today::after {
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 7px 0 0 currentColor, 14px 0 0 currentColor, 0 7px 0 currentColor, 7px 7px 0 currentColor;
        transform: translate(-5px, 5px);
      }

      .stat-pinned::before {
        content: "";
        width: 17px;
        height: 21px;
        border: 3px solid currentColor;
        border-radius: 8px 8px 4px 4px;
        border-top-width: 5px;
        border-bottom: 0;
        transform: rotate(0deg);
      }

      .stat-pinned::after {
        width: 3px;
        height: 16px;
        background: currentColor;
        border-radius: 999px;
        transform: translateY(10px);
      }

      .stat-drive::before {
        content: "";
        width: 25px;
        height: 17px;
        border: 3px solid currentColor;
        border-radius: 5px;
        transform: skewX(-14deg) translateY(3px);
      }

      .stat-drive::after {
        width: 13px;
        height: 3px;
        border-radius: 999px;
        background: currentColor;
        transform: translateY(12px);
      }

      .tool-row {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
      }

      .tool.compact-action {
        height: 46px;
        min-height: 46px;
        grid-template-columns: 28px minmax(0, 1fr);
        gap: 7px;
        border-radius: 999px;
        padding: 0 9px;
        background: rgba(255, 255, 255, 0.13);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 6px 14px rgba(15, 23, 42, 0.12);
      }

      .compact-action .tile-icon {
        width: 28px;
        height: 28px;
        border-radius: 999px;
      }

      .compact-action .icon-ocr {
        font-size: 17px;
      }

      .compact-action .camera-icon::before,
      .compact-action .tile-icon::before {
        width: 15px;
        height: 15px;
        border-width: 2px;
      }

      .compact-action strong {
        font-size: 12px;
        line-height: 1.05;
      }

      .compact-action small {
        margin-top: 3px;
        font-size: 9px;
        line-height: 1;
      }

      .auto-save-control {
        cursor: pointer;
      }

      .auto-save-control input {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
      }

      .switch-track {
        width: 28px;
        height: 18px;
        position: relative;
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(203, 213, 225, 0.26);
        transition: background 150ms ease, border-color 150ms ease;
      }

      .switch-knob {
        position: absolute;
        left: 3px;
        width: 12px;
        height: 12px;
        border-radius: 999px;
        background: #cbd5e1;
        box-shadow: 0 1px 4px rgba(2, 6, 23, 0.35);
        transition: transform 150ms ease, background 150ms ease;
      }

      .auto-save-control input:checked + .switch-track {
        background: linear-gradient(135deg, #22c55e, #14b8a6);
        border-color: rgba(187, 247, 208, 0.72);
      }

      .auto-save-control input:checked + .switch-track .switch-knob {
        transform: translateX(10px);
        background: #ffffff;
      }

      .content {
        min-height: 0;
        overflow: auto;
        scrollbar-color: rgba(129, 140, 248, 0.62) rgba(15, 23, 42, 0.18);
        scrollbar-width: thin;
        border-radius: 0 0 24px 24px;
        background: linear-gradient(180deg, rgba(5, 15, 30, 0.98), rgba(3, 12, 24, 0.98));
        padding: 14px 16px 56px;
      }

      .panel.active {
        display: grid;
        gap: 10px;
      }

      h2 {
        margin: 0;
        color: #f8fafc;
        font: 800 18px/1.2 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      p,
      label {
        margin: 0;
        color: #cbd5e1;
        font: 13px/1.5 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      label {
        margin: 0;
        color: #cbd5e1;
        font: 13px/1.5 Inter, ui-sans-serif, system-ui, sans-serif;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* Snipaze compact category and note rows 2026-07-08 */
      /* Removed sidebar media breakpoint 2026-07-08; stable grid rules handle resizing. */

      .resize-handle {
        position: absolute;
        z-index: 2;
      }

      .resize-handle.top,
      .resize-handle.bottom {
        left: 14px;
        right: 14px;
        height: 10px;
        cursor: ns-resize;
      }

      .resize-handle.top {
        left: 14px;
        right: 14px;
        height: 10px;
        cursor: ns-resize;
        top: -5px;
      }
      .resize-handle.bottom {
        left: 14px;
        right: 14px;
        height: 10px;
        cursor: ns-resize;
        bottom: -5px;
      }

      .resize-handle.left,
      .resize-handle.right {
        top: 14px;
        bottom: 14px;
        width: 10px;
        cursor: ew-resize;
      }

      .resize-handle.left {
        top: 14px;
        bottom: 14px;
        width: 10px;
        cursor: ew-resize;
        left: -5px;
      }
      .resize-handle.right {
        top: 14px;
        bottom: 14px;
        width: 10px;
        cursor: ew-resize;
        right: -5px;
      }

      .resize-handle.top-left,
      .resize-handle.top-right,
      .resize-handle.bottom-left,
      .resize-handle.bottom-right {
        width: 18px;
        height: 18px;
      }

      .resize-handle.top-left {
        width: 18px;
        height: 18px;
        top: -7px;
        left: -7px;
        cursor: nwse-resize;
      }

      .resize-handle.top-right {
        width: 18px;
        height: 18px;
        top: -7px;
        right: -7px;
        cursor: nesw-resize;
      }

      .resize-handle.bottom-left {
        width: 18px;
        height: 18px;
        bottom: -7px;
        left: -7px;
        cursor: nesw-resize;
      }

      .resize-handle.bottom-right {
        width: 18px;
        height: 18px;
        bottom: -7px;
        right: -7px;
        cursor: nwse-resize;
      }
    

      /* Snipaze theme system: Light is primary, Dark is secondary. */
      .sidebar {
        position: fixed;
        z-index: 2147483599;
        display: grid;
        grid-template-rows: auto 1fr;
        min-width: 340px;
        min-height: 520px;
        overflow: visible;
        border: 1px solid rgba(255, 255, 255, 0.48);
        backdrop-filter: blur(22px) saturate(1.35);
        -webkit-backdrop-filter: blur(22px) saturate(1.35);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        opacity: 0;
        pointer-events: none;
        transform: translateX(22px) scale(0.98);
        transition: opacity 180ms ease, transform 180ms ease;
        border-radius: 24px;
        background: linear-gradient(180deg, #ffffff 0%, #f7f9fd 100%);
        box-shadow: var(--snip-shadow);
        color: var(--snip-text);
        border-color: rgba(203, 213, 225, 0.95);
        --snip-bg: #f7f9fd;
        --snip-panel: #ffffff;
        --snip-panel-soft: #f8fbff;
        --snip-card: rgba(255, 255, 255, 0.94);
        --snip-card-strong: #ffffff;
        --snip-text: #102033;
        --snip-muted: #64748b;
        --snip-border: #dbe7f5;
        --snip-border-strong: #93a9d6;
        --snip-primary: #6d5dfc;
        --snip-primary-2: #2563eb;
        --snip-action: #0f9f8f;
        --snip-shadow: 0 20px 60px rgba(15, 23, 42, 0.14);
        --snip-card-shadow: 0 10px 26px rgba(15, 23, 42, 0.08);
      }

      .sidebar:not(.light-theme) {
        --snip-bg: #07111f;
        --snip-panel: #0d1a2e;
        --snip-panel-soft: #0b1628;
        --snip-card: rgba(18, 33, 58, 0.92);
        --snip-card-strong: #12213a;
        --snip-text: #f8fafc;
        --snip-muted: #94a3b8;
        --snip-border: rgba(148, 163, 184, 0.22);
        --snip-border-strong: rgba(125, 183, 255, 0.34);
        --snip-primary: #8b5cf6;
        --snip-primary-2: #3b82f6;
        --snip-action: #14b8a6;
        --snip-shadow: 0 26px 80px rgba(0, 0, 0, 0.42);
        --snip-card-shadow: 0 14px 40px rgba(0, 0, 0, 0.28);
        background: linear-gradient(180deg, #081323 0%, #07111f 100%);
        border-color: rgba(125, 183, 255, 0.24);
        color: var(--snip-text);
        box-shadow: var(--snip-shadow);
      }

      .sidebar .header {
        background: linear-gradient(135deg, #eef5ff 0%, #f6f1ff 54%, #eff8ff 100%);
        border-color: var(--snip-border);
        box-shadow: 0 10px 28px rgba(37, 99, 235, 0.10);
      }

      .sidebar:not(.light-theme) .header {
        background:
          radial-gradient(circle at 18% 0%, rgba(59, 130, 246, 0.28), transparent 34%),
          radial-gradient(circle at 82% 0%, rgba(139, 92, 246, 0.26), transparent 36%),
          linear-gradient(135deg, #0c1b31 0%, #111a3d 54%, #07111f 100%);
        border-color: var(--snip-border);
        box-shadow: 0 16px 44px rgba(0, 0, 0, 0.28);
      }

      .sidebar .brand-name { color: var(--snip-text); text-shadow: none; }
      .sidebar .brand-desc { color: var(--snip-muted); text-shadow: none; text-transform: none; }
      .sidebar:not(.light-theme) .brand-desc { color: rgba(226, 232, 240, 0.78); }

      .sidebar .tool,
      .sidebar .search-wrap,
      .sidebar .filter-control,
      .sidebar .category-toggle,
      .sidebar .stat-card,
      .sidebar .note-card,
      .sidebar .setting-row,
      .sidebar .settings-group,
      .sidebar .support-tile {
        background: var(--snip-card);
        border-color: var(--snip-border);
        color: var(--snip-text);
        box-shadow: var(--snip-card-shadow);
      }

      .sidebar:not(.light-theme) .tool,
      .sidebar:not(.light-theme) .search-wrap,
      .sidebar:not(.light-theme) .filter-control,
      .sidebar:not(.light-theme) .category-toggle,
      .sidebar:not(.light-theme) .stat-card,
      .sidebar:not(.light-theme) .note-card,
      .sidebar:not(.light-theme) .setting-row,
      .sidebar:not(.light-theme) .settings-group,
      .sidebar:not(.light-theme) .support-tile {
        box-shadow: none;
      }

      .sidebar .content { background: var(--snip-bg); color: var(--snip-text); }
      .sidebar .search-input,
      .sidebar input,
      .sidebar textarea,
      .sidebar select {
        background: var(--snip-card-strong);
        border-color: var(--snip-border);
        color: var(--snip-text);
      }

      .sidebar .search-input::placeholder,
      .sidebar input::placeholder,
      .sidebar textarea::placeholder,
      .sidebar small,
      .sidebar .muted,
      .sidebar .setting-row small,
      .sidebar .stat-card small,
      .sidebar .category-toggle small {
        color: var(--snip-muted);
      }

      .sidebar .save-link-action,
      .sidebar .category-add,
      .sidebar .structured-edit-toggle,
      .sidebar .primary-action {
        background: linear-gradient(135deg, var(--snip-primary-2), var(--snip-primary));
        border-color: rgba(255, 255, 255, 0.34);
        color: #ffffff;
        box-shadow: 0 10px 24px rgba(79, 70, 229, 0.22);
      }

      .sidebar .stat-card strong,
      .sidebar .category-count,
      .sidebar .note-count {
        color: var(--snip-primary);
      }

      /* Snipaze light theme final polish layer */

      .sidebar.light-theme .header::before {
        background: linear-gradient(90deg, rgba(37, 99, 235, 0.05), transparent 45%, rgba(109, 93, 252, 0.06));
      }

      .sidebar.light-theme .brand-name,
      .sidebar.light-theme h2,
      .sidebar.light-theme .section-title,
      .sidebar.light-theme .category-title-text,
      .sidebar.light-theme .category-name,
      .sidebar.light-theme .stat-card span:not(.stat-icon),
      .sidebar.light-theme .tool strong,
      .sidebar.light-theme .save-link-action strong {
        color: #102033;
        text-shadow: none;
      }

      .sidebar.light-theme .brand-desc,
      .sidebar.light-theme p,
      .sidebar.light-theme label,
      .sidebar.light-theme small,
      .sidebar.light-theme .tool small,
      .sidebar.light-theme .save-link-action small,
      .sidebar.light-theme .category-toggle small,
      .sidebar.light-theme .stat-card small {
        color: #475569;
        text-shadow: none;
      }

      .chip-icon:hover,
      .mini-title:hover,
      .note-title-button:hover,
      .sidebar:not(.light-theme) .brand-name,
      .sidebar.light-theme .save-link-action strong,
      .sidebar.light-theme .save-link-action small {
        color: #ffffff;
      }

      .sidebar.light-theme .filter-control,
      .sidebar.light-theme .filter-select,
      .sidebar.light-theme .category-toggle,
      .sidebar.light-theme .stat-card,
      .sidebar.light-theme .note-card,
      .sidebar.light-theme .settings-group,
      .sidebar.light-theme .setting-row,
      .sidebar.light-theme .support-tile {
        background: #ffffff;
        border: 1px solid var(--snip-border-strong);
        color: #102033;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
      }

      .sidebar.light-theme .settings-group {
        border-color: rgba(59, 130, 246, 0.18);
        background: #ffffff;
        border: 1px solid var(--snip-border-strong);
        color: #102033;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
      }

      .sidebar.light-theme .support-tile,
      .sidebar.light-theme .setting-row {
        background: #ffffff;
        color: #102033;
        border: 1px solid var(--snip-border-strong);
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
      }

      .sidebar.light-theme .section-header,
      .sidebar.light-theme .workspace-header {
        color: #102033;
      }

      .sidebar.light-theme .stat-icon {
        background: #eef2ff;
        color: #6d5dfc;
      }

      .sidebar.light-theme .stat-today {
        background: #eafaf1;
        color: #20b978;
      }

      .sidebar.light-theme .stat-pinned {
        background: #fff3e6;
        color: #f97316;
      }

      .sidebar.light-theme .stat-drive {
        background: #edf5ff;
        color: #2563eb;
      }

      .sidebar.light-theme .stat-card:has(.stat-today) strong { color: #20b978; }
      .sidebar.light-theme .stat-card:has(.stat-pinned) strong { color: #f97316; }
      .sidebar.light-theme .stat-card:has(.stat-drive) strong { color: #2563eb; }

      .sidebar.light-theme .category-list,
      .sidebar.light-theme .category-group,
      .sidebar.light-theme .category-select {
        background: #ffffff;
        color: #102033;
        border-color: var(--snip-border-strong);
      }

      /* Removed breakpoint block 2026-07-08 to keep side-panel resizing stable. */


      /* Snipaze light theme layout repair */
      .sidebar.light-theme ~ .launcher.active,
      .launcher.active {
        opacity: 0;
        pointer-events: none;
      }
      .launcher.active {
        transform: translateY(-1px) scale(1.03);
        box-shadow: 0 22px 58px rgba(15, 23, 42, 0.38);
        opacity: 0;
        pointer-events: none;
      }

      .sidebar.light-theme .category-count,
      .sidebar.light-theme .stat-card strong,
      .sidebar.light-theme .chip-icon::before,
      .sidebar.light-theme .category-export summary::before,
      .sidebar.light-theme .note-export-menu summary::before {
        color: #6d5dfc;
      }

      .sidebar.light-theme .category-empty {
        color: #64748b;
        background: #ffffff;
        border-color: var(--snip-border-strong);
      }

      .sidebar.light-theme .empty-state {
        color: #64748b;
        border-color: var(--snip-border-strong);
      }

      /* Removed breakpoint block 2026-07-08 to keep side-panel resizing stable. */


      /* Snipaze side-panel visual repair 2026-07-08 */

      /* Removed breakpoint block 2026-07-08 to keep side-panel resizing stable. */
      /* Snipaze visible side-panel defect fix 2026-07-08 */

      .sidebar.light-theme .category-add::after {
        content: "" !important;
        display: none !important;
      }

      /* Snipaze header polish 2026-07-08 */

      .sidebar.light-theme .header::after {
        content: "";
        position: absolute;
        background: linear-gradient(90deg, transparent, rgba(109, 93, 252, 0.22), transparent);
      }

      .sidebar.light-theme .brand-mark {
        box-shadow: 0 10px 22px rgba(79, 70, 229, 0.20);
      }

      .sidebar.light-theme .brand-name {
        color: #102033;
        text-shadow: none;
      }

      .sidebar.light-theme .brand-desc {
        text-shadow: none;
        color: #475569;
      }

      .sidebar.light-theme .header-actions .icon-tool {
        color: #102033;
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid var(--snip-border-strong);
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
      }

      .sidebar.light-theme .header-actions .icon-tool:hover {
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
      }

      .sidebar.light-theme .auto-save-control .switch-track {
        transform-origin: left center;
      }

      /* Removed breakpoint block 2026-07-08 to keep side-panel resizing stable. */
      /* Snipaze compact vertical spacing 2026-07-08 */
      .sidebar.light-theme .header {
        box-shadow: none;
        background: linear-gradient(135deg, #ffffff 0%, #f8fbff 48%, #f1f5ff 100%);
        border-bottom: 1px solid rgba(219, 231, 245, 0.9);
      }

      .sidebar.light-theme .tool-row {
        display: grid;
      }

      .sidebar.light-theme .content {
        background: radial-gradient(560px 200px at 15% 0%, rgba(109, 93, 252, 0.1), transparent 60%), linear-gradient(160deg, #f1f0fb 0%, #eef2fc 45%, #f8f9fe 100%);
        color: #102033;
      }

      /* Removed breakpoint block 2026-07-08 to keep side-panel resizing stable. */
      /* Snipaze search filters final fix 2026-07-08 */

      .sidebar.light-theme .search-input:focus {
        border: 0 !important;
        box-shadow: none !important;
      }

      /* Removed breakpoint block 2026-07-08 to keep side-panel resizing stable. */
      /* Snipaze overlap hard reset 2026-07-08 */

      /* Removed breakpoint block 2026-07-08 to keep side-panel resizing stable. */
      /* Snipaze search tone fix 2026-07-08 */
      /* Snipaze search placeholder caret clarity 2026-07-08 */

      .sidebar.light-theme .search-input::placeholder {
        color: #b7c2d3;
        opacity: 1;
      }
      /* Snipaze search caret first-letter fix 2026-07-08 */
      /* Snipaze first caret visibility hard fix 2026-07-08 */

      .sidebar.light-theme .search-wrap:focus-within .search-input {
        color: #102033;
        caret-color: #020617;
      }
      /* Snipaze focused search placeholder fade 2026-07-08 */

      .sidebar.light-theme .search-input:focus::placeholder,
      .sidebar.light-theme .search-wrap:focus-within .search-input::placeholder {
        color: transparent !important;
        opacity: 0 !important;
      }
      /* Snipaze compact search caret final 2026-07-08 */
      .sidebar.light-theme .search-wrap {
        background: #ffffff;
        border: 1px solid var(--snip-border-strong);
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.055);
        border-radius: 14px;
      }

      .sidebar.light-theme .filter-control {
        background: #ffffff;
        border: 1px solid var(--snip-border-strong);
        color: #102033;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
      }

      /* Removed breakpoint block 2026-07-08 to keep side-panel resizing stable. */
      /* Snipaze light notes readability fix 2026-07-08 */
      .sidebar.light-theme .note-card,
      .sidebar.light-theme .note-list-row {
        background: rgba(255, 255, 255, 0.94) !important;
        border-color: rgba(203, 213, 225, 0.9) !important;
      }
      .sidebar.light-theme .note-card {
        border: 1px solid var(--snip-border-strong);
        color: #102033;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
        background: rgba(255, 255, 255, 0.94) !important;
        border-color: rgba(203, 213, 225, 0.9) !important;
      }

      .sidebar.light-theme .note-card h3,
      .sidebar.light-theme .note-list-row h3,
      .sidebar.light-theme .note-title-button,
      .sidebar.light-theme .mini-title {
        color: #102033 !important;
        opacity: 1 !important;
        text-shadow: none !important;
      }

      .sidebar.light-theme .note-card:hover h3,
      .sidebar.light-theme .note-list-row:hover h3,
      .sidebar.light-theme .note-title-button:hover,
      .sidebar.light-theme .mini-title:hover {
        color: #0f172a !important;
      }
      /* Snipaze category workspace card polish 2026-07-08 */

      /* Removed breakpoint block 2026-07-08 to keep side-panel resizing stable. */
      /* Snipaze category subtitle alignment fix 2026-07-08 */

      /* Removed breakpoint block 2026-07-08 to keep side-panel resizing stable. */
      /* Snipaze simple folder icon and category list visibility fix 2026-07-08 */

      .sidebar.light-theme .categories-block {
        background: #ffffff;
        border: 1px solid var(--snip-border-strong);
        border-radius: 14px;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
      }
      /* Snipaze category row icon and spacing final fix 2026-07-08 */
      .sidebar.light-theme .category-inline-actions,
      .sidebar.light-theme .category-actions {
        display: inline-flex;
        opacity: 1;
      }

      .sidebar.light-theme .category-note-add,
      .sidebar.light-theme .category-export summary,
      .sidebar.light-theme .note-export-menu summary,
      .sidebar.light-theme .chip-icon {
        border: 1px solid #d9ddff;
        background: #f0eeff;
        color: #6d5dfc;
        box-shadow: none;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .sidebar.light-theme .category-export summary::before,
      .sidebar.light-theme .note-export-menu summary::before {
        display: block !important;
        font: 900 16px/1 Inter, ui-sans-serif, system-ui, sans-serif !important;
        color: #6d5dfc !important;
        content: "\21E9";
      }

      .sidebar.light-theme .chip-icon::before {
        display: block !important;
        font: 900 13px/1 Inter, ui-sans-serif, system-ui, sans-serif !important;
        color: #6d5dfc !important;
      }

      .sidebar.light-theme .chip-icon[data-action="rename-category"]::before {
        content: "\270E" !important;
      }

      .sidebar.light-theme .chip-icon[data-action="delete-category"]::before {
        color: #ef4444 !important;
        content: "\2715" !important;
      }

      .sidebar.light-theme .category-mini-note {
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid rgba(203, 213, 225, 0.9);
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
      }

      .sidebar.light-theme .category-mini-note:hover {
        background: #f0eeff;
        border-color: rgba(109, 93, 252, 0.35);
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
      }

      .sidebar.light-theme .mini-menu summary,
      .sidebar.light-theme .note-menu summary {
        border: 1px solid #d9ddff;
        background: #f0eeff;
        color: #6d5dfc;
      }
      /* Snipaze category one-line row fix 2026-07-08 */

      /* Removed breakpoint block 2026-07-08 to keep side-panel resizing stable. */
      /* Snipaze category row always-inline responsive fix 2026-07-08 */

      .sidebar.light-theme .category-inline-actions {
        opacity: 1;
        display: inline-flex !important;
      }

      /* Removed breakpoint block 2026-07-08 to keep side-panel resizing stable. */

      /* Removed breakpoint block 2026-07-08 to keep side-panel resizing stable. */
      /* Snipaze shrink layout filter and category header fix 2026-07-08 */
      /* Removed breakpoint block 2026-07-08 to keep side-panel resizing stable. */

      /* Removed breakpoint block 2026-07-08 to keep side-panel resizing stable. */
      /* Snipaze compact categories header controls 2026-07-08 */

      /* Removed breakpoint block 2026-07-08 to keep side-panel resizing stable. */
      /* Snipaze unified compact categories header size 2026-07-08 */
      /* Snipaze final robust shrink layout fix 2026-07-08 */

      .sidebar.light-theme .section-icon.folder-icon::before {
        border-top-width: 8px;
        content: "" !important;
        border: 2px solid currentColor !important;
        position: absolute !important;
        border-top-left-radius: 5px !important;
        border-top-right-radius: 4px !important;
        border-bottom-left-radius: 5px !important;
        border-bottom-right-radius: 5px !important;
        background: transparent !important;
      }

      .sidebar.light-theme .filters {
        display: grid !important;
      }

      /* Removed breakpoint block 2026-07-08 to keep side-panel resizing stable. */
      /* Removed old breakpoint-based resize patches 2026-07-08. Stable guard below is the single resize source. */
      /* Snipaze Chrome-like stable resize final guard 2026-07-08 */
      .sidebar.light-theme {
        background: linear-gradient(180deg, #ffffff 0%, #f7f9fd 100%);
        border: 1px solid var(--snip-border-strong);
        box-shadow: 0 22px 70px rgba(15, 23, 42, 0.16);
        color: #102033;
        --snip-stable-action-h: 46px;
        --snip-stable-icon: 30px;
        --snip-stable-control-font: 12.5px;
        --snip-stable-small-font: 9.5px;
        --snip-stable-heading-font: 18px;
        --snip-stable-body-font: 13px;
      }

      .sidebar.light-theme *,
      .sidebar.light-theme *::before,
      .sidebar.light-theme *::after {
        transition-property: background-color, border-color, box-shadow, opacity, transform !important;
      }

      .sidebar.light-theme .brand-title,
      .sidebar.light-theme .brand-subtitle,
      .sidebar.light-theme .tool.compact-action,
      .sidebar.light-theme .tool.compact-action strong,
      .sidebar.light-theme .tool.compact-action small,
      .sidebar.light-theme .compact-action .tile-icon,
      .sidebar.light-theme .save-link-action,
      .sidebar.light-theme .save-link-action strong,
      .sidebar.light-theme .save-link-action small,
      .sidebar.light-theme .search-input,
      .sidebar.light-theme .search-placeholder,
      .sidebar.light-theme .filter-shell,
      .sidebar.light-theme .filter-select,
      .sidebar.light-theme .filter-icon,
      .sidebar.light-theme .notes-heading,
      .sidebar.light-theme .notes-heading h2,
      .sidebar.light-theme [data-recent-toggle],
      .sidebar.light-theme .category-head,
      .sidebar.light-theme .section-icon.folder-icon,
      .sidebar.light-theme .category-title-text,
      .sidebar.light-theme .category-count,
      .sidebar.light-theme .category-toggle small,
      .sidebar.light-theme .category-add,
      .sidebar.light-theme .category-name,
      .sidebar.light-theme .category-note-count,
      .sidebar.light-theme .category-actions button,
      .sidebar.light-theme .stat-card,
      .sidebar.light-theme .stat-card strong,
      .sidebar.light-theme .stat-card span:not(.stat-icon),
      .sidebar.light-theme .stat-card small {
        transition: none !important;
      }

      .sidebar.light-theme .search-input {
        background: transparent !important;
        border: 0 !important;
        outline: 0;
        box-shadow: none !important;
        color: #475569;
        caret-color: #020617;
        transition: none !important;
      }

      .sidebar.light-theme .tool.compact-action small {
        display: block;
        color: #64748b;
        transition: none !important;
      }

      .sidebar.light-theme .tool.compact-action strong {
        display: block;
        color: #102033;
        transition: none !important;
      }

      .sidebar.light-theme .tool.compact-action {
        background: #ffffff;
        border: 1px solid var(--snip-border-strong);
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.065);
        transition: none !important;
      }

      .sidebar.light-theme .compact-action .tile-icon {
        background: #eef6ff;
        color: #2f8df6;
        transition: none !important;
      }

      .sidebar.light-theme .note-body {
        color: #102033;
      }

      .sidebar.light-theme .focused-note .note-body {
        background: #ffffff;
        border-color: var(--snip-border-strong);
      }

      .sidebar.light-theme .note-body a {
        color: #2563eb;
        border-bottom-color: rgba(37, 99, 235, 0.34);
      }

      .sidebar.light-theme .note-body a:hover {
        color: #1d4ed8;
        border-bottom-color: rgba(29, 78, 216, 0.72);
      }

      .sidebar.light-theme .source-snippet {
        border-top-color: #38bdf8;
        border-bottom-color: #38bdf8;
        border-left-color: #14b8a6;
        background: #eafbfa;
      }

      .sidebar.light-theme .source-meta {
        color: #475569;
        border-left-color: rgba(109, 93, 252, 0.45);
      }

      .sidebar.light-theme .save-link-action strong,
      .sidebar.light-theme .save-link-action small,
      .sidebar.light-theme .save-link-action {
        background: linear-gradient(135deg, #2563eb, #7548f8);
        color: #ffffff;
        box-shadow: 0 12px 26px rgba(79, 70, 229, 0.24);
        transition: none !important;
      }

      .sidebar.light-theme .save-link-action strong {
        text-shadow: none;
        color: #ffffff;
        transition: none !important;
      }

      .sidebar.light-theme .save-link-action small {
        text-shadow: none;
        color: #ffffff;
        transition: none !important;
      }

      .sidebar.light-theme .filter-shell {
        background: #ffffff;
        border: 1px solid var(--snip-border-strong);
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.055);
        transition: none !important;
        border-radius: 14px;
      }

      .sidebar.light-theme .filter-shell .filter-icon {
        pointer-events: none;
      }

      .sidebar.light-theme .filter-select {
        color: #102033;
        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
        transition: none !important;
      }

      .sidebar.light-theme .notes-heading {
        transition: none !important;
        display: flex !important;
      }

      .sidebar.light-theme .notes-heading h2 {
        color: #102033;
        transition: none !important;
      }

      .sidebar.light-theme [data-recent-toggle] {
        color: #6d5dfc;
        background: rgba(109, 93, 252, 0.1);
        border: 0;
        box-shadow: none;
        transition: none !important;
      }

      .sidebar.light-theme .category-head {
        color: #102033;
        transition: none !important;
        display: grid !important;
      }

      .sidebar.light-theme .section-icon.folder-icon {
        display: grid;
        background: #fff7ed !important;
        color: #f59e0b !important;
        border: 1.8px solid #f59e0b !important;
        position: relative !important;
        transition: none !important;
      }

      .sidebar.light-theme .category-toggle {
        background: transparent;
        border: 0;
        color: #102033;
        box-shadow: none;
      }

      .sidebar.light-theme .category-title-line {
        display: flex !important;
      }

      .sidebar.light-theme .category-title-text {
        color: #102033;
        text-shadow: none;
        transition: none !important;
      }

      .sidebar.light-theme .category-count {
        color: #6d5dfc;
        transition: none !important;
      }

      .sidebar.light-theme .category-toggle small {
        text-shadow: none;
        display: block !important;
        color: #475569 !important;
        transition: none !important;
      }

      .sidebar.light-theme .category-add {
        background: linear-gradient(135deg, #6d5dfc, #5b35e8);
        color: #ffffff;
        box-shadow: 0 4px 10px rgba(109, 93, 252, 0.16);
        display: inline-flex;
        transition: none !important;
      }

      .sidebar.light-theme .category-row {
        display: grid !important;
      }

      .sidebar.light-theme .category-name {
        text-shadow: none;
        color: #102033;
        transition: none !important;
      }

      .sidebar.light-theme .category-actions,
      .sidebar.light-theme .category-row-actions {
        display: flex !important;
      }

      .sidebar.light-theme .category-actions button {
        transition: none !important;
      }

      .sidebar.light-theme .stat-card {
        border: 1px solid var(--snip-border-strong);
        color: #102033;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
        background: #ffffff;
        transition: none !important;
      }

      .sidebar.light-theme .stat-card strong {
        color: #6d5dfc;
        transition: none !important;
      }

      .sidebar.light-theme .stat-card span:not(.stat-icon) {
        color: #102033;
        text-shadow: none;
        transition: none !important;
      }

      .sidebar.light-theme .stat-card small {
        color: #475569;
        text-shadow: none;
        transition: none !important;
      }

      /* Snipaze compact category and note rows 2026-07-08 */
      .sidebar.light-theme .category-list.expanded {
        display: grid;
      }

      .sidebar.light-theme .category-group {
        color: #102033;
        border-color: var(--snip-border-strong);
        box-shadow: none;
      }

      .sidebar.light-theme .category-select {
        border-color: var(--snip-border-strong);
        color: #102033;
        box-shadow: none;
        contain: none;
        border: 1px solid var(--snip-border-strong) !important;
        background: #ffffff;
      }

      .sidebar.light-theme .category-select:hover,
      .sidebar.light-theme .category-select.active {
        background: #f0eeff;
        border-color: rgba(109, 93, 252, 0.42) !important;
        box-shadow: 0 0 0 2px rgba(109, 93, 252, 0.1), 0 8px 18px rgba(15, 23, 42, 0.08);
      }

      .sidebar.light-theme .category-note-count {
        background: #eaf2ff;
        color: #2563eb;
        transition: none !important;
      }

      .sidebar.light-theme .category-actions {
        opacity: 1;
        display: inline-flex !important;
      }

      .sidebar.light-theme .category-note-add {
        border: 1px solid #d9ddff;
        background: #f0eeff;
        box-shadow: none;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #6d5dfc !important;
      }

      .sidebar.light-theme .chip-icon,
      .sidebar.light-theme .category-export summary,
      .sidebar.light-theme .note-export-menu summary {
        border: 1px solid #d9ddff;
        background: #f0eeff;
        box-shadow: none;
        color: #6d5dfc;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .sidebar.light-theme .category-note-list {
        display: grid !important;
      }

      .sidebar.light-theme .note-list-row {
        border-color: rgba(203, 213, 225, 0.9) !important;
        display: grid !important;
        border: 1px solid var(--snip-border-strong) !important;
        background: #ffffff !important;
      }

      .sidebar.light-theme .note-list-row .note-actions {
        display: inline-flex !important;
      }

      .sidebar.light-theme .note-title-button,
      .sidebar.light-theme .note-list-row h3,
      .sidebar.light-theme .note-title-button,
      .sidebar.light-theme .note-list-row h3 {
        color: #102033 !important;
      }

      .sidebar.light-theme .note-list-row h3,
      .sidebar.light-theme .note-title-button {
        opacity: 1 !important;
        text-shadow: none !important;
        color: #102033 !important;
      }

      .sidebar.light-theme .note-created-time,
      .sidebar.light-theme .note-list-row small,
      .sidebar.light-theme .note-created-time,
      .sidebar.light-theme .note-list-row small,
      .sidebar.light-theme .note-list-row small {
        color: #64748b !important;
      }

      .sidebar.light-theme .note-created-time {
        opacity: 1 !important;
        color: #64748b !important;
      }`;
