import { parseCidrToken } from './cidr';
import { createInterface } from './device';
import type { Device, DeviceType, InterfaceStatus, NetInterface } from '../types';

export type DetectedFormat = 'vyos-show-int' | 'linux-ip-a' | 'unknown';

const VYOS_PROMPT_RE = /^[\w.-]+@[\w.-]+[>$#](?:\s|$)/m;
const LINUX_PROMPT_RE = /^[\w.-]+@[\w.-]+:[^\n]*[$#]\s*/m;

export function splitIntoBlocks(rawInput: string): string[] {
  const lines = rawInput.split(/\r?\n/);
  const boundaries: number[] = [];
  lines.forEach((line, i) => {
    if (VYOS_PROMPT_RE.test(line) || LINUX_PROMPT_RE.test(line)) {
      boundaries.push(i);
    }
  });

  if (boundaries.length === 0) {
    const trimmed = rawInput.trim();
    return trimmed ? [trimmed] : [];
  }

  if (boundaries[0] !== 0) boundaries.unshift(0);

  const blocks: string[] = [];
  for (let b = 0; b < boundaries.length; b += 1) {
    const start = boundaries[b];
    const end = b + 1 < boundaries.length ? boundaries[b + 1] : lines.length;
    const block = lines.slice(start, end).join('\n').trim();
    if (block) blocks.push(block);
  }
  return blocks;
}

const VYOS_TABLE_ROW_RE = /^\S+\s+(?:-|[0-9A-Fa-f.:]+\/\d{1,3})\s+[uUdDaA]\/[uUdDaA]\s*.*$/m;

export function detectFormat(block: string): DetectedFormat {
  if (/show\s+int\b/i.test(block) || /^Codes:\s*S\s*-\s*State/im.test(block)) return 'vyos-show-int';
  if (/\bip\s+a(?:ddr)?\b/i.test(block) || /^\s*\d+:\s+\S+:\s+<[A-Z,_]+>/m.test(block)) return 'linux-ip-a';
  // No command echo or header — fall back to recognizing bare interface-table rows
  // (e.g. "eth0  10.0.0.1/24  u/u  description" or "eth1  -  d/d").
  if (VYOS_TABLE_ROW_RE.test(block)) return 'vyos-show-int';
  return 'unknown';
}

interface RawIfaceRow {
  name?: string;
  address?: string;
  stateCode?: string;
  description?: string;
}

function normalizeStatus(code?: string): InterfaceStatus {
  if (!code) return 'unknown';
  const lower = code.toLowerCase();
  if (lower.startsWith('a')) return 'admin-down';
  if (lower.includes('d')) return 'down';
  if (lower.includes('u')) return 'up';
  return 'unknown';
}

function parseVyosShowInt(block: string): RawIfaceRow[] {
  const rows: RawIfaceRow[] = [];
  let currentName: string | undefined;
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^vyos@|^Codes:|^Interface\s+IP Address/i.test(trimmed)) continue;
    if (VYOS_PROMPT_RE.test(trimmed)) continue;

    const full = trimmed.match(/^(\S+)\s+(-|[0-9A-Fa-f.:]+\/\d{1,3})\s+([uUdDaA]\/[uUdDaA])\s*(.*)$/);
    if (full) {
      currentName = full[1];
      rows.push({ name: full[1], address: full[2], stateCode: full[3], description: full[4].trim() });
      continue;
    }

    const cont = trimmed.match(/^(-|[0-9A-Fa-f.:]+\/\d{1,3})\s*$/);
    if (cont && currentName) {
      rows.push({ name: currentName, address: cont[1] });
    }
  }
  return rows;
}

function buildInterfacesFromVyosRows(rows: RawIfaceRow[]): NetInterface[] {
  const byName = new Map<string, NetInterface>();
  for (const row of rows) {
    if (!row.name) continue;
    let iface = byName.get(row.name);
    if (!iface) {
      iface = createInterface(row.name);
      byName.set(row.name, iface);
    }
    if (row.address) {
      const ip = parseCidrToken(row.address);
      if (ip) iface.addresses.push(ip);
    }
    if (row.description && !iface.description) iface.description = row.description;
    if (row.stateCode && iface.status === 'unknown') iface.status = normalizeStatus(row.stateCode);
  }
  return [...byName.values()];
}

interface RawLinuxIface {
  name: string;
  addresses: string[];
  mac?: string;
  stateUp: boolean;
}

function parseLinuxIpA(block: string): RawLinuxIface[] {
  const ifaceBlocks = block.split(/\n(?=\s*\d+:\s)/);
  return ifaceBlocks
    .map((b): RawLinuxIface => {
      const nameMatch = b.match(/^\s*\d+:\s*([^:@\s]+)(?:@\S+)?:/);
      const flags = b.match(/<([A-Z,_]+)>/)?.[1] ?? '';
      const mac = b.match(/link\/ether\s+([0-9a-f:]{17})/i)?.[1];
      const addrLines = Array.from(b.matchAll(/\binet6?\s+(\S+\/\d{1,3})\b/g)).map((m) => m[1]);
      return {
        name: nameMatch?.[1] ?? 'unknown',
        addresses: addrLines,
        mac,
        stateUp: flags.includes('UP') && flags.includes('LOWER_UP'),
      };
    })
    .filter((i) => i.name !== 'unknown');
}

function buildInterfacesFromLinuxRows(rows: RawLinuxIface[]): NetInterface[] {
  return rows.map((row) => {
    const iface = createInterface(row.name);
    iface.macAddress = row.mac;
    iface.status = row.stateUp ? 'up' : 'down';
    for (const token of row.addresses) {
      const ip = parseCidrToken(token);
      if (ip) iface.addresses.push(ip);
    }
    return iface;
  });
}

function detectDeviceType(format: DetectedFormat, ifaces: NetInterface[]): DeviceType {
  if (format === 'linux-ip-a') return 'host';
  if (format === 'vyos-show-int') {
    const descriptions = ifaces.map((i) => i.description.toLowerCase()).join(' ');
    if (/\b(fw|firewall|dmz)\b/.test(descriptions)) return 'firewall';
    return 'router';
  }
  return 'host';
}

function detectLabel(block: string, format: DetectedFormat, fallback: string): string {
  if (format === 'vyos-show-int') {
    const m = block.match(/^([\w.-]+)@([\w.-]+)[>$#]/m);
    if (m) return m[2];
  }
  if (format === 'linux-ip-a') {
    const m = block.match(/^([\w.-]+)@([\w.-]+):/m);
    if (m) return m[2];
  }
  return fallback;
}

export interface ParseResult {
  devices: Device[];
  skippedBlocks: number;
}

export function parseAndCreateDevices(rawInput: string): ParseResult {
  const blocks = splitIntoBlocks(rawInput);
  const devices: Device[] = [];
  let skippedBlocks = 0;

  blocks.forEach((block, index) => {
    const format = detectFormat(block);
    let interfaces: NetInterface[] = [];

    if (format === 'vyos-show-int') {
      interfaces = buildInterfacesFromVyosRows(parseVyosShowInt(block));
    } else if (format === 'linux-ip-a') {
      interfaces = buildInterfacesFromLinuxRows(parseLinuxIpA(block));
    }

    if (interfaces.length === 0) {
      skippedBlocks += 1;
      return;
    }

    const type = detectDeviceType(format, interfaces);
    const label = detectLabel(block, format, `device-${index + 1}`);
    devices.push({
      id: `${label}-${Date.now()}-${index}-${Math.floor(Math.random() * 1e6)}`,
      label,
      type,
      interfaces,
    });
  });

  return { devices, skippedBlocks };
}
