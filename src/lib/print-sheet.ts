/*
 * Opens a fresh popup window with a self-contained print document and triggers
 * the browser's print dialog on it. Bypasses the fragile `:has(.print-sheet)`
 * scoping that breaks on mobile Chrome (dialog wrappers clamp print viewport
 * width and table columns collapse to zero).
 */
export function printHTML(title: string, bodyHTML: string): void {
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=1200");
  if (!win) return;
  win.document.open();
  win.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHTML(title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body {
    font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 24px;
  }
  h1 { font-size: 18px; margin: 0 0 4px; letter-spacing: -0.01em; }
  .subtitle { font-size: 12px; color: #555; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { padding: 6px 0; vertical-align: top; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #666; border-top: 1px solid #999; border-bottom: 1px solid #999; padding: 8px 0; }
  td.label { width: 70%; }
  td.value { width: 30%; text-align: right; font-variant-numeric: tabular-nums; }
  tr.strong td { font-weight: 700; }
  .footnote { margin-top: 20px; font-size: 11px; color: #444; }
</style>
</head>
<body>${bodyHTML}
<script>
  window.addEventListener("load", () => {
    setTimeout(() => { window.focus(); window.print(); }, 100);
  });
  window.addEventListener("afterprint", () => window.close());
</script>
</body></html>`);
  win.document.close();
}

function escapeHTML(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
