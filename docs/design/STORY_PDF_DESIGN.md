# Curiofold — Story PDF Design System

**Version:** 2.0  
**Status:** Authoritative brand and editorial design specification  
**Owner:** Curiofold Brand & Editorial Design  
**Audience:** Codex / engineering, editorial systems, PDF composition agents, QA, future designers  
**Scope:** Every paid Curiofold Story PDF  
**Related documents:** `docs/design/PRODUCT_DESIGN.md`, `docs/design/STORY_PDF_CREATION_STANDARD.md`

---

# 0. Purpose and authority

This document defines the **non-negotiable visual identity, art-direction, typography, image, information-graphics and editorial-design rules for Curiofold Story PDFs**.

It exists to prevent two failure modes:

1. Every Story looking mechanically identical.
2. Every Story looking like it belongs to a different brand.

The required result is:

> **Every Story is individually art-directed, but unmistakably Curiofold.**

This document defines **design outcomes and quality thresholds**, not technical implementation architecture.

It does **not** decide:

- which PDF library is used;
- how layouts are represented in code;
- which agent framework is used;
- how an automated pipeline is orchestrated;
- how research is performed;
- which model creates a PDF.

When a Curiofold Story exists as a PDF, this document is authoritative for its visual and editorial design.

---

# 1. Curiofold editorial position

A Curiofold Story PDF is a **paid premium mini-edition**.

It is not:

- a report;
- a slide deck;
- a Word export;
- an ebook template;
- a school handout;
- a dashboard;
- a brochure;
- a web page printed to PDF;
- an AI-generated content pack;
- a collection of text boxes and decorative shapes.

The intended feeling is:

> **Structured curiosity: calm enough to read, distinctive enough to remember.**

The PDF must feel:

- intelligent;
- editorial;
- human;
- contemporary;
- credible;
- composed;
- curious;
- premium without luxury signalling;
- minimal without sterility;
- visually specific to the Story;
- worth paying for.

---

# 2. The paid-value bar

Curiofold is a paid product.

A technically correct PDF is not sufficient.

The Story must create a perceived-value reaction closer to:

> “This feels considered, researched and designed.”

and never:

> “An AI filled a template with text and shapes.”

A Story is not design-complete if it feels like something that could have been generated in a few minutes from a generic template.

## 2.1 Paid-value test

Before acceptance, ask:

- Does the cover create curiosity immediately?
- Does at least one page feel genuinely crafted for this Story?
- Are the visuals materially better than filler?
- Would a reader plausibly save, share or show one of the pages?
- Does the edition contain something that a plain article would not?
- Does the Story feel more valuable after opening than before purchasing?

If several answers are no, the design is not finished.

---

# 3. One editorial system, not one rigid template

Curiofold uses one editorial design system across all subject areas.

Do **not** create permanent category identities such as:

- History = sepia;
- Science = blue molecules;
- Technology = black neon;
- Food = terracotta;
- Sport = green.

The Curiofold identity is carried by:

- page geometry;
- typography;
- hierarchy;
- grid;
- spacing;
- metadata;
- captions;
- folios;
- source treatment;
- visual-truth conventions;
- diagram language;
- image art direction;
- pacing principles.

The individual Story gains personality through:

- Story-specific imagery;
- one Story accent;
- cover composition;
- visual rhythm;
- Story Mode;
- diagrams/maps/data where useful;
- one or more bespoke editorial devices.

---

# 4. System discipline + feature freedom

The system should behave like a professional magazine:

- recurring furniture remains disciplined;
- page geometry remains recognizable;
- body typography remains stable;
- captions and sources remain consistent;
- feature pages may become expressive when the content deserves it.

The design system is a **kit of parts**, not a cage.

Routine pages may be highly structured.

Important openers, visual explanations and narrative turning points may break that structure intentionally.

A grid break is valid only when it improves:

- meaning;
- pacing;
- emphasis;
- comprehension;
- emotional impact.

Random variation is not art direction.

---

# 5. Canonical format

## 5.1 Page

**A4 Portrait — 210 × 297 mm**

## 5.2 Theme

Canonical theme:

