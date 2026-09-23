# Curiofold — Responsive, Adaptive & Cross-Browser Platform Standard

**Version:** 1.0  
**Status:** Authoritative frontend quality standard  
**Owner:** Curiofold Product / UX / Frontend Quality  
**Audience:** Codex / engineering, future frontend developers, QA, design  
**Scope:** Entire Curiofold website/platform, all pages, states, components, embedded Story/PDF reading surfaces, supported browsers and devices  
**Related documents:** `docs/design/PRODUCT_DESIGN.md`, `docs/design/STORY_PDF_DESIGN.md`

---

# 0. Purpose

This document defines the **non-negotiable responsive, adaptive, cross-browser and cross-device requirements for Curiofold**.

The goal is simple:

> **Curiofold must remain usable, readable, visually coherent and fast across a continuous range of screen sizes, input methods, device classes and supported browsers.**

A user should not need a specific phone, tablet, laptop, monitor, browser window size or orientation for Curiofold to work correctly.

The platform must adapt to the space and capabilities that are actually available.

This document governs:

- responsive layout;
- adaptive UX;
- cross-browser behaviour;
- touch, mouse, keyboard and mixed-input devices;
- orientation changes;
- safe areas and mobile browser chrome;
- typography and spacing adaptation;
- responsive media;
- responsive Story/PDF viewing;
- document zoom and pan behaviour;
- performance requirements related to responsive behaviour;
- testing and acceptance criteria.

This document does **not** mandate one specific frontend framework, CSS methodology, PDF library, test vendor or rendering architecture unless a behaviour is required for interoperability or accessibility.

Implementation choices remain engineering-owned.

The final user experience must comply with these requirements.

---

# 1. Normative language

The following words have specific meaning:

- **MUST / MUST NOT** — mandatory.
- **SHOULD / SHOULD NOT** — expected default; deviation requires a clear reason.
- **MAY** — optional.
- **SUPPORTED** — included in the formal compatibility and QA matrix.
- **GRACEFUL DEGRADATION** — core tasks remain possible even when an enhancement is unavailable.

---

# 2. Core principle: responsive by capability, not by device name

Curiofold MUST NOT be designed around named devices such as:

- iPhone 5s;
- iPhone 6 Plus;
- iPhone 18 Pro Max;
- Pixel;
- Galaxy;
- iPad;
- MacBook;
- Surface.

Those devices are useful test references, but they are not layout rules.

The layout MUST respond to:

- available CSS viewport width;
- available viewport height;
- container size;
- orientation;
- pointer precision;
- hover capability;
- safe-area insets;
- browser UI;
- zoom level;
- text scaling;
- content length;
- language;
- input method.

A new device that did not exist when the code was written SHOULD still render correctly if its viewport and browser capabilities fall within the supported ranges.

---

# 3. Screen-size support policy

## 3.1 Minimum layout width

The complete Curiofold product MUST remain functionally usable at:

**320 CSS px viewport width**

This is the minimum layout-width target.

No core page or task may require horizontal page scrolling at 320 CSS px, except content that is inherently two-dimensional and explicitly allowed to scroll internally, such as:

- a zoomed PDF page;
- a large data table when no readable reflow is possible;
- a map or diagram whose meaning depends on two-dimensional position.

The surrounding Curiofold page itself MUST remain stable.

## 3.2 Maximum width

Curiofold MUST remain visually coherent on large desktop displays and ultrawide windows.

The layout MUST NOT stretch text, cards or navigation indefinitely just because screen space exists.

Use bounded content widths and deliberate whitespace.

Wide screens should normally provide:

- more columns;
- larger gutters;
- more breathing room;
- optional supporting content;

rather than excessively wide reading lines.

## 3.3 Continuous resizing

The interface MUST work at arbitrary widths between defined design ranges.

Testing only exact breakpoints is insufficient.

The UI MUST be tested while continuously resizing between:

**320 px and at least 2560 px**

to detect:

- awkward wrapping;
- overflow;
- orphan controls;
- clipped text;
- disappearing actions;
- unexpectedly empty regions;
- layout jumps.

---

# 4. Design ranges

The following are Curiofold design ranges.

They are **not device identities** and MUST NOT be treated as “iPhone”, “tablet” or “desktop” detection.

```text
xs     320–479 px
sm     480–767 px
md     768–1023 px
lg     1024–1279 px
xl     1280–1535 px
2xl    1536 px+
```

Breakpoints MAY differ locally when the content requires it.

A component should change layout when **its content no longer works well**, not simply because a popular device width has been reached.

---

# 5. CSS-first responsive architecture

Responsive layout MUST be primarily solved with the browser layout engine.

Prefer:

- CSS Grid;
- Flexbox;
- intrinsic sizing;
- `min()`;
- `max()`;
- `clamp()`;
- percentages;
- `fr`;
- `minmax()`;
- `rem`;
- `em`;
- `ch`;
- container queries;
- media queries;
- logical properties.

Avoid JavaScript-driven layout calculation when CSS can express the behaviour correctly.

## 5.1 JavaScript restrictions

JavaScript MUST NOT be the default mechanism for:

