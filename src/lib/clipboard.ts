/**
 * Copy text to the clipboard, with progressively-degrading fallbacks so it
 * works on HTTPS, on plain HTTP, and even in restricted browsers.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // 1) Modern API. Available on HTTPS or localhost.
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through
    }
  }

  // 2) Legacy fallback: hidden textarea + document.execCommand("copy").
  //    Some browsers refuse to copy from opacity:0 or offscreen elements, and
  //    Radix Dialog's focus trap can steal focus mid-copy. So we mount the
  //    textarea inside the currently-active element's container when possible,
  //    keep it visible-but-tiny, and select via setSelectionRange.
  try {
    const host = (document.activeElement && document.activeElement.parentElement) || document.body;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.readOnly = true;
    ta.contentEditable = "true";
    ta.style.cssText =
      "position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:0;outline:0;box-shadow:none;background:transparent;font-size:16px;";
    host.appendChild(ta);
    ta.focus({ preventScroll: true });
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    host.removeChild(ta);
    if (ok) return true;
  } catch {
    // fall through
  }

  // 3) Last resort: show a native prompt with the text pre-filled. The user
  //    just hits Ctrl/Cmd+C (or long-presses on mobile) and closes the dialog.
  try {
    window.prompt("Copy this account number:", text);
    return true;
  } catch {
    return false;
  }
}