**Light**

Base background:

`#FFFDF8`

Secondary warm surface:

`#F6F1E7`

Primary ink:

`#121318`

Secondary ink:

`#62656E`

Divider:

`#E9E1D3`

Curiofold Blue:

`#3656F5`

Curiofold Lime:

`#C9F45C`

Do not create separate dark PDF editions.

## 5.3 Dark editorial beat

A dark or inverted page/region may be used as a deliberate narrative beat.

Rules:

- normally maximum one substantial dark beat per Story;
- it must have a narrative reason;
- long-form body reading remains light-first;
- it must not become a dark-mode theme;
- accessibility contrast remains mandatory.

---

# 6. Page geometry

## 6.1 Margins

Default:

- top: **18 mm**
- bottom: **20 mm**
- left: **18 mm**
- right: **18 mm**

Critical text and credits must remain at least **8 mm** from the physical edge.

## 6.2 Grid

Use a **6-column editorial grid**.

Gutters:

**4 mm**

The grid is structural, not decorative.

## 6.3 Body measure

Long-form body copy normally spans:

**4 of 6 columns**

Target line length:

**55–70 characters**

Avoid sustained lines beyond approximately 75 characters.

## 6.4 Full-width body

Do not routinely set narrative body across all 6 columns.

Six-column span is reserved for:

- short display text;
- diagrams;
- data;
- visual statements;
- exceptional quotations;
- closing statements.

---

# 7. Typography

Curiofold uses only:

- **Newsreader**
- **Instrument Sans**

Do not introduce a third family without an explicit brand decision.

## 7.1 Newsreader

Use for:

- Story title;
- body;
- section headings;
- narrative emphasis;
- pull quotes;
- selected editorial captions.

## 7.2 Instrument Sans

Use for:

- category;
- metadata;
- reading time;
- folios;
- running heads;
- image credits;
- figure labels;
- chart labels;
- timeline labels;
- callout labels;
- source labels.

---

# 8. Body typography

Default:

- Newsreader Text
- Regular
- **11 pt**
- **15.5 pt leading**
- left aligned
- conservative hyphenation
- ragged right by default

Minimum normal body size:

**10.5 pt**

Do not solve fit problems by shrinking below the readability floor.

Avoid:

- full justification with visible rivers;
- tight leading;
- overly narrow measure;
- overly wide measure;
- excessive indentation;
- large blocks of uninterrupted text.

---

# 9. Display typography

## 9.1 Story title

Preferred:

- short title: **40–48 pt**
- medium title: **34–40 pt**
- long title: **30–36 pt**

Use Newsreader Display / Newsreader.

Do not shrink an important title merely to preserve a weak composition.

Recompose the page first.

## 9.2 Deck

Instrument Sans Regular

**12.5–14 pt / 17–19 pt**

Normally maximum:

**3 short lines**

## 9.3 Section heading

Newsreader Semibold

**22–28 pt / 26–32 pt**

## 9.4 Pull quote

Newsreader

**19–24 pt / 25–30 pt**

Normally maximum:

**2 per Story**

---

# 10. Metadata and micro-type

Metadata:

- Instrument Sans
- 8.5–9.5 pt
- 11–13 pt leading

Caption:

- 8.5–9 pt
- 11.5–12.5 pt leading

Credit/source:

- 7.5–8.5 pt
- never below readable reproduction quality

Source-list minimum:

**8 pt**

Never create “premium” hierarchy by making useful information microscopic.

---

# 11. Colour behaviour

## 11.1 Brand anchor

Curiofold Blue is the primary recurring brand accent.

Use it sparingly for:

- section markers;
- fine rules;
- selected labels;
- diagram emphasis;
- restrained brand gestures.

## 11.2 Curiosity Lime

Lime is a signal colour.

Use for:

- small dots;
- highlights;
- selected markers;
- small diagram emphasis.

Do not use lime for:

- body text;
- long labels;
- large reading surfaces without verified contrast.

## 11.3 Story accent

Each Story may have **one principal Story accent**.

The accent should be derived from:

- the visual subject;
- hero imagery;
- a meaningful material/object;
- the Story's emotional temperature.

