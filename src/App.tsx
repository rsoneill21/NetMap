import { useMemo, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Toolbar } from './components/Toolbar';
import { DevicePalette } from './components/DevicePalette';
import { Canvas } from './components/Canvas';
import { InspectorPanel } from './components/InspectorPanel';
import { TunnelConsole } from './components/TunnelConsole';
import { ImportModal } from './components/ImportModal';
import { ConfirmModal } from './components/ConfirmModal';
import { useNetMapState } from './hooks/useNetMapState';
import { exportCanvasAsPng, exportCanvasAsSvg } from './lib/exportImage';
import { PreferencesProvider } from './contexts/PreferencesContext';
import './styles/theme.css';
import './styles/app.css';

function App() {
  const state = useNetMapState();
  const [importOpen, setImportOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  async function handleShare() {
    if (!state.shareCode) {
      state.setStatusMessage('Save the map first to get a shareable link.');
      return;
    }
    const url = `${window.location.origin}/${state.shareCode}`;
    try {
      await navigator.clipboard.writeText(url);
      state.setStatusMessage(`Link copied to clipboard: ${url}`);
    } catch {
      state.setStatusMessage(`Copy this link: ${url}`);
    }
  }

  const selectedNode = useMemo(
    () => state.nodes.find((n) => n.id === state.selectedId) ?? null,
    [state.nodes, state.selectedId],
  );
  const selectedEdge = useMemo(
    () => state.edges.find((e) => e.id === state.selectedId) ?? null,
    [state.edges, state.selectedId],
  );

  return (
    <PreferencesProvider>
      <ReactFlowProvider>
        <div className="app-shell">
          <Toolbar
            onOpenImport={() => setImportOpen(true)}
            onShare={handleShare}
            onSave={state.saveShareLink}
            onSaveAsNew={state.saveAsNewShareLink}
            onLoad={state.loadShareLink}
            onTidy={state.runTidy}
            onExportPng={() => exportCanvasAsPng(state.nodes)}
            onExportSvg={() => exportCanvasAsSvg(state.nodes)}
            onExportJson={state.exportJson}
            onImportJson={state.importJson}
            onRelinkSubnets={state.relinkSubnets}
            onClear={() => setClearConfirmOpen(true)}
            statusMessage={state.statusMessage}
          />
          <div className="app-body">
            <DevicePalette onAddDevice={(type) => state.addDevice(type)} />
            <Canvas
              nodes={state.nodes}
              edges={state.edges}
              onNodesChange={state.onNodesChange}
              onEdgesChange={state.onEdgesChange}
              onConnect={state.onConnect}
              onSelect={state.setSelectedId}
              onAddDeviceAt={(type, position) => state.addDevice(type, position)}
            />
            <InspectorPanel
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              onUpdateDevice={state.updateDevice}
              onUpdateEdge={state.updateEdge}
              onDeleteSelected={state.deleteSelected}
              onClose={() => state.setSelectedId(null)}
            />
          </div>
          <TunnelConsole
            nodes={state.nodes}
            selectedNode={selectedNode}
            onCreateTunnel={state.addTunnelEdge}
            onStatus={state.setStatusMessage}
          />
        </div>
        {importOpen && (
          <ImportModal onImport={state.importParsedText} onClose={() => setImportOpen(false)} />
        )}
        {clearConfirmOpen && (
          <ConfirmModal
            title="Clear Map"
            message="Clear the entire map? This cannot be undone."
            onConfirm={() => {
              state.clearAll();
              setClearConfirmOpen(false);
            }}
            onCancel={() => setClearConfirmOpen(false)}
          />
        )}
      </ReactFlowProvider>
    </PreferencesProvider>
  );
}

export default App;
