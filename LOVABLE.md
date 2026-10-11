# LOVABLE.md — Working Agreement for This Project

> **Paste this file's contents into the Lovable project's Knowledge/custom
> instructions as well** so it survives chat compaction. Lovable: treat this
> file as binding project instructions.

## What this project is

This repository is a **high-fidelity frontend mock of a production content
operations CMS** ("ETH Operations", built for Elite Travel Hackers). It is
deliberately branded and domain-specific (travel points/miles, airlines,
hotels, credit cards). Every page renders from **in-memory mock services**
(`src/services/`, `src/modules/*/services/`) — there is no real backend.

## What we are doing here

The owner is chatting with you (Lovable) to **de-brand and generalize** this
into a sellable, multi-tenant SaaS product: users sign up, pay with Stripe,
connect their own website, and run the same content engine for *their* niche
(catering, books, software, mechanical engineering — anything). Airlines and
hotels become *one example of a custom category*, not the whole product.

## Your standing orders as Lovable

1. **Preserve working UI.** This mock mirrors a real product. Never delete
   fields, tabs, filters, columns, or buttons to "simplify" — if the owner
   wants something gone they will say so explicitly.
2. **Keep the mock-service architecture.** Pages consume hooks, hooks consume
   services in `src/services/` or `src/modules/*/services/`. New features get
   mock services with the same shape (async functions, `delay()` latency,
   seed data). Do not wire real backends, Supabase, or Firebase.
3. **Genericize through configuration, not deletion.** When asked to make
   something generic (e.g. "airlines should just be a category"), prefer
   making the taxonomy data-driven (a categories service/collection) so
   "airline" becomes one seeded entry.
4. **After EVERY change you make, update `MASTER-PROMPT.md`** following the
   changelog protocol below. This is not optional — the file is the whole
   point of the exercise.

## MASTER-PROMPT.md changelog protocol

`MASTER-PROMPT.md` accumulates a structured delta log. At the end of this
engagement it will be handed to another AI (Claude) to port the *real*
production system (React + Firebase + Cloud Functions) into the new
productized version. It must therefore capture **intent and data-model
impact**, not just pixels.

After each change (or each coherent batch of one request), append an entry:

```markdown
### [YYYY-MM-DD] <short title>

- **Owner request:** <what the owner asked, verbatim or close>
- **What changed:** <routes/components/services touched, with file paths>
- **UX impact:** <what looks/behaves differently, screens affected>
- **Intent & business rules:** <the rule behind the change, e.g. "categories
  are tenant-defined; any string taxonomy is allowed">
- **Data model impact:** <new/renamed/removed collections, fields, service
  functions, settings; mark as NEW / RENAMED(from→to) / REMOVED / UNCHANGED>
- **Port notes:** <what a backend port must do: new Cloud Functions,
  migrations, tenant-scoping, Stripe touchpoints; "none" if purely visual>
```

Also keep the **"Running summary of product decisions"** section at the top
of MASTER-PROMPT.md current — one bullet per decision, newest last.

## Branding baseline

Current brand (to be de-branded): "Elite Points and Miles" / "Elite Travel
Hackers" (logo mark "EP", Roboto + Outfit fonts, teal/cyan palette on soft
off-white). Product name, logo, colors, and all travel-specific copy are
expected to change. The layout system (sidebar, header, cards, tables,
kanban) is the asset being kept.
