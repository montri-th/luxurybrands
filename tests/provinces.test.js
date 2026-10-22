import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildProvinceModel, installProvinceLayers, provinceBounds, PROVINCE_LAYERS, PROVINCE_FILL_MAX_ZOOM, PROVINCE_OUTLINE_MAX_ZOOM, PROVINCE_LABEL_MAX_ZOOM} from '../js/provinces.js';
import {PROVINCES, filterRows} from '../js/model.js';
import {renderOverview, metricTile, heading} from '../js/panel.js';
import {PICTOGRAM_CONTRACT} from '../js/navigation.js';

const provinces = JSON.parse(readFileSync(new URL('../data/provinces.geojson', import.meta.url), 'utf8'));
const data = JSON.parse(readFileSync(new URL('../data/luxury.json', import.meta.url), 'utf8'));
const rows = filterRows(data.rows, {cohort: 'refresh'});

test('data/provinces.geojson: one frame per dataset province, production codes as ids, DOPA codes and provenance kept', () => {
  assert.equal(provinces.features.length, PROVINCES.length);
  for (const p of PROVINCES) {
    const f = provinces.features.find(x => x.id === p.code);
    assert.ok(f, p.code);
    assert.equal(f.properties.code, p.code);
    assert.equal(f.properties.name, p.th);
    assert.equal(f.properties.nameEn, p.en);
    assert.match(f.properties.dopaCode, /^\d{2}$/);
    assert.equal(f.geometry.type, 'MultiPolygon');
    for (const poly of f.geometry.coordinates) for (const ring of poly) {
      assert.ok(ring.length >= 4);
      assert.deepEqual(ring[0], ring.at(-1), 'rings are closed');
      for (const [lon, lat] of ring) assert.ok(lon > 97 && lon < 106 && lat > 5 && lat < 21, 'inside Thailand');
    }
  }
  const m = provinces.metadata;
  assert.equal(m.license, 'CC BY 4.0');
  assert.match(m.sourceCommit, /^[0-9a-f]{40}$/);
  assert.match(m.sourceSha256, /^[0-9a-f]{64}$/);
  assert.equal(m.retrievedOn, '2026-10-22');
  assert.equal(m.provinces, 9);
  assert.equal(provinces.features.find(f => f.id === 'BKK').properties.dopaCode, '10');
});

test('buildProvinceModel counts distinct brands and rows per province and classes them with the count family', () => {
  const model = buildProvinceModel(rows, provinces);
  assert.equal(model.provinces.length, 9);
  const bkk = model.provinces.find(p => p.code === 'BKK');
  const bkkRows = rows.filter(r => r.province === 'Bangkok');
  assert.equal(bkk.pos, bkkRows.length);
  assert.equal(bkk.brands, new Set(bkkRows.map(r => r.brand)).size);
  assert.equal(bkk.state, 'measured');
  assert.ok(bkk.brands > 50, 'Bangkok carries most brands');
  assert.equal(model.classes.max, Math.max(...model.provinces.map(p => p.brands)));
  // Narrow filter: provinces without rows are measured_zero (lowest fill + zero outline), never dropped silently.
  const narrow = buildProvinceModel(rows.filter(r => r.province === 'Phuket'), provinces);
  assert.equal(narrow.zeroCount, 8);
  assert.equal(narrow.provinces.find(p => p.code === 'PKT').state, 'measured');
  assert.equal(narrow.provinces.find(p => p.code === 'BKK').state, 'measured_zero');
  assert.equal(buildProvinceModel([], {features: []}).provinces.length, 0);
});

function fakeMap() {
  const layers = [], defs = new Map(), sources = new Map(), handlers = [];
  return {
    layers, defs, sources, handlers, visibility: {}, data: {},
    getStyle: () => ({layers: [{id: 'background', type: 'background'}, {id: 'waterway', type: 'line'}, {id: 'water-name', type: 'symbol'}]}),
    getLayer: id => defs.get(id), addLayer(def, before) { defs.set(def.id, def); layers.push([def.id, before || null]); },
    removeLayer(id) { defs.delete(id); }, addSource(id, def) { sources.set(id, {def, setData: d => { this.data[id] = d; }}); }, getSource(id) { return sources.get(id); }, removeSource(id) { sources.delete(id); },
    setLayoutProperty(id, k, v) { this.visibility[id] = v; }, setPaintProperty() {}, on(e, a, b) { handlers.push([e, typeof a === 'function' ? a : b]); }, getCanvas: () => ({style: {}}),
  };
}

