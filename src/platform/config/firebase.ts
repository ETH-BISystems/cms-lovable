/**
 * MOCK — no Firebase backend exists in this Lovable project.
 *
 * The production app initializes the real Firebase SDK here. In the mock,
 * these exports are inert stubs so any straggler import still compiles; all
 * real data flows through the in-memory services in `src/services/` and
 * `src/modules/<name>/services/` (which mirror the production Cloud Function
 * and Firestore seams). Calling a method on these stubs throws a clear error
 * so missed mock rewrites surface immediately instead of silently failing.
 */

function stub(name: string): Record<string, unknown> {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return undefined; // keep it non-thenable
        throw new Error(
          `[mock] firebase "${name}.${String(prop)}" was called — this module must be rewired to the in-memory mock services. See docs/PORTING-GUIDE.md.`,
        );
      },
    },
  );
}

export const firebaseApp = stub('app');
export const app = firebaseApp;
export const auth = stub('auth');
export const db = stub('db');
export const functions = stub('functions');
export const storage = stub('storage');
export const analytics = stub('analytics');
