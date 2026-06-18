import type { IpAddress } from '../types';

function ipv4ToInt(addr: string): number {
  return addr.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function ipv4Network(addr: string, prefixLength: number): number {
  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  return (ipv4ToInt(addr) & mask) >>> 0;
}

export function ipv4NetworkCidr(addr: string, prefixLength: number): string {
  const net = ipv4Network(addr, prefixLength);
  const octets = [24, 16, 8, 0].map((shift) => (net >>> shift) & 255);
  return `${octets.join('.')}/${prefixLength}`;
}

function ipv6ToGroups(addr: string): number[] {
  const [head, tail] = addr.split('::');
  const headGroups = head ? head.split(':').filter((g) => g.length > 0) : [];
  const tailGroups = tail !== undefined ? tail.split(':').filter((g) => g.length > 0) : [];
  if (addr.includes('::')) {
    const missing = 8 - headGroups.length - tailGroups.length;
    const zeros = new Array(Math.max(missing, 0)).fill('0');
    return [...headGroups, ...zeros, ...tailGroups].map((g) => parseInt(g, 16));
  }
  return headGroups.map((g) => parseInt(g, 16));
}

function ipv6Network(addr: string, prefixLength: number): number[] {
  const groups = ipv6ToGroups(addr);
  return groups.map((g, i) => {
    const bitsRemaining = prefixLength - i * 16;
    if (bitsRemaining >= 16) return g;
    if (bitsRemaining <= 0) return 0;
    const mask = (0xffff << (16 - bitsRemaining)) & 0xffff;
    return g & mask;
  });
}

export function ipv6NetworkCidr(addr: string, prefixLength: number): string {
  return `${ipv6Network(addr, prefixLength)
    .map((g) => g.toString(16))
    .join(':')}/${prefixLength}`;
}

function isIpv6LinkLocal(addr: string): boolean {
  const groups = ipv6ToGroups(addr);
  if (groups.length === 0) return false;
  // fe80::/10 -> first 10 bits of first group must equal 0xfe80's top 10 bits
  return (groups[0] & 0xffc0) === 0xfe80;
}

export function parseCidrToken(token: string): IpAddress | null {
  const [addr, prefixStr] = token.split('/');
  const prefixLength = Number(prefixStr);
  if (!addr) return null;

  if (addr.includes(':')) {
    if (Number.isNaN(prefixLength) || prefixLength < 0 || prefixLength > 128) return null;
    return {
      address: addr,
      prefixLength,
      family: 'ipv6',
      isLinkLocal: isIpv6LinkLocal(addr),
      isLoopback: addr === '::1',
    };
  }

  const octets = addr.split('.').map(Number);
  if (octets.length !== 4 || octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) return null;
  if (Number.isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) return null;
  return {
    address: addr,
    prefixLength,
    family: 'ipv4',
    isLinkLocal: octets[0] === 169 && octets[1] === 254,
    isLoopback: octets[0] === 127,
  };
}

export function formatIpAddress(ip: IpAddress): string {
  return `${ip.address}/${ip.prefixLength}`;
}
