"use strict";

globalThis.SnipazeExportDocumentStyles = String.raw`    @page WordSection1 { size: 8.5in 11in; margin: 0.7in; }
    div.WordSection1 { page: WordSection1; }
    body { font-family: Arial, sans-serif; color: #111827; line-height: 1.58; margin: 32px; }
    h1 { font-size: 26px; margin: 0 0 8px; color: #0f172a; }
    .report-kicker { color: #0f766e; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin: 0 0 8px; }
    .note-meta { color: #475569; font-size: 12px; margin: 0 0 18px; }
    .section-rule { height: 1px; background: #cbd5e1; margin: 18px 0 22px; }
    .capture-rule { border: 0; border-top: 1px solid #94a3b8; margin: 18px 0; }
    .capture-rule-pair { margin-top: 2px; margin-bottom: 2px; }
    img, .inline-shot { max-width: 520px; width: auto; height: auto; max-height: 360px; border-radius: 8px; display: block; margin: 10px 0; object-fit: contain; }
    .source-snippet { margin: 0; padding: 16px 18px; border-left: 3px solid #14b8a6; background: #f8fafc; }
    .source-meta { color: #4b5563; font-size: 12px; margin-top: 10px; }
    .source-meta-highlight { color: #1d4ed8; font-weight: 700; }
    a { color: #0f766e; text-decoration: underline; }`;

globalThis.SnipazeWordCaptureRuleTableStyle = "width:100%;border-collapse:collapse;margin:2px 0;page-break-inside:avoid;page-break-after:avoid;break-inside:avoid;mso-table-lspace:0;mso-table-rspace:0;";

globalThis.SnipazeWordCaptureRuleTableRows = String.raw`<tbody>
      <tr><td style="height:1px;line-height:0;font-size:0;border-top:1px solid #94a3b8;padding:0;">&nbsp;</td></tr>
      <tr><td style="height:3px;line-height:3px;font-size:0;padding:0;"></td></tr>
      <tr><td style="height:1px;line-height:0;font-size:0;border-top:1px solid #94a3b8;padding:0;">&nbsp;</td></tr>
    </tbody>`;
globalThis.SnipazeExportImageMaxWidth = 520;
globalThis.SnipazeExportImageMaxHeight = 360;