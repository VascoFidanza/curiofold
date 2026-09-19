# ADR-0001 — Modular monolith with Next.js and Vercel

**Status:** Accepted
**Date:** 2026-09-19

## Context

Curiofold has one product, one transactional core and a small initial delivery team. Wallet, entitlement and publication operations benefit from a single consistency boundary.

## Decision

Use a TypeScript modular monolith implemented with Next.js App Router on the Node runtime and deployed to Vercel Frankfurt. Keep framework-independent domain packages and explicit provider adapters.

## Alternatives considered

- Separate React frontend and API service.
- Microservices by technical layer or domain.
- Edge-first transactional runtime.

## Consequences

Deployment and transactions remain simple, while module boundaries preserve later extraction options. Independent scaling and failure isolation are deferred until measured demand justifies them.
