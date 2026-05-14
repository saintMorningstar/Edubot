/**
 * SportsBLEService — Separate BLE singleton for Sports Mode car control.
 * Completely independent from BLEService.ts (main Edubot robot).
 *
 * - Scans all nearby named BLE devices and surfaces them for selection
 * - Connects to the user-chosen device (or auto-highlights "EdubotCar")
 * - Sends plain-text motor commands to the car's CMD characteristic
 * - Firmware device name: "EdubotCar"
 */

import { Device, BleError } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { Buffer } from 'buffer';
import { getBleManager } from './bleManager';

// ─── BLE UUIDs (must match car_firmware.ino) ─────────────────────────────────
export const CAR_SERVICE_UUID = 'c7a6e100-f000-4d00-b000-000000000001';
export const CAR_CMD_UUID     = 'c7a6e100-f000-4d00-b000-000000000002';
export const CAR_DEVICE_NAME  = 'EdubotCar';

// ─── Types ────────────────────────────────────────────────────────────────────
export type CarConnectionState =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'error';

export interface ScannedDevice {
  id:   string;
  name: string;
  rssi: number;
}

type StateHandler  = (state: CarConnectionState) => void;
type DeviceHandler = (devices: ScannedDevice[]) => void;

// ─── Service ─────────────────────────────────────────────────────────────────
class SportsBLEService {
  private get manager() { return getBleManager(); }
  private device:  Device | null = null;
  private _state:  CarConnectionState = 'disconnected';
  private _scanned: Map<string, ScannedDevice> = new Map();

  private stateHandler:  StateHandler  = () => {};
  private deviceHandler: DeviceHandler = () => {};


  // ─── Permissions ────────────────────────────────────────────────────────────
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(results).every(
        r => r === PermissionsAndroid.RESULTS.GRANTED,
      );
    }
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  // ─── Scan ───────────────────────────────────────────────────────────────────
  async scan(): Promise<void> {
    const mgr = this.manager;
    if (!mgr) { this._setState('error'); return; }

    const granted = await this.requestPermissions();
    if (!granted) {
      this._setState('error');
      return;
    }

    this._scanned.clear();
    this.deviceHandler([]);
    this._setState('scanning');

    mgr.startDeviceScan(
      null,
      { allowDuplicates: false },
      (error: BleError | null, device: Device | null) => {
        if (error) {
          console.error('[SportsBLE] Scan error:', error);
          this._setState('error');
          return;
        }
        if (!device) return;
        const name = device.name ?? device.localName ?? '';
        if (!name) return; // skip anonymous devices

        const entry: ScannedDevice = {
          id:   device.id,
          name,
          rssi: device.rssi ?? -99,
        };
        this._scanned.set(device.id, entry);
        // Emit sorted by signal strength (strongest first)
        this.deviceHandler(
          [...this._scanned.values()].sort((a, b) => b.rssi - a.rssi),
        );
      },
    );

    // Auto-stop after 10 seconds
    setTimeout(() => {
      if (this._state === 'scanning') {
        mgr.stopDeviceScan();
        this._setState('disconnected');
      }
    }, 10000);
  }

  stopScan(): void {
    const mgr = this.manager;
    if (!mgr) return;
    mgr.stopDeviceScan();
    if (this._state === 'scanning') this._setState('disconnected');
  }

  // ─── Connect ────────────────────────────────────────────────────────────────
  async connect(scanned: ScannedDevice): Promise<void> {
    const mgr = this.manager;
    if (!mgr) { this._setState('error'); return; }
    mgr.stopDeviceScan();
    this._setState('connecting');
    try {
      const connected  = await mgr.connectToDevice(scanned.id, { timeout: 8000 });
      const discovered = await connected.discoverAllServicesAndCharacteristics();
      this.device      = discovered;
      this._setState('connected');

      this.device.onDisconnected((_err: BleError | null, _dev: Device) => {
        this.device = null;
        this._setState('disconnected');
      });
    } catch (e) {
      console.error('[SportsBLE] Connect error:', e);
      this._setState('error');
      // Reset to disconnected after 3 s so the user can try again
      setTimeout(() => {
        if (this._state === 'error') this._setState('disconnected');
      }, 3000);
    }
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      try { await this.device.cancelConnection(); } catch { /* ignore */ }
      this.device = null;
    }
    this._setState('disconnected');
  }

  // ─── Commands ────────────────────────────────────────────────────────────────
  async sendCommand(cmd: string): Promise<void> {
    if (!this.device || this._state !== 'connected') return;
    try {
      const base64 = Buffer.from(cmd, 'utf-8').toString('base64');
      await this.device.writeCharacteristicWithoutResponseForService(
        CAR_SERVICE_UUID,
        CAR_CMD_UUID,
        base64,
      );
    } catch (e) {
      console.error('[SportsBLE] sendCommand error:', e);
    }
  }

  // dir = directional command, speedPct = 30 | 65 | 100 (matches speed levels)
  sendMove(dir: 'forward' | 'backward' | 'left' | 'right', speedPct: number): void {
    const MAP: Record<string, string> = {
      forward:  'CAR_FORWARD',
      backward: 'CAR_BACKWARD',
      left:     'CAR_LEFT',
      right:    'CAR_RIGHT',
    };
    this.sendCommand(`${MAP[dir]}:${speedPct}`);
  }

  sendStop(): void {
    this.sendCommand('CAR_STOP');
  }

  // ─── Event callbacks ─────────────────────────────────────────────────────────
  onConnectionChange(h: StateHandler):  void { this.stateHandler  = h; }
  onDevicesFound(h: DeviceHandler):     void { this.deviceHandler = h; }

  // ─── Accessors ───────────────────────────────────────────────────────────────
  get connectionState(): CarConnectionState { return this._state; }
  get isConnected(): boolean               { return this._state === 'connected'; }

  // ─── Private ─────────────────────────────────────────────────────────────────
  private _setState(s: CarConnectionState): void {
    this._state = s;
    this.stateHandler(s);
  }
}

// Singleton — one sports-car BLE connection per app instance
export const sportsBLEService = new SportsBLEService();
