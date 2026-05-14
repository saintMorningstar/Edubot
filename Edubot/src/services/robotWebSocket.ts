/**
 * Direct WebSocket connection to the ESP32 robot.
 * No backend server — the phone talks straight to the ESP32.
 *
 * Protocol: JSON messages in both directions.
 *
 * Phone → ESP32  (commands):
 *   {"cmd":"SERVO",     "id":1,       "angle":90}
 *   {"cmd":"LED",       "state":"THINKING"}
 *   {"cmd":"OLED",      "face":"happy"}
 *   {"cmd":"MOVE",      "direction":"forward"}
 *   {"cmd":"WAVE"}
 *   {"cmd":"DANCE"}
 *   {"cmd":"VOICE"}
 *   {"cmd":"SLEEP"}
 *   {"cmd":"STATUS"}
 *   {"cmd":"CLEAR_HISTORY"}
 *
 * ESP32 → Phone  (events):
 *   {"type":"STATUS",      "state":"IDLE", "ip":"...", "uptime":123, "wifi":true, "client":true}
 *   {"type":"TRANSCRIPT",  "text":"What is 2+2?"}
 *   {"type":"RESPONSE",    "text":"Two plus two is four!"}
 *   {"type":"ERROR",       "msg":"No transcript"}
 *   {"type":"OK",          "msg":"History cleared"}
 *   {"type":"RHYME_START", "id":"twinkle", "title":"Twinkle Little Star"}
 *   {"type":"RHYME_DONE",  "id":"twinkle"}
 */

export type RobotEvent =
  | { type: 'STATUS';      state: string; ip: string; uptime: number; wifi: boolean; client: boolean }
  | { type: 'TRANSCRIPT';  text: string }
  | { type: 'RESPONSE';    text: string }
  | { type: 'ERROR';       msg: string }
  | { type: 'OK';          msg: string }
  | { type: 'RHYME_START'; id: string; title: string }
  | { type: 'RHYME_DONE';  id: string };

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

type EventHandler = (event: RobotEvent) => void;
type StateHandler = (state: ConnectionState) => void;

class RobotWebSocket {
  private ws: WebSocket | null = null;
  private url = '';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  private onEvent: EventHandler  = () => {};
  private onState: StateHandler  = () => {};
  private _state: ConnectionState = 'disconnected';

  // ── Public API ──────────────────────────────────────────────────────────

  connect(ip: string): void {
    this.url = `ws://${ip}:81/`;
    this.intentionalClose = false;
    this._open();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this._clearReconnect();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._setState('disconnected');
  }

  send(cmd: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(cmd));
    }
  }

  // Typed command helpers
  setServo(id: number, angle: number)         { this.send({ cmd: 'SERVO', id, angle }); }
  setLed(state: string)                        { this.send({ cmd: 'LED', state }); }
  setFace(face: string)                        { this.send({ cmd: 'OLED', face }); }
  move(direction: string)                      { this.send({ cmd: 'MOVE', direction }); }
  wave()                                       { this.send({ cmd: 'WAVE' }); }
  dance()                                      { this.send({ cmd: 'DANCE' }); }
  requestVoice()                               { this.send({ cmd: 'VOICE' }); }
  sleep()                                      { this.send({ cmd: 'SLEEP' }); }
  requestStatus()                              { this.send({ cmd: 'STATUS' }); }
  clearHistory()                               { this.send({ cmd: 'CLEAR_HISTORY' }); }
  playRhyme(id: string)                        { this.send({ cmd: 'RHYME', id }); }

  onMessage(handler: EventHandler)  { this.onEvent = handler; }
  onConnection(handler: StateHandler){ this.onState = handler; }

  get connectionState(): ConnectionState { return this._state; }
  get isConnected(): boolean             { return this._state === 'connected'; }

  // ── Private ─────────────────────────────────────────────────────────────

  private _open(): void {
    this._setState('connecting');
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this._setState('connected');
      this._clearReconnect();
      this.requestStatus();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as RobotEvent;
        this.onEvent(data);
      } catch {
        console.warn('[WS] Non-JSON message:', event.data);
      }
    };

    this.ws.onerror = () => {
      this._setState('error');
    };

    this.ws.onclose = () => {
      if (!this.intentionalClose) {
        this._setState('connecting');
        // Auto-reconnect after 3 seconds
        this.reconnectTimer = setTimeout(() => this._open(), 3000);
      } else {
        this._setState('disconnected');
      }
    };
  }

  private _setState(state: ConnectionState): void {
    this._state = state;
    this.onState(state);
  }

  private _clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Singleton — one connection per app instance
export const robotWS = new RobotWebSocket();
