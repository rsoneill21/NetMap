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
  const viaNat = data?.viaNat;
  const color = mismatch ? 'var(--bp-amber)' : viaNat ? 'var(--bp-purple)' : 'var(--bp-cyan)';
  const labelColor = mismatch ? 'var(--bp-amber)' : viaNat ? 'var(--bp-purple)' : 'var(--bp-cyan-bright)';
  const label = mismatch
    ? 'subnet mismatch'
    : viaNat
      ? `via NAT${data?.subnetCidr ? ` (${data.subnetCidr})` : ''}`
      : showSubnetLabels
        ? data?.subnetCidr
        : undefined;

  return (
    <BaseEdge
      path={edgePath}
      label={label}
      labelX={labelX}
      labelY={labelY}
      labelStyle={{ fill: labelColor, fontSize: 10 }}
      labelBgStyle={{ fill: 'var(--bp-bg-panel)' }}
      style={{
        stroke: color,
        strokeWidth: 1.25,
        strokeDasharray: mismatch || viaNat ? '4 3' : undefined,
      }}
    />
  );
}