It must not be automatically derived from the category.

---

# 12. Story Modes

Story Modes are internal design behaviours.

They must **never appear as consumer-facing labels** unless the wording independently belongs to the Story.

## 12.1 Narrative

Suitable for:

- historical events;
- journeys;
- incidents;
- turning points;
- chronological sequences.

Typical devices:

- archival imagery;
- maps;
- timelines;
- dates;
- documents;
- time stamps.

## 12.2 Explainer

Suitable for:

- science;
- engineering;
- mechanisms;
- technology;
- “how does this work?” subjects.

Typical devices:

- diagrams;
- sequences;
- comparisons;
- cutaways;
- annotated objects.

## 12.3 Profile / Object

Suitable for:

- people;
- places;
- organisations;
- machines;
- artifacts;
- works.

Typical devices:

- portraiture;
- object studies;
- detail crops;
- quotation;
- metadata.

## 12.4 Data / Atlas

Suitable for:

- geography;
- scale;
- ranking;
- quantitative comparison;
- movement.

Typical devices:

- maps;
- charts;
- scales;
- proportional graphics;
- direct comparison.

---

# 13. Internal vocabulary must never leak into the Story

The following are **internal production concepts**, not consumer copy:

- Story Mode
- Memorable Device
- Visual Truth Policy
- Image-led Cover
- Type-led Cover
- Artifact-led Cover
- Design System
- Layout Variant
- Composition Rule
- AI Smell Test
- Paid-Value Test
- Quality Gate
- Explanatory Graphic

Do not print these labels merely because they exist in this document.

Bad:

> THE MEMORABLE DEVICE

Bad:

> STORY MODE: NARRATIVE

Internal instructions must remain invisible to the customer.

---

# 14. The bespoke-device rule

Every Story must contain at least one **Story-specific visual/editorial device**.

Examples:

- a custom timeline;
- an annotated archival document;
- a geographic route;
- an object cutaway;
- a scale comparison;
- a bespoke chart;
- a page-sized number tied to narrative meaning;
- a document sequence;
- a before/after comparison.

The device must:

- carry information or meaning;
- belong specifically to the Story;
- be visually stronger than generic filler;
- remain understandable without internal design terminology.

## 14.1 Hard rule

A graphic does **not** qualify as bespoke merely because it uses Curiofold colours.

A generic box/line/circle composition is not automatically a memorable device.

---

# 15. No visual filler

Every visual element must earn its place.

A visual must do at least one:

- prove;
- explain;
- locate;
- compare;
- reveal;
- contextualize;
- humanize;
- establish atmosphere;
- create a meaningful narrative pause.

If removing a visual leaves comprehension and emotional impact unchanged, the visual is probably filler.

When no strong visual exists:

> **Use a strong type-led composition or intentional whitespace instead of inventing a weak graphic.**

Absence is better than filler.

---

# 16. Authentic visual first

When a strong, legally usable authentic visual materially improves the Story, prefer it over a synthetic substitute.

Priority:

1. real documentary photography;
2. archival photography;
3. primary-source documents;
4. historically meaningful maps;
5. real objects/artifacts;
6. original Curiofold diagrams;
7. editorial illustration;
8. conceptual illustration;
9. synthetic imagery only where justified.

A custom diagram should not replace a powerful real photograph merely because a diagram is easier to generate.

---

# 17. Documentary imagery

Documentary images must retain factual integrity.

Permitted normal editorial treatment:

- crop;
- exposure correction;
- restrained contrast;
- restrained colour balance;
- dust/scan cleanup when it does not alter evidence.

Do not:

- add or remove factual objects;
- alter events;
- fabricate people;
- merge photographs so they appear documentary;
- use generative fill to change historical reality.

---

# 18. Synthetic and AI imagery

Synthetic imagery must never masquerade as evidence.

Do not use generative imagery to fake:

- historic photography;
- documentary scenes;
- real people in factual events;
- scientific evidence;
- archival material;
- photojournalism.

If synthetic imagery is used, it must be unmistakably:

- conceptual;
- illustrative;
- explanatory;
- editorial.

