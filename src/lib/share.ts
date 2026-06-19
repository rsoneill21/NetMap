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
