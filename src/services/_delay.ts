// MOCK-ONLY UTILITY — safe to delete when real backend replaces src/services/*.
// Simulates realistic network latency + optional failure so the UI exercises
// loading and error states the same way it will in production.

export function delay(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rolls a failure at `rate` probability (0..1) and throws the given error.
 * Reads `VITE_MOCK_FAILURE_RATE` from env as a global override multiplier.
 */
export async function maybeFail(rate = 0, message = 'Simulated network error'): Promise<void> {
  const globalRate = Number(import.meta.env.VITE_MOCK_FAILURE_RATE ?? 0) || 0;
  const effective = Math.max(rate, globalRate);
  if (effective > 0 && Math.random() < effective) {
    throw new Error(message);
  }
}

let idCounter = 1;
export function mockId(prefix = 'mock'): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}
