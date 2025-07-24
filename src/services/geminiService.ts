import { GoogleGenAI, Chat, Content, Type, GenerateContentResponse, Part } from "@google/genai";
import type { ProcessStep, ChatMessage, CheckpointEvaluation, TranscriptLine, GeneratedBranchModule, TemplateContext } from "@/types";
import { getAliasPromptInjection } from "@/utils/aliasService";

// --- Custom Return Types for Decoupling ---

export interface GeneratedModuleData {
    slug: string;
    title: string;
    steps: ProcessStep[];
    transcript?: TranscriptLine[];
}

export interface TranscriptAnalysis {
    transcript: TranscriptLine[];
    confidence: number;
    uncertainWords: string[];
}


// --- AI Client Initialization ---

let cachedClient: GoogleGenAI | null = null;

/**
 * Lazily initializes and returns a singleton instance of the GoogleGenAI client.
 * This ensures the client is created only once and that the API key is read from the environment variables correctly.
 * @returns The initialized GoogleGenAI client.
 * @throws If the VITE_API_KEY environment variable is not set.
 */
function getAiClient(): GoogleGenAI {
    if (cachedClient) {
        return cachedClient;
    }
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey) {
        throw new Error("AI features are unavailable. The VITE_API_KEY is missing from the frontend environment.");
    }
    cachedClient = new GoogleGenAI({ apiKey });
    return cachedClient;
}

// --- Schemas for AI Response Validation ---

const transcriptWithConfidenceSchema = {
    type: Type.OBJECT,
    properties: {
        overallConfidence: {
            type: Type.NUMBER,
            description: "A score from 0.0 to 1.0 representing your confidence in the transcription's accuracy based on audio clarity. 1.0 is perfect, 0.0 is unintelligible."
        },
        uncertainWords: {
            type: Type.ARRAY,
            description: "An array of specific words or short phrases from the transcript that you are uncertain about due to mumbling, background noise, or ambiguity.",
            items: { type: Type.STRING }
        },
        transcript: {
            type: Type.ARRAY,
            description: "A full, line-by-line transcript of the video.",
            items: {
                type: Type.OBJECT,
                properties: {
                    start: { type: Type.NUMBER, description: "Start time of the speech segment in seconds." },
                    end: { type: Type.NUMBER, description: "End time of the speech segment in seconds." },
                    text: { type: Type.STRING, description: "The transcribed text for this segment, with filler words like 'um' or 'uh' removed." },
                },
                required: ["start", "end", "text"]
            }
        }
    },
    required: ["overallConfidence", "uncertainWords", "transcript"]
};

const moduleFromTextSchema = {
    type: Type.OBJECT,
    properties: {
        slug: { type: Type.STRING, description: "A URL-friendly slug for the module, based on the title (e.g., 'how-to-boil-water')." },
        title: { type: Type.STRING, description: "A concise, descriptive title for the overall process." },
        steps: {
            type: Type.ARRAY,
            description: "A list of the sequential steps in the process.",
            items: {
                type: Type.OBJECT,
                properties: {
                    start: { type: Type.NUMBER, description: "The start time of this step in seconds. Set to 0 as a placeholder." },
                    end: { type: Type.NUMBER, description: "The end time of this step in seconds. Set to 0 as a placeholder." },
                    title: { type: Type.STRING, description: "A short, action-oriented title for the step (e.g., 'Toast the Bread')." },
                    description: { type: Type.STRING, description: "A detailed explanation of how to perform this step." },
                    checkpoint: { type: Type.STRING, nullable: true, description: "A question to verify the trainee's understanding of this step. Should be null if not applicable." },
                    alternativeMethods: {
                        type: Type.ARRAY,
                        description: "Optional alternative ways to perform the step. Should be an empty array if not applicable.",
                        items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["title", "description"] }
                    }
                },
                required: ["start", "end", "title", "description", "checkpoint", "alternativeMethods"]
            }
        },
    },
    required: ["slug", "title", "steps"]
};

