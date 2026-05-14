/**
 * Full AI pipeline for Edubot paired mode:
 *   WAV from ESP32 → Groq Whisper STT → Groq LLM → Personality → ElevenLabs TTS → MP3 to ESP32
 */

import { transcribeAudio, generateResponse } from './groqService';
import { textToSpeech, VoiceName }           from './elevenLabsService';
import { wsService }                          from './webSocketService';
import { processForTTS }                      from '../utils/personalityProcessor';

export type PipelineStatus =
    | 'idle'
    | 'transcribing'
    | 'thinking'
    | 'speaking'
    | 'error';

export type StatusCallback = (status: PipelineStatus, detail?: string) => void;

let _onStatus: StatusCallback = () => {};
let _voice: VoiceName = 'rachel';
let _busy = false;

export function setPipelineVoice(v: VoiceName): void { _voice = v; }
export function setStatusCallback(cb: StatusCallback): void { _onStatus = cb; }
export function isPipelineBusy(): boolean { return _busy; }

function notify(status: PipelineStatus, detail?: string): void {
    _onStatus(status, detail);
}

/**
 * Process a WAV buffer received from the ESP32.
 * Runs the full pipeline and sends results back over WebSocket.
 *
 * Throws if any step fails — caller should handle and send ERROR to ESP32.
 */
export async function processVoiceInput(wavBuffer: ArrayBuffer): Promise<void> {
    if (_busy) {
        console.warn('[AI] Pipeline busy — ignoring request');
        return;
    }
    _busy = true;

    try {
        // ── Step 1: STT ────────────────────────────────────────────────────────
        notify('transcribing');
        const transcript = await transcribeAudio(wavBuffer);
        console.log(`[AI] Transcript: "${transcript}"`);

        // ── Step 2: Notify ESP32 of transcript (optional feedback) ─────────────
        wsService.sendJson({ type: 'PROCESSING_TEXT', text: transcript });

        // ── Step 3: LLM ────────────────────────────────────────────────────────
        notify('thinking');
        const rawResponse = await generateResponse(transcript);
        console.log(`[AI] Raw response: "${rawResponse}"`);

        // ── Step 4: Personality + colour extraction ────────────────────────────
        const { ttsText, colorRGB } = processForTTS(rawResponse);
        console.log(`[AI] TTS text: "${ttsText}"  color: ${JSON.stringify(colorRGB)}`);

        // ── Step 5: Send RESPONSE_TEXT with colour ──────────────────────────────
        wsService.sendResponseText(ttsText, colorRGB);

        // ── Step 6: ElevenLabs TTS ─────────────────────────────────────────────
        notify('speaking');
        const mp3Buffer = await textToSpeech(ttsText, _voice);
        console.log(`[AI] TTS mp3: ${mp3Buffer.byteLength} bytes`);

        // ── Step 7: Send MP3 to ESP32 ──────────────────────────────────────────
        await wsService.sendAudioResponse(mp3Buffer);

        notify('idle');
    } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.error('[AI] Pipeline error:', reason);
        notify('error', reason);

        // Tell ESP32 to fall back to standalone mode
        wsService.sendJson({ type: 'ERROR', reason: 'TTS_FAILED' });
        throw err;
    } finally {
        _busy = false;
    }
}

/**
 * Wire up the WebSocket audio callback so the pipeline triggers automatically.
 * Call once during app init after wsService is set up.
 */
export function attachPipelineToWebSocket(): void {
    wsService.onAudio = (wavBuffer: ArrayBuffer) => {
        processVoiceInput(wavBuffer).catch((err) => {
            console.error('[AI] Unhandled pipeline error:', err);
        });
    };
}
