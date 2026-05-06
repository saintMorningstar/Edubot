'use strict';

/**
 * Build a 44-byte WAV/RIFF header for a PCM audio stream.
 * @param {number} dataLength   - PCM payload size in bytes
 * @param {number} sampleRate   - e.g. 16000
 * @param {number} channels     - 1 = mono
 * @param {number} bitsPerSample - 16
 * @returns {Buffer} 44-byte header
 */
function buildWavHeader(dataLength, sampleRate = 16000, channels = 1, bitsPerSample = 16) {
    const byteRate   = sampleRate * channels * bitsPerSample / 8;
    const blockAlign = channels * bitsPerSample / 8;
    const header     = Buffer.alloc(44);

    header.write('RIFF', 0, 'ascii');
    header.writeUInt32LE(36 + dataLength, 4);
    header.write('WAVE', 8, 'ascii');
    header.write('fmt ', 12, 'ascii');
    header.writeUInt32LE(16, 16);              // PCM subchunk size
    header.writeUInt16LE(1, 20);               // PCM format
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36, 'ascii');
    header.writeUInt32LE(dataLength, 40);

    return header;
}

/**
 * Prepend a WAV header to a raw PCM buffer.
 * @param {Buffer} pcmBuffer
 * @param {number} sampleRate
 * @param {number} channels
 * @param {number} bitsPerSample
 * @returns {Buffer} complete WAV file
 */
function wrapPcmInWav(pcmBuffer, sampleRate = 16000, channels = 1, bitsPerSample = 16) {
    const header = buildWavHeader(pcmBuffer.length, sampleRate, channels, bitsPerSample);
    return Buffer.concat([header, pcmBuffer]);
}

module.exports = { buildWavHeader, wrapPcmInWav };
