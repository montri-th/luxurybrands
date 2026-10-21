import test, {beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {configureBrandLogos, getBrandLogo, brandLogoMarkup, logoCoverage, normalizeBrandLabel} from '../js/brand-logos.js';

const catalog = JSON.parse(fs.readFileSync(new URL('../data/brand-logos.json', import.meta.url)));
const rows = JSON.parse(fs.readFileSync(new URL('../data/luxury.json', import.meta.url))).rows;
const fixture = (id, name, extra = {}) => ({id, name, spriteId: `logo-${id}`, sourceURL: 'https://example.com/brand',
  sourceSHA256: 'a'.repeat(64), mime: 'image/svg+xml', width: 320, height: 160, ...extra});
beforeEach(() => configureBrandLogos(catalog, rows));

test('every current and historical observation maps to an approved identity without row mutation', () => {
  const before = JSON.stringify(rows);
  const coverage = configureBrandLogos(catalog, rows);
  assert.equal(coverage.complete, true);
  assert.equal(coverage.matchedRows, rows.length);
  assert.equal(coverage.totalRows, 565);
  assert.equal(coverage.totalBrands, 147);
  assert.equal(coverage.catalogBrands, 168);
  assert.equal(coverage.matchedIdentities, 146); // LOEWE and Loewe are two observed labels of one identity.
  assert.deepEqual(coverage.missingBrands, []);
  assert.deepEqual(coverage.invalidCatalog, []);
  for (const origin of new Set(rows.map(row => row.origin))) {
    assert.equal(logoCoverage(rows.filter(row => row.origin === origin)).complete, true);
  }
  for (const brand of catalog.brands) assert.equal(getBrandLogo(brand.name)?.id, brand.id);
  assert.equal(JSON.stringify(rows), before);
});

test('normalization and explicit spelling aliases resolve without fuzzy or partial matches', () => {
  assert.equal(getBrandLogo('  LoEwE  '), getBrandLogo('LOEWE'));
  assert.equal(getBrandLogo('Alaia'), getBrandLogo('ALAÏA'));
  assert.equal(getBrandLogo('Stussy'), getBrandLogo('Stüssy'));
  assert.equal(getBrandLogo('APC'), getBrandLogo('A.P.C.'));
  assert.equal(getBrandLogo('Frank Garcon'), getBrandLogo('Frank. / Frank Garçon'));
  assert.equal(getBrandLogo('Tod’s'), getBrandLogo("Tod's"));
  assert.notEqual(normalizeBrandLabel('Foo.Bar'), normalizeBrandLabel('FooBar'));
  assert.notEqual(normalizeBrandLabel('A & B'), normalizeBrandLabel('A and B'));
  assert.equal(getBrandLogo('LOEWE outlet'), null);
  assert.equal(getBrandLogo('La'), null);
});

test('the approved PRONTO rename uses its retained identity and does not rename other records', () => {
  assert.equal(getBrandLogo('PRONTO & CO.')?.id, 'BR-edc7f37cab96');
  assert.equal(getBrandLogo('PRONTO & CO.')?.name, 'Amétora');
  assert.equal(getBrandLogo('Ametora'), getBrandLogo('Amétora'));
  assert.equal(getBrandLogo('PRONTO'), null);
  const unrelated = fixture('unrelated', 'Unrelated', {legacyName: 'Some Other Brand'});
  configureBrandLogos({brands: [unrelated]});
  assert.equal(getBrandLogo('Some Other Brand'), null);
});

test('ambiguous normalized labels or alias collisions stay unresolved and are reported', () => {
  const result = configureBrandLogos({brands: [fixture('one', 'Name'), fixture('two', 'NAME')]}, [{brand: 'name'}]);
  assert.equal(getBrandLogo('name'), null);
  assert.deepEqual(result.ambiguousBrands, ['name']);
  assert.equal(result.complete, false);
  configureBrandLogos({brands: [fixture('punctuated', 'Foo.Bar'), fixture('plain', 'FooBar')]});
  assert.equal(getBrandLogo('foo.bar')?.id, 'punctuated');
  assert.equal(getBrandLogo('foobar')?.id, 'plain');
  const aliasCollision = configureBrandLogos({brands: [fixture('apc', 'A.P.C.'), fixture('other', 'APC')]}, ['APC']);
  assert.equal(getBrandLogo('APC'), null);
  assert.equal(aliasCollision.complete, false);
});

test('markup escapes labels/classes and uses only the fixed local sprite and catalog symbol IDs', () => {
  const symbolIDs = new Set(catalog.brands.map(brand => brand.spriteId));
  for (const row of rows) {
    const markup = brandLogoMarkup(row.brand);
    const hrefs = [...markup.matchAll(/\bhref="([^"]+)"/g)].map(match => match[1]);
    assert.equal(hrefs.length, 1);
    assert.ok(hrefs[0].startsWith(`assets/brand-logos.svg?v=${catalog.meta.spriteRevision.slice(0, 12).toLowerCase()}#`));
    assert.ok(symbolIDs.has(hrefs[0].split('#')[1]));
    assert.ok(!markup.includes('https:') && !markup.includes('drive.google.com'));
    assert.match(markup, /viewBox="0 0 320 160"/);
    assert.match(markup, /aria-hidden="true"/);
  }
  configureBrandLogos({brands: [fixture('escaped', 'A & <B> "C"', {altEn: 'A & <B> "C"'})]});
  const markup = brandLogoMarkup('A & <B> "C"', {decorative: false, className: 'tile" onload="alert(1)'});
  assert.match(markup, /role="img"/);
  assert.match(markup, /<title>A &amp; &lt;B&gt; &quot;C&quot;<\/title>/);
  assert.ok(markup.includes('tile&quot; onload=&quot;alert(1)'));
  assert.ok(!markup.includes(' onload="'));
});

test('unconfigured or missing identities have an empty fallback and explicit coverage gaps', () => {
  configureBrandLogos(null);
  assert.equal(brandLogoMarkup('Gucci'), '');
  assert.equal(getBrandLogo('Gucci'), null);
  assert.equal(logoCoverage(['Gucci']).configured, false);
  assert.deepEqual(logoCoverage(['Gucci']).missingBrands, ['Gucci']);
  configureBrandLogos(catalog);
  assert.equal(brandLogoMarkup('Unapproved Brand'), '');
  assert.equal(logoCoverage(['Unapproved Brand']).complete, false);
});

test('sprite cache revisions accept only 12 or 64 hexadecimal characters and expose a validated short revision', () => {
  const logo = fixture('cache', 'Cache');
  for (const revision of ['ABCDEF012345', 'ABCDEF012345' + 'a'.repeat(52)]) {
    const coverage = configureBrandLogos({meta: {spriteRevision: revision}, brands: [logo]}, ['Cache']);
    assert.equal(coverage.spriteRevision, 'abcdef012345');
    assert.equal(coverage.complete, true);
    assert.match(brandLogoMarkup('Cache'), /href="assets\/brand-logos\.svg\?v=abcdef012345#logo-cache"/);
  }
  for (const revision of ['abcdef', 'a'.repeat(13), 'a'.repeat(63), 'a'.repeat(65),
    'abcdef012345#evil', 'abcdef012345&remote=https://evil.example', '" onload="x', 123456789012]) {
    const coverage = configureBrandLogos({meta: {spriteRevision: revision}, brands: [logo]}, ['Cache']);
    assert.equal(coverage.spriteRevision, null);
    assert.equal(coverage.complete, false);
    assert.deepEqual(coverage.invalidCatalog, [{reason: 'invalid_sprite_revision'}]);
    assert.match(brandLogoMarkup('Cache'), /href="assets\/brand-logos\.svg#logo-cache"/);
    assert.ok(!brandLogoMarkup('Cache').includes('?v='));
    assert.ok(!brandLogoMarkup('Cache').includes('evil.example'));
  }
  configureBrandLogos({brands: [logo]});
  assert.equal(logoCoverage(['Cache']).spriteRevision, null);
});

test('private, executable, external-sprite, and malformed catalog references cannot enter the registry', () => {
  const bad = [
    fixture('drive', 'Private Drive', {sourceURL: 'https://drive.google.com/file/d/private/view'}),
    fixture('exec', 'Executable', {sourceURL: 'javascript:alert(1)'}),
    fixture('external', 'External Sprite', {spriteId: 'https://evil.example/logo.svg#mark'}),
    fixture('local', 'Local', {sourceURL: 'https://127.0.0.1/private'}),
    fixture('hash', 'No Hash', {sourceSHA256: ''}),
  ];
  const coverage = configureBrandLogos({brands: bad}, bad.map(brand => brand.name));
  assert.equal(coverage.catalogBrands, 0);
  assert.equal(coverage.invalidCatalog.length, bad.length);
  assert.equal(coverage.complete, false);
  for (const brand of bad) assert.equal(brandLogoMarkup(brand.name), '');
  assert.equal(getBrandLogo('https://evil.example/logo.svg'), null);
});
