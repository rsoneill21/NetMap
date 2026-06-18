import { createInterface, deviceTypeMeta, deviceTypeOrder } from '../lib/device';
import { InterfaceEditorRow } from './InterfaceEditorRow';
import type { Device, DeviceEdge, DeviceNode, DeviceType } from '../types';

interface InspectorPanelProps {
  selectedNode: DeviceNode | null;
  selectedEdge: DeviceEdge | null;
  onUpdateDevice: (deviceId: string, updater: (device: Device) => Device) => void;
  onDeleteSelected: () => void;
}

export function InspectorPanel({ selectedNode, selectedEdge, onUpdateDevice, onDeleteSelected }: InspectorPanelProps) {
  if (!selectedNode && !selectedEdge) {
    return (
      <aside className="inspector-panel">
        <h2 className="panel-title">Inspector</h2>
        <p className="inspector-empty">Select a device or link to edit its properties.</p>
      </aside>
    );
  }

  if (selectedEdge) {
    return (
      <aside className="inspector-panel">
        <h2 className="panel-title">Link</h2>
        <div className="inspector-field">
          <label>Source interface</label>
          <div>{selectedEdge.data?.sourceInterfaceName || '—'}</div>
        </div>
        <div className="inspector-field">
          <label>Target interface</label>
          <div>{selectedEdge.data?.targetInterfaceName || '—'}</div>
        </div>
        <div className="inspector-field">
          <label>Subnet</label>
          <div>{selectedEdge.data?.subnetCidr ?? '—'}</div>
        </div>
        <div className="inspector-field">
          <label>Origin</label>
          <div>{selectedEdge.data?.origin ?? 'manual'}</div>
        </div>
        <button type="button" className="toolbar-btn toolbar-btn-danger" onClick={onDeleteSelected}>
          Delete link
        </button>
      </aside>
    );
  }

  const device = selectedNode!.data;

  function update(updater: (d: Device) => Device) {
    onUpdateDevice(device.id, updater);
  }

  return (
    <aside className="inspector-panel">
      <h2 className="panel-title">Device</h2>
      <div className="inspector-field">
        <label>Name</label>
        <input
          value={device.label}
          onChange={(e) => update((d) => ({ ...d, label: e.target.value }))}
        />
      </div>
      <div className="inspector-field">
        <label>Type</label>
        <select
          value={device.type}
          onChange={(e) => update((d) => ({ ...d, type: e.target.value as DeviceType }))}
        >
          {deviceTypeOrder.map((t) => (
            <option key={t} value={t}>
              {deviceTypeMeta[t].label}
            </option>
          ))}
        </select>
      </div>
      {device.type !== 'cloud' && (
        <div className="inspector-field">
          <label>Interfaces</label>
          {device.interfaces.map((iface) => (
            <InterfaceEditorRow
              key={iface.id}
              iface={iface}
              onChange={(next) =>
                update((d) => ({
                  ...d,
                  interfaces: d.interfaces.map((i) => (i.id === next.id ? next : i)),
                }))
              }
              onRemove={() =>
                update((d) => ({ ...d, interfaces: d.interfaces.filter((i) => i.id !== iface.id) }))
              }
            />
          ))}
          <button
            type="button"
            className="toolbar-btn"
            onClick={() =>
              update((d) => ({
                ...d,
                interfaces: [...d.interfaces, createInterface(`eth${d.interfaces.length}`)],
              }))
            }
          >
            + Interface
          </button>
        </div>
      )}
      <div className="inspector-field">
        <label>Notes</label>
        <textarea
          value={device.notes ?? ''}
          onChange={(e) => update((d) => ({ ...d, notes: e.target.value }))}
          rows={3}
        />
      </div>
      <button type="button" className="toolbar-btn toolbar-btn-danger" onClick={onDeleteSelected}>
        Delete device
      </button>
    </aside>
  );
}
