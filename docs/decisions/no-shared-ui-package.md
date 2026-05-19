# ADR: No `@contactship/ui` package — components live in `apps/web`

**Status:** Accepted · **Date:** 2026-05-19

## Context

A common monorepo pattern is to extract shared UI primitives into a dedicated package (`packages/ui`). The challenge brief lists this in its sample structure.

## Decision

We do not create a `@contactship/ui` package. UI components live in `apps/web/components/`.

## Why

- We have **one consumer.** There is no second app, marketing site, or admin tool that would re-use these components.
- Extracting a `packages/ui` package now would mean either:
  - Configuring component re-exports + Tailwind CSS bundling across the package boundary (fiddly with Tailwind v4's CSS-based theme).
  - Or, worse, exporting un-styled primitives and re-styling them per consumer.
- Both add real friction with zero benefit until we have a second consumer.

shadcn/ui's own model **deliberately** copies components into the consumer repo (`apps/web/components/ui/`) rather than treating them as a package. We follow that convention.

## When to revisit

If we add a second app (marketing site, admin tool, second product surface), extract `packages/ui` then. The components in `apps/web/components/ui/` will copy cleanly because they don't depend on app-level state.

## Consequences

**Positive.**
- One Tailwind config, one source of theme tokens, one place to look for any component.
- shadcn CLI commands just work.

**Negative.**
- The brief's sample structure includes `packages/ui`. We're explicitly deviating from the sample, documented here.
