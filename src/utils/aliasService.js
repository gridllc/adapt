/**
 * 📦 ADAPTIVE ALIAS LEARNING: UTILITY SERVICE
 * Goal: Detect user-created button nicknames (e.g. "circle thingy") and use them to improve AI tutoring across all remotes.
 */
// A simple, expandable map for common user phrases.
// In a production system, this could be loaded from a database.
export const buttonAliasMap = {
    "circle thingy": "Navigation Ring",
    "red button": "Power",
    "house icon": "Home Button",
    "arrow circle": "Back Button",
    "center dot": "Select Button",
    "talk button": "Voice / Mic Button",
    "menu lines": "Menu Button",
    "sound bar": "Volume Control",
};
/**
 * Scans a user's question for known aliases and returns the formal button names.
 * @param userQuestion The raw text input from the user.
 * @returns An array of detected alias objects.
 */
export function detectAliases(userQuestion) {
    const matches = [];
    const lowerCaseQuestion = userQuestion.toLowerCase();
    for (const phrase in buttonAliasMap) {
        if (lowerCaseQuestion.includes(phrase)) {
            matches.push({
                alias: phrase,
                formalName: buttonAliasMap[phrase]
            });
        }
    }
    // Return unique values based on the alias phrase
    return [...new Map(matches.map(item => [item.alias, item])).values()];
}
/**
 * Creates a string to prepend to the AI's system prompt, pre-training it on common aliases.
 * @returns A formatted string of examples.
 */
export function getAliasPromptInjection() {
    return `To better understand trainees, here are examples of informal phrases they might use and their formal meanings:
- "Circle thingy" refers to the Navigation Ring.
- "Red button" is the Power button.
- "House icon" means the Home button.
Please use this context to interpret user questions more accurately.`;
}
//# sourceMappingURL=aliasService.js.map