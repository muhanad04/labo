# Impedance and practical linear models — 2026-10-17

Purpose: move beyond ideal-only fixtures while retaining explicit assumptions and independent numerical evidence. More realistic does not mean arbitrary noise/efficiency sliders or commercial-equivalence claims.

## Sources actually consulted

1. **Keysight — Impedance Measurement Handbook overview**, retrieved via https://www.keysight.com/us/en/assets/7018-06840/application-notes/5950-3000.pdf. The retrieved document contains the application-note overview/landing content, not evidence that the full handbook was studied. Used its R+jX / Y=G+jB definitions, series-versus-parallel representation, ideal/real/measured distinction, and dependence on frequency, level, bias, temperature, fixturing and compensation.
2. **All About Circuits — Inductor Quirks**, https://www.allaboutcircuits.com/textbook/alternating-current/chpt-3/inductor-quirks/. Reviewed winding resistance, effective loss, skin effect, core eddy/hysteresis loss and frequency-dependent Q. These effects cannot all be inferred from one constant resistance.
3. **ngspice 47 manual**, https://ngspice.sourceforge.io/docs.html and https://ngspice.sourceforge.io/docs/ngspice-manual.pdf, §3.3.12 coupled inductors: dot convention, 0<k≤1, M=k√(LpLs). Used as independent model/formulation reference, not implementation code.
4. **ngspice official Windows download**, https://ngspice.sourceforge.io/download.html. Downloaded ngspice-47_64.7z from its version-47 SourceForge release folder for local reference runs. Executable/archive remain private/ignored; not an application/runtime dependency.

Some public textbook/search URLs returned 403/404 or unusable search content. They are not supporting evidence. Monid discovery had no configured API key; no paid endpoint was run. Ordinary public documents were used instead.

## Implemented models

- Resistor: Z=R. Existing limits/conventions unchanged.
- Source: Thevenin EMF E with explicit internal R. Passive current p→n gives Vterminal=E+RI; delivered load current is −I. Series heat is |I|²R. Terminal power balance does not double-count internal heat as a separate external device.
- Inductor: Z=Rw+jωL; capacitor: Z=ESR−j/(ωC). Optional nonnegative resistance defaults to zero for old files. Real series power is |I|²R; impedance R/X/|Z|/angle and loss are inspectable/captured.
- Transformer: two coupled windings with Ls=Lp/(Np/Ns)² and M=kLp/(Np/Ns), explicit Rp/Rs, and optional primary-terminal core-loss shunt Rc. Finite Lp supplies magnetizing current; k<1 supplies leakage. P+ and S+ are dotted. Both winding reference potentials must be declared; no automatic grounding hides a floating secondary.
- Transformer input/output power, secondary phasors, copper heat and core-shunt heat are reported. Net device P/Q includes both winding terminals and the shunt; no misleading single two-terminal VA/PF is claimed for the whole four-terminal component.

The Rc shunt is across the primary terminals, not a full fitted iron-core equivalent behind all winding drops. Parameters are educational examples/user inputs, not ratings for any commercial unit. No skin/proximity-effect curve, parasitic capacitance, nonlinear saturation, hysteresis, temperature, protection, current limiting or transient energy history is inferred.

## Independent reference proof

Original fixture: `tests/fixtures/transformer.cir`; captured ngspice phasors: `tests/fixtures/ngspice-transformer.json`. Parameters: 120-unit AC phasor, 50 Hz, 0.5 Ω source R, 2 H/0.5 H windings, k=.995, Rp=2 Ω, Rs=.5 Ω, Rc=20 kΩ, load=100 Ω.

Run from repository root after separately obtaining ngspice 47:

```sh
ngspice_con -b -o research-local/ngspice-reference.log tests/fixtures/transformer.cir
```

The fixture writes `research-local/reference-transformer.dat`. AC magnitudes are interpreted consistently as RMS for subsequent power calculations; this is not transient waveform output. Tests compare voltage/current magnitudes AND phases, copper loss, terminal power balance and residuals—not only rounded display values.

Reference secondary phasor: 59.0265118716089 − j0.6811729962408754 V. Primary terminal phasor: 119.8497909526312 + j0.09659684329588651 V. A lossless k=1 test separately checks exact 2:1 voltage relation while retaining finite magnetizing current. Source short/droop and RC/RL real-loss tests have independent analytical values.

This establishes agreement for one explicit linear reference circuit, not blanket ngspice/commercial/hardware equivalence. Next research should fit measured component parameters at stated f/bias/temperature and add leakage, regulation, no-load/short-circuit fixtures and conditioning stress before nonlinear/time-domain expansion.

## Schematic export research (implementation pending)

- CircuitikZ manual: https://mirrors.ctan.org/graphics/pgf/contrib/circuitikz/doc/circuitikzmanual.pdf. Reviewed American/european resistor conventions, orthogonal connections, explicit junction dots versus non-contact crossings, and component-label placement. No diagrams/code/assets copied.
- KiCad schematic plotting: https://docs.kicad.org/9.0/en/eeschema/eeschema.html (Plotting). Confirms SVG/PDF, black/white output, page sizing and minimum line-width concerns. A textbook schematic should render electrical topology and labels, not instrument boxes or a bench screenshot.
- User was asked ANSI zig-zag versus IEC rectangular resistor preference. Export style/default and implementation remain to be completed; do not expose a dead export command or claim this already ships.
