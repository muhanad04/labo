# Architecture — current implementation

Ideal DC and single-frequency RMS AC, with editor, measurement, sweeps and bounded local persistence. [MODELS.md](MODELS.md) defines physical conventions; [MIGRATIONS.md](MIGRATIONS.md) defines compatibility. Code/tests and [NOW.md](NOW.md) outrank historical proposals.

## Modules and seams

| Module | Files | Responsibility |
| --- | --- | --- |
| Domain | `src/core/circuit.ts` | Device/terminal/document types, strict v1/v2 readers, semantic validation, quantities and DC presets. |
| Examples | `src/core/examples.ts` | Original RL and three-phase wye circuits; ordinary domain data, not solver special cases. |
| Analysis | `src/core/solve.ts`, `linear.ts` | Pure `analyze(experiment): Analysis`; DC/complex MNA, scaled pivoting/residuals, readings or diagnostic. No React/storage. |
| Editing | `src/core/edit.ts` | Pure bounded group movement/deletion/duplication; copies only internal leads with fresh identities. |
| Investigations | `src/core/sweep.ts`, `csv.ts` | Validated bounded `runSweep`, immutable basis/spec, cancellation/progress, electrical signature and shared CSV serialization. No UI/storage. |
| Project state | `src/state/project.ts` | Zustand edits/history/selection, live document, observations, `decodeProject`, autosave and recovery copy. |
| Named library | `src/state/library.ts` | `readLibrary`/save/delete/readRecovery; validate before writing, refuse malformed-catalog replacement. |
| Bench | `src/ui/Bench.tsx`, `WireHandles.tsx` | HTML instruments, SVG leads, route/endpoint controls, transient pointer previews and keyboard equivalents. |
| Inspector/data | `src/ui/Inspector.tsx`, `Notebook.tsx` | Parameters, phases/P/Q/S/PF, connections/routes, captured measurements and restore/CSV. |
| Optional tools | `src/ui/Sweep.tsx`, `Projects.tsx` | Lazy-loaded bottom dock. Only one tool dock mounted at a time; controls remain native. |
| Commands/shell | `src/ui/CommandMenu.tsx`, `src/App.tsx` | Native disclosure groups, equipment/filter/sort, panel visibility, precision, zoom, import/export and shortcuts. |
| File utilities | `src/ui/files.ts` | Downloads; re-exports shared formula-safe CSV serializer. |

Modular monolith, not a plugin framework/monorepo. Add capability at the narrowest responsible seam, not speculative layers.

## Document contract

- Experiment v1 retains its strict original fields/kinds. V2 adds optional analysis settings, L/C, source phase and wire route points. Missing analysis means DC/50 Hz. Project envelopes write v2 and read v1/v2, including nested old snapshots.
- Stable terminals: `<id>:p|n`; reference (`ground`) has only `:p`. Paths/crossings/waypoints are never electrical junctions.
- Layout is a separate `positions` map: x 0–1000, y 0–620. Logical bench is 1200×800; preserve these legacy placement bounds. Route points may span the full bench.
- Zod rejects unknown fields/versions. Semantic validation checks unique IDs/labels, complete positions, actual terminals, self/duplicate wires and parameter bounds.
- Limits: 40 devices, 120 wires, 12 points/lead, 100 observations, 2 million JSON characters; file picker also checks 2 MB bytes. Named library separately caps eight entries/2 million characters.
- Parameter ranges and precise physical semantics: MODELS.md. Persistence/rollback: MIGRATIONS.md.

## Numerical path

1. Validate; union wired terminals into nets and all declared references into shared 0 V.
2. Check conductive reachability to reference. Non-loading voltmeters do not ground floating nodes. No hidden leakage or automatic ground.
3. Stamp MNA admittances/voltage constraints and branch-current unknowns. Ideal meters and closed switches use real zero-voltage branches.
4. DC solves a real system. AC stamps complex admittance and RMS source phasors, then solves the equivalent real block system `[G -B; B G]` using the same scaled-pivot elimination.
5. Singular/inconsistent/ill-conditioned ideal networks return a diagnostic. Check normalized residual (limit 1e-8) rather than returning plausible-looking partial readings.
6. Return net identities, node potentials (AC magnitudes), residual, signed P/Q balance and per-device readings/phases. Disconnected probes are unavailable, not zero.

