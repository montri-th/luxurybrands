# CityMETER Luxury Brands — owner preferences

Reaffirmed 2026-10-22 (release 0.2).

- Apply current LDS 0.9.7 (v0.9.7-owner.1, standalone-0.9.7-r1) and preserve the map-first CityMETER layout. Colours come only from `assets/theme.css` and `js/scales.js`; never approximate a value by eye.
- Aha first: show one computed spatial finding (share of brands in the top three neighborhoods), its numerator and denominator, and an immediate map action before complex filters. No onboarding gate. Snapshot numbers in the handoff JSON are fixtures, not UI constants.
- Focus + quiet context (owner instruction 2026-10-22): draw detail only for the focused part — the selected neighborhood, the explored areas, or everything when nothing is selected. Everything else stays visible but quiet: outline-only areas, quiet labels, grey context dots without logos and outside the tab order.
- Three row scopes are a contract: `rows` drive pins, counters and the table; `scopeRows` (filters before any area selection) drive the Aha denominator, the choropleth, the charts and the exclusive/shared reference. Say so in the UI whenever they differ.
- One marker always represents one observation; never aggregate stores. Logos are collision-managed with a ceiling of 250, only at zoom ≥ 13.5 and only inside the focus.
- Keep generic caveats and research workflow residue out of ordinary UI, popups, details, tooltips and help. Preserve provenance and methodology in source documentation. Preserve factual closure status, dates, sources, coordinate precision and actionable runtime errors; never replace uncertainty with fabricated facts; never show missing as zero.
- Use approved LDS Rounded outline navigation glyphs with FILL 0, weight 300, GRAD 0 and the asset optical size. Use a clear visible label when no approved glyph fits. The menu icon is for the mobile data sheet only.
- No CSV download control. No decorative brackets or colored left rails. Review actual Thai and English at desktop and narrow widths in light and dark themes before claiming a change is done; local renders are not proof of a live release — run `npm run verify:live`.
