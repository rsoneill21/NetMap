import { useContext } from 'react';
import { DeviceActionsContext, type DeviceActionsContextValue } from '../contexts/deviceActionsContextDefinition';

export function useDeviceActions(): DeviceActionsContextValue {
  const ctx = useContext(DeviceActionsContext);
  if (!ctx) throw new Error('useDeviceActions must be used within a DeviceActionsContext.Provider');
  return ctx;
}
