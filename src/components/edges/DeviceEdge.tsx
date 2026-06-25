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
  const linkKind = data?.linkKind ?? 'network';
  const isTunnel = linkKind === 'tunnel';
  const isService = linkKind === 'service';
  const color = mismatch
    ? 'var(--bp-amber)'
    : isTunnel
      ? 'var(--bp-amber)'
      : isService
        ? 'var(--bp-green)'
        : viaNat
          ? 'var(--bp-purple)'
          : 'var(--bp-cyan)';
  const labelColor = color;
  const tunnelLabel = data?.label
    ?? (data?.tunnelKind === 'dynamic-socks' && data.localPort ? `SOCKS :${data.localPort}` : undefined)
    ?? (data?.localPort && data?.remoteHost && data?.remotePort
      ? `-L ${data.localPort} -> ${data.remoteHost}:${data.remotePort}`
      : undefined);
  const label = mismatch
    ? 'subnet mismatch'
    : isTunnel
      ? tunnelLabel ?? 'tunnel'
      : isService
        ? data?.label ?? 'service'
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
        strokeWidth: isTunnel ? 2 : 1.25,
        strokeDasharray: isTunnel ? '7 4' : mismatch || viaNat || isService ? '4 3' : undefined,
      }}
    />
  );
}
