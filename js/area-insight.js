/**
 * First Aha: the top three fixed neighborhoods by distinct brands.
 *
 * Numerator = union of brand labels across the three areas (a brand spanning
 * two areas counts once). Denominator = distinct brands in the whole filtered
 * base, including rows outside every defined boundary. Snapshot values in the
 * handoff JSON are regression fixtures, never UI constants.
 */
import {hasPoint} from './model.js';
import {assignNeighborhood, summarizeNeighborhoods} from './neighborhoods.js';

const safeRows = rows => (Array.isArray(rows) ? rows : []);
const safeGeoJSON = geojson => (geojson?.type === 'FeatureCollection' && !Array.isArray(geojson.features) ? null : geojson);
const areaId = feature => feature?.properties?.id ?? feature?.id;

/** Intersect a selected row set with fixed neighborhoods, assigning each point once. */
export function filterAreaRows(rows, geojson, areaIdsSet) {
  if (!(areaIdsSet instanceof Set) || !areaIdsSet.size) return [];
  const boundaries = safeGeoJSON(geojson);
  return safeRows(rows).filter(row => {
    if (!hasPoint(row)) return false;
    const feature = assignNeighborhood(row, boundaries);
    return !!feature && areaIdsSet.has(areaId(feature));
  });
}

/** Top three neighborhoods by distinct brands within the supplied selection. */
export function summarizeAreaInsight(rows = [], geojson) {
  const selected = safeRows(rows);
  const summaries = summarizeNeighborhoods(selected.filter(hasPoint), safeGeoJSON(geojson))
    .sort((a, b) => b.brands - a.brands || b.pos - a.pos || String(a.id).localeCompare(String(b.id)));
  const areas = summaries.slice(0, 3), areaIds = areas.map(area => area.id);
  // Fixed assignment makes these row sets disjoint; a brand can still span several areas.
  const members = areas.flatMap(area => area.rows);
  const brands = new Set(members.map(row => row.brand)).size;
  const totalBrands = new Set(selected.map(row => row.brand)).size;
  return {
    areas, areaIds, brands, totalBrands,
    share: totalBrands ? (brands / totalBrands) * 100 : 0,
    pos: members.length, totalPos: selected.length,
    assignedPos: summaries.reduce((sum, area) => sum + area.pos, 0),
  };
}
