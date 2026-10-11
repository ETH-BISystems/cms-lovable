import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Square, Play, Pause, Save, RotateCw, AlertCircle, Keyboard, Loader2 } from 'lucide-react';
import { useVoiceRecording } from '@/hooks/shared/useVoiceRecording';

export interface VoiceNoteData {
  id: string;
  audioStoragePath: string | null;
  /** Raw audio blob for recorded notes — the consumer uploads it to Storage */
  audioBlob: Blob | null;
  transcript: string;
  transcriptionStatus: 'pending' | 'completed' | 'error' | 'skipped';
  contributor: string;
  contributorUid: string;
  duration: number;
  recordedAt: Date;
  mode: 'recorded' | 'typed';
}

export interface VoiceNoteRecorderProps {
  /** Article or edition ID for storage path */
  contextId: string;
  /** Integration context: determines storage strategy */
  context: 'pipeline' | 'newsletter' | 'url-drop' | 'experience';
  /** Called when a voice note is successfully saved */
  onSave: (note: VoiceNoteData) => void | Promise<void>;
  /** Called on error during recording/upload */
  onError?: (error: string) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Note type (newsletter only) */
  noteType?: 'direction' | 'tip';
  /** Which mode the recorder opens in (default: record) */
  initialMode?: 'record' | 'type';
}

/**
 * Shared voice note recorder component with Record/Type toggle.
 * Supports recording via MediaRecorder API and direct text input.
 *
 * Requirements: 1.1–1.6, 2.1–2.3, 3.1–3.4, 4.1–4.4, 5.2, 5.3, 12.1
 */
export function VoiceNoteRecorder({
  contextId,
  context,
  onSave,
  onError,
  disabled = false,
  noteType,
  initialMode = 'record',
}: VoiceNoteRecorderProps) {
  const [mode, setMode] = useState<'record' | 'type'>(initialMode);
  const [typedText, setTypedText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const { isRecording, duration, audioBlob, error, startRecording, stopRecording, reset } =
    useVoiceRecording();

  // Clean up audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  // Create audio URL when blob changes
  useEffect(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (audioBlob) {
      audioUrlRef.current = URL.createObjectURL(audioBlob);
    }
  }, [audioBlob]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleReRecord = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    reset();
  }, [reset]);

  const handleSaveRecording = useCallback(async () => {
    if (!audioBlob) return;
    setIsLoading(true);
    setLoadingMessage('Uploading and transcribing...');
    setSaveError(null);

    try {
      // The parent component handles the actual upload/save logic via onSave
      const noteData: VoiceNoteData = {
        id: crypto.randomUUID(),
        audioStoragePath: null, // Will be set by parent after upload
        audioBlob,
        transcript: '',
        transcriptionStatus: 'pending',
        contributor: '',
        contributorUid: '',
        duration,
        recordedAt: new Date(),
        mode: 'recorded',
      };
      await onSave(noteData);
      reset();
      setIsPlaying(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save recording';
      setSaveError(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [audioBlob, duration, onSave, onError, reset]);

  const handleSaveTyped = useCallback(async () => {
    if (!typedText.trim()) return;
    setIsLoading(true);
    setLoadingMessage('Saving note...');
    setSaveError(null);

    try {
      const noteData: VoiceNoteData = {
        id: crypto.randomUUID(),
        audioStoragePath: null,
        audioBlob: null,
        transcript: typedText.trim(),
        transcriptionStatus: 'skipped',
        contributor: '',
        contributorUid: '',
        duration: 0,
        recordedAt: new Date(),
        mode: 'typed',
      };
      await onSave(noteData);
      setTypedText('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save note';
      setSaveError(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [typedText, onSave, onError]);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrlRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.src = audioUrlRef.current;
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleRetry = useCallback(() => {
    setSaveError(null);
    if (audioBlob) {
      handleSaveRecording();
    }
  }, [audioBlob, handleSaveRecording]);

  return (
    <div className="space-y-3">
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <span className="text-sm text-muted-foreground">{loadingMessage}</span>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs flex items-center justify-between">
            <span>{saveError}</span>
            <Button size="sm" variant="outline" className="h-6 text-[10px] ml-2" onClick={handleRetry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Mode tabs */}
      {!isLoading && (
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'record' | 'type')}>
          <TabsList className="h-8">
            <TabsTrigger value="record" className="text-xs gap-1" disabled={disabled}>
              <Mic className="h-3 w-3" /> Record
            </TabsTrigger>
            <TabsTrigger value="type" className="text-xs gap-1" disabled={disabled}>
              <Keyboard className="h-3 w-3" /> Type
            </TabsTrigger>
          </TabsList>

          {/* Record mode */}
          <TabsContent value="record" className="space-y-3">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            {isRecording ? (
              <Card>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </span>
                    <span className="text-sm font-mono">{formatDuration(duration)}</span>
                    {/* Waveform visualization */}
                    <div className="flex-1 flex items-center gap-0.5 h-6">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div
                          key={i}
                          className="bg-red-400 rounded-full w-1 animate-pulse"
                          style={{
                            height: `${Math.random() * 16 + 8}px`,
                            animationDelay: `${i * 50}ms`,
                          }}
                        />
                      ))}
                    </div>
                    <Button size="sm" variant="destructive" onClick={handleStopRecording}>
                      <Square className="h-3 w-3 mr-1" /> Stop
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : audioBlob ? (
              <Card>
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={togglePlayback}>
                      {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                    {/* Playback waveform */}
                    <div className="flex-1 flex items-center gap-0.5 h-6">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <div
                          key={i}
                          className="bg-accent/60 rounded-full w-1"
                          style={{ height: `${Math.random() * 16 + 4}px` }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatDuration(duration)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleReRecord}>
                      <RotateCw className="h-3 w-3 mr-1" /> Re-record
                    </Button>
                    <Button size="sm" onClick={handleSaveRecording} disabled={disabled}>
                      <Save className="h-3 w-3 mr-1" /> Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button size="sm" onClick={startRecording} disabled={disabled}>
                <Mic className="h-3 w-3 mr-1" /> Start Recording
              </Button>
            )}
          </TabsContent>

          {/* Type mode */}
          <TabsContent value="type" className="space-y-2">
            <Textarea
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="Dictation note"
              className="min-h-[80px] text-sm"
              disabled={disabled}
            />
            <Button size="sm" onClick={handleSaveTyped} disabled={!typedText.trim() || disabled}>
              <Save className="h-3 w-3 mr-1" /> Save Note
            </Button>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
