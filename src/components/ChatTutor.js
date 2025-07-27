import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startChat, getFallbackResponse, generateImage, sendMessageWithRetry, detectIntent } from '@/services/geminiService';
import { getRoutineForIntent } from '@/services/routineService';
import * as ttsService from '@/services/ttsService';
import { getChatHistory, saveChatMessage, updateMessageFeedback } from '@/services/chatService';
import { findSimilarInteractions, logTutorInteraction } from '@/services/tutorLogService';
import { flagQuestion } from '@/services/flaggingService';
import { chatReducer, initialChatState } from '@/reducers/chatReducer';
import { SendIcon, UserIcon, LinkIcon, SpeakerOnIcon, SpeakerOffIcon, LightbulbIcon, DownloadIcon, MessageSquareIcon, XIcon, CheckCircleIcon, SparklesIcon, ClockIcon, AlertTriangleIcon, DatabaseIcon, ThumbsUpIcon, ThumbsDownIcon, LoaderIcon } from './Icons';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { detectAliases } from '@/utils/aliasService';
import { isRetryMessage } from '@/utils/chatLogic';
import { parseTimestamp } from '@/utils/timeUtils';
export const ChatTutor = ({ moduleId, sessionToken, stepsContext, fullTranscript, onTimestampClick, currentStepIndex, steps, onClose, initialPrompt, isDebug = false, templateContext, onSuggestionProposed, submittedSuggestions }) => {
    const queryClient = useQueryClient();
    const chatHistoryQueryKey = ['chatHistory', moduleId, sessionToken];
    const { addToast } = useToast();
    const { user } = useAuth();
    const [state, dispatch] = useReducer(chatReducer, initialChatState);
    const { messages, input, isLoading, error } = state;
    const { data: initialMessages = [], isLoading: isLoadingHistory } = useQuery({
        queryKey: chatHistoryQueryKey,
        queryFn: () => getChatHistory(moduleId, sessionToken),
        enabled: !!moduleId && !!sessionToken,
    });
    const [isAutoSpeakEnabled, setIsAutoSpeakEnabled] = useState(false);
    const [isMemoryEnabled, setIsMemoryEnabled] = useState(true);
    const [showTimestamps, setShowTimestamps] = useState(true);
    const [flaggedMessageIds, setFlaggedMessageIds] = useState({});
    const [expandedMessages, setExpandedMessages] = useState({});
    const chatRef = useRef(null);
    const messagesEndRef = useRef(null);
    const generateId = () => crypto.randomUUID();
    const { mutate: persistMessage } = useMutation({
        mutationFn: (message) => saveChatMessage(moduleId, sessionToken, message),
        onError: (err) => {
            console.error("Failed to save message:", err);
            addToast('error', 'Sync Failed', 'Failed to save message. Your conversation may not be persisted.');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: chatHistoryQueryKey });
        }
    });
    const { mutate: sendFeedback } = useMutation({
        mutationFn: ({ messageId, feedback }) => updateMessageFeedback(messageId, feedback),
        onSuccess: (_, variables) => {
            const updatedMessages = messages.map((msg) => msg.id === variables.messageId ? { ...msg, feedback: variables.feedback } : msg);
            dispatch({ type: 'SET_MESSAGES', payload: updatedMessages });
            addToast('success', 'Feedback Received', 'Thank you for helping improve the AI.');
            if (variables.feedback === 'good') {
                const messageIndex = updatedMessages.findIndex((msg) => msg.id === variables.messageId);
                if (messageIndex > 0) {
                    const aiMessage = updatedMessages[messageIndex];
                    const userMessage = updatedMessages[messageIndex - 1];
                    if (aiMessage.role === 'model' && userMessage.role === 'user' && !flaggedMessageIds[aiMessage.id]) {
                        addToast('info', 'Helpful Answer?', 'Would you like to submit this answer to the owner as a good example?', {
                            duration: 10000,
                            action: {
                                label: 'Submit Example',
                                onClick: () => {
                                    flagResponseForReview({ userQuestion: userMessage.text, aiResponse: aiMessage.text });
                                    setFlaggedMessageIds(prev => ({ ...prev, [aiMessage.id]: true }));
                                }
                            }
                        });
                    }
                }
            }
        },
        onError: (err) => {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            addToast('error', 'Feedback Failed', `Could not save your feedback: ${errorMessage}`);
        },
    });
    const { mutate: flagResponseForReview } = useMutation({
        mutationFn: (data) => {
            if (!user)
                throw new Error("Authentication is required to flag responses.");
            return flagQuestion({
                module_id: moduleId,
                step_index: currentStepIndex,
                user_question: data.userQuestion,
                tutor_response: data.aiResponse,
                user_id: user.uid
            });
        },
        onSuccess: () => {
            addToast('success', 'Submitted for Review', 'This conversation has been flagged for the module owner.');
            queryClient.invalidateQueries({ queryKey: ['flaggedQuestions', moduleId] });
        },
        onError: (err) => {
            addToast('error', 'Submission Failed', err instanceof Error ? err.message : "Could not flag the response.");
        }
    });
    useEffect(() => {
        dispatch({ type: 'SET_MESSAGES', payload: initialMessages });
    }, [initialMessages]);
    useEffect(() => {
        return () => ttsService.cancel();
    }, []);
    useEffect(() => {
        if (!stepsContext || isLoadingHistory)
            return;
        const textBasedHistory = initialMessages.filter((msg) => msg.text.trim() !== '' && !msg.isLoading);
        const geminiHistory = textBasedHistory.map((msg) => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));
        try {
            chatRef.current = startChat(stepsContext, fullTranscript, geminiHistory, templateContext);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Could not start AI chat.';
            addToast('error', 'Initialization Failed', errorMessage);
        }
    }, [stepsContext, fullTranscript, initialMessages, isLoadingHistory, addToast, templateContext]);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);
    const enrichPromptIfNeeded = useCallback((prompt) => {
        const vagueQueryRegex = /\bdid i do this (right|correctly|okay)\??/i;
        if (vagueQueryRegex.test(prompt.trim()) && steps?.[currentStepIndex]) {
            const step = steps[currentStepIndex];
            return `The user is on step ${currentStepIndex + 1}: "${step.title}". Their question is: "${prompt}". Based on the process instructions for this step, please confirm if they are likely doing it correctly and guide them on what to do next.`;
        }
        return prompt;
    }, [currentStepIndex, steps]);
    const sendMessage = useCallback(async (promptText, options = {}) => {
        const trimmedInput = promptText.trim();
        if (!trimmedInput || isLoading || !chatRef.current)
            return;
        ttsService.cancel();
        const userMessage = { id: generateId(), role: 'user', text: trimmedInput };
        dispatch({ type: 'ADD_MESSAGES', payload: [userMessage] });
        persistMessage(userMessage);
        const handleRoutineResponse = async (routine, intent) => {
            dispatch({ type: 'START_MESSAGE' });
            const routineText = `Here's the routine for "${routine.intent}":\n\n${routine.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
            const routineMessage = { id: generateId(), role: 'model', text: routineText, isLoading: false, isRoutine: true };
            dispatch({ type: 'ADD_MESSAGES', payload: [routineMessage] });
            dispatch({ type: 'MESSAGE_COMPLETE', payload: { messageId: '', finalMessage: routineMessage } }); // just to set isLoading to false
            persistMessage(routineMessage);
            logTutorInteraction({
                moduleId: moduleId, stepIndex: currentStepIndex, userQuestion: trimmedInput,
                tutorResponse: `Routine for ${intent}`, templateId: templateContext?.templateId, stepTitle: intent,
                remoteType: "ai-routine", aliases: [],
            });
            if (isAutoSpeakEnabled) {
                try {
                    await ttsService.speak(routineText);
                }
                catch (e) {
                    console.warn("TTS failed for routine", e);
                }
            }
        };
        const handleRetry = async () => {
            dispatch({ type: 'START_MESSAGE' });
            const lastModelMessage = messages.slice().reverse().find(m => m.role === 'model' && !m.isError && m.text.trim());
            const retryText = lastModelMessage?.text ? `[SUGGESTION]Let me try to explain that a different way:[/SUGGESTION]\n\n${lastModelMessage.text.replace(/\[SUGGESTION\]([\s\S]*?)\[\/SUGGESTION\]/g, '$1')}` : "I'm sorry, I don't have a previous response to repeat. Could you please ask your original question again?";
            const modelRetryMessage = { id: generateId(), role: 'model', text: retryText, isLoading: false };
            dispatch({ type: 'ADD_MESSAGES', payload: [modelRetryMessage] });
            dispatch({ type: 'MESSAGE_COMPLETE', payload: { messageId: '', finalMessage: modelRetryMessage } });
            persistMessage(modelRetryMessage);
            if (isAutoSpeakEnabled) {
                try {
                    await ttsService.speak(retryText);
                }
                catch (e) {
                    console.warn("TTS failed for retry response:", e);
                }
            }
        };
        const handleDrawCommand = async () => {
            dispatch({ type: 'START_MESSAGE' });
            const imagePrompt = trimmedInput.substring(6);
            const modelPlaceholderId = generateId();
            const modelPlaceholder = { id: modelPlaceholderId, role: 'model', text: 'Generating image...', isLoading: true, imageUrl: '' };
            dispatch({ type: 'ADD_MESSAGES', payload: [modelPlaceholder] });
            try {
                const imageUrl = await generateImage(imagePrompt);
                const finalModelMessage = { ...modelPlaceholder, text: '', isLoading: false, imageUrl };
                dispatch({ type: 'MESSAGE_COMPLETE', payload: { messageId: modelPlaceholderId, finalMessage: finalModelMessage } });
                persistMessage(finalModelMessage);
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                addToast('error', 'Image Generation Failed', errorMessage);
                dispatch({ type: 'SET_ERROR', payload: { messageId: modelPlaceholderId, error: errorMessage } });
            }
        };
        const handleStandardQuery = async (query, intent) => {
            dispatch({ type: 'START_MESSAGE' });
            let memoryContext = '';
            let similarInteractions = [];
            if (isMemoryEnabled && !options.skipMemory) {
                try {
                    similarInteractions = await findSimilarInteractions(moduleId, query);
                    if (similarInteractions.length > 0) {
                        memoryContext = "To help you, here are some questions and answers from previous trainees on this topic:\n\n---\n\n" +
                            similarInteractions.map(log => `Question: ${log.user_question}\nAnswer: ${log.tutor_response}`).join('\n\n---\n\n') +
                            "\n\n--- \n\nNow, regarding your question:\n";
                    }
                }
                catch (e) {
                    console.warn("Could not retrieve collective memory:", e);
                }
            }
            const modelMessageId = generateId();
            const modelPlaceholder = { id: modelMessageId, role: 'model', text: '', isLoading: true };
            dispatch({ type: 'ADD_MESSAGES', payload: [modelPlaceholder] });
            const currentStep = steps[currentStepIndex];
            const enrichedInput = enrichPromptIfNeeded(query);
            const finalPrompt = `Current step: ${currentStep.title}.\n\n${memoryContext}${enrichedInput}`;
            let finalModelText = '';
            let isFallback = false;
            let didErrorOccur = false;
            try {
                if (!chatRef.current)
                    throw new Error("Chat not initialized");
                const stream = await sendMessageWithRetry(chatRef.current, finalPrompt);
                for await (const chunk of stream) {
                    finalModelText += chunk.text ?? '';
                    const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
                    const newCitations = groundingChunks?.map((c) => c.web).filter((c) => !!c?.uri);
                    dispatch({ type: 'STREAM_MESSAGE_CHUNK', payload: { messageId: modelMessageId, chunk: chunk.text ?? '', citations: newCitations } });
                }
                if (isAutoSpeakEnabled && finalModelText) {
                    await ttsService.speak(finalModelText.replace(/\[SUGGESTION\]([\s\S]*?)\[\/SUGGESTION\]/g, 'I have a suggestion. $1'));
                }
            }
            catch (err) {
                console.warn("Primary AI provider failed. Attempting fallback.", err);
                try {
                    finalModelText = await getFallbackResponse(finalPrompt, messages, stepsContext, fullTranscript);
                    isFallback = true;
                    if (isAutoSpeakEnabled && finalModelText) {
                        await ttsService.speak(finalModelText);
                    }
                }
                catch (fallbackErr) {
                    didErrorOccur = true;
                    const errorMessage = fallbackErr instanceof Error ? fallbackErr.message : 'An unknown error occurred.';
                    dispatch({ type: 'SET_ERROR', payload: { messageId: modelMessageId, error: errorMessage } });
                }
            }
            finally {
                if (finalModelText && !didErrorOccur) {
                    const finalModelMessage = { id: modelMessageId, role: 'model', text: finalModelText, citations: [], isFallback, isLoading: false, memoryMatches: similarInteractions, embeddingSource: query };
                    dispatch({ type: 'MESSAGE_COMPLETE', payload: { messageId: modelMessageId, finalMessage: finalModelMessage } });
                    persistMessage(finalModelMessage);
                    const detectedUserAliases = detectAliases(query);
                    logTutorInteraction({
                        moduleId: moduleId, stepIndex: currentStepIndex, userQuestion: query, tutorResponse: finalModelText,
                        templateId: templateContext?.templateId, stepTitle: intent, remoteType: steps[currentStepIndex]?.remoteType, aliases: detectedUserAliases,
                    }).catch((err) => console.warn("Failed to log interaction to collective memory:", err));
                    const vagueResponseRegex = /\b(i (don’t|do not) (know|have enough|have that info)|i'm sorry|i am sorry|i cannot answer|i can't answer|i am unable to|that information isn't in this specific training)\b/i;
                    if (vagueResponseRegex.test(finalModelText)) {
                        console.log("Auto-submitting unresolved issue for owner review...");
                        flagQuestion({
                            module_id: moduleId, step_index: currentStepIndex, user_question: query,
                            tutor_response: finalModelText, user_id: user?.uid ?? null
                        }).catch(err => console.warn("Failed to auto-submit unresolved issue:", err));
                    }
                }
                else if (!finalModelText && !didErrorOccur) {
                    dispatch({ type: 'REMOVE_MESSAGE', payload: { messageId: modelMessageId } });
                }
            }
        };
        // --- Routing Logic ---
        if (isRetryMessage(trimmedInput)) {
            return await handleRetry();
        }
        if (trimmedInput.toLowerCase().startsWith('/draw ')) {
            return await handleDrawCommand();
        }
        const intent = await detectIntent(trimmedInput);
        if (intent !== 'unclear') {
            const routine = await getRoutineForIntent(templateContext?.templateId || moduleId, intent);
            if (routine) {
                return await handleRoutineResponse(routine, intent);
            }
        }
        await handleStandardQuery(trimmedInput, intent);
    }, [isLoading, chatRef, persistMessage, templateContext, moduleId, currentStepIndex, steps, detectIntent, getRoutineForIntent, isAutoSpeakEnabled, messages, addToast, isMemoryEnabled, findSimilarInteractions, enrichPromptIfNeeded, stepsContext, fullTranscript, logTutorInteraction, user, flagQuestion]);
    const handleFormSubmit = useCallback(async (e) => {
        e.preventDefault();
        const textToSend = input.trim();
        if (!textToSend)
            return;
        dispatch({ type: 'SET_INPUT', payload: '' });
        await sendMessage(textToSend);
    }, [input, sendMessage]);
    useEffect(() => {
        if (initialPrompt) {
            sendMessage(initialPrompt);
        }
    }, [initialPrompt, sendMessage]);
    const handleRegenerate = useCallback(async (messageId, skipMemory) => {
        const messageIndex = messages.findIndex((m) => m.id === messageId);
        if (messageIndex > 0) {
            const userPromptMessage = messages[messageIndex - 1];
            if (userPromptMessage?.role === 'user') {
                await sendMessage(userPromptMessage.text, { skipMemory });
            }
            else {
                addToast('error', 'Cannot Regenerate', 'Could not find the original user prompt for this response.');
            }
        }
    }, [messages, sendMessage, addToast]);
    const handleSubmitToOwner = useCallback((userQuestion, aiResponse, messageId) => {
        if (flaggedMessageIds[messageId]) {
            addToast('info', 'Already Flagged', 'This response has already been submitted for review.');
            return;
        }
        addToast('info', 'Submitting...', 'Sending this conversation to the owner for review.');
        flagResponseForReview({ userQuestion, aiResponse });
        setFlaggedMessageIds(prev => ({ ...prev, [messageId]: true }));
    }, [addToast, flaggedMessageIds, flagResponseForReview]);
    const toggleExpanded = (messageId, section) => {
        setExpandedMessages(prev => ({
            ...prev,
            [messageId]: prev[messageId] === section ? undefined : section,
        }));
    };
    const toggleAutoSpeak = () => {
        setIsAutoSpeakEnabled(prev => {
            if (!prev === false)
                ttsService.cancel();
            return !prev;
        });
    };
    const handleDownloadChat = useCallback(() => {
        if (messages.length === 0)
            return;
        const chatContent = messages.map((msg) => {
            const prefix = msg.role === 'user' ? 'User:' : 'AI Tutor:';
            let content = msg.text.trim();
            if (msg.imageUrl) {
                content += `\n[Generated Image at: ${msg.imageUrl}]`;
            }
            content = content
                .replace(/\[SUGGESTION\]([\s\S]*?)\[\/SUGGESTION\]/g, '\n--- Suggestion ---\n$1\n--- End Suggestion ---')
                .replace(/\[\d{2}:\d{2}:\d{2}\]|\[\d{2}:\d{2}\]/g, '');
            return `${prefix}\n${content}\n`;
        }).join('\n----------------------------------------\n\n');
        const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `adapt-chat-history-${moduleId}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [messages, moduleId]);
    const handleResetChat = useCallback(() => {
        ttsService.cancel();
        dispatch({ type: 'SET_MESSAGES', payload: [] });
        queryClient.setQueryData(chatHistoryQueryKey, []); // Clear cache to prevent refetching
        if (stepsContext) {
            try {
                chatRef.current = startChat(stepsContext, fullTranscript, [], templateContext);
                addToast('info', 'Chat Reset', 'The conversation has been cleared.');
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Could not restart AI chat.';
                addToast('error', 'Reset Failed', errorMessage);
            }
        }
    }, [queryClient, chatHistoryQueryKey, stepsContext, fullTranscript, templateContext, addToast]);
    const retryLastMessage = useCallback(() => {
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
        const errorModelMessage = [...messages].reverse().find(m => m.isError);
        if (lastUserMessage) {
            if (errorModelMessage) {
                // This will remove the error message and the global error state
                dispatch({ type: 'REMOVE_MESSAGE', payload: { messageId: errorModelMessage.id } });
            }
            sendMessage(lastUserMessage.text);
        }
    }, [messages, sendMessage]);
    const handleSubmitToOwnerOnError = useCallback(() => {
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMessage) {
            flagResponseForReview({ userQuestion: lastUserMessage.text, aiResponse: `[AI FAILED TO RESPOND] - ${error}` });
            addToast('success', 'Submitted for Review', 'This conversation has been flagged for the module owner.');
        }
    }, [messages, flagResponseForReview, error, addToast]);
    return (_jsxs("div", { className: "flex flex-col h-full bg-white dark:bg-slate-800/50 rounded-2xl", children: [_jsxs("header", { className: "flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(MessageSquareIcon, { className: "h-6 w-6 text-indigo-500 dark:text-indigo-400" }), _jsx("h2", { className: "font-bold text-lg text-slate-900 dark:text-white", children: "Adapt AI Tutor" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: handleResetChat, className: "p-1 text-xs text-slate-400 hover:text-white underline", title: "Reset Chat", children: "Reset Chat" }), _jsx("button", { onClick: () => setIsMemoryEnabled(prev => !prev), className: "p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors", "aria-label": isMemoryEnabled ? "Disable collective memory" : "Enable collective memory", title: isMemoryEnabled ? "Disable collective memory (RAG)" : "Enable collective memory (RAG)", children: _jsx(DatabaseIcon, { className: `h-5 w-5 ${isMemoryEnabled ? 'text-indigo-500 dark:text-indigo-400' : ''}` }) }), _jsx("button", { onClick: () => setShowTimestamps(prev => !prev), className: "p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors", "aria-label": showTimestamps ? "Hide timestamps" : "Show timestamps", title: showTimestamps ? "Hide timestamps" : "Show timestamps", children: _jsx(ClockIcon, { className: `h-5 w-5 ${showTimestamps ? 'text-indigo-500 dark:text-indigo-400' : ''}` }) }), _jsx("button", { onClick: handleDownloadChat, className: "p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors", "aria-label": "Download chat history", title: "Download chat history", disabled: messages.length === 0, children: _jsx(DownloadIcon, { className: "h-5 w-5" }) }), _jsx("button", { onClick: toggleAutoSpeak, className: "p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors", "aria-label": isAutoSpeakEnabled ? "Disable auto-speak" : "Enable auto-speak", title: isAutoSpeakEnabled ? "Disable auto-speak" : "Enable auto-speak", children: isAutoSpeakEnabled ? _jsx(SpeakerOnIcon, { className: "h-5 w-5 text-green-500 dark:text-green-400" }) : _jsx(SpeakerOffIcon, { className: "h-5 w-5" }) }), _jsx("button", { onClick: onClose, className: "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors", children: _jsx(XIcon, { className: "h-6 w-6" }) })] })] }), _jsxs("div", { className: "flex-1 p-4 space-y-4 overflow-y-auto", children: [isLoadingHistory && _jsx("div", { className: "text-center text-slate-500 dark:text-slate-400", children: "Loading chat history..." }), !isLoadingHistory && messages.length === 0 && !isLoading && !error && (_jsxs("div", { className: "flex items-start gap-3 animate-fade-in-up", children: [_jsx("div", { className: "flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center", children: _jsx(SparklesIcon, { className: "h-5 w-5 text-white" }) }), _jsx("div", { className: "max-w-xs md:max-w-md break-words p-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm", children: _jsx("p", { className: "text-base whitespace-pre-wrap", children: "Hello! I'm the Adapt AI Tutor. I can try to answer questions about the process." }) })] })), messages.map((msg, idx) => (_jsxs("div", { className: `flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''} animate-fade-in-up`, children: [msg.role === 'model' && (_jsxs("div", { className: "flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center relative", children: [_jsx(SparklesIcon, { className: "h-5 w-5 text-white" }), msg.isFallback && (_jsx("div", { className: "absolute -bottom-2 -right-2 text-xs bg-amber-500 text-white rounded-full px-1 py-0.5", title: "Response from fallback provider", children: "F" }))] })), _jsxs("div", { className: `max-w-xs md:max-w-md break-words p-3 rounded-xl ${msg.role === 'user'
                                    ? 'bg-indigo-500 text-white rounded-br-sm'
                                    : msg.isError
                                        ? 'bg-red-100 dark:bg-red-900/50 rounded-bl-sm'
                                        : msg.isRoutine
                                            ? 'bg-cyan-100 dark:bg-cyan-900/50 rounded-bl-sm border border-cyan-300 dark:border-cyan-700'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm'}`, children: [msg.isLoading ? (msg.text ? (_jsxs("div", { className: "flex items-baseline text-slate-800 dark:text-slate-200", children: [_jsx("p", { className: "text-base whitespace-pre-wrap", children: msg.text }), _jsx("span", { className: "inline-block w-0.5 h-4 ml-1 bg-current animate-blink" })] })) : (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(SparklesIcon, { className: "h-5 w-5 text-slate-500 animate-pulse" }), _jsx("span", { className: "text-slate-600 dark:text-slate-300 italic", children: msg.imageUrl === '' ? 'Generating image...' : 'Thinking...' })] }))) : msg.isError ? (_jsxs("div", { className: "flex items-start gap-2 text-red-800 dark:text-red-200", children: [_jsx(AlertTriangleIcon, { className: "h-5 w-5 flex-shrink-0" }), _jsx("span", { className: "text-base whitespace-pre-wrap", children: msg.text })] })) : msg.imageUrl ? (_jsx("img", { src: msg.imageUrl, alt: msg.text || 'Generated image', className: "rounded-lg max-w-full h-auto" })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "text-base whitespace-pre-wrap", children: (() => {
                                                    const text = msg.text;
                                                    const suggestionMatch = text.match(/\[SUGGESTION\]([\s\S]*?)\[\/SUGGESTION\]/);
                                                    if (suggestionMatch) {
                                                        const suggestionText = suggestionMatch[1];
                                                        const isSubmitted = submittedSuggestions[msg.id];
                                                        return (_jsxs("div", { className: "bg-indigo-200/50 dark:bg-indigo-900/50 p-3 rounded-md mt-2 border border-indigo-300 dark:border-indigo-700", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(LightbulbIcon, { className: "h-5 w-5 text-yellow-500 dark:text-yellow-400" }), _jsx("h4", { className: "font-bold text-sm text-yellow-700 dark:text-yellow-300", children: "Suggestion" })] }), _jsxs("p", { className: "text-sm text-indigo-800 dark:text-indigo-100 italic", children: ["\"", suggestionText.trim(), "\""] }), _jsx("button", { onClick: () => onSuggestionProposed(suggestionText.trim(), msg.id), disabled: isSubmitted, className: "text-xs w-full text-white font-semibold py-1.5 px-3 rounded-full mt-3 transition-colors flex items-center justify-center gap-2 disabled:bg-green-600 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700", children: isSubmitted ? _jsxs(_Fragment, { children: [_jsx(CheckCircleIcon, { className: "h-4 w-4" }), " Submitted"] }) : 'Propose to Owner' })] }));
                                                    }
                                                    const parts = text.split(/(\((?:\d{1,2}):\d{2}\)|\[(?:(?:\d{1,2}):)?\d{2}:\d{2}\])/g);
                                                    const renderedParts = parts.map((part, partIndex) => {
                                                        const time = parseTimestamp(part);
                                                        if (time !== null) {
                                                            if (showTimestamps) {
                                                                return _jsx("button", { onClick: () => onTimestampClick(time), className: "bg-indigo-500 text-white font-mono px-2 py-1 rounded-md text-sm hover:bg-indigo-400 transition-colors", children: part.replace(/[\[\]()]/g, '') }, partIndex);
                                                            }
                                                            return null;
                                                        }
                                                        return _jsx("span", { children: part }, partIndex);
                                                    });
                                                    const unknownResponseRegex = /\b(i (don’t|do not) (know|have enough|have that info)|i'm sorry|i am sorry|i cannot answer|i can't answer|i am unable to|that information isn't in this specific training)\b/i;
                                                    const showSubmitToOwner = msg.role === 'model' && unknownResponseRegex.test(text);
                                                    const userPrompt = idx > 0 ? messages[idx - 1] : null;
                                                    const canSubmit = showSubmitToOwner && userPrompt && userPrompt.role === 'user';
                                                    const isFlagged = flaggedMessageIds[msg.id];
                                                    return _jsxs(_Fragment, { children: [renderedParts, canSubmit && (_jsxs("div", { className: "mt-3 pt-3 border-t border-slate-200 dark:border-slate-600", children: [_jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mb-2", children: "This answer seems unhelpful. You can notify the module owner to help them improve this training." }), _jsx("button", { onClick: () => handleSubmitToOwner(userPrompt.text, msg.text, msg.id), disabled: isFlagged, className: "w-full mt-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1.5 px-3 rounded-full transition-colors flex items-center justify-center gap-2 disabled:bg-green-600 disabled:cursor-not-allowed", children: isFlagged ? _jsxs(_Fragment, { children: [_jsx(CheckCircleIcon, { className: "h-4 w-4" }), " Submitted"] }) : _jsxs(_Fragment, { children: [_jsx(AlertTriangleIcon, { className: "h-4 w-4" }), " Submit to Owner"] }) })] }))] });
                                                })() }), msg.role === 'model' && !msg.isLoading && !msg.isError && (_jsxs("div", { className: "mt-3 pt-2 border-t border-slate-200 dark:border-slate-600", children: [_jsxs("div", { className: "flex items-center gap-4 text-xs", children: [_jsx("button", { onClick: () => handleRegenerate(msg.id, false), className: "font-semibold text-indigo-600 dark:text-indigo-400 hover:underline", children: "Try Again" }), _jsx("button", { onClick: () => handleRegenerate(msg.id, true), className: "font-semibold text-indigo-600 dark:text-indigo-400 hover:underline", children: "Regenerate w/o Memory" }), msg.memoryMatches && msg.memoryMatches.length > 0 && (_jsxs("button", { onClick: () => toggleExpanded(msg.id, 'memory'), className: "font-semibold text-green-600 dark:text-green-400 hover:underline", children: [expandedMessages[msg.id] === 'memory' ? 'Hide' : 'Show', " Memory"] })), isDebug && msg.embeddingSource && (_jsx("button", { onClick: () => toggleExpanded(msg.id, 'debug'), className: "font-semibold text-yellow-600 dark:text-yellow-400 hover:underline", children: expandedMessages[msg.id] === 'debug' ? 'Hide Debug' : 'Why this answer?' }))] }), expandedMessages[msg.id] === 'memory' && msg.memoryMatches && (_jsxs("div", { className: "mt-3 p-3 bg-green-100/50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-xs animate-fade-in-up", children: [_jsx("h4", { className: "font-bold text-green-800 dark:text-green-200 mb-2", children: "Based on similar past interactions:" }), _jsx("div", { className: "space-y-2", children: msg.memoryMatches.map((match, i) => (_jsxs("div", { className: "p-2 bg-white/50 dark:bg-black/20 rounded", children: [_jsxs("p", { className: "text-slate-600 dark:text-slate-400 italic", children: [_jsx("span", { className: "font-semibold", children: "Q:" }), " ", match.user_question] }), _jsxs("p", { className: "text-slate-800 dark:text-slate-200 mt-1", children: [_jsx("span", { className: "font-semibold", children: "A:" }), " ", match.tutor_response] })] }, i))) })] })), expandedMessages[msg.id] === 'debug' && isDebug && (_jsxs("div", { className: "mt-3 p-3 bg-yellow-100/50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-xs animate-fade-in-up", children: [_jsx("h4", { className: "font-bold text-yellow-800 dark:text-yellow-200 mb-2", children: "Debug Info:" }), _jsxs("p", { className: "break-all", children: [_jsx("strong", { children: "Embedding Source:" }), " ", _jsxs("span", { className: "italic", children: ["\"", msg.embeddingSource, "\""] })] }), _jsxs("p", { children: [_jsx("strong", { children: "Top Match Score:" }), " ", msg.memoryMatches?.[0]?.similarity?.toFixed(4) ?? 'N/A'] }), _jsxs("p", { children: [_jsx("strong", { children: "Matches Found:" }), " ", msg.memoryMatches?.length ?? 0] })] }))] }))] })), msg.citations && msg.citations.length > 0 && (_jsxs("div", { className: "mt-2 pt-2 border-t border-slate-200 dark:border-slate-600", children: [_jsx("h4", { className: "text-xs font-bold text-slate-500 dark:text-slate-400 mb-1", children: "Sources:" }), _jsx("div", { className: "space-y-1", children: msg.citations.map((citation, cIdx) => (citation?.uri && _jsxs("a", { href: citation.uri, target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-300 hover:underline", children: [_jsx(LinkIcon, { className: "h-3 w-3 flex-shrink-0" }), _jsx("span", { className: "truncate", children: citation.title || new URL(citation.uri).hostname })] }, cIdx))) })] })), msg.role === 'model' && !msg.isLoading && !msg.isError && (_jsxs("div", { className: "flex items-center gap-1 mt-2 -ml-1", children: [_jsx("button", { onClick: () => sendFeedback({ messageId: msg.id, feedback: 'good' }), disabled: !!msg.feedback, className: `p-1 text-slate-400 dark:text-slate-500 hover:text-green-500 disabled:cursor-not-allowed ${msg.feedback === 'good' ? 'text-green-600 dark:text-green-500' : ''}`, "aria-label": "Good response", children: _jsx(ThumbsUpIcon, { className: "h-4 w-4" }) }), _jsx("button", { onClick: () => sendFeedback({ messageId: msg.id, feedback: 'bad' }), disabled: !!msg.feedback, className: `p-1 text-slate-400 dark:text-slate-500 hover:text-red-500 disabled:cursor-not-allowed ${msg.feedback === 'bad' ? 'text-red-600 dark:text-red-500' : ''}`, "aria-label": "Bad response", children: _jsx(ThumbsDownIcon, { className: "h-4 w-4" }) })] }))] }), msg.role === 'user' && (_jsx("div", { className: "flex-shrink-0 h-8 w-8 rounded-full bg-slate-400 dark:bg-slate-600 flex items-center justify-center", children: _jsx(UserIcon, { className: "h-5 w-5 text-white" }) }))] }, msg.id))), error && (_jsxs("div", { className: "text-red-400 dark:text-red-300 text-center text-sm p-2 bg-red-100 dark:bg-red-900/50 rounded-md", children: [error, _jsxs("div", { className: "mt-2", children: [_jsx("button", { onClick: retryLastMessage, className: "text-indigo-600 dark:text-indigo-400 underline mr-4 font-semibold", children: "Try Again" }), _jsx("button", { onClick: handleSubmitToOwnerOnError, className: "text-yellow-600 dark:text-yellow-400 underline font-semibold", children: "Submit to Owner" })] })] })), _jsx("div", { ref: messagesEndRef })] }), _jsxs("div", { className: "p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0", children: [steps[currentStepIndex] && (_jsxs("p", { className: "text-sm text-slate-400 mb-1 px-4", children: ["You\u2019re on: ", _jsx("span", { className: "font-medium text-slate-700 dark:text-white", children: steps[currentStepIndex].title })] })), _jsxs("form", { onSubmit: handleFormSubmit, className: "flex items-center gap-2 bg-slate-100 dark:bg-slate-900/80 rounded-full border border-slate-300 dark:border-slate-700 p-1.5 focus-within:ring-2 focus-within:ring-indigo-500 transition-all", children: [_jsx("input", { "data-testid": "chat-input", type: "text", value: input, onChange: (e) => dispatch({ type: 'SET_INPUT', payload: e.target.value }), placeholder: error ? "AI Tutor is unavailable" : "Ask or type /draw...", className: "flex-1 bg-transparent border-none focus:ring-0 px-4 py-1 text-slate-900 dark:text-white disabled:opacity-50", disabled: isLoading || !!error || isLoadingHistory }), _jsx("button", { "data-testid": "send-button", type: "submit", disabled: isLoading || !input.trim() || !!error || isLoadingHistory, className: "bg-indigo-600 text-white p-2 rounded-full disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors flex items-center justify-center h-9 w-9", "aria-label": "Send message", children: isLoading ? _jsx(LoaderIcon, { className: "h-5 w-5 animate-spin" }) : _jsx(SendIcon, { className: "h-5 w-5" }) })] })] })] }));
};
//# sourceMappingURL=ChatTutor.js.map