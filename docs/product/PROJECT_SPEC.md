# Curiofold — Product Specification

**Version:** 1.0  
**Status:** Pre-engineering planning baseline  
**Date:** 2026-09-19  
**Owner:** Product Owner  
**Technical planning owner:** Codex after Plan Mode approval

---

# 0. Purpose and interpretation

This document is the normalized product/business specification that Codex should use before technical planning.

It is based on:

- `ORIGINAL_BRIEF.md` — the original project overview supplied by the product owner;
- `../design/PRODUCT_DESIGN.md` — subsequent product-design decisions and constraints.

This file deliberately distinguishes between:

1. **Original requirement** — directly supported by the original brief.
2. **Adopted product/design decision** — a current product/design direction documented after analysis.
3. **Known constraint** — a limitation that changes how an original requirement can realistically be implemented.
4. **Open decision** — deliberately unresolved and not to be invented silently by engineering.

Where a later explicit product-owner decision differs from this file, update this specification.

---

# 1. Product vision

Curiofold is a browser-based platform for short, compelling, deeply researched factual Stories across many areas of knowledge.

The experience should make subjects such as history, sport, technology, food, religion, science and other areas accessible and enjoyable in a few minutes.

The commercial model is based on a growing catalogue of low-cost, high-curiosity content.

---

# 2. User-facing content unit

## Original requirement

The original concept defined each sellable unit as:

- a short PDF;
- maximum approximately 10 pages;
- one specific topic;
- friendly, narrative language;
- not a technical/encyclopedic article;
- fixed initial price of €1.

## Adopted product/design decision

The user-facing unit is called a:

> **Story**

Do not market the product as a “PDF store”.

“PDF” may remain an internal production/export format, but the user should experience responsive browser-native reading.

A Story should normally feel consumable in approximately **5–10 minutes**.

The “maximum 10 pages” requirement describes the intended compactness of the original format; it must not force the web Reader into artificial paginated PDF pages.

---

# 3. Value proposition

Curiofold should let a person satisfy a specific curiosity quickly without needing to perform long-form research.

The intended product qualities are:

- interesting enough to start immediately;
- concise;
- factually credible;
- deeply researched;
- human-quality storytelling;
- comfortable to read;
- easy to discover;
- easy to collect/complete;
- naturally connected to another relevant Story.

The platform must not feel like:

- an academic portal;
- a generic AI-content site;
- a self-help book-summary clone;
- a file marketplace;
- a conventional PDF viewer.

---

# 4. Content scope

## Original requirement

Initial example areas:

- History
- Sport
- Technology
- Food
- Religion

The catalogue should expand according to user interest.

## Adopted product/design direction

The information architecture should support a broad and growing catalogue, including additional areas such as:

- Science
- Space
- Culture
- Business
- Psychology
- Engineering
- Nature
- Medicine
- Geography
- Design

These additional categories are not a mandatory launch catalogue. They demonstrate the intended extensibility.

---

# 5. Research and editorial quality

## Original requirements

Content creation is AI-assisted and must:

- research deeply;
- rely on credible sources;
- use scientific articles, books, reputable opinion/editorial sources and trustworthy internet sources as appropriate;
- avoid invention and hallucination;
- produce final prose that reads naturally and humanly;
- support translation/localization.

## Product requirement

Engineering must support an editorial workflow where content can be:

- researched;
- reviewed;
- corrected;
- versioned/updated;
- localized;
- published;
- unpublished when necessary.

The product must not rely on unverifiable AI output being published automatically without appropriate review.

The exact content-production architecture is intentionally left to Codex planning.

---

# 6. Credibility and transparency

The product should be able to expose credible research provenance through user-facing mechanisms such as:

- `Sources & notes`;
- methodology information;
- update date;
- editorial-review language.

Do not use misleading claims such as “100% true” or “zero hallucinations”.

The final public wording around AI assistance is a product/editorial decision and may evolve, but the system must be capable of supporting transparent source/review information.

---

# 7. Languages

## Original requirement

The initial brief requests support for:

- Portuguese — Portugal (PT-PT)
- Portuguese — Brazil (PT-BR)
- English
- Spanish
- French
- German
- Italian
- Dutch

## Current product constraint

The product and data model should be localization-ready.

The exact set of **launch languages** remains an open product decision.

Engineering must not assume PT-PT and PT-BR are one locale.

See `../project/OPEN_DECISIONS.md`.

---

# 8. Platform scope

## Original requirements

The product is:

