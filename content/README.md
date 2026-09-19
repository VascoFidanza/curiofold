# Curiofold Story source

This directory holds Git-reviewed source documents for Curiofold Stories. The files are editorial inputs, not downloadable Reader payloads.

## Contract

Each JSON file must satisfy `StoryDocument@v1`, implemented in `packages/content`. The contract provides:

- one stable `storyKey` across every locale and revision;
- independent locale slugs and publication state;
- immutable numbered revisions with an explicit predecessor;
- allowlisted semantic Reader blocks rather than HTML or executable MDX;
- accountable review, methodology and correction metadata;
- source provenance and media-rights/accessibility evidence;
- stable block identifiers for previews and reading-progress migration.

Run `pnpm content:validate` from the repository root before opening a content pull request. The validator checks every document, its internal references, cross-file identity and revision chains.

## File layout

Use `content/stories/<story-key>/<locale>/<revision>.json`. A correction creates a new revision file; never edit or delete a version that has been published. Locales are reviewed and released independently. A draft locale must not appear on public surfaces as a fallback.

The current `clockwork-gardens` files are explicitly synthetic engineering fixtures. They are not launch catalogue content and make no factual product claim.
