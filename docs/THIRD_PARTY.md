# Third-party material

No vendor simulator code, faceplates, screenshots, manuals, exercise text, or internal file formats are bundled.

## Shipped dependencies and assets

- React, React DOM and Scheduler — MIT, Meta Platforms and affiliates.
- Zustand — MIT, Paul Henschel.
- Zod — MIT, Colin McDonnell.
- Lucide — ISC, with Feather-derived portions under MIT (Cole Bemis); retain both notices.
- No font files are bundled: controls and measurements use locally available system fonts. The previous Fontsource/Public Sans dependency was removed after the user's visual-direction correction.
- Original electrical diagrams, favicon and product copy are authored for labo, not extracted from the reference product.

`public/THIRD_PARTY_NOTICES.txt` includes actual installed license texts for production/peer packages (including type-only peers). `scripts/notices.mjs` regenerates it before dev/build from `package-lock.json` and installed license files; missing license text fails the step. Vite copies the notices into `dist/`. Keep this file in distributed builds.

Build/test tooling carries its own licenses in the installed packages and is not embedded as application runtime. A wider source/binary release still needs a complete transitive/asset review; this list and `npm audit` are not legal clearance.

## Own-project license

Not selected. `package.json` is deliberately private. Third-party licenses do not grant rights to original labo code, and original code must not be described as open source until an appropriate license is chosen.

## Research references

See `SOURCES.md` for dates/URLs, scope and external licensing caveats. Private downloaded research is ignored by Git and excluded from application assets.
