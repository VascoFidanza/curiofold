# Responsive and Cross-Browser Validation

This document records Curiofold's executable responsive/browser quality gate. The normative requirements remain in `docs/design/RESPONSIVE_CROSS_BROWSER_STANDARDS.md`.

## Automated evidence

Run:

```bash
pnpm exec playwright install chromium firefox webkit
pnpm test:e2e
```

The suite renders the real application shell, public Story Detail, and browser-native Reader using synthetic published content. Test-only routes require `CURIOFOLD_E2E_FIXTURES=1` while running the development server and return Not Found in production.

| Concern               | Automated coverage                                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Widths                | Chromium at 320, 360, 375, 390, 430, 480, 768, 820, 917, 1024, 1280, 1440, 1920, and 2560 CSS pixels; Firefox and WebKit at 320, 768, 1440, and 2560.                                                        |
| Reflow                | No document-level horizontal overflow; primary headings and actions remain visible. The 320px case also provides the browser-independent reflow approximation required for a 200% zoomed 640px CSS viewport. |
| Content expansion     | Deliberately long Portuguese navigation labels exercise wrapping and action reachability.                                                                                                                    |
| Input and orientation | Chromium coarse-pointer/touch context and an 844×390 landscape viewport.                                                                                                                                     |
| Keyboard              | Skip link is first in DOM focus order and activates the main-content target. WebKit uses explicit focus because its Tab behavior follows the host Safari keyboard-navigation preference.                     |
| Motion                | `prefers-reduced-motion: reduce` results in non-smooth scrolling and near-zero transitions.                                                                                                                  |
| Accessibility         | axe-core scans the Story Detail fixture; semantic role assertions cover Story Detail, Reader, navigation, and primary actions.                                                                               |
| CI                    | GitHub Actions installs pinned Playwright Chromium, Firefox, and WebKit runtimes and executes the suite after the main quality job.                                                                          |

The test fixture intercepts progress persistence because this gate is provider-independent. Authenticated, database-backed progress remains covered by integration tests and must receive live environment evidence when Clerk and the preview database are connected.

The Reader/expanded-navigation matrix runs in four bounded viewport batches per
engine. The earlier single Chromium case performed 28 navigations under one
30-second test limit and timed out under both local and hosted contention on
2026-10-26. Batching retains every viewport/assertion and the same timeout; it
does not hide slow scenarios with larger deadlines or extra retries.

### Reader release acceptance — 2026-10-20 (CRFD-82)

The expanded browser test exposed two gaps that the earlier closed-settings scan
did not cover: the Reader skip-link target could not receive focus, and the progress
indicator was outside accessible landmarks. Main content and source-note targets now
use `tabIndex=-1` (programmatically focusable, not extra Tab stops); reading status
has a named region. The test activates the real skip link, opens settings with Enter,
changes text size with Space and verifies pressed state, scans expanded settings
with axe, then follows a citation and verifies focus on its source. Colour transitions
finish before scanning; no accessibility rule is disabled. WebKit uses explicit
control focus because of the same host Tab preference documented above.

This is local automated browser evidence, not a VoiceOver/NVDA or physical-device
sign-off. The manual release matrix below still applies.

### Live authenticated Reader performance — 2026-10-26 (CRFD-86)

Tested the canonical `development` Preview at commit `6339860`, deployment
`dpl_H4FUDFmwwbDttASKBDcLNowfSHZw`, using Playwright 1.63.0 / Chromium
153.0.8010.12. These were real entitled `/en/stories/lantern-atlas/read`
responses, not fixture routes or mocked APIs. The account and Library rendered
successfully before/after the Reader samples.

Profile: 390×844 CSS pixels, mobile/touch emulation, 4× CPU slowdown, 70ms
network latency, 1.6Mbps download / 750Kbps upload, browser HTTP cache disabled.
The application/database were already warm from authentication; none of these
samples establishes a cold-start bound. A fresh, isolated browser context used
an existing Clerk Development identity. The sign-in ticket expired after 60
seconds and stayed in memory; only the new acceptance session was revoked.
The owner's existing in-app browser session was preserved. Existing same-project
Vercel authentication was attached only to the exact Preview origin. No protection
setting, provider key or production resource changed.