The objective is not to make AI imagery difficult to detect.

The objective is to keep Curiofold trustworthy.

---

# 19. Anti-hallucination visual rule

A visual may not invent factual information.

Never invent:

- geography;
- artifact shapes;
- routes;
- dates;
- quantities;
- relative scale;
- object anatomy;
- historical boundaries;
- labels;
- quotations;
- people;
- architectural detail.

If the verified information required to draw the visual is unavailable:

- simplify the visual;
- use type instead;
- use an authentic asset;
- omit the visual;
- or flag the missing input outside the customer-facing PDF.

Do not “fill the gap” with plausible-looking graphics.

---

# 20. Maps

A graphic labelled as a map must encode real spatial information.

A map must be based on valid geographic relationships.

It may be:

- geographically accurate;
- intentionally schematic;
- topological;

but the nature of the map must be honest.

## 20.1 Prohibited map behaviour

Do not:

- draw arbitrary lines and call them routes;
- place locations approximately without data while implying accuracy;
- use unlabeled shapes that imitate geography;
- invent coastlines;
- mix timeline and map logic in a confusing way.

## 20.2 Schematic maps

Schematic maps are allowed when:

- geography is simplified deliberately;
- relative relationships remain meaningful;
- the simplification helps comprehension;
- any material limitation is disclosed briefly.

Disclosure does not rescue a meaningless diagram.

---

# 21. Artifact and evidence graphics

Do not represent a real artifact using random abstract polygons.

If the Story discusses:

- pottery;
- coins;
- glass beads;
- documents;
- tools;
- archaeological fragments;

prefer:

- real photography;
- archival drawings;
- trace/vector redraw based on the real object;
- a clearly generic icon only when the exact appearance is irrelevant.

A random shape labelled “ceramic” is not acceptable evidence design.

---

# 22. Diagrams

A diagram is justified only when spatial or causal structure is easier to understand visually than verbally.

Every diagram must answer a concrete question.

Examples:

- How did the mechanism work?
- What moved where?
- Which components interacted?
- What changed before/after?
- What was the relative scale?

## 22.1 Diagram comprehension test

A reader should be able to state the main takeaway within approximately **5–10 seconds**.

If not, simplify.

## 22.2 Diagram aesthetic

Use:

- flat geometry;
- direct labels;
- restrained strokes;
- few colours;
- strong hierarchy;
- generous whitespace.

Avoid:

- decorative arrows;
- random circles;
- connector spaghetti;
- glossy icons;
- faux-isometric 3D;
- generic “AI infographic” styling.

---

# 23. Data visualisation

Data graphics must communicate the underlying data relationship, not decorate it.

Prefer:

- position;
- length;
- direct comparison;
- direct labels;
- restrained colour.

Use grey/neutral context generously.

Use Story accent/Curiofold Blue to highlight the relevant point.

Avoid:

- rainbow category colours;
- 3D charts;
- pie charts where a simpler comparison is clearer;
- legends when direct labels are clearer;
- encoding unrelated variables with reused colours.

Every chart must show:

- unit;
- source;
- relevant timeframe;
- clear labels.

---

# 24. Visual sources and credits

Every documentary or sourced visual must carry sufficient provenance.

Store/express as appropriate:

- creator/photographer;
- archive/institution;
- date;
- title/description;
- rights/licence;
- source link or identifier.

Do not fabricate credits.

If provenance is unknown and the visual cannot be safely used, it should not be treated as publishable documentary material.

---

# 25. Image quality

Premium editorial design cannot depend on visibly poor source assets unless historical scarcity itself justifies them.

At final placement:

- **300 ppi is preferred for print-quality raster imagery**;
- low-resolution assets must not be enlarged until soft/pixelated;
- historically valuable low-resolution material should be displayed at a size that respects its real quality;
- do not use AI upscaling as a way to disguise missing detail or fabricate documentary information.

---

# 26. Cropping

Cropping must be intentional.

Never:

- cut off a face at an awkward point;
- crop away the evidence being discussed;
- remove context required to understand a documentary image;
- clip map labels;
- distort aspect ratio.

