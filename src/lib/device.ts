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

function defaultInterfacesFor(type: DeviceType): NetInterface[] {
  const ifaces =
    type === 'cloud'
      ? [createInterface('uplink')]
      : type === 'switch'
        ? [createInterface('eth0'), createInterface('eth1')]
        : [createInterface('eth0')];
  ifaces[0].isManagement = true;
  return ifaces;
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
