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
  /** Address this interface is reached at from outside its own subnet, e.g. the public/translated
   * side of a NAT performed by a router not otherwise modeled on the canvas. */
  natAddress?: IpAddress;
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
  viaNat?: boolean;
  origin: 'auto' | 'manual';
}
export type LinkEdgeData = LinkData & Record<string, unknown>;
export type DeviceEdge = Edge<LinkEdgeData, 'deviceEdge'>;

export interface SubnetGroup {
  cidr: string;
  memberNodeIds: string[];
  label: string;
}

export interface NetMapDocument {
  version: 1;
  nodes: DeviceNode[];
  edges: DeviceEdge[];
  createdAt: string;
  updatedAt: string;
}