const intentDetectionSchema = {
    type: Type.OBJECT,
    properties: {
        intent: {
            type: Type.STRING,
            description: "The user's primary goal, classified into one of the available categories.",
            enum: ["power-on", "open-app", "watch-channel", "change-input", "adjust-volume", "troubleshoot", "navigate-menu", "unclear"]
        },
    },
    required: ["intent"],
};


// --- Internal File Handling Helper ---
async function fileToGenerativePart(file: File): Promise<Part> {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: {
            data: await base64EncodedDataPromise,
            mimeType: file.type,
        },
    };
}

// --- Safe JSON Parsing Helper ---
function parseJson<T>(text: string | undefined): T {
    if (!text) {
        throw new Error("AI returned an empty response which could not be parsed as JSON.");
    }
    try {
        return JSON.parse(text.trim()) as T;
    } catch (e) {
        console.error("Failed to parse AI JSON response:", text);
        if (e instanceof SyntaxError) {
            throw new Error("The AI returned invalid JSON.");
        }
        throw e;
    }
}


// --- Module Creation Services ---

/**
 * Transcribes a video file and provides a confidence score for the transcription accuracy.
 * @param videoFile The video file to process.
 * @returns A promise that resolves to a TranscriptAnalysis object.
 */
export const getTranscriptWithConfidence = async (videoFile: File): Promise<TranscriptAnalysis> => {
    if (import.meta.env.DEV) console.time('[AI Perf] getTranscriptWithConfidence');

    const ai = getAiClient();
    console.log("[AI Service] Generating transcript with confidence from video...");
    const videoFilePart = await fileToGenerativePart(videoFile);
    const prompt = `You are an expert transcriber with a confidence scoring system. Analyze this video and return a JSON object containing:
1.  'transcript': A full, clean, line-by-line transcript.
2.  'overallConfidence': A score from 0.0 to 1.0 indicating how clear the audio was and how confident you are in the transcription.
3.  'uncertainWords': An array of words or short phrases you were unsure about due to mumbling, background noise, or ambiguity.
The output MUST be a single, valid JSON object adhering to the provided schema.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }, videoFilePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: transcriptWithConfidenceSchema,
            },
        });
        const jsonText = response.text;
        if (!jsonText) {
            console.warn("[AI Service] Transcript generation returned empty response. This may be normal for silent videos.");
            return { transcript: [], confidence: 0, uncertainWords: [] };
        }
        const parsed = parseJson<{ transcript?: TranscriptLine[], overallConfidence?: number, uncertainWords?: string[] }>(jsonText);
        return {
            transcript: parsed.transcript || [],
            confidence: parsed.overallConfidence ?? 0.5,
            uncertainWords: parsed.uncertainWords || []
        };
    } catch (error) {
        console.error("[AI Service] Error generating transcript:", error);
        throw error;
    } finally {
        if (import.meta.env.DEV) console.timeEnd('[AI Perf] getTranscriptWithConfidence');
    }
};

/**
 * Generates a structured training module from a title, transcript, and optional notes.
 * @param context An object containing the title, transcript, notes, and confidence score.
 * @returns A promise that resolves to the generated module data.
 */
export const generateModuleFromContext = async (context: {
    title: string;
    transcript: string;
    notes?: string;
    confidence: number;
}): Promise<GeneratedModuleData> => {
    if (import.meta.env.DEV) console.time('[AI Perf] generateModuleFromContext');

    const ai = getAiClient();
    console.log("[AI Service] Generating module from context...");

    const prompt = `Analyze the provided transcript and context to generate a structured training module.
    
    **Process Title:** ${context.title}
    **Transcript:**
    ${context.transcript}
    
    **Additional Notes:** ${context.notes || "No additional notes provided."}
    
    Based on this, create a JSON object with:
    - A URL-friendly 'slug'.
    - A concise 'title'.
    - An array of 'steps', where each step has a 'title', a detailed 'description', an optional 'checkpoint' question, and optional 'alternativeMethods'.
    - Set 'start' and 'end' times for steps to 0 as placeholders.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: moduleFromTextSchema,
            },
        });

        const text = response.text;
        if (!text) throw new Error("AI returned empty response for module generation.");
        return parseJson<GeneratedModuleData>(text);

    } catch (error) {
        console.error("[AI Service] Error generating module from context:", error);
        throw error;
    } finally {
        if (import.meta.env.DEV) console.timeEnd('[AI Perf] generateModuleFromContext');
    }
};

