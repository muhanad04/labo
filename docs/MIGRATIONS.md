# Project compatibility and recovery

## Current transition — v4 signed workspace (2026-10-18)

V1/V2/V3 experiment readers remain strict and unchanged. V4 extends the V3 non-ideal/transformer model only in layout: finite signed module coordinates within ±100,000 logical units, legacy wire points within ±101,200. This removes the old x=0…1000/y=0…620 movement rectangle, not all numerical safety limits. New movement/duplication/positioned creation promotes to V4; existing positions are never automatically translated, scaled or recentered. Group moves retain one delta and translate internal legacy routes together.

Project envelopes read versions 1–4 and write V4, validating all nested experiments/observations. Reading an older experiment keeps its original version/values; normalization of the returned envelope does not write storage. Model/analysis edits preserve an existing V4 circuit instead of downgrading its layout.

Active autosave/recovery use `labo.project.v4` / `labo.project.v4.previous`. Startup falls back read-only through V3 → V2 → V1. The library writes `labo.library.v3`, reads V3 → V2 → V1 catalogs, and retains the existing catalog envelope shape. Prior project/library keys are never deleted/overwritten. Recovery also considers V3 active/previous and V2 active/previous before V1. Writes remain atomic per key; failed/quota writes retain previous data and report an error.

**Rollback:** older builds cannot read V4 files/expanded coordinates. Their older storage namespaces remain intact; returning to an older build recovers the pre-transition save/catalog, not later V4 changes. Export V4 work before rollback. Current undo restores the exact prior circuit (including its version/layout); live view pan/zoom are not saved physics or migrated data. No destructive contraction is authorized.

**Verification:** source changes only; user has stopped test suites/builds/browser verification. Preservation paths are implemented but NOT independently verified in this batch. When permitted, cover signed move/reload/import/export/undo/group routes, V1–V3 unchanged reads, older-key/catalog preservation and malformed/quota recovery. Old tests hard-coding V3 keys/envelopes need updates; do not claim earlier passing results cover V4.

## Historical transition — v1 to v2

The following describes the earlier ideal-DC to routes/RMS-AC transition, not current writers/storage keys. V3 subsequently added explicit loss models, four-terminal transformers and loop data; current source/research details are in NOW.md and IMPEDANCE_RESEARCH.md.

## Readers and writers

| Data | Read | Write |
| --- | --- | --- |
| Experiment | Strict v1 and strict v2 | V1 retained until an edit needs v2 fields; advanced edits promote to v2. |
| Project envelope | `labo-project` v1/v2; every nested experiment/snapshot validated | V2, including when the inner circuit remains v1. |
| V1 fields | Original six device kinds, colors, IDs, parameters, positions and observations | Preserved semantically. Reading alone does not save or mutate storage. |
| V2 additions | Optional mode/frequency, source phase, L/C, up to 12 route points/lead | Explicit data; unknown versions/fields still rejected. |
| Named catalog | `{ version: 1, entries }`, up to eight validated project entries | Same catalog version; embedded projects use v2 envelope. |

Absent analysis settings mean DC with a 50 Hz default for later AC mode. Existing source values, polarity, wire endpoints/colors, positions and captured readings retain their meanings. No v1 relaxation to accept new fields; change circuit version when adding them.

## Browser keys

- **`labo.project.v2`**: active autosave, written by this build.
- **`labo.project.v1`**: legacy fallback, read only when active v2 is absent. This build never writes/deletes this key.
- **`labo.project.v2.previous`**: previous valid, different v2 active envelope. At most one recovery generation, not a full history.
- **`labo.library.v1`**: named project catalog, independent of active/recovery keys.

Before replacing active autosave, validate its previous contents. Copy valid previous data to the recovery key; a malformed active value must not overwrite an existing valid recovery copy. Quota/write failures surface export guidance, not false success. If writing recovery fails, active replacement is not attempted.

Startup corruption produces a visible warning and a fallback circuit; it does not rewrite the corrupt key. Editing that fallback may replace active data—export/recover before editing if the old data matters. A present but invalid v2 key does not silently fall through to old v1 data. **File → Projects → Recover previous autosave** explicitly loads recovery (or legacy v1 if no recovery key exists), validates it, and asks confirmation before replacement.

Named saves/replacements/deletions first re-read and validate the entire catalog. Malformed catalogs, oversized data and failed writes leave existing stored text untouched. Replacing/deleting/opening is explicit; deleting a named copy does not delete the active circuit. Browser storage is still not a backup and has no cross-tab conflict protocol.

## Rollback

1. Export important current v2 projects before changing builds; do not delete active/recovery/library keys as a repair shortcut.
2. An older v1-only build can read its untouched `labo.project.v1` on the same origin. A separate origin/profile is safer for experimentation.
3. Older builds cannot read v2 files/features. There is **no automatic lossy downgrade** of AC/route data. Keep the new build/export for those projects.
4. Returning to this build prefers its v2 active key. Edits made in an old build are not automatically synchronized into v2; explicitly export/import the desired file.

No destructive cleanup is currently scheduled. An IndexedDB migration must add its own preservation/rollback proof before adoption.

## Preservation evidence

`src/state/storage.test.ts`, `project.test.ts`, `core.test.ts` and browser `expansion.spec.ts` cover original file/observation round trips, strict unknown-field/version failures, v1 load followed by v2 editing/reload while legacy bytes remain unchanged, valid recovery retention when active data is corrupt, named save/replace/delete, malformed catalog refusal and storage quota failure. A phone regression keeps corrupt-startup warnings visible without page overflow.

Preservation is structural/semantic plus retained legacy bytes, not a promise of byte-identical exported JSON, tamper-proof measurements, unlimited recovery or physical-model certification.
