import { getVoiceIdForCharacter } from '@/utils/voiceMap';
import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';


// Cache to store generated audio blob URLs. The key is a composite of voiceId and text.
const MAX_CACHE_SIZE = 50; // A reasonable limit to prevent unbounded memory usage.
const audioCache = new Map<string, string>();

// Keep track of the currently playing audio element to allow for interruption.
let currentAudio: HTMLAudioElement | null = null;

// Use the httpsCallable function to securely call our backend function.
const _generateSpeechFn = httpsCallable<{ text: string, voiceId: string }, { audioContent: string }>(functions, 'generateSpeech');

/**
 * Plays an audio file from a given URL.
 * @param url The URL of the audio file to play (can be a blob URL).
 * @returns A promise that resolves when the audio has finished playing or an error occurs.
 */
const playAudio = (url: string): Promise<void> => {
    return new Promise((resolve) => {
        // Stop any currently playing audio before starting a new one.
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
            currentAudio = null;
        }

        const audio = new Audio(url);
        currentAudio = audio;

        const cleanup = () => {
            if (currentAudio === audio) {
                currentAudio = null;
            }
            resolve();
        };

        audio.onended = cleanup;
        audio.onerror = (err) => {
            console.error('Audio playback error:', err);
            cleanup();
        };
        audio.onpause = cleanup;

        audio.play().catch(err => {
            console.error("Failed to play audio:", err);
            cleanup();
        });
    });
};

/**
 * Fallback function that uses the browser's native Web Speech API.
 * This is used if the primary TTS service fails.
 * @param text The text to speak.
 * @returns A promise that resolves when speech is finished.
 */
const speakWithFallbackApi = (text: string): Promise<void> => {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) {
            console.warn("Browser does not support Speech Synthesis.");
            resolve();
            return;
        }

        // Cancel any native speech that might be ongoing.
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => resolve();
        utterance.onerror = (event) => {
            console.error("Native SpeechSynthesis Error", event);
            resolve();
        };

        window.speechSynthesis.speak(utterance);
    });
};


/**
 * Speaks the given text using a high-quality TTS API via a secure Firebase Function, with caching.
 * If the API fails, it gracefully falls back to the browser's native speech synthesis.
 * @param text The text to be spoken.
 * @param character The persona to use for the voice (e.g., 'system', 'coach'). Defaults to 'system'.
 * @returns A promise that resolves when speech has finished.
 */
export async function speak(text: string, character: string = 'system'): Promise<void> {
    const voiceId = getVoiceIdForCharacter(character);
    const cacheKey = `${voiceId}-${text}`;

    // 1. Check cache first for immediate playback.
    if (audioCache.has(cacheKey)) {
        const audioUrl = audioCache.get(cacheKey);
        if (audioUrl) {
            return playAudio(audioUrl);
        }
    }

    // 2. Fetch from high-quality TTS API via Firebase Function.
    try {
        const result = await _generateSpeechFn({ text, voiceId });
        const { audioContent: base64Audio } = result.data;

        if (!base64Audio) {
            throw new Error("TTS function returned no audio content.");
        }

        // Convert base64 string to a Blob URL
        const fetchResponse = await fetch(`data:audio/mpeg;base64,${base64Audio}`);
        if (!fetchResponse.ok) {
            throw new Error('Failed to convert base64 audio to Blob.');
        }
        const blob = await fetchResponse.blob();
        const audioUrl = URL.createObjectURL(blob);

        // --- Cache Management ---
        if (audioCache.size >= MAX_CACHE_SIZE) {
            const oldestKey = audioCache.keys().next().value;
            if (oldestKey) {
                const urlToRevoke = audioCache.get(oldestKey);
                if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
                audioCache.delete(oldestKey);
            }
        }
        audioCache.set(cacheKey, audioUrl);

        return playAudio(audioUrl);

    } catch (err) {
        // 3. Graceful fallback to browser's native TTS.
        console.warn(`High-quality TTS failed: ${err instanceof Error ? err.message : 'Unknown error'}. Falling back to native speech.`);
        return speakWithFallbackApi(text);
    }
}

/**
 * Cancels any ongoing speech, whether from the custom audio player or the native API.
 */
export const cancel = () => {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
        currentAudio = null;
    }
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
};
