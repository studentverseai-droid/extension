"use strict";

globalThis.SnipazeCaptureModalStyles = function SnipazeCaptureModalStyles(rootId, copyPickerRootId, captureInsertPickerRootId) {
  return String.raw`      
      #${rootId}, #${rootId} *,
      #${copyPickerRootId}, #${copyPickerRootId} *,
      #${captureInsertPickerRootId}, #${captureInsertPickerRootId} * {
        box-sizing: border-box;
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: 0;
      }

      #${rootId} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
      }

      .snipaze-reload-copy-notice {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
        max-width: 360px;
        border: 1px solid #fecaca;
        border-radius: 10px;
        background: #fff7ed;
        box-shadow: 0 12px 35px rgba(0, 0, 0, 0.25);
        color: #b91c1c;
        font: 700 14px/1.4 system-ui, sans-serif;
        padding: 12px 16px;
      }

      #${rootId}.snip-ocr-insert-picker-open {
        pointer-events: none;
      }

      .snip-ocr-shade {
        position: fixed;
        inset: 0;
        background: rgba(6, 13, 24, 0.34);
        cursor: crosshair;
      }

      .snip-ocr-box {
        position: fixed;
        width: 0;
        height: 0;
        border: 2px solid #23c9a9;
        background: rgba(35, 201, 169, 0.12);
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.16), 0 10px 36px rgba(0, 0, 0, 0.22);
        pointer-events: none;
      }

      .snip-ocr-hint {
        position: fixed;
        left: 50%;
        top: 18px;
        transform: translateX(-50%);
        max-width: min(420px, calc(100vw - 32px));
        padding: 8px 12px;
        border-radius: 6px;
        background: #111827;
        color: #f9fafb;
        font-size: 13px;
        line-height: 1.35;
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
        pointer-events: none;
        white-space: normal;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .snip-ocr-cancel {
        border: 1px solid rgba(255, 255, 255, 0.28);
        border-radius: 5px;
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
        cursor: pointer;
        padding: 4px 9px;
        font-size: 12px;
        font-weight: 700;
        pointer-events: auto;
      }

      .snip-ocr-cancel:hover { background: rgba(255, 255, 255, 0.22); }

      .snip-ocr-busy .snip-ocr-shade {
        cursor: wait;
      }

      .snip-ocr-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(7, 12, 22, 0.42);
      }

      #snip-ocr-root.snip-ocr-backgrounded .snip-ocr-modal-backdrop {
        pointer-events: none;
        background: transparent;
      }

      #snip-ocr-root.snip-ocr-minimized .snip-ocr-modal-backdrop {
        display: none;
      }

      #snip-ocr-root.snip-ocr-backgrounded .snip-ocr-modal {
        opacity: 0.72;
        transform: translateY(8px) scale(0.96);
        z-index: 2147483500;
      }

      .snip-ocr-modal {
        position: fixed;
        right: clamp(12px, 3vw, 22px);
        top: clamp(12px, 3vh, 22px);
        width: min(460px, calc(100vw - 24px));
        max-height: min(560px, calc(100vh - 24px));
        display: grid;
        grid-template-rows: auto auto minmax(96px, auto) auto;
        overflow: auto;
        border: 1px solid rgba(17, 24, 39, 0.14);
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
        transition: opacity 160ms ease, transform 160ms ease, width 160ms ease, max-height 160ms ease;
      }

      #snip-ocr-root.snip-ocr-minimized .snip-ocr-modal {
        width: min(320px, calc(100vw - 32px));
        max-height: 56px;
        overflow: hidden;
        transform: translateY(0) scale(1);
        opacity: 1;
      }

      #snip-ocr-root.snip-ocr-minimized .snip-ocr-result-image,
      #snip-ocr-root.snip-ocr-minimized .snip-ocr-text,
      #snip-ocr-root.snip-ocr-minimized .snip-ocr-footer,
      #snip-ocr-root.snip-ocr-minimized .snip-ocr-note-picker {
        display: none;
      }

      .snip-ocr-modal-header,
      .snip-ocr-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px;
      }

      .snip-ocr-modal-header {
        border-bottom: 1px solid #e5e7eb;
      }

      #snip-ocr-root.snip-ocr-minimized .snip-ocr-modal-header {
        border-bottom: 0;
      }

      .snip-ocr-title-group { display: flex; align-items: center; gap: 8px; min-width: 0; }

      .snip-ocr-confidence {
        border-radius: 999px;
        padding: 3px 7px;
        font-size: 10px;
        font-weight: 800;
        white-space: nowrap;
      }

      .snip-ocr-confidence[data-level="high"] { background: #dcfce7; color: #166534; }
      .snip-ocr-confidence[data-level="review"] { background: #fef3c7; color: #92400e; }

      .snip-ocr-title {
        color: #111827;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.2;
      }

      .snip-ocr-header-actions {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .snip-ocr-icon-button {
        width: 30px;
        height: 30px;
        display: inline-grid;
        place-items: center;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: #374151;
        cursor: pointer;
        font-size: 24px;
        line-height: 1;
      }

      .snip-ocr-icon-button:hover {
        background: #f3f4f6;
      }

      .snip-ocr-restore {
        display: none;
      }

      #snip-ocr-root.snip-ocr-minimized .snip-ocr-minimize {
        display: none;
      }

      #snip-ocr-root.snip-ocr-minimized .snip-ocr-restore {
        display: inline-grid;
      }

      .snip-ocr-text {
        width: 100%;
        min-height: 104px;
        max-height: 220px;
        resize: vertical;
        border: 0;
        outline: 0;
        padding: 12px;
        color: #111827;
        background: #ffffff;
        font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      }

      .snip-ocr-result-image {
        width: auto;
        max-width: min(100%, 340px);
        max-height: min(190px, calc(100vh - 260px));
        justify-self: center;
        object-fit: contain;
        background: #111827;
        border-bottom: 1px solid #e5e7eb;
      }

      .snip-ocr-footer {
        display: flex;
        flex-wrap: nowrap;
        gap: 8px;
        justify-content: flex-end;
        overflow-x: auto;
        white-space: nowrap;
        border-top: 1px solid #e5e7eb;
        background: #f9fafb;
      }

      .snip-ocr-insert-choice {
        height: 34px;
        flex: 1 1 170px;
        min-width: 150px;
        max-width: 190px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: #ffffff;
        color: #111827;
        padding: 0 8px;
        font-size: 13px;
      }

      .snip-ocr-insert-choice[hidden] {
        display: none;
      }

      .snip-ocr-copy {
        flex: 0 0 auto;
        min-width: 74px;
        height: 34px;
        border: 0;
        border-radius: 6px;
        background: #0f766e;
        color: #ffffff;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
      }

      .snip-ocr-copy:hover {
        background: #115e59;
      }

      .snip-ocr-note-picker {
        display: grid;
        gap: 8px;
        max-height: 190px;
        overflow: auto;
        border-top: 1px solid #e5e7eb;
        background: #ffffff;
        padding: 10px 12px 12px;
      }

      .snip-ocr-note-picker[hidden] {
        display: none;
      }

      .snip-ocr-note-picker-title,
      .snip-ocr-note-picker-empty {
        color: #374151;
        font-size: 12px;
        font-weight: 800;
      }

      .snip-ocr-note-picker-list {
        display: grid;
        gap: 6px;
      }

      .snip-ocr-note-picker-list button {
        min-height: 32px;
        border: 1px solid #d1d5db;
        border-radius: 7px;
        background: #f9fafb;
        color: #111827;
        cursor: pointer;
        padding: 0 10px;
        text-align: left;
        font: 700 12px/1 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .snip-ocr-note-picker-list button:hover {
        border-color: #0f766e;
        background: #ecfdf5;
      }

      #snip-ocr-copy-picker-root,
      #snip-ocr-capture-insert-picker-root {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: grid;
        place-items: center;
        padding: 18px;
        width: 100vw;
        height: 100vh;
        overflow: auto;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .snip-ocr-copy-picker-backdrop {
        position: absolute;
        inset: 0;
        z-index: 0;
        background: rgba(5, 10, 25, 0.34);
        backdrop-filter: blur(8px);
        animation: copyPickerFade 140ms ease both;
      }

      .snip-ocr-copy-picker {
        position: relative;
        z-index: 1;
        width: min(380px, calc(100vw - 28px));
        /* Previous picker height: max-height: min(520px, calc(100vh - 28px)); */
        max-height: min(620px, calc(100vh - 28px));
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
        color: #eef3ff;
        background: linear-gradient(180deg, rgba(25, 35, 68, 0.86), rgba(10, 18, 38, 0.9));
        border: 1px solid rgba(191, 219, 254, 0.24);
        border-radius: 16px;
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(18px);
        animation: copyPickerIn 160ms ease both;
      }

      .snip-ocr-copy-picker-header {
        font-size: 15px;
        line-height: 1.3;
        padding: 2px 2px 0;
      }

      .snip-ocr-copy-picker-list {
        display: grid;
        gap: 8px;
        min-height: 0;
        overflow-y: auto;
        padding-right: 3px;
      }

      .snip-ocr-copy-picker-list button,
      .snip-ocr-copy-picker-cancel {
        width: 100%;
        min-height: 40px;
        border: 1px solid rgba(149, 164, 255, 0.22);
        border-radius: 10px;
        background: linear-gradient(135deg, rgba(79, 70, 229, 0.78), rgba(20, 184, 166, 0.68));
        color: #eef3ff;
        font: 700 13px/1.2 inherit;
        text-align: left;
        cursor: pointer;
        padding: 10px 12px;
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.24);
        transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
      }

      .snip-ocr-copy-picker-list button:hover {
        border-color: rgba(149, 164, 255, 0.5);
      }

      .snip-ocr-copy-picker-list [data-copy-note-id],
      .snip-ocr-copy-picker-list [data-capture-insert-note-id] {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
      }

      .snip-ocr-picker-note-main {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .snip-ocr-picker-note-category {
        display: inline-flex;
        align-items: center;
        max-width: 116px;
        min-height: 20px;
        border-radius: 999px;
        padding: 0 8px;
        color: #ffffff;
        font: 800 10px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .snip-ocr-picker-note-category.purple { background: #8b5cf6; }
      .snip-ocr-picker-note-category.green { background: #20c997; }
      .snip-ocr-picker-note-category.red { background: #ff4d4f; }
      .snip-ocr-picker-note-category.blue { background: #4f8df7; }
      .snip-ocr-picker-note-category.amber { background: #fbbf24; }

      .snip-ocr-copy-picker-create {
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.88), rgba(124, 58, 237, 0.78)) !important;
      }

      .snip-ocr-page-reference-note {
        display: grid;
        gap: 6px;
        margin: 0 18px 12px;
        color: #dbeafe;
        font: 800 12px/1.2 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .snip-ocr-page-reference-note textarea {
        width: 100%;
        min-height: 70px;
        resize: vertical;
        border: 1px solid rgba(191, 219, 254, 0.24);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.09);
        color: #f8fafc;
        outline: 0;
        padding: 9px 11px;
        font: 650 13px/1.4 Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .snip-ocr-page-reference-note textarea:focus {
        border-color: rgba(96, 165, 250, 0.72);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
      }

      .snip-ocr-copy-new-note {
        display: grid;
        gap: 10px;
        border: 1px solid rgba(191, 219, 254, 0.16);
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.34);
        padding: 12px;
        animation: copyPickerIn 140ms ease both;
      }

      .snip-ocr-copy-new-note[hidden] {
        display: none;
      }

      .snip-ocr-copy-new-note label {
        /* Previous floating-suggestion experiment disabled:
        position: relative;
        */
        display: grid;
        gap: 6px;
        color: #dbeafe;
        font: 800 12px/1.2 inherit;
      }

      .snip-ocr-copy-new-note input,
      .snip-ocr-copy-new-note select {
        width: 100%;
        height: 38px;
        border: 1px solid rgba(191, 219, 254, 0.24);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.09);
        color: #f8fafc;
        outline: 0;
        padding: 0 11px;
        font: 700 13px/1 inherit;
      }

      .snip-ocr-copy-new-note select {
        color-scheme: dark;
      }

      .snip-ocr-copy-new-note select option {
        background: #111a33;
        color: #f8fafc;
      }

      .snip-ocr-copy-new-note select option:checked {
        background: #3b82f6;
        color: #ffffff;
      }

      .snip-ocr-copy-new-note input:focus,
      .snip-ocr-copy-new-note select:focus {
        border-color: rgba(96, 165, 250, 0.72);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
      }

      .snip-ocr-copy-new-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .snip-ocr-copy-new-actions button {
        min-height: 36px;
        border-radius: 9px;
        text-align: center;
      }

      .snip-ocr-copy-new-actions [data-copy-cancel-create] {
        border-color: rgba(148, 163, 184, 0.22);
        background: rgba(148, 163, 184, 0.12);
        color: #cbd5e1;
        box-shadow: none;
      }

      .snip-ocr-copy-picker-cancel {
        /* Old sticky positioning covered the last note:
        position: sticky;
        bottom: 0;
        z-index: 3;
        */
        flex: 0 0 auto;
        text-align: center;
        margin-top: 4px;
        border-color: rgba(248, 113, 113, 0.26);
        /* Old sticky footer background:
        background: #291426;
        */
        background: rgba(127, 29, 29, 0.18);
        color: #fecaca;
        /* Old sticky footer shadow:
        box-shadow: 0 -8px 18px rgba(7, 12, 22, 0.55);
        */
        box-shadow: none;
      }

      .snip-ocr-copy-picker-cancel:hover {
        border-color: rgba(248, 113, 113, 0.42);
        background: rgba(127, 29, 29, 0.28);
      }

      .snip-ocr-copy-picker-empty {
        color: #aebbf0;
        font: 700 13px/1.4 inherit;
        padding: 8px 2px;
      }

      #${copyPickerRootId}.light-theme .snip-ocr-copy-picker,
      #${captureInsertPickerRootId}.light-theme .snip-ocr-copy-picker {
        color: #102033;
        background: #ffffff;
        border: 1px solid #a9c0dc;
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.6);
      }

      #${copyPickerRootId}.light-theme .snip-ocr-copy-picker-list button,
      #${captureInsertPickerRootId}.light-theme .snip-ocr-copy-picker-list button,
      #${copyPickerRootId}.light-theme .snip-ocr-copy-picker-cancel,
      #${captureInsertPickerRootId}.light-theme .snip-ocr-copy-picker-cancel {
        border-color: #a9c0dc;
        background: #f0eeff;
        color: #102033;
        box-shadow: none;
      }

      #${copyPickerRootId}.light-theme .snip-ocr-copy-picker-list button:hover,
      #${captureInsertPickerRootId}.light-theme .snip-ocr-copy-picker-list button:hover {
        border-color: rgba(109, 93, 252, 0.42);
      }

      #${copyPickerRootId}.light-theme .snip-ocr-copy-picker-create,
      #${captureInsertPickerRootId}.light-theme .snip-ocr-copy-picker-create {
        color: #ffffff;
      }

      #${copyPickerRootId}.light-theme .snip-ocr-page-reference-note,
      #${captureInsertPickerRootId}.light-theme .snip-ocr-page-reference-note {
        color: #102033;
      }

      #${copyPickerRootId}.light-theme .snip-ocr-page-reference-note textarea,
      #${captureInsertPickerRootId}.light-theme .snip-ocr-page-reference-note textarea {
        border-color: #a9c0dc;
        background: #ffffff;
        color: #102033;
      }

      #${copyPickerRootId}.light-theme .snip-ocr-copy-new-note,
      #${captureInsertPickerRootId}.light-theme .snip-ocr-copy-new-note {
        border-color: #a9c0dc;
        background: #f7f9ff;
      }

      #${copyPickerRootId}.light-theme .snip-ocr-copy-new-note label,
      #${captureInsertPickerRootId}.light-theme .snip-ocr-copy-new-note label {
        color: #102033;
      }

      #${copyPickerRootId}.light-theme .snip-ocr-copy-new-note input,
      #${captureInsertPickerRootId}.light-theme .snip-ocr-copy-new-note input,
      #${copyPickerRootId}.light-theme .snip-ocr-copy-new-note select,
      #${captureInsertPickerRootId}.light-theme .snip-ocr-copy-new-note select {
        border-color: #a9c0dc;
        background: #ffffff;
        color: #102033;
      }

      #${copyPickerRootId}.light-theme .snip-ocr-copy-new-note select,
      #${captureInsertPickerRootId}.light-theme .snip-ocr-copy-new-note select {
        color-scheme: light;
      }

      #${copyPickerRootId}.light-theme .snip-ocr-copy-new-note select option,
      #${captureInsertPickerRootId}.light-theme .snip-ocr-copy-new-note select option {
        background: #ffffff;
        color: #102033;
      }

      #${copyPickerRootId}.light-theme .snip-ocr-copy-new-actions [data-copy-cancel-create],
      #${captureInsertPickerRootId}.light-theme .snip-ocr-copy-new-actions [data-copy-cancel-create] {
        border-color: rgba(148, 163, 184, 0.5);
        background: rgba(148, 163, 184, 0.12);
        color: #475569;
      }

      #${copyPickerRootId}.light-theme .snip-ocr-copy-picker-cancel,
      #${captureInsertPickerRootId}.light-theme .snip-ocr-copy-picker-cancel {
        border-color: rgba(239, 68, 68, 0.35);
        background: rgba(254, 226, 226, 0.7);
        color: #b91c1c;
      }

      #${copyPickerRootId}.light-theme .snip-ocr-copy-picker-cancel:hover,
      #${captureInsertPickerRootId}.light-theme .snip-ocr-copy-picker-cancel:hover {
        border-color: rgba(239, 68, 68, 0.55);
        background: rgba(254, 202, 202, 0.9);
      }

      #${copyPickerRootId}.light-theme .snip-ocr-copy-picker-empty,
      #${captureInsertPickerRootId}.light-theme .snip-ocr-copy-picker-empty {
        color: #64748b;
      }

      @keyframes copyPickerFade {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes copyPickerIn {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .snip-ocr-shot-preview {
        position: fixed;
        right: 22px;
        top: 22px;
        width: min(520px, calc(100vw - 32px));
        max-height: min(640px, calc(100vh - 44px));
        display: grid;
        grid-template-rows: minmax(120px, 1fr) auto;
        overflow: hidden;
        border: 1px solid rgba(17, 24, 39, 0.14);
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
      }

      .snip-ocr-shot-image {
        display: block;
        width: 100%;
        max-height: min(520px, calc(100vh - 112px));
        object-fit: contain;
        background: #111827;
      }

      .snip-ocr-shot-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 10px;
        border-top: 1px solid #e5e7eb;
        background: #f9fafb;
      }

      .snip-ocr-shot-button {
        min-width: 72px;
        height: 34px;
        border: 0;
        border-radius: 6px;
        background: #0f766e;
        color: #ffffff;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
      }

      .snip-ocr-shot-button:hover {
        background: #115e59;
      }

      .snip-ocr-shot-danger {
        background: #991b1b;
      }

      .snip-ocr-shot-danger:hover {
        background: #7f1d1d;
      }

      /* Removed capture modal media breakpoint 2026-07-08; base min/calc sizing handles viewport width. */



      .snipaze-duplicate-title-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: grid;
        place-items: center;
        padding: 20px;
        background: rgba(3, 8, 24, .58);
      }

      .snipaze-duplicate-title-panel {
        width: min(440px, 100%);
        padding: 22px;
        border: 1px solid #dbe7f5;
        border-radius: 16px;
        background: #ffffff;
        color: #102033;
        font: 16px/1.45 system-ui, sans-serif;
        box-shadow: 0 24px 70px rgba(15, 23, 42, .24);
      }

      .snipaze-duplicate-title-heading {
        display: block;
        font-size: 19px;
        color: #102033;
        margin-bottom: 8px;
      }

      .snipaze-duplicate-title-select {
        width: 100%;
        margin: 4px 0 18px;
        padding: 11px;
        border: 1px solid #dbe7f5;
        border-radius: 9px;
        background: #ffffff;
        color: #102033;
      }

      .snipaze-duplicate-title-actions {
        display: flex;
        gap: 9px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .snipaze-duplicate-title-button {
        padding: 10px 14px;
        border: 1px solid #dbe7f5;
        border-radius: 9px;
        background: #ffffff;
        color: #102033;
        cursor: pointer;
        font-weight: 800;
      }

      .snipaze-duplicate-title-button.primary {
        border-color: #0f8b83;
        background: #0f817b;
        color: #ffffff;
      }

      .snipaze-picker-title-suggestions {
        display: none;
        gap: 3px;
        max-height: 180px;
        overflow: auto;
        margin-top: 4px;
        padding: 5px;
        border: 1px solid #dbe7f5;
        border-radius: 9px;
        background: #ffffff;
        box-shadow: 0 12px 30px rgba(15, 23, 42, .16);
      }

      .snipaze-picker-title-suggestion {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        width: 100%;
        padding: 8px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: #102033;
        cursor: pointer;
        text-align: left;
      }

      .snipaze-picker-title-suggestion:hover {
        background: #eef2ff;
      }

      .snipaze-picker-title-suggestion-category {
        color: #2563eb;
      }

`;
};
