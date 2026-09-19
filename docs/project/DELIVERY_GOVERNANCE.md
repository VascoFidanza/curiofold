# Curiofold — Delivery Governance & Linear Operating Model

**Version:** 1.0  
**Status:** Pre-planning operating policy  
**Owner:** Product Owner for policy; Codex for execution  
**Applies to:** Linear, engineering planning, implementation tracking, release management

---

# 0. Purpose

This document defines **how** Codex should professionally manage Curiofold as both technical project manager and primary developer.

It does not define software architecture.

Architecture must be proposed after repository/product/design inspection in Plan Mode.

The purpose of this operating model is to avoid:

- a flat backlog with no roadmap;
- speculative hundreds of micro-tasks;
- stale Linear status;
- estimates with false precision;
- coding before dependencies are understood;
- “Done” issues with missing validation;
- important decisions existing only in chat.

---

# 1. Operating principle

Codex is expected to manage delivery continuously, not only write code.

The delivery loop is:

> **Understand → Plan → Materialize → Execute → Validate → Review → Merge → Update → Re-plan**

Linear must represent reality.

Git/repository documents must carry durable technical memory.

---

# 2. Initial planning gate

Before implementation begins, Codex must:

1. read all applicable canonical docs;
2. inspect the existing repository;
3. inspect Git history/current state;
4. inspect connected Linear workspace configuration;
5. identify existing work rather than duplicate it;
6. propose architecture;
7. propose complete roadmap;
8. propose Linear hierarchy;
9. identify dependencies/critical path;
10. identify risks/open decisions;
11. define validation/quality gates;
12. define v1 Definition of Done.

During this initial phase:

- remain in Plan Mode;
- do not implement product code;
- do not populate a huge backlog;
- do not make difficult-to-reverse architectural changes silently.

The product owner approves the plan before materialization/execution.

---

# 3. Recommended Linear hierarchy

Codex should confirm actual workspace capabilities before creation.

Preferred conceptual hierarchy:

```text
Initiative / top-level launch objective
└── Project
    └── Milestone
        └── Issue
            └── Sub-issue (only when useful)
```

The exact names/projects must come from the approved technical plan.

Do not force the sample roadmap from chat into Linear without re-evaluating it against the repository and chosen architecture.

---

# 4. What each level means

## Initiative

Use for the top-level business/technical outcome such as:

`Curiofold v1 — Production Launch`

Only if supported and useful in the connected workspace.

---

## Project

A Project should represent a significant outcome/workstream with a clear finish condition.

Good:
- a coherent product or engineering outcome;
- several milestones;
- meaningful project-level health.

Bad:
- a single implementation task;
- a generic dumping ground such as “Backend”.

Projects should be outcome-oriented where practical.

---

## Milestone

A Milestone represents a meaningful chapter/stage gate inside a Project.

A milestone must have:

- purpose;
- completion criteria;
- dependency context;
- verifiable exit gate.

Prefer milestones that can be objectively closed.

---

## Issue

An Issue is the normal independently actionable unit of execution.

A good Issue should usually be:

- understandable on its own;
- testable;
- estimable;
- narrow enough to complete without hiding several unrelated outcomes.

---

## Sub-issue

Use when decomposition materially improves:

- parallelism;
- clarity;
- review;
- dependency management.

Do not create sub-issues merely to simulate activity.

---

# 5. Progressive elaboration

Codex must maintain a complete roadmap without pretending distant implementation details are known.

### Current milestone
Refine deeply:
- actionable Issues;
- dependencies;
- estimates;
- acceptance criteria;
- validation.

### Next milestone
Refine enough to:
- expose dependencies;
- identify risks;
- prepare handoff.

### Distant milestones
Keep:
- objectives;
- rough scope;
- major dependencies;
- known risks.

Avoid speculative low-level micro-tasks for distant work.

---

# 6. Issue template

Every non-trivial implementation Issue should contain the information necessary for another senior engineer to understand it.

Recommended format:

```markdown
## Context
Why this work exists.

## Goal
Concrete outcome.

## Scope
Included behavior/work.

## Out of scope
Explicit exclusions when ambiguity is likely.

## Acceptance criteria
- [ ] Observable criterion 1
- [ ] Observable criterion 2
- [ ] Observable criterion 3

## Dependencies
Blocking / blocked-by relationships.

## Implementation notes
Only constraints or useful context; do not prematurely prescribe every code detail.

## Validation
Expected checks/tests.

## Definition of Done
Any issue-specific completion requirement beyond the project standard.
```

Small trivial Issues may use a shorter form.

---

# 7. Definition of Ready

An Issue should normally enter `Todo` only when:

