import { ChevronDown, LayoutGrid, RefreshCw } from 'lucide-react';
import { useDropdown } from '../hooks/useDropdown';

interface EditMenuProps {
  onTidy: () => void;
  onRelinkSubnets: () => void;
}

export function EditMenu({ onTidy, onRelinkSubnets }: EditMenuProps) {
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
        </div>
      )}
    </div>
  );
}
