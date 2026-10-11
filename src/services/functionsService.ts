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

export function registerMockFunction(name: string, handler: Handler): void {
  handlers[name] = handler;
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