- deciding mobile vs desktop layout;
- calculating normal card widths;
- moving standard navigation items;
- changing normal grid columns;
- reading `window.innerWidth` on every resize to reproduce media-query behaviour.

Avoid continuous resize listeners for ordinary layout.

If JavaScript measurement is genuinely required:

- scope it narrowly;
- avoid forced synchronous layout;
- debounce/throttle where appropriate;
- use platform observers where appropriate;
- ensure layout remains usable before JavaScript finishes.

---

# 6. Mobile-first implementation principle

Core layout rules SHOULD begin with the narrowest supported experience and progressively enhance as more space becomes available.

Mobile-first does **not** mean mobile is more important than desktop.

It means:

- the smallest experience receives a complete functional baseline;
- wider layouts add space and parallelism;
- desktop does not depend on removing a broken mobile layout;
- narrow screens are not an afterthought.

---

# 7. Media queries vs container queries

## 7.1 Media queries

Use media queries primarily for **page-shell and viewport-level changes**, including:

- main navigation mode;
- page gutters;
- overall grid columns;
- large page composition;
- major mobile/desktop shell changes;
- orientation-specific corrections.

## 7.2 Container queries

Reusable components SHOULD use container queries when their correct layout depends on the space allocated by their parent rather than the full browser width.

Examples:

- Story Card;
- Collection Card;
- wallet panel;
- search result;
- related Story module;
- dashboard-like account summary;
- Reader supporting panel.

A Story Card rendered in a narrow sidebar on a wide desktop should be able to use its compact layout even though the overall viewport is large.

Do not simulate this by adding many page-specific CSS overrides.

---

# 8. Fluid sizing

Use bounded fluid values where appropriate.

Examples of suitable fluid behaviour:

- page gutters;
- large headings;
- hero spacing;
- section spacing;
- card gaps.

Fluid scaling MUST always have safe minimum and maximum values.

Do not use raw `vw` scaling that makes text:

- too small on narrow screens;
- absurdly large on ultrawide monitors.

Typography MUST retain user zoom and text-resize behaviour.

---

# 9. Viewport configuration

The platform MUST use a correct responsive viewport configuration.

The layout viewport must reflect device width.

Do not disable user scaling.

The platform MUST NOT use:

- `user-scalable=no`;
- `maximum-scale=1`;
- equivalent mechanisms intended to prevent browser accessibility zoom.

Browser/page zoom remains an accessibility capability even where Curiofold provides its own PDF/document zoom.

---

# 10. Mobile browser viewport height

Do not assume `100vh` always equals the currently visible mobile screen.

Mobile browsers dynamically show and hide:

- address bars;
- tab bars;
- navigation chrome;
- software keyboards.

Full-height experiences such as:

- Reader;
- PDF viewer;
- bottom sheets;
- full-screen dialogs;
- auth flows;

MUST account for the actual visible viewport.

Use modern small/dynamic/large viewport concepts where appropriate, with fallbacks.

Choose deliberately between:

- `svh` for stable “safe” height;
- `dvh` when the component should follow dynamic browser chrome;
- `lvh` only when the largest viewport is genuinely intended.

Do not create mobile layouts where critical controls disappear behind browser chrome.

---

# 11. Safe areas, notches and rounded screens

Interactive controls MUST respect user-agent safe-area insets.

This particularly applies to:

- mobile bottom navigation;
- sticky purchase bars;
- Reader controls;
- PDF controls;
- bottom sheets;
- full-screen overlays.

Critical controls must not sit:

- under the iPhone home indicator;
- behind a notch or Dynamic Island region;
- under rounded screen clipping;
- behind browser UI.

Safe-area handling SHOULD use browser environment values rather than hard-coded device-specific padding.

---

# 12. Screen orientation

Curiofold MUST support both:

- portrait;
- landscape;

on phones and tablets.

Rotation MUST NOT:

- lose user state;
- lose reading position;
- close the current Story/PDF unexpectedly;
- move controls off-screen;
- create horizontal overflow in the page shell;
- reset forms;
- reset search/filter state.

Landscape is not permission to reuse desktop UI blindly.

Short mobile landscape viewports require special attention to vertical space and browser chrome.

---

# 13. Input-method adaptation

Curiofold must work with:

- touch;
- mouse;
- trackpad;
- keyboard;
- stylus;
- hybrid devices.

Do not infer input capability from viewport width.

A large touchscreen laptop and a small phone have different capabilities even when a width-based rule might look similar.

Use capability queries where useful, including pointer precision and hover support.

## 13.1 Hover

No essential information or action may exist only on hover.

Hover MAY enhance:

- Story cards;
- tooltips;
- visual emphasis;
- image treatment.

But every action must remain available without hover.

## 13.2 Touch

Touch controls require larger, forgiving hit areas.

Curiofold design preference:

**44 × 44 CSS px or larger for frequent standalone controls**

WCAG 2.2 AA minimum target-size requirements must also be satisfied.

Spacing between adjacent touch targets must prevent accidental activation.

## 13.3 Keyboard

All core flows MUST work using keyboard only.

Focus order must follow the visual/logical order after responsive reflow.

A component that moves visually at a breakpoint must not produce a confusing DOM focus sequence.

---

# 14. No duplicate “mobile site” and “desktop site”

