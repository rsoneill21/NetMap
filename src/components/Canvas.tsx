import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  type OnConnect,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react';
import { DeviceNode } from './nodes/DeviceNode';
import { DeviceEdge } from './edges/DeviceEdge';
import { SubnetGroupOverlay } from './SubnetGroupOverlay';
import type { DeviceEdge as DeviceEdgeType, DeviceNode as DeviceNodeType, DeviceType } from '../types';
import type { NodeChange, EdgeChange } from '@xyflow/react';

const nodeTypes = { deviceNode: DeviceNode };
const edgeTypes = { deviceEdge: DeviceEdge };

interface CanvasProps {
  nodes: DeviceNodeType[];
  edges: DeviceEdgeType[];
  onNodesChange: (changes: NodeChange<DeviceNodeType>[]) => void;
  onEdgesChange: (changes: EdgeChange<DeviceEdgeType>[]) => void;
  onConnect: OnConnect;
  onSelect: (id: string | null) => void;
  onAddDeviceAt: (type: DeviceType, position: { x: number; y: number }) => void;
}

export function Canvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelect,
  onAddDeviceAt,
}: CanvasProps) {
  const { screenToFlowPosition } = useReactFlow();

  const handleNodeClick: NodeMouseHandler<DeviceNodeType> = useCallback(
    (_e, node) => onSelect(node.id),
    [onSelect],
  );

  const handleEdgeClick: EdgeMouseHandler<DeviceEdgeType> = useCallback(
    (_e, edge) => onSelect(edge.id),
    [onSelect],
  );

  const handlePaneClick = useCallback(() => onSelect(null), [onSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/netmap-device-type') as DeviceType;
      if (!type) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      onAddDeviceAt(type, position);
    },
    [screenToFlowPosition, onAddDeviceAt],
  );

  const overlay = useMemo(() => <SubnetGroupOverlay nodes={nodes} />, [nodes]);

  return (
    <div className="canvas-wrapper" onDragOver={handleDragOver} onDrop={handleDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        fitView
        minZoom={0.1}
        maxZoom={2.5}
      >
        <Background id="dots" variant={BackgroundVariant.Dots} gap={24} size={1.5} color="var(--bp-grid-dot)" />
        <Background id="major" variant={BackgroundVariant.Lines} gap={120} lineWidth={1} color="var(--bp-grid-major)" />
        <Controls />
        <MiniMap
          pannable
          zoomable
          className="netmap-minimap"
          maskColor="var(--bp-cyan-hover)"
          nodeColor="var(--bp-bg-panel-light)"
          nodeStrokeColor="var(--bp-cyan)"
          nodeStrokeWidth={2}
        />
      </ReactFlow>
      {overlay}
    </div>
  );
}
