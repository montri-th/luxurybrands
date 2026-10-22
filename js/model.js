/**
 * Dataset vocabulary, shared filter and summary helpers.
 *
 * Rows are brand–point-of-sale observations from data/luxury.json. Nothing in
 * this module mutates a row; filters return new arrays and summaries count
 * distinct brand labels separately from observation rows.
 */

/** Segment taxonomy. Order is the stable categorical series assignment (series.01–.08). */
export const SEGMENTS = Object.freeze({
  luxury_designer: 'Luxury designers',
  fine_jewelry: 'Fine jewellery',
  watches: 'Watches',
  upscale_streetwear: 'Upscale streetwear',
  thai_designer: 'Thai designers',
  curated_retailer: 'Curated retailers',
  beauty_fragrance: 'Beauty & fragrance',
  premium_extension: 'Accessible premium',
});

/** Short Thai labels for dense surfaces (matrix columns, chips). */
export const SEGMENT_SHORT = Object.freeze({
  luxury_designer: 'ดีไซเนอร์',
  fine_jewelry: 'จิวเวลรี',
  watches: 'นาฬิกา',
  upscale_streetwear: 'Streetwear',
  thai_designer: 'ดีไซน์ไทย',
  curated_retailer: 'Multibrand',
  beauty_fragrance: 'บิวตี้',
  premium_extension: 'พรีเมียม',
  __unclassified__: 'ยังไม่จัดกลุ่ม',
});

export const CHANNELS = Object.freeze({
  mall: 'Boutique ในศูนย์การค้า',
  street_standalone: 'Street / standalone',
  department_store: 'Department store',
  curated_multibrand: 'Multibrand retailer',
  hotel_or_appointment: 'Hotel / appointment',
  downtown_travel_retail: 'Downtown duty-free',
  airport_travel_retail: 'Airport duty-free',
  outlet: 'Outlet',
  popup: 'Pop-up',
  legacy: 'ประวัติเดิม',
});

export const COHORTS = Object.freeze({
  refresh: 'รายการที่ค้นใหม่',
  all: 'ทั้งหมด รวมประวัติเดิม',
  legacy: 'ประวัติเดิม',
  closed: 'ปิดถาวร',
});

/**
 * Provinces present in the dataset, keyed by the code CityMETER production uses
 * in its drill-down path (/v3/citymeter/{code}; observed on landometer.com,
 * 2026-10-22: BKK, PKT, CMI, SPK, NBI, CBI, PTE, UDN, NMA). `en` is the value
 * stored in each row's `province` field; `th` is the breadcrumb label.
 */
export const PROVINCES = Object.freeze([
  {code: 'BKK', th: 'กรุงเทพมหานคร', en: 'Bangkok'},
  {code: 'PKT', th: 'ภูเก็ต', en: 'Phuket'},
  {code: 'CMI', th: 'เชียงใหม่', en: 'Chiang Mai'},
  {code: 'SPK', th: 'สมุทรปราการ', en: 'Samut Prakan'},
  {code: 'NBI', th: 'นนทบุรี', en: 'Nonthaburi'},
  {code: 'CBI', th: 'ชลบุรี', en: 'Chonburi'},
  {code: 'PTE', th: 'ปทุมธานี', en: 'Pathum Thani'},
  {code: 'UDN', th: 'อุดรธานี', en: 'Udon Thani'},
  {code: 'NMA', th: 'นครราชสีมา', en: 'Nakhon Ratchasima'},
]);
export const provinceByCode = code => PROVINCES.find(p => p.code === String(code || '').toUpperCase()) || null;
export const provinceByName = en => PROVINCES.find(p => p.en === en) || null;
/** Accept a production code (BKK) or a dataset name (Bangkok); returns the dataset name or ''. */
export const provinceNameFrom = value => (provinceByCode(value) || provinceByName(value))?.en || '';

/** A usable source coordinate inside Thailand's bounding box. */
export const hasPoint = r => Number.isFinite(r.latitude) && Number.isFinite(r.longitude) &&
  r.latitude >= 5 && r.latitude <= 21 && r.longitude >= 97 && r.longitude <= 106;

export const isClosed = r => r.status === 'permanently closed';

/**
 * Shared filter used by map, counters, charts, panel and table.
 * Default cohort `refresh` = market_refresh rows minus permanently closed and
 * conflict-review rows. Legacy history and closures remain selectable.
 */
