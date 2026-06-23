import { useMemo, useState } from 'react';
import { nextId } from '../lib/device';
import { DEFAULT_PROXYCHAINS_PORT, findDynamicPortConflict, findPivotCandidates } from '../lib/tunnel';
import { AlertModal } from './AlertModal';
import type { DeviceEdge, DeviceNode, HopProtocol, PortForwardType, PortMapping, TunnelData, TunnelHop } from '../types';

interface TunnelWizardModalProps {
  nodes: DeviceNode[];
  existingTunnels: TunnelData[];
  physicalEdges: DeviceEdge[];
  editingTunnel?: TunnelData;
  onSubmit: (tunnel: TunnelData) => void;
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
  editingTunnel,
  onSubmit,
  onClose,
}: TunnelWizardModalProps) {
  const [step, setStep] = useState<'hops' | 'forwarding'>('hops');
  const [label, setLabel] = useState(editingTunnel?.label ?? '');
  const [hops, setHops] = useState<TunnelHop[]>(editingTunnel?.hops ?? []);
  const [fromId, setFromId] = useState(nodes[0]?.id ?? '');
  const [toId, setToId] = useState(firstOtherDeviceId(nodes, nodes[0]?.id ?? ''));
  const [protocol, setProtocol] = useState<HopProtocol>('ssh');

  const [forwardingHopId, setForwardingHopId] = useState<string>(editingTunnel?.forwardingHopId ?? '');
  const [mappings, setMappings] = useState<PortMapping[]>(editingTunnel?.portMappings ?? []);
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

  const sshHops = hops.filter((h) => h.protocol === 'ssh');

  function goToForwarding() {
    if (hops.length === 0 || sshHops.length === 0) return;
    if (!forwardingHopId || !sshHops.some((h) => h.id === forwardingHopId)) {
      setForwardingHopId(sshHops[sshHops.length - 1].id);
    }
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
  const fromLabel = forwardingHop ? deviceLabel(forwardingHop.fromDeviceId) : '';
  const toLabel = forwardingHop ? deviceLabel(forwardingHop.toDeviceId) : '';

  const forwardingHopToDeviceId = forwardingHop?.toDeviceId;
  const pivotCandidates = useMemo(
    () => (forwardingHopToDeviceId ? findPivotCandidates(forwardingHopToDeviceId, nodes) : []),
    [forwardingHopToDeviceId, nodes],
  );

  function portsForMapping(mapping: PortMapping): number[] {
    if (mapping.remoteHost) {
      const target = nodes.find((n) => n.data.label.toLowerCase() === mapping.remoteHost!.toLowerCase());
      if (target) return target.data.ports ?? [];
    }
    return destPorts;
  }

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
      id: editingTunnel?.id ?? nextId('tunnel'),
      label: label.trim() || undefined,
      hops,
      forwardingHopId,
      portMappings: mappings,
    };
    onSubmit(tunnel);
    onClose();
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal modal-wide">
        <h2>{editingTunnel ? 'Edit Tunnel' : 'New Tunnel'}</h2>
        <p className="modal-help">
          Build a hypothetical access chain (e.g. <code>BIH -&gt; PC1 -&gt; PC2 -&gt; PC3</code>), then designate
          which hop carries the SSH port-forward back through the chain. Nothing is executed — this only generates
          the commands you'd run.
        </p>

        <label className="tunnel-name-field">
          <span>Tunnel name (optional)</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Pivot to admin segment"
          />
        </label>

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
            {hops.length > 0 && sshHops.length === 0 && (
              <div className="tunnel-empty tunnel-warning-text">
                Add at least one SSH hop before continuing — Telnet can't carry a port-forward.
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="toolbar-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="toolbar-btn toolbar-btn-primary"
                onClick={goToForwarding}
                disabled={hops.length === 0 || sshHops.length === 0}
              >
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
                {sshHops.map((hop) => (
                  <option key={hop.id} value={hop.id}>
                    {hops.indexOf(hop) + 1}. {deviceLabel(hop.fromDeviceId)} &rarr; {deviceLabel(hop.toDeviceId)}
                  </option>
                ))}
              </select>
            </div>

            <div className="tunnel-hop-list">
              {mappings.length === 0 && <div className="tunnel-empty">No port mappings yet — add at least one below.</div>}
              {mappings.map((mapping) => {
                const isLocal = mapping.type === 'local';
                const primaryPort = isLocal ? mapping.localPort : mapping.remotePort;
                const secondaryPort = isLocal ? mapping.remotePort : mapping.localPort;
                const primaryLabel = isLocal ? `Your port (on ${fromLabel})` : `Opens on ${toLabel}`;
                const secondaryLabel = isLocal ? `Forwards to (reachable from ${toLabel})` : `Reachable from ${fromLabel}`;
                const diagramSource = isLocal ? fromLabel : toLabel;
                const diagramTarget = mapping.remoteHost || (isLocal ? toLabel : fromLabel);
                const diagram = `${diagramSource}:${primaryPort ?? '?'} → ${diagramTarget}:${secondaryPort ?? '?'}`;

                return (
                  <div key={mapping.id} className="tunnel-hop-row">
                    <span className="tunnel-mapping-type">{mapping.type}</span>
                    {mapping.type !== 'dynamic' && (
                      <>
                        <label className="tunnel-mapping-field">
                          <span>{primaryLabel}</span>
                          <input
                            type="number"
                            value={primaryPort ?? ''}
                            onChange={(e) =>
                              updateMapping(
                                mapping.id,
                                isLocal
                                  ? { localPort: Number(e.target.value) || undefined }
                                  : { remotePort: Number(e.target.value) || undefined },
                              )
                            }
                          />
                        </label>
                        <label className="tunnel-mapping-field">
                          <span>{secondaryLabel}</span>
                          <div className="tunnel-mapping-host-port">
                            <input
                              type="text"
                              placeholder={isLocal ? toLabel : fromLabel}
                              value={mapping.remoteHost ?? ''}
                              onChange={(e) => updateMapping(mapping.id, { remoteHost: e.target.value || undefined })}
                            />
                            <input
                              type="number"
                              placeholder="port"
                              value={secondaryPort ?? ''}
                              onChange={(e) =>
                                updateMapping(
                                  mapping.id,
                                  isLocal
                                    ? { remotePort: Number(e.target.value) || undefined }
                                    : { localPort: Number(e.target.value) || undefined },
                                )
                              }
                            />
                          </div>
                        </label>
                        <div className="tunnel-mapping-diagram">{diagram}</div>
                        {portsForMapping(mapping).length > 0 && (
                          <div className="ports-editor-chips tunnel-port-chips">
                            {portsForMapping(mapping).map((port) => (
                              <button
                                key={port}
                                type="button"
                                className={`ports-editor-chip${secondaryPort === port ? ' is-active' : ''}`}
                                onClick={() =>
                                  updateMapping(mapping.id, {
                                    ...(isLocal ? { remotePort: port } : { localPort: port }),
                                    remoteHost: mapping.remoteHost ?? diagramTarget,
                                  })
                                }
                              >
                                {port}
                              </button>
                            ))}
                          </div>
                        )}
                        {isLocal && pivotCandidates.length > 0 && (
                          <div className="tunnel-pivot-hints">
                            <span className="tunnel-pivot-hints-label">Beyond {forwardingDestDevice?.label}:</span>
                            {pivotCandidates.map((c) => (
                              <button
                                key={c.deviceId}
                                type="button"
                                className={`ports-editor-chip${mapping.remoteHost?.toLowerCase() === c.device.label.toLowerCase() ? ' is-active' : ''}`}
                                onClick={() => updateMapping(mapping.id, { remoteHost: c.device.label, remotePort: undefined })}
                                title={`Reachable via ${forwardingDestDevice?.label}'s ${c.viaCidr} interface`}
                              >
                                {c.device.label} (via {c.viaCidr})
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    {mapping.type === 'dynamic' && (
                      <label className="tunnel-mapping-field">
                        <span>SOCKS port (opens on {fromLabel})</span>
                        <input
                          type="number"
                          value={mapping.localPort ?? ''}
                          onChange={(e) => updateMapping(mapping.id, { localPort: Number(e.target.value) || undefined })}
                        />
                      </label>
                    )}
                    <button type="button" className="toolbar-btn toolbar-btn-danger" onClick={() => removeMapping(mapping.id)}>
                      Remove
                    </button>
                  </div>
                );
              })}
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
                {editingTunnel ? 'Save Tunnel' : 'Create Tunnel'}
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
