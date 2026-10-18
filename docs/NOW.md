# Current handoff — publication snapshot 2026-10-18

## Latest publication instruction (supersedes historical pause notes below)

User paused further implementation/verification and requested immediate commit-before/after and push to https://github.com/muhanad04/labo. Source snapshot committed as `181c92a`; current source packaged successfully with Vite only (no tests, formatter or TypeScript verification). Refreshed generated Pages files in `docs/`; publication commit follows. User will enable Pages with **main → /docs**. No claim that Pages is enabled/live or that current source passes verification. All implementation/verification remains paused.

## Small-step queue update

Latest pair 9–10: resistor style stored in dedicated guarded browser preference; transformer polarity markers share consistent placement in both layouts, fallback labels P+/P−/S+/S−, tooltip/description and visible legend distinguish them from junctions. No physics changes; no tests/build/browser checks. NEXT.md source checklist is implemented but remains user-feedback/unverified. Do not infer release readiness or resume tests/publishing without agreement.

Latest pair 7–8 implemented in source: native export preview/options dialog with immutable snapshot, shared lazy SVG renderer and matching download/print. Independent title/nominal-value/model-note toggles; full metadata and required connection/model context retained. Stale preview renders discarded; keyboard shortcuts isolated and focus returned on close. No tests/build/browser checks. Next pending pair: style persistence (9) and transformer-dot clarity (10).

Latest continue batch: restored native horizontal/vertical scrollbars and native ordinary-wheel/trackpad scrolling. `useBenchPan` now uses one native-scroll camera with content/view padding; world sits in a sized scroll surface, no camera transform. Keeps drag/keyboard/reset/Ctrl-wheel and grid alignment; preserves logical view during resize/layout changes. Stabilized BenchModule callbacks and removed idle coordinate reads. No measured performance claim or tests/build/browser checks. Source feedback pending; next pending feature pair is export preview/content options (7–8).

Latest authorized pair 5+12 is implemented in source, unverified: removed old movement/drop/router rectangle; signed workspace up to ±100,000 logical units, V4 circuits/envelopes, fresh `labo.project.v4`/recovery and `labo.library.v3` with read-only V3/V2/V1 fallbacks. Old strict readers unchanged; model/analysis edits preserve V4. Group/legacy-route moves share a bounded delta. Ctrl+wheel inside viewport zooms 50–180%, cursor-anchored before paint; outside browser zoom unchanged. No tests/build/browser checks. See MIGRATIONS.md; old key/version/bounds assertions need updates. Scrollbar/ordinary-wheel polish still pending.

Latest user said go for next pair: checklist 3–4 now implemented in source (unverified). Wire near-end dragging reconnects; middle only selects; loop dragging/arrow movement/reset UI removed, legacy route data retained. Sidebar native drag/drop creates one component with validated payload, pan/zoom coordinates, optional snap and undo; existing limits remain. No tests/build/browser run; await feedback. Previous batch: user authorized checklist items 1–2. Implemented event-time pan blocking (fixes stale gesture refs blocking deselection), blank-click clearing of pending/reconnection/previews/selection/highlighting, and pointer-only viewport outline suppression with keyboard/blur restoration. Blank drags preserve selection; no blanket focus-outline removal. Source changes await user feedback; no tests/build/browser run. Added harsh wheel scrolling/native scrollbars to queue; user reiterated removal of loop-stretch wire dragging. Sidebar drag-to-create and other export/bounds/performance items remain queued.

User resumed with small focused changes, now two per batch. See `docs/NEXT.md` for the agreed improvement list. Completed source changes: ANSI resistor endpoint gap corrected; blank-bench primary pointer-down now clears selection/highlighting, excluding controls and active gestures. Next batches implemented: subtle 100×120 grid and matching optional snapping/nudges; body/header dragging; then user reversed grid default to OFF (snap also off). Grid now covers viewport and measures zoomed board dimensions. View-only empty-space panning added through refs/RAF, with wheel/keyboard/reset/cancel; plain clicks deselect, panning preserves selection. Existing positions untouched. No tests/build/browser verification run; await user feedback. Grid/snap assertions also need updating. Reviewed user SVG/screenshot: transformer dots are intentional winding polarity marks; queued clarity review. Also queued zoom/hidden bench movement bounds and replacing wire loop dragging with endpoint reconnection. Panning does NOT expand logical movement bounds. Prior publishing authorization is not an instruction to publish this unfinished batch now.

## Resume here

User explicitly requested a graceful pause, and previously **stop testing**. Do not run tests/builds/pushes until work resumes and the intended verification scope is agreed. Changes are saved locally; no commit/push has been made. The Pages output currently predates the latest source edits.

## Working state before the latest edits

- React/TS local-first lab; pure DC/RMS-AC MNA, RLC/three-phase examples, notebook snapshots, projects/recovery, sweeps, JSON/CSV.
- Non-ideal source resistance, L winding resistance, capacitor ESR, impedance/loss readings, linear coupled transformer with finite Lp/k/copper/core-shunt losses; v3 schema/storage with old namespaces preserved.
- Persistent inline number fields; direct terminal drag/reconnect; simple loop adjustment; whole-circuit Auto color. Shared-terminal fan-out/lane changes reverted.
- Optional default-off **Neat wires (experimental)**; stronger scaled grid; zoom 50–180%; approved utilitarian design retained.
- Blank-page cause observed: dev server served an empty transformed Inspector module despite intact source. Restarted verified labo Vite process; added awaitWriteFinish. Named export/app rendered after restart.
- Window title is now **labo**. Last running local server: http://127.0.0.1:5190/ (verify ownership/status before reuse).

