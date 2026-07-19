"use strict";

globalThis.SnipazeProSidebarStyles = String.raw`
      @keyframes snip-pro-sheen {
        0%, 60% { transform: translateX(-120%); }
        100% { transform: translateX(220%); }
      }

      .tool.pro-tool {
        position: relative;
        overflow: hidden;
        height: 34px;
        min-width: 0;
        padding: 0 12px;
        border-radius: 11px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border: 1px solid rgba(212, 175, 90, 0.55);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.05)), rgba(255, 255, 255, 0.06);
        color: #d4af5a;
        font: 800 12px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        letter-spacing: 0.3px;
        box-shadow: none;
        transition: border-color 200ms ease, box-shadow 200ms ease, transform 150ms ease;
      }

      .tool.pro-tool:hover {
        border-color: rgba(230, 197, 124, 0.85);
        box-shadow: 0 0 0 1px rgba(212, 175, 90, 0.15), 0 4px 14px rgba(212, 175, 90, 0.22);
        transform: translateY(-1px);
      }

      .tool.pro-tool.active {
        border-color: rgba(212, 175, 90, 0.7);
        background: linear-gradient(180deg, #caa14a, #a3811f);
        color: #1c1710;
      }

      .tool.pro-tool.active .pro-sheen {
        display: none;
      }

      /* .pro-check show/hide is intentionally kept identical to reader-pro.css and
         popup-pro.css - duplicated because a closed shadow DOM can't link those files. */
      .tool.pro-tool .pro-check {
        display: none;
      }

      .tool.pro-tool.active .pro-check {
        display: inline;
        margin-left: 1px;
      }

      .pro-sheen {
        position: absolute;
        top: 0;
        left: 0;
        width: 40%;
        height: 100%;
        background: linear-gradient(100deg, transparent, rgba(255, 241, 214, 0.35), transparent);
        animation: snip-pro-sheen 4.5s ease-in-out infinite;
        pointer-events: none;
      }

      .sidebar.light-theme .tool.pro-tool {
        border-color: rgba(180, 130, 20, 0.55);
        background: rgba(255, 255, 255, 0.92);
        color: #8a5a0b;
      }

      .sidebar.light-theme .tool.pro-tool:hover {
        border-color: rgba(180, 130, 20, 0.8);
        box-shadow: 0 8px 18px rgba(180, 130, 20, 0.16);
      }

      .sidebar.light-theme .tool.pro-tool.active {
        border-color: rgba(212, 175, 90, 0.7);
        background: linear-gradient(180deg, #caa14a, #a3811f);
        color: #1c1710;
      }

      /* .pro-cta visual values (padding/border-radius/border/background/color/font-weight/font-size)
         are intentionally kept identical to reader-pro.css's .pro-cta - duplicated because a closed
         shadow DOM can't link that file, not because the two were designed separately. */
      .pro-cta {
        justify-self: start;
        margin-top: 2px;
        padding: 8px 14px;
        border-radius: 8px;
        border: 1px solid rgba(212, 175, 90, 0.55);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.05)), rgba(255, 255, 255, 0.06);
        color: #d4af5a;
        font: 800 12px/1 Inter, ui-sans-serif, system-ui, sans-serif;
        cursor: pointer;
        transition: border-color 200ms ease, box-shadow 200ms ease;
      }

      .pro-cta:hover {
        border-color: rgba(230, 197, 124, 0.85);
        box-shadow: 0 0 0 1px rgba(212, 175, 90, 0.15), 0 4px 14px rgba(212, 175, 90, 0.22);
      }

      .pro-cta:disabled {
        cursor: default;
        opacity: 0.75;
      }

      /* .pro-plan-table is intentionally kept identical to reader-pro.css's copy -
         duplicated because a closed shadow DOM can't link that file. */
      .pro-plan-table {
        width: 100%;
        border-collapse: collapse;
        margin: 8px 0;
        font-size: 11px;
      }

      .pro-plan-table th,
      .pro-plan-table td {
        text-align: left;
        padding: 4px 6px;
        border-bottom: 1px solid rgba(212, 175, 90, 0.2);
      }`;
