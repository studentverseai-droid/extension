"use strict";

globalThis.SnipazeSettingsThemeStyles = String.raw`
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
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        align-items: stretch;
        gap: 12px;
      }
      /* Removed settings container breakpoint 2026-07-08; auto-fit grid resizes smoothly. */

      .settings-group h3 {
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

      button.setting-row:hover {
        border-color: rgba(129, 140, 248, 0.38);
        background: rgba(99, 102, 241, 0.2);
      }

      .setting-row input {
        width: 38px;
        height: 20px;
        accent-color: #8b5cf6;
      }

      .setting-row input[type="text"] {
        width: auto;
        flex: 1;
        max-width: 160px;
        height: auto;
        padding: 4px 8px;
        border-radius: 6px;
        border: 1px solid rgba(148, 163, 184, 0.3);
        background: rgba(15, 23, 42, 0.4);
        color: #e0e7ff;
        font: inherit;
        text-align: right;
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

      button.setting-row-disabled:hover {
        border-color: rgba(148, 163, 184, 0.16);
        background: rgba(15, 23, 42, 0.24);
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

      .settings-export-menu summary::-webkit-details-marker {
        display: none;
      }

      .settings-export-menu summary:hover,
      .settings-export-menu[open] summary {
        border-color: rgba(129, 140, 248, 0.46);
        background: rgba(99, 102, 241, 0.2);
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

      .support-tile:hover {
        border-color: rgba(129, 140, 248, 0.38);
        background: rgba(99, 102, 241, 0.2);
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

      .support-brand-copy > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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

      .sidebar.light-theme .setting-row {
        background: rgba(255, 255, 255, 0.72);
        color: #1e293b;
      }

      .sidebar.light-theme button.setting-row-disabled:hover {
        background: rgba(255, 255, 255, 0.72);
      }

      .sidebar.light-theme .support-tile,
      .sidebar.light-theme .support-footer-actions button {
        background: rgba(255, 255, 255, 0.72);
        color: #1e293b;
      }

      .sidebar.light-theme .support-tile-icon {
        background: #eef6ff;
        color: #2f8df6;
      }

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

      .sidebar.light-theme .settings-group {
        background: rgba(255, 255, 255, 0.62);
        border-color: rgba(59, 130, 246, 0.18);
      }

      .sidebar.light-theme .storage-usage div,
      .sidebar.light-theme .support-brand {
        color: #334155;
      }
`;
