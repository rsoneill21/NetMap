import { useStore, useViewport, type ReactFlowState } from '@xyflow/react';
import { computeSubnetGroups } from '../lib/subnet';
import { usePreferences } from '../hooks/usePreferences';
import type { DeviceNode } from '../types';

const PADDING = 24;

const nodesSelector = (state: ReactFlowState) => state.nodeLookup;

export function SubnetGroupOverlay({ nodes }: { nodes: DeviceNode[] }) {
  const { showSubnetBoundaries } = usePreferences();
  const nodeLookup = useStore(nodesSelector);
  const { x: viewX, y: viewY, zoom } = useViewport();
  const groups = computeSubnetGroups(nodes);

  if (!showSubnetBoundaries) return null;

  return (
    <div className="subnet-group-overlay">
      {groups.map((group) => {
        const rects = group.memberNodeIds
          .map((id) => nodeLookup.get(id))
          .filter((n): n is NonNullable<typeof n> => !!n);
        if (rects.length === 0) return null;

        const minX = Math.min(...rects.map((n) => n.internals.positionAbsolute.x));
        const minY = Math.min(...rects.map((n) => n.internals.positionAbsolute.y));
        const maxX = Math.max(...rects.map((n) => n.internals.positionAbsolute.x + (n.measured?.width ?? 220)));
        const maxY = Math.max(...rects.map((n) => n.internals.positionAbsolute.y + (n.measured?.height ?? 100)));

        const left = (minX - PADDING) * zoom + viewX;
        const top = (minY - PADDING) * zoom + viewY;
        const width = (maxX - minX + PADDING * 2) * zoom;
        const height = (maxY - minY + PADDING * 2) * zoom;

        return (
          <div key={group.cidr} className="subnet-group-box" style={{ left, top, width, height }}>
            <span className="subnet-group-label">{group.label}</span>
          </div>
        );
      })}
    </div>
  );
}
