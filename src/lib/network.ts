import type { DeviceEdge } from '../types';

function buildAdjacency(edges: DeviceEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!edge.source || !edge.target) continue;
    if (!adj.has(edge.source)) adj.set(edge.source, new Set());
    if (!adj.has(edge.target)) adj.set(edge.target, new Set());
    adj.get(edge.source)!.add(edge.target);
    adj.get(edge.target)!.add(edge.source);
  }
  return adj;
}

/** BFS over the physical link graph only — answers whether two devices are reachable via wired links. */
export function areDevicesNetworkConnected(deviceIdA: string, deviceIdB: string, physicalEdges: DeviceEdge[]): boolean {
  if (deviceIdA === deviceIdB) return true;
  const adj = buildAdjacency(physicalEdges);
  const visited = new Set<string>([deviceIdA]);
  const queue: string[] = [deviceIdA];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === deviceIdB) return true;
    for (const neighbor of adj.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return visited.has(deviceIdB);
}
