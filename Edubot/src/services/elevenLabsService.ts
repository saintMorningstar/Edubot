import { getApiKey } from '../utils/secureKeyStore';

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';

// Rachel (default, warm female)  |  Bella (more playful)
export const VOICES = {
    rachel: '21m00Tcm4TlvDq8ikWAM',
    bella:  'EXAVITQu4vr4xnSDxMaL',
} as const;

export type VoiceName = keyof typeof VOICES;

const VOICE_SETTINGS = {
    stability:        0.35,
    similarity_boost: 0.65,
    style:            0.4,
    use_speaker_boost: true,
} as const;

// Max audio size the ESP32 can handle (~15 seconds MP3 ≈ 240 KB at 128kbps)
const MAX_AUDIO_BYTES = 300_000;

/**
 * Convert text → MP3 bytes using ElevenLabs.
 * Returns an ArrayBuffer ready for WebSocket binary transfer.
 */
export async function textToSpeech(
    text: string,
    voice: VoiceName = 'rachel',
): Promise<ArrayBuffer> {
    const apiKey = await getApiKey('ELEVENLABS');
    if (!apiKey) throw new Error('ElevenLabs API key not configured');

    const voiceId = VOICES[voice];

    const res = await fetch(`${ELEVEN_BASE}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
            'xi-api-key':    apiKey,
            'Content-Type':  'application/json',
            Accept:          'audio/mpeg',
        },
        body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: VOICE_SETTINGS,
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`ElevenLabs TTS error ${res.status}: ${errText}`);
    }

    const buffer = await res.arrayBuffer();

    if (buffer.byteLength > MAX_AUDIO_BYTES) {
        console.warn(`[TTS] Audio ${buffer.byteLength} bytes exceeds ESP32 buffer limit`);
    }

    return buffer;
}
