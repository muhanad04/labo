# Supported electrical models

Current: ideal DC and linear, single-frequency sinusoidal steady state. These are educational numerical models, not hardware ratings, transient behavior or safety guidance. Mathematical 0 V is not protective earth.

## Conventions

- Terminal voltage is `Vp − Vn`; positive branch current flows `p → n`.
- DC voltage/current are signed. Passive-sign power is `V × I`; negative source P means delivery.
- AC sources/readings use **RMS phasors**, never peak amplitudes. Source is `Vrms × exp(jθ)`. All sources share the experiment's frequency and phase origin.
- AC voltage/current readouts are nonnegative magnitudes. Their inspector/CSV phases preserve polarity/direction; swapping meter terminals shifts the voltage angle by 180°, not RMS magnitude.
- Complex power is `V × conjugate(I) = P + jQ`. Apparent power is `|V||I|`; PF is `|P|/S` in [0,1], unavailable at zero S. Use P/Q/phase, not PF alone, to identify delivery or leading/lagging behavior.
- Q positive: absorption by an inductive branch; Q negative: capacitive absorption. P and Q conservation diagnostics include signed sources.
- Angles are in degrees relative to source phase origin (atan2, about −180°…180°). Magnitudes below 1e-12 have unavailable phase; they are not changed to zero.
- `null`/em dash means unavailable, not zero. Display precision (3–7 significant digits) never changes the stored calculation or snapshot values.

## Equipment

| Kind | Model | Parameters |
| --- | --- | --- |
| Voltage source | Ideal prescribed DC voltage or AC RMS phasor, with solved branch current. No internal impedance/current limit. | DC ±1 MV; AC 0…1 MV RMS, phase −360…360°. |
| Resistor | `I = V/R`, no tolerance/temperature dependence. | 0.001 Ω…1 GΩ. |
| Inductor | AC admittance `1/(jωL)`; no resistance, saturation or initial energy. | 1 nH…1 MH. |
| Capacitor | AC admittance `jωC`; no ESR, leakage or initial charge. | 1 pF…1000 F. |
| Ammeter | A genuine zero-voltage series branch, not an inferred nearby current. AC magnitude/phase follows p→n convention. | No burden/overload model. |
| Voltmeter | Non-loading voltage difference between connected nodes. Current/power unavailable. | No input impedance/range/accuracy model. |
| Switch | Closed: ideal 0 V branch; open: no conductive edge, I=0 when the rest of the network is defined. | No arc, bounce or switching-time model. |
| Reference | Shared mathematical 0 V; all references in a document denote the same node. | No earth/neutral-wire impedance model. |

Frequency is 0.01 Hz…1 MHz, default 50 Hz. Bounds are numerical input limits, not claims about practical components. **L/C in DC currently return an explicit diagnostic**; the app does not silently substitute DC shorts/opens or model stored energy.

## Supported networks

Arbitrary supported linear topology, within 40 modules/120 leads. Single/parallel/divider DC, loaded measurement, AC R/RL/RC/RLC, balanced/unbalanced three-phase wye and delta, and floating load-neutral displacement can be built from ordinary elements. Source neutrals and load neutrals are explicit wires/references, not inferred from labels.

The three-phase wye preset uses ABC phases 0°, −120°, +120° with 230 V phase RMS and three 100 Ω branches: line voltage `230√3` V, branch current 2.3 A, total load P 1587 W. Delta and displaced-neutral cases are analytical tests, not additional preset buttons or specialized machine models.

## Numerical behavior and evidence

Pure modified nodal analysis stamps real DC or complex AC equations. AC uses an equivalent real block system and the shared scaled partial-pivot linear solver. A normalized equation residual above 1e-8 rejects the solution. Float64 is not arbitrary precision; broad/extreme values can produce a diagnostic instead of a trustworthy answer.

Missing reference, floating conductive nodes, inconsistent/redundant ideal-source constraints and singular/ill-conditioned networks are errors. Disconnected voltage probes remain unavailable. No hidden leakage, damping or automatic grounding is introduced. In particular, a lossless series LC at resonance under nonzero ideal voltage can be singular; the engine does not invent a finite current.

Independent analytical tests cover DC signs/power, RL/RC and parallel RLC, balanced/unbalanced wye, delta line-versus-branch current, floating star displacement/KCL, ideal resonance and a 40-module series bound. Residual and P/Q balance are additional checks, not independent physical certification. External-engine/reference-hardware comparisons are still future work.

## Investigations are not time simulation

A parameter/frequency sweep solves 2–101 independent steady-state circuits. Plot x is the chosen parameter or frequency, never elapsed time. Lines join actual samples; failed samples create gaps and diagnostics. Captured circuit/spec accompany exported CSV; live editing does not modify a completed run. Sweep runs themselves are ephemeral until exported and are not in project JSON.

No startup/switching transients, harmonics, oscilloscopes, transformers, mutual coupling, machines, mechanical shafts, thermal/protection behavior, tolerance Monte Carlo or safety validation. Add these only as explicit independently tested models; do not imply them through equipment artwork or reconstructed sinusoids.
