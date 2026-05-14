import * as SecureStore from 'expo-secure-store';

const KEYS = {
    ELEVENLABS: 'edubot_elevenlabs_key',
    GROQ:       'edubot_groq_key',
    GEMINI:     'edubot_gemini_key',
} as const;

type KeyName = keyof typeof KEYS;

export async function saveApiKey(name: KeyName, value: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS[name], value);
}

export async function getApiKey(name: KeyName): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS[name]);
}

export async function deleteApiKey(name: KeyName): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS[name]);
}

export async function hasApiKey(name: KeyName): Promise<boolean> {
    const val = await SecureStore.getItemAsync(KEYS[name]);
    return val !== null && val.length > 0;
}
