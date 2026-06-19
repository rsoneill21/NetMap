import { useState } from 'react';
import { parseCidrToken, formatIpAddress } from '../lib/cidr';
import type { InterfaceStatus, NetInterface } from '../types';

interface InterfaceEditorRowProps {
  iface: NetInterface;
  onChange: (next: NetInterface) => void;
  onRemove: () => void;
}

const STATUS_OPTIONS: InterfaceStatus[] = ['up', 'down', 'admin-down', 'unknown'];

export function InterfaceEditorRow({ iface, onChange, onRemove }: InterfaceEditorRowProps) {
  const [addressesText, setAddressesText] = useState(() =>
    iface.addresses.map(formatIpAddress).join(', '),
  );

  return (
    <div className="iface-editor-row">
      <div className="iface-editor-line">
        <input
          className="iface-editor-name"
          value={iface.name}
          onChange={(e) => onChange({ ...iface, name: e.target.value })}
        />
        <select
          className="iface-editor-status"
          value={iface.status}
          onChange={(e) => onChange({ ...iface, status: e.target.value as InterfaceStatus })}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="button" className="icon-btn-danger" onClick={onRemove} title="Remove interface">
          ×
        </button>
      </div>
      <input
        className="iface-editor-addresses"
        value={addressesText}
        placeholder="e.g. 192.168.0.1/24, ::1/128"
        onChange={(e) => {
          setAddressesText(e.target.value);
          const tokens = e.target.value.split(',').map((t) => t.trim()).filter(Boolean);
          const parsed = tokens.map(parseCidrToken).filter((ip): ip is NonNullable<typeof ip> => ip !== null);
          onChange({ ...iface, addresses: parsed });
        }}
      />
      <input
        className="iface-editor-description"
        value={iface.description}
        placeholder="description"
        onChange={(e) => onChange({ ...iface, description: e.target.value })}
      />
    </div>
  );
}