When a subject requires context, prefer a less dramatic crop over a misleading one.

---

# 27. Captions

Captions should answer:

- What am I seeing?
- Why does it matter here?

Avoid captions that merely repeat the obvious.

Captions must not contain unsupported interpretation.

---

# 28. Cover quality standard

The cover is the strongest single branding moment.

It must create:

- immediate curiosity;
- clear hierarchy;
- strong identity;
- confidence in paid quality.

Every cover must include:

- Curiofold mark/wordmark;
- category;
- Story title;
- reading time;
- deck when useful;
- a dominant visual idea.

Avoid a large area of empty page unless the emptiness creates deliberate tension or meaning.

Whitespace alone is not sophistication.

---

# 29. Cover families

## 29.1 Image-led

Use when a powerful authentic/editorial image exists.

Rules:

- one dominant image;
- controlled crop;
- title remains legible;
- no unnecessary overlays;
- avoid placing text over visually noisy regions.

## 29.2 Type-led

Use when typography can carry the concept better than available imagery.

Rules:

- type becomes the visual;
- scale and spacing must feel deliberate;
- maximum one secondary graphic gesture;
- do not add decorative shapes to “fill” the page.

## 29.3 Artifact / information-led

Use when the Story is best represented by:

- document;
- map;
- object;
- technical drawing;
- diagram;
- data.

The artifact must be specific and meaningful.

---

# 30. Opening page

The opening page should begin the Story, not repeat the cover.

Avoid “cover page 2”.

The reader has already chosen to read.

---

# 31. Reading pages

Default:

- single narrative column;
- 4/6 grid span;
- generous leading;
- visible paragraph rhythm;
- no more than one dominant supporting visual system on a page.

Avoid:

- newspaper-like multi-column body;
- textbook density;
- callout stacking;
- diagrams merely because there is side space.

---

# 32. One dominant idea per page

Every normal editorial page should have one clear dominant element:

- text;
- image;
- diagram;
- date;
- quote;
- data device.

Secondary elements may support it.

The eye should know where to start.

---

# 33. Editorial pacing

A Curiofold Story must have rhythm.

Do not repeat:

> text left + small diagram right

across multiple consecutive pages.

Do not repeat the same:

- full-bleed treatment;
- fact box;
- giant number;
- timeline;
- quote device;

until it becomes formulaic.

A strong edition usually contains contrast between:

- dense and sparse;
- text-led and visual-led;
- quiet and dramatic;
- archival and explanatory;
- macro and detail.

---

# 34. Pacing curve

The edition should normally follow an intensity curve:

1. **Cover** — immediate identity/curiosity.
2. **Opening** — clarity and momentum.
3. **Development** — readable information.
4. **Visual or narrative lift** — change of tempo.
5. **Peak / memorable moment** — strongest bespoke device or image.
6. **Resolution** — quieter synthesis.
7. **Sources/end matter** — calm and trustworthy.

Do not make every page “special”.

Specialness requires contrast.

---

# 35. Density

Overall target:

**Low-to-medium density**

Do not compress content to hit an arbitrary page count.

Do not create artificial emptiness merely to look premium.

Whitespace must perform a job.

---

# 36. Callout system

Allowed recurring callout roles:

- Fact
- Why it matters
- Number
- Timeline
- Quote
- Source note

The visible label should use natural editorial wording appropriate to the Story.

Default:

**maximum one major callout per page**

Avoid large app-style rounded cards.

---

# 37. Pull quotes

Use only when:

- the wording is strong;
- the source is real;
- the quote improves pacing.

Do not fabricate a quote-like sentence from ordinary body text.

Attribution is mandatory for real quotations.

---

# 38. Human editorial touch

Curiofold should feel made by people with judgement.

Allowed sparingly:

- annotation arrow;
- underline;
- circled detail;
- margin annotation;
- scanned mark;
- document crop;
- real texture;
- archival imperfection.

Avoid:

- scrapbook aesthetics;
- fake coffee stains;
- fake torn paper;
- fake film scratches;
- generic handwriting fonts.

---

# 39. UI styling is not editorial styling

