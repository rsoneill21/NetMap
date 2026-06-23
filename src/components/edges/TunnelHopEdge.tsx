import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import type { TunnelHopEdge as TunnelHopEdgeType } from '../../types';

export function TunnelHopEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
  selected,
}: EdgeProps<TunnelHopEdgeType>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 4,
  });

  const protocol = data?.protocol ?? 'ssh';
  const label = data?.isForwardingHop && data?.portSummary ? `${protocol} · ${data.portSummary}` : protocol;

  return (
    <BaseEdge
      path={edgePath}
      label={label}
      labelX={labelX}
      labelY={labelY}
      labelStyle={{ fill: 'var(--bp-purple-bright)', fontSize: 10 }}
      labelBgStyle={{ fill: 'var(--bp-bg-panel)' }}
      markerEnd={markerEnd}
      style={{
        stroke: 'var(--bp-purple)',
        strokeWidth: selected ? 2.5 : 1.5,
        strokeDasharray: '6 4',
        opacity: selected ? 1 : 0.85,
      }}
    />
  );
}
