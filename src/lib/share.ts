import type { NetMapDocument } from '../types';

export interface ShareSaveResult {
  code: string;
  expiresAt: string;
}

export async function saveShare(document: NetMapDocument, code?: string | null): Promise<ShareSaveResult> {
  const res = await fetch('/api/configs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code ?? undefined, document }),
  });
  if (!res.ok) throw new Error('Failed to save share code');
  return res.json();
}

export interface ShareLoadResult {
  document: NetMapDocument;
  expiresAt: string;
}

export async function loadShare(code: string): Promise<ShareLoadResult | null> {
  const res = await fetch(`/api/configs/${encodeURIComponent(code.trim().toLowerCase())}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load share code');
  return res.json();
}

const CODE_IN_PATH_RE = /^\/([a-z0-9]{4})\/?$/i;

/** Reads a 4-character share code from the current URL path, e.g. "/ab3d" -> "ab3d". */
export function codeFromUrl(): string | null {
  const match = window.location.pathname.match(CODE_IN_PATH_RE);
  return match ? match[1].toLowerCase() : null;
}

/** Updates the address bar to reflect the given share code (or "/" when null), without reloading the page. */
export function setUrlCode(code: string | null): void {
  const path = code ? `/${code}` : '/';
  if (window.location.pathname !== path) {
    window.history.pushState(null, '', path);
  }
}