Do not reproduce the app interface inside the PDF body.

Avoid:

- pill buttons;
- dropdown aesthetics;
- dashboard cards;
- input fields;
- UI shadows;
- fake controls;
- app navigation patterns.

Curiofold's platform and PDFs share typography, brand, tone and colour DNA — not component language.

---

# 40. Borders, radii and shadows

Default:

- images: square edges;
- editorial frames: square or nearly square;
- normal shadow: none.

Rules:

- fine rules: 0.5–1 pt;
- callout radius: maximum 4 mm where justified;
- shadows only for physical layering such as a document fragment.

---

# 41. Running furniture

## Folio

Instrument Sans  
8–9 pt  
bottom outer corner

No folio on cover.

## Running head

Optional and quiet.

## Logo

Do not repeat the full Curiofold logo on every page.

Preferred:

- cover;
- final page;
- occasional purposeful use.

---

# 42. Sources & Notes

Every Story requires clear end matter.

Use:

> **Sources & Notes**

The main reading experience should not become an academic paper.

Sources must remain legible.

---

# 43. End page

Possible content:

- concluding sentence;
- Sources & Notes;
- update date;
- editorial note;
- one subtle related-Story cue;
- Curiofold mark.

Do not turn the last page into a sales landing page.

---

# 44. Language and localisation

Every layout must tolerate translation.

Do not:

- hard-code title boxes that only fit English;
- preserve line breaks across languages;
- shrink translated body below minimum size;
- place essential text inside raster imagery.

Recompose when necessary.

---

# 45. Accessibility

Every final PDF must support:

- real/selectable/searchable text;
- logical reading order;
- tagged structure;
- document language;
- headings;
- alt text for meaningful images;
- decorative artifact handling;
- meaningful links;
- sufficient contrast;
- accessible source text.

Do not flatten the complete PDF into page images.

---

# 46. Page count

Typical Curiofold Story:

**approximately 6–10 A4 pages**

This is a rhythm, not a quota.

Do not sacrifice:

- font size;
- leading;
- margins;
- sources;
- image quality;
- pacing;

to hit a specific count.

---

# 47. Explicit anti-amateur rules

A Curiofold PDF must not contain:

- random polygons standing in for real artifacts;
- meaningless lines pretending to be maps;
- generic circle-and-arrow diagrams;
- decorative infographics that teach nothing;
- repeated template geometry across most pages;
- labels copied from internal instructions;
- unverified visual claims;
- weak diagrams added only to fill space;
- huge empty areas with no compositional intent;
- inconsistent caption treatment;
- pixelated images;
- fake archive styling;
- card-heavy app aesthetics.

---

# 48. AI-smell test

The Story fails the design standard if a reasonable reader is likely to think:

> “An AI generated some text and then decorated it with shapes.”

Common warning signs:

- repetitive geometry;
- generic diagrams;
- perfectly symmetrical but meaningless layouts;
- literal icons for abstract concepts;
- labels that sound like prompt instructions;
- overuse of boxes/arrows;
- no real imagery despite a visually rich subject;
- synthetic images presented too confidently;
- uniform pacing page after page.

The cure is not more decoration.

The cure is better editorial judgement.

---

# 49. Thumbnail test

View every page as small thumbnails in one sequence.

The edition should look:

- coherent;
- varied;
- paced;
- branded.

It should not look like:

- ten identical slides;
- ten unrelated poster designs.

---

# 50. Squint test

Blur/squint at each page.

The intended hierarchy should remain obvious.

A reader should sense:

- where to start;
- what dominates;
- what is secondary.

---

# 51. Shareability test

At least **2 pages or compositions** in a normal 6–10 page Story should be visually strong enough that they could be shown independently in a Curiofold editorial/social context without embarrassment.

This does not mean every page should be poster-like.

It means the edition must contain memorable craft.

---

# 52. Visual substitution test

For every custom visual, ask:

> Would a real photograph, archival image, map, document or simpler type treatment do this job better?

If yes, replace the weaker synthetic graphic.

For every authentic visual, ask:

> Does this image actually advance the Story, or is it merely available?