Do not build separate independent versions of the same page for mobile and desktop when one semantic structure can adapt responsively.

Avoid patterns such as:

- desktop DOM tree hidden on mobile;
- separate mobile DOM tree hidden on desktop;
- duplicated forms;
- duplicated navigation logic;
- duplicated commerce actions.

This causes:

- inconsistent state;
- accessibility problems;
- maintenance overhead;
- duplicate event handlers;
- larger bundles;
- bugs where one version changes and the other does not.

Responsive composition should normally reuse the same semantic content and components.

---

# 15. Layout behaviour by device class

The following are UX outcomes, not framework instructions.

## 15.1 Narrow phone

Priorities:

- one primary vertical content flow;
- full-width or nearly full-width primary actions;
- single-column Story cards;
- compact navigation;
- minimal simultaneous controls;
- no tiny sidebars;
- no fixed desktop-width panels.

## 15.2 Large phone / small tablet

May introduce:

- wider cards;
- compact two-column modules when genuinely readable;
- side-by-side metadata where space permits.

Do not force two columns simply because width technically allows them.

## 15.3 Tablet

Use available width intentionally.

Possible adaptations:

- two-column Story grids;
- split layouts for Story Detail;
- side panels when readable;
- richer PDF controls.

Tablet portrait and tablet landscape should be treated separately when composition needs differ.

## 15.4 Laptop / desktop

Use horizontal space for:

- multi-column Story grids;
- persistent header navigation;
- Story Detail purchase panel;
- supporting Reader context;
- richer toolbar layouts.

Do not stretch the reading column to fill the window.

## 15.5 Large / ultrawide desktop

Use max-width containers.

Allow whitespace.

Do not respond to extra width by:

- creating extremely long lines;
- spreading controls too far apart;
- enlarging everything indefinitely.

---

# 16. Global page-shell adaptations

## Desktop navigation

The main navigation may remain horizontal when it fits comfortably.

## Mobile navigation

Mobile uses the product navigation pattern defined in `PRODUCT_DESIGN.md`.

Navigation MUST remain reachable with one hand where practical and must not consume excessive vertical space.

## Intermediate widths

Do not jump abruptly from “full desktop” to “tiny phone”.

Intermediate tablet/laptop widths require intentional layouts.

Navigation items must never overlap or clip.

---

# 17. Discover / Home responsive rules

## Narrow

- Hero becomes compact.
- User should see Story content quickly.
- Discovery modules flow vertically.
- Story cards are primarily one column.
- Horizontal carousels may be used only where they remain discoverable and accessible.
- Category chips may horizontally scroll in their own bounded region if needed.

## Medium

- 2-column Story grids are acceptable when card width remains readable.
- Sections may combine horizontal and vertical layout.

## Wide

- 3 columns on standard desktop/laptop.
- Up to 4 columns on sufficiently wide screens when Story-card readability remains strong.
- Main catalogue content should remain bounded by the product max-width.

---

# 18. Story Card responsive rules

A Story Card MUST preserve:

- cover;
- category;
- title;
- reading time;
- ownership/progress state;

at every supported width.

The hook may adapt in length or placement where necessary but must not cause card overflow.

At narrow container widths:

- vertical composition is preferred;
- title wraps naturally;
- metadata may stack;
- no text truncation that hides the Story identity.

At wider container widths:

- horizontal/featured variants may be used where defined.

Cards MUST NOT require hover to reveal ownership, progress or the primary click target.

---

# 19. Story Detail responsive rules

## Narrow

Order should be primarily vertical:

1. hero visual;
2. category/metadata;
3. title and hook;
4. description/preview;
5. unlock/ownership action.

When the main unlock control scrolls out of view, a mobile sticky action may appear.

Sticky actions MUST respect:

- safe-area bottom inset;
- browser chrome;
- software keyboard;
- accessible focus.

## Wide

The purchase/ownership panel may sit beside the Story information and remain sticky where there is enough vertical space.

If the viewport becomes too short, sticky behaviour must not trap or clip content.

---

# 20. Search responsive rules

Search MUST remain fully usable at 320 CSS px.

Narrow layouts:

- search input receives priority;
- filters move into a sheet/drawer when persistent horizontal placement no longer fits;
- active filter state remains visible;
- `Clear all` remains reachable.

Wide layouts may show:

- persistent filters;
- larger result grids;
- richer category context.

Search results must not change meaning across layouts.

---

# 21. Library responsive rules

Narrow:

- single-column owned Story list/cards;
- progress remains visible;
- filters may horizontally scroll or collapse into a sheet.

Wide:

- multi-column grid or list/grid hybrid;
- sorting and filters may remain visible.

Metrics must not push owned content below the fold unnecessarily on small screens.

---

# 22. Collections responsive rules

Collection cards and progress indicators must reflow without loss of information.

Collection detail:

- narrow: vertical sequence;
- wide: hero/context may sit beside progress or metadata.

Curated Story order must remain understandable on every layout.

---

# 23. Wallet, Account and Settings responsive rules

Forms MUST:

- fit narrow screens without horizontal scrolling;
- use readable labels;
- avoid fixed input widths;
- accommodate localized labels;
- keep validation messages near the relevant field;
- account for the mobile software keyboard.

