import { MarkerType } from '@xyflow/react';
import { nextId } from './device';
import { areDevicesNetworkConnected } from './network';
import { computeSubnetBuckets } from './subnet';
import type { Device, DeviceEdge, DeviceNode, HopProtocol, PortMapping, TunnelData, TunnelHop, TunnelHopEdge } from '../types';

export const DEFAULT_PROXYCHAINS_PORT = 9050;

function findDevice(nodes: DeviceNode[], deviceId: string): Device | undefined {
  return nodes.find((n) => n.id === deviceId)?.data;
}

function hostFor(device: Device | undefined, fallback: string): string {
  if (!device) return fallback;
  const addr = device.interfaces.flatMap((i) => i.addresses).find((a) => !a.isLoopback && !a.isLinkLocal);
  return addr?.address ?? device.label;
}

export function buildHopCommand(hop: TunnelHop, toDevice: Device | undefined): string {
  const host = hostFor(toDevice, hop.toDeviceId);
  if (hop.protocol === 'telnet') {
    return `telnet ${host}`;
  }
  const userPrefix = hop.username ? `${hop.username}@` : '';
  return `ssh ${userPrefix}${host}`;
}

function mappingFlag(mapping: PortMapping, destHost: string): string {
  switch (mapping.type) {
    case 'local':
      return `-L ${mapping.localPort ?? '<localPort>'}:${mapping.remoteHost ?? destHost}:${mapping.remotePort ?? '<remotePort>'}`;
    case 'remote':
      return `-R ${mapping.remotePort ?? '<remotePort>'}:${mapping.remoteHost ?? destHost}:${mapping.localPort ?? '<localPort>'}`;
    case 'dynamic':
      return `-D ${mapping.localPort ?? '<localPort>'}`;
  }
}

export function buildForwardingCommand(hop: TunnelHop, toDevice: Device | undefined, mappings: PortMapping[]): string {
  const host = hostFor(toDevice, hop.toDeviceId);
  const userPrefix = hop.username ? `${hop.username}@` : '';
  const flags = mappings.map((m) => mappingFlag(m, host)).join(' ');
  return `ssh ${flags} ${userPrefix}${host}`.replace(/\s+/g, ' ').trim();
}

export function buildProxychainsSnippet(mapping: PortMapping): string | null {
  if (mapping.type !== 'dynamic') return null;
  return `socks5 127.0.0.1 ${mapping.localPort ?? '<localPort>'}`;
}

export interface TunnelCommandBlock {
  hopCommands: { hopId: string; label: string; command: string }[];
  mappingDescriptions: string[];
  proxychainsLines: string[];
}

export function buildTunnelCommandBlock(tunnel: TunnelData, nodes: DeviceNode[]): TunnelCommandBlock {
  const forwardingHop = tunnel.hops.find((h) => h.id === tunnel.forwardingHopId);
  const fromLabel = forwardingHop ? findDevice(nodes, forwardingHop.fromDeviceId)?.label ?? forwardingHop.fromDeviceId : '';
  const toLabel = forwardingHop ? findDevice(nodes, forwardingHop.toDeviceId)?.label ?? forwardingHop.toDeviceId : '';

  const hopCommands = tunnel.hops.map((hop) => {
    const fromDevice = findDevice(nodes, hop.fromDeviceId);
    const toDevice = findDevice(nodes, hop.toDeviceId);
    const isForwardingHop = hop.id === tunnel.forwardingHopId;
    const label = isForwardingHop
      ? `${fromDevice?.label ?? hop.fromDeviceId} -> ${toDevice?.label ?? hop.toDeviceId} (${hop.protocol}, forwards ${portMappingSummary(tunnel.portMappings)})`
      : `${fromDevice?.label ?? hop.fromDeviceId} -> ${toDevice?.label ?? hop.toDeviceId} (${hop.protocol})`;
    const command = isForwardingHop
      ? buildForwardingCommand(hop, toDevice, tunnel.portMappings)
      : buildHopCommand(hop, toDevice);
    return { hopId: hop.id, label, command };
  });

  const mappingDescriptions = forwardingHop
    ? tunnel.portMappings.map((m) => describeMapping(m, fromLabel, toLabel))
    : [];

  const proxychainsLines = tunnel.portMappings
    .map((m) => buildProxychainsSnippet(m))
    .filter((line): line is string => line !== null);

  return { hopCommands, mappingDescriptions, proxychainsLines };
}