If no, omit it.

---

# 53. Design-complete scorecard

Score each category from 0–10:

| Category | Target |
|---|---:|
| Curiofold brand consistency | ≥ 9 |
| Typography/readability | ≥ 9 |
| Art direction | ≥ 8.5 |
| Visual quality | ≥ 8.5 |
| Pacing/composition | ≥ 8.5 |
| Visual truth | ≥ 9 |
| Paid-value perception | ≥ 8.5 |
| AI-smell resistance | ≥ 9 |

No category may score below **8**.

This scorecard is a design-quality standard, not a claim of mathematical objectivity.

---

# 54. Hard-fail conditions

Regardless of average score, the PDF fails if any of the following occurs:

- fabricated documentary visual;
- fabricated visual source/credit;
- internal production instruction visible to customer;
- unreadable body or source text;
- obvious image stretching/pixelation;
- page-level overflow/clipping;
- meaningless fake map presented as informative;
- fabricated data chart;
- unsupported quote;
- inaccessible flattened text for normal body content;
- generic filler graphics materially damaging perceived quality.

---

# 55. Canonical design constants

| Property | Default |
|---|---|
| Page | A4 portrait, 210 × 297 mm |
| Base background | `#FFFDF8` |
| Secondary paper | `#F6F1E7` |
| Primary text | `#121318` |
| Secondary text | `#62656E` |
| Divider | `#E9E1D3` |
| Brand blue | `#3656F5` |
| Curiosity lime | `#C9F45C` |
| Grid | 6 columns |
| Gutter | 4 mm |
| Top margin | 18 mm |
| Bottom margin | 20 mm |
| Side margins | 18 mm |
| Body span | 4/6 columns |
| Body font | Newsreader Text |
| Body size | 11 pt |
| Body leading | 15.5 pt |
| Body alignment | Left |
| Target line length | 55–70 characters |
| Functional font | Instrument Sans |
| Source minimum | 8 pt |
| Image radius | 0 |
| Default shadow | None |
| Theme | Light |
| Story accent | 1 principal accent |
| Bespoke device | Minimum 1 meaningful device |
| Major callout | Normally max 1/page |
| Pull quotes | Normally max 2/Story |

---

# 56. Design principle

> **The system stays quiet so the curiosity can get loud.**

The goal is not to prove that an agent followed the rules.

The goal is that the rules disappear into an edition that feels inevitable, specific and professionally art-directed.

---

# Appendix A — Research basis (non-normative)

## Pentagram — Scientific American
Consistent typography/grid can coexist with expressive feature pages; readability and imagery should reinforce each other.  
https://www.pentagram.com/work/scientific-american

## magCulture — Alex Hunting / Kinfolk
Controlled grids should serve content; variation creates pace; ultra-minimalism can become generic.  
https://magculture.com/blogs/journal/alex-hunting-design-director-kinfolk

## magCulture — Chris Clarke / The Guardian Saturday
A modular kit of parts, consistent alignments and deliberate flatplanning create coherence while allowing breathing room and density.  
https://magculture.com/blogs/journal/chris-clarke-the-guardian

## Datawrapper Academy
Colour should encode meaning; direct labels and restraint improve comprehension; context can remain neutral.  
https://www.datawrapper.de/academy/what-to-consider-when-choosing-colors-for-data-visualization

## Associated Press — AI visual standards
Generative imagery must not substitute for documentary truth; verification and editorial judgement remain essential.  
https://www.ap.org/the-definitive-source/announcements/ap-updates-newsroom-standards-for-artificial-intelligence/

## Adobe — PDF accessibility and preflight
Tagged structure, logical reading order, document language, figure treatment, font checks, overset-text checks and image-resolution checks are part of professional PDF production.  
https://helpx.adobe.com/acrobat/using/create-verify-pdf-accessibility.html  
https://helpx.adobe.com/indesign/desktop/print/print-production-and-file-creation/produce-print-ready-pdf-files.html

## W3C — WCAG 2.2
Text alternatives, contrast, real text and accessible structure are core requirements.  
https://www.w3.org/TR/WCAG22/
