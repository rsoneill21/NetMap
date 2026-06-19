import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import { createDevice } from '../lib/device';
import { runDagreLayout } from '../lib/layout';
import { parseAndCreateDevices } from '../lib/parser';
import { loadDocument, saveDocument, clearDocument, serializeForExport, parseImportedJson } from '../lib/storage';
import { computeAutoLinks, mergeAutoLinks, sharedSubnetCidr } from '../lib/subnet';
import type { Device, DeviceEdge, DeviceNode, DeviceNodeData, DeviceType, NetInterface } from '../types';

function findInterface(nodes: DeviceNode[], nodeId: string | null | undefined, handleId: string | null | undefined): NetInterface | null {
  if (!nodeId || !handleId) return null;
  const interfaceId = handleId.replace(/-(source|target)$/, '');
  const node = nodes.find((n) => n.id === nodeId);
  return node?.data.interfaces.find((iface) => iface.id === interfaceId) ?? null;
}

function deviceToNode(device: Device, position: { x: number; y: number }): DeviceNode {
  return {
    id: device.id,
    type: 'deviceNode',
    position,
    data: device as DeviceNodeData,
  };
}

const GRID_COLUMNS = 4;
const GRID_SPACING_X = 260;
const GRID_SPACING_Y = 200;

export function useNetMapState() {
  const initial = loadDocument();
  const [nodes, setNodes] = useState<DeviceNode[]>(initial?.nodes ?? []);
  const [edges, setEdges] = useState<DeviceEdge[]>(initial?.edges ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const nodeCountRef = useRef(nodes.length);

  useEffect(() => {
    const timer = setTimeout(() => saveDocument(nodes, edges), 500);
    return () => clearTimeout(timer);
  }, [nodes, edges]);

  const onNodesChange = useCallback((changes: NodeChange<DeviceNode>[]) => {
    setNodes((prev) => applyNodeChanges(changes, prev));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<DeviceEdge>[]) => {
    setEdges((prev) => applyEdgeChanges(changes, prev));
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceIface = findInterface(nodes, connection.source, connection.sourceHandle);
      const targetIface = findInterface(nodes, connection.target, connection.targetHandle);
      const sharedCidr =
        sourceIface && targetIface ? sharedSubnetCidr(sourceIface, targetIface) : null;
      const hasAddresses = (sourceIface?.addresses.length ?? 0) > 0 && (targetIface?.addresses.length ?? 0) > 0;
      const subnetMismatch = hasAddresses && !sharedCidr;

      if (subnetMismatch) {
        setStatusMessage(
          `Warning: ${sourceIface?.name ?? 'interface'} and ${targetIface?.name ?? 'interface'} are not on the same subnet.`,
        );
      }

      setEdges((prev) =>
        addEdge<DeviceEdge>(
          {
            ...connection,
            type: 'deviceEdge',
            data: {
              sourceInterfaceId: connection.sourceHandle ?? '',
              targetInterfaceId: connection.targetHandle ?? '',
              sourceInterfaceName: sourceIface?.name ?? '',
              targetInterfaceName: targetIface?.name ?? '',
              subnetCidr: sharedCidr ?? undefined,
              subnetMismatch,
              origin: 'manual',
            },
          },
          prev,
        ),
      );
    },
    [nodes],
  );

  const addDevice = useCallback((type: DeviceType, position?: { x: number; y: number }) => {
    const device = createDevice(type);
    const index = nodeCountRef.current;
    nodeCountRef.current += 1;
    const pos =
      position ??
      {
        x: 120 + (index % GRID_COLUMNS) * GRID_SPACING_X,
        y: 120 + Math.floor(index / GRID_COLUMNS) * GRID_SPACING_Y,
      };
    setNodes((prev) => [...prev, deviceToNode(device, pos)]);
    setSelectedId(device.id);
    return device.id;
  }, []);

  const updateDevice = useCallback((deviceId: string, updater: (device: Device) => Device) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === deviceId ? { ...n, data: updater(n.data) as DeviceNodeData } : n)),
    );
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedId));
    setEdges((prev) => prev.filter((e) => e.source !== selectedId && e.target !== selectedId && e.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const relinkSubnets = useCallback(() => {
    setNodes((currentNodes) => {
      const autoEdges = computeAutoLinks(currentNodes);
      setEdges((prevEdges) => mergeAutoLinks(prevEdges, autoEdges));
      return currentNodes;
    });
  }, []);

  const importParsedText = useCallback((rawInput: string) => {
    const { devices, skippedBlocks } = parseAndCreateDevices(rawInput);
    if (devices.length === 0) {
      setStatusMessage(
        skippedBlocks > 0 ? `Could not parse ${skippedBlocks} block(s) — no recognizable interfaces found.` : 'No device blocks detected.',
      );
      return;
    }

    setNodes((prev) => {
      const startIndex = prev.length;
      const newNodes = devices.map((device, i) =>
        deviceToNode(device, {
          x: 120 + ((startIndex + i) % GRID_COLUMNS) * GRID_SPACING_X,
          y: 120 + Math.floor((startIndex + i) / GRID_COLUMNS) * GRID_SPACING_Y,
        }),
      );
      const allNodes = [...prev, ...newNodes];
      nodeCountRef.current = allNodes.length;
      const autoEdges = computeAutoLinks(allNodes);
      setEdges((prevEdges) => mergeAutoLinks(prevEdges, autoEdges));
      return allNodes;
    });

    const skippedMsg = skippedBlocks > 0 ? `, skipped ${skippedBlocks} unrecognized block(s)` : '';
    setStatusMessage(`Imported ${devices.length} device(s)${skippedMsg}.`);
  }, []);

  const runTidy = useCallback(() => {
    setNodes((prev) => runDagreLayout(prev, edges));
  }, [edges]);

  const clearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedId(null);
    nodeCountRef.current = 0;
    clearDocument();
  }, []);

  const exportJson = useCallback(() => serializeForExport(nodes, edges), [nodes, edges]);

  const importJson = useCallback((raw: string) => {
    const doc = parseImportedJson(raw);
    if (!doc) {
      setStatusMessage('Invalid NetMap JSON file.');
      return false;
    }
    setNodes(doc.nodes);
    setEdges(doc.edges);
    nodeCountRef.current = doc.nodes.length;
    setSelectedId(null);
    setStatusMessage(`Loaded ${doc.nodes.length} device(s) from file.`);
    return true;
  }, []);

  return {
    nodes,
    edges,
    selectedId,
    statusMessage,
    setSelectedId,
    setStatusMessage,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addDevice,
    updateDevice,
    deleteSelected,
    relinkSubnets,
    importParsedText,
    runTidy,
    clearAll,
    exportJson,
    importJson,
  };
}
