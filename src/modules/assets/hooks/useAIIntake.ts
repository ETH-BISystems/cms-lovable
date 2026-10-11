/**
 * useAIIntake Hook
 *
 * Handle AI intake workflow:
 * 1. Start AI intake (get suggestions from TinyFish.ai)
 * 2. User reviews and edits suggestions
 * 3. Complete AI intake (apply approved data)
 */

import { useState, useCallback } from 'react';
import { startAIIntake, completeAIIntake } from '../services/assetService';
import { validateAISuggestions } from '../services/aiService';
import type { StartAIIntakeInput, CompleteAIIntakeInput } from '../types';

export interface AIIntakeState {
  loading: boolean;
  error: Error | null;
  completed: boolean;
}

export interface UseAIIntakeResult {
  intakeState: AIIntakeState;
  startIntake: (input: StartAIIntakeInput) => Promise<void>;
  completeIntake: (input: CompleteAIIntakeInput) => Promise<void>;
  reset: () => void;
}

export function useAIIntake(): UseAIIntakeResult {
  const [intakeState, setIntakeState] = useState<AIIntakeState>({
    loading: false,
    error: null,
    completed: false,
  });

  const startIntake = useCallback(async (input: StartAIIntakeInput) => {
    try {
      setIntakeState({
        loading: true,
        error: null,
        completed: false,
      });

      await startAIIntake(input);

      setIntakeState({
        loading: false,
        error: null,
        completed: false,
      });
    } catch (error: any) {
      console.error('AI intake start error:', error);
      setIntakeState({
        loading: false,
        error,
        completed: false,
      });
    }
  }, []);

  const completeIntake = async (input: CompleteAIIntakeInput) => {
    try {
      // Validate suggestions — map approvedData.filename to seoFilename
      // for the validator which expects the AISuggestions shape
      const validation = validateAISuggestions({
        ...input.approvedData,
        seoFilename: input.approvedData.filename,
      });
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      setIntakeState({
        loading: true,
        error: null,
        completed: false,
      });

      await completeAIIntake(input);

      setIntakeState({
        loading: false,
        error: null,
        completed: true,
      });
    } catch (error: any) {
      console.error('AI intake complete error:', error);
      setIntakeState({
        loading: false,
        error,
        completed: false,
      });
    }
  };

  const reset = () => {
    setIntakeState({
      loading: false,
      error: null,
      completed: false,
    });
  };

  return {
    intakeState,
    startIntake,
    completeIntake,
    reset,
  };
}
