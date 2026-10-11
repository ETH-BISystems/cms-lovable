import { useState, useRef, useCallback, useEffect } from 'react';
import { getExperienceAudioUrl } from '../services/experienceService';

interface UseAudioPlaybackReturn {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  activeItemId: string | null;
  play: (itemId: string, storagePath: string) => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
}

export function useAudioPlayback(): UseAudioPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Create audio element once
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });
    audioRef.current.addEventListener('loadedmetadata', () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const play = useCallback(async (itemId: string, storagePath: string) => {
    if (!audioRef.current) return;

    // If playing a different item, stop it first
    if (activeItemId !== itemId) {
      audioRef.current.pause();
      setCurrentTime(0);

      // Get download URL from Firebase Storage
      const url = await getExperienceAudioUrl(storagePath);
      audioRef.current.src = url;
      setActiveItemId(itemId);
    }

    audioRef.current.play();
    setIsPlaying(true);

    // Update current time
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }, 100);
  }, [activeItemId]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  return { isPlaying, currentTime, duration, activeItemId, play, pause, seek };
}
