import { useMemo, useState } from 'react';
import { Cable, Copy, Plus, TerminalSquare } from 'lucide-react';
import type { DeviceNode, LinkData, TunnelKind } from '../types';

interface TunnelConsoleProps {
  nodes: DeviceNode[];
  selectedNode: DeviceNode | null;
  onCreateTunnel: (sourceId: string, targetId: string, data: Partial<LinkData>) => string;
  onStatus: (message: string | null) => void;
}

interface ParsedTunnel {
  tunnelKind: TunnelKind;
  label: string;
  bindHost?: string;
  localPort?: number;
  remoteHost?: string;
  remotePort?: number;
  sshUser?: string;
  sshHost?: string;
  sshPort?: number;
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseSshCommand(command: string): ParsedTunnel | null {
  const normalized = command.trim().replace(/\s+/g, ' ');
  if (!normalized.startsWith('ssh ')) return null;

  const sshPort = parseNumber(normalized.match(/(?:^|\s)-p\s+(\d+)/)?.[1]);
  const sshTarget = normalized.match(/(?:^|\s)([\w.-]+@)?([a-zA-Z0-9_.:-]+)(?:\s|$)/g)?.at(-1)?.trim();
  const sshUserHost = sshTarget && !sshTarget.startsWith('-') ? sshTarget : undefined;
  const sshUser = sshUserHost?.includes('@') ? sshUserHost.split('@')[0] : undefined;
  const sshHost = sshUserHost?.includes('@') ? sshUserHost.split('@').slice(1).join('@') : sshUserHost;

  const dynamic = normalized.match(/(?:^|\s)-D\s+(?:(127\.0\.0\.1|0\.0\.0\.0|localhost):)?(\d+)/);
  if (dynamic) {
    const localPort = parseNumber(dynamic[2]);
    return {
      tunnelKind: 'dynamic-socks',
      label: localPort ? `SOCKS :${localPort}` : 'SOCKS tunnel',
      bindHost: dynamic[1] ?? '127.0.0.1',
      localPort,
      sshUser,
      sshHost,
      sshPort,
    };
  }

  const local = normalized.match(/(?:^|\s)-L\s+([^\s]+)/);
  if (local) {
    const parts = local[1].split(':');
    const hasBindHost = parts.length === 4;
    const bindHost = hasBindHost ? parts[0] : '127.0.0.1';
    const localPort = parseNumber(hasBindHost ? parts[1] : parts[0]);
    const remoteHost = hasBindHost ? parts[2] : parts[1];
    const remotePort = parseNumber(hasBindHost ? parts[3] : parts[2]);
    return {
      tunnelKind: 'local-forward',
      label: localPort && remoteHost && remotePort ? `-L ${localPort} -> ${remoteHost}:${remotePort}` : 'local forward',
      bindHost,
      localPort,
      remoteHost,
      remotePort,
      sshUser,
      sshHost,
      sshPort,
    };
  }

  return {
    tunnelKind: 'direct-ssh',
    label: sshHost ? `SSH ${sshHost}${sshPort ? `:${sshPort}` : ''}` : 'SSH tunnel',
    sshUser,
    sshHost,
    sshPort,
  };
}

export function TunnelConsole({ nodes, selectedNode, onCreateTunnel, onStatus }: TunnelConsoleProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [targetId, setTargetId] = useState('');
  const [command, setCommand] = useState('ssh user@host -D 9050');

  const deviceOptions = useMemo(() => nodes.map((node) => ({ id: node.id, label: node.data.label })), [nodes]);
  const targetOptions = deviceOptions.filter((node) => node.id !== selectedNode?.id);
  const canCreate = Boolean(selectedNode && targetId && command.trim());
  const parsed = parseSshCommand(command);

  function createTunnel() {
    if (!canCreate) {
      onStatus('Choose source and target devices, then enter an SSH tunnel command.');
      return;
    }
    const parsedTunnel = parseSshCommand(command);
    if (!parsedTunnel) {
      onStatus('Could not parse that SSH command yet. Try ssh user@host -D 9050 or -L 60001:host:22.');
      return;
    }
    if (!selectedNode) return;
    onCreateTunnel(selectedNode.id, targetId, {
      ...parsedTunnel,
      linkKind: 'tunnel',
      tunnelStatus: 'planned',
      protocol: 'ssh',
      command,
    });
    onStatus(`Created tunnel link: ${parsedTunnel.label}.`);
  }

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
      onStatus('Tunnel command copied.');
    } catch {
      onStatus(command);
    }
  }

  if (!selectedNode) return null;

  return (
    <section className={`tunnel-console${isOpen ? ' is-open' : ''}`}>
      <button type="button" className="tunnel-console-tab" onClick={() => setIsOpen((v) => !v)}>
        <TerminalSquare size={14} />
        {selectedNode.data.label}
      </button>
      {isOpen && (
        <div className="tunnel-console-body">
          <div className="tunnel-console-controls">
            <div className="tunnel-console-context">
              <span>Running from</span>
              <strong>{selectedNode.data.label}</strong>
            </div>
            <label>
              Target
              <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                <option value="">Choose reached host</option>
                {targetOptions.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="toolbar-btn" onClick={copyCommand} title="Copy command">
              <Copy size={13} />
            </button>
            <button type="button" className="toolbar-btn toolbar-btn-primary" onClick={createTunnel} disabled={!canCreate}>
              <Plus size={13} />
              Add Tunnel
            </button>
          </div>
          <div className="tunnel-console-command-row">
            <span className="tunnel-console-prompt">$</span>
            <input
              value={command}
              spellCheck={false}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="ssh user@ip -p 22 -D 9050 or ssh user@ip -L 60001:remote_host:22"
            />
          </div>
          <div className="tunnel-console-preview">
            <Cable size={13} />
            {parsed ? parsed.label : 'Enter an SSH -D or -L command to preview the tunnel label'}
          </div>
        </div>
      )}
    </section>
  );
}