Multi-column forms MAY collapse to one column.

Critical actions must not be obscured by the keyboard or fixed bars.

---

# 24. Dialogs, sheets and overlays

A desktop modal does not need to remain a centered modal on a phone.

Responsive behaviour may adapt:

- desktop: modal/dialog;
- mobile: bottom sheet or full-height dialog where appropriate.

Requirements:

- no content clipped vertically;
- internal scrolling only where necessary;
- close action always reachable;
- focus remains correctly managed;
- safe areas respected;
- software keyboard does not cover the active field/action.

---

# 25. Typography responsiveness

Text must scale intentionally.

Do not shrink normal body text merely because the screen is narrow.

Prefer:

- stable readable body sizes;
- fluid large headings within bounded minimum/maximum values;
- shorter line lengths on phones;
- bounded reading widths on desktops.

## 25.1 Line length

Long-form reading content must use a comfortable maximum measure.

The Reader should remain approximately within the design range already defined in `PRODUCT_DESIGN.md` on larger screens.

Narrow screens use viewport gutters rather than forcing desktop-width text.

## 25.2 Text expansion

Layouts MUST tolerate:

- browser text zoom;
- operating-system text scaling where exposed to the browser;
- longer localized strings;
- German/French/Portuguese expansion.

Do not use fixed-height text containers that clip when text wraps.

---

# 26. Responsive images

Images MUST adapt to their rendered container without distorting aspect ratio.

Requirements:

- never overflow the page shell;
- provide intrinsic dimensions or equivalent aspect-ratio reservation;
- avoid cumulative layout shift;
- serve appropriately sized assets;
- do not download a desktop-sized image unnecessarily for a narrow phone when responsive sources are available.

Use responsive source selection where appropriate.

Below-the-fold imagery SHOULD be lazy-loaded.

The primary above-the-fold image likely responsible for LCP SHOULD NOT be indiscriminately lazy-loaded.

---

# 27. Media aspect ratio and object fitting

A component may define an editorial aspect ratio, but the original asset must not be stretched.

Use cropping when editorially acceptable.

For documentary imagery:

- protect essential context;
- avoid automatic crops that remove the factual subject;
- define focal-point behaviour where needed.

---

# 28. Font loading

Instrument Sans and Newsreader are brand-critical, but loading them must not block basic readability.

Font delivery MUST avoid long invisible-text periods.

Where appropriate:

- preload only genuinely critical font resources;
- subset by needed characters/languages when safe;
- use modern compressed font formats;
- define appropriate fallback fonts;
- minimize layout shift between fallback and final font.

Do not preload every family weight/style “just in case”.

---

# 29. Cross-browser support philosophy

The objective is **standards-based interoperability**, not a collection of browser hacks.

Curiofold MUST prefer:

- standardized HTML;
- standardized CSS;
- standardized browser APIs;
- broadly interoperable features;
- progressive enhancement.

Use current cross-browser support information before depending on new platform features.

Features that are not broadly supported must have an acceptable fallback if they are required for a core flow.

---

# 30. Formal supported browser matrix

Unless product analytics later justify a change, Curiofold formally supports:

## Desktop

- Chrome — current and previous major version
- Edge — current and previous major version
- Firefox — current and previous major version
- Safari — current and previous major version

## Mobile / tablet

- Safari on supported iOS/iPadOS — current and previous major OS/browser generation
- Chrome on Android — current and previous major version
- Samsung Internet — current major version

## Chromium-derived browsers

Browsers such as Brave, Opera and other mainstream Chromium derivatives SHOULD work through standards compatibility, but they are not all required to receive the same exhaustive release matrix unless product usage justifies it.

---

# 31. Small-screen support is not the same as legacy-browser support

Curiofold MUST support layouts down to **320 CSS px**.

This means a viewport equivalent to older small phones must still receive a correct layout.

However, an old physical device may be unable to run a modern supported browser.

Therefore:

- screen-size support is continuous down to 320 CSS px;
- formal browser support follows the browser matrix above;
- older browsers receive graceful degradation where reasonably achievable;
- engineering must not introduce unnecessary incompatibilities merely to use novelty features.

Do not claim “every browser version ever released” support.

That is not a realistic quality standard.

---

# 32. Feature detection, not browser sniffing

Do not branch core behaviour using user-agent strings such as:

```text
if Safari...
if iPhone...
if Chrome...
```

unless a verified browser-specific defect has no standards-based alternative.

Prefer:

- native feature detection;
- `@supports`;
- capability media queries;
- progressive enhancement;
- documented fallback behaviour.

Device detection must not be used as a substitute for responsive layout.

---

# 33. Progressive enhancement

Core Curiofold flows MUST work with the baseline feature set of supported browsers.

Newer features may enhance:

- animation;
- layout polish;
- rendering performance;
- input behaviour.

A missing enhancement must not make a Story impossible to:

- discover;
- unlock;
- read;
- resume;
- complete;
- manage in Library.

---

# 34. Browser defaults and form controls

Browsers differ in rendering:

- buttons;
- selects;
- inputs;
- checkboxes;
- date fields;
- scrollbars;
- focus rings.

Curiofold SHOULD establish a consistent design baseline for authored controls while preserving native accessibility and expected behaviour.

