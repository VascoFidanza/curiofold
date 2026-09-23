# Reader and Entitlement Boundary

## Purpose

This document records the implemented walking-skeleton boundary for owner-only Story reading. It complements ADR-0006, ADR-0007, ADR-0009 and ADR-0013; those records remain authoritative for the long-term decisions.

## Access sequence

The private route is `/{locale}/stories/{slug}/read`. Every request resolves access in this order:

1. Verify the Clerk session at the server resource boundary.
2. Link the provider subject to the internal user and enforce database-owned account state.
3. Require the `story.read-owned` capability.
4. Query the requested immutable Story version through an active entitlement for that internal user and stable Story identity.
5. Convert the stored document into the allowlisted Reader projection.
6. Render semantic HTML in the dedicated Reader shell.

Identity failure stops before Story lookup. A staff role does not imply ownership. An unauthenticated reader is returned to the local sign-in route with an allowlisted Reader return path; an authenticated but unentitled user returns to the public Story Detail page. Unknown Stories remain not found.

## Entitlement record

`story_entitlements` has one unique row per internal user and stable Story. It therefore covers every published locale without duplicating ownership. Its active/revoked state and revocation timestamp are protected by database checks.

`entitlement_events` is append-only evidence for grant, revoke and restore transitions. The initial grant command is transactionally idempotent: concurrent attempts create one entitlement and one grant event. A revoked entitlement is not silently restored by another grant attempt.

Grant sources are intentionally narrow:

- `seed` for synthetic nonproduction fixtures;
- `support` for the later guarded operator workflow;
- `unlock` for the later wallet transaction.

There is no browser or public API that can grant an entitlement in this milestone. Wallet debit and payment issuance remain part of Project 3.

## Private Story projection

The Reader DTO contains approved Story text, stable block identifiers, reading units, user-facing source metadata and media accessibility/attribution data. It excludes Blob object keys, rights-administration fields, accountable-reviewer identity and the raw persisted document wrapper.

The renderer supports paragraph, section heading, pull quote, fact box, image, source note and end-matter blocks. Sources receive stable endnote targets and accessible citation labels. Story-authored external links, source URLs and rights references are schema-limited to HTTPS before they can reach the renderer. The initial media fallback preserves alt text, caption and attribution without exposing the private object key; authenticated private-Blob delivery remains a later environment task.

Text-size and reading-width preferences are local, non-sensitive browser preferences. Storage denial does not interrupt reading.

## Progress, resume and completion

Progress is locale-specific and stored once per internal user, stable Story and locale. The authenticated mutation is:

`PUT /api/v1/reading-progress/{storyId}/{locale}`

The strict JSON body contains the immutable version ID, stable block ID, integer within-block reading-unit offset, end-marker state and monotonically increasing client sequence. The endpoint rejects cross-origin mutations, then validates the session, account capability, active entitlement, Story/locale/version relationship and anchor against server-owned Story documents. Unknown and unowned identifiers share the same not-found response.

The percentage is based on server-computed reading units rather than viewport pixels. The mutable resume anchor may move backward; the high-water percentage may only increase. A duplicate or out-of-order sequence returns canonical state without mutating the row. PostgreSQL initializes the unique progress row idempotently and locks it before comparing or applying a sequence, so concurrent browser updates cannot regress accepted state.

Completion requires both the final end marker and at least 95% high-water progress. Once set, completion is durable. Completion in any locale is treated as Story completion while each locale keeps its own resume anchor.

When a correction publishes a new immutable version:

1. preserve the anchor and proportional offset when its stable block ID survives;
2. otherwise resume at the end of the nearest surviving predecessor;
3. otherwise map the weighted percentage onto the new version.

The Reader restores the resolved anchor, shows a thin accessible progress indicator and throttles writes. Its retry queue stores only opaque Story/version IDs, locale, block ID, offset, sequence and end-marker state—never Story text, identity or provider tokens. A failed write is retained in versioned local storage and retried when connectivity returns; server sequence handling makes repeated delivery safe.

## Response policy

Reader responses are dynamic and carry:

- `Cache-Control: private, no-store, max-age=0, must-revalidate`;
- `Pragma: no-cache`;
- `X-Robots-Tag: noindex, nofollow, noarchive`;
- page-level noindex/nofollow metadata;
- the global Curiofold framing, MIME, referrer and capability headers.

There is no PDF/embed/download path. Browser selection, zoom, keyboard scrolling and assistive technology remain available.

## Remaining acceptance gates

The implementation can merge independently, but CRFD-19 and CRFD-16 cannot be Done until the preview database and development Clerk instance allow an end-to-end entitled session. That gate must prove anonymous, wrong-user, unentitled, revoked and entitled behavior; live response headers; progress across refresh/session/reconnect; required responsive widths; keyboard/zoom; provider UI transition; and final visual acceptance. Private media delivery must also replace the explicit fallback before a Story containing launch media is accepted.
