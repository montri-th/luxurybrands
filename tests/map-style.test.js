import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMapStyle, basemapPalette, SOURCE_ID, DATA_FILL_BEFORE, MASSING_BEFORE, FIRST_LINE_LAYER, FIRST_LABEL_LAYER} from '../js/map-style.js';
import {buildBreadcrumb, renderBreadcrumb, breadcrumbText} from '../js/breadcrumb.js';
import {presetFor, CAMERA, DEFAULT_FOV} from '../js/camera.js';
import {PROVINCES, provinceByCode, provinceNameFrom} from '../js/model.js';

test('generated basemap is a well-formed MapLibre style with the anchor layers the app inserts before', () => {
  for (const theme of ['light', 'dark']) {
    const style = buildMapStyle(theme);
    assert.equal(style.version, 8);
    assert.ok(style.sources[SOURCE_ID]?.url, 'OpenFreeMap TileJSON source');
    assert.ok(style.glyphs.includes('{fontstack}'));
    const ids = style.layers.map(l => l.id);
    assert.equal(new Set(ids).size, ids.length, 'layer ids are unique');
    for (const l of style.layers) if (l.type !== 'background') { assert.equal(l.source, SOURCE_ID); assert.ok(l['source-layer'], `${l.id} names a source-layer`); }
    assert.ok(ids.includes(DATA_FILL_BEFORE) && ids.includes(MASSING_BEFORE));
    const firstLine = style.layers.find(l => l.type === 'line');
    assert.equal(firstLine.id, FIRST_LINE_LAYER, 'data fills sit beneath every line layer');
    const firstSymbol = style.layers.find(l => l.type === 'symbol');
    assert.equal(firstSymbol.id, FIRST_LABEL_LAYER, 'massing sits beneath every label');
    assert.ok(ids.indexOf('building') > ids.indexOf(FIRST_LINE_LAYER), '2D footprints draw above the data fill');
    assert.ok(style.sky && style.light, 'sky/fog quiets the distance; light shades the massing');
    assert.ok(!ids.some(id => /poi|housenumber|boundary/.test(id)), 'no POI, house numbers or admin boundaries');
  }
  const light = basemapPalette('light'), dark = basemapPalette('dark');
  assert.notEqual(light.ground, dark.ground);
  assert.equal(light.ground, '#EEF1EE', 'ground = LDS surface.alt (light)');
  assert.equal(dark.ground, '#11191D', 'ground = LDS surface.canvas (dark)');
});

test('breadcrumb mirrors production levels: ประเทศไทย › จังหวัด › ย่าน with production province codes', () => {
  assert.deepEqual(buildBreadcrumb({}).map(c => c.label), ['ประเทศไทย']);
  assert.deepEqual(buildBreadcrumb({provinceName: 'Phuket'}).map(c => c.label), ['ประเทศไทย', 'ภูเก็ต']);
  const siam = {id: 'siam', properties: {id: 'siam', name: 'สยาม', provinceCode: 'BKK'}};
  const crumbs = buildBreadcrumb({area: siam, provinceName: 'Phuket'});
  assert.deepEqual(crumbs.map(c => c.label), ['ประเทศไทย', 'กรุงเทพมหานคร', 'สยาม'], 'the area’s own province wins over a stale filter');
  assert.equal(crumbs[1].code, 'BKK');
  assert.equal(crumbs.at(-1).current, true);
  assert.equal(breadcrumbText(crumbs), 'ประเทศไทย › กรุงเทพมหานคร › สยาม');
  const html = renderBreadcrumb(crumbs);
  assert.ok(html.includes('aria-current="location"') && html.includes('data-action="crumb-province"') && html.includes('data-id="BKK"'));
  assert.equal(provinceByCode('cmi').th, 'เชียงใหม่');
  assert.equal(provinceNameFrom('SPK'), 'Samut Prakan');
  assert.equal(provinceNameFrom('Bangkok'), 'Bangkok');
  assert.equal(provinceNameFrom('Nowhere'), '');
  assert.equal(PROVINCES.length, 9);
});

test('breadcrumb venue level: inside a core → 4 levels; outside every core → skips ย่าน; store is never a crumb; narrow screens fold the upper levels', () => {
  const siam = {id: 'siam', properties: {id: 'siam', name: 'สยาม', provinceCode: 'BKK'}};
  const paragon = {id: '49b5afdc-2436-48bc-8a89-007ac5541d98', label: 'Siam Paragon', province: 'Bangkok'};
  const four = buildBreadcrumb({area: siam, provinceName: '', venue: paragon});
  assert.deepEqual(four.map(c => c.level), ['country', 'province', 'neighborhood', 'venue']);
  assert.equal(breadcrumbText(four), 'ประเทศไทย › กรุงเทพมหานคร › สยาม › Siam Paragon');
  assert.equal(four.at(-1).current, true);
  assert.equal(four.at(-1).id, paragon.id, 'the venue crumb carries the CityMETER Shopping Center id');
  // Venue outside every defined core: the ย่าน level is skipped, the province comes from the venue.
  const phuket = buildBreadcrumb({area: null, provinceName: '', venue: {id: 'x', label: 'Central Phuket', province: 'Phuket'}});
  assert.deepEqual(phuket.map(c => c.label), ['ประเทศไทย', 'ภูเก็ต', 'Central Phuket']);
  // Plain venue label (no matched center) still gets a crumb that re-opens the venue by label.
  const plain = buildBreadcrumb({area: siam, venue: {id: '', label: 'Ari Soi 4', province: 'Bangkok'}});
  assert.equal(plain.at(-1).value, 'Ari Soi 4');
  // Rendering: with four levels the upper two are collapsible behind “…”; the last two never are.
  const html = renderBreadcrumb(four);
  assert.equal((html.match(/class="is-collapsible"/g) || []).length, 2);
  assert.ok(html.includes('crumb-ellipsis') && html.includes('data-action="crumb-expand"'));
  assert.ok(html.includes('data-action="crumb-venue"') === false, 'the current venue is a label, not a link');
  const three = renderBreadcrumb(buildBreadcrumb({area: siam}));
  assert.ok(!three.includes('crumb-ellipsis') && !three.includes('is-collapsible'));
  // In store mode the app passes the host venue: the venue stays the last crumb (and a link), the store is the panel heading.
  const storeCrumbs = buildBreadcrumb({area: siam, venue: paragon});
  assert.equal(storeCrumbs.at(-1).level, 'venue');
  assert.ok(renderBreadcrumb(storeCrumbs.map((c, i) => ({...c, current: i === storeCrumbs.length - 1}))).includes('aria-current'));
});

test('camera presets: 2D plan, 3D city overview, upright-vertical model close-up and two-point option', () => {
  assert.equal(presetFor({view3d: false, mode: 'detail'}), 'plan');
  assert.equal(presetFor({view3d: true, mode: 'overview'}), 'city');
  assert.equal(presetFor({view3d: true, mode: 'detail'}), 'model');
  assert.equal(presetFor({view3d: true, mode: 'detail', twoPoint: true}), 'eye');
  assert.equal(CAMERA.plan.pitch, 0);
  assert.ok(CAMERA.model.fov < DEFAULT_FOV / 2, 'narrow field of view ≈ axonometric');
  assert.ok(CAMERA.eye.pitch <= 90 - CAMERA.eye.fov / 2 - 2, 'two-point: the horizon stays outside the frame (MapLibre 5.6.2 draws fill-extrusion wrongly once it enters)');
  assert.ok(CAMERA.eye.pitch >= 72 && CAMERA.eye.fov <= 26, 'strongly pitched, narrow field of view → verticals near-parallel');
});
