# Labo product and engineering vision

Status: capabilities below are goals unless explicitly marked implemented in `NOW.md`. **Explicit user correction supersedes initial styling:** professional utilitarian laboratory software, no promotional/coaching copy or rounded dashboard tiles in the workspace. Technical depth means working instruments and analysis, not motivational writing. Current design authority: `DESIGN.md`.

## Not just a prettier simulator

Build an approachable engineering tool: a virtual bench for constructing, understanding, measuring, and investigating circuits. An original 2D teaching instrument, not a replica of proprietary equipment and not a static illustration with fabricated meter values.

## Meaningful advantages to pursue

- **Inspect the invisible:** highlight whole electrical nodes, reveal calculated voltage/current/power, and connect readings to equations with substitutions.
- **One circuit, multiple representations:** bench and schematic views share topology. This is a future goal; no schematic view exists yet.
- **Useful diagnostics:** distinguish floating nodes, missing reference, invalid ideal-source loops, and disconnected probes. Context-specific educational explanations can deepen over time.
- **Investigations rather than copying numbers:** immutable settings, CSV export, parameter/frequency sweeps, sampled plots and previous-run comparison; later predictions, tolerances and controlled faults.
- **Optional learning path:** if guided predict/build/measure/explain activities are added, keep them separate and opt-in. The default workspace is a direct engineering tool. Starter coaching questions were removed at the user's request.
- **No account required:** local persistence and export first; shared projects/accounts only for demonstrated needs.

## Polish means invisible correctness

Connections survive module movement. Terminal hit areas exceed the drawn socket. Wiring has a preview and Escape cancellation. Undo recovers destructive edits. Engineering notation such as `4.7k` is understood. Units, polarity, and precision are explicit. Distinguish unavailable, invalid, and zero; never interpolate fake instrument readings.

Keep instruments in the workspace rather than separate browser windows. Use original diagrams, native gray tool chrome, flat compact instrument faces, stable-width numerical displays, clear focus, keyboard equivalents, non-color-only identification and responsive controls. Do not reintroduce floating/rounded cards, slogans, large logos or default lesson prompts. Direct dragging must not trail behind the pointer with decorative spring lag. Autosave failure must be visible, with export as a fallback.

## Depth, in stages

1. Ideal DC sources, loads, switches, proper voltage/current measurement, notebook, save/load.
2. Linear AC phasors: RMS, impedance, phase, active/reactive/apparent power, power factor.
3. Three-phase networks: wye/delta, phase sequence, line/phase quantities, neutral and unbalanced loads.
4. Transformers: ratios/polarity before losses, regulation, or saturation.
5. Rotating machines: back EMF, torque, speed, inertia, mechanical load and energy balance, with explicit models/parameters.
6. Investigation tools: sweeps, comparison, tolerances and controlled faults backed by supported physics.

A phasor-reconstructed sinusoid must be labelled steady-state reconstruction, not a transient/startup simulation. More catalog icons do not establish more model depth.

## Expandability without speculative machinery

A modular monolith: document editing, simulation, measurement, persistence, exercises, and presentation behind small interfaces. One source of topology; visual positions do not affect the electrical result. Domain tests cross the same simulation seam as the UI.

Future equipment definitions can collect terminals, parameter rules, original visuals, analysis support and fixtures. A complex device still needs implemented and validated physics; JSON configuration alone does not create a motor model. Mechanical shafts and electrical terminals remain different concepts.

Workers, plugins, cloud synchronization and a general-purpose simulation engine must earn their complexity through measured workload or a real second implementation—not hypothetical extensibility.

## Quality gates

- Analytical fixtures, KCL/KVL, power balance and residual checks before claims of accuracy.
- Schema-validated, versioned projects with preservation/regression tests before storage changes.
- End-to-end student workflows; desktop/phone inspection and accessibility checks, without unsupported conformance claims.
- Dependency/provenance review before public release; project license still undecided.

**The memorable feature should be how clearly labo helps students think.**
