/**
 * Owner 2026-11-24 07:53 (asked on CityMETER · Shopping Center, D64/D65 there): files the registry lists as pending transfer
 * whose bytes other CityMETER demos already ship (data/venue-logo-links.json, scripts/attach-family-venue-logos.py,
 * kit citymeter-logos VenuePool.by_sha). data/venue-logos.json stays the research registry.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {configureVenueLogos, getVenueLogo, withFamilyVenueLogos} from '../js/venue-logos.js';

const ROOT = new URL('../', import.meta.url);
const bytes = path => readFileSync(new URL(path, ROOT));
const read = path => JSON.parse(bytes(path).toString('utf8'));
const sha = buf => createHash('sha256').update(buf).digest('hex');
const links = read('data/venue-logo-links.json');
const registry = read('data/venue-logos.json');
const pending = new Map(registry.meta.pending.map(p => [p.logoKey, p]));

test('the kit is the same bytes as its record and its rules hold', () => {
  const kit = read('scripts/logo-kit/kit.json');
  for (const [path, hash] of Object.entries(kit.files)) assert.equal(sha(bytes(path)), hash, `${path} differs from citymeter-logos ${kit.version}`);
  assert.equal(links.meta.kit, `citymeter-logos ${kit.version}`);
  const run = spawnSync('python3', ['-I', new URL('test_logo_kit.py', import.meta.url).pathname], {encoding: 'utf8'});
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test('every file is a pending file of the registry, byte for byte as the sheet recorded', () => {
  assert.equal(links.meta.inputs.registrySha256, sha(bytes('data/venue-logos.json')), 'data/venue-logos.json changed: run scripts/attach-family-venue-logos.py again');
  for (const a of links.assets) {
    const p = pending.get(a.key);
    assert.ok(p, `${a.key} is not pending in the registry`);
    assert.equal(a.file, `assets/venue-logos-family/${p.file}`);
    assert.equal(sha(bytes(a.file)), p.sheetSha256, a.file);
    assert.equal(a.bytes, p.bytes);
  }
  assert.equal(links.assets.length + links.meta.stillPending.length, registry.meta.pending.length);
  assert.deepEqual(readdirSync(new URL('assets/venue-logos-family/', ROOT)).sort(), links.assets.map(a => a.file.split('/').pop()).sort());
});

test('links fill only labels and centres the registry ties to that key and leaves empty', () => {
  for (const [label, key] of Object.entries(links.venues)) {
    assert.ok(pending.get(key)?.venues.includes(label), `${label} is not tied to ${key}`);
    assert.equal(registry.venues.find(v => v.label === label)?.key, null, `${label} already has a logo`);
  }
  for (const [id, key] of Object.entries(links.centers)) {
    const c = registry.centers.find(x => x.id === id);
    assert.ok(c && c.key === null && pending.get(key).venues.includes(c.label), `${id}`);
  }
  const keyed = registry.centers.find(c => c.key);
  const merged = withFamilyVenueLogos(registry, {...links, centers: {...links.centers, [keyed.id]: links.assets[0].key}});
  configureVenueLogos(merged);
  assert.equal(getVenueLogo({mallId: keyed.id}).key, keyed.key, 'a key the registry gives is never replaced');
  assert.equal(withFamilyVenueLogos(registry, null), registry, 'without the file nothing changes');
});

test('Central Ladprao and ICONSIAM show the files the sheet recorded', () => {
  configureVenueLogos(withFamilyVenueLogos(registry, links));
  const ladprao = registry.centers.find(c => c.name === 'Central Ladprao');
  assert.equal(getVenueLogo({mallId: ladprao.id})?.file, 'assets/venue-logos-family/central-ladprao.png');
  assert.equal(getVenueLogo({venue: 'ICONSIAM'})?.file, 'assets/venue-logos-family/iconsiam.svg');
  assert.equal(getVenueLogo({venue: 'Siam Kempinski Hotel'}), null, 'a file still pending stays name only');
});
