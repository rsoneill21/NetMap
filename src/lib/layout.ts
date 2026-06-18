import dagre from '@dagrejs/dagre';
import type { DeviceEdge, DeviceNode } from '../types';

export interface LayoutOptions {
  direction: 'LR' | 'TB';
  nodeSep: number;
  rankSep: number;
}

const DEFAULT_OPTIONS: LayoutOptions = { direction: 'LR', nodeSep: 60, rankSep: 120 };

function estimateNodeWidth(): number {
  return 220;
}

function estimateNodeHeight(interfaceCount: number): number {
  return 60 + interfaceCount * 22;
}

export function runDagreLayout(
  nodes: DeviceNode[],
  edges: DeviceEdge[],
  options: LayoutOptions = DEFAULT_OPTIONS,
): DeviceNode[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: options.direction, nodesep: options.nodeSep, ranksep: options.rankSep });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    const width = node.measured?.width ?? estimateNodeWidth();
    const height = node.measured?.height ?? estimateNodeHeight(node.data.interfaces.length);
    g.setNode(node.id, { width, height });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - pos.width / 2, y: pos.y - pos.height / 2 },
      data: { ...node.data, manuallyPositioned: false },
    };
  });
}
