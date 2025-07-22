

import { useState, useEffect, useRef, useCallback } from 'react';

// The browser's SpeechRecognition API is still prefixed in some browsers.
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

// --- TypeScript Definitions for Web Speech API ---
// These are added to ensure compatibility, as they may not be in all default TS lib files.

// Manually define the necessary types for the Web Speech API
// as they are not consistently available in all TypeScript lib versions.
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type SpeechRecognitionErrorCode =
  | "no-speech"
  | "aborted"
  | "audio-capture"
  | "network"
  | "not-allowed"
  | "service-not-allowed"
  | "bad-grammar"
  | "language-not-supported";

// Extend the global Event interface for SpeechRecognition events
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: SpeechRecognitionErrorCode;
  readonly message: string;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}


// Type for the constructor, which may not be on the window object by default
interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

export const useSpeechRecognition = (onResult: (transcript: string, isFinal: boolean) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<SpeechRecognitionErrorCode | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
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
            } catch (e) {
                console.error("Failed to restart speech recognition", e);
                setIsListening(false);
                intendedListeningStateRef.current = false;
            }
        } else {
             setIsListening(false);
        }
    };
    
    // Use the built-in SpeechRecognitionErrorEvent type
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
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
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
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
      } catch (e) {
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