- browser-based;
- responsive;
- usable on iPhone;
- usable on Android;
- usable on iPad/tablet;
- usable on computers;
- usable on external monitors;
- not dependent on a native App Store/Google Play application.

## Product requirement

Mobile web is a first-class experience, not a reduced desktop view.

Native applications are out of scope for the initial product unless later explicitly added.

---

# 9. Public discovery vs authenticated ownership

## Original requirement

An account is required to buy and read content.

## Adopted UX interpretation

Anonymous visitors may browse public discovery surfaces and Story Detail/preview pages.

Authentication is required to:

- purchase credits;
- unlock a Story;
- read full paid content;
- preserve reading progress;
- access Library;
- access account/wallet/history;
- use personal progress/collection features.

If the user enters authentication from a Story, they should return to that Story afterward.

---

# 10. Discovery

## Original requirement

The site must include:

- filters by area;
- a grid/catalogue of available content.

## Adopted product requirements

Discovery should support:

- Discover/Home;
- category browsing;
- search;
- filtering;
- Story cards;
- relevant editorial collections;
- continuation for in-progress reading;
- related Stories after completion.

The exact recommendation algorithm may evolve. Do not fake personalization or popularity before real data exists.

---

# 11. Story pricing and credits

## Original requirement

Initial fixed price:

> €1 per PDF.

## Adopted product/design decision

The user-facing unit is:

> **1 Story = 1 credit**

The purpose is to preserve the simple “one euro / one item” mental model while avoiding a separate payment transaction for every Story.

Initial design assumes packs such as:

- €5 → 5 credits
- €10 → 10 credits
- €20 → 20 credits

These exact pack values are a current design baseline and may be changed later by business decision.

Product behavior must make the following clear:

- current credit balance;
- cost to unlock;
- ownership after unlock;
- zero-credit recovery path;
- purchase history.

Exact payment provider/architecture is a Codex technical decision subject to business/legal constraints.

---

# 12. Unlock / entitlement model

A successfully unlocked Story belongs in the user's Library.

The UI should distinguish at least:

- Locked
- Owned / unread
- Owned / in progress
- Owned / completed

An owned Story must never continue to present a purchase CTA as though it were locked.

Unlocking must be robust against duplicate/ambiguous payment or entitlement states.

The exact entitlement data model is an engineering decision.

---

# 13. Reading experience

## Original requirements

- No user-facing download.
- Full reading occurs inside the platform.
- Reading adapts to device/browser.
- Progress is tracked per purchased item.

## Adopted product/design decision

The Reader must be browser-native and responsive rather than a conventional PDF embed.

The Reader should be:

- calm;
- editorial;
- content-first;
- readable;
- accessible;
- resumable.

It must support enough structure for:

- title/deck;
- body;
- section headings;
- images/diagrams;
- pull quotes;
- fact boxes;
- source notes/end matter.

Exact content rendering/storage is a Codex technical decision.

---

# 14. Reading progress

## Original requirements

The product tracks:

- per-item reading percentage;
- aggregate read percentage relative to purchased content;
- future gamification.

## Product requirement

Progress must:

- persist across sessions;
- allow a user to continue approximately where they left off;
- distinguish unread / in progress / completed;
- be visible in Library;
- support collection/category progress later.

The exact progress algorithm is deliberately left to engineering.

It should represent meaningful consumption rather than produce obviously misleading percentages.

---

# 15. Library

An authenticated user needs a personal Library containing unlocked Stories.

Minimum useful states:

- all;
- unread;
- in progress;
- completed.

The Library should make continuation easy.

Empty state should direct the user back to discovery.

---

# 16. Collections and long-term retention

The product should support editorial Collections that group Stories around a coherent theme.

Examples from the design direction:

- Roman Empire
- Cold War close calls
- F1 engineering
- Space disasters
- Food that changed history

Collections should support progress and future gamification.

The longer-term metaphor is a personal “map of knowledge” or collection that fills as the user reads.

Complex XP/streak/social systems are not required for the MVP unless later added explicitly.

---

# 17. Completion and related discovery

Finishing a Story should not be a dead end.

Completion should support:

- clear completed state;
- relevant related Stories;
- collection progress where applicable;
- route back to Library;
- optional sharing of the public Story landing/detail link.

The core retention loop is:

> **Curiosity → Unlock → Read → Complete → Follow the next rabbit hole**

---

# 18. Content protection

## Original requirement

The brief requests that attempted screenshots produce a black screen.

## Known technical constraint

A normal browser application cannot universally guarantee blacked-out screenshots across all operating systems, browsers, devices and capture methods.

