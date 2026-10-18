# Stack decisions

Package versions checked 2026-10-16; implementation reverified 2026-10-17 with strict TypeScript/build and Chromium/Firefox workflows. Expansion added no dependencies. Exact versions are pinned transitively in `package-lock.json`; use `npm ci`.

## Adopted

| Area | Installed version | Decision/evidence |
| --- | --- | --- |
| Node / npm | Local Node 24.14.0 / npm 11.19.1 | Node 24 LTS recommended. Vite requires Node ^20.19 or >=22.12; Vitest 5 requires ^22.12, ^24, or >=26. Declared app engine matches Vitest: ^22.12, ^24, or >=26; use supported even-numbered LTS releases. |
| React / React DOM | 19.3.1 | Interactive static app. No SSR/server requirement; Next.js would add unnecessary machinery. |
| TypeScript | 7.0.2 | Strict type checking, bundler resolution, no emitted application JS from tsc. Production build passed. |
| Vite / React plugin | 8.3.4 / 6.1.2 | Registry peer ranges match (plugin targets Vite 8); dev/build verified locally. |
| Zustand | 5.0.15 | Narrow subscriptions for document edits, bounded history, selection and wiring. React >=18 peer satisfied. No Immer needed. |
| Zod | 4.6.7 | Runtime validation at file/autosave and solver entry points. Unknown fields/versions rejected. |
| SVG + HTML + CSS | Browser native | Functional wires and symbols plus semantic buttons/inputs. No canvas framework or generic node-editor dependency. |
| Typography | Native system fonts | Tahoma/Segoe UI/Arial for controls; Consolas/Liberation Mono for measurements. Removed Fontsource/Public Sans after the user's utilitarian UI correction; no font files or font requests. |
| Lucide React | 0.577.0 | Consistent small UI icons. Named imports; production build tree-shakes unused icons. |
| Vitest | 5.0.5 | Pure numerical and document/state regression tests. No DOM emulation dependency. |
| Playwright | 1.64.1 | Reproducible Chromium and opt-in Firefox workflows; strict owned test port to avoid testing another project. |
| Prettier | 3.9.10 | Checked Node >=14 / MIT; reproducible formatting is part of `npm run check`. |

License metadata: React, Vite, plugin, Zustand, Zod, Vitest: MIT; TypeScript and Playwright: Apache-2.0; Lucide: ISC. No font dependency remains. See [third-party notes](THIRD_PARTY.md); registry labels are not a complete transitive-license audit. `scripts/notices.mjs` preserves actual installed license texts for production/peer packages before dev/build.

## Deliberately deferred / revised from the conversation

- **Radix:** native buttons/selects and disclosure-based command menus suffice. No ARIA menubar role is claimed; add a fuller menu library only if a real interaction need justifies it.
- **Dexie / IndexedDB:** bounded localStorage now holds active/recovery data and at most eight named entries. Validated JSON export remains independent. Adopt IndexedDB only if actual catalog/history scale earns it, with migration/rollback proof (MIGRATIONS.md).
- **uPlot/other charts:** bounded sweeps have at most 101 samples/two traces. Native SVG axes/trace/cursor plus a keyboard-scrollable table satisfy this need without another library. Revisit for substantial dense datasets, not speculative waveforms.
- **Web Workers / WASM:** circuits remain capped at 40 modules/120 leads. Pure DC/complex AC solve is synchronous; sweeps yield every four points and honor abort. No worst-case runtime benchmark is claimed. Profile real workloads before introducing worker serialization/revision coordination.
- **ngspice / CircuitJS:** research candidates only. No engine code has been imported. Re-evaluate model coverage, browser packaging, licenses, and benchmark fidelity for later physics.
- **Tailwind / animation library / drag library:** unnecessary for this small original UI. CSS state transitions and Pointer Events suffice; module movement follows the pointer directly.
- **Backend / auth / cloud collaboration:** not needed for local student experiments. Static deployment remains possible, but no hosting or remote repo is configured.
- **PWA / offline install:** not implemented. Local-first persistence does not guarantee offline startup/refresh.

## Measured baseline

2026-10-17 build: initial combined JS (entry/shared/runtime) ~376 kB / 116 kB gzip; CSS ~17.3 kB / 4.5 kB gzip. Lazy Projects ~4.4 kB / 1.7 kB gzip; Sweep ~9.9 kB / 3.8 kB gzip. No emitted font files, paid runtime service or analytics. Artifact sizes are not runtime-performance claims. Latest audit: zero advisories; rerun after dependency changes.

## Verification commands

`npm view <package> version engines peerDependencies license --json`, `npm ls --depth=0`, `npm run check`, `npm run test:e2e`, `npm run test:e2e -- --browser=firefox`, `npm audit`. Install optional Firefox with `npx playwright install firefox`.

Do not upgrade to `latest` automatically. Review engine/peer changes and run the numerical, persistence, and browser suites with the new lockfile.
