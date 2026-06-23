import { useCallback, useMemo, useState } from 'react';
import { ReactFlowProvider, type EdgeChange } from '@xyflow/react';
import { Toolbar } from './components/Toolbar';
import { DevicePalette } from './components/DevicePalette';
import { Canvas } from './components/Canvas';
import { InspectorPanel } from './components/InspectorPanel';
import { ImportModal } from './components/ImportModal';
import { ConfirmModal } from './components/ConfirmModal';
import { TunnelWizardModal } from './components/TunnelWizardModal';
import { TunnelCommandImportModal } from './components/TunnelCommandImportModal';
import { TunnelCommandsModal } from './components/TunnelCommandsModal';
import { useNetMapState } from './hooks/useNetMapState';
import { exportCanvasAsPng, exportCanvasAsSvg } from './lib/exportImage';
import { buildTunnelEdges, computeActiveTunnelPorts } from './lib/tunnel';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { DeviceActionsContext } from './contexts/deviceActionsContextDefinition';
import type { CanvasEdge, DeviceEdge } from './types';
import './styles/theme.css';
import './styles/app.css';

function App() {
  const state = useNetMapState();
  const [importOpen, setImportOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [tunnelWizardOpen, setTunnelWizardOpen] = useState(false);
  const [tunnelCommandImportOpen, setTunnelCommandImportOpen] = useState(false);
  const [tunnelCommandAnchorId, setTunnelCommandAnchorId] = useState<string | null>(null);
  const [editingTunnelId, setEditingTunnelId] = useState<string | null>(null);

  const deviceActions = useMemo(
    () => ({
      onStartTunnel: (deviceId: string) => {
        setTunnelCommandAnchorId(deviceId);
        setTunnelCommandImportOpen(true);
      },
    }),
    [],
  );

  const tunnelCommandAnchorDevice = useMemo(
    () => state.nodes.find((n) => n.id === tunnelCommandAnchorId) ?? undefined,
    [state.nodes, tunnelCommandAnchorId],
  );

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

  const tunnelEdges = useMemo(() => buildTunnelEdges(state.tunnels, state.nodes), [state.tunnels, state.nodes]);
  const canvasEdges: CanvasEdge[] = useMemo(() => {
    const highlightedTunnelEdges: CanvasEdge[] = tunnelEdges.map((e) => ({
      ...e,
      selected: e.data?.tunnelId === state.selectedTunnelId,
    }));
    return [...highlightedTunnelEdges, ...state.edges];
  }, [tunnelEdges, state.edges, state.selectedTunnelId]);

  const selectedTunnel = useMemo(
    () => state.tunnels.find((t) => t.id === state.selectedTunnelId) ?? null,
    [state.tunnels, state.selectedTunnelId],
  );

  const editingTunnel = useMemo(
    () => state.tunnels.find((t) => t.id === editingTunnelId),
    [state.tunnels, editingTunnelId],
  );

  const nodesForCanvas = useMemo(
    () =>
      state.nodes.map((n) => ({
        ...n,
        data: { ...n.data, activeTunnelPorts: computeActiveTunnelPorts(n.id, state.tunnels, state.nodes) },
      })),
    [state.nodes, state.tunnels],
  );

  function closeTunnelWizard() {
    setTunnelWizardOpen(false);
    setEditingTunnelId(null);
  }

  const handleSelect = useCallback(
    (id: string | null) => {
      state.setSelectedId(id);
      state.setSelectedTunnelId(null);
    },
    [state],
  );

  const handleSelectTunnel = useCallback(
    (tunnelId: string) => {
      state.setSelectedTunnelId(tunnelId);
      state.setSelectedId(null);
    },
    [state],
  );

  const handleCanvasEdgesChange = useCallback(
    (changes: EdgeChange<CanvasEdge>[]) => {
      const physicalChanges = changes.filter(
        (c) => !('id' in c) || !c.id.startsWith('tunnel-'),
      ) as EdgeChange<DeviceEdge>[];
      state.onEdgesChange(physicalChanges);
    },
    [state],
  );

  return (
    <PreferencesProvider>
      <DeviceActionsContext.Provider value={deviceActions}>
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
            onNewTunnel={() => {
              setEditingTunnelId(null);
              setTunnelWizardOpen(true);
            }}
            onNewTunnelFromCommands={() => {
              setTunnelCommandAnchorId(null);
              setTunnelCommandImportOpen(true);
            }}
            onClear={() => setClearConfirmOpen(true)}
            statusMessage={state.statusMessage}
          />
          <div className="app-body">
            <DevicePalette onAddDevice={(type) => state.addDevice(type)} />
            <Canvas
              nodes={nodesForCanvas}
              edges={canvasEdges}
              onNodesChange={state.onNodesChange}
              onEdgesChange={handleCanvasEdgesChange}
              onConnect={state.onConnect}
              onSelect={handleSelect}
              onSelectTunnel={handleSelectTunnel}
              onAddDeviceAt={(type, position) => state.addDevice(type, position)}
            />
            <InspectorPanel
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              onUpdateDevice={state.updateDevice}
              onDeleteSelected={state.deleteSelected}
              onClose={() => state.setSelectedId(null)}
            />
          </div>
        </div>
        {importOpen && (
          <ImportModal onImport={state.importParsedText} onClose={() => setImportOpen(false)} />
        )}
        {tunnelWizardOpen && (
          <TunnelWizardModal
            nodes={state.nodes}
            existingTunnels={state.tunnels}
            physicalEdges={state.edges}
            editingTunnel={editingTunnel}
            onSubmit={(tunnel) => {
              if (editingTunnelId) {
                state.updateTunnel(editingTunnelId, () => tunnel);
              } else {
                state.addTunnel(tunnel);
              }
            }}
            onClose={closeTunnelWizard}
          />
        )}
        {tunnelCommandImportOpen && (
          <TunnelCommandImportModal
            nodes={state.nodes}
            anchorDevice={tunnelCommandAnchorDevice}
            onCreate={state.addTunnel}
            onClose={() => {
              setTunnelCommandImportOpen(false);
              setTunnelCommandAnchorId(null);
            }}
          />
        )}
        {selectedTunnel && (
          <TunnelCommandsModal
            tunnel={selectedTunnel}
            nodes={state.nodes}
            onEdit={() => {
              setEditingTunnelId(selectedTunnel.id);
              state.setSelectedTunnelId(null);
              setTunnelWizardOpen(true);
            }}
            onDelete={() => state.deleteTunnel(selectedTunnel.id)}
            onClose={() => state.setSelectedTunnelId(null)}
          />
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
      </DeviceActionsContext.Provider>
    </PreferencesProvider>
  );
}

export default App;