/** Compact pairing shown on the canvas tunnel-edge label — both ports, not just one side. */
export function portMappingSummary(mappings: PortMapping[]): string {
  return mappings
    .map((m) => {
      if (m.type === 'dynamic') return `D ${m.localPort ?? '?'}`;
      if (m.type === 'local') return `L ${m.localPort ?? '?'}→${m.remotePort ?? '?'}`;
      return `R ${m.remotePort ?? '?'}→${m.localPort ?? '?'}`;
    })
    .join(' ');
}

/** Full human-readable pairing for a mapping, e.g. "jack:2222 → 142.16.8.10:22", for the wizard diagram and modal. */
export function describeMapping(mapping: PortMapping, fromLabel: string, toLabel: string): string {
  if (mapping.type === 'dynamic') {
    return `SOCKS proxy on ${fromLabel}:${mapping.localPort ?? '?'}`;
  }
  if (mapping.type === 'local') {
    const target = mapping.remoteHost || toLabel;
    return `${fromLabel}:${mapping.localPort ?? '?'} → ${target}:${mapping.remotePort ?? '?'}`;
  }
  const target = mapping.remoteHost || fromLabel;
  return `${toLabel}:${mapping.remotePort ?? '?'} → ${target}:${mapping.localPort ?? '?'}`;
}

/**
 * Ports on `deviceId` currently referenced as a forward target by any tunnel's local/remote mapping,
 * or that a mapping listens on this device — matched by device label, the same convention
 * `portsForMapping`/pivot suggestions already use.
 */
export function computeActiveTunnelPorts(deviceId: string, tunnels: TunnelData[], nodes: DeviceNode[]): number[] {
  const ports = new Set<number>();
  for (const tunnel of tunnels) {
    for (const { deviceId: id, port } of tunnelPortAssignments(tunnel, nodes)) {
      if (id === deviceId) ports.add(port);
    }
  }
  return [...ports];
}

/**
 * Where a mapping's forwarding actually listens — always known directly from the forwarding hop and
 * mapping type, no canvas lookup needed: `-L` opens on the SSH client (hop's `fromDevice`), `-R`/`-D`
 * open on the SSH server (hop's `toDevice`) ... except `-D`'s SOCKS listener is on the client too, so
 * only `-R` flips it to the hop's `toDevice`.
 */
function listenAnchor(mapping: PortMapping, forwardingHop: TunnelHop): { deviceId: string; port: number } | null {
  const deviceId = mapping.type === 'remote' ? forwardingHop.toDeviceId : forwardingHop.fromDeviceId;
  const port = mapping.type === 'remote' ? mapping.remotePort : mapping.localPort;
  if (port == null) return null;
  return { deviceId, port };
}

/** Resolves a port mapping's actual forwarded target — matched against canvas device labels by `remoteHost`. */
function resolveMappingTarget(
  mapping: PortMapping,
  nodes: DeviceNode[],
): { deviceId: string; port: number } | null {
  if (mapping.type === 'dynamic') return null;
  const targetLabel = mapping.remoteHost?.toLowerCase();
  const targetPort = mapping.type === 'local' ? mapping.remotePort : mapping.localPort;
  if (!targetLabel || targetPort == null) return null;
  const target = nodes.find((n) => n.data.label.toLowerCase() === targetLabel);
  if (!target) return null;
  return { deviceId: target.id, port: targetPort };
}

/**
 * Every device/port a tunnel's mappings touch — both where each forward listens and where it
 * actually leads, resolved against the current canvas. Used to auto-register ports on the relevant
 * devices so they show up as badges without the user having to add them manually, and to anchor
 * tunnel edges to the real port instead of a generic device handle.
 */
