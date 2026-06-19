import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { usePreferences } from '../../hooks/usePreferences';
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
  const { showSubnetLabels } = usePreferences();
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 4,
  });

  const mismatch = data?.subnetMismatch;

  return (
    <BaseEdge
      path={edgePath}
      label={mismatch ? 'subnet mismatch' : showSubnetLabels ? data?.subnetCidr : undefined}
      labelX={labelX}
      labelY={labelY}
      labelStyle={{ fill: mismatch ? 'var(--bp-amber)' : 'var(--bp-cyan-bright)', fontSize: 10 }}
      labelBgStyle={{ fill: 'var(--bp-bg-panel)' }}
      style={{
        stroke: mismatch ? 'var(--bp-amber)' : 'var(--bp-cyan)',
        strokeWidth: 1.25,
        strokeDasharray: mismatch ? '4 3' : undefined,
      }}
    />
  );
}
