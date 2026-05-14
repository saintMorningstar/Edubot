/**
 * WebSocket client for Edubot ESP32-S3 pairing.
 * ESP32 is the server (port 81, path /ws); phone is the client.
 *
 * Protocol:
 *   Phone → ESP32 : HELLO, RESPONSE_TEXT, RESPONSE_AUDIO_START, <binary>, RESPONSE_AUDIO_END
 *   ESP32 → Phone : READY, AUDIO_REQUEST_START, <binary WAV>, PING, ERROR
 */

const WS_PORT    = 81;
const WS_PATH    = '/ws';
const PING_MS    = 5_000;
const CHUNK_SIZE = 8_192;    // binary send chunk size (bytes)

export type WsState = 'disconnected' | 'connecting' | 'connected' | 'ready';

export type WsMessageHandler = (msg: Record<string, unknown>) => void;
export type WsAudioHandler   = (data: ArrayBuffer) => void;
export type WsStateHandler   = (state: WsState) => void;

export class WebSocketService {
    private ws: WebSocket | null = null;
    private _state: WsState = 'disconnected';
    private pingTimer: ReturnType<typeof setInterval> | null = null;

    // Incoming audio accumulation
    private rxExpected   = 0;
    private rxFormat     = 'wav';
    private rxChunks: ArrayBuffer[] = [];
    private rxReceived   = 0;
    private rxPending    = false;

    // Callbacks
    onStateChange?: WsStateHandler;
    onMessage?:    WsMessageHandler;
    onAudio?:      WsAudioHandler;

    get state(): WsState { return this._state; }
    get isReady(): boolean { return this._state === 'ready'; }

    // ─── Connect ──────────────────────────────────────────────────────────────
    connect(robotIp: string): void {
        if (this.ws) this.disconnect();
        this._setState('connecting');

        const url = `ws://${robotIp}:${WS_PORT}${WS_PATH}`;
        console.log(`[WS] Connecting to ${url}`);

        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
            this._setState('connected');
            this._sendJson({ type: 'HELLO', version: '1.0' });
            this._startPing();
        };

        this.ws.onclose = () => {
            this._setState('disconnected');
            this._stopPing();
            this.rxPending = false;
        };

        this.ws.onerror = (err) => {
            console.error('[WS] Error', err);
            this._setState('disconnected');
        };

        this.ws.onmessage = (event: MessageEvent) => {
            if (typeof event.data === 'string') {
                this._handleText(event.data);
            } else {
                this._handleBinary(event.data as ArrayBuffer);
            }
        };
    }

    disconnect(): void {
        this._stopPing();
        this.ws?.close();
        this.ws = null;
        this._setState('disconnected');
    }

    // ─── Send helpers ─────────────────────────────────────────────────────────
    private _sendJson(msg: Record<string, unknown>): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }

    /** Send any arbitrary JSON message (used by pipeline for PROCESSING_TEXT etc.). */
    sendJson(msg: Record<string, unknown>): void {
        this._sendJson(msg);
    }

    /** Send structured RESPONSE_TEXT so ESP32 can update its LED colour. */
    sendResponseText(text: string, color: [number, number, number] | null): void {
        this._sendJson({
            type:  'RESPONSE_TEXT',
            text,
            color: color ?? [255, 255, 255],
        });
    }

    /** Send MP3 audio back to ESP32 in chunks. */
    async sendAudioResponse(mp3Buffer: ArrayBuffer): Promise<void> {
        if (!this.isReady) throw new Error('WebSocket not ready');

        // 1. Header
        this._sendJson({
            type:   'RESPONSE_AUDIO_START',
            format: 'mp3',
            size:   mp3Buffer.byteLength,
        });

        // 2. Binary chunks
        let offset = 0;
        while (offset < mp3Buffer.byteLength) {
            const end   = Math.min(offset + CHUNK_SIZE, mp3Buffer.byteLength);
            const chunk = mp3Buffer.slice(offset, end);
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(chunk);
            }
            offset = end;
            // Yield to event loop between chunks so UI stays responsive
            await new Promise(r => setTimeout(r, 0));
        }

        // 3. End marker
        this._sendJson({ type: 'RESPONSE_AUDIO_END' });
        console.log(`[WS] Sent ${mp3Buffer.byteLength} bytes MP3 to ESP32`);
    }

    // ─── Receive handlers ─────────────────────────────────────────────────────
    private _handleText(raw: string): void {
        let msg: Record<string, unknown>;
        try { msg = JSON.parse(raw); } catch { return; }

        const type = msg.type as string;

        if (type === 'READY') {
            this._setState('ready');

        } else if (type === 'AUDIO_REQUEST_START') {
            this.rxExpected  = (msg.size as number) ?? 0;
            this.rxFormat    = (msg.format as string) ?? 'wav';
            this.rxChunks    = [];
            this.rxReceived  = 0;
            this.rxPending   = this.rxExpected > 0;
            console.log(`[WS] Incoming ${this.rxFormat} audio: ${this.rxExpected} bytes`);

        } else if (type === 'PING') {
            this._sendJson({ type: 'PONG' });

        } else if (type === 'ERROR') {
            console.error('[WS] ESP32 error:', msg.reason);
            this.onMessage?.(msg);

        } else {
            this.onMessage?.(msg);
        }
    }

    private _handleBinary(data: ArrayBuffer): void {
        if (!this.rxPending) return;

        this.rxChunks.push(data);
        this.rxReceived += data.byteLength;

        if (this.rxReceived >= this.rxExpected) {
            // Assemble all chunks into a single ArrayBuffer
            const full = new Uint8Array(this.rxReceived);
            let pos = 0;
            for (const chunk of this.rxChunks) {
                full.set(new Uint8Array(chunk), pos);
                pos += chunk.byteLength;
            }
            this.rxPending = false;
            this.rxChunks  = [];
            console.log(`[WS] Received ${this.rxReceived} bytes ${this.rxFormat} audio`);
            this.onAudio?.(full.buffer);
        }
    }

    // ─── Heartbeat ────────────────────────────────────────────────────────────
    private _startPing(): void {
        this.pingTimer = setInterval(() => {
            this._sendJson({ type: 'PING' });
        }, PING_MS);
    }

    private _stopPing(): void {
        if (this.pingTimer !== null) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    // ─── State management ─────────────────────────────────────────────────────
    private _setState(s: WsState): void {
        if (this._state === s) return;
        this._state = s;
        console.log(`[WS] State → ${s}`);
        this.onStateChange?.(s);
    }
}

// Singleton for use across the app
export const wsService = new WebSocketService();
