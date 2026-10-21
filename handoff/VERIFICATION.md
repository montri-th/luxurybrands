# Verification record — 2026-10-22

Dataset snapshot: 2026-10-21. This record distinguishes automated checks, rendered spot checks and deployment evidence.

## Completed

- `npm test`: 51/51 passed, including real-data area Aha, area membership, distinct-brand union, chart matrix/exclusivity, bounded pins, logo safety and closure filtering.
- LDS 0.9.7 package integrity: 9,768 checks passed. Static artifact check: PASS for registered color literals, local CSS and covered numeric-state rules. These are not full accessibility or design-system certifications.
- Machine JSON parses; required fields and task/acceptance references checked; P01–P08 dependency graph is acyclic. Dataset and Aha snapshots match the implementation. The included JSON Schema is a consumer contract; a full JSON Schema validator was not installed in this workspace.
- IAB desktop 1280 × 800: district-first Aha, all three neighborhood charts, map/row counts, dark theme, chart-to-Siam drilldown (64 POS), fewer-than-two-area comparison state and return-to-all (345 POS).
- IAB portrait 390 × 844: first insight is visible on the map; its action selects 175 source rows / 97 brands. No document-level horizontal overflow. Map viewport dimensions remain unchanged.
- Earlier in this revision cycle: native Chrome and Safari loaded 345 rows, map/buildings/logos and readable store popup. Scoped popup foreground/background were checked in light and dark. Later final-public browser checks are recorded separately in the archive release receipt.
- Generic caveats/workflow notes, research badge and CSV controls removed from ordinary UI. Historical closures and evidence remain in source data/docs.

## Coverage to extend in development

The 12 acceptance criteria in the implementation plan are a test plan, not a claim that every combination was exercised. Native `file:` navigation was not verified in Chrome/Safari; the fixed public bridge was source/VM checked. Full failure-injection, every browser/viewport permutation, assistive-technology review and all keyboard/reduced-motion combinations remain future regression coverage. Chrome keyboard check passed using the actual Tab order into the chart followed by Enter: Siam selected and the shared count changed to 64 POS. Pointer chart drilldown and HTML tab/selection controls were also verified.

## Release evidence

The downloadable archive includes `RELEASE_RECEIPT.json` outside the source folder. It binds the final Git commit, terminal GitHub Pages result, public byte attestation and final screenshots. `handoff-manifest.json` hashes the delivered source files while excluding itself to avoid a circular hash. Compare source hashes and release identity before continuing development.
