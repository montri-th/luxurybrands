import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filterRows, SEGMENTS} from '../js/model.js';
import {assignNeighborhood} from '../js/neighborhoods.js';
import {buildNeighborhoodChartModel} from '../js/chart-model.js';
import {buildOverviewInsights, buildNeighborhoodProfile, buildStoreDetail, buildVenueProfile, buildBrandPresence, describeGeometry, describeStatus} from '../js/profile-model.js';
import {buildAreaModel} from '../js/map-layers.js';

const data = JSON.parse(fs.readFileSync(new URL('../data/luxury.json', import.meta.url)));
const geojson = JSON.parse(fs.readFileSync(new URL('../data/neighborhoods.geojson', import.meta.url)));
const segments = Object.entries(SEGMENTS).map(([id, name]) => ({id, name}));
const rows = filterRows(data.rows, {cohort: 'refresh'});
const siam = geojson.features.find(f => f.properties.id === 'siam');

test('overview insights use the chart model and expose the most exclusive area', () => {
  const o = buildOverviewInsights(rows, geojson, segments);
  const m = buildNeighborhoodChartModel(rows, geojson, segments);
  assert.equal(o.areaCount, m.areaCount);
  assert.equal(o.totalBrands, 113);
  assert.equal(o.ranking[0].id, 'siam');
  assert.ok(o.mostExclusive && o.mostExclusive.exclusiveBrands > 0);
  const best = Math.max(...m.areas.map(a => a.exclusiveBrands));
  assert.equal(o.mostExclusive.exclusiveBrands, best);
});

test('neighborhood profile counts match the chart model and partition brands into exclusive and shared', () => {
  const p = buildNeighborhoodProfile(rows, siam, geojson, data.centers, segments);
  const area = buildNeighborhoodChartModel(rows, geojson, segments).areas.find(a => a.id === 'siam');
  assert.equal(p.brands, area.brands);
  assert.equal(p.pos, area.pos);
  assert.equal(p.exclusive.length + p.shared.length, p.brands);
  assert.equal(p.exclusive.length, area.exclusiveBrands);
  assert.equal(p.rank, 1);
  for (const s of p.shared) assert.ok(s.elsewhere.length >= 1 && !s.elsewhere.includes(p.name));
  // Venues within the area carry their own distinct brand counts; sum of POS equals area POS.
  assert.equal(p.venues.reduce((n, v) => n + v.pos, 0), p.pos);
  assert.ok(p.venues.some(v => v.name === 'Siam Paragon'));
  assert.equal(p.segmentMix.reduce((n, s) => n + s.pos, 0), p.pos);
});

test('exclusive/shared reference is the whole selection, so a single-area selection is not all exclusive', () => {
  const siamOnly = rows.filter(r => assignNeighborhood(r, geojson) === siam);
  const narrow = buildNeighborhoodProfile(siamOnly, siam, geojson, data.centers, segments);
  const full = buildNeighborhoodProfile(rows, siam, geojson, data.centers, segments);
  assert.equal(narrow.exclusive.length, narrow.brands, 'with only one area in scope everything is exclusive by construction');
  assert.ok(full.exclusive.length < full.brands, 'the app passes the full scope so sharing stays visible');
});

test('store detail describes geometry precision from the source role without upgrading it', () => {
  const host = rows.find(r => /host_complex/.test(r.geometryRole));
  const provider = rows.find(r => r.geometryRole === 'legacy_store_provider_place_point');
  assert.equal(describeGeometry(host).level, 'host');
  assert.equal(describeGeometry(provider).level, 'provider');
  assert.equal(describeGeometry({}).level, 'none');
  const d = buildStoreDetail(provider, {rows, geojson, centers: data.centers});
  assert.equal(d.row, provider);
  assert.equal(d.presence.brand, provider.brand);
  assert.ok(d.presence.pos >= 1);
  assert.equal(describeStatus({status: 'permanently closed'}).tone, 'closed');
  assert.equal(describeStatus({status: 'closure_conflict_review'}).tone, 'pending');
});

test('venue profile and brand presence count distinct brands separately from POS rows', () => {
  const paragon = data.centers.find(c => c.name === 'Siam Paragon');
  const v = buildVenueProfile(rows, {mallId: paragon.id, centers: data.centers, geojson});
  assert.ok(v.pos >= v.brands);
  assert.equal(v.rows.length, v.pos);
  assert.equal(v.area.id, 'siam');
  const presence = buildBrandPresence(rows, 'Rolex', geojson);
  assert.ok(presence.pos >= 2 && presence.venues >= 2);
});

test('area model carries EVID-05 states for every defined area and never colours outside areas', () => {
  const m = buildAreaModel(rows, geojson);
  assert.equal(m.areas.length, geojson.features.length);
  for (const a of m.areas) assert.ok(['measured', 'measured_zero'].includes(a.state));
  const phuket = buildAreaModel(filterRows(data.rows, {cohort: 'refresh', province: 'Phuket'}), geojson);
  assert.equal(phuket.zeroCount, geojson.features.length);
  assert.deepEqual(phuket.classes.classes, []);
});
