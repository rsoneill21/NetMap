import { ipv4NetworkCidr, ipv6NetworkCidr } from './cidr';
import type { DeviceEdge, DeviceNode, IpAddress, SubnetGroup } from '../types';

export interface AddressRef {
  nodeId: string;
  interfaceId: string;
  interfaceName: string;
  address: IpAddress;
}

export function computeSubnetBuckets(nodes: DeviceNode[]): Map<string, AddressRef[]> {
  const buckets = new Map<string, AddressRef[]>();
  for (const node of nodes) {
    if (node.data.type === 'cloud') continue;
    for (const iface of node.data.interfaces) {
      for (const addr of iface.addresses) {
        if (addr.isLinkLocal || addr.isLoopback) continue;
        const key =
          addr.family === 'ipv4'
            ? ipv4NetworkCidr(addr.address, addr.prefixLength)
            : ipv6NetworkCidr(addr.address, addr.prefixLength);
        const list = buckets.get(key) ?? [];
        list.push({ nodeId: node.id, interfaceId: iface.id, interfaceName: iface.name, address: addr });
        buckets.set(key, list);
      }
    }
  }
  return buckets;
}

function makeAutoEdge(a: AddressRef, b: AddressRef, cidr: string): DeviceEdge {
  return {
    id: `auto-${a.interfaceId}-${b.interfaceId}`,
    source: a.nodeId,
    target: b.nodeId,
    sourceHandle: `${a.interfaceId}-source`,
    targetHandle: `${b.interfaceId}-target`,
    type: 'deviceEdge',
    data: {
      sourceInterfaceId: a.interfaceId,
      targetInterfaceId: b.interfaceId,
      sourceInterfaceName: a.interfaceName,
      targetInterfaceName: b.interfaceName,
      subnetCidr: cidr,
      origin: 'auto',
    },
  };
}

export function computeAutoLinks(nodes: DeviceNode[]): DeviceEdge[] {
  const buckets = computeSubnetBuckets(nodes);
  const edges: DeviceEdge[] = [];
  for (const [cidr, members] of buckets) {
    const distinctNodeIds = new Set(members.map((m) => m.nodeId));
    if (distinctNodeIds.size < 2) continue;
    const [hub, ...rest] = members;
    for (const peer of rest) {
      if (peer.nodeId === hub.nodeId) continue;
      edges.push(makeAutoEdge(hub, peer, cidr));
    }
  }
  return edges;
}

export function mergeAutoLinks(existingEdges: DeviceEdge[], newAutoEdges: DeviceEdge[]): DeviceEdge[] {
  return existingEdges.filter((e) => e.data?.origin !== 'auto').concat(newAutoEdges);
}

export function computeSubnetGroups(nodes: DeviceNode[]): SubnetGroup[] {
  const buckets = computeSubnetBuckets(nodes);
  const groups: SubnetGroup[] = [];
  for (const [cidr, members] of buckets) {
    const nodeIds = [...new Set(members.map((m) => m.nodeId))];
    if (nodeIds.length < 2) continue;
    groups.push({ cidr, memberNodeIds: nodeIds, label: cidr });
  }
  return groups;
}