Do not remove:

- focus visibility;
- keyboard affordances;
- platform accessibility semantics;

merely to make browsers look identical.

Pixel-identical rendering is not required.

Functional and visual-equivalent quality is required.

---

# 35. PDF / Story document viewer — core principle

When Curiofold displays a PDF inside the platform, the PDF experience must behave like a **contained document reader**, not like a raw browser attachment.

The surrounding Curiofold shell and the PDF document are separate interaction layers.

The user must be able to:

- read the document comfortably;
- zoom the document;
- pan the zoomed document;
- navigate pages;
- return to Curiofold;
- use the site without the surrounding UI becoming malformed.

---

# 36. PDF default fit behaviour

## Narrow phone

Default PDF scale SHOULD be:

**Fit to available document-viewer width**

The full page width should fit inside the PDF viewport.

At default scale:

- no horizontal PDF pan should be required;
- the Curiofold page shell must not horizontally overflow.

The user may then zoom into the document.

## Tablet

Default may use:

- fit width; or
- fit page;

depending on orientation and available space.

Readability has priority over showing the entire physical page at once.

## Desktop

Default may use:

- fit page;
- fit width;

according to the viewer aspect ratio and Story PDF proportions.

The default must not produce obviously tiny reading content simply to show maximum whitespace around the page.

---

# 37. PDF zoom isolation

This is a critical Curiofold requirement.

When the user activates **document zoom controls**, only the document must change scale.

The surrounding platform UI must remain stable:

- header remains the same size;
- navigation remains the same size;
- page layout does not expand;
- the browser page must not gain accidental horizontal overflow.

PDF/document zoom is therefore conceptually distinct from browser/page zoom.

However:

**Curiofold MUST NOT disable browser accessibility zoom globally.**

Both can coexist:

1. Curiofold document zoom changes the PDF/document scale inside its bounded viewer.
2. Browser zoom remains available as an accessibility feature for the whole application.

---

# 38. PDF pinch-to-zoom

On touch devices, PDF pinch-to-zoom SHOULD be supported inside the document viewport when it can be implemented reliably.

Requirements:

- zoom should remain centred near the gesture focal point;
- the document should not jump unpredictably;
- the shell outside the viewer should not resize;
- pinch interaction must not leave the PDF in a blank or corrupted canvas state;
- pinch must not permanently trap page scrolling.

Because mobile browser/PDF rendering behaviour differs, explicit viewer controls are mandatory even when pinch works.

At minimum provide accessible:

- Zoom in
- Zoom out
- Reset / Fit width

Pinch is an enhancement, not the only way to zoom.

---

# 39. PDF zoom ranges

A document viewer SHOULD define sensible minimum and maximum scale limits.

Minimum:

- must not make document interaction nonsensical;
- normally no smaller than the fit-page/fit-width baseline where further reduction adds no value.

Maximum:

- must support inspection of detail;
- must avoid rendering canvas sizes that exceed realistic device/browser memory limits.

The viewer must protect lower-memory mobile devices from enormous high-resolution render surfaces.

---

# 40. PDF rendering performance

The viewer MUST NOT eagerly render an entire multi-page PDF at maximum resolution when the user can only see one or two pages.

Prefer behaviour such as:

- render visible/near-visible pages;
- delay distant pages;
- reuse/cancel obsolete render work;
- select rendering resolution based on document scale and device capability;
- avoid unbounded canvas allocation.

High-DPI screens should remain visually sharp, but device-pixel-ratio handling must not create unreasonable memory usage.

---

# 41. PDF scrolling and panning

At default fit-width on phone:

- vertical document scrolling should feel natural;
- horizontal movement should not be required.

After document zoom exceeds viewer width:

- panning may occur inside the viewer;
- horizontal pan should move the PDF, not the whole Curiofold page.

The page shell must remain anchored.

---

# 42. PDF toolbar responsiveness

## Narrow

Keep only essential controls visible:

- Back
- page/progress indication
- zoom access
- more/settings when needed

Secondary actions may move into a menu or sheet.

Controls must respect safe areas.

## Wide

More controls may remain visible simultaneously.

Do not simply shrink a desktop toolbar until every icon technically fits on mobile.

---

# 43. PDF orientation behaviour

Rotating a phone/tablet while reading a PDF must:

- preserve current document/page;
- preserve approximate reading location;
- recompute fit scale appropriately;
- keep toolbar usable;
- avoid losing zoom state unexpectedly unless reset is necessary to prevent a broken layout.

If a scale is recomputed, do so predictably.

---

# 44. PDF fallback behaviour

Curiofold must not depend solely on a browser's built-in PDF plugin/viewer for its intended in-platform UX.

Native browser PDF behaviour differs across browsers and devices.

If the enhanced Curiofold document viewer cannot initialize:

- show a clear recoverable error;
- provide retry;
- preserve the user's Story state;
- offer an approved fallback reading route when product/security rules allow it.

Never present a blank grey frame with no explanation.

---

# 45. PDF viewer accessibility

PDF-viewer controls MUST:

- be keyboard operable;
- have accessible names;
- expose focus;
- meet target-size expectations;
- not rely on gesture-only interaction.

Document zoom must not be the only way to make the content accessible.

