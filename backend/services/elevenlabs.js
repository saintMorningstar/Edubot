'use strict';

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

// Default to a child-friendly voice; override via ELEVENLABS_VOICE_ID env var
const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB';  // Adam

/**
 * Synthesise text to raw PCM audio using ElevenLabs.
 * Uses output_format=pcm_16000 → 16 kHz, 16-bit, mono, no WAV header.
 * The caller is responsible for wrapping in WAV if needed.
 *
 * @param {string} text - text to synthesise
 * @returns {Promise<Buffer>} raw PCM buffer at 16 kHz 16-bit mono
 */
async function synthesize(text) {
    const apiKey  = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set');

    const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
    const url     = `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Accept':       'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key':   apiKey,
        },
        body: JSON.stringify({
            text,
            model_id:      'eleven_multilingual_v2',
            output_format: 'pcm_16000',   // raw PCM — no headers, no MP3 decode needed
            voice_settings: {
                stability:        0.5,
                similarity_boost: 0.75,
                style:            0.3,
                use_speaker_boost: true,
            },
        }),
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`ElevenLabs ${response.status}: ${detail.slice(0, 120)}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

module.exports = { synthesize };
