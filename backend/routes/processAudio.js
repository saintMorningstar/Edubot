'use strict';

const { transcribeAudio }  = require('../services/assemblyai');
const { generateResponse } = require('../services/gemini');
const { synthesize: elevenLabsSynth } = require('../services/elevenlabs');
const { synthesize: googleTtsSynth }  = require('../services/googleTTS');
const { wrapPcmInWav } = require('../utils/wav');

const FALLBACK_TEXT = "I'm having a little trouble right now. Can you try again?";

/**
 * POST /process-audio
 * Body: raw WAV (Content-Type: audio/wav)
 * Response: WAV audio (Content-Type: audio/wav)
 *
 * Pipeline:
 *   1. AssemblyAI → transcript text
 *   2. Gemini     → child-friendly response text
 *   3. ElevenLabs → PCM audio (primary)
 *       or Google TTS → WAV audio (fallback)
 */
module.exports = async function processAudio(req, res) {
    const wavBuffer = req.body;

    if (!wavBuffer || !Buffer.isBuffer(wavBuffer) || wavBuffer.length < 44) {
        return res.status(400).json({
            error: 'Body must be a WAV file sent with Content-Type: audio/wav',
        });
    }

    console.log(`[Pipeline] Received ${wavBuffer.length} byte WAV`);

    // ── Step 1: Speech-to-text ────────────────────────────────
    let transcript;
    try {
        transcript = await transcribeAudio(wavBuffer);
        console.log(`[Pipeline] Transcript: "${transcript}"`);
    } catch (err) {
        console.error('[Pipeline] AssemblyAI error:', err.message);
        return sendFallbackAudio(res, FALLBACK_TEXT);
    }

    if (!transcript || transcript.trim() === '') {
        console.log('[Pipeline] No speech detected — sending prompt');
        return sendFallbackAudio(res, "I didn't quite hear you! Can you say that again?");
    }

    // ── Step 2: AI response ───────────────────────────────────
    let aiText;
    try {
        aiText = await generateResponse(transcript.trim());
        console.log(`[Pipeline] Gemini: "${aiText}"`);
    } catch (err) {
        console.error('[Pipeline] Gemini error:', err.message);
        return sendFallbackAudio(res, FALLBACK_TEXT);
    }

    // ── Step 3: Text-to-speech ────────────────────────────────
    return sendTtsAudio(res, aiText);
};

async function sendTtsAudio(res, text) {
    // Primary: ElevenLabs → returns raw PCM at 16 kHz
    try {
        const pcmBuf = await elevenLabsSynth(text);
        const wavBuf = wrapPcmInWav(pcmBuf, 16000, 1, 16);
        console.log(`[Pipeline] ElevenLabs OK → ${wavBuf.length} bytes WAV`);
        return res
            .status(200)
            .type('audio/wav')
            .set('Content-Length', String(wavBuf.length))
            .send(wavBuf);
    } catch (err) {
        console.error('[Pipeline] ElevenLabs failed:', err.message, '— trying Google TTS');
    }

    // Fallback: Google Cloud TTS → returns WAV directly
    try {
        const wavBuf = await googleTtsSynth(text);
        console.log(`[Pipeline] Google TTS OK → ${wavBuf.length} bytes WAV`);
        return res
            .status(200)
            .type('audio/wav')
            .set('Content-Length', String(wavBuf.length))
            .send(wavBuf);
    } catch (err) {
        console.error('[Pipeline] Google TTS also failed:', err.message);
        return res.status(502).json({ error: 'Both TTS services unavailable', text });
    }
}

async function sendFallbackAudio(res, text) {
    return sendTtsAudio(res, text);
}
