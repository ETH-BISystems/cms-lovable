# MASTER-PROMPT.md — Productization Delta Log

This file is the accumulating specification for porting the production ETH
Operations CMS into a **generic, multi-tenant, sellable SaaS product**.
Lovable appends a dated entry after every change it makes (see LOVABLE.md
for the protocol). The bottom section becomes the master prompt for the
final port.

---

## 1. Running summary of product decisions

<!-- One bullet per decision, newest last. Lovable keeps this current. -->

- _(none yet — the mock is at baseline)_

---

## 2. Baseline: what the mock is (state at handoff to Lovable)

A pixel- and flow-faithful frontend mock of the production CMS, built by
porting the real production components onto an in-memory service layer.
Stack: Vite + React 19 + TypeScript + TanStack Router (file-based routes) +
Tailwind v4 + shadcn/ui. No backend; all data is seeded mock content with
simulated latency (`src/services/_delay.ts`).

### Module inventory (production parity)

| Module | Routes | What it does |
|---|---|---|
| Shell + auth | `/login`, layout | Sidebar/header chrome, role-based auth (mock session: any credentials sign in as admin) |
| Dashboard | `/` | KPI cards, pipeline status bar, refresh queue, top keywords, my tasks, AI Humanizer status widget |
| Content pipeline | `/pipeline`, `/pipeline/refresh`, `/pipeline/content-library` | Kanban board across 10 stages (Researching → … → Publish), article detail panel, refresh queue, content library |
| Editorial calendar | `/calendar` | Calendar view of planned/published content; opens pipeline article panel |
| RSS monitor | `/rss` | Feed monitoring, keyword search (`?q=`), article triage |
| My Tasks | `/my-tasks` | Personal task list |
| Service Tickets | `/service-tickets` | Internal issue tracking board |
| Cards | `/cards`, `/cards/transfer-partners` | Credit-card data manager (scraped + manual override fields, change history), transfer-partner matrix |
| Transfer Partner Tables | `/transfer-partners` | Standalone transfer-partner embed/table manager |
| Asset Library | `/assets` | AI image generation + asset management |
| Experience Library | `/experience` | Social/voice-note experience capture (Zernio imports) |
| iFrame Manager | `/iframes` | Embeddable iframe snippets |
| Keywords suite | `/keywords/*` (20 routes) | Research, domain overview, competitors, SERP, trends, content gap, top pages, organic research, backlinks, AI visibility, intelligence dashboard, internal links, brand monitoring, page audit, business research, rank tracker (DataForSEO-powered in production) |
| Traffic & Market | `/traffic-market/*` (6 routes) | Similarweb-powered traffic analytics |
| SEO | `/seo/*` (4 routes) | Position tracking, page audits, AI overview tracker |
| Newsletter | `/newsletter` | Newsletter command center (Beehiiv in production) |
| Settings | `/settings` | App settings incl. integrations, user management, AI Final Processing |
| AI Final Processing | (widget/tab) | "Humanizer" (Gemma 4) queue: ZeroGPT detection → humanise rewrite → watermark removal |

### Architecture conventions (the port must reproduce these)

- **Module pattern:** `src/modules/<name>/{components,hooks,services,types,context}` with a barrel `index.ts`; other modules import only from the barrel.
- **Service seam:** components → hooks → services. In production, services call Firestore subscriptions and callable Cloud Functions; in the mock they return seeded data after `delay()`. Service function names mirror the production callable names.
- **Router shim:** production code uses react-router-dom v6; the mock re-implements those APIs in `src/lib/router-compat.tsx` on TanStack Router. New pages may import from `@tanstack/react-router` directly.
- **Theme:** design tokens in `src/styles.css` (Tailwind v4). Light theme is the default; `.dark` exists.
- **Auth/roles:** mock auth service seeds Admin/Editor/Writer/Viewer accounts; `useAuth()` exposes `{ user, userProfile, role, isAuthenticated, signOut }`.

### Production-only subsystems the mock represents but cannot show

These exist in the real system as Cloud Functions/Firestore and are mocked at the UI seam. A productization port must decide the multi-tenant shape of each:

- Firestore collections: `articles`, `refresh-queue`, `keywords`, `article-tasks`, `card_data`, `assets`, `settings/*`, `users`, `change_history` (audit subcollection pattern).
- Callable functions: ~140 (scrapers, Webflow sync, image generation, humanise pipeline, settings, user management).
- Webflow publishing sync, TinyFish card scraping, DataForSEO APIs, Similarweb API, ZeroGPT + Gemma-4 humanise GPU job, Beehiiv newsletter, Zernio social imports.

---

## 3. Change log (Lovable appends here, newest at the bottom)

<!-- ENTRY TEMPLATE — copy this block for each change:
### [YYYY-MM-DD] <short title>

- **Owner request:**
- **What changed:**
- **UX impact:**
- **Intent & business rules:**
- **Data model impact:** (NEW / RENAMED(from→to) / REMOVED / UNCHANGED)
- **Port notes:**
-->

### [2026-10-12] Baseline mock created (pre-Lovable)

- **Owner request:** Recreate the full CMS as a mock Lovable project so it can be de-branded into a sellable multi-tenant product.
- **What changed:** Entire repository. Production components ported onto in-memory mock services; TanStack Start stack; `src/lib/router-compat.tsx` shim; LOVABLE.md + this file seeded.
- **UX impact:** All modules render with seeded mock data (see inventory above; porting proceeds in phases — remaining modules land before Lovable edits begin).
- **Intent & business rules:** Baseline is single-tenant, ETH-branded, travel-specific by design — this is the "before" picture.
- **Data model impact:** Baseline documented in §2.
- **Port notes:** This file becomes the port spec. Every later entry is a delta against this baseline.

---

## 4. Final master prompt (assembled at the end — do not fill in yet)

<!-- At the end of the engagement: Lovable summarizes sections 1–3 into a
single prompt here describing the target product: branding, tenancy model,
billing, onboarding flow, taxonomy system, per-module changes, and data-model
deltas. That prompt + the production repo = the porting job. -->
