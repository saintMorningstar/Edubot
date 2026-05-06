'use strict';
require('dotenv').config();

const express      = require('express');
const processAudio = require('./routes/processAudio');

const PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_MB = parseFloat(process.env.MAX_UPLOAD_MB || '5');

const app = express();

// Parse raw WAV bodies on /process-audio
app.use('/process-audio', express.raw({
    type: 'audio/wav',
    limit: `${MAX_MB}mb`,
}));

// JSON body for any other routes
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// AI voice pipeline
app.post('/process-audio', processAudio);

// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found', routes: ['/health', '/process-audio'] });
});

// Global error handler
app.use((err, _req, res, _next) => {
    console.error('[Server] Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Edubot backend listening on port ${PORT}`);
    console.log(`[Server] AssemblyAI: ${process.env.ASSEMBLYAI_API_KEY ? 'configured' : 'MISSING'}`);
    console.log(`[Server] Gemini:     ${process.env.GEMINI_API_KEY     ? 'configured' : 'MISSING'}`);
    console.log(`[Server] ElevenLabs: ${process.env.ELEVENLABS_API_KEY ? 'configured' : 'MISSING'}`);
});
