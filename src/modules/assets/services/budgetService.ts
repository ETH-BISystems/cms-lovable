/**
 * Budget Service (MOCK)
 *
 * In-memory rewrite of the production service. The `settings/ai-budget`
 * Firestore document is replaced by a fixed usage figure; the subscription
 * emits once (and again if a generation nudges the counter).
 */

import { delay } from '@/services/_delay';
import type { BudgetUsage } from '../types';

type Unsubscribe = () => void;

// production: Firestore doc settings/ai-budget { monthlyLimit, currentMonthUsage, currentMonth }
const budget = {
  monthlyLimit: 50.0,
  currentMonthUsage: 7.42,
};

const listeners = new Set<() => void>();

function currentUsage(): BudgetUsage {
  const used = budget.currentMonthUsage;
  const total = budget.monthlyLimit;
  return { used, total, remaining: Math.max(0, total - used) };
}

/**
 * Subscribe to real-time budget usage updates.
 * production: onSnapshot(doc(db, 'settings', 'ai-budget'))
 */
export function subscribeToBudgetUsage(
  onData: (usage: BudgetUsage) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const emit = () => {
    try {
      onData(currentUsage());
    } catch (err) {
      onError(err as Error);
    }
  };
  const timer = setTimeout(emit, 150);
  listeners.add(emit);
  return () => {
    clearTimeout(timer);
    listeners.delete(emit);
  };
}

/**
 * production: httpsCallable(functions, 'getBudgetUsage')
 */
export async function getBudgetUsage(): Promise<BudgetUsage> {
  await delay(120);
  return currentUsage();
}
