# Curiofold — Open Decisions Register

**Status:** Living document  
**Owner:** Product Owner for product/business decisions; Codex may add newly discovered decisions  
**Rule:** Do not silently decide an item marked `Product Owner` if it materially changes the product.

---

# How to use this file

Each unresolved decision should contain:

- `ID`
- `Status`
- `Owner`
- `Blocking point`
- `Decision`
- `Context`
- `Options / constraints`
- `Resolution` when decided
- `Destination` where the durable decision was incorporated

Statuses:

- `OPEN`
- `PROVISIONAL`
- `DECIDED`
- `SUPERSEDED`

Once decided, do not delete history. Record the resolution and update the canonical Product Spec/design/ADR as appropriate.

---

## OD-001 — Final brand clearance

**Status:** OPEN  
**Owner:** Product Owner  
**Blocking point:** Public brand/domain commitment and launch  
**Decision:** Whether `Curiofold` is legally/commercially cleared and becomes the final public brand.

### Context
Curiofold is the working brand used by the design system.

### Required before resolution
- trademark screening;
- domain decision;
- relevant handle/name conflict review.

### Resolution
Pending.

### Destination
Update `docs/product/PROJECT_SPEC.md` and `docs/design/PRODUCT_DESIGN.md` after resolution.

---

## OD-002 — Launch languages

**Status:** OPEN  
**Owner:** Product Owner  
**Blocking point:** Final content/localization scope, launch operations and some QA planning  
**Decision:** Which languages ship at v1 launch.

### Original requested set
- PT-PT
- PT-BR
- EN
- ES
- FR
- DE
- IT
- NL

### Constraint
Engineering should be localization-ready regardless of launch subset.

### Resolution
Pending.

### Destination
`docs/product/PROJECT_SPEC.md`

---

## OD-003 — Initial credit packs / commercial pricing

**Status:** DECIDED

**Owner:** Product Owner  
**Blocking point:** Production payment configuration / launch  
**Decision:** Direct Story price, credit unlock cost and top-up pricing shape.

### Superseded design baseline
- €5 → 5 credits, €10 → 10 credits and €20 → 20 credits were illustrative no-bonus packs.
- The earlier design offered only the one-credit path.

### Constraint
Do not introduce fake discounts without an explicit business decision.

### Resolution
On 2026-09-26 the Product Owner explicitly set a fixed direct price of €1.30 (130 EUR cents) per Story and retained the alternative cost of one credit per Story. Top-ups remain minimum €5, whole-euro amounts, with the implemented progressive bonus formula. No variable per-Story pricing is authorized. This decision does not resolve OD-007 tax, refund, withdrawal or receipt policy for live commerce.

### Destination
`docs/product/PROJECT_SPEC.md` and payment configuration/docs.

---

## OD-004 — Interest onboarding in v1

**Status:** OPEN  
**Owner:** Product Owner  
**Blocking point:** Only blocks onboarding/personalization scope, not core platform architecture  
**Decision:** Whether new users are asked to select areas of curiosity after registration.

### Current design recommendation
Optional and skippable; only useful if product actually uses the signal.

### Resolution
Pending.

### Destination
`docs/product/PROJECT_SPEC.md` / design spec if materially changed.

---

## OD-005 — “Request a topic” feature

**Status:** OPEN  
**Owner:** Product Owner  
**Blocking point:** Does not block core v1  
**Decision:** Whether no-results/search experiences include a user topic-request feature at launch.

### Resolution
Pending.

---

## OD-006 — Exact AI-transparency public wording

**Status:** OPEN  
**Owner:** Product Owner / Editorial  
**Blocking point:** Public launch content/methodology surfaces  
**Decision:** Exact public wording that explains AI-assisted research/writing and editorial review.

### Product constraint
Do not misrepresent the production process.

### Engineering requirement
System should be capable of displaying methodology/source/review metadata.

### Resolution
Pending.

---

## OD-007 — Final digital-content legal policy

**Status:** OPEN  
**Owner:** Product Owner with appropriate legal/accounting advice  
**Blocking point:** Production checkout/public launch  
**Decision:** Final terms around VAT/tax, refund policy, digital-content access/withdrawal consent, invoicing/receipts and associated legal copy.

### Engineering responsibility
Provide implementation hooks required by the validated policy.

### Resolution
Pending.

---

## OD-008 — Initial launch catalogue and editorial accountability

**Status:** OPEN
**Owner:** Product Owner / Editorial
**Blocking point:** Launch catalogue gate
**Decision:** Define the initial Story list, accountable human reviewer and minimum acceptance threshold for launch.

### Constraint
Every launch Story must have reviewed factual claims, credible sources, complete metadata and no placeholder content.

### Resolution
Pending.

---

## OD-009 — Media licensing and attribution policy

**Status:** OPEN
**Owner:** Product Owner with appropriate legal/editorial advice
**Blocking point:** Publication of launch media
**Decision:** Define acceptable media sources, evidence, licence categories, attribution rules and takedown procedure.

### Engineering requirement
Publication validation will require rights, attribution, alt text and provenance metadata.

### Resolution
Pending.

---

## OD-010 — Spent-credit treatment after refund or chargeback

**Status:** OPEN
**Owner:** Product Owner with appropriate legal/accounting advice
**Blocking point:** Reversal/support Milestone and live commerce
**Decision:** Choose whether spent credits lead to negative balance, spending suspension, entitlement revocation or manual review.

### Engineering default
The ledger and credit-lot model will retain enough provenance to implement the approved policy without mutating history.

### Resolution
Pending.

---

## OD-011 — Merchant versus merchant-of-record model

**Status:** OPEN
**Owner:** Product Owner with appropriate legal/accounting advice
**Blocking point:** Selection and live configuration of the payment provider
**Decision:** Confirm whether Curiofold sells directly through Stripe or requires a merchant-of-record provider.

### Engineering default
Stripe Checkout is the provisional implementation behind a provider adapter.

### Resolution
Pending.

---

## OD-012 — Initial editorial workflow acceptance

**Status:** PROVISIONAL
**Owner:** Product Owner / Editorial
**Blocking point:** Editorial operations Milestone
**Decision:** Confirm that Git-reviewed structured Story documents are operationally acceptable for the initial content team.

### Engineering default
Proceed with Git-backed authoring. Reconsider a headless CMS when nontechnical editors require independent routine publishing.

### Resolution
Provisional default approved as part of the Master Engineering & Delivery Plan; validate with the actual editorial operator before Milestone 2.2 closes.

---

# Technical decisions intentionally NOT listed here

The following should be decided by Codex during Plan Mode unless a product constraint emerges:

- framework;
- database;
- hosting;
- auth provider;
- payment architecture;
- content storage/rendering;
- progress algorithm;
- analytics provider;
- CI/CD stack;
- observability;
- testing tools.

These are engineering decisions, not product-owner questions by default.