export function tunnelPortAssignments(tunnel: TunnelData, nodes: DeviceNode[]): { deviceId: string; port: number }[] {
  const forwardingHop = tunnel.hops.find((h) => h.id === tunnel.forwardingHopId);
  if (!forwardingHop) return [];
  const assignments: { deviceId: string; port: number }[] = [];
  for (const mapping of tunnel.portMappings) {
    const listen = listenAnchor(mapping, forwardingHop);
    if (listen) assignments.push(listen);
    const target = resolveMappingTarget(mapping, nodes);
    if (target) assignments.push(target);
  }
  return assignments;
}

export function portHandleId(port: number, role: 'source' | 'target'): string {
  return `port-${port}-${role}`;
}

export interface PivotCandidate {
  device: Device;
  deviceId: string;
  viaCidr: string;
}

/**
 * Devices reachable only *through* `toDeviceId` — i.e. things sharing a subnet with one of its
 * interfaces other than however it was reached. Surfaced as suggested forward targets so a tunnel
 * actually pivots somewhere, instead of defaulting to the jump host's own loopback.
 */
export function findPivotCandidates(toDeviceId: string, nodes: DeviceNode[]): PivotCandidate[] {
  const buckets = computeSubnetBuckets(nodes);
  const candidates: PivotCandidate[] = [];
  const seen = new Set<string>();

  for (const [cidr, members] of buckets) {
    if (!members.some((m) => m.nodeId === toDeviceId)) continue;
    for (const member of members) {
      if (member.nodeId === toDeviceId || seen.has(member.nodeId)) continue;
      const device = findDevice(nodes, member.nodeId);
      if (!device) continue;
      seen.add(member.nodeId);
      candidates.push({ device, deviceId: member.nodeId, viaCidr: cidr });
    }
  }
  return candidates;
}

/**
 * Resolves a typed token (device label, configured interface IP address, or a manual
 * "<raw token> -> deviceId" override picked by the user) to a canvas device.
 */
export function resolveDeviceToken(
  nodes: DeviceNode[],
  token: string,
  overrides: Record<string, string> = {},
): DeviceNode | undefined {
  const norm = token.trim().toLowerCase();

  const overrideId = overrides[norm];
  if (overrideId) {
    const overridden = nodes.find((n) => n.id === overrideId);
    if (overridden) return overridden;
  }

  const byLabel = nodes.find((n) => n.data.label.toLowerCase() === norm);
  if (byLabel) return byLabel;

  return nodes.find((n) => n.data.interfaces.some((iface) => iface.addresses.some((a) => a.address.toLowerCase() === norm)));
}

const FORWARD_TRIPLE_RE = /^(\d+):([\w.-]+):(\d+)$/;
const USER_HOST_RE = /^([\w.-]+)@([\w.-]+)$/;

interface ParsedLine {
  hop: TunnelHop;
  mappings: PortMapping[];
}

export interface TunnelParseIssue {
  message: string;
  /** The raw text (device label, hostname, or IP) that couldn't be resolved to any device — set so the
   * caller can offer the user a picker to map it to an existing device, rather than a dead-end error. */
  unresolvedToken?: string;
}

