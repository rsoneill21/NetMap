import { deviceTypeMeta, deviceTypeOrder } from '../lib/device';
import type { DeviceType } from '../types';

interface DevicePaletteProps {
  onAddDevice: (type: DeviceType) => void;
}

export function DevicePalette({ onAddDevice }: DevicePaletteProps) {
  return (
    <aside className="device-palette">
      <h2 className="panel-title">Devices</h2>
      {deviceTypeOrder.map((type) => {
        const meta = deviceTypeMeta[type];
        const Icon = meta.icon;
        return (
          <button
            key={type}
            type="button"
            className="palette-item"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/netmap-device-type', type);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onClick={() => onAddDevice(type)}
            title={`Add ${meta.label} (click), or drag onto canvas`}
          >
            <Icon size={18} />
            <span>{meta.label}</span>
          </button>
        );
      })}
    </aside>
  );
}
