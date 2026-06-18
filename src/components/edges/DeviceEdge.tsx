import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import type { DeviceEdge as DeviceEdgeType } from '../../types';

export function DeviceEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<DeviceEdgeType>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 4,
  });

  return (
    <BaseEdge
      path={edgePath}
      label={data?.subnetCidr}
      labelX={labelX}
      labelY={labelY}
      labelStyle={{ fill: 'var(--bp-cyan-bright)', fontSize: 10 }}
      labelBgStyle={{ fill: 'var(--bp-bg-panel)' }}
      style={{ stroke: 'var(--bp-cyan)', strokeWidth: 1.25 }}
    />
  );
}
