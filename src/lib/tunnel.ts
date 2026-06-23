import { nextId } from './device';
import { areDevicesNetworkConnected } from './network';
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
  forwardingCommand: string | null;
  proxychainsLines: string[];
}

export function buildTunnelCommandBlock(tunnel: TunnelData, nodes: DeviceNode[]): TunnelCommandBlock {
  const hopCommands = tunnel.hops.map((hop) => {
    const fromDevice = findDevice(nodes, hop.fromDeviceId);
    const toDevice = findDevice(nodes, hop.toDeviceId);
    return {
      hopId: hop.id,
      label: `${fromDevice?.label ?? hop.fromDeviceId} -> ${toDevice?.label ?? hop.toDeviceId} (${hop.protocol})`,
      command: buildHopCommand(hop, toDevice),
    };
  });

  const forwardingHop = tunnel.hops.find((h) => h.id === tunnel.forwardingHopId);
  const forwardingCommand = forwardingHop
    ? buildForwardingCommand(forwardingHop, findDevice(nodes, forwardingHop.toDeviceId), tunnel.portMappings)
    : null;

  const proxychainsLines = tunnel.portMappings
    .map((m) => buildProxychainsSnippet(m))
    .filter((line): line is string => line !== null);

  return { hopCommands, forwardingCommand, proxychainsLines };
}

export function portMappingSummary(mappings: PortMapping[]): string {
  return mappings
    .map((m) => (m.type === 'dynamic' ? `-D ${m.localPort ?? '?'}` : m.type === 'local' ? `-L ${m.localPort ?? '?'}` : `-R ${m.remotePort ?? '?'}`))
    .join(' ');
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

export function buildTunnelEdges(tunnels: TunnelData[]): TunnelHopEdge[] {
  return tunnels.flatMap((tunnel) =>
    tunnel.hops.map((hop, index) => {
      const isForwardingHop = hop.id === tunnel.forwardingHopId;
      return {
        id: `tunnel-edge-${tunnel.id}-${hop.id}`,
        type: 'tunnelHopEdge',
        source: hop.fromDeviceId,
        target: hop.toDeviceId,
        data: {
          tunnelId: tunnel.id,
          hopIndex: index,
          protocol: hop.protocol,
          isForwardingHop,
          portSummary: isForwardingHop ? portMappingSummary(tunnel.portMappings) : undefined,
        },
      } satisfies TunnelHopEdge;
    }),
  );
}
