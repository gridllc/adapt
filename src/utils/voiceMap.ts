/**
 * A centralized mapping of character personas to their corresponding
 * voice names for Google Cloud Text-to-Speech.
 * This makes it easy to update or change voices across the application.
 */
const VOICE_MAP: Record<string, string> = {
    // A standard, clear narrator voice for system instructions. (Male)
    system: 'en-US-Wavenet-D',
    // A more engaging, friendly voice for the AI coach. (Female)
    coach: 'en-US-Wavenet-F',
    // A formal, studio-quality voice (Male)
    stephen: 'en-US-Studio-M',
    // A clear, news-caster style voice (Female)
    sunny: 'en-US-News-K',
    // A standard, pleasant voice (Female)
    janice: 'en-US-Standard-E',
    // Default fallback voice if no character is specified.
    default: 'en-US-Wavenet-D',
};

/**
 * Retrieves the voice name for a given character.
 * @param {string} [character='default'] - The character persona (e.g., 'coach', 'system').
 * @returns {string} The corresponding voice name for Google Cloud TTS.
 */
export const getVoiceIdForCharacter = (character: string = 'default'): string => {
    return VOICE_MAP[character.toLowerCase()] || VOICE_MAP.default;
};