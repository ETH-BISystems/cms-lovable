// Cloud-Function façade. Real callable functions are replaced by named entries
// in the `handlers` map that dispatch to mock implementations. Consumers call
// `callFunction<TIn, TOut>('functionName', payload)` — identical to the shape
// a real HTTPS callable will take once wired.
//
// See CLAUDE_HANDOVER.md §6 for the full list of function names and payload
// shapes expected in production.

import { delay } from './_delay';

type Handler = (payload: unknown) => Promise<unknown> | unknown;

const handlers: Record<string, Handler> = {
  // Registration point for mocked callables. Left empty in Phase 1 — added
  // as each module is migrated in later phases.
};

/**
 * Registration semantics: the FIRST plain registration wins — later plain
 * registrations are ignored (module-scope fallbacks must not clobber a real
 * store-backed handler that was registered earlier). Pass `{ override: true }`
 * for authoritative store-backed handlers so they win regardless of import
 * order (used by the central registry in `mockRegistrations.ts`).
 */
export function registerMockFunction(
  name: string,
  handler: Handler,
  options?: { override?: boolean },
): void {
  if (handlers[name] && !options?.override) return;
  handlers[name] = handler;
}

export function hasMockFunction(name: string): boolean {
  return name in handlers;
}

export async function callFunction<TIn = unknown, TOut = unknown>(
  name: string,
  payload?: TIn,
): Promise<TOut> {
  await delay(300);
  const handler = handlers[name];
  if (!handler) {
    throw new Error(`callFunction: no mock registered for "${name}". See CLAUDE_HANDOVER.md §6.`);
  }
  return handler(payload) as Promise<TOut>;
}
