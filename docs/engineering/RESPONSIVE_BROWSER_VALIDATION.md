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

## Explicit boundary

Curiofold v1 has no customer-facing PDF viewer. PDF-specific responsive/browser checks become applicable only if a later approved decision introduces one. The paid experience remains the semantic browser-native Reader.
