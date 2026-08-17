/**
 * Copy text to the clipboard, with a legacy fallback for insecure contexts
 * (plain HTTP on non-localhost) where navigator.clipboard is undefined.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // Modern API — only available on HTTPS or localhost.
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy path
    }
  }

  // Legacy fallback: a hidden textarea + execCommand("copy"). Widely supported,
  // works over plain HTTP and inside iframes; deprecated but not going away soon.
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