The underlying PDF itself must follow `STORY_PDF_DESIGN.md` accessibility requirements.

Do not disable browser zoom as a shortcut for implementing viewer gestures.

---

# 46. Horizontal scrolling rule

The **application page** must not horizontally scroll at supported widths.

Allowed internal horizontal scrolling is limited to content that genuinely requires it, such as:

- a deliberately zoomed PDF;
- unavoidable two-dimensional graphics;
- exceptional tables.

Internal scroll containers must not cause the body/root page to overflow.

---

# 47. Sticky and fixed elements

Sticky/fixed UI requires specific responsive testing.

Examples:

- mobile bottom navigation;
- Story unlock bar;
- Reader toolbar;
- PDF toolbar;
- cookie/legal notices;
- dialogs.

They MUST NOT:

- overlap each other;
- hide content;
- block the final form field;
- sit behind the software keyboard;
- ignore safe-area insets.

---

# 48. Virtual keyboard

Mobile text-entry states must be tested with the software keyboard open.

When the keyboard opens:

- focused fields must remain visible;
- submit/continue actions must remain reachable;
- fixed footers must not cover the field;
- page height calculations must remain valid;
- the user must not be trapped in a layout that assumes the full physical screen height.

This applies to:

- Search;
- Sign in;
- Create account;
- Account settings;
- promo/payment fields if present.

---

# 49. Localization and responsive layout

Responsive QA must use real long strings, not only English.

At minimum test representative:

- PT-PT;
- English;
- German or another expansion-heavy locale.

Do not solve localization overflow by:

- clipping text;
- ellipsis on critical controls;
- shrinking text below design minimums.

Buttons may grow, wrap where appropriate, or recompose.

---

# 50. Content priority when space is constrained

When the screen becomes smaller, do not simply scale everything down.

Prefer this order:

1. Preserve core content.
2. Preserve the primary action.
3. Preserve state/ownership/progress.
4. Preserve navigation.
5. Reflow layout.
6. Move secondary controls into menus/sheets.
7. Remove purely decorative elements if necessary.

Do not hide essential content because it “does not fit”.

---

# 51. Performance principle

Responsive quality includes performance.

A technically responsive layout that becomes slow or janky on a small phone is not acceptable.

Prefer the browser's native layout engine and avoid unnecessary JavaScript work.

Do not ship separate oversized mobile/desktop application trees.

---

# 52. Core Web Vitals quality targets

Curiofold should meet the “good” Core Web Vitals thresholds at the **75th percentile**, measured separately for mobile and desktop:

- **LCP ≤ 2.5 s**
- **INP ≤ 200 ms**
- **CLS ≤ 0.1**

These are release quality targets, not excuses to game synthetic scores.

Field performance takes priority over one ideal local machine.

---

# 53. Layout stability

Responsive assets must not cause content to jump unexpectedly.

Reserve space for:

- Story images;
- covers;
- embeds;
- asynchronous panels;
- PDF viewer;
- skeletons.

Images should include intrinsic dimensions or equivalent aspect-ratio information.

Avoid inserting content above what the user is actively reading without preserving spatial context.

---

# 54. Responsive image performance

Serve image resolution appropriate to actual rendered size.

Avoid:

- sending a 3000 px image for a 320 px card when a smaller asset is available;
- using one huge source for every device;
- loading all catalogue imagery eagerly.

Use modern browser responsive-image mechanisms where appropriate.

The browser should be allowed to select a suitable resource.

---

# 55. Off-screen work

Large catalogue pages should not spend excessive rendering resources on content far outside the viewport.

Engineering MAY use:

- lazy loading;
- rendering deferral;
- CSS containment/content visibility;
- virtualization where genuinely needed.

Do not add complex virtualization to short lists where normal DOM rendering is already fast.

Optimisation should reduce real work, not create architecture for its own sake.

---

# 56. Animations and responsive performance

Animations MUST avoid layout thrashing.

Prefer compositor-friendly motion.

Responsive transitions must not animate dozens of layout properties while a user rotates or resizes a device.

Respect `prefers-reduced-motion`.

Never make layout adaptation depend on a decorative transition completing.

---

# 57. Testing philosophy

Responsive compatibility must be tested at three levels:

1. **Automated component/page tests**
2. **Automated browser/rendering tests**
3. **Real-device/manual verification for representative high-risk cases**

Emulation alone is insufficient for release confidence.

---

# 58. Required viewport test matrix

At minimum, test the primary flows at these widths:

```text
320
360
375
390
430
480
768
820
1024
1280
1440
1920
2560
```

These are test points, not layout breakpoints.

Also test one or more arbitrary widths between breakpoints.

---

# 59. Required browser-engine test matrix

Automated E2E / visual checks should cover, where practical:

- Chromium
- WebKit
- Firefox

Real-browser release checks must include:

- Chrome desktop
- Safari desktop
- Firefox desktop
- Edge desktop
- iOS Safari
- Android Chrome

High-risk PDF viewer changes require explicit mobile Safari and Android Chrome verification.

---

# 60. Real-device checks

Before significant responsive/Reader releases, verify on representative physical devices or a real-device cloud.

Include:

