"use strict";

globalThis.SnipazeReloadGuardStyles = function SnipazeReloadGuardStyles(resultRootId) {
  return String.raw`
      #${resultRootId} { position: fixed !important; inset: 0 !important; z-index: 2147483647 !important; display: block !important; font-family: Inter, "Segoe UI", system-ui, sans-serif !important; color: #182033 !important; }
      .snipaze-reload-copy-notice { position: fixed !important; top: 20px !important; right: 20px !important; z-index: 2147483647 !important; max-width: 360px !important; border: 1px solid #fecaca !important; border-radius: 10px !important; background: #fff7ed !important; box-shadow: 0 12px 35px rgba(0, 0, 0, 0.25) !important; color: #b91c1c !important; font: 700 14px/1.4 system-ui, sans-serif !important; padding: 12px 16px !important; }
      #${resultRootId} .snip-ocr-modal-backdrop { position: fixed !important; inset: 0 !important; display: block !important; background: rgba(7, 15, 35, .58) !important; }
      #${resultRootId} .snip-ocr-modal { position: fixed !important; top: 18px !important; right: 12px !important; width: min(460px, calc(100vw - 24px)) !important; max-height: calc(100vh - 36px) !important; display: flex !important; flex-direction: column !important; overflow: hidden !important; border: 1px solid #cbd5e1 !important; border-radius: 12px !important; background: #fff !important; box-shadow: 0 24px 70px rgba(0,0,0,.38) !important; }
      #${resultRootId} .snip-ocr-modal-header { display: flex !important; align-items: center !important; justify-content: space-between !important; min-height: 62px !important; padding: 0 16px !important; border-bottom: 1px solid #dbe2ea !important; background: #fff !important; }
      #${resultRootId} .snip-ocr-title { color: #182033 !important; font-size: 18px !important; font-weight: 800 !important; }
      #${resultRootId} .snip-ocr-header-actions { display: flex !important; align-items: center !important; gap: 8px !important; }
      #${resultRootId} .snip-ocr-icon-button { width: 38px !important; height: 38px !important; padding: 0 !important; border: 0 !important; border-radius: 8px !important; background: transparent !important; color: #334155 !important; cursor: pointer !important; font-size: 24px !important; }
      #${resultRootId} .snip-ocr-icon-button:hover { background: #f1f5f9 !important; }
      #${resultRootId} .snip-ocr-icon-button.snip-ocr-restore { display: none !important; }
      #${resultRootId} .snip-ocr-text { display: block !important; width: 100% !important; min-height: 145px !important; margin: 0 !important; padding: 20px !important; resize: vertical !important; border: 0 !important; outline: 0 !important; background: #fff !important; color: #1f2937 !important; font: 16px/1.5 Inter, "Segoe UI", system-ui, sans-serif !important; box-sizing: border-box !important; }
      #${resultRootId} .snip-ocr-footer { display: flex !important; align-items: center !important; justify-content: flex-end !important; flex-wrap: nowrap !important; gap: 7px !important; padding: 10px !important; border-top: 1px solid #e2e8f0 !important; background: #f8fafc !important; }
      #${resultRootId} .snip-ocr-copy, #${resultRootId} .snip-ocr-insert-choice { min-height: 34px !important; padding: 0 8px !important; border: 1px solid #0f8b83 !important; border-radius: 9px !important; background: #0f817b !important; color: #fff !important; font: 700 13px/1 Inter, "Segoe UI", system-ui, sans-serif !important; white-space: nowrap !important; flex: 0 0 auto !important; }
      #${resultRootId} .snip-ocr-insert-choice { min-width: 130px !important; background: #fff !important; color: #1f2937 !important; border-color: #cbd5e1 !important; }
      #${resultRootId}.snip-ocr-minimized .snip-ocr-modal { top: 18px !important; right: 12px !important; bottom: auto !important; width: 300px !important; }
      #${resultRootId}.snip-ocr-minimized .snip-ocr-modal-backdrop, #${resultRootId}.snip-ocr-minimized .snip-ocr-text, #${resultRootId}.snip-ocr-minimized .snip-ocr-footer, #${resultRootId}.snip-ocr-minimized .snip-ocr-minimize { display: none !important; }
      #${resultRootId}.snip-ocr-minimized .snip-ocr-restore { display: inline-grid !important; place-items: center !important; }
      #${resultRootId}.snip-ocr-backgrounded .snip-ocr-modal { opacity: .92 !important; }
      /* Removed reload guard media breakpoint 2026-07-08; base min/calc sizing handles viewport width. */
`;
};
