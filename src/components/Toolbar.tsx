import { Share2, Trash2 } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import type { ShareSaveResult } from '../lib/share';
import { FileMenu } from './FileMenu';
import { EditMenu } from './EditMenu';
import { SettingsMenu } from './SettingsMenu';

interface ToolbarProps {
  onOpenImport: () => void;
  onShare: () => void;
  onSave: () => Promise<ShareSaveResult | null>;
  onSaveAsNew: () => Promise<ShareSaveResult | null>;
  onLoad: (code: string) => Promise<boolean>;
  onTidy: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportJson: () => string;
  onImportJson: (raw: string) => void;
  onRelinkSubnets: () => void;
  onNewTunnel: () => void;
  onNewTunnelFromCommands: () => void;
  onClear: () => void;
  statusMessage: string | null;
}

export function Toolbar({
  onOpenImport,
  onShare,
  onSave,
  onSaveAsNew,
  onLoad,
  onTidy,
  onExportPng,
  onExportSvg,
  onExportJson,
  onImportJson,
  onRelinkSubnets,
  onNewTunnel,
  onNewTunnelFromCommands,
  onClear,
  statusMessage,
}: ToolbarProps) {
  const { fitView } = useReactFlow();

  function handleTidy() {
    onTidy();
    requestAnimationFrame(() => fitView({ padding: 0.2 }));
  }

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

  return (
    <header className="toolbar">
      <div className="toolbar-brand">NetMap</div>
      {statusMessage && (
        <>
          <span className="toolbar-divider">|</span>
          <div className="toolbar-status">{statusMessage}</div>
        </>
      )}
      <div className="toolbar-spacer" />
      <FileMenu
        onOpenImport={onOpenImport}
        onSave={onSave}
        onSaveAsNew={onSaveAsNew}
        onLoad={onLoad}
        onImportJson={onImportJson}
        onExportJson={handleExportJson}
        onExportPng={onExportPng}
        onExportSvg={onExportSvg}
      />
      <EditMenu
        onTidy={handleTidy}
        onRelinkSubnets={onRelinkSubnets}
        onNewTunnel={onNewTunnel}
        onNewTunnelFromCommands={onNewTunnelFromCommands}
      />
      <button type="button" className="toolbar-btn" onClick={onShare} title="Copy a shareable link to this map">
        <Share2 size={16} /> Share
      </button>
      <SettingsMenu />
      <button type="button" className="toolbar-btn toolbar-btn-danger" onClick={onClear} title="Clear map">
        <Trash2 size={16} /> Clear
      </button>
    </header>
  );
}
