import { useEffect, useRef, useState } from 'react';
import { Save, ChevronDown } from 'lucide-react';
import type { ShareSaveResult } from '../lib/share';

interface SaveMenuProps {
  onSave: () => Promise<ShareSaveResult | null>;
  onSaveAsNew: () => Promise<ShareSaveResult | null>;
  onLoad: (code: string) => Promise<boolean>;
}

export function SaveMenu({ onSave, onSaveAsNew, onLoad }: SaveMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadCode, setLoadCode] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleSave() {
    setBusy(true);
    await onSave();
    setBusy(false);
    setOpen(false);
  }

  async function handleSaveAsNew() {
    setBusy(true);
    await onSaveAsNew();
    setBusy(false);
    setOpen(false);
  }

  async function handleLoad() {
    if (loadCode.trim().length !== 4) return;
    setBusy(true);
    const ok = await onLoad(loadCode.trim());
    setBusy(false);
    if (ok) {
      setLoadCode('');
      setOpen(false);
    }
  }

  return (
    <div className="save-menu" ref={rootRef}>
      <button
        type="button"
        className="toolbar-btn toolbar-btn-primary"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        title="Save, save as a new link, or load a saved map by code"
      >
        <Save size={16} /> {busy ? 'Working...' : 'Save'} <ChevronDown size={12} />
      </button>
      {open && (
        <div className="save-menu-dropdown">
          <button type="button" className="save-menu-item" onClick={handleSave} disabled={busy}>
            Save
          </button>
          <button type="button" className="save-menu-item" onClick={handleSaveAsNew} disabled={busy}>
            Save as New Link
          </button>
          <div className="save-menu-divider" />
          <div className="save-menu-load">
            <label className="save-menu-label" htmlFor="save-menu-load-code">
              Load by code
            </label>
            <div className="save-menu-load-row">
              <input
                id="save-menu-load-code"
                className="save-menu-load-input"
                value={loadCode}
                onChange={(e) => setLoadCode(e.target.value.slice(0, 4))}
                placeholder="e.g. 2a5d"
                maxLength={4}
              />
              <button
                type="button"
                className="toolbar-btn"
                onClick={handleLoad}
                disabled={busy || loadCode.trim().length !== 4}
              >
                Load
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