## Latest user direction / unfinished source changes

User supplied a private DOCX to specify schematic style and requested its example circuit types plus practical non-ideal behavior out of the box. They rejected bench-derived schematic layouts.

- Inspected DOCX XML, PNGs and rendered its two EMFs privately. Standard conventions: orthogonal loops, vertical source/transformer windings, small square I/E meter symbols, series current meters, shunt voltage meters, polarity and junction dots.
- **Replaced `src/core/schematic.ts`** with a topology-based renderer independent of bench coordinates. Specialized single-transformer loops, simple one-source circuits, explicit net-label fallback for other networks. Original vector primitives; no copied source images. Current rewrite has NOT been compiled or visually inspected.
- `src/ui/SchematicExport.tsx`: circuit-bar Export drawing menu, ANSI/IEC choice, SVG download, browser Print/PDF. Hint now describes electrical layout. Lazy core import and escaped SVG metadata/labels.
- `src/core/labExamples.ts`: eight independent transformer investigations (1:1/step-up voltage ratio, low-voltage short circuit for both ratios, sensing-resistor circuit, R/L/C regulation banks).
- Bank assumption: three identical parallel branches. Report V/I values suggest equivalent impedance near stated branch impedance/3; this is an inference, not confirmed apparatus configuration.
- Estimated 240 V transformer profile: Lp 60 H, k .997, Rp/Rs 45 Ω, Rc 60 kΩ; step-up Rs 77.85 Ω. Sensing variant uses 400 Ω, Lp≈15.915 H and ratio 2.15. These are educational estimates, NOT measured/factory specifications or a validated fit.
- Saturation remains unsupported. Sensing preset is explicitly labelled **linear model**; do not fake the report's nonlinear knee.
- `src/core/modelDefaults.ts`: explicit generic defaults (source .5 Ω, inductor 5 Ω, capacitor ESR .5 Ω). `project.ts` applies defaults only on fresh startup/new devices, never imports/restored work.
- `App.tsx`: new investigation optgroup; Tools checkbox for losses on new equipment/examples (default on), confirmed reset-loss and lossless operations. Lossless retains finite magnetizing inductance. Per-device model editing remains.
- Latest code is intentionally UNFORMATTED/UNVERIFIED after user requested speed and then pause. Model defaults change displayed initial current from 10 mA to ~9.995 mA; old browser assertions need deliberate updates.

## Publishing preparation (authorized, not completed)

- Target https://github.com/muhanad04/labo; remote repository was public/empty. No local remote/commit/push created yet.
- A configured secondary GitHub account has admin/write access; active default account is read-only. Use the write-capable account's credential ephemerally, do not print tokens or unnecessarily change global auth.
- README rewritten in restrained technical style, but now needs updates for electrical-layout export, new presets/default losses, and current verification limits.
- `scripts/pages.mjs`, `build:pages`, conditional Vite base `/labo/`, generated `docs/index.html`, `docs/assets/`, favicon/notices/.nojekyll added. Builds via ignored `dist-pages/labo`, preserves source Markdown.
- Intended Pages setting: **Deploy from branch → main → /docs**, NOT root. Pages has not been enabled/deployment verified.
- `.gitattributes` added. Verify workflow exists but is **manual-only** to honor stop-testing request.
- Need description/topics, final provenance/secret review, refreshed Pages build, commit and push when resumed. Keep license undecided; do not claim open-source licensing.

## Verification evidence / limits

- BEFORE latest DOCX/default-model rewrite: `npm run check` passed 77 unit/state tests, formatting, strict TS and production build.
- Export-menu pointerdown closing bug fixed; focused SVG-download browser test passed afterwards. Prior full Chromium run was 21/22 before that fix, NOT a subsequent full 22/22 run.
- Earlier Chromium 20/20 and Firefox 20/20 passed before export additions. Audit then reported zero vulnerabilities.
- `npm run build:pages` passed BEFORE latest DOCX/default-model edits. No verification has run since user said stop testing.
- Existing schematic tests still expect placement-based routing/overlap rejection and old wording; update for new topology layout. Browser tests still assume ideal defaults in places. Do not report old results as current proof.
- Review current renderer statically and later inspect requested examples when permitted: polarity, exact node connectivity, fallback meshes, meter label clearance, figure bounds and print layout.

## Private artifacts / next documentation work

Private DOCX extraction, rendered EMFs/photos, ngspice tools, downloaded manuals and screenshots stay under ignored `research-local/`; never publish them. `docs/IMPEDANCE_RESEARCH.md` records actual sources and limited ngspice comparison evidence.

MODELS/MIGRATIONS/ARCHITECTURE/STACK/design-surface docs mostly predate recent v3/nonideal/wiring work; update actual decisions and source register. Do not reload the entire research archive. Preserve all existing uncommitted files.
