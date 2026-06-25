import { useState } from 'react';
import { ArrowDown, ArrowUp, Star, Trash2 } from 'lucide-react';
import { parseCidrToken, formatIpAddress } from '../lib/cidr';
import type { InterfaceStatus, NetInterface } from '../types';

interface InterfaceEditorRowProps {
  iface: NetInterface;
  onChange: (next: NetInterface) => void;
  onRemove: () => void;
  onSetManagement: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const STATUS_OPTIONS: InterfaceStatus[] = ['up', 'down', 'admin-down', 'unknown'];

export function InterfaceEditorRow({
  iface,
  onChange,
  onRemove,
  onSetManagement,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: InterfaceEditorRowProps) {
  const [addressesText, setAddressesText] = useState(() =>
    iface.addresses.map(formatIpAddress).join(', '),
  );
  const [natText, setNatText] = useState(() => (iface.natAddress ? formatIpAddress(iface.natAddress) : ''));

  return (
    <div className={`iface-editor-row${iface.isManagement ? ' is-management' : ''}`}>
      <div className="iface-editor-line">
        <button
          type="button"
          className={`iface-star-btn${iface.isManagement ? ' is-active' : ''}`}
          onClick={onSetManagement}
          title={iface.isManagement ? 'Management interface' : 'Set as management interface'}
        >
          <Star size={14} fill={iface.isManagement ? 'currentColor' : 'none'} />
        </button>
        <div className="iface-move-controls" aria-label="Reorder interface">
          <button
            type="button"
            className="iface-move-btn"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            title="Move interface up"
          >
            <ArrowUp size={12} />
          </button>
          <button
            type="button"
            className="iface-move-btn"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            title="Move interface down"
          >
            <ArrowDown size={12} />
          </button>
        </div>
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
          <Trash2 size={14} />
        </button>
      </div>
      {iface.isManagement && (
        <div className="iface-management-caption">
          <Star size={11} fill="currentColor" /> Management interface — IP used for SSH/access
        </div>
      )}
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
      <input
        className="iface-editor-nat"
        value={natText}
        placeholder="NAT address, e.g. 203.0.113.5/32 (set if reached via a router doing NAT)"
        title="Address this interface is reached at from outside its subnet, via a router performing NAT"
        onChange={(e) => {
          setNatText(e.target.value);
          const token = e.target.value.trim();
          const parsed = token ? parseCidrToken(token) : null;
          onChange({ ...iface, natAddress: parsed ?? undefined });
        }}
      />
    </div>
  );
}
