/*
 * Renders a standalone print document into a hidden iframe on the current page
 * and calls print() on the iframe's window. Iframes bypass popup blockers and
 * side-step the mobile-Chrome bug where a `:has(.print-sheet)`-scoped page
 * print collapses table columns because the dialog wrapper clamps the viewport.
 */
export function printHTML(title: string, bodyHTML: string): void {
  if (typeof window === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(`<!doctype html>
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
<body>${bodyHTML}</body></html>`);
  doc.close();

  const win = iframe.contentWindow;
  if (!win) {
    iframe.remove();
    return;
  }
  const cleanup = () => {
    // Delay so the browser's print pipeline has finished with the frame.
    setTimeout(() => iframe.remove(), 500);
  };
  win.addEventListener("afterprint", cleanup);
  // Wait for images/fonts before firing the print dialog.
  const trigger = () => {
    try {
      win.focus();
      win.print();
    } catch {
      cleanup();
    }
  };
  if (doc.readyState === "complete") setTimeout(trigger, 50);
  else win.addEventListener("load", () => setTimeout(trigger, 50));
  // Fallback cleanup in case afterprint never fires (some mobile browsers).
  setTimeout(cleanup, 15000);
}

function escapeHTML(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