| Sample | Document TTFB | Story DOM observed | LCP    | CLS       | Maximum observed interaction duration |
| ------ | ------------- | ------------------ | ------ | --------- | ------------------------------------- |
| 1      | 32.4ms        | 1085.3ms           | 1128ms | 0.0001373 | 80ms                                  |
| 2      | 113.0ms       | 1002.4ms           | 1060ms | 0.0001373 | 32ms                                  |
| 3      | 98.5ms        | 999.4ms            | 1060ms | 0.0001373 | 16ms                                  |

Measurement method and scope:

- Install buffered `PerformanceObserver`s before document navigation for
  `largest-contentful-paint`, `layout-shift`, `event` (16ms duration threshold)
  and `longtask`. Record navigation `responseStart` separately: a streamed
  document's first byte does not mean the entitled Story is ready.
- Observe `#story-content`, then allow a fixed four-second no-input observation
  window before interacting. Every final LCP element was paragraph `#block-route`
  inside the Story, not the loading shell or toolbar.
- Compute CLS using the maximum session window (one-second gap / five-second
  limit), excluding shifts following recent input. Do not simply sum every shift.
- Exercise six interactions per sample: open settings, Larger, Default, Wide,
  Standard and close settings. Verify the Larger state actually updates. Event
  Timing reported all six interaction IDs. The reported maximum is bounded lab
  interaction evidence, **not** population INP or production p75.
- No horizontal page overflow occurred. One long task per sample lasted
  103/88/71ms; no task exceeded 200ms in the observed windows. This is not proof
  of absence of jank in every future Story or device.
- Read authenticated account exports into memory before/after and compare wallet,
  ownership, purchases, ledger transactions and reversals: exactly unchanged.
  Normal Reader progress saves remained enabled. Checkout/unlock/deletion writes
  were blocked by the test driver; no purchase or account deletion was performed.
- Temporary test sessions, including two interrupted setup attempts, were revoked.
  No browser authentication state, tokens, exports, traces or paid text are committed.

The warm, short synthetic catalogue passes these bounded lab checks without a
runtime change. It does **not** certify a reviewed 5–10-minute launch Story,
physical mobile hardware, cold dependencies, production RUM/p75, or human
assistive-technology acceptance. Repeat against the approved launch catalogue
before public release; do not reopen the already-passed short-Reader case without
a regression. The previously documented cold Account sample remains disclosed.

## Manual release matrix

Automation does not honestly reproduce all physical-device and assistive-technology behavior. Before the relevant milestone or production release closes, record evidence for:

- current iOS Safari on a physical iPhone, portrait and landscape;
- current Android Chrome on a physical Android phone, portrait and landscape;
- Safari and Chrome browser chrome, safe-area insets, and virtual-keyboard behavior;
- browser zoom at 200% on Chrome, Firefox, Safari, and Edge;
- keyboard-only use with Safari keyboard navigation enabled;
- VoiceOver/Safari and NVDA/Firefox;
- actual low-power or constrained-network behavior for the Reader;
- approved Figma comparison at 375, 768, 1024, and 1440px.

The release owner records the device/OS/browser version, tested route, result, evidence link, defect link, and tester/date. A failed core journey, inaccessible action, clipped content, horizontal page scrolling, or material visual divergence blocks the gate.

Minimum actual screen-reader journey (both VoiceOver/Safari and NVDA/Firefox):

1. Use the canonical development Preview and sign in normally. Confirm the account
   heading, credits and purchase status can be understood without visual context.
2. Open Library and an already-owned Story. Navigate its headings/landmarks; activate
   “Skip to Story” and confirm reading begins in the main Story, not the toolbar.
3. Open “Reading settings” with the keyboard, change Larger/Default, and verify
   names, selected state and focus remain understandable. Close the settings.
4. Follow a source note and its return link. Confirm the citation, destination
   and return position are announced and usable. Do not open synthetic external
   reference domains.
5. Open Help and support and navigate its account/purchase help links. Record any
   silent, misleading, unreachable or focus-trapping control as a defect.

No purchase, new credit grant, deletion or production change is needed. Restore
test-only Reader preferences and leave the owner signed in. AX-tree inspection
and automated axe results do not substitute for this tester evidence.

## Explicit boundary

Curiofold v1 has no customer-facing PDF viewer. PDF-specific responsive/browser checks become applicable only if a later approved decision introduces one. The paid experience remains the semantic browser-native Reader.
