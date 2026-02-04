import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWakeWordOptions {
  wakeWord?: string;
  onWakeWordDetected: () => void;
  enabled?: boolean;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export const useWakeWord = ({ 
  wakeWord = 'hey van', 
  onWakeWordDetected, 
  enabled = true 
}: UseWakeWordOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [lastHeard, setLastHeard] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  const normalizeText = (text: string): string => {
    return text.toLowerCase().trim().replace(/[^\w\s]/g, '');
  };

  const checkForWakeWord = useCallback((transcript: string) => {
    const normalized = normalizeText(transcript);
    const wakeWordNormalized = normalizeText(wakeWord);
    
    // Check for various wake word patterns
    const patterns = [
      wakeWordNormalized,
      'hey van',
      'hey vann',
      'hey vaughn',
      'a van',
      'hey ben',
      'evan',
    ];
    
    for (const pattern of patterns) {
      if (normalized.includes(pattern)) {
        return true;
      }
    }
    return false;
  }, [wakeWord]);

  const startListening = useCallback(() => {
    if (!isSupported || !enabled || isActiveRef.current) return;
    
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isActiveRef.current = true;
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results;
        for (let i = event.resultIndex; i < results.length; i++) {
          const transcript = results[i][0].transcript;
          setLastHeard(transcript);
          
          if (checkForWakeWord(transcript)) {
            // Wake word detected!
            recognition.stop();
            onWakeWordDetected();
            
            // Restart listening after a delay
            restartTimeoutRef.current = setTimeout(() => {
              if (enabled) {
                startListening();
              }
            }, 3000);
            return;
          }
        }
      };

      recognition.onerror = () => {
        isActiveRef.current = false;
        setIsListening(false);
        
        // Restart on error after a delay
        restartTimeoutRef.current = setTimeout(() => {
          if (enabled) {
            startListening();
          }
        }, 1000);
      };

      recognition.onend = () => {
        isActiveRef.current = false;
        setIsListening(false);
        
        // Auto-restart if still enabled
        if (enabled && !restartTimeoutRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            startListening();
          }, 100);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Wake word recognition error:', err);
      isActiveRef.current = false;
      setIsListening(false);
    }
  }, [isSupported, enabled, checkForWakeWord, onWakeWordDetected]);

  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors when stopping
      }
      recognitionRef.current = null;
    }
    
    isActiveRef.current = false;
    setIsListening(false);
  }, []);

  // Check for browser support
  useEffect(() => {
    const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    setIsSupported(supported);
  }, []);

  // Start/stop based on enabled state
  useEffect(() => {
    if (enabled && isSupported) {
      startListening();
    } else {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [enabled, isSupported, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    lastHeard,
    startListening,
    stopListening,
  };
};

export default useWakeWord;