- goal is understandable;
- scope is sufficiently bounded;
- acceptance criteria are testable;
- important dependencies are known;
- no unresolved product decision makes implementation speculative;
- required designs/specs exist or are intentionally unnecessary.

If not ready, keep it in Backlog or the workspace equivalent.

---

# 8. Workflow

Codex should inspect existing team statuses before changing workflow configuration.

Preferred conceptual flow:

```text
Backlog
→ Todo
→ In Progress
→ In Review
→ Ready to Merge
→ Done
```

If the team already has an equivalent workflow, reuse it rather than creating redundant statuses.

Optional:
- Canceled
- Duplicate

Blocked should preferably be represented by issue relationships and/or the team's established blocked mechanism rather than lying about work being active.

---

# 9. State transition rules

## Backlog → Todo
Only when Definition of Ready is met.

## Todo → In Progress
Only when implementation actually begins.

## In Progress → In Review
Only when:
- implementation is materially complete;
- relevant automated checks are passing locally/CI as appropriate;
- the change is ready for review.

## In Review → Ready to Merge
When review requirements are satisfied and remaining work is administrative/merge-oriented.

## Ready to Merge → Done
Only after:
- intended code is merged;
- acceptance criteria are satisfied;
- required docs are updated;
- Linear references/state are correct;
- no hidden follow-up is required for the Issue to be truthful.

Do not mark Done merely because a PR exists.

---

# 10. Estimates

Use relative Fibonacci points:

```text
1 2 3 5 8
```

Interpretation is relative effort/complexity/uncertainty, not hours.

Guidance:

- `1` — very small, low uncertainty;
- `2` — small;
- `3` — normal bounded work;
- `5` — substantial but coherent;
- `8` — large/high uncertainty; inspect for decomposition.

An `8` is allowed, but Codex must explicitly consider whether splitting produces clearer delivery.

Do not manufacture hour estimates unless the product owner later specifically requests scheduling forecasts.

---

# 11. Priorities

Use the workspace's native priority model.

Conceptually:

- Urgent — production/security/blocking incident or truly critical launch blocker.
- High — critical path / near-term milestone.
- Medium — normal committed work.
- Low — useful but non-critical.
- No priority / backlog — not currently scheduled.

Do not mark everything High.

Priority should express trade-offs.

---

# 12. Dependencies

Dependencies must be explicit.

Use:
- blocks;
- blocked by;
- related to;
- duplicate where relevant.

The roadmap should make the critical path visible.

A blocked Issue should not remain silently `In Progress` for days as though work is proceeding normally.

---

# 13. Labels

Codex should keep labels small and structured.

Potential label groups, subject to workspace conventions:

### Type
- feature
- bug
- tech-debt
- infrastructure
- security
- documentation
- research/spike

### Area
Only useful stable domains, for example:
- auth
- reader
- content
- payments
- discovery
- library
- design-system
- analytics

Avoid creating a label for every noun in the product.

---

# 14. Cycles

Recommended starting cadence:

> **1-week cycles**

Reason:
- small owner/agent team;
- fast feedback;
- high ability to adjust;
- easier calibration of throughput.

For the first few cycles, treat velocity as calibration data rather than a promise.

Only place realistically executable work into the active cycle.

Do not move the entire roadmap into a cycle.

---

# 15. Near-term planning

At the start of a cycle or milestone:

1. review blockers;
2. confirm priority;
3. confirm Definition of Ready;
4. confirm estimates;
5. check available capacity/parallelism;
6. choose the smallest coherent set of work that advances the critical path.

Codex may reorganize near-term work when new technical information appears, but must keep Linear accurate.

---

# 16. Project updates

Codex should publish/update concise project health regularly.

Recommended cadence once active:
- weekly;
- additionally when health materially changes.

Recommended structure:

```markdown
## Health
On track / At risk / Off track

## Completed
What materially finished.

## Current
What is actively being executed.

## Next
Immediate next outcomes.

## Risks / blockers
Only real risks.

## Changes
Material scope, estimate, architecture or sequencing changes.
```

Do not write status theatre.

---

# 17. Health rules

### On track
No material threat to current milestone/project objective.

### At risk
A credible issue may cause delay, quality reduction or scope change if unresolved.

### Off track
Current objective/date/scope cannot reasonably be met without intervention.

Health must reflect evidence, not optimism.

---

# 18. Definition of Done — Issue

Standard minimum:

- acceptance criteria met;
- relevant implementation complete;
- relevant validation green;
- review complete;
- merged into intended branch;
- docs updated where required;
- Linear state accurate.

Issue-specific DoD can add stronger requirements.

---

# 19. Definition of Done — Milestone

A Milestone is Done only when:

- all required Issues are Done;
- milestone exit criteria pass;
- no unresolved critical defect invalidates the milestone;
- relevant documentation is current;
- dependent milestone can begin without hidden prerequisites.

