import { createContext } from 'react';

export interface DeviceActionsContextValue {
  onStartTunnel: (deviceId: string) => void;
}

export const DeviceActionsContext = createContext<DeviceActionsContextValue | null>(null);