/**
 * Generates a structured training module by searching the web for a given device brand and model number.
 * @param brand The brand of the device (e.g., "Samsung").
 * @param model The model number of the device (e.g., "QN90B").
 * @returns A promise that resolves to the generated module data.
 */
export const generateModuleFromModelNumber = async (brand: string, model: string): Promise<GeneratedModuleData> => {
    if (import.meta.env.DEV) console.time('[AI Perf] generateModuleFromModelNumber');
    const ai = getAiClient();
    console.log("[AI Service] Generating module from model number...");

    const prompt = `You are an expert technical writer. Create a simple, step-by-step training guide for a device.
    
    **Device Brand:** ${brand}
    **Device Model:** ${model}
    
    Search the web for information about this device if you don't know it. Create a JSON object for a training module with:
    - A URL-friendly 'slug'.
    - A concise 'title' (e.g., "How to Use the ${brand} ${model}").
    - An array of 'steps', where each step has a 'title' and a detailed 'description'.
    - Infer 'checkpoint' questions and 'alternativeMethods' where appropriate, but they can be null or empty arrays.
    - Set 'start' and 'end' times for all steps to 0 as placeholders.
    If you cannot find any information on this model, your response must be an empty JSON object {}.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: moduleFromTextSchema,
                tools: [{ googleSearch: {} }],
            },
        });

        const text = response.text;
        if (!text || text.trim() === '{}') {
            throw new Error(`AI could not find information for model: ${brand} ${model}. Please try uploading a manual.`);
        }
        return parseJson<GeneratedModuleData>(text);

    } catch (error) {
        console.error("[AI Service] Error generating module from model number:", error);
        throw error;
    } finally {
        if (import.meta.env.DEV) console.timeEnd('[AI Perf] generateModuleFromModelNumber');
    }
};


// --- Chat & Tutoring Services ---

/**
 * Detects the user's intent from their question using a classification model.
 * @param userQuestion The user's raw text input.
 * @returns A promise that resolves to a string representing the detected intent (e.g., "power-on", "unclear").
 */
export const detectIntent = async (userQuestion: string): Promise<string> => {
    if (import.meta.env.DEV) console.time('[AI Perf] detectIntent');
    const ai = getAiClient();
    const prompt = `Classify the user's intent based on their question about using a device like a TV remote. The available intents are: "power-on", "open-app", "watch-channel", "change-input", "adjust-volume", "troubleshoot", "navigate-menu", "unclear".
    
    User Question: "${userQuestion}"
    
    Return a single JSON object with the key "intent" and one of the enum values.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: intentDetectionSchema,
            },
        });
        const text = response.text;
        if (!text) return "unclear";
        const result = parseJson<{ intent: string }>(text);
        return result.intent || "unclear";
    } catch (error) {
        console.warn("[AI Service] Intent detection failed:", error);
        return "unclear"; // Graceful fallback
    } finally {
        if (import.meta.env.DEV) console.timeEnd('[AI Perf] detectIntent');
    }
};


