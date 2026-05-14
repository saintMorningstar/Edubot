/**
 * Transforms AI response text into a kid-friendly, rhythmic style.
 * Rules: max 25 words, short sentences, simple vocabulary, light pauses.
 */

const FILLER_MAP: Record<string, string> = {
    'because':       'so',
    'however':       'but',
    'therefore':     'so',
    'additionally':  'also',
    'furthermore':   'and',
    'nevertheless':  'but',
    'approximately': 'about',
    'immediately':   'right now',
    'understand':    'know',
    'demonstrate':   'show',
    'challenging':   'tricky',
    'excellent':     'great',
    'incorrect':     'not right',
    'correct':       'right',
};

function simplifyVocabulary(text: string): string {
    let result = text;
    for (const [complex, simple] of Object.entries(FILLER_MAP)) {
        result = result.replace(new RegExp(`\\b${complex}\\b`, 'gi'), simple);
    }
    return result;
}

function addPauses(text: string): string {
    // Insert "..." after transition words and before clause breaks
    return text
        .replace(/,\s+/g, '... ')
        .replace(/\.\s+/g, '. ')
        .replace(/([!?])\s+/g, '$1 ');
}

function trimToMaxWords(text: string, maxWords = 25): string {
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) return text;
    // Cut at a sentence boundary if possible
    const truncated = words.slice(0, maxWords).join(' ');
    const lastPunct = Math.max(
        truncated.lastIndexOf('.'),
        truncated.lastIndexOf('!'),
        truncated.lastIndexOf('?'),
    );
    if (lastPunct > truncated.length * 0.5) {
        return truncated.slice(0, lastPunct + 1);
    }
    return truncated + '...';
}

function splitLongSentences(text: string): string {
    // Any sentence > 12 words gets split at a conjunction
    return text.replace(/([^.!?]{50,}?)\s+(and|but|so|because|when|if)\s+/gi, '$1... ');
}

export interface ProcessedText {
    ttsText: string;
    colorRGB: [number, number, number] | null;
}

/**
 * Main entry point. Extracts [COLOR:R,G,B] tags, then applies personality rules.
 */
export function processForTTS(rawText: string): ProcessedText {
    // Extract colour tag
    let colorRGB: [number, number, number] | null = null;
    const colorMatch = rawText.match(/\[COLOR:(\d{1,3}),(\d{1,3}),(\d{1,3})\]/);
    if (colorMatch) {
        colorRGB = [
            parseInt(colorMatch[1], 10),
            parseInt(colorMatch[2], 10),
            parseInt(colorMatch[3], 10),
        ];
    }

    // Strip colour tag
    let text = rawText.replace(/\[COLOR:\d{1,3},\d{1,3},\d{1,3}\]/g, '').trim();

    // Apply transformations
    text = simplifyVocabulary(text);
    text = splitLongSentences(text);
    text = addPauses(text);
    text = trimToMaxWords(text, 25);

    return { ttsText: text, colorRGB };
}
