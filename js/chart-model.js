import {summarizeNeighborhoods} from './neighborhoods.js';

const text = value => String(value ?? '').trim();
const uniqueBrands = rows => new Set(rows.map(row => text(row.brand)).filter(Boolean));
const sortAreas = (a, b) => b.brands - a.brands || b.pos - a.pos || a.name.localeCompare(b.name) || String(a.id).localeCompare(String(b.id));

/**
 * A chart describes the caller's selected observations, with the same frozen
 * point-in-polygon assignment and edge priority as the map. Outside points
 * stay in totalPos but never acquire a neighborhood from a text label.
 * "Exclusive" means observed in one of these defined neighborhoods only;
 * it is not an assertion about the whole market or a brand's other stores.
 */
export function buildNeighborhoodChartModel(rows = [], neighborhoods, segments = []) {
  const selected = Array.isArray(rows) ? rows : [];
  const registry = new Map((Array.isArray(segments) ? segments : []).map(segment => [text(segment.id), text(segment.name || segment.id)]));
  const grouped = summarizeNeighborhoods(selected, neighborhoods);
  const brandAreas = new Map();
  for (const area of grouped) {
    for (const brand of uniqueBrands(area.rows)) {
      if (!brandAreas.has(brand)) brandAreas.set(brand, new Set());
      brandAreas.get(brand).add(area.id);
    }
  }
  const areas = grouped.map(area => {
    const brandNames = [...uniqueBrands(area.rows)].sort();
    const bySegment = new Map();
    for (const row of area.rows) {
      const id = text(row.segment) || '__unclassified__';
      if (!bySegment.has(id)) bySegment.set(id, []);
      bySegment.get(id).push(row);
    }
    const exclusiveBrands = brandNames.filter(brand => brandAreas.get(brand).size === 1).length;
    return {
      id: area.id, name: area.name, brands: brandNames.length, pos: area.pos,
      brandNames, exclusiveBrands, sharedBrands: brandNames.length - exclusiveBrands,
      segments: [...bySegment].map(([id, members]) => ({
        id, name: registry.get(id) || (id === '__unclassified__' ? 'ยังไม่จัดกลุ่ม' : id),
        brands: uniqueBrands(members).size, pos: members.length, brandNames: [...uniqueBrands(members)].sort(),
      })),
    };
  }).sort(sortAreas);
  const assignedPos = areas.reduce((sum, area) => sum + area.pos, 0);
  return {
    areas, areaCount: areas.length, assignedPos, outsidePos: selected.length - assignedPos,
    totalPos: selected.length, totalBrands: uniqueBrands(selected).size,
    assignedBrands: brandAreas.size,
  };
}

function limit(value, fallback) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

/** Radius is proportional to sqrt(count), so circle area represents count. */
export function bubbleRadius(count, maxCount, maxRadius) {
  if (!(count > 0) || !(maxCount > 0) || !(maxRadius > 0)) return 0;
  return Math.sqrt(Math.min(count, maxCount) / maxCount) * maxRadius;
}

/** Trim only the displayed ranking. Exclusivity is always computed beforehand. */
export function neighborhoodMatrix(model, {areaLimit = 6, segmentLimit = 8} = {}) {
  const areas = (model?.areas || []).slice(0, limit(areaLimit, 6));
  const bySegment = new Map();
  for (const area of areas) for (const segment of area.segments) {
    if (!bySegment.has(segment.id)) bySegment.set(segment.id, {id: segment.id, name: segment.name, brandNames: new Set()});
    for (const brand of segment.brandNames) bySegment.get(segment.id).brandNames.add(brand);
  }
  const allSegments = [...bySegment.values()].map(segment => ({id: segment.id, name: segment.name, brands: segment.brandNames.size}))
    .sort((a, b) => b.brands - a.brands || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const segments = allSegments.slice(0, limit(segmentLimit, 8));
  const cells = areas.flatMap(area => segments.map(segment => {
    const cell = area.segments.find(item => item.id === segment.id);
    return {areaId: area.id, areaName: area.name, segmentId: segment.id, segmentName: segment.name,
      brands: cell?.brands || 0, pos: cell?.pos || 0};
  }));
  return {areas, segments, cells, totalAreas: model?.areaCount || 0, totalSegments: allSegments.length,
    maxBrands: Math.max(0, ...cells.map(cell => cell.brands))};
}
