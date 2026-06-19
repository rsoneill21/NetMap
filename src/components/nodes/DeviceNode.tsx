import { Handle, Position, type NodeProps } from '@xyflow/react';
import { deviceTypeMeta } from '../../lib/device';
import { formatIpAddress } from '../../lib/cidr';
import type { DeviceNode as DeviceNodeType } from '../../types';

function statusDotClass(status: string): string {
  if (status === 'up') return 'status-dot up';
  if (status === 'down') return 'status-dot down';
  if (status === 'admin-down') return 'status-dot admin-down';
  return 'status-dot unknown';
}

export function DeviceNode({ data, selected }: NodeProps<DeviceNodeType>) {
  const meta = deviceTypeMeta[data.type];
  const Icon = meta.icon;

  return (
    <div className={`device-node${selected ? ' is-selected' : ''}`}>
      <div className="device-node-header">
        <Icon size={16} className="device-node-icon" />
        <span className="device-node-label">{data.label}</span>
        <span className="device-node-type">{meta.label}</span>
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
            <span key={port} className="port-badge">
              {port}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
