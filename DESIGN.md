---
name: labo
description: Utilitarian electrical-laboratory desktop interface.
colors:
  ink: "#202020"
  muted: "#555555"
  titlebar: "#e4e4e4"
  chrome: "#e7e7e7"
  toolbar: "#f0f0f0"
  panel: "#f3f3f3"
  equipment: "#fafafa"
  canvas: "#b8babc"
  instrument: "#ececec"
  instrument-header: "#d4d4d4"
  display: "#ffffff"
  line: "#aaaaaa"
  selection: "#165eae"
  selection-fill: "#d3deea"
  positive-terminal: "#a43223"
  valid: "#224e2e"
  warning: "#7c3211"
typography:
  body:
    fontFamily: "Tahoma, Segoe UI, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  title:
    fontFamily: "Tahoma, Segoe UI, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 700
  auxiliary:
    fontFamily: "Tahoma, Segoe UI, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 400
  measurement:
    fontFamily: "Consolas, Liberation Mono, monospace"
    fontSize: "min(18px, 1.65cqw)"
    fontWeight: 400
  module-label:
    fontFamily: "Tahoma, Segoe UI, Arial, sans-serif"
    fontSize: "clamp(11px, 1.5cqw, 15px)"
    fontWeight: 700
rounded:
  control: "0px"
  panel: "0px"
spacing:
  tight: "4px"
  group: "8px"
  panel: "10px"
components:
  command-button:
    backgroundColor: "{colors.chrome}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "3px 8px"
  instrument-face:
    backgroundColor: "{colors.instrument}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
---

# Design System: labo

## Overview

**Creative North Star: "Laboratory software, not a product dashboard"**

**Status: user-approved and frozen.** Preserve the overall language and philosophy. Permitted polish: legibility, alignment, spacing consistency, accessibility, focus/hit targets and interaction precision. New panels/instruments inherit the system. Do not redesign the identity, replace the desktop-tool grammar, or reintroduce promotional/coaching blocks without explicit user approval.

Explicit user correction replaces the initial rounded calibration-workbench design. The reference is the functional directness of established engineering desktop software: plain menus, short toolbars, equipment lists, numeric instruments, and a status bar. This is an original implementation of those conventions, not a copied vendor skin.

**Key Characteristics:**
- Full-window working area; minimal application branding.
- Dense neutral chrome and plain equipment lists.
- Flat, compact instrument faces rather than floating UI cards.
- Terse operational text; model explanations available on demand.

## Colors

### Primary

Blue is for selection, focus and active controls—not decorative brand emphasis. Green indicates valid analysis only. Red indicates terminal polarity; selectable wire colors describe the actual lead. Neither connectivity nor validity depends on color alone.

### Neutral

Gray chrome separates commands from the slightly darker wiring surface. Near-white equipment/inspector panels hold text; white numeric fields are directly readable. Thin neutral dividers delineate functional regions. Related neutral shades in `src/styles.css` implement border/hover hierarchy, not separate palette identities.

**The Functional Color Rule.** Color must identify selection, connection, polarity or state. It is not a reward for clicking a button.

## Typography

Native Tahoma/Segoe UI/Arial for commands and labels. Consolas/Liberation Mono for actual numerical readouts and tabular data. There is no display face, promotional headline hierarchy, external font download, or large logotype.

Commands are generally 12px; secondary status/metadata 11px; module labels and measurements scale with the wiring surface. Readout font size also adapts to formatted text length, so longer RMS/high-precision values remain inside the unchanged flat display; full text is available on hover/in Inspector. Precision changes formatting, never physics. Preserve units and tabular alignment. Small mobile module captions/readouts remain dense, not proof of accessibility conformance.

## Layout

Desktop fills the viewport: short title row, menu strip, compact command toolbar, equipment/workspace/inspector columns, bottom status bar. Default side widths are 190px and 242px, reduced at 1100px. Panels can be hidden to reclaim workspace. Recorded data docks beneath the circuit when opened or a reading is recorded.

At 760px and below, controls wrap, equipment becomes a scrolling row and inspector follows the workspace. The wiring surface retains a 680px minimum width and scrolls locally. Status returns to normal document flow; it must not float across a long mobile page.

## Elevation & Depth

No shadows, floating cards, glow, fake bevels or decorative hardware framing. Thin borders and flat gray fields establish hierarchy. Dropdown command lists use a plain border and correct stacking, not a rounded/shadowed popover.

## Shapes

Square-cornered native-looking controls, flat instrument front panels, no tile-based dashboard. Circular sockets remain circular because they are terminal targets, not a decorative shape language. User objections to round/square UI tiles do not remove necessary physical/diagrammatic shapes.

## Components

### Commands and menus

Native disclosure-based menus: File, Edit, View, Tools, Help. Only implemented commands appear. Enter/Space open a disclosure; Arrow Down from a summary focuses its first command; Escape closes and restores summary focus. Buttons inside remain ordinary tabbable controls rather than claiming a full ARIA menubar interaction model.

### Equipment list

Plain symbol/name rows, filter and type/name sorting. Model descriptions are tooltips, not repeated paragraphs. No inspirational question, featured tutorial card, footer pitch or promotional copy.

### Instruments and leads

Compact original diagrams, labels, numeric fields and explicit polarity. Header dragging and keyboard nudging remain functional. No rounded corners or ambient lift. Labels preserve accessible names when visually truncated.

Leads have an enlarged pointer hit stroke and keyboard focus. Selecting one opens its inspector for endpoints, color, route points and deletion. Selected handles render above other leads; labelled sockets remain on top. Route controls have pointer, arrow/Delete and numeric-entry alternatives. Escape clears selection. Removing all leads is a single undoable edit. Shift-click groups headers; move/duplicate/delete retain undo. Snap is optional. New-wire color is ephemeral; existing colors/routes are saved document data.

### Data table and status

Record opens the docked data table; CSV export and snapshot restore remain available. Empty text is simply "No recorded data." Closing the table does not delete records. The bottom bar reports analysis, active operation and storage status. No slogan.

### Investigation and project docks

Parameter sweep and Projects use the same plain bottom dock, native controls and compact tables—not dashboard cards or modal product tours. Plots use sampled SVG traces, labelled axes/units, cursor/table equivalents and broken lines for unavailable samples. AC is labelled RMS with frequency; cached runs retain their captured mode. Scrollable tables are keyboard-focusable. Named project actions and recovery are explicit and confirmed when destructive. Closing tools does not delete circuit/measurement data; sweep runs themselves are ephemeral until exported.

### Model information

Keep units, polarity, errors and necessary immediate operational feedback visible. Put explanatory assumptions/limitations in Help or a collapsed Model section. Removing promotional copy must not conceal numerical errors or claim unsupported physical safety.

## Do's and Don'ts

### Do:
- **Do** prioritize workspace area, compact commands and readable measurements.
- **Do** use plain names such as Equipment, Inspector, Data table, and Model.
- **Do** preserve keyboard operation, visible focus, Escape, undo and explicit units.
- **Do** keep technical diagnostics accurate and model limitations available on demand.

### Don't:
- **Don't** reintroduce slogans, coaching questions, motivational empty states or default lesson cards.
- **Don't** restore rounded floating cards, decorative shadows, large logos or a marketing header.
- **Don't** add dead menu commands for unimplemented instruments/physics.
- **Don't** copy vendor assets, front panels, branding, source or proprietary exercises.
