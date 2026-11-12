/**
 * What the search box of CityMETER · Luxury Brands knows by name: the entries js/shell/fuzzy.js matches and
 * js/shell/search.js lists (release 0.8.0; owner 2026-11-12 12:05, VERBATIM: “ศึกษาแนวคิดเรื่อง Fuzzy search แล้ว
 * implement กับ demo web ให้ได้ user benefit สูงสุดตาม user intent ในขณะนั้น และตาม product statement”).
 *
 * The page reads where luxury brands gather. So a name typed here opens the level that shows it: a province or a
 * Bangkok ย่าน (the boutiques there), a brand group or a kind of place (its filter), a brand (its boutiques, by its
 * name as the words of the text filter — the page's own way to a brand), a shopping centre or a location (the
 * boutiques in it), or one boutique (its page). The order below is the order among equal matches: places first.
 *
 * Pure: entries from the dataset; no DOM, no numbers shown (a row names what it is and where).
 */
import {PROVINCES, SEGMENTS, SEGMENT_SHORT, CHANNELS, provinceByName, isClosed} from './model.js';
import {PROVINCE_AKA} from './shell/fuzzy.js';

export const SEARCH_KINDS = Object.freeze([
  {id: 'province', level: 'province', auto: true}, {id: 'hood', level: 'locale', auto: true},
  {id: 'segment', auto: true}, {id: 'channel', auto: true}, {id: 'brand', auto: true}, {id: 'venue'}, {id: 'store'},
]);
/** Words a name may begin with, or carry, that people add or leave out; an array is one word said two ways. */
export const SEARCH_HEADS = Object.freeze([['ศูนย์การค้า', 'ห้าง'], 'ร้าน', 'the']);
/** What to try when nothing is found: the kinds of name this demo knows. */
export const SEARCH_HINT = 'ลองชื่อแบรนด์ ร้าน ทำเล ย่าน หรือจังหวัด';

const squash = text => String(text || '').toLocaleLowerCase('th').replace(/[\s'’.\-/&,]+/g, '');
const tidy = text => String(text || '').replace(/\s+/g, ' ').trim();
/** A boutique as the page names it: its own name when it begins with its brand; else the brand, then the name or the venue. */
export const storeTitle = r => { const name = tidy(r.name || r.venue); return squash(name).startsWith(squash(r.brand)) ? name : tidy(`${r.brand || ''} ${name}`); };
/** The venue a row is in, as the page keys it (js/model.js): the linked centre, else the venue's name as the row writes it. */
export const venueKey = r => r.mallId || (r.venue ? `venue:${r.venue}` : '');

/** Every entry: the places and filters, the brands, the shopping centres, then the boutiques (every cohort). */
export function* searchEntries({data, neighborhoods}) {
  const rows = data.rows;
  for (const p of PROVINCES) yield {id: p.code, kind: 'province', name: p.th, nameEn: p.en, aka: PROVINCE_AKA[p.th], codes: [p.code], province: p.code};
  for (const f of neighborhoods?.features || []) {
    const q = f.properties || {}, id = f.id || q.id, p = PROVINCES.find(x => x.code === q.provinceCode);
    yield {id, kind: 'hood', name: q.name, nameEn: q.nameEn, within: [p?.th, p?.en], province: q.provinceCode || '', area: id, hood: q};
  }
  // A brand type is headed as its filter names it; its short Thai name finds it too.
  for (const [id, name] of Object.entries(SEGMENTS)) yield {id, kind: 'segment', name, aka: [SEGMENT_SHORT[id]]};
  const channels = new Set(rows.map(r => r.channel));
  for (const [id, name] of Object.entries(CHANNELS)) if (channels.has(id)) yield {id, kind: 'channel', name};
  const brands = new Map();
  for (const r of rows) if (r.brand && !brands.has(r.brand)) brands.set(r.brand, r.segment);
  for (const [name, segment] of brands) yield {id: `brand:${name}`, kind: 'brand', name, segment};
  const centers = new Map((data.centers || []).map(c => [c.id, c])), venues = new Map();
  for (const r of rows) { const key = venueKey(r); if (key) { if (!venues.has(key)) venues.set(key, []); venues.get(key).push(r); } }
  const names = c => (c ? [c.name, c.nameTh] : []);
  for (const [key, list] of venues) {
    const r = list[0], c = centers.get(r.mallId), p = provinceByName(r.province);
    yield {id: key, kind: 'venue', name: tidy(r.venue) || c?.name || '', aka: [...names(c), ...new Set(list.map(x => tidy(x.venue)))], within: [p?.th, p?.en], province: p?.code || '', mallId: r.mallId || '', venue: r.venue || '', rows: list};
  }
  for (const r of rows) {
    const p = provinceByName(r.province);
    yield {id: r.id, kind: 'store', name: storeTitle(r), within: [tidy(r.venue), ...names(centers.get(r.mallId)), r.neighborhood, p?.th, p?.en], province: p?.code || '', row: r};
  }
}

/** The line under a name in the list: what it is and where. */
export function searchNote(entry) {
  const province = code => PROVINCES.find(p => p.code === code)?.th || '';
  if (entry.kind === 'province') return 'จังหวัด';
  if (entry.kind === 'hood') return ['ย่าน', province(entry.province)].filter(Boolean).join(' · ');
  if (entry.kind === 'segment') return 'กลุ่มแบรนด์';
  if (entry.kind === 'channel') return 'รูปแบบสถานที่';
  if (entry.kind === 'brand') return ['แบรนด์', SEGMENT_SHORT[entry.segment]].filter(Boolean).join(' · ');
  // A place the register of shopping centres knows is one; any other is the location the boutiques name.
  if (entry.kind === 'venue') return [entry.mallId ? 'ศูนย์การค้า' : 'ทำเล', province(entry.province)].filter(Boolean).join(' · ');
  // A boutique that has closed says so, as its page does.
  const r = entry.row;
  return [SEGMENT_SHORT[r.segment] || 'สาขา', isClosed(r) ? 'ปิดถาวร' : '', tidy(r.venue), provinceByName(r.province)?.th].filter(Boolean).join(' · ');
}
