# Research sources

Accessed 2026-10-16. These are references, not bundled content or permissions to reuse. Findings below are paraphrases. No third-party implementation code has been imported.

## Primary reference product

| ID | Source | Evidence and scope |
| --- | --- | --- |
| S1 | [LVSIM-EMS public application](https://lvsim.labvolt.com/) | Demo workspace, catalog, menu labels; About dialog displayed version 4.31.21225. Cancelled code prompt normally. No authenticated access. |
| S2 | [Official help PDF](https://lvsim.labvolt.com/Help/HelpEms_EN.pdf) | Opened through Help → Contents and Index. Reviewed overview (printed p. 7), commands/actions (pp. 10–18), and multimeters/options/data recording (pp. 87–91), plus contents/targeted text searches. Describes placement, wiring, shaft belts, instrumentation, and persistence. Documentation claims are not independent accuracy verification. |
| S3 | [Official manual/exercise compatibility page](https://lvsim.labvolt.com/Manuals.html) | Opened through Help → Manuals and Exercises. Lists curriculum coverage and simulation limitations. Individual student manuals were not downloaded or used as exercise content. |
| S4 | [Metering UI](https://lvsim.labvolt.com/Metering.aspx) | Opened through toolbar. Voltage/current/power/torque/speed/mechanical-power readouts and acquisition-window status visible; no connected circuit used. |
| S5 | [Data Table UI](https://lvsim.labvolt.com/DataTable.aspx) | Opened through toolbar (actual launch included `?opengraph=undefined`). Spreadsheet-like table visible. Recording/export correctness not tested. |
| S6 | [Oscilloscope UI](https://lvsim.labvolt.com/Scope.aspx) | Initial exploration: eight channel controls, time base, triggering, cursor statistics. No live waveform validation. |

The help PDF and extracted text used for private reading are under ignored `research-local/`. They must not become application assets or distributable documentation. Our records contain only summaries and source links.

## Other educational products and solver candidates

| ID | Source | Finding and implication |
| --- | --- | --- |
| S7 | [Falstad circuit simulator](https://www.falstad.com/circuit/) | Working embedded schematic-simulator UI and public instructions expose animated current/voltage, component editing, scopes, and example circuits. Useful comparison, not an electrical-machines lab replacement. No numerical validation performed. |
| S8 | [CircuitJS repository overview](https://github.com/pfalstad/circuitjs1) | README describes a Java/GWT browser simulator, iframe/JavaScript integration, and GPL version 2 or later. Reuse would require license compliance and architecture evaluation; it is not an unrestricted drop-in TypeScript package. Implementation files were not studied. |
| S9 | [ngspice overview](https://ngspice.sourceforge.io/) | Netlist-based engine with passive/active devices and third-party schematic frontends. Good candidate for future reference calculations or engine integration; not a ready-made lab interface. |
| S10 | [ngspice FAQ](https://ngspice.sourceforge.io/faq.html) | Describes a shared-library interface and modified-BSD software licensing; manual licensing differs. FAQ contains old release/date information, so do not use it for current version selection. Audit the exact distribution and linked dependencies before adoption. Browser/WASM feasibility was not tested. |
| S11 | [ngspice quality assurance](https://ngspice.sourceforge.io/quality.html) | Describes regression circuits and expected plots, reinforcing the need for reference fixtures. No test suite copied or run. |
| S12 | [PhET Circuit Construction Kit: DC](https://phet.colorado.edu/en/simulations/circuit-construction-kit-dc) | Learning goals include circuit construction, series/parallel reasoning, and meter use. Lists alternative input, pan/zoom, and interactive highlights. Launch page exposed Intro/Lab choices and keyboard-shortcut resources; no completed circuit test. |
| S13 | [PhET licensing](https://phet.colorado.edu/en/licensing) | Page currently describes regular HTML simulation files as CC BY-NC 4.0 with attribution/branding requirements and separate commercial licensing. Source-code licensing must be checked separately; do not infer it from simulation-file terms. We are not embedding or copying PhET. |
| S14 | [Virtual Labs electrical engineering catalog](https://www.vlab.co.in/broad-area-electrical-engineering) | Public directory links electrical machines, measurements, drives, control, and power labs. Useful immediate study resources for students. |
| S15 | [IIT Roorkee Electrical Machines lab](https://ems-iitr.vlabs.ac.in/) | Experiment list includes DC machine control, generator characteristics, and transformer tests. Experiment pages separate aim, theory, pretest, procedure, simulation, posttest, and references. |
| S16 | [Field-resistance motor-control experiment](https://ems-iitr.vlabs.ac.in/exp/dcmotor-field-resistance-control/) and [simulation](https://ems-iitr.vlabs.ac.in/exp/dcmotor-field-resistance-control/simulation.html) | UI exposes labelled terminals, connection checking, current/speed controls, data table, graph, and print. Controls initially disabled. An empty-circuit Check opened a dialog; no successful wiring or model validation performed. Footer links AGPL 3.0 and CC BY-NC-SA 4.0, but per-file scope was not audited. No assets/code reused. |

## Discovery limitations

- Monid discovery was attempted but had no configured API key; no paid endpoints were run.
- Google and DuckDuckGo presented bot challenges; no attempt was made to solve or circumvent them.
- Bing returned unrelated results for an exact product query; those results were discarded as unreliable evidence. Yahoo returned HTTP 500.
- `www.labvolt.com` redirected to a Festo technical-education page that returned Access Denied. It was not bypassed.
- Research proceeded through directly accessible primary pages and their ordinary public links. This is a focused survey, not an exhaustive web search or a legal clearance review.
