# Contributing to labo

## Independent implementation

- Implement from electrical theory, our own requirements, and appropriately licensed references.
- Study only ordinarily accessible public pages and explicitly offered demos. Respect applicable terms and permissions.
- Do not bypass access codes, licensing checks, authentication, or other access controls; do not use someone else's credentials.
- Do not copy vendor source code, internal APIs, artwork, module faceplates, logos, manuals, exercise text, or distinctive screen designs.
- Use original names, visual assets, layouts, examples, and explanations. Generic engineering terminology is useful; vendor part numbers should not become our catalog identifiers.
- Do not imply compatibility, affiliation, endorsement, or numerical equivalence without evidence.
- Record source URLs, access dates, licenses, and any required attribution for reused material. If rights are unclear, omit it pending review.

These are practical project guardrails, not a legal opinion or a guarantee that a particular implementation is non-infringing. Get appropriate advice before wider distribution if needed.

## Engineering expectations

- Keep circuit state and numerical simulation independent of UI code.
- State supported models, assumptions, units, tolerances, and limitations.
- Validate against analytical circuits before presenting results to students.
- Add regression tests for numerical and persistence behavior.
- Label invalid or unsolved circuits clearly; never leave stale readings looking current.
- Make core actions keyboard-accessible; do not encode wire identity by color alone.
- Do not collect student accounts or personal data unless a later feature genuinely needs them.

## Research records

Use `docs/RESEARCH.md` for concise observations in our own words. Distinguish **observed**, **inferred**, and **proposed** claims. Keep any necessary private reference screenshots under ignored `research-local/`, not in distributable assets. Do not commit cookies, browser storage, access codes, or captured proprietary payloads.
