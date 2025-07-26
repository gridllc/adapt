"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRetryMessage = exports.RETRY_PHRASES = void 0;
exports.RETRY_PHRASES = [
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
const isRetryMessage = (input) => {
    const lowerInput = input.toLowerCase().trim();
    if (!lowerInput)
        return false;
    return exports.RETRY_PHRASES.some(phrase => lowerInput.includes(phrase));
};
exports.isRetryMessage = isRetryMessage;
