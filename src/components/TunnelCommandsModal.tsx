import { Copy } from 'lucide-react';
import { buildTunnelCommandBlock } from '../lib/tunnel';
import type { DeviceNode, TunnelData } from '../types';

interface TunnelCommandsModalProps {
  tunnel: TunnelData;
  nodes: DeviceNode[];
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function copy(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export function TunnelCommandsModal({ tunnel, nodes, onEdit, onDelete, onClose }: TunnelCommandsModalProps) {
  const { hopCommands, mappingDescriptions, proxychainsLines } = buildTunnelCommandBlock(tunnel, nodes);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal modal-wide">
        <h2>Tunnel Commands{tunnel.label ? ` — ${tunnel.label}` : ''}</h2>
        <p className="modal-help">
          Hypothetical commands for this pivot chain. Nothing here is executed — copy these into your own lab/terminal.
        </p>

        <h3 className="tunnel-section-title">Pivot chain</h3>
        <div className="tunnel-command-block">
          {hopCommands.map((hop) => (
            <div key={hop.hopId} className="tunnel-command-row">
              <div>
                <div className="tunnel-command-label">{hop.label}</div>
                <code>{hop.command}</code>
              </div>
              <button type="button" className="toolbar-btn" onClick={() => copy(hop.command)} title="Copy command">
                <Copy size={14} />
              </button>
            </div>
          ))}
        </div>

        {mappingDescriptions.length > 0 && (
          <>
            <h3 className="tunnel-section-title">Port mappings</h3>
            <div className="tunnel-command-block">
              {mappingDescriptions.map((desc, i) => (
                <div key={i} className="tunnel-command-row">
                  <code>{desc}</code>
                </div>
              ))}
            </div>
          </>
        )}

        {proxychainsLines.length > 0 && (
          <>
            <h3 className="tunnel-section-title">proxychains.conf</h3>
            <div className="tunnel-command-block">
              {proxychainsLines.map((line, i) => (
                <div key={i} className="tunnel-command-row">
                  <code>{line}</code>
                  <button type="button" className="toolbar-btn" onClick={() => copy(line)} title="Copy line">
                    <Copy size={14} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="toolbar-btn toolbar-btn-danger" onClick={onDelete}>
            Delete Tunnel
          </button>
          <button type="button" className="toolbar-btn" onClick={onEdit}>
            Edit Tunnel
          </button>
          <button type="button" className="toolbar-btn toolbar-btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
