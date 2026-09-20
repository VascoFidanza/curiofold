# Curiofold Code Design System

## Authority and scope

`docs/design/PRODUCT_DESIGN.md` remains the behavioral and token authority;
approved Figma work remains the visual authority. This document records only
how that foundation maps into code and which visual checks remain open. It does
not duplicate the full component or screen specification.

The baseline is light-first. Dark mode is not inferred or generated.

## Code ownership

- `packages/ui/src/tokens.css` owns primitive and semantic CSS custom
  properties, typography sizes, spacing, radii, elevation, motion and responsive
  gutters.
- `packages/ui/src/primitives.module.css` owns the small reusable foundation:
  brand treatment, page frame, button and loading/error state presentation.
- `apps/web/src/app/(product)/application-shell.*` owns product navigation and
  responsive shell composition.
- `apps/web/src/app/styles.css` owns the global reset, focus, selection and
  reduced-motion behavior.
- Reader-specific presentation will live outside the product shell so the
  Reader can remain quiet and editorial.

Screens and components consume semantic variables such as
`--cf-color-bg-base`, `--cf-color-text-primary` and
`--cf-color-action-primary`. Primitive variables exist for traceability but
must not become an invitation to assign arbitrary screen colours.

## Typography

Next.js self-hosts the selected Google font files at build time:

- Instrument Sans for product UI, navigation, headings and controls;
- Newsreader for the later Story Reader title, body and quotation styles.

System UI and Georgia are explicit fallbacks. The responsive type tokens follow
the mobile/tablet/desktop sizes in the design specification, including a Reader
body floor of 19px rather than conventional 16px UI copy.

## Responsive shell

The CSS custom-property gutter changes at the documented 480, 768, 1024 and
1280px design ranges. Below 768px the shell uses a compact top header and
safe-area-aware four-item bottom navigation. At and above 768px it uses the
desktop header. The layout deliberately switches to the mobile model when
browser zoom reduces the effective viewport.

All frequent controls have a minimum 44px target. Navigation labels may wrap
and use content-driven widths rather than fixed translations. The main content
has a keyboard skip target. Reader routes will be placed outside this product
route group so bottom navigation can be removed without client-side hiding.

## Interaction and state baseline

- focus uses the semantic 3px ring and is never globally removed;
- hover/pressed styles stay within the documented timing ranges;
- `prefers-reduced-motion` removes nonessential animation and smooth scrolling;
- loading uses a structural, labelled skeleton rather than an indefinite
  spinner;
- error states explain what happened and provide a real next action;
- button loading state sets `aria-busy` and prevents duplicate activation;
- selected navigation uses both colour and `aria-current`.

## Validation

Automated shell tests cover landmarks, skip navigation, current-page state,
long labels and axe-core rules supported by jsdom. Production build and
client-bundle checks remain mandatory. Browser checks are performed at 375,
768, 1024 and 1440px plus 200% zoom and reduced motion.

The current baseline has been verified in the production build at all four
acceptance widths. It has no horizontal overflow, switches navigation at the
768px boundary, preserves 44px-or-larger visible navigation targets and
reflows without overflow at the 720 CSS-pixel viewport equivalent of a 1440px
display at 200% zoom. Keyboard verification confirms that the first Tab exposes
the skip link and activation transfers focus to `main`.

WCAG contrast calculations for the active shell combinations are:

- primary ink on the warm page: 16.48:1;
- secondary ink on the warm page: 5.17:1;
- white on primary blue: 5.52:1;
- primary ink on curiosity lime: 14.64:1;
- primary blue on the warm page: 4.90:1.

The reduced-motion media rule disables smooth scrolling and collapses
nonessential animation and transition durations. Its actual operating-system
preference path remains part of the later cross-browser milestone suite.

## Open visual gaps

The Figma Starter MCP quota still prevents renewed structured inspection. The
implementation therefore uses only the exact written token values and approved
behavior. Before CRFD-12 can close, compare the following against the Figma
foundation when access returns:

1. exact logo/fold geometry and wordmark spacing;
2. Instrument Sans and Newsreader weight rendering against the Figma styles;
3. `Shadow/Card` blur, offset and opacity (the current value is deliberately
   subtle and provisional);
4. navigation proportions at the four acceptance widths;
5. final visual regression snapshots.

No missing screen or component is replaced with a generic framework template.
