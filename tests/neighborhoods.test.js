import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pointInFeature, assignNeighborhood, neighborhoodRows, summarizeNeighborhoods} from '../js/neighborhoods.js';

const square = (id, x, priority = 100) => ({type: 'Feature', id,
  properties: {id, name: id, priority, center: [x + 5, 5]},
  geometry: {type: 'Polygon', coordinates: [[[x, 0], [x + 10, 0], [x + 10, 10], [x, 10], [x, 0]]]}});
const core = square('core', 0);
const hole = [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]];
const donut = {...core, geometry: {...core.geometry, coordinates: [...core.geometry.coordinates, hole]}};

test('PIP distinguishes exterior, hole interior, and polygon boundaries', () => {
  assert.equal(pointInFeature([1, 1], donut), true);
  assert.equal(pointInFeature([3, 3], donut), false);
  assert.equal(pointInFeature([2, 3], donut), true);
  assert.equal(pointInFeature([10, 5], donut), true);
  assert.equal(pointInFeature([11, 5], donut), false);
  assert.equal(pointInFeature({latitude: null, longitude: null}, donut), false);
  assert.equal(pointInFeature({latitude: '', longitude: ''}, donut), false);
});

test('MultiPolygon and GeometryCollection preserve component and hole semantics', () => {
  const second = square('second', 20);
  const multi = {type: 'Feature', geometry: {type: 'MultiPolygon',
    coordinates: [donut.geometry.coordinates, second.geometry.coordinates]}};
  assert.equal(pointInFeature([25, 5], multi), true);
  assert.equal(pointInFeature([3, 3], multi), false);
  assert.equal(pointInFeature([15, 5], multi), false);
  const collection = {type: 'Feature', geometry: {type: 'GeometryCollection',
    geometries: [donut.geometry, second.geometry]}};
  assert.equal(pointInFeature([25, 5], collection), true);
  assert.equal(pointInFeature([3, 3], collection), false);
});

test('shared edge assignment uses explicit priority and stable ID tie break', () => {
  const left = square('left', 0, 2), right = square('right', 10, 1);
  const geo = {type: 'FeatureCollection', features: [left, right]};
  assert.equal(assignNeighborhood([10, 5], geo), right);
  right.properties.priority = 2;
  assert.equal(assignNeighborhood([10, 5], geo), left);
  geo.features.reverse();
  assert.equal(assignNeighborhood([10, 5], geo), left);
});

test('filtering rows changes counts while fixed membership and centers remain unchanged', () => {
  const geo = {type: 'FeatureCollection', features: [core]};
  const rows = [{id: 'a', brand: 'A', longitude: 1, latitude: 1},
    {id: 'b', brand: 'B', longitude: 8, latitude: 8},
    {id: 'outside', brand: 'A', longitude: 15, latitude: 5}];
  const frozen = JSON.stringify(geo);
  const all = summarizeNeighborhoods(rows, geo)[0];
  const filtered = summarizeNeighborhoods(rows.filter(row => row.brand === 'A'), geo)[0];
  assert.equal(all.pos, 2);
  assert.equal(filtered.pos, 1);
  assert.deepEqual([...filtered.ids], ['a']);
  assert.deepEqual([all.longitude, all.latitude], [filtered.longitude, filtered.latitude]);
  assert.equal(filtered.feature, core);
  assert.equal(assignNeighborhood(rows[0], geo), core);
  assert.equal(assignNeighborhood(rows[2], geo), null);
  assert.equal(neighborhoodRows(rows, core).length, 2);
  assert.equal(JSON.stringify(geo), frozen);
});

test('published cores leave One Bangkok outside Silom and keep Song Wat separate', () => {
  const geo = JSON.parse(fs.readFileSync(new URL('../data/neighborhoods.geojson', import.meta.url)));
  assert.equal(assignNeighborhood([100.5472277, 13.7275119], geo), null);
  assert.equal(assignNeighborhood([100.5068311, 13.7383772], geo)?.id, 'song-wat');
  assert.equal(assignNeighborhood([100.537142, 13.728527], geo)?.id, 'silom');
  for (const feature of geo.features) {
    assert.equal(feature.geometry.type, 'Polygon');
    for (const ring of feature.geometry.coordinates) {
      assert.deepEqual(ring[0], ring.at(-1));
      assert.ok(ring.length >= 4);
      for (const [longitude, latitude] of ring) {
        assert.ok(longitude > 97 && longitude < 106);
        assert.ok(latitude > 5 && latitude < 21);
      }
    }
  }
});