- one narrow/small phone class;
- one current mainstream iPhone;
- one current mainstream Android;
- one tablet;
- one laptop/desktop.

A real device test should cover:

- touch precision;
- browser chrome;
- software keyboard;
- safe areas;
- scrolling;
- orientation;
- PDF zoom/pan;
- sticky controls;
- performance feel.

---

# 61. Required orientation tests

For phone and tablet:

- portrait;
- landscape.

Test rotation while:

- Reader is open;
- PDF is zoomed;
- form field is active;
- Story Detail sticky action is active.

---

# 62. Required zoom tests

Web platform:

- browser zoom 100%;
- 200%;
- relevant high-zoom/reflow checks up to WCAG expectations.

PDF/document viewer:

- default fit;
- multiple zoom-in levels;
- zoom out;
- reset/fit width;
- pinch where supported;
- internal pan after zoom.

No test may pass if document zoom breaks the surrounding shell.

---

# 63. Required interaction tests

At representative responsive states, test:

- mouse;
- touch;
- keyboard;
- hover unavailable;
- coarse pointer;
- focus order;
- reduced motion.

No essential action may be hover-only or gesture-only.

---

# 64. Required network/performance tests

At least periodically test:

- fast broadband;
- throttled mobile network;
- high latency;
- image delay/failure;
- font delay/failure.

Responsive UI should remain structurally stable while assets arrive.

---

# 65. Visual regression coverage

Visual regression should include the highest-risk routes and states:

- Discover
- Search
- Story Detail locked
- Story Detail owned/in-progress
- Add Credits
- Reader
- PDF viewer
- Completion
- Library
- Collections
- Account
- dialogs/sheets
- error/empty/loading states

A route is not “responsive” only because its happy-path screenshot looks correct.

---

# 66. Browser compatibility acceptance rule

A release must not introduce a known supported-browser regression in a core flow.

If a newly used browser feature is unavailable in one formally supported browser:

- provide fallback;
- choose another implementation;
- or explicitly change the support policy through a documented product/engineering decision.

Do not silently ship a broken browser.

---

# 67. Responsive acceptance checklist for every new page

Before a new route/page is Done:

- Works at 320 CSS px.
- Works at 375/390 px.
- Works at tablet width.
- Works at standard desktop.
- Works at wide desktop.
- Has no body-level horizontal overflow.
- Primary CTA remains reachable.
- Navigation remains usable.
- Long text wraps.
- Long localized labels do not break layout.
- Images retain correct aspect ratio.
- Loading state preserves geometry.
- Keyboard focus order is logical.
- Touch targets are sufficiently large.
- Hover is not required.
- 200% browser zoom does not break the task.
- Portrait/landscape behaviour is acceptable where relevant.
- Safari/Firefox/Chromium behaviour is verified for risk-appropriate coverage.

---

# 68. Responsive acceptance checklist for every reusable component

A component is not complete until it has been tested:

- at minimum expected container width;
- at maximum expected container width;
- with short content;
- with long content;
- without an optional image;
- with loading state;
- with error/disabled state where applicable;
- with keyboard focus;
- with touch/coarse pointer where interactive.

Components must adapt to their container without page-specific hacks whenever practical.

---

# 69. PDF viewer acceptance checklist

Before PDF/Story document viewer work is Done:

- Default mobile view fits document width.
- Surrounding page does not horizontally overflow.
- Document zoom changes only document scale.
- Browser accessibility zoom remains enabled.
- Explicit zoom in/out/reset controls work.
- Pinch zoom works where supported or degrades safely.
- Zoom focal point does not jump unacceptably.
- Zoomed PDF pans inside viewer.
- Mobile Safari has been tested.
- Android Chrome has been tested.
- Rotation preserves approximate location.
- Safe areas are respected.
- Toolbar never disappears behind browser chrome.
- Current page/location survives resize.
- Large PDF does not cause uncontrolled memory growth.
- Viewer loading/error state is clear.
- Keyboard controls/focus work on desktop.
- Text remains sharp enough at common zoom levels.
- No blank canvas occurs at normal supported zoom ranges.

---

# 70. Prohibited responsive patterns

Curiofold MUST NOT rely on:

- fixed desktop pixel widths for primary page layout;
- device-name CSS rules;
- user-agent sniffing as general responsive logic;
- `user-scalable=no`;
- global prevention of pinch zoom;
- hard-coded iPhone notch padding;
- `100vh` used blindly for critical mobile full-height UI;
- hover-only primary actions;
- tiny touch controls;
- duplicated independent mobile/desktop application trees;
- JavaScript resize loops for ordinary CSS layout;
- body-level horizontal scrolling;
- fixed-height text boxes that clip localized text;
- hidden essential controls at awkward intermediate widths;
- raw native PDF embed as the only guaranteed PDF experience;
- rendering every PDF page at maximum resolution immediately;
- shrinking typography below readability limits to “make it fit”;
- an unsupported feature with no fallback in a core flow.

---

# 71. Efficiency rules

The responsive system should remain simple.

Prefer:

- a small set of coherent layout primitives;
- shared responsive tokens;
- reusable components;
- content-based breakpoints;
- CSS over JavaScript;
- one semantic DOM structure;
- native browser capabilities;
- progressive enhancement.

