# Development log

## 2026-10-18 — Publication snapshot

At explicit user request, paused further implementation/verification. Created source snapshot commit `181c92a`, then packaged current source for branch-based Pages using Vite only and refreshed generated `/docs` assets. No test suites, browser checks, formatting or TypeScript verification. Publication commit prepared for `muhanad04/labo`; user enables Pages on main → /docs. Earlier passing evidence does not certify this snapshot.

Keep short entries: change, reason, verification and remaining scope. Current session context belongs in NOW.md, not a growing transcript.

## 2026-10-18 — Drawing preference and polarity marks

Remember ANSI/IEC style with a guarded, separate browser preference. Unified winding-dot placement in orthogonal/fallback exports, consistent terminal labels and small non-outlined polarity dots; added tooltip/description and visible explanatory legend independent of hidden model notes. No topology/physics changes. No tests/build/browser checks; all checklist source changes still await feedback and later agreed verification.

## 2026-10-18 — Export preview and content options

Added a native captured-circuit preview dialog with shared ANSI/IEC renderer, stale-result cancellation, focus restoration and SVG/print actions. Title, nominal values and model notes can be independently hidden without changing topology/physics or discarding metadata; hidden notes retain model context and net-label explanations remain visible. Downloads reuse the ready preview SVG exactly. No dependencies, tests, builds or browser checks; user feedback pending.

## 2026-10-18 — Native scroll camera and bounded responsiveness pass

Restored both native scrollbars and browser-owned ordinary wheel/trackpad scrolling. Unified drag/keyboard/reset/cursor zoom around scroll offsets with content/view padding, preserving grid/world alignment and logical view during resize. Removed competing camera transforms. Avoided idle pointer geometry reads and stabilized module callbacks so memoized static modules can skip dragging redraws. No profiling timings, tests, builds or browser checks; behavior remains user-feedback pending.

## 2026-10-18 — Expanded workspace and Ctrl-wheel zoom

Authorized pair 5+12: replaced the original drag/drop/routing box with signed workspace coordinates (explicit ±100,000 safety guard), preserving group/legacy-route translation and topology. Added strict V4 layout reader, V4 project writes and fresh storage/catalog namespaces with old read-only fallbacks; V1–V3 readers retained. Added bench-scoped cursor-anchored Ctrl-wheel zoom, with accumulated steps and no document mutation. No tests/build/browser checks; preservation and interactions await verification. Ordinary wheel/scrollbar work remains queued.

## 2026-10-18 — Wire-end reconnection and equipment drop

Implemented queued pair 3–4 in source: near-end lead drag reconnects through existing topology/history operations; center spans select only. Removed loop drag/arrow/reset UI without deleting legacy route data. Sidebar entries use validated native drag/drop and one positioned add operation, inverse-mapped through current camera/zoom with optional snap and existing bounds. Click/keyboard add retained. No tests/build/browser checks; user feedback and touch review pending.

## 2026-10-18 — Blank-click cleanup and pointer focus

Authorized items 1–2: replaced render-snapshot gesture blocking with event-time guards; pending wiring permits blank clicks, which clear previews, reconnection, selection and highlighting without editing the circuit. Pointer-focused bench no longer inherits the large focus outline; keyboard/blur behavior and editable text remain. Queued native-scrollbar/wheel smoothness work and explicit removal of loop-stretch dragging. No tests/build/browser run; user feedback pending.

## 2026-10-18 — Grid correction and view panning

Latest preference: grid/snap off by default. Moved optional grid to viewport, with cell dimensions measured from the zoomed board and matching camera offsets. Added empty-space drag, wheel/keyboard pan and reset/cancel controls; blank clicks deselect but drags preserve selection. Camera writes are frame-batched outside circuit/React state. No movement-bound expansion, tests, browser checks or builds; user feedback pending.

## 2026-10-18 — Grid and body-drag batch

Made the grid default-on and subtler, with only 100×120 outlines; optional snapping and snapped keyboard nudges match that cell size. Extended header dragging to non-interactive component bodies, preserving groups/controls, threshold and cancellation. No automatic repositioning or canvas expansion. Tests/build/browser checks remain paused at user request; source changes await feedback. Added wire-end reconnection to the queue rather than altering wire gestures in this batch.

## 2026-10-18 — Small-step queue / ANSI resistor

Recorded the agreed export/bench/performance queue in NEXT.md. Corrected the ANSI resistor's missing final zig-zag segment so its path reaches both lead endpoints (−32…+32). No tests/builds/browser checks run, respecting the user's current verification limits; visual confirmation pending. No other queued behavior changed.

## 2026-10-17 — Non-ideal models, drawing revision, paused handoff

Added explicit resistance/loss/impedance models, a linear coupled transformer and v3 compatibility readers/storage; simplified wiring/inline editing, reverted rejected shared-terminal fan-out, and marked optional neat routing experimental. Recovered an empty Vite-transformed Inspector module by restarting the verified project server; title is now `labo`.

After inspecting a privately supplied report, replaced the bench-derived schematic exporter with a topology-based draft and added generic transformer investigations plus configurable practical defaults. Source diagrams/photos are not redistributed. Prepared restrained README/Pages packaging, but no commit/push/deployment occurred. Latest drawing/default-model edits remain unformatted and unverified: user explicitly stopped testing and then paused work. Earlier 77-test/build and 20/20-per-browser results predate these edits; see NOW.md for exact evidence, stale assertions and resume steps.

## 2026-10-17 — Editor, investigations, AC and project durability

