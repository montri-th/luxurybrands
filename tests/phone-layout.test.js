// The key, the finding and the map's attribution on a phone (owner 2026-11-12 00:36, the look on a phone): no card
// stands over the attribution while it is open, and the finding keeps clear of the key by the key's live height.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root = new URL('../', import.meta.url);
const css = readFileSync(new URL('styles.css', root), 'utf8');
const app = readFileSync(new URL('js/app.js', root), 'utf8');

test('phone: the key and the finding stand above the attribution where they would cover it, by live heights', () => {
  assert.match(app, /function trackAttribution\(map\)/);
  assert.match(app, /state\.attribObserver = trackAttribution\(state\.map\);/);
  assert.match(app, /setProperty\('--attrib-height'/);
  assert.match(app, /setProperty\('--legend-height'/);
  const phone = css.slice(css.indexOf('@media (max-width: 760px) and (orientation: portrait)'));
  assert.match(app, /classList\.toggle\('is-key-lifted', lifted\)/);
  assert.match(app, /classList\.toggle\('is-crowded', /);
  assert.match(app, /new ResizeObserver\(schedule\)/, 'measured once a frame, not inside the observer callback');
  assert.match(phone, /\.map-panel\.is-key-lifted \.map-legend \{ bottom: calc\(var\(--bottom-panel-height\) \+ var\(--attrib-height, 40px\) \+ 14px\); \}/);
  assert.match(phone, /\.map-panel\.is-key-lifted \.map-aha \{ bottom: calc\(var\(--bottom-panel-height\) \+ var\(--attrib-height, 40px\) \+ var\(--legend-height, \d+px\) \+ 22px\); \}/);
  assert.match(phone, /\.map-panel\.is-crowded \.map-aha \{ display: none; \}/);
  assert.match(phone, /\n  \.map-aha \{ bottom: calc\(var\(--bottom-panel-height\) \+ var\(--legend-height, \d+px\) \+ 16px\); \}/);
});

test('phone: no later stylesheet gives the finding a fixed offset again', () => {
  for (const name of ['grocery.css', 'navigation.css']) {
    let text = '';
    try { text = readFileSync(new URL(name, root), 'utf8'); } catch { continue; }
    assert.doesNotMatch(text, /\.map-aha \{ bottom:/, `${name}: the finding's place comes from styles.css`);
  }
});

// Release 0.7.2 (owner check 2026-11-12 07:21): the first view was framed before the attribution had its text, and the
// cards that then rose above it stood over the lowest framed area (Silom, 21 px at 320 × 568) until the map was moved.
test('phone: an untouched first view is framed again when the cards move, within limits', () => {
  assert.match(app, /if \(!state\.initialCameraDone\) \{\n    state\.initialCameraDone = true;\n    frameFirst\(\);\n  \}/);
  const first = app.slice(app.indexOf('function frameFirst()'), app.indexOf('function reframeFirst()'));
  assert.match(first, /frameFirstView\(\);/);
  assert.match(first, /mobilePortrait\(\)/, 'only on a phone');
  for (const type of ['pointerdown', 'keydown', 'wheel']) assert.ok(first.includes(`'${type}'`), `${type} on the page ends the reframing`);
  const again = app.slice(app.indexOf('function reframeFirst()'), app.indexOf('function cardsTop()'));
  assert.match(again, /Math\.abs\(top - first\.top\) < 2\) return;/, 'only when the cards moved');
  assert.match(again, /!sameCamera\(before, first\.camera\) \|\| first\.left <= 0/, 'only while the camera stands where the first frame left it, and at most three times');
  assert.match(again, /getZoom\(\) < before\.zoom - 0\.5\) \{ state\.map\.jumpTo\(before\);/, 'a frame that pulls out by more than half a level is not kept');
  const track = app.slice(app.indexOf('function trackAttribution(map)'));
  assert.match(track.slice(0, track.indexOf('const schedule')), /\n    reframeFirst\(\);\n  \};/, 'after the cards have their place for this frame');
  assert.match(app, /state\.initialCameraDone = false; state\.firstFrame = null;/);
});
