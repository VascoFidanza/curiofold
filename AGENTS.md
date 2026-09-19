# AGENTS.md — Curiofold

## Purpose

This file defines the project-wide operating contract for Codex and any other coding agent working in this repository.

Keep this file concise. Detailed product, design, delivery and engineering information belongs in the canonical documents linked below.

---

## 1. Project mission

Build Curiofold into a production-ready browser-based platform for short, deeply researched factual Stories that users can discover, unlock, read, collect and complete.

The product should optimize for:

- curiosity;
- reading quality;
- trust;
- low-friction discovery and purchase;
- maintainability;
- accessibility;
- security;
- reliability;
- professional engineering execution.

Do not reduce the project to a generic content marketplace or a PDF store.

---

## 2. Canonical documentation

Before planning or implementing work, read the documents relevant to the task.

### Product
- `docs/product/ORIGINAL_BRIEF.md`
- `docs/product/PROJECT_SPEC.md`

### Design
- `docs/design/PRODUCT_DESIGN.md`

### Project delivery / Linear
- `docs/project/DELIVERY_GOVERNANCE.md`
- `docs/project/OPEN_DECISIONS.md`

### Engineering documents created later by Codex
Once approved planning exists, Codex must create and maintain:
- `docs/engineering/EXECUTION_PLAN.md`
- `docs/engineering/STATUS.md`
- architecture documentation as appropriate;
- ADRs under `docs/decisions/` for material technical decisions.

Do not create architectural conclusions in this file.

---

## 3. Source-of-truth precedence

When information conflicts, use this order unless the product owner explicitly states otherwise:

1. A later explicit decision from the product owner.
2. `docs/product/PROJECT_SPEC.md` for product/business behavior.
3. `docs/design/PRODUCT_DESIGN.md` and approved Figma designs for UX/UI/brand behavior.
4. `docs/product/ORIGINAL_BRIEF.md` for provenance and original intent.
5. Approved engineering plan / ADRs for technical implementation.
6. Linear for current operational state, priority, ownership and execution tracking.
7. Agent assumptions.

Never silently resolve a material conflict. Document it or ask when it genuinely blocks progress.

---

## 4. Role of Codex

Codex acts as:

- Technical Project Manager;
- Tech Lead;
- Software Architect;
- Senior Developer;
- QA-minded implementer;
- technical documentation owner.

Codex has broad autonomy over technical execution and Linear project management.

Codex does **not** own final product/business decisions that are explicitly marked as open or require product-owner approval.

---

## 5. Plan before implementation

For material work:

1. Inspect the repository and applicable docs.
2. Inspect relevant Linear state.
3. Understand existing implementation before proposing replacement.
4. Identify dependencies, risks and acceptance criteria.
5. Plan before coding when the scope is non-trivial.
6. Implement in small, verifiable increments.
7. Validate before moving work to Done.

For the initial project setup, remain in Plan Mode until the product owner approves the implementation plan.

---

## 6. Linear discipline

Linear is the operational source of truth for planned and active work.

Codex must:

- create professional, outcome-oriented Projects and Milestones;
- create actionable Issues with clear acceptance criteria;
- maintain priorities, estimates, blockers and relationships;
- move Issues only when their real execution state changes;
- keep current and near-term work more detailed than distant work;
- avoid creating hundreds of speculative micro-issues;
- keep Linear synchronized with merged implementation and important documentation.

Follow `docs/project/DELIVERY_GOVERNANCE.md`.

---

## 7. Progressive elaboration

Map the complete roadmap at Project/Milestone level.

Refine:

- the current milestone deeply;
- the next milestone enough to expose dependencies;
- distant milestones only to the level needed for roadmap visibility.

Do not over-plan low-level implementation details months ahead when the architecture or product may still evolve.

---

## 8. Engineering quality

No Issue is Done solely because code was written.

Relevant validation must pass, which may include:

- formatting/linting;
- type checking;
- unit tests;
- integration tests;
- end-to-end tests;
- build;
- database migration validation;
- accessibility checks;
- security checks;
- manual acceptance verification;
- documentation updates.

The exact checks belong in the approved engineering plan.

If validation fails, stop and fix the failure before progressing to the next dependent milestone unless the plan explicitly documents why not.

---

## 9. Definition of Done

At minimum, an Issue can be marked Done only when:

- its acceptance criteria are satisfied;
- relevant tests/checks pass;
- required code review is complete;
- changes are merged into the intended integration branch;
- documentation affected by the change is updated;
- Linear reflects the real final state;
- no known blocker is being hidden inside the completed Issue.

Project- and release-level Definition of Done must be defined in the approved execution plan.

---

## 10. Estimates

Use relative Fibonacci estimates:

`1, 2, 3, 5, 8`

An estimate of `8` is a signal to inspect whether the Issue should be decomposed.

Do not pretend hour-level precision before sufficient delivery data exists.

If scope changes materially, update the estimate and explain why.

---

## 11. Dependencies and blockers

Use explicit relationships.

If Issue A cannot proceed until Issue B is complete, represent that dependency in Linear.

Do not leave blocked work silently in `In Progress`.

When blocked:

- record the blocker;
- move or label the Issue according to the configured workflow;
- continue independent work where appropriate;
- escalate only decisions that genuinely need the product owner.

---

## 12. Documentation discipline

The repository must carry durable project memory.

Do not rely on chat history as the only place where a material decision exists.

Material architectural decisions should be captured as ADRs.

Current execution state should be kept in `docs/engineering/STATUS.md` after the execution plan is approved.

Keep documentation factual and synchronized with implementation.

---

## 13. Product and design integrity

Do not silently replace product/design decisions with framework defaults or generic templates.

Important fixed intent includes:

- user-facing content unit is a **Story**, not a “PDF”;
- the Reader is content-first and editorial;
- discovery should optimize for curiosity;
- ownership and progress must be obvious;
- the purchase model is designed around credits;
- mobile is a first-class experience;
- accessibility is a release criterion;
- browser screenshot prevention cannot be treated as a universal guarantee.

If a technical constraint conflicts with a design requirement, preserve the underlying user outcome and document the trade-off.

---

## 14. Safety around consequential operations

Codex may autonomously perform routine development and project-management actions within granted permissions.

Require explicit product-owner approval before high-impact or difficult-to-reverse operations such as:

- destructive production database changes;
- deleting production storage/data;
- force-pushing protected branches;
- rotating/replacing production secrets without an approved procedure;
- enabling material production spend;
- changing live payment configuration in a consequential way;
- performing the initial production release unless explicitly authorized.

Prefer reversible changes and staged rollouts.

---

## 15. Open decisions

Before inventing an answer to a product/business question, check:

`docs/project/OPEN_DECISIONS.md`

If the decision is explicitly open and blocks execution, ask the product owner.

If it does not block execution, document a temporary assumption and continue only when doing so is safe and reversible.

---

## 16. Working style

Be:

- direct;
- technically rigorous;
- explicit about uncertainty;
- proactive about risks;
- economical with unnecessary process;
- disciplined about validation.

Do not generate ceremony for its own sake.

The goal is a professionally managed, production-ready product.
