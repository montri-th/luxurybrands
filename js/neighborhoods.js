// Frozen analytical neighborhoods: membership is geographic, never inferred from labels or filters.
const EPSILON = 1e-10;

export function coordinatesOf(value) {
  if (Array.isArray(value)) return validCoordinate(value) ? value.slice(0, 2).map(Number) : null;
  if (value?.type === 'Feature') return coordinatesOf(value.geometry);
  if (value?.type === 'Point') return coordinatesOf(value.coordinates);
  const point = [value?.longitude, value?.latitude];
  return validCoordinate(point) ? point.map(Number) : null;
}

function validCoordinate(point) {
  return Array.isArray(point) && point.length >= 2 && point[0] !== null && point[1] !== null &&
    point[0] !== '' && point[1] !== '' && Number.isFinite(Number(point[0])) &&
    Number.isFinite(Number(point[1])) && Math.abs(Number(point[0])) <= 180 && Math.abs(Number(point[1])) <= 90;
}

function onSegment(point, start, end) {
  if (!validCoordinate(start) || !validCoordinate(end)) return false;
  const [x, y] = point, [ax, ay] = start, [bx, by] = end;
  const length = Math.hypot(bx - ax, by - ay);
  if (length <= EPSILON) return Math.hypot(x - ax, y - ay) <= EPSILON;
  return Math.abs((x - ax) * (by - ay) - (y - ay) * (bx - ax)) <= EPSILON * length &&
    x >= Math.min(ax, bx) - EPSILON && x <= Math.max(ax, bx) + EPSILON &&
    y >= Math.min(ay, by) - EPSILON && y <= Math.max(ay, by) + EPSILON;
}

// 0 outside, 1 inside, 2 on boundary. Hole boundaries belong to the polygon boundary.
function ringPosition(point, ring) {
  if (!Array.isArray(ring) || ring.length < 4) return 0;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j], b = ring[i];
    if (onSegment(point, a, b)) return 2;
    if ((a[1] > point[1]) !== (b[1] > point[1]) &&
      point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside ? 1 : 0;
}

function inPolygon(point, rings) {
  const exterior = ringPosition(point, rings?.[0]);
  if (!exterior) return false;
  if (exterior === 2) return true;
  for (const hole of (rings || []).slice(1)) {
    const position = ringPosition(point, hole);
    if (position === 2) return true;
    if (position === 1) return false;
  }
  return true;
}

export function pointInGeometry(value, geometry) {
  const point = coordinatesOf(value);
  if (!point || !geometry) return false;
  switch (geometry.type) {
    case 'Polygon': return inPolygon(point, geometry.coordinates);
    case 'MultiPolygon': return geometry.coordinates.some(rings => inPolygon(point, rings));
    case 'GeometryCollection': return (geometry.geometries || []).some(g => pointInGeometry(point, g));
    case 'Point': return validCoordinate(geometry.coordinates) && Math.hypot(point[0] - geometry.coordinates[0], point[1] - geometry.coordinates[1]) <= EPSILON;
    case 'MultiPoint': return geometry.coordinates.some(p => pointInGeometry(point, {type: 'Point', coordinates: p}));
    case 'LineString': return geometry.coordinates.some((p, i, line) => i > 0 && onSegment(point, line[i - 1], p));
    case 'MultiLineString': return geometry.coordinates.some(line => pointInGeometry(point, {type: 'LineString', coordinates: line}));
    default: return false;
  }
}

export function pointInFeature(value, feature) {
  return feature?.type === 'Feature' ? pointInGeometry(value, feature.geometry) : pointInGeometry(value, feature);
}

export function neighborhoodFeatures(geojson) {
  return (geojson?.type === 'FeatureCollection' ? geojson.features : geojson?.type === 'Feature' ? [geojson] : [])
    .filter(feature => ['Polygon', 'MultiPolygon', 'GeometryCollection'].includes(feature?.geometry?.type));
}

// Shared edges/overlaps resolve to the lowest explicit priority, then stable ID.
export function assignNeighborhood(row, geojson) {
  return neighborhoodFeatures(geojson).filter(feature => pointInFeature(row, feature)).sort((a, b) =>
    (a.properties?.priority ?? 100) - (b.properties?.priority ?? 100) ||
    String(a.properties?.id ?? a.id).localeCompare(String(b.properties?.id ?? b.id)))[0] || null;
}

export function neighborhoodRows(rows, feature) {
  return rows.filter(row => pointInFeature(row, feature));
}

function featureCenter(feature) {
  const center = feature?.properties?.center;
  if (validCoordinate(center)) return center;
  const positions = [];
  const visit = g => {
    if (!g) return;
    if (g.type === 'GeometryCollection') return (g.geometries || []).forEach(visit);
    const collect = value => validCoordinate(value) ? positions.push(value) : Array.isArray(value) && value.forEach(collect);
    collect(g.coordinates);
  };
  visit(feature.geometry);
  return positions.length ? [
    (Math.min(...positions.map(p => p[0])) + Math.max(...positions.map(p => p[0]))) / 2,
    (Math.min(...positions.map(p => p[1])) + Math.max(...positions.map(p => p[1]))) / 2,
  ] : [null, null];
}

export function summarizeNeighborhoods(rows, geojson, {includeEmpty = false} = {}) {
  const features = neighborhoodFeatures(geojson);
  const grouped = new Map(features.map(feature => [feature.properties?.id ?? feature.id, []]));
  for (const row of rows) {
    const feature = assignNeighborhood(row, geojson);
    if (feature) grouped.get(feature.properties?.id ?? feature.id)?.push(row);
  }
  return features.map(feature => {
    const p = feature.properties || {}, id = p.id ?? feature.id, members = grouped.get(id) || [];
    const [longitude, latitude] = featureCenter(feature);
    return {id, name: p.name || p.nameTh || p.nameEn || String(id), nameEn: p.nameEn,
      ids: new Set(members.map(row => row.id)), brands: new Set(members.map(row => row.brand)).size,
      pos: members.length, sites: new Set(members.map(row => coordinatesOf(row)?.map(n => n.toFixed(5)).join(','))).size,
      latitude, longitude, feature, rows: members, status: p.status, confidence: p.confidence,
      sourceURLs: p.sourceURLs || [], definition: p.definition, edges: p.edges};
  }).filter(group => includeEmpty || group.pos > 0).sort((a, b) => b.pos - a.pos || a.name.localeCompare(b.name));
}
