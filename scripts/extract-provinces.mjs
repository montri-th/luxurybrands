#!/usr/bin/env node
/**
 * Extract the provinces present in the dataset (js/model.js PROVINCES) from the
 * OpenGISData-Thailand provinces layer into data/provinces.geojson.
 *
 * Source: https://github.com/chingchai/OpenGISData-Thailand (provinces.geojson,
 * 77 provinces, boundaries credited to the Department of Provincial
 * Administration — DOPA; CC BY 4.0). The frames are context for the country
 * view and the drill-down, not an administrative authority.
 *
 *   node scripts/extract-provinces.mjs <path/to/provinces.geojson> --commit <sha> --sha256 <hex> --retrieved YYYY-MM-DD
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PROVINCES} from '../js/model.js';

const args = process.argv.slice(2);
const opt = (k, d = '') => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const input = args.find(a => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
if (!input) { console.error('usage: node scripts/extract-provinces.mjs <provinces.geojson> [--commit sha] [--sha256 hex] [--retrieved date]'); process.exit(1); }
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(readFileSync(resolve(input), 'utf8'));
const byThai = new Map(PROVINCES.map(p => [p.th, p]));
const round = v => Math.round(v * 1e5) / 1e5;
const roundRing = ring => {
  const out = [];
  for (const [x, y] of ring) { const p = [round(x), round(y)]; if (!out.length || out.at(-1)[0] !== p[0] || out.at(-1)[1] !== p[1]) out.push(p); }
  if (out.length && (out[0][0] !== out.at(-1)[0] || out[0][1] !== out.at(-1)[1])) out.push([...out[0]]);
  return out;
};
const features = [];
for (const f of source.features) {
  const p = byThai.get(f.properties?.pro_th);
  if (!p) continue;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const coordinates = polys.map(poly => poly.map(roundRing)).filter(poly => poly[0].length >= 4);
  features.push({
    type: 'Feature', id: p.code,
    properties: {code: p.code, dopaCode: String(f.properties.pro_code), name: p.th, nameEn: p.en, sourceNameEn: f.properties.pro_en, areaSqkm: Math.round(Number(f.properties.area_sqkm) || 0)},
    geometry: {type: 'MultiPolygon', coordinates},
  });
}
features.sort((a, b) => PROVINCES.findIndex(p => p.code === a.id) - PROVINCES.findIndex(p => p.code === b.id));
const vertices = features.reduce((n, f) => n + f.geometry.coordinates.reduce((m, poly) => m + poly.reduce((k, r) => k + r.length, 0), 0), 0);
const out = {
  type: 'FeatureCollection',
  metadata: {
    version: `${opt('--retrieved', new Date().toISOString().slice(0, 10))}-r1`,
    role: 'province frames for the country view and the จังหวัด drill-down — context, not an administrative authority',
    source: 'OpenGISData-Thailand provinces.geojson (chingchai/OpenGISData-Thailand), boundaries credited by the publisher to the Department of Provincial Administration (DOPA)',
    sourceUrl: 'https://github.com/chingchai/OpenGISData-Thailand/blob/master/provinces.geojson',
    sourceCommit: opt('--commit', ''), sourceSha256: opt('--sha256', ''), retrievedOn: opt('--retrieved', ''),
    license: 'CC BY 4.0', attribution: 'ขอบเขตจังหวัด: OpenGISData-Thailand (CC BY 4.0), อ้างอิงกรมการปกครอง',
    processing: 'provinces present in the dataset only (js/model.js PROVINCES, matched by Thai name); coordinates rounded to 5 decimals; no simplification, geometry otherwise unchanged; id = production province code, dopaCode = DOPA two-digit code',
    provinces: features.length, vertices,
  },
  features,
};
const target = join(root, 'data', 'provinces.geojson');
writeFileSync(target, JSON.stringify(out) + '\n');
console.log(`wrote ${target}: ${features.length} provinces, ${vertices} vertices, ${JSON.stringify(out).length} bytes`);
