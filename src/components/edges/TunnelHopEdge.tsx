import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import type { TunnelHopEdge as TunnelHopEdgeType } from '../../types';

const BASE_STEP_OFFSET = 20;
const LANE_STEP = 16;

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
  const lane = data?.lane ?? 0;
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 4,
    offset: BASE_STEP_OFFSET + lane * LANE_STEP,
  });

  const isForward = data?.kind === 'forward';
  const label = data?.label ?? data?.protocol ?? 'ssh';

  return (
    <BaseEdge
      path={edgePath}
      label={label}
      labelX={labelX}
      labelY={labelY}
      labelStyle={{ fill: isForward ? 'var(--bp-purple-bright)' : 'var(--bp-text-muted)', fontSize: 10 }}
      labelBgStyle={{ fill: 'var(--bp-bg-panel)' }}
      markerEnd={markerEnd}
      style={{
        stroke: isForward ? 'var(--bp-purple-bright)' : 'var(--bp-purple)',
        strokeWidth: selected ? 2.5 : isForward ? 1.75 : 1.25,
        strokeDasharray: isForward ? '5 3' : '2 4',
        opacity: selected ? 1 : isForward ? 0.9 : 0.55,
      }}
    />
  );
}
