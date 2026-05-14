/**
 * Lazy BleManager singleton.
 *
 * Returns null (instead of throwing) when the native module is absent —
 * e.g. Expo Go, web, or unit tests.  Every caller must null-check the result.
 * BLE features simply become no-ops in environments without native support.
 *
 * react-native-ble-plx requires exactly ONE BleManager per app, so both
 * BLEService and SportsBLEService share this single instance.
 */
import { BleManager } from 'react-native-ble-plx';

let _instance: BleManager | null = null;
let _unavailable = false;

export function getBleManager(): BleManager | null {
  if (_unavailable) return null;
  if (_instance)    return _instance;
  try {
    _instance = new BleManager();
    return _instance;
  } catch {
    _unavailable = true;
    console.warn(
      '[BLE] Native BLE module not available. ' +
      'Run `npx expo run:android` for a development build.',
    );
    return null;
  }
}
