import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseVoiceRecordingReturn {
  isRecording: boolean;
  duration: number;
  audioBlob: Blob | null;
  error: string | null;
  mimeType: string;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  reset: () => void;
}

const MAX_DURATION_SECONDS = 300; // 5 minutes

/**
 * Detects the best supported audio MIME type.
 * Prefers WebM/Opus, falls back to WAV.
 */
function detectMimeType(): string {
  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      return 'audio/webm;codecs=opus';
    }
    if (MediaRecorder.isTypeSupported('audio/webm')) {
      return 'audio/webm';
    }
  }
  return 'audio/wav';
}

/**
 * Shared MediaRecorder API wrapper for voice note recording.
 * Manages recording state, timer, codec detection, auto-stop, and error handling.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3
 */
export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mimeType = detectMimeType();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Auto-stop at 5 minutes
  useEffect(() => {
    if (isRecording && duration >= MAX_DURATION_SECONDS) {
      stopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, duration]);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
    setError(null);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setDuration(0);
    chunksRef.current = [];

    // Check for MediaRecorder support
    if (typeof MediaRecorder === 'undefined') {
      setError(
        'Voice recording is not supported in this browser. Please use the Type mode instead.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorderOptions: MediaRecorderOptions = {};
      if (mimeType !== 'audio/wav' && MediaRecorder.isTypeSupported(mimeType)) {
        recorderOptions.mimeType = mimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blobType = mimeType !== 'audio/wav' ? mimeType : 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: blobType });
        setAudioBlob(blob);
        setIsRecording(false);

        // Stop the timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = () => {
        setError('Recording failed. Please try again or use the Type mode.');
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start duration timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } catch (err) {
      // Handle permission denial and other errors
      if (err instanceof DOMException) {
        if (
          err.name === 'NotAllowedError' ||
          err.name === 'PermissionDeniedError'
        ) {
          setError(
            'Microphone access was denied. Please allow microphone access in your browser settings, or use the Type mode instead.',
          );
        } else if (err.name === 'NotFoundError') {
          setError(
            'No microphone found. Please connect a microphone or use the Type mode instead.',
          );
        } else {
          setError(
            `Recording error: ${err.message}. Please try again or use the Type mode.`,
          );
        }
      } else {
        setError(
          'An unexpected error occurred while starting the recording. Please use the Type mode instead.',
        );
      }
    }
  }, [mimeType]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return {
    isRecording,
    duration,
    audioBlob,
    error,
    mimeType,
    startRecording,
    stopRecording,
    reset,
  };
}
