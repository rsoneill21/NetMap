import { ipv4NetworkCidr, ipv6NetworkCidr } from './cidr';
import type { DeviceEdge, DeviceNode, IpAddress, NetInterface, SubnetGroup } from '../types';

export interface AddressRef {
  nodeId: string;
  interfaceId: string;
  interfaceName: string;
  address: IpAddress;
}

export function computeSubnetBuckets(nodes: DeviceNode[]): Map<string, AddressRef[]> {
  const buckets = new Map<string, AddressRef[]>();
  for (const node of nodes) {
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

function makeAutoEdge(a: AddressRef, b: AddressRef, cidr: string, viaNat = false): DeviceEdge {
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
      viaNat,
      linkKind: 'network',
      origin: 'auto',
    },
  };
}

export function computeAutoLinks(nodes: DeviceNode[]): DeviceEdge[] {
  const buckets = computeSubnetBuckets(nodes);
  const edges: DeviceEdge[] = [];
  const linkedNodePairs = new Set<string>();
  for (const [cidr, members] of buckets) {
    const distinctNodeIds = new Set(members.map((m) => m.nodeId));
    if (distinctNodeIds.size < 2) continue;
    const [hub, ...rest] = members;
    for (const peer of rest) {
      if (peer.nodeId === hub.nodeId) continue;
      edges.push(makeAutoEdge(hub, peer, cidr));
      linkedNodePairs.add([hub.nodeId, peer.nodeId].sort().join('|'));
    }
  }

  // A device's NAT address can land it inside another device's subnet even though their
  // real addresses don't match — link those pairs too, distinct from the direct-subnet links above.
  for (const node of nodes) {
    for (const iface of node.data.interfaces) {
      if (!iface.natAddress) continue;
      for (const [cidr, peers] of buckets) {
        const inThisNet = peers.some((peer) => addressInNetwork(iface.natAddress!, peer.address));
        if (!inThisNet) continue;
        for (const peer of peers) {
          if (peer.nodeId === node.id) continue;
          const pairKey = [node.id, peer.nodeId].sort().join('|');
          if (linkedNodePairs.has(pairKey)) continue;
          linkedNodePairs.add(pairKey);
          edges.push(
            makeAutoEdge(
              { nodeId: node.id, interfaceId: iface.id, interfaceName: iface.name, address: iface.natAddress },
              peer,
              cidr,
              true,
            ),
          );
        }
      }
    }
  }
  return edges;
}

export function mergeAutoLinks(existingEdges: DeviceEdge[], newAutoEdges: DeviceEdge[]): DeviceEdge[] {
  return existingEdges.filter((e) => e.data?.origin !== 'auto').concat(newAutoEdges);
}

function networkCidr(addr: IpAddress): string {
  return addr.family === 'ipv4'
    ? ipv4NetworkCidr(addr.address, addr.prefixLength)
    : ipv6NetworkCidr(addr.address, addr.prefixLength);
}

/** Whether `addr` falls inside `network`'s subnet, evaluated at network's own prefix length. */
function addressInNetwork(addr: IpAddress, network: IpAddress): boolean {
  if (addr.family !== network.family) return false;
  const addrInNetCidr =
    addr.family === 'ipv4'
      ? ipv4NetworkCidr(addr.address, network.prefixLength)
      : ipv6NetworkCidr(addr.address, network.prefixLength);
  return addrInNetCidr === networkCidr(network);
}

/** Returns the shared subnet CIDR between two interfaces, or null if they have no address in common subnet. */
export function sharedSubnetCidr(a: NetInterface, b: NetInterface): string | null {
  const aNets = a.addresses.filter((addr) => !addr.isLinkLocal && !addr.isLoopback).map(networkCidr);
  const bNets = new Set(
    b.addresses.filter((addr) => !addr.isLinkLocal && !addr.isLoopback).map(networkCidr),
  );
  return aNets.find((cidr) => bNets.has(cidr)) ?? null;
}

/**
 * Two interfaces can be linked across non-matching subnets when one side's NAT address
 * (the address it's reached at via an unmodeled router) lands in the other side's subnet,
 * representing a router-performed translation that isn't itself drawn on the canvas.
 */
export function natLinkCidr(a: NetInterface, b: NetInterface): string | null {
  const bAddrs = b.addresses.filter((addr) => !addr.isLinkLocal && !addr.isLoopback);
  const aAddrs = a.addresses.filter((addr) => !addr.isLinkLocal && !addr.isLoopback);
  if (a.natAddress) {
    const match = bAddrs.find((addr) => addressInNetwork(a.natAddress!, addr));
    if (match) return networkCidr(match);
  }
  if (b.natAddress) {
    const match = aAddrs.find((addr) => addressInNetwork(b.natAddress!, addr));
    if (match) return networkCidr(match);
  }
  return null;
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