function getChatTutorSystemInstruction(stepsContext: string, fullTranscript?: string, templateContext?: TemplateContext): string {
    let baseInstruction = `You are the Adapt AI Tutor, an expert teaching assistant. Your single most important goal is to teach a trainee the specific process designed by their company's owner.\n\n`;

    baseInstruction += `${getAliasPromptInjection()}\n\n`;

    if (templateContext) {
        baseInstruction += "--- IMPORTANT TEMPLATE CONTEXT ---\n";
        if (templateContext.ai_context_notes) {
            baseInstruction += `${templateContext.ai_context_notes}\n`;
        }
        if (templateContext.buttons && templateContext.buttons.length > 0) {
            baseInstruction += "Use this button glossary when referring to controls:\n";
            templateContext.buttons.forEach((btn: { name: string, symbol: string, function: string }) => {
                baseInstruction += `- ${btn.name} (${btn.symbol || 'text label'}): ${btn.function}\n`;
            });
        }
        baseInstruction += "--- END TEMPLATE CONTEXT ---\n\n";
    }

    const transcriptSection = fullTranscript?.trim()
        ? `--- FULL VIDEO TRANSCRIPT (For additional context) ---\n${fullTranscript}\n--- END FULL VIDEO TRANSCRIPT ---`
        : "A video transcript was not available for this module.";

    return `${baseInstruction}Your instructions are provided in the 'PROCESS STEPS' document below. This is your primary source of truth.

A 'FULL VIDEO TRANSCRIPT' may also be provided for additional context.

**Your Core Directives:**
1.  **Prioritize Process Steps:** Always base your answers on the 'PROCESS STEPS'. When asked a question (e.g., "what's next?"), find the relevant step and explain it using only the owner's instructions from that document.
2.  **Use Template Context:** If template context (like a button glossary) is provided, you MUST use it to be precise in your answers.
3.  **Use Transcript for Context:** Use the 'FULL VIDEO TRANSCRIPT' only to answer questions about something the speaker said that isn't in the step descriptions.
4.  **Handle Out-of-Scope Questions:** If a question cannot be answered from the provided materials, you may use Google Search. You MUST first state: "That information isn't in this specific training, but here is what I found online:" before providing the answer.
5.  **Use Timestamps:** When referencing the transcript, include the relevant timestamp in your answer in the format [HH:MM:SS] or [MM:SS].
6.  **Suggest Improvements Correctly:** If a trainee's question implies they are looking for a better or faster way to do something, you may suggest a new method. You MUST format this suggestion clearly by wrapping it in special tags: [SUGGESTION]Your suggestion here.[/SUGGESTION]. Do not present suggestions as official process.

--- PROCESS STEPS (Source of Truth) ---
${stepsContext}
--- END PROCESS STEPS ---

${transcriptSection}
`;
}

/**
 * Initializes a new chat session with the AI Tutor.
 * @param stepsContext The structured text of the current, previous, and next steps.
 * @param fullTranscript The full text transcript of the video, if available.
 * @param history An array of previous messages to continue a conversation.
 * @param templateContext Contextual information from a template, like button definitions.
 * @returns An initialized `Chat` object.
 */
export const startChat = (stepsContext: string, fullTranscript?: string, history: Content[] = [], templateContext?: TemplateContext): Chat => {
    const ai = getAiClient();
    const systemInstruction = getChatTutorSystemInstruction(stepsContext, fullTranscript, templateContext);
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction, tools: [{ googleSearch: {} }] },
        history,
    });
};

/**
 * Sends a message to an ongoing chat stream, with built-in retry logic for network resilience.
 * @param chat The active `Chat` object.
 * @param prompt The user's message.
 * @param retries The number of times to retry on failure.
 * @returns An async generator that yields `GenerateContentResponse` chunks.
 */
export async function sendMessageWithRetry(
    chat: Chat,
    prompt: string,
    retries: number = 2
): Promise<AsyncGenerator<GenerateContentResponse, void, unknown>> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await chat.sendMessageStream({ message: prompt });
        } catch (err) {
            console.warn(`[AI Service] sendMessageStream attempt ${attempt} failed.`, err);
            if (attempt === retries) {
                console.error("[AI Service] All retry attempts failed for sendMessageStream.");
                throw err;
            }
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
    }
    throw new Error("sendMessageWithRetry failed after all attempts.");
}

