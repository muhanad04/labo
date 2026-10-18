# Research synthesis and build readiness

**Decision: ready to start an original, narrowly scoped labo prototype. Not ready to promise full LVSIM equivalence.**

Research date: 2026-10-16. **Historical pre-build synthesis:** the first DC vertical slice has since been implemented. Current capability/next task: [NOW.md](NOW.md); current decisions: [ARCHITECTURE.md](ARCHITECTURE.md) and [STACK.md](STACK.md). Proposed defaults below are not competing implementation instructions. Evidence links and access limitations: [SOURCES.md](SOURCES.md). This document is not a transcription of another product.

## What kind of product are we building?

The important idea is a **virtual teaching bench**, not a conventional schematic editor alone. Students arrange modules, connect terminals, change settings, observe instruments, and record experiments. Electrical-machine labs additionally couple rotating shafts and measure mechanical quantities.

The reference help describes drag-and-drop module placement, editable patch leads, node highlighting, control knobs, undo/redo, and mechanical belts. It also describes file persistence and measurement tables/plots. The compatibility page spans DC circuits, AC power, transformers, three-phase systems, and rotating machines [S2–S3]. These are broad functional ideas we can implement independently, not a requirement to reproduce proprietary hardware or exercises.

## Feature map

| Capability | Evidence | Labo treatment |
| --- | --- | --- |
| Arrange equipment and connect labelled terminals | Official help; demo rack/catalog visible | First prototype: original generic modules, placement and terminal-to-terminal leads |
| Inspect connected electrical nodes | Official help | Early debugging tool; highlight by net identity, not just color |
| Voltage/current/resistance instruments | Official help; metering UI inspected | DC voltage and series current first; resistance mode later with explicit de-energized-circuit rules |
| Save work and recover sessions | Official help | Own versioned JSON and local autosave; no vendor-format compatibility |
| Record results and draw curves | Official help; table UI inspected | Add a small measurement notebook and CSV export; not a spreadsheet clone |
| Single-phase RLC, phase, power factor | Curriculum/compatibility page | Next physics milestone: sinusoidal steady-state AC |
| Balanced/unbalanced three-phase circuits | Curriculum/compatibility page | After AC: phase sequence, line/phase quantities, wye/delta loads |
| Transformers | Curriculum/compatibility page | Ideal ratios first; losses/regulation only with documented models |
| Motor/generator and shaft loads | Help and curriculum | Separate later milestone with electrical/mechanical state and validated parameters |
| Scope, harmonics, synchronization | Help; scope UI inspected | Scope tied to genuine time-domain data; harmonics only when a suitable model exists |

UI visibility or a documentation description is not proof that a feature was exercised successfully or is accurate.

## Suggested first playable lab

**A DC power bench with a source, selectable resistive loads, switch, and meters**, presented as an original modular lab rather than a vendor rack replica.

A student should be able to:

1. Open a blank bench or an original Ohm's-law exercise.
2. Add modules and connect labelled terminals, with a keyboard alternative.
3. Change source voltage and resistance, with units and valid ranges.
4. Calculate a supported circuit and see clear diagnostics for invalid wiring.
5. Connect a voltmeter in parallel and an ammeter in series, with documented polarity.
6. Record a measurement and compare against a prediction.
7. Save, reload, and continue without an account.

Start with a tiny valid end-to-end circuit, then generalize. A polished static picture with fabricated meter values does not count as a simulator.

## Physics progression and acceptance examples

These are independently specified analytical checks, not comparisons with proprietary outputs.

| Stage | Models | Example acceptance checks |
| --- | --- | --- |
| DC | Ideal sources, resistors, switches, ideal meters | 10 V / 1 kΩ = 10 mA; divider = 5 V; KCL/KVL and power balance; invalid ideal-source loops diagnosed |
| Single-phase AC | Linear RLC phasors at one explicit frequency | 10 V RMS / 100 Ω = 0.1 A RMS and 1 W; inductive current lags, capacitive current leads; declare RMS phasor convention |
| Three-phase AC | Independently connected phases and neutral, linear loads | Balanced 230 V RMS phase-neutral source and 100 Ω wye branches: 2.3 A per phase, approximately 398.37 V line-line, 1587 W total; verify unbalanced neutral behavior separately |
| Transformers | Declared ideal winding relations initially | 2:1 primary:secondary ratio gives 120 V from 240 V; current ratio inverse; conserved ideal power; polarity checks |
| DC machine | Declared armature circuit, back EMF, torque constant, inertia/load | Check energy balance, no-load/load trends, and steady state against independently derived equations; choose and document original/generic parameters first |

AC phasors cannot simulate startup, switching transients, saturation, or arbitrary harmonic waveforms. A sine trace reconstructed from a phasor must be labelled **steady-state reconstruction**, not a transient simulation. Simulation time and wall-clock time must be kept distinct.

## Build-versus-reuse assessment

| Option | Strength | Cost/risk | Recommendation |
| --- | --- | --- | --- |
| Small independent TypeScript DC solver | Transparent assumptions, straightforward fixtures, fits a generic module bench | We own validation; limited supported physics | Start here; keep solver/UI separate |
| CircuitJS integration | Existing browser simulation and example ecosystem [S7–S8] | GPL compliance, GWT toolchain, schematic-oriented UX, integration evaluation | Possible alternative if a GPL-based integration is desired; do not copy casually |
| ngspice integration | Established netlist engine and reference-test ecosystem [S9–S11] | Browser packaging, worker/WASM investigation, model licensing, diagnostics translation | Candidate reference engine and later spike; do not assert browser readiness yet |
| Embed an existing educational sim | Useful immediately for studying [S12–S16] | Not our own flexible lab; licensing/branding/embedding constraints differ | Link students to useful resources; do not silently rebrand |

No external simulator is installed, vendored, or selected. An independent initial solver is a scoped engineering choice, not a claim that writing a full general-purpose engine is easy.

## Lessons to adopt independently

- **From the reference lab:** terminals and explicit wiring make experiments tangible; node highlighting helps diagnose mistakes.
- **From PhET:** prioritize a short learning path, accessible controls, and a distinction between introductory and freer exploration [S12].
- **From Virtual Labs:** pair simulation with an aim, prediction, procedure, observations, and reflection; create our own wording and activities [S15–S16].
- **From engine projects:** treat numerical regression and model limitations as first-class deliverables [S9–S11].

## Risks to resolve through building

- Visual connectivity must compile to a real electrical graph; crossing wires must not imply a junction.
- Moving a module preserves terminal IDs and electrical connections. Deleting it cleans dependent wires/probes atomically.
- Ideal current measurement changes topology. Disconnected/invalid measurements show unavailable, not a misleading zero.
- Open switches can create floating subnetworks; define diagnostic policy and do not hide singular systems with arbitrary grounding.
- Historical notebook readings retain their original parameters/revision, while live readings invalidate after edits.
- Circuit reference is a mathematical convention, not necessarily protective earth. Labels must not teach unsafe physical wiring assumptions.
- Publicly viewable assets/text are not automatically reusable. Exact dependency and content licensing remains a release gate.

## Readiness boundary

We have enough information to implement a first independent DC bench and its tests. We do **not** have validated models for motors, transformers with losses/saturation, or full transient three-phase behavior; vendor model internals and numerical equivalence are neither known nor required.

Suggested defaults for starting: browser-first, laptop/desktop first, English initially, local-only storage, TypeScript/React/Vite, original SVG modules, no paid services. These are proposals pending implementation approval. Course priorities and license choice remain open; if the urgent need is machines, choose one machine experiment explicitly instead of pretending the DC milestone solves that course.