export function filterRows(rows, f = {}) {
  const q = (f.search || '').trim().toLocaleLowerCase();
  return rows.filter(r => {
    if (f.cohort === 'closed' && !isClosed(r)) return false;
    if (f.cohort === 'legacy' && !r.origin.startsWith('legacy_')) return false;
    if ((!f.cohort || f.cohort === 'refresh') && (r.origin !== 'market_refresh' || isClosed(r) || r.status === 'closure_conflict_review')) return false;
    if (f.segment && r.segment !== f.segment) return false;
    if (f.province && r.province !== f.province) return false;
    if (f.channel && r.channel !== f.channel) return false;
    if (f.venue && r.venue !== f.venue) return false;
    if (f.mallId && r.mallId !== f.mallId) return false;
    if (f.mallIds && !f.mallIds.has(r.mallId)) return false;
    if (f.neighborhoodIds && !f.neighborhoodIds.has(r.id)) return false;
    return !q || [r.brand, r.name, r.venue, r.neighborhood, r.province].some(v => (v || '').toLocaleLowerCase().includes(q));
  });
}

/** Counts for the selection: distinct brands, POS rows, mapped rows, centers and segments. */
export function summarize(rows, shoppingCenters) {
  const grouped = new Map();
  for (const r of rows) {
    if (!r.mallId) continue;
    if (!grouped.has(r.mallId)) grouped.set(r.mallId, []);
    grouped.get(r.mallId).push(r);
  }
  const centers = shoppingCenters.filter(c => grouped.has(c.id)).map(c => {
    const rs = grouped.get(c.id);
    return {...c, brands: new Set(rs.map(r => r.brand)).size, pos: rs.length, venue: rs[0].venue, segments: [...new Set(rs.map(r => r.segment))]};
  }).sort((a, b) => b.brands - a.brands || a.name.localeCompare(b.name));
  const segments = Object.entries(SEGMENTS).map(([id, name]) => ({id, name, count: rows.filter(r => r.segment === id).length})).filter(r => r.count);
  return {brands: new Set(rows.map(r => r.brand)).size, pos: rows.length, mapped: rows.filter(hasPoint).length, centers, segments};
}

/** Retained compatibility model: top three shopping centers (the pre-neighborhood Aha). */
export function summarizeFirstInsight(rows = [], shoppingCenters = []) {
  const selected = Array.isArray(rows) ? rows : [], hosts = Array.isArray(shoppingCenters) ? shoppingCenters : [];
  const summary = summarize(selected, hosts), centers = summary.centers.slice(0, 3);
  const centerIds = centers.map(center => center.id), ids = new Set(centerIds);
  const topRows = selected.filter(row => ids.has(row.mallId));
  // A brand present in several centers contributes once to the coverage numerator.
  const brands = new Set(topRows.map(row => row.brand)).size, totalBrands = summary.brands;
  return {centers, centerIds, brands, totalBrands, share: totalBrands ? (brands / totalBrands) * 100 : 0, pos: topRows.length, totalPos: selected.length};
}

/**
 * One GeoJSON point feature per mapped row. Co-location never merges rows and
 * never changes the source coordinate; screen displacement lives in pins.js.
 */
export function pointFeatures(rows) {
  return {
    type: 'FeatureCollection',
    features: rows.filter(hasPoint).map(r => ({
      type: 'Feature', id: r.id,
      geometry: {type: 'Point', coordinates: [r.longitude, r.latitude]},
      properties: {id: r.id, brand: r.brand, venue: r.venue, closed: isClosed(r) ? 1 : 0},
    })),
  };
}

export const safeURL = value => {
  try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; }
  catch { return ''; }
};

/** Retained for tests and scripted exports; there is no CSV control in the UI (INV07). */
export function toCSV(rows) {
  const headers = ['id', 'brand', 'name', 'venue', 'province', 'segment', 'channel', 'status', 'origin', 'latitude', 'longitude', 'geometryRole', 'geometryStatus', 'coordinateSource', 'mallId', 'source', 'statusSource', 'checkedOn'];
  const quote = v => { const s = v == null ? '' : String(v); return '"' + (/^[=+@\-]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"'; };
  return '﻿' + [headers, ...rows.map(r => headers.map(h => r[h]))].map(a => a.map(quote).join(',')).join('\r\n');
}
