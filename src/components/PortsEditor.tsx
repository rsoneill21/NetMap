import { useState } from 'react';

interface PortsEditorProps {
  ports: number[];
  onChange: (ports: number[]) => void;
}

function parsePorts(text: string): number[] {
  const tokens = text.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
  const parsed = tokens.map((t) => Number.parseInt(t, 10)).filter((n) => Number.isFinite(n) && n > 0 && n <= 65535);
  return [...new Set(parsed)];
}

export function PortsEditor({ ports, onChange }: PortsEditorProps) {
  const [text, setText] = useState(() => ports.join(', '));

  return (
    <input
      className="ports-editor-input"
      value={text}
      placeholder="e.g. 22, 80, 443"
      onChange={(e) => {
        setText(e.target.value);
        onChange(parsePorts(e.target.value));
      }}
    />
  );
}
