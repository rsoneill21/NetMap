import type { DeviceEdge, DeviceNode, NetMapDocument } from '../types';

const STORAGE_KEY = 'netmap.document.v1';

export function loadDocument(): NetMapDocument | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as NetMapDocument;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDocument(nodes: DeviceNode[], edges: DeviceEdge[]): void {
  const existing = loadDocument();
  const doc: NetMapDocument = {
    version: 1,
    nodes,
    edges,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
}

export function clearDocument(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function buildDocument(nodes: DeviceNode[], edges: DeviceEdge[]): NetMapDocument {
  return {
    version: 1,
    nodes,
    edges,
    createdAt: loadDocument()?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function serializeForExport(nodes: DeviceNode[], edges: DeviceEdge[]): string {
  return JSON.stringify(buildDocument(nodes, edges), null, 2);
}

export function parseImportedJson(raw: string): NetMapDocument | null {
  try {
    const parsed = JSON.parse(raw) as NetMapDocument;
    if (parsed.version !== 1 || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null;
    return parsed;
  } catch {
    return null;
  }
}
