import { getApiKey } from '../utils/secureKeyStore';

const GROQ_BASE = 'https://api.groq.com/openai/v1';

// ─── STT — Groq Whisper ───────────────────────────────────────────────────────
export async function transcribeAudio(wavBuffer: ArrayBuffer): Promise<string> {
    const apiKey = await getApiKey('GROQ');
    if (!apiKey) throw new Error('Groq API key not configured');

    const formData = new FormData();
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    formData.append('file', blob as File, 'recording.wav');
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'en');
    formData.append('response_format', 'json');

    const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Groq STT error ${res.status}: ${err}`);
    }

    const json = await res.json();
    return (json.text as string).trim();
}

// ─── LLM — Groq Llama ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Edubot, a friendly robot assistant for children aged 3–6.
Keep answers under 25 words. Use simple, encouraging language.
If the topic is interesting, add [COLOR:R,G,B] at the end to light up the robot.
Examples: happy = [COLOR:0,255,0], excited = [COLOR:255,165,0], calm = [COLOR:0,150,255].`;

export async function generateResponse(userText: string): Promise<string> {
    const apiKey = await getApiKey('GROQ');
    if (!apiKey) throw new Error('Groq API key not configured');

    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
                { role: 'system',  content: SYSTEM_PROMPT },
                { role: 'user',    content: userText },
            ],
            max_tokens: 80,
            temperature: 0.7,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Groq LLM error ${res.status}: ${err}`);
    }

    const json = await res.json();
    return (json.choices[0].message.content as string).trim();
}
