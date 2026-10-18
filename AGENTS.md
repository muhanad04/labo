# labo — agent entry point

## Start each session (small context first)

1. Read `docs/NOW.md` for implemented state, last verification, known limits, and the next task.
2. Run `git status --short`. Preserve unrelated/uncommitted work. Never assume a server on a familiar port belongs to labo.
3. Read only the task-relevant references:
   - Product/scope: `PRODUCT.md`, `docs/VISION.md`, `docs/ROADMAP.md`.
   - Core/state changes: `docs/ARCHITECTURE.md`, `docs/MODELS.md`; file/storage compatibility: `docs/MIGRATIONS.md`.
   - UI changes: `DESIGN.md`, `docs/surfaces/workbench.md`.
   - Dependencies: `docs/STACK.md`; installed versions are in `package-lock.json`.
   - Reference research/IP questions: `CONTRIBUTING.md`, `docs/SOURCES.md`. Do not reload the whole research archive for routine work.

## Commands

- `npm ci` — reproduce the lockfile (Node >=22.12; use Node 24 LTS).
- `npm run dev -- --port 5190 --strictPort` — local app; choose another unused port if occupied, never kill unknown processes.
- `npm run check` — numerical/state tests, strict TypeScript, production build.
- `npx playwright install chromium firefox` — one-time browser setup (Firefox optional).
- `npm run test:e2e` — isolated Chromium suite; owns port 5189, refuses reuse.
- `npm run test:e2e -- --browser=firefox` — same workflows in Firefox.
- `npm audit` — dependency advisory check, not proof of safety/licensing.

## Architecture and correctness

- Electrical theory drives results. Never fabricate meter numbers or animate fake intermediate readings.
- `src/core/` is pure domain/math. No React, browser storage, or UI imports there.
- `analyze(experiment)` is the simulation seam. Keep invalid/unsolved/disconnected distinct from zero.
- DC and single-frequency RMS AC with explicit series-loss models and linear coupled transformers today. Phasors/sweeps are not transients. No saturation or machine model; see current limits in NOW.md.
- All project ingress uses `parseExperiment`/`decodeProject`. Validate IDs, references, finite values, limits, and document versions before replacing live work.
- Use stable terminal IDs. Moving modules preserves topology; deletion and undo restore module and dependent wires atomically.
- Notebook/sweep readings keep immutable circuit snapshots. Sweeps must not mutate live work; retain exact spec/basis, cancellation, invalid-point gaps and stale-result checks. Precision is display-only.
- Read project/experiment versions 1–4; write v4 project envelopes. V4 circuits allow signed expanded-workspace positions. Active/recovery keys are `labo.project.v4` / `.previous`; library key `labo.library.v3`. Older keys remain read-only fallbacks. See `docs/MIGRATIONS.md`.
- Keep visual layout out of numerical behavior. Do not add speculative plugin/worker/backend layers.

## UI and provenance

- Independent product and original diagrams/copy. No vendor code, faceplates, logos, manuals, file formats, or bypasses.
- Preserve keyboard terminal selection, Escape cancellation, focus visibility, undo, readable units, and non-color-only identification.
- Explicit user preference: utilitarian laboratory software. No slogans, coaching questions, motivational empty states, large branding, rounded/shadowed cards, or dashboard tiles in the workspace. Keep terse operational text; put model explanations in Help/collapsed details. See `docs/UI_RESEARCH.md`.
- Design language is explicitly approved/frozen. Improve usability, consistency and finish within it; new features inherit it. Do not rerun aesthetic direction selection or replace the tool's visual/interaction grammar without explicit user approval.
- Native semantic controls first; add dependencies only for demonstrated needs.
- Inspect UI at desktop and 390px widths. Bench scrolling on narrow screens is intentional; page-level horizontal overflow is not.
- No affiliation, accuracy-equivalence, accessibility-conformance, or deployment claims without evidence.
- License remains undecided; `private: true` is deliberate. Do not imply the project is already open source.

## Finish a session

- Run the relevant tests; run `npm run check` and browser tests for cross-cutting UI/state changes.
- Record exact results and untested areas in `docs/NOW.md`; keep it under roughly 80 lines.
- Add a short entry to `docs/LOG.md` (what/why/verification), not a transcript.
- Update architecture/stack/design docs only when their actual decisions change. Mark historical proposals rather than letting them compete with current truth.
- Keep generated builds, screenshots, test artifacts, cookies, and private vendor research out of Git. No commits/remotes unless asked or intentionally agreed.