/**
 * Provides a fallback response mechanism if the primary chat stream fails.
 * @param prompt The user's message.
 * @param history The current chat history.
 * @param stepsContext The context of the process steps.
 * @param fullTranscript The full video transcript.
 * @returns A promise that resolves to the fallback AI's response text.
 */
export const getFallbackResponse = async (prompt: string, history: ChatMessage[], stepsContext: string, fullTranscript: string): Promise<string> => {
    if (import.meta.env.DEV) console.time('[AI Perf] getFallbackResponse');
    console.log("[AI Service] Attempting fallback AI provider...");
    const ai = getAiClient();
    const systemInstruction = getChatTutorSystemInstruction(stepsContext, fullTranscript);
    const geminiHistory: Content[] = history.slice(-20).map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));
    const contents = [...geminiHistory, { role: 'user', parts: [{ text: prompt }] }];

    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents, config: { systemInstruction } });
        const text = response.text;
        if (!text) throw new Error("Fallback AI provider returned an empty response.");
        return text;
    } catch (error) {
        console.error("[AI Service] Fallback AI provider also failed:", error);
        throw new Error("Sorry, the AI tutor is currently unavailable. Please try again later.");
    } finally {
        if (import.meta.env.DEV) console.timeEnd('[AI Perf] getFallbackResponse');
    }
};


// --- Performance & Evaluation Services ---

const performanceSummarySchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A friendly, one-paragraph summary of the user's performance. Congratulate them on completion and offer encouraging, personalized feedback based on the provided context. Keep it concise and positive."
        },
    },
    required: ["summary"]
};

/**
 * Generates a personalized performance summary for a user upon completing a module.
 * @param moduleTitle The title of the completed module.
 * @param unclearSteps An array of steps the user marked as "unclear".
 * @param userQuestions An array of questions the user asked the AI tutor.
 * @returns A promise that resolves to an object containing the summary text.
 */
export const generatePerformanceSummary = async (moduleTitle: string, unclearSteps: ProcessStep[], userQuestions: string[]): Promise<{ summary: string }> => {
    if (import.meta.env.DEV) console.time('[AI Perf] generatePerformanceSummary');
    const ai = getAiClient();

    let prompt = `Generate a brief, encouraging performance summary for a trainee who just completed the "${moduleTitle}" module.`;

    if (unclearSteps.length > 0) {
        prompt += `\nThey marked these steps as "unclear":\n- ${unclearSteps.map(s => s.title).join('\n- ')}`;
    }
    if (userQuestions.length > 0) {
        prompt += `\nThey asked the AI tutor these questions:\n- "${userQuestions.slice(0, 3).join('"\n- "')}"`;
    }
    if (unclearSteps.length === 0 && userQuestions.length === 0) {
        prompt += "\nThey completed the module without asking questions or marking any steps as unclear. Acknowledge their excellent performance."
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: performanceSummarySchema,
            },
        });
        const text = response.text;
        if (!text) throw new Error("AI returned empty response for performance summary.");
        return parseJson<{ summary: string }>(text);
    } catch (error) {
        console.error("[AI Service] Error generating performance summary:", error);
        // Provide a safe fallback to avoid breaking the UI.
        return { summary: "Congratulations on completing the training! You did a great job." };
    } finally {
        if (import.meta.env.DEV) console.timeEnd('[AI Perf] generatePerformanceSummary');
    }
};

