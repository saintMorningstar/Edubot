'use strict';

const { AssemblyAI } = require('assemblyai');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

let _client = null;

function getClient() {
    if (!_client) {
        const apiKey = process.env.ASSEMBLYAI_API_KEY;
        if (!apiKey) throw new Error('ASSEMBLYAI_API_KEY is not set');
        _client = new AssemblyAI({ apiKey });
    }
    return _client;
}

/**
 * Transcribe a WAV buffer using AssemblyAI.
 * @param {Buffer} wavBuffer - WAV file content
 * @returns {Promise<string>} transcribed text (empty string if no speech)
 */
async function transcribeAudio(wavBuffer) {
    const client = getClient();

    // Write to a temp file — most reliable way to feed a Buffer to the SDK
    const tmpFile = path.join(os.tmpdir(), `edubot_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`);
    fs.writeFileSync(tmpFile, wavBuffer);

    try {
        const transcript = await client.transcripts.transcribe({
            audio: tmpFile,
            language_code: 'en',
        });

        if (transcript.status === 'error') {
            throw new Error(`AssemblyAI transcription error: ${transcript.error}`);
        }

        return transcript.text || '';
    } finally {
        try { fs.unlinkSync(tmpFile); } catch (_) { /* ignore cleanup errors */ }
    }
}

module.exports = { transcribeAudio };