Expanded the approved utilitarian laboratory without dependencies or a redesign. Added manual lead points/reconnect, group move/duplicate/delete/snap, display-only precision, actual RMS AC RLC/phased-source analysis with P/Q/S/PF, RL/wye examples and independent three-phase/neutral/resonance fixtures. Added bounded cancellable sweeps with exact captured basis/spec, sampled SVG/table/cursor/comparison, stale detection, restore and CSV. Named local projects and previous autosave use guarded writes/explicit actions.

Retained strict v1 readers, added v2 circuits/project envelopes, and left legacy storage untouched; documented keys/rollback in MIGRATIONS.md and physics in MODELS.md. New tool docks lazy-load, runs are explicitly session-only, and pure CSV escaping is shared. Fixed real handle occlusion by other lead hit strokes, keyboard-inaccessible table scrolling, longer numerical overflow and corrupt-save warning wrapping. No placeholders for transformers/machines/transients.

Verification: 56 unit/state tests, strict TS/build/formatting, 14 Chromium plus 14 Firefox workflows, zero npm advisories. Browser tests retain original DC/file behavior and exercise new tools, actual sweep CSV metadata/numbers, migration/recovery and phone precision/warnings. Desktop/phone/AC/tool views reviewed inline; final main/populated-sweep axe zero violations with SVG/overlap contrast incomplete. No independent audit, WebKit/real-touch/assistive-tech or external-engine comparison claimed. All work remains uncommitted; no remote/hosting/license decision. Next: transformer terminal/schema/model contract and analytical energy validation.

## 2026-10-16 — Design approval / freeze

User approved the utilitarian result and explicitly froze the overall language/philosophy while permitting polish. Recorded change-control rules in PRODUCT.md, DESIGN.md, AGENTS.md and the surface/handoff docs. Updated roadmap sequence toward editor precision, instruments, sweeps, course-driven physics and durability. Documentation-only; existing 27 unit/state and 7 browser test results remain the last code verification, not a fresh run.

## 2026-10-16 — User-pinned utilitarian workspace

User rejected promotional/coaching copy and rounded dashboard styling. Revisited public reference menus, equipment/workspace/status layout and metering screen; observations in UI_RESEARCH.md, no vendor assets shipped.

Replaced initial branded header/card styling with gray desktop command bands, plain sortable/filterable equipment list, flat numeric instruments, docked Data table, and operational status. Removed slogans, lesson question, promotional empty states and repeated workspace disclaimers; technical assumptions remain in Help/collapsed Model. Removed unused custom-font dependency.

Added native command disclosures, panel toggles, direct/keyboard lead selection, default/existing lead color controls, Delete and undoable bulk removal. Existing v1 project files and measured results preserved. Updated product/design/agent handoff rules so future sessions do not restore the rejected direction.

Verification: 27 unit/state tests and 7 Chromium workflows pass, including original construction/persistence tests and new copy/style/menu/lead controls. Build passes. Desktop/phone/data-dock review found and corrected a landmark gap and mobile sticky-status overlap. Review remained inline (no subagent tool); accessibility scope/remaining checks in REVIEW.md. No new physics, deployment, remote or commit.

## 2026-10-16 — Discovery

Initialized Git on `main`. Inspected ordinarily accessible LVSIM Demo Mode without entering an access code or changing controls. Added scope, research and independent-development guardrails. No application then existed.

## 2026-10-16 — Deeper research

Reviewed public official help/compatibility pages, metering/table UIs, CircuitJS, ngspice, PhET and Virtual Labs. Recorded URLs, documentary versus directly tested claims, licensing caveats and search/access limitations in SOURCES.md/RESEARCH.md. Proposed an independent staged DC→AC→three-phase→machines roadmap, not commercial equivalence.

## 2026-10-16 — First working DC bench

User delegated stack/design decisions and requested implementation plus efficient future-session context.

- Saved the broader product/depth/polish vision, checked npm versions/engine/peer/license metadata, installed compatible dependencies and locked them. Deferred backend, Radix, Dexie, plot library, workers and external solver integration until justified.
- Implemented pure validated modified-nodal DC analysis, ideal meters and switches, engineering quantities, original starter fixtures, explicit diagnostics and result conventions.
- Built original workbench/library/inspector/notebook. Added stable terminal wiring, preview/highlight, pointer capture/keyboard movement, atomic deletion/history and derived live calculations.
- Added guarded versioned local persistence/import/export, immutable readings with circuit snapshots, CSV export and restore. Storage failures report export as fallback.
- Added AGENTS.md startup/finish protocol, NOW.md handoff, current architecture, verified stack, actual design tokens/sidecar, provenance and build-time third-party notices.

Verification: formatting, 24 numerical/state tests, strict TypeScript/static production build, 4 Chromium end-to-end tests, zero npm advisories at check time. Browser workflows include blank-bench keyboard construction, edit/undo/redo, record/reload/export/import, malformed import preservation, disconnected voltmeter, drag/nudge/delete/undo and mobile page-overflow checks.

Visual/accessibility review: desktop 1440×1000 and phone 390×844. Fixed nav landmark, bench ARIA role/focus, long-label overflow/label uniqueness, and a manually identified 4.44:1 caption contrast. Final automated axe scan reported zero violations with SVG/overlap contrast requiring manual interpretation. Mechanical detector returned no findings. Review/documentation were inline because no subagent tool is available; this is not an independent accessibility audit.

Verification infrastructure correction: an initial test run reused an unrelated app on port 4173. Tests now own strict port 5189 with reuse disabled; no unrelated server was stopped. Also corrected an early font CSS entry-path assumption using the installed package's actual exports. Initial implementation/test failures were resolved, not omitted from the evidence.

Remaining: real student/course priorities and license decision, guided investigations/sweeps, improved lead routing, wider browser/device/assistive-tech testing, and later independently validated physics. No commits, remote, hosting or PWA set up.