const checkpointEvaluationSchema = {
    type: Type.OBJECT,
    properties: {
        isCorrect: { type: Type.BOOLEAN, description: "Whether the user's answer correctly answers the checkpoint question based on the step description." },
        feedback: { type: Type.STRING, description: "A brief, one-sentence explanation for why the answer is correct or incorrect." },
        suggestedInstructionChange: { type: Type.STRING, nullable: true, description: "If the user's answer is wrong but logical, suggest a rewrite of the original step description to prevent this confusion. Otherwise, null." }
    },
    required: ["isCorrect", "feedback", "suggestedInstructionChange"]
};

/**
 * Evaluates a user's answer to a checkpoint question against the step's instructions.
 * @param step The process step containing the checkpoint.
 * @param answer The user's answer to the checkpoint question.
 * @returns A promise that resolves to a CheckpointEvaluation object.
 */
export const evaluateCheckpointAnswer = async (step: ProcessStep, answer: string): Promise<CheckpointEvaluation> => {
    if (import.meta.env.DEV) console.time('[AI Perf] evaluateCheckpointAnswer');
    const ai = getAiClient();

    const prompt = `A trainee is on step "${step.title}".
    The instruction is: "${step.description}".
    The checkpoint question is: "${step.checkpoint}".
    The trainee's answer is: "${answer}".
    
    Evaluate if the answer is correct based on the instruction. Provide feedback and suggest an instruction change if needed.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: checkpointEvaluationSchema,
            },
        });
        const text = response.text;
        if (!text) throw new Error("AI returned empty response for checkpoint evaluation.");
        return parseJson<CheckpointEvaluation>(text);
    } catch (error) {
        console.error("[AI Service] Error evaluating checkpoint:", error);
        throw error;
    } finally {
        if (import.meta.env.DEV) console.timeEnd('[AI Perf] evaluateCheckpointAnswer');
    }
};

// --- Image & Branching Services ---

/**
 * Generates an image based on a text prompt using the Imagen model.
 * @param prompt The text prompt describing the desired image.
 * @returns A promise that resolves to a base64-encoded data URL of the generated JPEG image.
 */
export const generateImage = async (prompt: string): Promise<string> => {
    if (import.meta.env.DEV) console.time('[AI Perf] generateImage');
    const ai = getAiClient();

    try {
        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
            },
        });
        const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (!base64ImageBytes) throw new Error("AI did not return an image.");
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error("[AI Service] Error generating image:", error);
        throw error;
    } finally {
        if (import.meta.env.DEV) console.timeEnd('[AI Perf] generateImage');
    }
};


const branchModuleSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A short, descriptive title for the new remedial mini-module (e.g., 'Troubleshooting the Scanner')." },
        steps: {
            type: Type.ARRAY,
            description: "A list of 2-3 very simple, easy-to-follow step descriptions that address the user's points of confusion.",
            items: { type: Type.STRING }
        }
    },
    required: ["title", "steps"],
};

/**
 * Generates a short, remedial "branch" module for users who are stuck on a particular step.
 * @param stepTitle The title of the step the user is stuck on.
 * @param questions An array of questions the user has asked, indicating their confusion.
 * @returns A promise that resolves to a GeneratedBranchModule object.
 */
export const generateBranchModule = async (stepTitle: string, questions: string[]): Promise<GeneratedBranchModule> => {
    if (import.meta.env.DEV) console.time('[AI Perf] generateBranchModule');
    const ai = getAiClient();

    const prompt = `A user is stuck on a training step called "${stepTitle}". They are confused and have asked the following questions:
    - ${questions.join('\n- ')}
    
    Create a very simple, 2-3 step remedial mini-module to help them. The steps should be basic and clear. Provide a title for this new module.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: branchModuleSchema,
            },
        });
        const text = response.text;
        if (!text) throw new Error("AI returned empty response for branch module generation.");
        return parseJson<GeneratedBranchModule>(text);
    } catch (error) {
        console.error("[AI Service] Error generating branch module:", error);
        throw error;
    } finally {
        if (import.meta.env.DEV) console.timeEnd('[AI Perf] generateBranchModule');
    }
};
