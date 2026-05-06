'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_INSTRUCTION =
    'You are Edubot, a fun and friendly robot for children aged 3 to 5 years old. ' +
    'Always use very simple words and very short sentences (1-3 sentences max). ' +
    'Be playful, warm, and encouraging. Add excitement with exclamation marks. ' +
    'Never use complex vocabulary. If you do not understand, ask the child to repeat ' +
    'in a fun, gentle way. Keep responses under 30 words.';

let _model = null;

function getModel() {
    if (!_model) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

        const genAI = new GoogleGenerativeAI(apiKey);
        _model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: SYSTEM_INSTRUCTION,
            generationConfig: {
                maxOutputTokens: 80,
                temperature: 0.9,
                topP: 0.95,
            },
        });
    }
    return _model;
}

/**
 * Generate a child-friendly response to the child's message.
 * @param {string} userText - transcribed speech from child
 * @returns {Promise<string>} Edubot's response
 */
async function generateResponse(userText) {
    const model  = getModel();
    const result = await model.generateContent(userText);
    const text   = result.response.text().trim();

    if (!text) throw new Error('Gemini returned empty response');
    return text;
}

module.exports = { generateResponse };
