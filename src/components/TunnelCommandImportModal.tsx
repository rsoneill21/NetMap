import { useMemo, useState } from 'react';
import { parseTunnelCommandText } from '../lib/tunnel';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { DeviceNode, TunnelData } from '../types';

interface TunnelCommandImportModalProps {
  nodes: DeviceNode[];
  anchorDevice?: DeviceNode;
  onCreate: (tunnel: TunnelData) => void;
  onClose: () => void;
}

export function TunnelCommandImportModal({ nodes, anchorDevice, onCreate, onClose }: TunnelCommandImportModalProps) {
  const [text, setText] = useState('');
  const [firstLine, setFirstLine] = useState('');
  const [extraLines, setExtraLines] = useState('');
  const [hostOverrides, setHostOverrides] = useState<Record<string, string>>({});

  const combinedText = anchorDevice
    ? [`${anchorDevice.data.label} ~ ${firstLine}`, extraLines].filter(Boolean).join('\n')
    : text;
  const debouncedText = useDebouncedValue(combinedText, 250);

  const { tunnel, errors } = parseTunnelCommandText(debouncedText, nodes, hostOverrides);

  const unresolvedTokens = useMemo(() => {
    const seen = new Map<string, string>();
    for (const err of errors) {
      if (err.unresolvedToken) seen.set(err.unresolvedToken.toLowerCase(), err.unresolvedToken);
    }
    return [...seen.entries()];
  }, [errors]);

  function setOverride(tokenKey: string, deviceId: string) {
    setHostOverrides((prev) => ({ ...prev, [tokenKey]: deviceId }));
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal modal-wide">
        <h2>New Tunnel from Commands</h2>
        <p className="modal-help">
          One line per hop: <code>&lt;device&gt; ~ ssh|telnet [-L/-R/-D ...] user@&lt;device&gt;</code>. The destination
          can be a device's name, or an IP address already configured on one of its interfaces. Nothing is executed
          — this only builds the diagram.
        </p>

        {anchorDevice ? (
          <>
            <div className="tunnel-anchor-row">
              <span className="tunnel-anchor-prefix">{anchorDevice.data.label} ~</span>
              <input
                className="tunnel-anchor-input"
                value={firstLine}
                onChange={(e) => setFirstLine(e.target.value)}
                placeholder="ssh -L 2222:localhost:22 brian@142.16.8.41"
                autoFocus
              />
            </div>
            <label className="tunnel-extra-hops-label">Additional hops (optional)</label>
            <textarea
              className="modal-textarea"
              value={extraLines}
              onChange={(e) => setExtraLines(e.target.value)}
              placeholder={'PC2 ~ telnet PC3'}
              rows={5}
            />
          </>
        ) : (
          <textarea
            className="modal-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'PC1 ~ ssh user@PC2\nPC2 ~ telnet PC3\nPC1 ~ ssh -L 1111:PC3:22 user@PC2'}
            rows={10}
            autoFocus
          />
        )}

        <div className="modal-preview">
          {tunnel
            ? `${tunnel.hops.length} hop(s) parsed${tunnel.portMappings.length > 0 ? `, ${tunnel.portMappings.length} port mapping(s)` : ''}.`
            : 'No hops parsed yet.'}
        </div>

        {errors.length > 0 && (
          <div className="tunnel-hop-list">
            {errors.map((err, i) => (
              <div key={i} className="tunnel-hop-row tunnel-error-row">
                {err.message}
              </div>
            ))}
            {unresolvedTokens.map(([key, original]) => (
              <div key={key} className="tunnel-hop-row tunnel-resolve-row">
                <span>Assign "{original}" to:</span>
                <select value={hostOverrides[key] ?? ''} onChange={(e) => setOverride(key, e.target.value)}>
                  <option value="" disabled>
                    Select device...
                  </option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.data.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="toolbar-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="toolbar-btn toolbar-btn-primary"
            disabled={!tunnel}
            onClick={() => {
              if (!tunnel) return;
              onCreate(tunnel);
              onClose();
            }}
          >
            Create Tunnel
          </button>
        </div>
      </div>
    </div>
  );
}
