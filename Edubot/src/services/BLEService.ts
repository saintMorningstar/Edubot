/**
 * BLEService — Singleton BLE manager for Edubot.
 * Replaces robotWebSocket.ts for the BLE architecture.
 *
 * - Scans for device named "Edubot"
 * - Auto-connects when found
 * - Sends plain-text commands to CMD characteristic
 * - Receives telemetry & status via NOTIFY characteristics
 */
import { Device, BleError, Characteristic } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { Buffer } from 'buffer';
import { getBleManager } from './bleManager';

// ─── BLE UUIDs (must match firmware) ─────────────────────────────────────────
export const BLE_SERVICE_UUID   = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const BLE_CMD_UUID       = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
export const BLE_TELEMETRY_UUID = 'beb5483f-36e1-4688-b7f5-ea07361b26a8';
export const BLE_STATUS_UUID    = 'beb54840-36e1-4688-b7f5-ea07361b26a8';

export type ConnectionState = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error';

export interface TelemetryData {
  batteryVoltage: number;
  distanceCM:     number;
  heartRate:      number;
  spO2:           number;
  temperature:    number;
  humidity:       number;
}

type StateHandler     = (state: ConnectionState) => void;
type TelemetryHandler = (data: TelemetryData) => void;
type StatusHandler    = (msg: string) => void;

class BLEService {
  private get manager() { return getBleManager(); }
  private device: Device | null = null;
  private _state: ConnectionState = 'disconnected';

  private stateHandler:     StateHandler     = () => {};
  private telemetryHandler: TelemetryHandler = () => {};
  private statusHandler:    StatusHandler    = () => {};


  // ─── Permissions ────────────────────────────────────────────────────────────

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(results).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
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
    this._setState('scanning');

    mgr.startDeviceScan(
      null,                          // scan all services
      { allowDuplicates: false },
      (error: BleError | null, device: Device | null) => {
        if (error) {
          console.error('[BLE] Scan error:', error);
          this._setState('error');
          return;
        }
        const name = device?.name ?? device?.localName ?? '';
        if (name === 'Edubot') {
          mgr.stopDeviceScan();
          this._connect(device!);
        }
      },
    );

    // Auto-stop scan after 12 seconds if not found
    setTimeout(() => {
      if (this._state === 'scanning') {
        mgr.stopDeviceScan();
        this._setState('disconnected');
      }
    }, 12000);
  }

  stopScan(): void {
    const mgr = this.manager;
    if (!mgr) return;
    mgr.stopDeviceScan();
    if (this._state === 'scanning') this._setState('disconnected');
  }

  // ─── Connect ────────────────────────────────────────────────────────────────

  private async _connect(device: Device): Promise<void> {
    this._setState('connecting');
    try {
      const connected   = await device.connect({ timeout: 6000 });
      const discovered  = await connected.discoverAllServicesAndCharacteristics();
      this.device       = discovered;
      this._setState('connected');

      // Subscribe to telemetry notifications
      this.device.monitorCharacteristicForService(
        BLE_SERVICE_UUID, BLE_TELEMETRY_UUID,
        (_err: BleError | null, char: Characteristic | null) => {
          if (char?.value) {
            const json = Buffer.from(char.value, 'base64').toString('utf-8');
            this._parseTelemetry(json);
          }
        },
      );

      // Subscribe to status notifications
      this.device.monitorCharacteristicForService(
        BLE_SERVICE_UUID, BLE_STATUS_UUID,
        (_err: BleError | null, char: Characteristic | null) => {
          if (char?.value) {
            const msg = Buffer.from(char.value, 'base64').toString('utf-8');
            this.statusHandler(msg);
          }
        },
      );

      // Handle unexpected disconnects
      this.device.onDisconnected((_err: BleError | null, _dev: Device) => {
        this.device = null;
        this._setState('disconnected');
      });

    } catch (e) {
      console.error('[BLE] Connect error:', e);
      this._setState('error');
    }
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      try { await this.device.cancelConnection(); } catch { /* ignore */ }
      this.device = null;
    }
    this._setState('disconnected');
  }

  // ─── Send command ────────────────────────────────────────────────────────────

  async sendCommand(cmd: string): Promise<void> {
    if (!this.device || this._state !== 'connected') return;
    try {
      const base64 = Buffer.from(cmd, 'utf-8').toString('base64');
      await this.device.writeCharacteristicWithResponseForService(
        BLE_SERVICE_UUID, BLE_CMD_UUID, base64,
      );
    } catch (e) {
      console.error('[BLE] sendCommand error:', e);
    }
  }

  // ─── Typed command helpers ────────────────────────────────────────────────────

  sendMove(direction: 'forward' | 'backward' | 'left' | 'right' | 'stop'): void {
    const MAP: Record<string, string> = {
      forward: 'MOVE_FORWARD', backward: 'MOVE_BACKWARD',
      left: 'TURN_LEFT', right: 'TURN_RIGHT', stop: 'STOP',
    };
    this.sendCommand(MAP[direction] ?? 'STOP');
  }

  sendEmotion(name: string): void  { this.sendCommand(name.toUpperCase()); }
  sendFace(name: string): void     { this.sendCommand(name.toUpperCase()); }
  sendDance(): void                { this.sendCommand('DANCE'); }
  sendStopDance(): void            { this.sendCommand('STOP_DANCE'); }
  sendWave(): void                 { this.sendCommand('POSE_WAVE'); }
  sendStop(): void                 { this.sendCommand('STOP'); }
  sendSleep(): void                { this.sendCommand('SLEEP'); }
  sendWake(): void                 { this.sendCommand('WAKE'); }
  sendSound(n: number): void       { this.sendCommand(`PLAY_SOUND_${n}`); }
  sendStopSound(): void            { this.sendCommand('STOP_SOUND'); }
  sendVolume(vol: number): void    { this.sendCommand(`VOL:${Math.round(vol)}`); }
  sendServo(ch: number, angle: number): void { this.sendCommand(`SERVO:${ch}:${angle}`); }
  requestStatus(): void            { this.sendCommand('STATUS'); }

  // ─── Callbacks ───────────────────────────────────────────────────────────────

  onConnectionChange(h: StateHandler): void     { this.stateHandler     = h; }
  onTelemetryUpdate(h: TelemetryHandler): void  { this.telemetryHandler = h; }
  onStatusMessage(h: StatusHandler): void       { this.statusHandler    = h; }

  get connectionState(): ConnectionState { return this._state; }
  get isConnected(): boolean             { return this._state === 'connected'; }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private _setState(s: ConnectionState): void {
    this._state = s;
    this.stateHandler(s);
  }

  private _parseTelemetry(json: string): void {
    try {
      const r = JSON.parse(json);
      this.telemetryHandler({
        batteryVoltage: r.b   ?? r.bat  ?? 0,
        distanceCM:     r.d   ?? 0,
        heartRate:      r.h   ?? r.hr   ?? 0,
        spO2:           r.s   ?? r.spo2 ?? 0,
        temperature:    r.t   ?? 0,
        humidity:       r.hu  ?? 0,
      });
    } catch { /* ignore malformed */ }
  }
}

// Singleton — one BLE connection per app
export const bleService = new BLEService();