Avoid:

- dozens of nearly identical breakpoints;
- per-device overrides;
- route-specific responsive hacks;
- layout utility duplication;
- runtime calculations that CSS already provides;
- dependency-heavy solutions for basic layout behaviour.

A responsive system that becomes difficult to reason about is itself a quality problem.

---

# 72. Documentation rule

When a new responsive pattern is introduced because existing primitives are insufficient, document:

- why it exists;
- where it applies;
- its minimum/maximum behaviour;
- accessibility considerations;
- browser compatibility considerations.

Do not create undocumented “magic” breakpoint values.

---

# 73. Source-of-truth rule

Responsive behaviour defined in this document is authoritative for frontend quality.

`PRODUCT_DESIGN.md` remains authoritative for:

- product IA;
- screen intent;
- brand system;
- Reader behaviour;
- navigation model;
- component semantics.

`STORY_PDF_DESIGN.md` remains authoritative for:

- fixed-page Story PDF visual design;
- PDF typography;
- editorial page composition;
- visual truth;
- PDF page art direction.

This document governs how those experiences **adapt to devices, viewports, browsers and input methods**.

---

# 74. Engineering judgement

This standard intentionally defines outcomes more strongly than implementation details.

Codex / engineering may choose the most appropriate implementation if:

1. all required behaviour is preserved;
2. browser support remains within policy;
3. accessibility is not degraded;
4. performance remains within quality targets;
5. responsive behaviour remains maintainable;
6. exceptions are not silently converted into new defaults.

---

# 75. Final principle

> **Curiofold must adapt to the user’s available space and capabilities; the user must never have to adapt to Curiofold.**

A narrow phone should feel intentionally designed for a narrow phone.

A tablet should feel intentionally designed for a tablet.

A desktop should use horizontal space intelligently.

A large monitor should remain composed rather than stretched.

A supported browser should never feel like a second-class implementation.

And a Story/PDF should remain readable, zoomable and controllable without destabilising the platform around it.

---

# Appendix A — Research basis

This section records the external standards and engineering guidance used to inform this specification. It is explanatory, not a replacement for the normative rules above.

## Responsive layout

- MDN — CSS Media Queries
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries
- MDN — Container size and style queries
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_size_and_style_queries
- web.dev — Responsive web design basics
  - https://web.dev/articles/responsive-web-design-basics
- web.dev — Responsive images
  - https://web.dev/learn/design/responsive-images
- Smashing Magazine — Container Queries vs traditional Media Queries
  - https://www.smashingmagazine.com/2026/09/stop-treating-css-container-queries-traditional-media-queries/

## Viewports and device geometry

- MDN — CSS length / viewport units
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length
- web.dev — Large, small and dynamic viewport units
  - https://web.dev/blog/viewport-units
- MDN — CSS `env()` / safe-area insets
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env

## Input and accessibility

- MDN — pointer media feature
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/pointer
- MDN — any-pointer
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/any-pointer
- MDN — touch-action
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action
- W3C — WCAG 2.2
  - https://www.w3.org/TR/WCAG22/
- W3C — Target Size (Minimum)
  - https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- W3C — Reflow
  - https://www.w3.org/WAI/WCAG22/Understanding/reflow

## Cross-browser engineering

- MDN — Browser detection / why feature detection is preferred
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Browser_detection_using_the_user_agent
- MDN — Implementing feature detection
  - https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Testing/Feature_detection
- web.dev — Baseline
  - https://web.dev/baseline/overview
- BrowserStack — Responsive and cross-browser testing guidance
  - https://www.browserstack.com/guide/how-to-test-website-responsiveness
  - https://www.browserstack.com/cross-browser-testing

## Performance

- web.dev — Core Web Vitals
  - https://web.dev/articles/vitals
- web.dev — LCP
  - https://web.dev/articles/lcp
- web.dev — INP
  - https://web.dev/articles/inp
- web.dev — CLS
  - https://web.dev/articles/cls
- web.dev — Image performance
  - https://web.dev/learn/performance/image-performance
- web.dev — Webfont loading
  - https://web.dev/articles/optimize-webfont-loading

## PDF/document viewing

- Mozilla PDF.js — Examples
  - https://mozilla.github.io/pdf.js/examples/
- Mozilla PDF.js — FAQ
  - https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions
- Mozilla PDF.js issue/discussion history around mobile pinch zoom and iOS rendering was also reviewed because it demonstrates why PDF zoom behaviour requires real-device testing and must not depend on one gesture alone.

---

# Appendix B — Practical QA reference widths

These widths SHOULD exist as presets in local/manual/visual-regression workflows where useful:

| Width | Purpose |
|---:|---|
| 320 | Minimum supported narrow layout |
| 360 | Common small Android class |
| 375 | Common compact iPhone class |
| 390 | Modern mainstream phone class |
| 430 | Large phone class |
| 480 | Transition test |
| 768 | Tablet portrait class |
| 820 | Larger tablet portrait / intermediate |
| 1024 | Tablet landscape / small laptop |
| 1280 | Standard laptop |
| 1440 | Standard desktop |
| 1920 | Large desktop |
| 2560 | Very wide desktop |

These values are **testing references, not device-specific CSS contracts**.