test('installProvinceLayers: fill under the first basemap line, outline/selected windows, quiet frames when a province is selected', () => {
  const map = fakeMap();
  const picked = [];
  const layers = installProvinceLayers(map, provinces, {onSelect: code => picked.push(code)});
  assert.deepEqual(map.layers.map(([id, before]) => [id, before]), [[PROVINCE_LAYERS.fill, 'waterway'], [PROVINCE_LAYERS.zero, 'waterway'], [PROVINCE_LAYERS.outline, null], [PROVINCE_LAYERS.selected, null]]);
  assert.equal(map.defs.get(PROVINCE_LAYERS.fill).maxzoom, PROVINCE_FILL_MAX_ZOOM);
  assert.equal(map.defs.get(PROVINCE_LAYERS.outline).maxzoom, PROVINCE_OUTLINE_MAX_ZOOM);
  assert.ok(PROVINCE_LABEL_MAX_ZOOM > PROVINCE_FILL_MAX_ZOOM, 'labels stay a little past the fill switch');
  assert.ok(map.sources.get('provinces').def.attribution.includes('CC BY 4.0'));
  const model = layers.update({rows, selectedCode: '', visible: true});
  const feats = map.data.provinces.features;
  assert.equal(feats.length, 9);
  assert.ok(feats.every(f => f.properties.filled === 1 && f.properties.quiet === 0 && f.properties.selected === 0));
  assert.equal(model.provinces.find(p => p.code === 'BKK').selected, false);
  layers.update({rows, selectedCode: 'PKT'});
  const after = map.data.provinces.features;
  assert.equal(after.find(f => f.id === 'PKT').properties.selected, 1);
  assert.equal(after.find(f => f.id === 'BKK').properties.quiet, 1);
  assert.equal(after.find(f => f.id === 'BKK').properties.filled, 0, 'quiet frames lose their fill, keep the outline');
  const click = map.handlers.find(([e, l]) => e === 'click')[1];
  click({features: [{properties: {code: 'CMI'}}]});
  assert.deepEqual(picked, ['CMI']);
  const b = provinceBounds(provinces, 'BKK', class { constructor() { this.min = [Infinity, Infinity]; this.max = [-Infinity, -Infinity]; } extend([x, y]) { this.min = [Math.min(this.min[0], x), Math.min(this.min[1], y)]; this.max = [Math.max(this.max[0], x), Math.max(this.max[1], y)]; return this; } });
  assert.ok(b.min[0] > 100.3 && b.max[0] < 100.95 && b.min[1] > 13.4 && b.max[1] < 14.0, 'Bangkok frame bounds');
  layers.dispose();
  assert.equal(map.defs.size, 0);
});

test('overview panel lists the provinces that hold brands as drill-downs; tiles and headings carry pictograms', () => {
  const model = buildProvinceModel(rows, provinces);
  const list = model.provinces.filter(p => p.brands > 0).sort((a, b) => b.brands - a.brands);
  const html = renderOverview({
    insight: {areas: [{id: 'siam', name: 'สยาม'}], brands: 10, totalBrands: 20, share: 50, pos: 30, totalPos: 60},
    overview: {ranking: [], areaCount: 10, mostExclusive: null, outsidePos: 0},
    summary: {brands: 20, pos: 60, centers: []}, areaModel: {areas: []}, asOf: '2026-10-21', provinces: list,
  });
  assert.ok(html.includes('data-action="select-province" data-id="BKK"'));
  assert.ok(html.includes('จังหวัดที่มีแบรนด์'));
  assert.equal((html.match(/select-province/g) || []).length, list.length);
  assert.ok(html.includes('class="metric-symbol pictogram pic-store"'));
  assert.ok(heading('area', 'ย่าน').includes('pic-area'));
  assert.ok(metricTile(5, 'GLA ตร.ม.', 'gla').includes('pic-gla'));
  // Pictogram contract: every role used in the panel exists in the subset manifest.
  const manifest = JSON.parse(readFileSync(new URL('../assets/icons/material-pictogram-300.json', import.meta.url), 'utf8'));
  for (const role of ['brand', 'store', 'venue', 'area', 'province', 'exclusive', 'gla', 'segment']) {
    assert.ok(manifest.glyphs[role], role);
    assert.equal(manifest.glyphs[role].codepoint, 'U+' + PICTOGRAM_CONTRACT.glyphs[role].codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
  }
  assert.equal(manifest.sha256, PICTOGRAM_CONTRACT.sha256);
  assert.equal(manifest.bytes, PICTOGRAM_CONTRACT.bytes);
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  for (const [role, glyph] of Object.entries(PICTOGRAM_CONTRACT.glyphs)) {
    assert.ok(css.includes(`.pic-${role}::before { content: "\\${glyph.codePointAt(0).toString(16).toUpperCase()}"; }`), `css for ${role}`);
  }
  // No province section without a province model (e.g. a province filter is active).
  const none = renderOverview({insight: {areas: [], brands: 0, totalBrands: 0, share: 0, pos: 0, totalPos: 0}, overview: {ranking: [], areaCount: 0, outsidePos: 0}, summary: {brands: 0, pos: 0, centers: []}, areaModel: {areas: []}, asOf: ''});
  assert.ok(!none.includes('select-province'));
});
