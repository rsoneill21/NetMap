import { Router, Network, Monitor, Server, ShieldAlert, Cloud, type LucideIcon } from 'lucide-react';
import type { Device, DeviceType, NetInterface } from '../types';

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Math.floor(Math.random() * 1e6)}`;
}

export interface DeviceTypeMeta {
  type: DeviceType;
  label: string;
  icon: LucideIcon;
}

export const deviceTypeMeta: Record<DeviceType, DeviceTypeMeta> = {
  router: { type: 'router', label: 'Router', icon: Router },
  switch: { type: 'switch', label: 'Switch', icon: Network },
  host: { type: 'host', label: 'Host', icon: Monitor },
  server: { type: 'server', label: 'Server', icon: Server },
  firewall: { type: 'firewall', label: 'Firewall', icon: ShieldAlert },
  cloud: { type: 'cloud', label: 'Cloud / Internet', icon: Cloud },
};

export const deviceTypeOrder: DeviceType[] = ['router', 'switch', 'host', 'server', 'firewall', 'cloud'];

export function createInterface(name: string): NetInterface {
  return {
    id: nextId('iface'),
    name,
    addresses: [],
    description: '',
    status: 'unknown',
  };
}

function createLoopback(): NetInterface {
  const iface = createInterface('lo0');
  iface.description = 'Loopback';
  iface.status = 'up';
  iface.addresses = [
    { address: '127.0.0.1', prefixLength: 32, family: 'ipv4', isLinkLocal: false, isLoopback: true },
  ];
  return iface;
}

function defaultInterfacesFor(type: DeviceType): NetInterface[] {
  if (type === 'cloud') {
    const ifaces = [createInterface('uplink')];
    ifaces[0].isManagement = true;
    return ifaces;
  }

  const networkIfaces = type === 'switch' ? [createInterface('eth0'), createInterface('eth1')] : [createInterface('eth0')];
  networkIfaces[0].isManagement = true;
  return [createLoopback(), ...networkIfaces];
}

export function createDevice(type: DeviceType, label?: string): Device {
  return {
    id: nextId('device'),
    label: label ?? deviceTypeMeta[type].label,
    type,
    interfaces: defaultInterfacesFor(type),
    ports: [],
  };
}