---

# 20. Definition of Done — Project

A Project is Done only when:

- its outcome exists, not merely its task list;
- all required Milestones pass;
- required cross-cutting validation passes;
- project documentation reflects final state;
- known deferred work is explicitly moved elsewhere rather than hidden.

---

# 21. Definition of Done — v1

Codex must propose the final technical v1 Definition of Done during Plan Mode.

It should cover at least:

- functional acceptance;
- security;
- accessibility;
- performance;
- resilience;
- data integrity;
- observability;
- deployment;
- rollback/recovery;
- documentation;
- legal/product dependencies that engineering must support;
- production smoke tests.

No “works on my machine” release.

---

# 22. Validation-first execution

Each milestone should define the checks required to exit it.

Potential checks include:

- lint;
- formatting;
- typecheck;
- unit;
- integration;
- e2e;
- migration tests;
- accessibility;
- dependency/security scanning;
- build;
- deployment validation;
- smoke tests;
- manual acceptance.

Use the relevant subset, not cargo-cult checks.

When a critical check fails, fix it before declaring dependent work complete.

---

# 23. Bugs discovered during implementation

If a bug is:

### Small and directly caused by the current Issue
Fix within the Issue when scope remains clear.

### Independent or substantial
Create/link a Bug Issue.

### Blocking current work
Represent the blocker and update status/health as appropriate.

Do not bury substantial bugs in unrelated issue comments.

---

# 24. Scope changes

When implementation reveals materially larger/smaller scope:

1. update the Issue;
2. update estimate if appropriate;
3. document why;
4. adjust dependencies/sequence;
5. update Project health if material.

Do not preserve an obsolete estimate merely to make metrics look stable.

---

# 25. Architecture decisions

Material technical decisions must not live only in Linear comments.

Create an ADR when a decision:

- is difficult to reverse;
- affects multiple subsystems;
- creates an important constraint;
- has meaningful trade-offs future engineers need to understand.

Link the ADR from relevant Linear work.

---

# 26. Spikes / research

Use a time/scope-bounded Spike Issue when uncertainty cannot responsibly be resolved by normal implementation planning.

A Spike must output a decision/recommendation, not simply “research happened”.

Good Spike output:
- findings;
- options;
- recommendation;
- risks;
- next implementation change.

---

# 27. Pull requests / commits

Linear issues should be traceable to implementation.

Where tooling supports it, include issue identifiers in:

- branch names;
- PR titles/descriptions;
- commit context.

Do not create meaningless commits solely to manipulate tracking.

---

# 28. Documentation updates during execution

After the engineering plan is approved, Codex maintains:

- `docs/engineering/EXECUTION_PLAN.md`
- `docs/engineering/STATUS.md`
- relevant ADRs.

Update Product/Design documents only when the product owner has approved a product/design change.

Do not rewrite product requirements to match implementation convenience.

---

# 29. Product-owner escalation

Ask the product owner when:

- a genuinely open product/business choice blocks work;
- architecture trade-off materially changes user experience/cost/risk;
- production consequence requires approval;
- the requirement is internally contradictory and cannot be safely resolved.

Do not ask for:
- normal implementation choices within the approved mandate;
- trivial naming of internal code;
- reversible technical details with a clear professional default.

---

# 30. Autonomy boundary

Codex may autonomously:

- organize Linear;
- create/update Issues;
- estimate;
- manage dependencies;
- create branches/PRs;
- implement code;
- add tests;
- update engineering docs;
- improve internal maintainability;
- execute normal development/staging validation.

Require explicit approval for high-impact production actions described in root `AGENTS.md`.

---

# 31. Initial plan materialization

After the product owner approves the Plan Mode proposal, Codex should:

1. persist the approved plan to `docs/engineering/EXECUTION_PLAN.md`;
2. create/update `docs/engineering/STATUS.md`;
3. create required ADRs for already-approved foundational decisions;
4. materialize the roadmap into Linear;
5. fully refine the current execution stage;
6. sufficiently refine the next stage;
7. establish dependencies/critical path;
8. create the first active cycle;
9. verify repository docs and Linear are internally consistent;
10. identify the first Issue to move to In Progress.

Only then begin implementation.

---

# 32. Anti-patterns

Avoid:

- hundreds of cards created before architecture is understood;
- “Implement backend” mega-Issues;
- issues with no acceptance criteria;
- every task marked High;
- fake hour precision;
- stale In Progress issues;
- hidden blockers;
- milestones closed because “most of it works”;
- architecture decisions only in chat;
- rewriting product requirements to fit chosen technology;
- treating Linear as a passive todo list.

The objective is **professional delivery management**, not administrative volume.
