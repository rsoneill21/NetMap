import { useEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { Cable } from 'lucide-react';
import { deviceTypeMeta } from '../../lib/device';
import { formatIpAddress } from '../../lib/cidr';
import { useDeviceActions } from '../../hooks/useDeviceActions';
import type { DeviceNode as DeviceNodeType } from '../../types';

function statusDotClass(status: string): string {
  if (status === 'up') return 'status-dot up';
  if (status === 'down') return 'status-dot down';
  if (status === 'admin-down') return 'status-dot admin-down';
  return 'status-dot unknown';
}

export function DeviceNode({ id, data, selected }: NodeProps<DeviceNodeType>) {
  const meta = deviceTypeMeta[data.type];
  const Icon = meta.icon;
  const { onStartTunnel } = useDeviceActions();
  const activeTunnelPorts = data.activeTunnelPorts as number[] | undefined;

  // Port handles are added/removed dynamically as tunnels register ports — React Flow only
  // measures a node's handles once on mount, so it must be told explicitly when they change.
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, data.ports, updateNodeInternals]);

  return (
    <div className={`device-node${selected ? ' is-selected' : ''}`}>
      <div className="device-node-header">
        <Icon size={16} className="device-node-icon" />
        <span className="device-node-label">{data.label}</span>
        <span className="device-node-type">{meta.label}</span>
        <button
          type="button"
          className="device-node-tunnel-btn nodrag"
          title="Start a tunnel from this device"
          onClick={(e) => {
            e.stopPropagation();
            onStartTunnel(data.id);
          }}
        >
          <Cable size={13} />
        </button>
      </div>
      <div className="device-node-interfaces">
        {data.interfaces.map((iface) => (
          <div key={iface.id} className="device-node-iface-row">
            <Handle
              type="target"
              position={Position.Left}
              id={`${iface.id}-target`}
              className="iface-handle"
            />
            <span className={statusDotClass(iface.status)} />
            <span className="iface-name">{iface.name}</span>
            <span className="iface-addresses">
              {iface.addresses.length > 0
                ? iface.addresses.map((a) => formatIpAddress(a)).join(', ')
                : '—'}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={`${iface.id}-source`}
              className="iface-handle"
            />
          </div>
        ))}
        {data.interfaces.length === 0 && <div className="device-node-empty">No interfaces</div>}
      </div>
      {data.ports != null && data.ports.length > 0 && (
        <div className="device-node-ports">
          <span className="device-node-ports-label">Ports</span>
          {data.ports.map((port) => (
            <span key={port} className="port-badge-wrap">
              <Handle
                type="target"
                position={Position.Bottom}
                id={`port-${port}-target`}
                className="port-handle"
              />
              <Handle
                type="source"
                position={Position.Bottom}
                id={`port-${port}-source`}
                className="port-handle"
              />
              <span className={`port-badge${activeTunnelPorts?.includes(port) ? ' is-tunneled' : ''}`} title={activeTunnelPorts?.includes(port) ? 'In use by a tunnel mapping' : undefined}>
                {port}
              </span>
            </span>
          ))}
        </div>
      )}
      <Handle
        type="target"
        position={Position.Left}
        id="tunnel-target"
        className="tunnel-node-handle"
        style={{ top: 'auto', bottom: 6 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="tunnel-source"
        className="tunnel-node-handle"
        style={{ top: 'auto', bottom: 6 }}
      />
    </div>
  );
}
