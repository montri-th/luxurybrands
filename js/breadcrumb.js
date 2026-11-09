/**
 * Breadcrumb — ประเทศไทย › จังหวัด › ย่าน › สถานที่, through the shared shell (js/shell/breadcrumb.js,
 * citymeter-shell 0.4.2).
 *
 * The ย่าน level here is this dataset's own analytical core (data/neighborhoods.geojson, docs/NEIGHBORHOOD_METHOD.md),
 * not a production Locale and not an administrative area, so its crumb is a zone with no production link
 * (demo-platform-review §6 phase 3, the plan the owner approved 2026-11-08: a ย่าน uses a production Locale or says
 * it is this dataset's ย่าน) and the address keeps it as the filter `f.neighborhood`. Never invent a Locale or municipality id for a core. The
 * province crumb links /v3/citymeter/{code}; production has no luxury-brands dataset yet (`luxuryBrands` is this
 * repository's proposal), so the links carry no `d`.
 *
 * Fourth level (owner decision 2026-10-22): the venue — a matched shopping center (CityMETER Shopping Center id,
 * data/luxury.json centers[].id / externalId SC-…) or a plain venue label — the last crumb, with no production link.
 * Rules:
 *   - the ย่าน crumb appears when a neighborhood is selected or when the venue's representative point lies inside a
 *     core (point-in-polygon, never by name);
 *   - a venue outside every core skips that level: ประเทศไทย › ภูเก็ต › Central Phuket;
 *   - a store is not a crumb (it is a record, not a container) — the panel heading names it;
 *   - with four crumbs on narrow screens the upper levels collapse behind “…”.
 */
import {provinceByName, provinceByCode} from './model.js';
import {buildBreadcrumb as shellBreadcrumb, renderBreadcrumb, breadcrumbText} from './shell/breadcrumb.js';

/** Production carries no luxury-brands dataset yet: crumbs link the place alone (no `?d=`). */
const PRODUCTION_DATASET = '';
const shellProvince = code => { const p = provinceByCode(code); return p ? {code: p.code, th: p.th} : null; };

/**
 * Pure model. `area` is the selected or containing neighborhood feature (or null); `provinceName` is the dataset
 * province filter value (e.g. "Bangkok") or ''; `venue` is `{id, label, province}` for the open venue/store host (or
 * null). Province precedence: the area's own province (properties.provinceCode) → the filter → the venue's province.
 */
export function buildBreadcrumb({area = null, provinceName = '', venue = null} = {}) {
  const code = provinceByCode(area?.properties?.provinceCode)?.code || provinceByName(provinceName)?.code
    || (venue?.province ? provinceByName(venue.province)?.code : '') || '';
  return shellBreadcrumb({
    province: code,
    zone: area ? {id: area.id || area.properties.id, name: area.properties.name, province: code} : null,
    site: venue?.label ? {id: venue.id || '', name: venue.label, province: code} : null,
  }, {dataset: PRODUCTION_DATASET, provinceByCode: shellProvince});
}

export {renderBreadcrumb, breadcrumbText};
