import type { AIFeedbackLog, SimilarFix } from '@/types';

// --- Tagline Management ---

const TAGLINES = [
    "If that fixed it, I get one step closer to world domination. Let me know!",
    "Let me know if it worked. I collect success stories.",
    "Still blinking? I'm not panicking—you are.",
    "I get bonus treats if I'm right. 🐶",
    "Hope that helps. If not, we can blame the cosmic rays.",
    "Is it working now? Asking for a friend... who is also me.",
    "Did that work? Be honest. I’m trying to win Employee of the Month.",
    "Let me know if it helped — I get bonus points when I nail it.",
    "If it didn't work, tell me what did. I won’t cry. Probably.",
];

let usedTaglines = new Set<string>();

/**
 * Returns a random, witty tagline that hasn't been used in the current session.
 * Resets when all taglines have been used.
 * @returns A string containing a tagline.
 */
export const getTagline = (): string => {
    if (usedTaglines.size >= TAGLINES.length) {
        usedTaglines.clear(); // Reset for the next round
    }
    const availableTaglines = TAGLINES.filter(t => !usedTaglines.has(t));
    const selected = availableTaglines[Math.floor(Math.random() * availableTaglines.length)];
    usedTaglines.add(selected);
    return selected;
};

const CELEBRATORY_TAGLINES = [
    "Boom! Nailed it. 😎 Thanks for confirming.",
    "Great! I'll remember that for next time someone runs into this.",
    "Excellent! My AI circuits are buzzing with joy.",
    "Perfect! Another problem solved.",
];

/**
 * Returns a random celebratory tagline.
 * @returns A string containing a celebratory tagline.
 */
export const getCelebratoryTagline = (): string => {
    return CELEBRATORY_TAGLINES[Math.floor(Math.random() * CELEBRATORY_TAGLINES.length)];
}


// --- Prompt Construction ---

/**
 * Constructs a detailed prompt for the Live Coach AI based on the user's situation and past feedback.
 * @param stepTitle The title of the current step.
 * @param requiredItems The items required for the current step.
 * @param contextType The type of help needed ('hint', 'correction', 'query').
 * @param pastFeedback An array of past feedback logs for this step.
 * @param similarFixes An array of successful fixes from other users for similar problems.
 * @param userQuery The user's specific question, if applicable.
 * @returns A detailed prompt string to be sent to the AI.
 */
export const getPromptContextForLiveCoach = (
    stepTitle: string,
    requiredItems: string[],
    contextType: 'hint' | 'correction' | 'query',
    pastFeedback: AIFeedbackLog[],
    similarFixes: SimilarFix[],
    userQuery?: string
): string => {

    let prompt = `The user is on step "${stepTitle}".\n`;
    if (requiredItems.length > 0) {
        prompt += `This step requires a "${requiredItems.join(', ')}".\n`;
    }

    // --- Collective Intelligence: Incorporate Similar Past Fixes ---
    if (similarFixes.length > 0) {
        prompt += "\n--- INSIGHTS FROM PAST TRAINEES ---\n";
        similarFixes.forEach(fix => {
            prompt += `- When a similar issue occurred, another trainee found this solution worked: "${fix.userFixText}". Prioritize this insight.\n`;
        });
        prompt += "--- END INSIGHTS ---\n\n";
    }

    // --- Direct Feedback: Incorporate direct feedback from this session ---
    if (pastFeedback.length > 0) {
        prompt += "\n--- PREVIOUS FEEDBACK FOR THIS STEP (This Session) ---\n";
        pastFeedback.forEach(log => {
            prompt += `- Previously, I said: "${log.aiResponse}"\n- The user said this was: ${log.feedback}\n`;
            if (log.userFixText) {
                prompt += `- The correct action was: "${log.userFixText}"\n`;
            }
        });
        prompt += "--- AVOID REPEATING FAILED SUGGESTIONS ---\n\n";
    }

    // --- Define the current task based on the context type ---
    switch (contextType) {
        case 'hint':
            prompt += `The user seems stuck. Based on everything you know, provide a short, one-sentence hint to get them moving again.`;
            break;
        case 'correction':
            prompt += `The user has made a mistake. Based on their action "${userQuery || ''}", provide a clear, concise correction.`;
            break;
        case 'query':
            prompt += `The user asked: "${userQuery || '...'}"\n\nBased on all context, answer the user's question directly.`;
            break;
    }

    return prompt;
};
