import { useState } from 'react';
import { nextId } from '../lib/device';
import { DEFAULT_PROXYCHAINS_PORT, findDynamicPortConflict } from '../lib/tunnel';
import { AlertModal } from './AlertModal';
import type { DeviceEdge, DeviceNode, HopProtocol, PortForwardType, PortMapping, TunnelData, TunnelHop } from '../types';

interface TunnelWizardModalProps {
  nodes: DeviceNode[];
  existingTunnels: TunnelData[];
  physicalEdges: DeviceEdge[];
  onCreate: (tunnel: TunnelData) => void;
  onClose: () => void;
}

function emptyMapping(type: PortForwardType): PortMapping {
  return { id: nextId('mapping'), type, localPort: type === 'dynamic' ? DEFAULT_PROXYCHAINS_PORT : undefined };
}

function firstOtherDeviceId(nodes: DeviceNode[], excludeId: string): string {
  return nodes.find((n) => n.id !== excludeId)?.id ?? nodes[0]?.id ?? '';
}

export function TunnelWizardModal({
  nodes,
  existingTunnels,
  physicalEdges,
  onCreate,
  onClose,
}: TunnelWizardModalProps) {
  const [step, setStep] = useState<'hops' | 'forwarding'>('hops');
  const [hops, setHops] = useState<TunnelHop[]>([]);
  const [fromId, setFromId] = useState(nodes[0]?.id ?? '');
  const [toId, setToId] = useState(firstOtherDeviceId(nodes, nodes[0]?.id ?? ''));
  const [protocol, setProtocol] = useState<HopProtocol>('ssh');

  const [forwardingHopId, setForwardingHopId] = useState<string>('');
  const [mappings, setMappings] = useState<PortMapping[]>([]);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  function deviceLabel(id: string): string {
    return nodes.find((n) => n.id === id)?.data.label ?? id;
  }

  function addHop() {
    if (!fromId || !toId || fromId === toId) return;
    setHops((prev) => [...prev, { id: nextId('hop'), fromDeviceId: fromId, toDeviceId: toId, protocol }]);
    // Auto-advance: the next hop naturally continues from where this one left off.
    setFromId(toId);
    setToId(firstOtherDeviceId(nodes, toId));
  }

  function removeHop(hopId: string) {
    setHops((prev) => prev.filter((h) => h.id !== hopId));
  }

  function goToForwarding() {
    if (hops.length === 0) return;
    setForwardingHopId(hops[hops.length - 1].id);
    setStep('forwarding');
  }

  function addMapping(type: PortForwardType) {
    setMappings((prev) => [...prev, emptyMapping(type)]);
  }

  function updateMapping(id: string, patch: Partial<PortMapping>) {
    setMappings((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function removeMapping(id: string) {
    setMappings((prev) => prev.filter((m) => m.id !== id));
  }

  const forwardingHop = hops.find((h) => h.id === forwardingHopId);
  const forwardingDestDevice = forwardingHop ? nodes.find((n) => n.id === forwardingHop.toDeviceId)?.data : undefined;
  const destPorts = forwardingDestDevice?.ports ?? [];

  function handleSubmit() {
    if (!forwardingHopId || mappings.length === 0 || !forwardingHop) return;

    for (const mapping of mappings) {
      if (mapping.type !== 'dynamic' || mapping.localPort == null) continue;
      const conflict = findDynamicPortConflict(mapping.localPort, forwardingHop.fromDeviceId, existingTunnels, physicalEdges);
      if (conflict) {
        setConflictMessage(
          `Port ${mapping.localPort} is already used as a proxychains (-D) port by another tunnel, and that tunnel's device is reachable on the same physical network as ${deviceLabel(forwardingHop.fromDeviceId)}. Pick a different SOCKS port, or this is fine if the tunnels are meant to be on genuinely separate, disconnected networks.`,
        );
        return;
      }
    }

    const tunnel: TunnelData = {
      id: nextId('tunnel'),
      hops,
      forwardingHopId,
      portMappings: mappings,
    };
    onCreate(tunnel);
    onClose();
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal modal-wide">
        <h2>New Tunnel</h2>
        <p className="modal-help">
          Build a hypothetical access chain (e.g. <code>BIH -&gt; PC1 -&gt; PC2 -&gt; PC3</code>), then designate
          which hop carries the SSH port-forward back through the chain. Nothing is executed — this only generates
          the commands you'd run.
        </p>

        {step === 'hops' && (
          <>
            <div className="tunnel-hop-list">
              {hops.length === 0 && <div className="tunnel-empty">No hops yet — add at least one below.</div>}
              {hops.map((hop, i) => (
                <div key={hop.id} className="tunnel-hop-row">
                  <span>
                    {i + 1}. {deviceLabel(hop.fromDeviceId)} &rarr; {deviceLabel(hop.toDeviceId)} ({hop.protocol})
                  </span>
                  <button type="button" className="toolbar-btn toolbar-btn-danger" onClick={() => removeHop(hop.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="tunnel-form-row">
              <select value={fromId} onChange={(e) => setFromId(e.target.value)}>
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.data.label}
                  </option>
                ))}
              </select>
              <span>&rarr;</span>
              <select value={toId} onChange={(e) => setToId(e.target.value)}>
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.data.label}
                  </option>
                ))}
              </select>
              <select value={protocol} onChange={(e) => setProtocol(e.target.value as HopProtocol)}>
                <option value="ssh">SSH</option>
                <option value="telnet">Telnet</option>
              </select>
              <button type="button" className="toolbar-btn" onClick={addHop} disabled={!fromId || !toId || fromId === toId}>
                Add Hop
              </button>
            </div>
            <div className="modal-actions">
              <button type="button" className="toolbar-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="toolbar-btn toolbar-btn-primary" onClick={goToForwarding} disabled={hops.length === 0}>
                Next: Forwarding
              </button>
            </div>
          </>
        )}

        {step === 'forwarding' && (
          <>
            <div className="tunnel-form-row">
              <label>Forwarding hop:</label>
              <select value={forwardingHopId} onChange={(e) => setForwardingHopId(e.target.value)}>
                {hops.map((hop, i) => (
                  <option key={hop.id} value={hop.id}>
                    {i + 1}. {deviceLabel(hop.fromDeviceId)} &rarr; {deviceLabel(hop.toDeviceId)}
                  </option>
                ))}
              </select>
            </div>

            <div className="tunnel-hop-list">
              {mappings.length === 0 && <div className="tunnel-empty">No port mappings yet — add at least one below.</div>}
              {mappings.map((mapping) => (
                <div key={mapping.id} className="tunnel-hop-row">
                  <span className="tunnel-mapping-type">{mapping.type}</span>
                  {mapping.type !== 'dynamic' && (
                    <>
                      <input
                        type="number"
                        placeholder="local port"
                        value={mapping.localPort ?? ''}
                        onChange={(e) => updateMapping(mapping.id, { localPort: Number(e.target.value) || undefined })}
                      />
                      <input
                        type="text"
                        placeholder="remote host (optional)"
                        value={mapping.remoteHost ?? ''}
                        onChange={(e) => updateMapping(mapping.id, { remoteHost: e.target.value || undefined })}
                      />
                      <input
                        type="number"
                        placeholder="remote port"
                        value={mapping.remotePort ?? ''}
                        onChange={(e) => updateMapping(mapping.id, { remotePort: Number(e.target.value) || undefined })}
                      />
                      {destPorts.length > 0 && (
                        <div className="ports-editor-chips tunnel-port-chips">
                          {destPorts.map((port) => (
                            <button
                              key={port}
                              type="button"
                              className={`ports-editor-chip${mapping.remotePort === port ? ' is-active' : ''}`}
                              onClick={() =>
                                updateMapping(mapping.id, {
                                  remotePort: port,
                                  remoteHost: mapping.remoteHost ?? forwardingDestDevice?.label,
                                })
                              }
                            >
                              {port}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {mapping.type === 'dynamic' && (
                    <input
                      type="number"
                      placeholder="SOCKS port"
                      value={mapping.localPort ?? ''}
                      onChange={(e) => updateMapping(mapping.id, { localPort: Number(e.target.value) || undefined })}
                    />
                  )}
                  <button type="button" className="toolbar-btn toolbar-btn-danger" onClick={() => removeMapping(mapping.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="tunnel-form-row">
              <button type="button" className="toolbar-btn" onClick={() => addMapping('local')}>
                + Local (-L)
              </button>
              <button type="button" className="toolbar-btn" onClick={() => addMapping('remote')}>
                + Remote (-R)
              </button>
              <button type="button" className="toolbar-btn" onClick={() => addMapping('dynamic')}>
                + Dynamic (-D / proxychains)
              </button>
            </div>
            <div className="modal-actions">
              <button type="button" className="toolbar-btn" onClick={() => setStep('hops')}>
                Back
              </button>
              <button
                type="button"
                className="toolbar-btn toolbar-btn-primary"
                onClick={handleSubmit}
                disabled={!forwardingHopId || mappings.length === 0}
              >
                Create Tunnel
              </button>
            </div>
          </>
        )}
      </div>
      {conflictMessage && (
        <AlertModal title="Proxychains Port Conflict" message={conflictMessage} onClose={() => setConflictMessage(null)} />
      )}
    </div>
  );
}
