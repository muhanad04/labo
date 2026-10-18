# Workbench surface

Mode: Operate. Route `/`. Source: `src/App.tsx`, `src/ui/`, `src/styles.css`.

## User direction (current authority)

The user explicitly rejected the initial promotional/coaching copy, rounded/squarish dashboard tiles and polished-product framing. Requested the functional professionalism of LabVolt's crude desktop-tool interface. Preserve its useful conventions, not its proprietary assets or exact screen design. This supersedes the original calibration-workbench direction (historical seed `16ba73fe`); no new aesthetic tournament is needed for a user-pinned correction.

The user subsequently approved this result and froze its overall design language/philosophy. Future work may polish usability/consistency but must inherit this direction; identity or workspace-grammar redesign needs explicit approval.

## Direction contract

**THESIS:** A laboratory application, not an educational landing page. Commands, equipment, circuit, measurements and status earn the available pixels; slogans and default lesson prompts do not.

**OWN-WORLD:** Native Tahoma/Segoe UI labels, gray chrome, flat borders, compact original instrument faces, white numeric displays, blue selection. No rounded cards, shadows, prominent branding, decorative font downloads or background dot field by default.

**STORY:** Open/import a circuit or add equipment, wire it, edit values, inspect readings, record/export data. Help and model assumptions are available on demand, not scattered over the workspace.

**FIRST VIEWPORT:** Short title/menu/toolbar bands above a full-height three-pane application. Plain equipment list left, large neutral wiring area center, inspector right. Data table docks below the circuit when opened/recorded. A short status bar reports analysis and persistence. Phone controls wrap; wiring and tables scroll locally; status does not float over the long page.

**FORM:** User-pinned conventional engineering desktop UI. Code-led original implementation; no approved image comp. Signature interaction: select a lead directly or by keyboard, recolor/delete it, and undo; selecting terminals still highlights electrical connectivity and creates leads.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Current behavior and review

- File/Edit/View/Tools/Help disclosures contain only working commands; Escape and Tab remain supported, Arrow Down enters a menu from its summary.
- Equipment/inspector/data table can be shown or hidden. Type/name sorting and filter operate on the actual equipment catalog.
- Wire colors/endpoints/routes are document data. New-wire color, precision and snapping are ephemeral preferences. Leads have keyboard/numeric route controls and endpoint drag/select reconnection. Routes require circuit v2; original v1 readers remain strict.
- Headers and non-interactive component bodies drag with a threshold, grab cursor and Escape/pointer-cancel rollback; fields and terminals keep their own controls. Shift-click groups; bounded group moves, duplication and atomic deletion share existing undo.
- Grid and snap are off by default (latest user preference). Optional subtle outlines fill the viewport and track measured zoomed-board dimensions and camera offsets: 100×120 logical cells, two per module. Snapping/nudges use the same intervals; existing layouts are never auto-aligned.
- Empty-space drag pans the view; a plain click deselects. Wheel/Shift+wheel and focused-bench arrows also pan; double-click empty space/Home reset pan and the bench-view button resets zoom/pan. Escape cancels a pan. Camera changes never modify project positions or rerun simulation; the old movement rectangle has been replaced by signed V4 workspace positions with an explicit ±100,000 logical-unit safety range. Ctrl+wheel inside the viewport zooms at the cursor; outside browser zoom remains native. Native horizontal/vertical scrollbars and ordinary wheel/trackpad scrolling have now been restored. One scroll-offset camera controls drag/keyboard/reset/zoom, with content-based padding and matching grid alignment; no competing camera transform. Native scrolling uses browser behavior, not authored easing. Source changes await user feedback/verification.
- Circuit controls select DC/AC RMS, frequency and significant digits. Inspector provides actual phases and P/Q/S/PF. Longer numeric fields fit without changing the flat instrument geometry.
- Parameter sweep and Projects reuse the dock instead of adding dashboard cards. Sweeps have sampled SVG plot/table, cursor, previous comparison and CSV, never simulated time. Closing tools discards sweep runs, not circuit/notebook data.
- Named projects/recovery use explicit confirmations and guarded browser storage. Existing legacy autosave stays untouched; see `../MIGRATIONS.md`.
- Technical model explanations are in Help/collapsed Model, not promotional panels. No safety or numerical claims were removed from documentation.
- Full status and verification: `../NOW.md`; research: `../UI_RESEARCH.md`; review: `../REVIEW.md`.

## Remaining limits

Manual routes are available, but leads may still cross equipment and placement is not collision-aware. No automatic obstacle router, schematic view, transformer/machine/transient physics or physical instrument errors. Small phone instrument text remains dense. Preserve the frozen utilitarian direction while deepening independently tested models; do not substitute visual decoration for capability.