AC is not time integration. Ideal resonance may be unsolvable; no damping is inserted to disguise it. See MODELS.md before adding or interpreting physics.

## Editing/live results

Validated immutable commits retain up to 50 past documents; edits clear redo. Group deletion and attached wires are atomic. Duplication gives fresh IDs, preserves labels' uniqueness, copies only selected-to-selected leads and bounds placement. Grid snapping affects placement, never connectivity.

Dragging uses local previews; release makes one history entry. Routed points translate with a moved group only when both endpoints belong to it. Endpoint reconnect preserves wire identity/route and rejects self/duplicate connections. Selected lead handles paint above other wire hit strokes; sockets stay above leads. This stacking is covered by real drag reconnection tests.

Analysis is derived with `useMemo` from devices/wires/analysis settings, not positions. Selection, grid/snap, default lead color, precision, panels and zoom are ephemeral; actual colors/routes/mode/frequency/phase belong to project data. Precision only formats values. Electrical signatures ignore labels/layout/colors/routes but detect topology/parameters/mode/frequency, so stale sweeps are identified without treating movement as a physics change.

## Measurement/sweeps

Observations copy the entire experiment and full-precision results. Restore keeps the notebook; new/preset/import replaces it and resets history. Data summarizes first source/resistor/meters; CSV includes all captured non-reference readings, AC phases/P/Q/S/PF and mode/frequency. This is not an arbitrary spreadsheet.

Sweeps solve 2–101 independent settings from a cloned basis (linear/log spacing), never mutate the live project, yield every four points and honor abort. Failed samples have null values/diagnostics and break the plotted trace. Native SVG plots connect actual samples, offer sampled cursor/table access and an optional compatible previous trace. Comparison requires matching mode/parameter/channel/quantity/spacing; ranges may differ. No chart dependency or synthetic scope waveform.

Sweep results retain exact basis/spec in memory and CSV. Closing the tool unmounts it and discards runs; project JSON/named entries currently save circuit/observations, not sweeps. Restore captured circuit asks confirmation. Async jobs have their own abort controller; a future worker must preserve the same cancellation/basis guarantees.

## Persistence

Active autosave: `labo.project.v2`; read-only legacy fallback: `labo.project.v1`; previous valid active save: `labo.project.v2.previous`; named catalog: `labo.library.v1`. Full contracts and rollback procedure are in MIGRATIONS.md. Storage failures are reported; JSON export does not depend on storage.

Imports/internal replacements validate completely before replacing current state. Corrupt data is not rewritten on startup. A later edit of fallback state may replace active autosave, but must not destroy valid recovery or legacy keys. Named saves/deletes refuse to overwrite a malformed catalog. This is bounded localStorage, not durable backup or concurrent-tab coordination.

## Verification and future seams

- `core.test.ts`: original analytical DC/sign/residual/diagnostic/quantity/document cases.
- `ac.test.ts`: resistive, RL, RC, parallel RLC, balanced/unbalanced wye, delta, floating neutral, resonance and 40-module analytical bound.
- `edit.test.ts`: group boundary/relative movement, routes, atomic deletion and isolated internal-wire copying.
- `sweep.test.ts`: analytical samples, log bounds, unsupported samples, cancellation, signatures, immutability and CSV safety.
- `project.test.ts`, `storage.test.ts`: history/snapshots, schema compatibility, safe catalog operations, malformed/quota paths and preserved legacy/recovery data.
- Three browser specs: original construction/edit/file workflows, frozen utilitarian workspace, and new route/group/sweep/AC/project/recovery workflows. Chromium and Firefox runs; no WebKit/real touch/assistive-tech certification.

Next depth: independently validated transformer then machine models; true transients require a separate validated formulation. Workers, IndexedDB, external engines and schematic representation each need concrete workload/model/preservation evidence before adoption.
