# labo

Browser-based electrical laboratory. Construct circuits, calculate DC or single-frequency AC behavior, record measurements, and export projects, data and schematic drawings.

A local-first static application: no account, backend, analytics or paid runtime service.

## Run locally

Use Node 24 LTS.

```sh
npm ci
npm run dev -- --port 5190 --strictPort
```

Open **http://127.0.0.1:5190/**. Choose another port if it is occupied; do not stop unrelated servers.

## Working with a circuit

- **Values:** edit the number directly in its existing field. Units and symbols remain fixed while typing. Enter applies, Escape cancels; leaving the field applies a valid change. Typing `2` in a `kΩ` field means 2 kΩ; an explicit suffix such as `2k` overrides the displayed prefix. Focusing a rounded display never rounds the stored parameter.
- **Connections:** click two terminals, or drag between them. Escape cancels. Select a lead and drag its socket to reconnect; endpoint selectors are also available in Inspector.
- **Leads:** drag a loop up/down or use its arrow keys. No waypoint handles. **Auto color** reclassifies existing and new leads by connectivity. Red is source, black reference/return, blue intermediate/secondary; AC source phase groups use red/blue/green. These are display conventions, not physical wiring or safety indications.
- **Neat wires (experimental):** optional obstacle-aware routing, off by default. Unchecked retains free-curving leads. Overlapping equipment can obstruct routing; crossings are not electrical junctions.
- **Layout:** drag headers or use arrows. Shift-click selects groups; Ctrl/Cmd+A selects all outside text fields, Ctrl/Cmd+D duplicates, Ctrl/Cmd+Z undoes. Grid and snapping are in View; zoom ranges from 50% to 180%.

The included Ohm’s-law circuit is 10 V / 1 kΩ = 10 mA. Other presets cover a divider, series RL, three-phase wye and a loaded transformer.

## Analysis and investigations

| Area | Implemented |
| --- | --- |
| DC / AC | Validated modified nodal analysis; RMS phasors, phase, signed P/Q, VA/PF, residual and conservation diagnostics. |
| Equipment | Voltage sources, resistors, L/C, reference, switches and ideal voltage/current meters. |
| Non-ideal elements | Explicit source internal resistance, winding resistance and capacitor ESR; inspectable complex impedance and series dissipation. |
| Transformer | Linear coupled windings with finite magnetizing inductance, coupling/leakage, winding resistance and optional primary-terminal core-loss shunt. |
| Measurements | Immutable circuit snapshots, restore and CSV with AC quantities and model losses. |
| Sweeps | 2–101 independent parameter/frequency solutions, linear/log spacing, sampled plot/table, cursor, comparison, cancellation and CSV with exact circuit/spec metadata. |

**Tools → Parameter sweep** opens investigations without changing the live circuit. Runs are session-only until exported. Phasors and frequency sweeps are not startup/transient simulation.

## Files and drawings

- **File → Projects:** up to eight named local projects, explicit open/replace/delete actions, export and previous-autosave recovery.
- **Export project:** validated JSON including the circuit and recorded measurements. V1–V3 files remain readable; this version writes V4 project envelopes and preserves older browser-storage namespaces. V4 circuits support signed, expanded-workspace positions (±100,000 logical-unit safety range).
- **Circuit bar → Export drawing:** black-and-white standalone SVG or browser Print/Save PDF. ANSI zig-zag and IEC rectangular resistors are selectable. Uses current component placement; symbols, values, explicit connections and model notes replace instrument boxes. Arrange/separate overlapping modules before export.

Browser storage is not a backup. Export important work. Limits and recovery behavior are documented in [MIGRATIONS.md](docs/MIGRATIONS.md).

## Numerical scope

Models are educational approximations, not equipment ratings. The transformer fixture is checked against **ngspice 47** voltage/current phasors; other fixtures include analytical DC, RLC, three-phase, neutral displacement and power-balance cases. This is scoped evidence, not blanket hardware or commercial-simulator equivalence.

No nonlinear saturation, hysteresis, temperature model, protection, current limiting, rotating machines, harmonics or true transients. L/C/transformers in DC currently produce an explicit unsupported-model diagnostic. Reference is mathematical 0 V, not protective earth.

See [MODELS.md](docs/MODELS.md) and [impedance/reference research](docs/IMPEDANCE_RESEARCH.md).

## Verify

```sh
npm run check
npx playwright install chromium firefox  # once; Firefox optional
npm run test:e2e
npm run test:e2e -- --browser=firefox
npm audit
```

`npm run build` creates `dist/`. Browser tests own strict port 5189. The repository workflow checks the build, numerical/state tests, Chromium workflows and Pages packaging.

## GitHub Pages

The repository supports **Deploy from a branch → main → /docs**.

```sh
npm run build:pages
```

This builds with the `/labo/` base path, then updates only generated site files in `docs/`; source documentation is preserved. Commit those generated files with source changes before pushing. Do not select the repository root as the Pages folder.

After Pages is enabled, the expected address is **https://muhanad04.github.io/labo/**. Publishing this repository alone does not enable Pages. Local persistence does not guarantee offline startup or synchronization between origins/tabs.

## Development context

Start with [AGENTS.md](AGENTS.md), then [docs/NOW.md](docs/NOW.md).

[Architecture](docs/ARCHITECTURE.md) · [Models](docs/MODELS.md) · [Compatibility](docs/MIGRATIONS.md) · [Stack](docs/STACK.md) · [Roadmap](docs/ROADMAP.md) · [Design](DESIGN.md) · [Log](docs/LOG.md)

## Independence and licensing

No affiliation with Festo, LabVolt or LVSIM. No vendor code, faceplates, proprietary courseware or access-control bypasses. Diagrams and example circuits are original.

**No project license has been selected. Do not assume an open-source license.** Dependency licenses remain in [THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt). The ngspice executable and downloaded research are not distributed with the application. See [contribution boundaries](CONTRIBUTING.md).