Therefore this cannot be an engineering acceptance criterion stated as a universal guarantee.

## Correct product objective

Engineering should:

> Make casual unauthorized copying/redistribution meaningfully harder without damaging legitimate reading usability or accessibility.

Codex should investigate appropriate controls such as:

- authenticated access;
- avoiding public direct PDF URLs;
- short-lived/signed access;
- watermarking;
- removal of obvious download paths;
- access/rate controls;
- server-side entitlement enforcement.

Do not treat “disable right-click” as meaningful content security.

---

# 19. Payments, legal and tax

The platform sells digital content/entitlements.

Before public production launch, the business must validate:

- VAT/tax treatment;
- invoices/receipts as applicable;
- digital-content withdrawal/consent requirements;
- refund policy;
- terms;
- privacy;
- payment-provider compliance.

Codex should design the product and implementation so these requirements can be met, but must not invent legal conclusions.

---

# 20. Analytics / learning loop

## Original requirement

The business should learn which topics sell best and use this information to guide future content.

## Product requirement

The implementation should support product analytics sufficient to understand:

- Story impressions/opening;
- detail views;
- unlock conversion;
- reading starts;
- completion;
- related-Story continuation;
- searches;
- filters/categories;
- Collection engagement.

Exact analytics tooling is a technical decision.

Analytics must not block the reading experience.

---

# 21. Core user journeys

At minimum, v1 must support:

## New user
Discover → Story Detail → Account → Credits → Unlock → Reader → Completion → Related Story

## Returning user with credits
Discover/Search → Story Detail → Unlock → Reader → Completion

## Resume
Library → Continue Story → Reader at saved position → Completion

## Search
Search → Results/filters → Story Detail

---

# 22. MVP product scope

## Must-have

- responsive browser application;
- public discovery;
- categories/filtering;
- search;
- Story Detail;
- account/auth;
- credit wallet/top-up;
- Story entitlement/unlock;
- Library;
- responsive Reader;
- reading progress/resume;
- completion state;
- related Stories;
- basic Collections;
- account/wallet/history;
- research/source presentation;
- accessibility baseline;
- production-ready quality appropriate to the approved engineering plan.

## Explicitly not required for initial MVP unless later approved

- native iOS/Android apps;
- social leaderboards;
- complex XP economy;
- friend system;
- community comments;
- user-generated Stories;
- advanced recommendation ML;
- elaborate streak mechanics.

---

# 23. Brand / design status

Working brand:

> **Curiofold**

Primary tagline:

> **Small stories. Big rabbit holes.**

Brand legal/domain clearance remains open.

Detailed UX/UI is in:

`../design/PRODUCT_DESIGN.md`

Referenced Figma:

`https://www.figma.com/design/MMhGFEM4kfTa6lHrrGrA8g`

---

# 24. Technical decisions intentionally left open

The Product Spec does **not** choose:

- frontend framework;
- backend framework;
- database;
- hosting provider;
- cloud architecture;
- authentication provider;
- payment integration architecture;
- content storage format;
- CMS/admin approach;
- Reader rendering implementation;
- progress algorithm;
- analytics provider;
- CI/CD tooling;
- observability stack;
- test frameworks.

Codex must investigate and propose these in Plan Mode rather than inheriting arbitrary product-owner guesses.

---

# 25. Product-quality principles

Engineering decisions should preserve:

1. Curiosity-first discovery.
2. Story, not PDF, as the product concept.
3. Low-friction unlock.
4. Clear ownership.
5. Excellent reading comfort.
6. Trust/credibility.
7. Seamless resume/progress.
8. Meaningful related discovery.
9. Mobile-first-class behavior.
10. Accessibility.
11. Security appropriate to paid content.
12. Maintainable technical foundations.

---

# 26. Open decisions

Canonical unresolved product/business choices are tracked in:

`../project/OPEN_DECISIONS.md`

Do not silently close them through implementation unless the decision is purely technical and within Codex's mandate.

---

# 27. Definition of product v1 Done

The exact technical release gate must be proposed by Codex and approved in the engineering execution plan.

At product level, v1 is not Done until a real user can reliably:

1. discover a Story;
2. understand what it is;
3. create/sign into an account;
4. obtain credits;
5. unlock a Story;
6. see correct ownership;
7. read comfortably on supported device sizes;
8. leave and resume with saved progress;
9. complete the Story;
10. find another relevant Story;
11. manage their Library/account/wallet;
12. encounter appropriate loading/error/empty states;
13. use the core experience with accessibility requirements respected.

A demo-only happy path is not sufficient for production-ready v1.
