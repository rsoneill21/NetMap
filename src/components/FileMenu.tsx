import { useRef, useState } from 'react';
import { ChevronDown, ClipboardPaste, Upload, Image, Download } from 'lucide-react';
import { useDropdown } from '../hooks/useDropdown';
import type { ShareSaveResult } from '../lib/share';

interface FileMenuProps {
  onOpenImport: () => void;
  onSave: () => Promise<ShareSaveResult | null>;
  onSaveAsNew: () => Promise<ShareSaveResult | null>;
  onLoad: (code: string) => Promise<boolean>;
  onImportJson: (raw: string) => void;
  onExportJson: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
}

export function FileMenu({
  onOpenImport,
  onSave,
  onSaveAsNew,
  onLoad,
  onImportJson,
  onExportJson,
  onExportPng,
  onExportSvg,
}: FileMenuProps) {
  const { open, setOpen, rootRef } = useDropdown();
  const [busy, setBusy] = useState(false);
  const [loadCode, setLoadCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImportJson(String(reader.result ?? ''));
    reader.readAsText(file);
    e.target.value = '';
    setOpen(false);
  }

  return (
    <div className="toolbar-menu" ref={rootRef}>
      <button
        type="button"
        className="toolbar-btn"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        title="File: save, import, and export"
      >
        File <ChevronDown size={12} />
      </button>
      {open && (
        <div className="toolbar-menu-dropdown">
          <button type="button" className="toolbar-menu-item" onClick={handleSave} disabled={busy}>
            {busy ? 'Working...' : 'Save'}
          </button>
          <button type="button" className="toolbar-menu-item" onClick={handleSaveAsNew} disabled={busy}>
            Save as New Link
          </button>
          <div className="toolbar-menu-divider" />
          <div className="toolbar-menu-load">
            <label className="toolbar-menu-label" htmlFor="file-menu-load-code">
              Load by code
            </label>
            <div className="toolbar-menu-load-row">
              <input
                id="file-menu-load-code"
                className="toolbar-menu-load-input"
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
          <div className="toolbar-menu-divider" />
          <button
            type="button"
            className="toolbar-menu-item"
            onClick={() => {
              onOpenImport();
              setOpen(false);
            }}
          >
            <ClipboardPaste size={14} /> Paste Import
          </button>
          <button type="button" className="toolbar-menu-item" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} /> Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleFileChosen}
          />
          <div className="toolbar-menu-divider" />
          <div className="toolbar-menu-label">Export</div>
          <button
            type="button"
            className="toolbar-menu-item"
            onClick={() => {
              onExportJson();
              setOpen(false);
            }}
          >
            <Download size={14} /> Export JSON
          </button>
          <button
            type="button"
            className="toolbar-menu-item"
            onClick={() => {
              onExportPng();
              setOpen(false);
            }}
          >
            <Image size={14} /> Export PNG
          </button>
          <button
            type="button"
            className="toolbar-menu-item"
            onClick={() => {
              onExportSvg();
              setOpen(false);
            }}
          >
            <Image size={14} /> Export SVG
          </button>
        </div>
      )}
    </div>
  );
}
