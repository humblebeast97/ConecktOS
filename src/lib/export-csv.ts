/**
 * Client-side CSV export. Everything an accountant needs lands as a plain file
 * the owner can open in Excel or Sheets, built entirely in the browser from
 * store data. No backend, no upload. (Programmatic API access is Phase 1.)
 */

/** Quote a single field per RFC 4180: wrap in quotes when it holds a comma,
 *  quote or newline, and double any embedded quotes. */
function cell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serialize a header row plus body rows into a CSV string. */
export function toCSV(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers.map(cell).join(",")];
  for (const row of rows) lines.push(row.map(cell).join(","));
  // Lead with a UTF-8 BOM so Excel reads the ₦ sign and accented names right.
  return "﻿" + lines.join("\r\n");
}

/** Trigger a browser download of `content` as `filename`. Safe to no-op on the
 *  server (Cloudflare Workers has no document). */
export function downloadFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the click has fired.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** A file-name-safe slug for a business name plus an ISO date stamp. */
export function stampName(businessName: string, kind: string, from: Date, to: Date): string {
  const slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // Format the LOCAL calendar date. toISOString() would shift to UTC and land
  // the wrong day for anyone east of Greenwich (e.g. Sept 1 WAT -> Aug 31).
  const d = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const range = d(from) === d(to) ? d(from) : `${d(from)}_to_${d(to)}`;
  return `${slug || "business"}-${kind}-${range}.csv`;
}
