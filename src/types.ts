import type { Node, Edge } from '@xyflow/react';

export type DeviceType = 'router' | 'switch' | 'host' | 'server' | 'firewall' | 'cloud';

export type InterfaceStatus = 'up' | 'down' | 'admin-down' | 'unknown';

export interface IpAddress {
  address: string;
  prefixLength: number;
  family: 'ipv4' | 'ipv6';
  isLinkLocal: boolean;
  isLoopback: boolean;
}

export interface NetInterface {
  id: string;
  name: string;
  addresses: IpAddress[];
  description: string;
  status: InterfaceStatus;
  macAddress?: string;
  isManagement?: boolean;
}

export interface Device {
  id: string;
  label: string;
  type: DeviceType;
  interfaces: NetInterface[];
  notes?: string;
  manuallyPositioned?: boolean;
  ports?: number[];
}

export type DeviceNodeData = Device & Record<string, unknown>;
export type DeviceNode = Node<DeviceNodeData, 'deviceNode'>;

export interface LinkData {
  sourceInterfaceId: string;
  targetInterfaceId: string;
  sourceInterfaceName: string;
  targetInterfaceName: string;
  subnetCidr?: string;
  subnetMismatch?: boolean;
  origin: 'auto' | 'manual';
}
export type LinkEdgeData = LinkData & Record<string, unknown>;
export type DeviceEdge = Edge<LinkEdgeData, 'deviceEdge'>;

export interface SubnetGroup {
  cidr: string;
  memberNodeIds: string[];
  label: string;
}

export type HopProtocol = 'ssh' | 'telnet';

export interface TunnelHop {
  id: string;
  fromDeviceId: string;
  toDeviceId: string;
  protocol: HopProtocol;
  username?: string;
}

export type PortForwardType = 'local' | 'remote' | 'dynamic';

export interface PortMapping {
  id: string;
  type: PortForwardType;
  localPort?: number;
  remoteHost?: string;
  remotePort?: number;
}

export interface TunnelData {
  id: string;
  label?: string;
  hops: TunnelHop[];
  forwardingHopId: string;
  portMappings: PortMapping[];
}

export interface TunnelHopEdgeData {
  tunnelId: string;
  /** `hop` = the literal SSH connection a hop represents; `forward` = where a port-forward mapping actually leads. */
  kind: 'hop' | 'forward';
  protocol: HopProtocol;
  /** Pre-built label text — "ssh" for hop edges, "L 2222→22" style for forward edges. */
  label: string;
  /** Lane index among edges sharing the same source/target device pair, used to fan out overlapping tunnels. */
  lane?: number;
}
export type TunnelHopEdgeFlowData = TunnelHopEdgeData & Record<string, unknown>;
export type TunnelHopEdge = Edge<TunnelHopEdgeFlowData, 'tunnelHopEdge'>;

export type CanvasEdge = DeviceEdge | TunnelHopEdge;

export interface NetMapDocument {
  version: 1;
  nodes: DeviceNode[];
  edges: DeviceEdge[];
  tunnels: TunnelData[];
  createdAt: string;
  updatedAt: string;
}
