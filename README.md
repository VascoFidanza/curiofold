# Curiofold

Curiofold is a browser-based platform for short, compelling, deeply researched factual Stories designed to satisfy curiosity in approximately 5–10 minutes.

> **Small stories. Big rabbit holes.**

This repository is the technical home of the product.

## Before planning or coding

Codex and contributors should start with:

1. [`AGENTS.md`](./AGENTS.md)
2. [`docs/README.md`](./docs/README.md)
3. [`docs/product/PROJECT_SPEC.md`](./docs/product/PROJECT_SPEC.md)
4. [`docs/design/PRODUCT_DESIGN.md`](./docs/design/PRODUCT_DESIGN.md)
5. [`docs/project/DELIVERY_GOVERNANCE.md`](./docs/project/DELIVERY_GOVERNANCE.md)
6. [`docs/project/OPEN_DECISIONS.md`](./docs/project/OPEN_DECISIONS.md)

The technical architecture and delivery roadmap are recorded in
[`docs/engineering/EXECUTION_PLAN.md`](./docs/engineering/EXECUTION_PLAN.md), with
material decisions under [`docs/decisions/`](./docs/decisions/).

## Local workspace

Prerequisites:

- Node.js 24 LTS (see `.nvmrc`)
- Corepack with pnpm 11

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm validate
pnpm dev
```

The workspace is intentionally a small modular monolith:

- `apps/web` — Next.js delivery application;
- `packages/domain` — framework-independent domain policy;
- `packages/db` — persistence contracts, schema and repositories;
- `packages/content` — structured Story contracts and compiler;
- `packages/ui` — shared accessible presentation primitives;
- `packages/config` — typed configuration contracts.

Infrastructure-linked commands will be documented when the nonproduction delivery
substrate is provisioned. Local setup must never require production credentials.

Database foundations are checked without connecting to a shared database:

```sh
DATABASE_URL=postgresql://localhost/curiofold pnpm db:migrate:check
pnpm db:generate
pnpm test:integration # requires Docker and starts an isolated PostgreSQL container
```

`db:generate` and `db:migrate:check` must use a local, CI, preview or staging
database URL. They must never be pointed at production from a developer shell.

## Documentation ownership

- Product/business behavior: `docs/product/PROJECT_SPEC.md`
- UX/UI/brand: `docs/design/PRODUCT_DESIGN.md` + approved Figma
- Delivery/Linear operating model: `docs/project/DELIVERY_GOVERNANCE.md`
- Open product decisions: `docs/project/OPEN_DECISIONS.md`
- Technical plan/architecture/status: created and maintained by Codex after planning approval
- Operational execution state: Linear
- Code truth: repository/Git

See [`docs/README.md`](./docs/README.md) for the full map.
