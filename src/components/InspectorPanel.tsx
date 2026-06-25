import { X, Trash2 } from 'lucide-react';
import { createInterface, deviceTypeMeta, deviceTypeOrder } from '../lib/device';
import { InterfaceEditorRow } from './InterfaceEditorRow';
import { PortsEditor } from './PortsEditor';
import type { Device, DeviceEdge, DeviceNode, DeviceType, LinkData, LinkKind, TunnelKind, TunnelStatus } from '../types';

interface InspectorPanelProps {
  selectedNode: DeviceNode | null;
  selectedEdge: DeviceEdge | null;
  onUpdateDevice: (deviceId: string, updater: (device: Device) => Device) => void;
  onUpdateEdge: (edgeId: string, updater: (data: LinkData) => LinkData) => void;
  onDeleteSelected: () => void;
  onClose: () => void;
}

export function InspectorPanel({
  selectedNode,
  selectedEdge,
  onUpdateDevice,
  onUpdateEdge,
  onDeleteSelected,
  onClose,
}: InspectorPanelProps) {
  if (!selectedNode && !selectedEdge) {
    return null;
  }

  if (selectedEdge) {
    const edgeData = selectedEdge.data as LinkData;
    const updateEdgeData = (patch: Partial<LinkData>) => {
      onUpdateEdge(selectedEdge.id, (data) => ({ ...data, ...patch }));
    };
    const parseNumber = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    return (
      <aside className="inspector-panel">
        <div className="inspector-header">
          <div>
            <h2 className="inspector-title">Link</h2>
            <div className="inspector-subtitle">{edgeData.linkKind ?? 'network'}</div>
          </div>
          <button type="button" className="inspector-close-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
        <div className="inspector-body">
          <div className="inspector-field">
            <label>Link Kind</label>
            <select
              value={edgeData.linkKind ?? 'network'}
              onChange={(e) => updateEdgeData({ linkKind: e.target.value as LinkKind })}
            >
              <option value="network">Network</option>
              <option value="tunnel">Tunnel</option>
              <option value="service">Service</option>
            </select>
          </div>
          <div className="inspector-field">
            <label>Label</label>
            <input
              value={edgeData.label ?? ''}
              placeholder="e.g. SOCKS :9050 or -L 60001 -> host:22"
              onChange={(e) => updateEdgeData({ label: e.target.value || undefined })}
            />
          </div>
          <div className="inspector-field">
            <label>Source</label>
            <div>{edgeData.sourceInterfaceName || selectedEdge.source}</div>
          </div>
          <div className="inspector-field">
            <label>Target</label>
            <div>{edgeData.targetInterfaceName || selectedEdge.target}</div>
          </div>
          {(edgeData.linkKind ?? 'network') === 'tunnel' && (
            <div className="inspector-section tunnel-fields">
              <div className="inspector-field">
                <label>Tunnel Type</label>
                <select
                  value={edgeData.tunnelKind ?? 'custom'}
                  onChange={(e) => updateEdgeData({ tunnelKind: e.target.value as TunnelKind })}
                >
                  <option value="dynamic-socks">Dynamic SOCKS</option>
                  <option value="local-forward">Local Forward</option>
                  <option value="remote-forward">Remote Forward</option>
                  <option value="direct-ssh">Direct SSH</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="inspector-field">
                <label>Status</label>
                <select
                  value={edgeData.tunnelStatus ?? 'planned'}
                  onChange={(e) => updateEdgeData({ tunnelStatus: e.target.value as TunnelStatus })}
                >
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="stale">Stale</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div className="inspector-grid-2">
                <div className="inspector-field">
                  <label>Local Port</label>
                  <input
                    value={edgeData.localPort ?? ''}
                    onChange={(e) => updateEdgeData({ localPort: parseNumber(e.target.value) })}
                  />
                </div>
                <div className="inspector-field">
                  <label>Remote Port</label>
                  <input
                    value={edgeData.remotePort ?? ''}
                    onChange={(e) => updateEdgeData({ remotePort: parseNumber(e.target.value) })}
                  />
                </div>
              </div>
              <div className="inspector-field">
                <label>Remote Host</label>
                <input
                  value={edgeData.remoteHost ?? ''}
                  onChange={(e) => updateEdgeData({ remoteHost: e.target.value || undefined })}
                />
              </div>
              <div className="inspector-field">
                <label>Command</label>
                <textarea
                  value={edgeData.command ?? ''}
                  rows={3}
                  onChange={(e) => updateEdgeData({ command: e.target.value || undefined })}
                />
              </div>
            </div>
          )}
          <div className="inspector-field">
            <label>Subnet</label>
            <div>{edgeData.subnetCidr ?? '—'}</div>
          </div>
          <div className="inspector-field">
            <label>Origin</label>
            <div>{edgeData.origin ?? 'manual'}</div>
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

  function moveInterface(ifaceId: string, direction: -1 | 1) {
    update((d) => {
      const index = d.interfaces.findIndex((i) => i.id === ifaceId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= d.interfaces.length) return d;

      const interfaces = [...d.interfaces];
      [interfaces[index], interfaces[nextIndex]] = [interfaces[nextIndex], interfaces[index]];
      return { ...d, interfaces };
    });
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
          {device.interfaces.map((iface, index) => (
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
              onMoveUp={() => moveInterface(iface.id, -1)}
              onMoveDown={() => moveInterface(iface.id, 1)}
              canMoveUp={index > 0}
              canMoveDown={index < device.interfaces.length - 1}
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
