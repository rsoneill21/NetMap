import { ChevronDown, LayoutGrid, RefreshCw, Cable, Terminal } from 'lucide-react';
import { useDropdown } from '../hooks/useDropdown';

interface EditMenuProps {
  onTidy: () => void;
  onRelinkSubnets: () => void;
  onNewTunnel: () => void;
  onNewTunnelFromCommands: () => void;
}

export function EditMenu({ onTidy, onRelinkSubnets, onNewTunnel, onNewTunnelFromCommands }: EditMenuProps) {
  const { open, setOpen, rootRef } = useDropdown();

  return (
    <div className="toolbar-menu" ref={rootRef}>
      <button type="button" className="toolbar-btn" onClick={() => setOpen((v) => !v)} title="Edit: layout tools">
        Edit <ChevronDown size={12} />
      </button>
      {open && (
        <div className="toolbar-menu-dropdown">
          <button
            type="button"
            className="toolbar-menu-item"
            onClick={() => {
              onTidy();
              setOpen(false);
            }}
          >
            <LayoutGrid size={14} /> Tidy
          </button>
          <button
            type="button"
            className="toolbar-menu-item"
            onClick={() => {
              onRelinkSubnets();
              setOpen(false);
            }}
          >
            <RefreshCw size={14} /> Re-link Subnets
          </button>
          <button
            type="button"
            className="toolbar-menu-item"
            onClick={() => {
              onNewTunnel();
              setOpen(false);
            }}
          >
            <Cable size={14} /> New Tunnel...
          </button>
          <button
            type="button"
            className="toolbar-menu-item"
            onClick={() => {
              onNewTunnelFromCommands();
              setOpen(false);
            }}
          >
            <Terminal size={14} /> New Tunnel from Commands...
          </button>
        </div>
      )}
    </div>
  );
}