function parseTunnelCommandLine(
  line: string,
  nodes: DeviceNode[],
  overrides: Record<string, string>,
): { result?: ParsedLine; error?: TunnelParseIssue } {
  const sepIndex = line.indexOf('~');
  if (sepIndex === -1) return { error: { message: `Missing "~" separator: ${line}` } };

  const fromLabel = line.slice(0, sepIndex).trim();
  const fromNode = resolveDeviceToken(nodes, fromLabel, overrides);
  if (!fromNode) {
    return { error: { message: `Unknown device "${fromLabel}" in: ${line}`, unresolvedToken: fromLabel } };
  }

  const tokens = line.slice(sepIndex + 1).trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { error: { message: `Empty command in: ${line}` } };

  const protocolToken = tokens[0].toLowerCase();
  if (protocolToken !== 'ssh' && protocolToken !== 'telnet') {
    return { error: { message: `Unrecognized protocol "${tokens[0]}" in: ${line}` } };
  }
  const protocol = protocolToken as HopProtocol;

  const mappings: PortMapping[] = [];
  let toLabel: string | null = null;
  let username: string | undefined;

  for (let i = 1; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === '-L' || tok === '-R' || tok === '-D') {
      const spec = tokens[++i];
      if (tok === '-D') {
        const port = Number(spec);
        if (!Number.isNaN(port)) mappings.push({ id: nextId('mapping'), type: 'dynamic', localPort: port });
        continue;
      }
      const m = spec?.match(FORWARD_TRIPLE_RE);
      if (m) {
        mappings.push({
          id: nextId('mapping'),
          type: tok === '-L' ? 'local' : 'remote',
          localPort: tok === '-L' ? Number(m[1]) : Number(m[3]),
          remoteHost: m[2],
          remotePort: tok === '-L' ? Number(m[3]) : Number(m[1]),
        });
      }
      continue;
    }

    const triple = tok.match(FORWARD_TRIPLE_RE);
    if (triple) {
      mappings.push({
        id: nextId('mapping'),
        type: 'local',
        localPort: Number(triple[1]),
        remoteHost: triple[2],
        remotePort: Number(triple[3]),
      });
      continue;
    }

    const userHost = tok.match(USER_HOST_RE);
    if (userHost) {
      username = userHost[1];
      toLabel = userHost[2];
      continue;
    }

    if (!toLabel) toLabel = tok;
  }

  if (!toLabel) return { error: { message: `Could not find destination device in: ${line}` } };
  const toNode = resolveDeviceToken(nodes, toLabel, overrides);
  if (!toNode) {
    return { error: { message: `Unknown device "${toLabel}" in: ${line}`, unresolvedToken: toLabel } };
  }

  return {
    result: {
      hop: { id: nextId('hop'), fromDeviceId: fromNode.id, toDeviceId: toNode.id, protocol, username },
      mappings,
    },
  };
}

export interface TunnelParseResult {
  tunnel: TunnelData | null;
  errors: TunnelParseIssue[];
}

/**
 * Parses lines like `PC1 ~ ssh -L 1111:PC3:22 user@PC2` into an ordered hop chain. Destination/source
 * tokens are matched against existing canvas device labels first, then against any device's configured
 * interface IP addresses (so `user@142.16.8.41` resolves to whichever device has that address), and
 * finally against any manual `overrides` the caller has collected for tokens neither matched.
 */
export function parseTunnelCommandText(
  text: string,
  nodes: DeviceNode[],
  overrides: Record<string, string> = {},
): TunnelParseResult {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  const errors: TunnelParseIssue[] = [];
  const hops: TunnelHop[] = [];
  let forwardingHopId: string | null = null;
  let portMappings: PortMapping[] = [];

  for (const line of lines) {
    const { result, error } = parseTunnelCommandLine(line, nodes, overrides);
    if (error) {
      errors.push(error);
      continue;
    }
    if (result) {
      hops.push(result.hop);
      if (result.mappings.length > 0) {
        forwardingHopId = result.hop.id;
        portMappings = portMappings.concat(result.mappings);
      }
    }
  }

  if (hops.length === 0) {
    return { tunnel: null, errors: errors.length > 0 ? errors : [{ message: 'No hops parsed.' }] };
  }
  if (!forwardingHopId) {
    errors.push({ message: 'No port-forward flags found — tunnel created without a forwarding command.' });
  }

  const tunnel: TunnelData = {
    id: nextId('tunnel'),
    hops,
    forwardingHopId: forwardingHopId ?? hops[hops.length - 1].id,
    portMappings,
  };
  return { tunnel, errors };
}

/**
 * A second `dynamic` (proxychains) mapping reusing a port already claimed by another tunnel is only
 * a real-world conflict if the two tunnels' forwarding devices are reachable on the same physical
 * network — otherwise each side's proxychains setup is independent and the port can be reused safely.
 */
