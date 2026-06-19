import { useMemo, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Toolbar } from './components/Toolbar';
import { DevicePalette } from './components/DevicePalette';
import { Canvas } from './components/Canvas';
import { InspectorPanel } from './components/InspectorPanel';
import { ImportModal } from './components/ImportModal';
import { ShareModal } from './components/ShareModal';
import { useNetMapState } from './hooks/useNetMapState';
import { exportCanvasAsPng, exportCanvasAsSvg } from './lib/exportImage';
import './styles/theme.css';
import './styles/app.css';

function App() {
  const state = useNetMapState();
  const [importOpen, setImportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const selectedNode = useMemo(
    () => state.nodes.find((n) => n.id === state.selectedId) ?? null,
    [state.nodes, state.selectedId],
  );
  const selectedEdge = useMemo(
    () => state.edges.find((e) => e.id === state.selectedId) ?? null,
    [state.edges, state.selectedId],
  );

  return (
    <ReactFlowProvider>
      <div className="app-shell">
        <Toolbar
          onOpenImport={() => setImportOpen(true)}
          onOpenShare={() => setShareOpen(true)}
          onTidy={state.runTidy}
          onExportPng={() => exportCanvasAsPng(state.nodes)}
          onExportSvg={() => exportCanvasAsSvg(state.nodes)}
          onExportJson={state.exportJson}
          onImportJson={state.importJson}
          onRelinkSubnets={state.relinkSubnets}
          onClear={state.clearAll}
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
            onDeleteSelected={state.deleteSelected}
          />
        </div>
      </div>
      {importOpen && (
        <ImportModal onImport={state.importParsedText} onClose={() => setImportOpen(false)} />
      )}
      {shareOpen && (
        <ShareModal
          currentCode={state.shareCode}
          onSave={state.saveShareLink}
          onLoad={state.loadShareLink}
          onClose={() => setShareOpen(false)}
        />
      )}
    </ReactFlowProvider>
  );
}

export default App;
