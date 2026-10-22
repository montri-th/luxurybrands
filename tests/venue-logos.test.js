import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {configureVenueLogos, getVenueLogo, venueLogoMarkup, normalizeVenueLabel, ROLE_LABELS} from '../js/venue-logos.js';
import {renderVenue} from '../js/panel.js';

const catalog = {
  meta: {asOf: '2026-10-22'},
  assets: [
    {key: 'VL-0123456789abcdef', file: 'assets/venue-logos/test-mall.svg', mime: 'image/svg+xml', bytes: 10, sha256: 'a'.repeat(64), width: 200, height: 60, background: '#E5E9E6', sourcePage: 'https://example.com/'},
    {key: 'VL-fedcba9876543210', file: 'assets/venue-logos/white.png', mime: 'image/png', bytes: 10, sha256: 'b'.repeat(64), width: 100, height: 100, background: '#182327'},
    {key: 'bad', file: '../../etc/passwd', mime: 'image/png', bytes: 1, sha256: 'c'.repeat(64), width: 1, height: 1},
    {key: 'VL-00000000deadbeef', file: 'assets/venue-logos/x.svg', mime: 'text/html', bytes: 1, sha256: 'd'.repeat(64), width: 1, height: 1},
  ],
  centers: [{id: 'center-1', name: 'Test Mall', key: 'VL-0123456789abcdef', role: 'venue_specific'}, {id: 'center-2', name: 'No logo', key: null, role: 'none'}],
  venues: [{label: 'Test Mall Wing', canonical: 'Test Mall', role: 'parent_complex', key: 'VL-0123456789abcdef'}, {label: 'White Place', canonical: 'White Place', role: 'shared_chain_banner', key: 'VL-fedcba9876543210'}, {label: 'Street', role: 'none', key: null}],
};

test('configureVenueLogos accepts only safe, complete assets and links; lookup goes by center id then exact label', () => {
  const c = configureVenueLogos(catalog);
  assert.equal(c.assets, 2); assert.equal(c.centers, 1); assert.equal(c.venues, 2);
  assert.equal(c.issues.length, 2, 'path traversal and bad mime rejected');
  const byCenter = getVenueLogo({mallId: 'center-1', venue: 'anything'});
  assert.equal(byCenter.file, 'assets/venue-logos/test-mall.svg'); assert.equal(byCenter.role, 'venue_specific'); assert.equal(byCenter.roleLabel, '');
  const byLabel = getVenueLogo({mallId: '', venue: '  test   mall wing '});
  assert.equal(byLabel.key, 'VL-0123456789abcdef'); assert.equal(byLabel.role, 'parent_complex'); assert.equal(byLabel.roleLabel, ROLE_LABELS.parent_complex);
  assert.equal(getVenueLogo({mallId: 'center-2', venue: 'No logo'}), null, 'a linked center without a key has no logo');
  assert.equal(getVenueLogo({mallId: '', venue: 'Street'}), null);
  assert.equal(getVenueLogo({mallId: '', venue: 'Test Mall'}), null, 'no fuzzy match on canonical names');
  assert.equal(normalizeVenueLabel('ＡＢＣ  x'), 'abc x');
});

test('venueLogoMarkup renders a backplate box with the image; decorative by default; role in data/title', () => {
  configureVenueLogos(catalog);
  const html = venueLogoMarkup({mallId: '', venue: 'White Place'}, {size: 'md'});
  assert.ok(html.includes('class="venue-logo venue-logo-md"'));
  assert.ok(html.includes('--venue-logo-bg:#182327'));
  assert.ok(html.includes('src="assets/venue-logos/white.png"'));
  assert.ok(html.includes('alt=""'));
  assert.ok(html.includes(`title="${ROLE_LABELS.shared_chain_banner}"`));
  assert.equal(venueLogoMarkup({mallId: '', venue: 'Street'}), '');
  const named = venueLogoMarkup({mallId: 'center-1'}, {size: 'lg', decorative: false});
  assert.ok(named.includes('alt="โลโก้ Test Mall"'));
});

test('venue panel shows the logo in the heading and lists; without a registry nothing changes', () => {
  configureVenueLogos(catalog);
  const v = {mallId: 'center-1', name: 'Test Mall', type: 'Mall', area: null, province: 'Bangkok', brands: 1, pos: 1, gla: null, segmentMix: [], rows: [{id: 'r1', brand: 'B', name: 'B Test Mall', venue: 'Test Mall'}]};
  const html = renderVenue(v);
  assert.ok(html.includes('detail-venue-logo'));
  assert.ok(html.includes('<h2>Test Mall</h2>'), 'the venue name stays the identity');
  configureVenueLogos({assets: []});
  assert.ok(!renderVenue(v).includes('detail-venue-logo'));
});

test('data/venue-logos.json: every asset file exists with the registry sha256, links resolve, no private URLs', {skip: !existsSync(new URL('../data/venue-logos.json', import.meta.url))}, () => {
  const reg = JSON.parse(readFileSync(new URL('../data/venue-logos.json', import.meta.url), 'utf8'));
  const c = configureVenueLogos(reg);
  assert.equal(c.issues.length, 0);
  assert.equal(c.assets, reg.assets.length);
  for (const a of reg.assets) {
    const bytes = readFileSync(new URL('../' + a.file, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), a.sha256, a.file);
    assert.equal(bytes.length, a.bytes);
    assert.ok(!/drive\.google|googleusercontent/.test(a.sourcePage || ''), 'no Drive links in the public registry');
  }
  const keys = new Set(reg.assets.map(a => a.key));
  for (const x of [...reg.centers, ...reg.venues]) if (x.key) assert.ok(keys.has(x.key), `${x.id || x.label} → ${x.key}`);
  // Partial registries are declared, never silent: count + pending = expected, pending keys carry no asset.
  assert.ok(Array.isArray(reg.meta.pending) && Number.isInteger(reg.meta.expected));
  assert.equal(reg.meta.count, reg.assets.length);
  assert.equal(reg.meta.count + reg.meta.pending.length, reg.meta.expected);
  for (const p of reg.meta.pending) assert.ok(!keys.has(p.logoKey) && p.venues.length > 0, `pending ${p.file}`);
  assert.equal(reg.meta.status === 'complete', reg.meta.pending.length === 0);
  if (reg.meta.pending.length === 0) assert.ok(reg.centers.filter(x => x.key).length >= 30, 'most linked centers carry a logo');
  assert.ok(reg.meta.licenseNote.includes('ไม่ใช่ใบอนุญาต'));
});
