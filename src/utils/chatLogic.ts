export const RETRY_PHRASES = [
    "say that again",
    "it didn't work",
    "still not working",
    "i'm confused",
    "try again",
    "can you repeat that",
    "that's not right",
    "that is not right",
    "that didn't help",
];

export const isRetryMessage = (input: string): boolean => {
    const lowerInput = input.toLowerCase().trim();
    if (!lowerInput) return false;
    return RETRY_PHRASES.some(phrase => lowerInput.includes(phrase));
};
