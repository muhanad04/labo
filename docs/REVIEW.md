# Expansion finish review — 2026-10-17

Scope: routed/group editor, instrument precision, linear RMS AC/three-phase, parameter/frequency investigations and local project durability. User-approved utilitarian design remains frozen. No independent subagent tool was available; review/documentation were inline, not independent certification. Previous redesign history is in LOG.md.

## Fidelity / keep

- Same gray title/menu/toolbar/status bands, native labels, equipment rows, flat original instruments and white numerical fields. No slogans, cards, shadows, copied vendor assets or new font/dependency.
- Sweep/Projects reuse the bottom dock and native controls. Plot lines represent samples with units, cursor and table; no fabricated animation or implied transient scope.
- Mode/frequency, phases, P/Q/S/PF and unavailable readings are explicit. Model explanations remain in Help/collapsed Model/docs.
- Desktop 1440×1000 and phone 390×844 inspected, including AC inspector and tool docks. Phone retains local bench/table scrolling and wrapped controls; small instrument text remains dense.
- No shipping raster added; original SVG/HTML remains the equipment representation. Private screenshots/research/test artifacts stay ignored.

## Material findings and fixes

1. **Reconnect handle occluded by another lead's transparent hit stroke.** Selected lead now paints last within SVG, with handles after its path; terminals still sit above leads. Real pointer drag reconnection now passes in Chromium and Firefox, not just direct state calls.
2. **Sweep table inaccessible to keyboard scrolling.** Scroll containers now have focusable labelled regions; final main/sweep axe scans report zero violations. SVG/overlap contrast remains one incomplete category, not a conformance pass.
3. **Long RMS/high-precision readouts overran the flat field.** Readout space/font adapt to formatted length without rounding away requested precision or changing panel geometry. Full text remains available. Phone seven-digit fit is regression-tested.
4. **Corrupt-autosave warning could force phone overflow.** Status wraps/bounds text; browser regression checks visible warning, page width and unchanged original storage.
5. **Cached investigation semantics.** Caption follows captured mode/frequency, DC/AC traces cannot be compared as equivalent, electrical staleness ignores cosmetic labels/layout/routes, and CSV includes full basis plus machine-readable sweep spec. Closing tool is labelled session-only.
6. **Compatibility/failure preservation.** V1/v2 ingress, untouched legacy key, valid previous-save retention, malformed catalog refusal and quota failures have tests. No silent destructive migration or false save success.

Mechanical scan returned palette/font-size advisories for native neutral shades and responsive text; no suppression rules or aesthetic redesign were introduced to chase them. Numerical behavior is judged by analytical fixtures, not visual similarity or a commercial implementation.

## Evidence / limits

- `npm run check`: formatting, **56 numerical/edit/state/storage tests**, strict TS and production build.
- **14 Chromium + 14 Firefox workflows**: original construction/files plus new route/group/sweep/AC/library/recovery and phone checks. Sweep download verifies captured circuit/spec and actual numeric data, not only an enabled export button.
- `npm audit`: zero advisories at check time. No runtime service or dependency added by expansion.
- Final main and populated-sweep axe 4.12.1 scans: zero violations, one SVG/overlap contrast category incomplete. Checked browser session reported no application runtime errors.
- Analytical evidence includes signed DC, RL/RC/RLC, balanced/unbalanced wye/delta, floating neutral/KCL, ideal-resonance diagnostics and 40-module bound. No external-engine/hardware accuracy equivalence or worst-case runtime benchmark claimed.
- WebKit, real touch, screen readers, larger-text usability and broader conditioning/reference tests remain due. No physical safety, commercial-equivalence, accessibility-conformance, deployment or licensing claim.

**Disposition: usable bounded expansion.** Preserve the current language; next depth is an explicit, independently validated transformer model, not more decorative catalog faces. No transformer/machine/transient capability is implied by this revision.
