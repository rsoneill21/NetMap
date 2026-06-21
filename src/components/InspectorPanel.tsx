import { X, Trash2 } from 'lucide-react';
import { createInterface, deviceTypeMeta, deviceTypeOrder } from '../lib/device';
import { InterfaceEditorRow } from './InterfaceEditorRow';
import { PortsEditor } from './PortsEditor';
import type { Device, DeviceEdge, DeviceNode, DeviceType } from '../types';

interface InspectorPanelProps {
  selectedNode: DeviceNode | null;
  selectedEdge: DeviceEdge | null;
  onUpdateDevice: (deviceId: string, updater: (device: Device) => Device) => void;
  onDeleteSelected: () => void;
  onClose: () => void;
}

export function InspectorPanel({
  selectedNode,
  selectedEdge,
  onUpdateDevice,
  onDeleteSelected,
  onClose,
}: InspectorPanelProps) {
  if (!selectedNode && !selectedEdge) {
    return null;
  }

  if (selectedEdge) {
    return (
      <aside className="inspector-panel">
        <div className="inspector-header">
          <div>
            <h2 className="inspector-title">Link</h2>
          </div>
          <button type="button" className="inspector-close-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
        <div className="inspector-body">
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
        </div>
        <div className="inspector-footer">
          <button
            type="button"
            className="toolbar-btn toolbar-btn-danger inspector-delete-btn"
            onClick={onDeleteSelected}
            title="Delete link"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </aside>
    );
  }

  const device = selectedNode!.data;

  function update(updater: (d: Device) => Device) {
    onUpdateDevice(device.id, updater);
  }

  function addInterface() {
    update((d) => {
      const next = createInterface(`eth${d.interfaces.length}`);
      const hasManagement = d.interfaces.some((i) => i.isManagement);
      if (!hasManagement) next.isManagement = true;
      return { ...d, interfaces: [...d.interfaces, next] };
    });
  }

  function removeInterface(ifaceId: string) {
    update((d) => {
      const removed = d.interfaces.find((i) => i.id === ifaceId);
      let remaining = d.interfaces.filter((i) => i.id !== ifaceId);
      if (removed?.isManagement && remaining.length > 0 && !remaining.some((i) => i.isManagement)) {
        remaining = remaining.map((i, idx) => (idx === 0 ? { ...i, isManagement: true } : i));
      }
      return { ...d, interfaces: remaining };
    });
  }

  function setManagementInterface(ifaceId: string) {
    update((d) => ({
      ...d,
      interfaces: d.interfaces.map((i) => ({ ...i, isManagement: i.id === ifaceId })),
    }));
  }

  return (
    <aside className="inspector-panel" key={device.id}>
      <div className="inspector-header">
        <div>
          <h2 className="inspector-title">Edit Device</h2>
          <div className="inspector-subtitle">{deviceTypeMeta[device.type].label}</div>
        </div>
        <button type="button" className="inspector-close-btn" onClick={onClose} title="Close">
          <X size={16} />
        </button>
      </div>

      <div className="inspector-body">
        <div className="inspector-field">
          <label>Hostname</label>
          <input
            value={device.label}
            placeholder="e.g. RED-SCR"
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
        <div className="inspector-field">
          <label>Open Ports</label>
          <PortsEditor
            ports={device.ports ?? []}
            onChange={(ports) => update((d) => ({ ...d, ports }))}
          />
        </div>

        <div className="inspector-section">
          <div className="inspector-section-header">
            <span className="inspector-section-title">Interfaces ({device.interfaces.length})</span>
            <button type="button" className="inspector-add-btn" onClick={addInterface}>
              + Add
            </button>
          </div>
          {device.interfaces.length === 0 && (
            <p className="inspector-empty">No interfaces yet. Click "+ Add" to create one.</p>
          )}
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
              onRemove={() => removeInterface(iface.id)}
              onSetManagement={() => setManagementInterface(iface.id)}
            />
          ))}
        </div>

        <div className="inspector-field">
          <label>Notes</label>
          <textarea
            value={device.notes ?? ''}
            onChange={(e) => update((d) => ({ ...d, notes: e.target.value }))}
            rows={3}
          />
        </div>
      </div>

      <div className="inspector-footer">
        <button type="button" className="toolbar-btn toolbar-btn-primary inspector-save-btn" onClick={onClose}>
          Save
        </button>
        <button
          type="button"
          className="toolbar-btn toolbar-btn-danger inspector-delete-btn"
          onClick={onDeleteSelected}
          title="Delete device"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </aside>
  );
}
