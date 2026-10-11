# PORTING-GUIDE.md — Production → Mock Module Recipe

Internal guide used while building this mock (kept in-repo for future module
additions). It documents exactly how each production module was ported.

Source repo (production): `/Users/daynis.olman/Documents/GitHub/eth-operations-content-management-system`
(`src/`). This repo (mock): `/Users/daynis.olman/Desktop/commercial-cms` (`src/`).

## The recipe (per module)

1. **Copy the module** minus tests and docs:
   ```bash
   rsync -a --exclude='__tests__' --exclude='*.test.*' --exclude='MODULE.md' \
     "$PROD/src/modules/<name>/" "$MOCK/src/modules/<name>/"
   ```
2. **Rewrite router imports** in every copied file:
   `from 'react-router-dom'` → `from '@/lib/router-compat'`
   (the shim exports `Link, NavLink, Navigate, Outlet, useNavigate, useParams,
   useSearchParams, useLocation, useMatch, useHref` with v6 signatures).
3. **Eliminate every Firebase touchpoint.** Allowed patterns:
   - `services/*.ts` → rewrite as in-memory mocks with the **same exported
     names and signatures**, using `delay()` from `@/services/_delay` and
     seed data. Keep the production callable/Firestore names in comments
     (e.g. `// production: httpsCallable(functions, 'cardsSync')`).
   - `Timestamp` from `firebase/firestore` → `@/services/timestamp` (shim class).
   - Direct `onSnapshot(collection(db...))` inside components/hooks → move
     the query behind a mock `subscribeToX(listener)` service function that
     emits seed data once (and re-emits after mutations where useful).
   - `httpsCallable(functions, '<name>')` → a mock async function of the same
     name operating on the in-memory store; register it in the module service.
   - Never import from `@/platform/config/firebase` — those stubs throw.
4. **Cross-module imports stay as-is** (`@/modules/<other>` barrels). If the
   dependency module is not ported yet, note it in the wave report instead of
   stubbing someone else's module.
5. **Seed data**: small but believable — 5–15 entities per collection, ETH
   travel domain, realistic titles/numbers/dates (spread dates around "now"
   via `Date.now() ± n*864e5`). Images: `https://picsum.photos/seed/<slug>/<w>/<h>`.
6. **Keep the barrel complete** — the module's `index.ts` must export exactly
   what production's does (App-level imports depend on it).
7. **Do NOT touch**: `src/routes/` (route wiring is done centrally),
   `LOVABLE.md`, `MASTER-PROMPT.md`, `package.json`, shared `src/services/*`,
   other modules' directories. No builds, no typechecks, no git — the
   integrator runs those per wave.
8. **Report**: end with a short wave report — what was ported, which services
   were mocked and with what seed entities, any deferred items (missing
   cross-module deps, API differences spotted, components that need wiring
   review).

## Established mock infrastructure (Phase 0)

- `src/lib/router-compat.tsx` — react-router-dom v6 shim (TanStack-backed).
- `src/services/_delay.ts` — `delay()`, `maybeFail()`, `mockId()`.
- `src/services/timestamp.ts` — Firestore `Timestamp` shim.
- `src/services/authService.ts` — mock auth (any credentials → admin session,
  localStorage-persisted); seeds 4 users across all roles.
- `src/services/storageService.ts` — file → data-URL uploads.
- `src/services/functionsService.ts` — `callFunction(name, payload)` facade
  with `registerMockFunction(name, handler)` for modules that call
  cross-cutting callables.
- `src/platform/config/firebase.ts` — throwing stubs (import = build error at
  call time; the point is to catch missed rewrites).
- `src/modules/settings/types` + `hooks/useSettingsPermissions` — already
  ported (needed by ai-final-processing).
- `src/modules/ai-final-processing` — fully mocked; its
  `subscribeToQueueCounts`/`subscribeToWatermarkPhaseCounts` currently emit
  static counts and SHOULD be rewired to the pipeline module's article store
  once pipeline lands.

## Route registration (central, per wave)

Routes are TanStack file-based files under `src/routes/_app/` mirroring the
production App.tsx paths (pathless `_app` layout = AppLayout shell). One
small file per route: `createFileRoute("/_app/<path>")({ component: Page })`.
Nested paths use dotted filenames (`pipeline.refresh.tsx` → `/pipeline/refresh`).
