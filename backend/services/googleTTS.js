'use strict';

const textToSpeech = require('@google-cloud/text-to-speech');
const { wrapPcmInWav } = require('../utils/wav');

let _client = null;

function getClient() {
    if (!_client) {
        // Uses GOOGLE_APPLICATION_CREDENTIALS env var automatically
        _client = new textToSpeech.TextToSpeechClient();
    }
    return _client;
}

/**
 * Synthesise text to WAV using Google Cloud Text-to-Speech.
 * Requires GOOGLE_APPLICATION_CREDENTIALS pointing to a service account key.
 * Free tier: 1 million Standard characters/month.
 *
 * @param {string} text - text to synthesise
 * @returns {Promise<Buffer>} complete WAV file (with 44-byte header)
 */
async function synthesize(text) {
    const client = getClient();

    const [response] = await client.synthesizeSpeech({
        input: { text },
        voice: {
            languageCode: 'en-US',
            name:         'en-US-Journey-F',  // warm, friendly female voice
            ssmlGender:   'FEMALE',
        },
        audioConfig: {
            audioEncoding:    'LINEAR16',  // raw PCM — no MP3 decoder needed
            sampleRateHertz:  16000,
            effectsProfileId: ['headphone-class-device'],
            speakingRate:     0.9,   // slightly slower for young children
            pitch:            1.0,
        },
    });

    // Google Cloud TTS returns LINEAR16 as raw PCM (no WAV header)
    const pcmBuf = Buffer.from(response.audioContent);
    return wrapPcmInWav(pcmBuf, 16000, 1, 16);
}

module.exports = { synthesize };
