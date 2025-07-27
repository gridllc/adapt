import { useState, useEffect, useRef, useCallback } from 'react';
// The browser's SpeechRecognition API is still prefixed in some browsers.
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
export const useSpeechRecognition = (onResult) => {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState(null);
    const recognitionRef = useRef(null);
    // A ref to hold the desired listening state, to prevent onEnd from restarting
    // when we manually call stop().
    const intendedListeningStateRef = useRef(false);
    useEffect(() => {
        if (!SpeechRecognitionAPI) {
            console.warn("Speech Recognition API is not supported in this browser.");
            return;
        }
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true; // Get results as the user speaks
        recognition.lang = 'en-US';
        recognition.onstart = () => {
            setIsListening(true);
            setError(null); // Clear previous errors on successful start
        };
        recognition.onend = () => {
            // If we intended for it to be listening, it must have stopped unexpectedly.
            // So, we restart it.
            if (intendedListeningStateRef.current) {
                console.log("Speech recognition ended unexpectedly, restarting...");
                try {
                    recognition.start();
                }
                catch (e) {
                    console.error("Failed to restart speech recognition", e);
                    setIsListening(false);
                    intendedListeningStateRef.current = false;
                }
            }
            else {
                setIsListening(false);
            }
        };
        // Use the built-in SpeechRecognitionErrorEvent type
        recognition.onerror = (event) => {
            setError(event.error);
            // These are common, non-fatal errors. We can ignore them and let the onend handler
            // decide if a restart is needed.
            if (event.error === 'aborted' || event.error === 'no-speech') {
                console.warn(`Speech recognition non-fatal error: ${event.error}`);
                return;
            }
            console.error("Speech recognition fatal error", event.error, event.message);
            // On fatal errors, we want to stop for good.
            intendedListeningStateRef.current = false;
            setIsListening(false);
        };
        // Use the built-in SpeechRecognitionEvent type
        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
                else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript || interimTranscript) {
                onResult(finalTranscript + interimTranscript, !!finalTranscript);
            }
        };
        recognitionRef.current = recognition;
        return () => {
            if (recognitionRef.current) {
                intendedListeningStateRef.current = false;
                recognitionRef.current.stop();
            }
        };
    }, [onResult]);
    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                intendedListeningStateRef.current = true;
                recognitionRef.current.start();
            }
            catch (e) {
                console.error("Could not start speech recognition", e);
                intendedListeningStateRef.current = false;
            }
        }
    }, [isListening]);
    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            intendedListeningStateRef.current = false;
            recognitionRef.current.stop();
        }
    }, [isListening]);
    return {
        isListening,
        startListening,
        stopListening,
        hasSupport: !!SpeechRecognitionAPI,
        error,
    };
};
//# sourceMappingURL=useSpeechRecognition.js.map