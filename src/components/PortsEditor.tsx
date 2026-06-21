import { useState } from 'react';

interface PortsEditorProps {
  ports: number[];
  onChange: (ports: number[]) => void;
}

const COMMON_PORTS: { label: string; port: number }[] = [
  { label: 'SSH:22', port: 22 },
  { label: 'HTTP:80', port: 80 },
  { label: 'HTTPS:443', port: 443 },
  { label: 'DNS:53', port: 53 },
  { label: 'RDP:3389', port: 3389 },
];

function parsePorts(text: string): number[] {
  const tokens = text.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
  const parsed = tokens.map((t) => Number.parseInt(t, 10)).filter((n) => Number.isFinite(n) && n > 0 && n <= 65535);
  return [...new Set(parsed)];
}

export function PortsEditor({ ports, onChange }: PortsEditorProps) {
  const [text, setText] = useState(() => ports.join(', '));

  function setPorts(next: number[]) {
    setText(next.join(', '));
    onChange(next);
  }

  function toggleChip(port: number) {
    const current = parsePorts(text);
    const next = current.includes(port) ? current.filter((p) => p !== port) : [...current, port];
    setPorts(next);
  }

  const activePorts = new Set(parsePorts(text));

  return (
    <div>
      <input
        className="ports-editor-input"
        value={text}
        placeholder="e.g. 22, 80, 443"
        onChange={(e) => {
          setText(e.target.value);
          onChange(parsePorts(e.target.value));
        }}
      />
      <div className="ports-editor-chips">
        {COMMON_PORTS.map(({ label, port }) => (
          <button
            key={port}
            type="button"
            className={`ports-editor-chip${activePorts.has(port) ? ' is-active' : ''}`}
            onClick={() => toggleChip(port)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
