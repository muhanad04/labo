# UI research — utilitarian laboratory controls

Date: 2026-10-16. Scope: follow-up prompted by explicit user rejection of promotional/coaching copy and rounded dashboard styling. Existing primary-source register: [SOURCES.md](SOURCES.md).

## What was inspected this time

Ordinary public Demo Mode at https://lvsim.labvolt.com/ after accepting essential cookies and cancelling the code prompt. Inspected View/Edit/Tools menus, toolbar, equipment catalog, status bar and the separately opened Metering application at https://lvsim.labvolt.com/Metering.aspx. No access code, authentication bypass, implementation-source inspection or vendor asset reuse.

Private visual references are under ignored `research-local/reference-workspace.png` and `reference-metering.png`. They are not shipping assets.

## Direct observations

- Small conventional menu strip above a compact row of tool icons; neither area tries to introduce or sell the product.
- Equipment catalog is a plain sortable list, separate from the primary working area. Large free working space is acceptable; it does not need a tutorial card or decorative metrics to fill it.
- View exposes equipment-list visibility and zoom. Edit exposes undo/redo and bulk connection removal. Tools exposes options/interface settings and data recording.
- A narrow bottom status bar reports operating context. Status is not mixed with a brand slogan.
- Metering is a dense numeric instrument matrix: compact selectors, units/mode labels and numerical displays. Its information density comes from operational controls rather than paragraphs.
- Menus use simple neutral surfaces and a high-contrast selection state. Hardware-style framing exists in the reference, but is not necessary to adopt its useful interaction conventions.

These are direct UI observations. Newly inspecting these controls does not establish numerical accuracy or a license to copy their assets. Placement/simulation limits from the earlier research still apply.

## Conclusions for labo

1. Replace large branded header/tabs/footer with title, menus, compact toolbar and an operational status bar.
2. Delete slogans, lesson questions, motivational empty states and duplicated model disclaimers from the normal workspace. Keep genuine errors, units and available Help/model details.
3. Replace floating rounded modules with flat compact original instrument faces. Circles remain appropriate for terminal sockets; avoid turning the whole product into card tiles.
4. Keep conventional functional names: Equipment, Inspector, Data table, Model.
5. Add real task controls: lead selection/recolor/delete, undoable bulk lead removal, panel toggles, equipment sorting and docked data. Do not create decorative menus for unimplemented scope/AC/machine features.
6. No need to copy retro icon artwork, logos, rack bevels, font assets, proprietary faceplates or exact screen geometry.

## What changed after the comparison

Implemented the above conventions with native semantic controls, original SVG diagrams/icons and existing DC analysis. Removed the unused custom font dependency. No new physics, file migration or vendor dependency was introduced. Tests explicitly guard against the rejected copy and rounded/shadowed module styling.

## Further work

Prioritize instrument behavior, lead routing/waypoints and quantitative analysis over onboarding/polish prose. If guided lessons are added later, make them a separate opt-in mode; do not reintroduce them as the default workspace.
