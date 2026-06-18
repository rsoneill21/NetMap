import { useRef } from 'react';
import { ClipboardPaste, LayoutGrid, Image, Download, Upload, Trash2, RefreshCw } from 'lucide-react';

interface ToolbarProps {
  onOpenImport: () => void;
  onTidy: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportJson: () => string;
  onImportJson: (raw: string) => void;
  onRelinkSubnets: () => void;
  onClear: () => void;
  statusMessage: string | null;
}

export function Toolbar({
  onOpenImport,
  onTidy,
  onExportPng,
  onExportSvg,
  onExportJson,
  onImportJson,
  onRelinkSubnets,
  onClear,
  statusMessage,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExportJson() {
    const json = onExportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'netmap.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImportJson(String(reader.result ?? ''));
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleClear() {
    if (window.confirm('Clear the entire map? This cannot be undone.')) {
      onClear();
    }
  }

  return (
    <header className="toolbar">
      <div className="toolbar-brand">NetMap</div>
      <button type="button" className="toolbar-btn" onClick={onOpenImport} title="Paste device output">
        <ClipboardPaste size={16} /> Paste Import
      </button>
      <button type="button" className="toolbar-btn" onClick={onTidy} title="Auto-layout">
        <LayoutGrid size={16} /> Tidy
      </button>
      <button type="button" className="toolbar-btn" onClick={onRelinkSubnets} title="Re-run subnet auto-link">
        <RefreshCw size={16} /> Re-link
      </button>
      <button type="button" className="toolbar-btn" onClick={onExportPng} title="Export PNG">
        <Image size={16} /> PNG
      </button>
      <button type="button" className="toolbar-btn" onClick={onExportSvg} title="Export SVG">
        <Image size={16} /> SVG
      </button>
      <button type="button" className="toolbar-btn" onClick={handleExportJson} title="Export JSON">
        <Download size={16} /> Export
      </button>
      <button
        type="button"
        className="toolbar-btn"
        onClick={() => fileInputRef.current?.click()}
        title="Import JSON"
      >
        <Upload size={16} /> Import
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleFileChosen}
      />
      <button type="button" className="toolbar-btn toolbar-btn-danger" onClick={handleClear} title="Clear map">
        <Trash2 size={16} /> Clear
      </button>
      <div className="toolbar-status">{statusMessage}</div>
    </header>
  );
}
