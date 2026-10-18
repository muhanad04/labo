# Public reference exploration

## Session

- Date: 2026-10-16 (local environment date).
- URL: https://lvsim.labvolt.com/
- Browser title: LVSIM-EMS.
- Method: ordinary browser navigation, rendered text, accessibility snapshots, visual inspection, and UI tooltip labels.
- Boundary: accepted essential cookies, cancelled the access-code prompt, and inspected the resulting public Demo Mode. No code entered, no access-control changes, no vendor implementation code inspected or copied.
- Reference screenshots were temporary browser artifacts outside the repository; no vendor assets are included here.

## Confirmed observations

### Entry and workspace

The initial page requests an access code. Cancelling leaves a workspace explicitly labelled **Demo Mode**. This establishes that a public demo is visible, not that all its features work without a license.

The desktop layout has a menu/toolbar above a left equipment list and a large rack workspace. The screenshot showed a three-column rack with multiple slots and a low-power output labelled 24 V / 3 A. The status bar displayed an AC network of 120 V / 60 Hz.

### Equipment catalog

The list can be sorted by part number, name, or type. Visible entries cover:

- DC and AC motors/generators, including induction and synchronous machines.
- Resistive, inductive, and capacitive loads.
- Single- and three-phase transformers, an autotransformer, and a transmission line.
- Synchronizing/contactor modules, batteries, and power supplies.
- Dynamometers and data-acquisition/control interfaces.
- Blank rack modules.

These are observed catalog categories, not proof that every module is usable in the demo. Labo should define its own generic catalog and identifiers.

### Controls and instruments

Visible menu headings: File, Edit, View, Instruments, Tools, Help.

Toolbar tooltip labels expose new/open/save/print, undo/redo, data table, oscilloscope, metering, phasor analyzer, harmonic analyzer, synchroscope, two multimeters, a dynamometer/power supply, and zoom controls. A wire-color button and equipment-list show/hide controls are also present.

Opening the oscilloscope through its toolbar control launched a separate browser tab at `https://lvsim.labvolt.com/Scope.aspx`. Its rendered UI exposed eight channels, time-base and trigger settings, cursor controls, and a channel-data table with cursor difference, RMS, average, and frequency headings. A time base of 5 ms/div was shown. Signal acquisition and numerical correctness were not tested.

### Visual character

The reference uses equipment thumbnails, realistic rack framing, a dense desktop toolbar, and separate instrument windows. These communicate a physical teaching bench. They are observations, not a visual specification for labo; we should use original simplified diagrams and a distinct interface.

## Inferences — not verified

- The catalog and rack suggest selecting/placing equipment and connecting terminals as the central workflow.
- Wire-color controls suggest color-coded patch leads.
- Instrument and data-table labels suggest measuring and recording experiments.

Placement, wiring, simulation execution, persistence formats, undo behavior, demo limits, and instrument accuracy were **not tested** in this quick run. No claims are made about the vendor's solver or internal architecture.

## Proposed labo workflow

Choose an original exercise → place generic components → connect labelled terminals → set values → validate circuit → calculate → measure → compare prediction with results → save locally.

This is our proposed workflow, not a verified reproduction of the reference.

## Questions before implementation

1. Which courses and first experiments matter most to the students?
2. Is an electrical-machines lab required immediately, or is a DC circuits foundation useful first?
3. Which devices need support: university desktops, laptops, tablets, or phones?
4. Which language(s), accessibility needs, and unit conventions matter?
5. Do students need worksheets, exportable measurements, or instructor assessment?

## Follow-up exploration — 2026-10-16

A second pass reviewed the publicly linked official help and compatibility page, additional instrument UIs, and other educational simulators/solver projects. See [source register](SOURCES.md) for exact links and [build-readiness synthesis](BUILD_PLAN.md) for the feature map and engineering recommendation.

### Additional direct observations

- Help → Contents and Index opens a public PDF; Help → Manuals and Exercises opens a public compatibility/curriculum page.
- About displayed application version 4.31.21225.
- Metering opens a separate tab with voltage, current, electrical power, torque, speed, and mechanical-power readouts. These were inspected with no connected circuit; zero readouts are not validation evidence.
- Data Table opens a separate tab with spreadsheet-like rows/columns. Recording and export were not tested.
- Two ordinary pointer-drag attempts did not place a resistive module in the rack. This does not establish whether the cause was demo restrictions, interaction mechanics, or automation. No restriction was altered to proceed.

### Documented behavior — not independently exercised

The official help describes drag/drop placement, terminal wiring, reshaping/reconnecting leads, highlighting connected nodes, moving connected modules, undo/redo, shaft coupling by belts, local lab files, instrument configuration, and measurement recording/graphs. This adds documentary support to initial workflow inferences; it does not turn them into successful interaction tests.

The official compatibility page explicitly discloses omitted saturation effects in certain models, missing hardware-interface features, exercise-specific exceptions, and simulation speed that is not wall-clock real time. We should similarly document our assumptions rather than promise perfect physical or commercial equivalence.

### Wider survey

Reviewed public Falstad/CircuitJS information, ngspice overview/FAQ/quality pages, PhET DC circuit goals and licensing, and Virtual Labs electrical-machine pages including a simulation UI. These offer different combinations of general simulation, guided education, and machine-specific experiments. No third-party assets or code were incorporated.

## Further research

Discovery is sufficient for a first original prototype, not an exhaustive survey. Continue targeted research when adding specific physics. Validate against theory, analytical fixtures, and appropriately licensed independent references. Respect public-access boundaries; record source and license checks before any reuse.
