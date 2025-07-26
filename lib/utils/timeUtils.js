"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTimestamp = void 0;
const parseTimestamp = (text) => {
    const match = text.match(/(?:\[|\()?(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\]|\))?/);
    if (match) {
        const hours = match[3] ? parseInt(match[1]) : 0;
        const minutes = match[3] ? parseInt(match[2]) : parseInt(match[1]);
        const seconds = match[3] ? parseInt(match[3]) : parseInt(match[2]);
        return hours * 3600 + minutes * 60 + seconds;
    }
    return null;
};
exports.parseTimestamp = parseTimestamp;
