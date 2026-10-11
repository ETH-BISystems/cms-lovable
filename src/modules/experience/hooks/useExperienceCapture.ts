import { useState, useRef, useCallback } from 'react';
import { uploadExperienceAudio, callSaveExperienceNote, callTranscribeExperienceNote } from '../services/experienceService';
import type { CaptureMetadata, SaveExperienceNoteInput } from '../types';

interface UseExperienceCaptureReturn {
  isRecording: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  hasRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  discardRecording: () => void;
  saving: boolean;
  error: string | null;
  saveRecording: (blob: Blob, duration: number, metadata: CaptureMetadata) => Promise<string>;
  saveTyped: (text: string, metadata: CaptureMetadata) => Promise<string>;
}

export function useExperienceCapture(): UseExperienceCaptureReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecording(true);
      setRecordingDuration(0);

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      setError(msg.includes('NotAllowed') || msg.includes('Permission')
        ? 'Microphone permission denied. Please enable it in your browser settings.'
        : `Recording failed: ${msg}`
      );
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const discardRecording = useCallback(() => {
    setAudioBlob(null);
    setRecordingDuration(0);
    chunksRef.current = [];
  }, []);

  const saveRecording = useCallback(async (blob: Blob, duration: number, metadata: CaptureMetadata): Promise<string> => {
    if (!blob) throw new Error('No recording to save');

    setSaving(true);
    setError(null);

    try {
      // Upload audio to Firebase Storage
      let storagePath: string;
      try {
        storagePath = await uploadExperienceAudio(blob, metadata.contributorUid || 'unknown');
      } catch (uploadErr) {
        const uploadMsg = uploadErr instanceof Error ? uploadErr.message : 'Storage upload failed';
        throw new Error(`Audio upload failed: ${uploadMsg}. Is the Storage emulator running?`);
      }

      // Save the experience note
      const input: SaveExperienceNoteInput = {
        audioStoragePath: storagePath,
        transcript: '',
        duration,
        mode: 'recorded',
        noteType: metadata.noteType,
        contributor: metadata.contributor,
        topicTags: metadata.topicTags,
        title: metadata.title,
        category: metadata.category,
      };

      const result = await callSaveExperienceNote(input);

      // Trigger transcription (fire-and-forget)
      callTranscribeExperienceNote({
        transcriptId: result.transcriptId,
        audioStoragePath: storagePath,
      }).catch(err => {
        console.warn('[useExperienceCapture] Transcription trigger failed:', err);
      });

      setSaving(false);
      setAudioBlob(null);
      setRecordingDuration(0);
      return result.transcriptId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      // Extract Firebase error details if available
      const details = (err as { details?: string })?.details;
      setError(details ? `${msg} — ${details}` : msg);
      setSaving(false);
      throw err;
    }
  }, []);

  const saveTyped = useCallback(async (text: string, metadata: CaptureMetadata): Promise<string> => {
    setSaving(true);
    setError(null);

    try {
      const input: SaveExperienceNoteInput = {
        audioStoragePath: null,
        transcript: text,
        duration: 0,
        mode: 'typed',
        noteType: metadata.noteType,
        contributor: metadata.contributor,
        topicTags: metadata.topicTags,
        title: metadata.title,
        category: metadata.category,
      };

      const result = await callSaveExperienceNote(input);
      setSaving(false);
      return result.transcriptId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setError(msg);
      setSaving(false);
      throw err;
    }
  }, []);

  return {
    isRecording,
    recordingDuration,
    audioBlob,
    hasRecording: audioBlob !== null,
    startRecording,
    stopRecording,
    discardRecording,
    saving,
    error,
    saveRecording,
    saveTyped,
  };
}