export function findDynamicPortConflict(
  port: number,
  forwardingFromDeviceId: string,
  existingTunnels: TunnelData[],
  physicalEdges: DeviceEdge[],
): TunnelData | null {
  for (const tunnel of existingTunnels) {
    const usesPort = tunnel.portMappings.some((m) => m.type === 'dynamic' && m.localPort === port);
    if (!usesPort) continue;
    const forwardingHop = tunnel.hops.find((h) => h.id === tunnel.forwardingHopId);
    if (!forwardingHop) continue;
    if (areDevicesNetworkConnected(forwardingFromDeviceId, forwardingHop.fromDeviceId, physicalEdges)) {
      return tunnel;
    }
  }
  return null;
}

function mappingForwardLabel(mapping: PortMapping): string {
  if (mapping.type === 'dynamic') return `D ${mapping.localPort ?? '?'}`;
  if (mapping.type === 'local') return `L ${mapping.localPort ?? '?'}→${mapping.remotePort ?? '?'}`;
  return `R ${mapping.remotePort ?? '?'}→${mapping.localPort ?? '?'}`;
}

/**
 * One edge per mapping showing where its forward actually leads — anchored at the real listening
 * port on one end and the real (resolved) destination port on the other whenever both are known,
 * instead of overloading the hop edge with one mapping's worth of precision.
 */
function buildForwardEdges(tunnel: TunnelData, forwardingHop: TunnelHop, nodes: DeviceNode[]): TunnelHopEdge[] {
  return tunnel.portMappings.flatMap((mapping): TunnelHopEdge[] => {
    if (mapping.type === 'dynamic') return [];
    const listen = listenAnchor(mapping, forwardingHop);
    if (!listen) return [];
    const target = resolveMappingTarget(mapping, nodes);
    const fallbackDeviceId = mapping.type === 'remote' ? forwardingHop.fromDeviceId : forwardingHop.toDeviceId;
    const targetDeviceId = target?.deviceId ?? fallbackDeviceId;
    if (targetDeviceId === listen.deviceId) return [];
    const targetHandle = target ? portHandleId(target.port, 'target') : mapping.type === 'remote' ? 'tunnel-source' : 'tunnel-target';

    return [
      {
        id: `tunnel-fwd-edge-${tunnel.id}-${mapping.id}`,
        type: 'tunnelHopEdge',
        source: listen.deviceId,
        target: targetDeviceId,
        sourceHandle: portHandleId(listen.port, 'source'),
        targetHandle,
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--bp-purple-bright)' },
        data: {
          tunnelId: tunnel.id,
          kind: 'forward',
          protocol: forwardingHop.protocol,
          label: mappingForwardLabel(mapping),
        },
      } satisfies TunnelHopEdge,
    ];
  });
}

/** Fans out edges that share the same device pair (e.g. two tunnels hopping the same two boxes) so they don't render stacked on top of each other. */
function assignLanes(edges: TunnelHopEdge[]): TunnelHopEdge[] {
  const seen = new Map<string, number>();
  return edges.map((edge) => {
    const key = [edge.source, edge.target].sort().join('|');
    const lane = seen.get(key) ?? 0;
    seen.set(key, lane + 1);
    return { ...edge, data: { ...edge.data!, lane } };
  });
}

export function buildTunnelEdges(tunnels: TunnelData[], nodes: DeviceNode[]): TunnelHopEdge[] {
  const edges = tunnels.flatMap((tunnel) => {
    const hopEdges = tunnel.hops.map(
      (hop) =>
        ({
          id: `tunnel-edge-${tunnel.id}-${hop.id}`,
          type: 'tunnelHopEdge',
          source: hop.fromDeviceId,
          target: hop.toDeviceId,
          sourceHandle: 'tunnel-source',
          targetHandle: 'tunnel-target',
          markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--bp-purple)' },
          data: {
            tunnelId: tunnel.id,
            kind: 'hop',
            protocol: hop.protocol,
            label: hop.protocol,
          },
        } satisfies TunnelHopEdge),
    );

    const forwardingHop = tunnel.hops.find((h) => h.id === tunnel.forwardingHopId);
    const forwardEdges = forwardingHop ? buildForwardEdges(tunnel, forwardingHop, nodes) : [];

    return [...hopEdges, ...forwardEdges];
  });

  return assignLanes(edges);
}
