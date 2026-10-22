/**
 * Reading panel views as HTML strings. Pure: no DOM access, no map.
 *
 * Every actionable element carries data-action (and data-id / data-value) and
 * the app binds one delegated click handler. Actions:
 *   select-area · select-store · select-venue · search-brand · back
 *   explore-top · clear-focus · open-charts · open-table · clear-filter · select-province
 *
 * Copy is Thai, short and natural (owner instruction 2026-10-22: no caveats on
 * screen — provenance lives in the data section, help and docs). Units:
 * แบรนด์ = distinct brand labels, สาขา = one brand point of sale (store, counter or
 * shop-in-shop), สถานที่ = venue. Closures stay factual; missing is never zero.
 * Metric tiles and section headings carry pictograms (Material Symbols Rounded
 * subset, js/navigation.js PICTOGRAM_CONTRACT) so labels can stay one word; the
 * text is the meaning, the pictogram is decorative.
 */
import {SEGMENTS, SEGMENT_SHORT, hasPoint} from './model.js';
import {brandLogoMarkup, getBrandLogo} from './brand-logos.js';

const NUMBER = new Intl.NumberFormat('th-TH', {maximumFractionDigits: 0});
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const num = n => NUMBER.format(n);
const safeURL = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
const SEGMENT_ORDER = Object.keys(SEGMENTS);
const segIndex = id => Math.max(0, SEGMENT_ORDER.indexOf(id) + 1);

export function link(url, label, cls = 'source-link') {
  const u = safeURL(url);
  return u ? `<a class="${cls}" href="${esc(u)}" target="_blank" rel="noopener">${esc(label)}</a>` : '';
}

function thaiDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return iso || '';
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${d} ${months[m - 1]} ${y + 543}`;
}

export function statusPill(status) {
  if (!status) return '';
  return `<span class="status-pill tone-${esc(status.tone)}" title="${esc(status.detail)}">${esc(status.label)}</span>`;
}

/**
 * Metric tile with a pictogram (brand = diamond, store = storefront, venue = shopping
 * bag, area = map, province = city, exclusive = star, gla = ruler). The pictogram
 * is decorative; the one-word label carries the meaning. Pictograms are a test
 * exception to LDS nav-7 approved by the owner 2026-10-22 (js/navigation.js PICTOGRAM_CONTRACT).
 */
export function metricTile(value, label, kind = '') {
  return `<div class="metric${kind ? ` metric-${kind}` : ''}"><i class="metric-symbol pictogram pic-${esc(kind || 'plain')}" aria-hidden="true"></i><strong class="data-number">${num(value)}</strong><span>${esc(label)}</span></div>`;
}
/** Section heading with a pictogram. */
export const heading = (kind, text, id = '') => `<h3${id ? ` id="${esc(id)}"` : ''}><i class="pictogram pic-${esc(kind)}" aria-hidden="true"></i>${esc(text)}</h3>`;

function segmentBars(segmentMix, totalBrands) {
  if (!segmentMix.length) return '';
  const max = Math.max(1, ...segmentMix.map(s => s.brands));
  return `<ul class="mix-list" aria-label="กลุ่มแบรนด์ (แบรนด์ / สาขา)">${segmentMix.map(s => `
    <li><span class="mix-label"><i class="category-swatch category-${s.index}" aria-hidden="true"></i>${esc(s.name)}</span>
      <span class="mix-track" aria-hidden="true"><span class="mix-fill category-${s.index}" style="width:${Math.max(3, Math.round((s.brands / max) * 100))}%"></span></span>
      <span class="mix-value data-number" aria-label="${num(s.brands)} แบรนด์ ${num(s.pos)} สาขา" title="${num(s.brands)} แบรนด์ · ${num(s.pos)} สาขา">${num(s.brands)}<small>/${num(s.pos)}</small></span></li>`).join('')}</ul>`;
}

/* ---------- Overview ---------- */

/**
 * focusMode: 'auto' (default — the top areas carry the detail, the rest is quiet),
 * 'explicit' (user-chosen areas) or 'none' (every area in detail).
 */
export function renderOverview({insight, overview, summary, focusMode = 'auto', focused, areaModel, asOf, venues = [], view3d = true, provinces = []}) {
  const count = insight.areas.length;
  const share = insight.totalBrands ? Math.round(insight.share) : 0;
  const names = insight.areas.map(a => a.name);
  const nameList = names.length > 1 ? `${names.slice(0, -1).join(' · ')} และ${names.at(-1)}` : names[0] || '';
  const mode = focused === true ? 'explicit' : focusMode;
  let aha;
  if (!count && !summary.pos) {
    aha = `<section class="aha" aria-label="ข้อค้นพบ"><p class="eyebrow">ข้อค้นพบแรก</p><h2>ไม่พบสาขาตามตัวกรองนี้</h2>
      <div class="aha-actions"><button type="button" data-action="clear-filter" data-id="all" class="btn">ล้างตัวกรอง</button></div></section>`;
  } else if (!count) {
    const top = venues.slice(0, 3);
    aha = `<section class="aha" aria-label="ข้อค้นพบ"><p class="eyebrow">ข้อค้นพบแรก</p><h2>${num(summary.pos)} สาขาอยู่นอก ${num(areaModel?.areas.length || 0)} ย่านที่นิยามไว้</h2>${top.length ? `<p class="aha-copy">สถานที่ที่มีแบรนด์มากที่สุด: ${top.map(c => `<strong>${esc(c.name)}</strong> <span class="data-number">${num(c.brands)}</span>`).join(' · ')}</p>` : ''}
      <div class="aha-actions"><button type="button" data-action="open-table" class="btn">ดูสาขา</button><button type="button" data-action="clear-filter" data-id="all" class="btn quiet">ล้างตัวกรอง</button></div></section>`;
  } else if (mode === 'explicit') {
    aha = `<section class="aha is-focused" aria-label="ข้อค้นพบ"><p class="eyebrow">กำลังสำรวจ ${num(count)} ย่าน</p>
      <h2>${esc(nameList)}</h2>
      <p class="aha-copy"><strong class="data-number">${num(insight.brands)}</strong> แบรนด์ · <strong class="data-number">${num(insight.pos)}</strong> สาขา</p>
      <div class="aha-actions"><button type="button" data-action="clear-focus" class="btn">ดูทุกย่าน</button><button type="button" data-action="open-charts" class="btn quiet">เปรียบเทียบย่าน</button></div></section>`;
  } else {
    const toggle = mode === 'auto'
      ? `<button type="button" data-action="clear-focus" class="btn">ดูทุกย่าน</button>`
      : `<button type="button" data-action="explore-top" class="btn primary">โฟกัส ${num(count)} ย่านนี้</button>`;
    aha = `<section class="aha${mode === 'auto' ? ' is-auto' : ''}" aria-label="ข้อค้นพบ"><p class="eyebrow">ข้อค้นพบแรก</p>
      <h2><span class="aha-number data-number">${num(share)}%</span><span class="aha-headline">ของแบรนด์อยู่ใน ${num(count)} ย่านนี้</span></h2>
      <p class="aha-copy">${names.map(n => `<button type="button" class="link-button" data-action="select-area" data-id="${esc(insight.areas[names.indexOf(n)].id)}">${esc(n)}</button>`).join(' · ')}<br><strong class="data-number">${num(insight.brands)}</strong> จาก ${num(insight.totalBrands)} แบรนด์ · <strong class="data-number">${num(insight.pos)}</strong> จาก ${num(insight.totalPos)} สาขา</p>
      ${overview.mostExclusive ? `<p class="aha-secondary">แบรนด์เฉพาะย่านมากที่สุด: <button type="button" class="link-button" data-action="select-area" data-id="${esc(overview.mostExclusive.id)}">${esc(overview.mostExclusive.name)}</button> <span class="data-number">${num(overview.mostExclusive.exclusiveBrands)}</span>/${num(overview.mostExclusive.brands)}</p>` : ''}
      <div class="aha-actions">${toggle}<button type="button" data-action="open-charts" class="btn quiet">เปรียบเทียบย่าน</button></div></section>`;
  }
  const ranking = overview.ranking.slice(0, 10);
  const max = Math.max(1, ...ranking.map(a => a.brands));
  const rankList = ranking.length ? `<section class="panel-section" aria-labelledby="rank-title">
    <div class="section-heading">${heading('area', 'ย่านเรียงตามแบรนด์', 'rank-title')}<span class="hint">${num(overview.areaCount)} ย่าน</span></div>
    <ol class="rank-list">${ranking.map((a, i) => {
      const cls = areaModel?.areas.find(x => x.id === a.id);
      return `<li><button type="button" class="rank-row" data-action="select-area" data-id="${esc(a.id)}" aria-label="อันดับ ${i + 1} ${esc(a.name)} ${num(a.brands)} แบรนด์ ${num(a.pos)} สาขา">
        <span class="rank-index data-number" aria-hidden="true">${i + 1}</span>
        <span class="rank-name">${esc(a.name)}<small>${num(a.pos)} สาขา${a.exclusiveBrands ? ` · เฉพาะย่าน ${num(a.exclusiveBrands)}` : ''}</small></span>
        <span class="rank-track" aria-hidden="true"><span class="rank-fill" style="width:${Math.max(3, Math.round((a.brands / max) * 100))}%;background:${cls?.fill || 'var(--scale-count-3)'}"></span></span>
        <span class="rank-value data-number" aria-hidden="true">${num(a.brands)}</span></button></li>`;
    }).join('')}</ol>
    ${overview.outsidePos ? `<p class="hint">อีก ${num(overview.outsidePos)} สาขาอยู่นอกย่านที่นิยามไว้</p>` : ''}
  </section>` : (venues.length ? `<section class="panel-section" aria-labelledby="venue-rank-title">
    <div class="section-heading">${heading('venue', 'สถานที่เรียงตามแบรนด์', 'venue-rank-title')}<span class="hint">${num(venues.length)} แห่ง</span></div>
    <ul class="venue-list">${venues.slice(0, 10).map(c => `<li><button type="button" class="venue-row" data-action="select-venue" data-id="${esc(c.mallId)}" data-value="${esc(c.venue)}" aria-label="${esc(c.name)} ${num(c.brands)} แบรนด์ ${num(c.pos)} สาขา"><span class="venue-name">${esc(c.name)}<small>${esc(c.type || c.province || 'ทำเล')}</small></span><span class="venue-count data-number">${num(c.brands)}<small>แบรนด์</small></span></button></li>`).join('')}</ul>
  </section>` : '');
  // Country level: the provinces that hold brands, each a drill-down (the map shows them as frames).
  const provinceList = provinces.length > 1 ? `<section class="panel-section" aria-labelledby="province-title">
    <div class="section-heading">${heading('province', 'จังหวัดที่มีแบรนด์', 'province-title')}<span class="hint">${num(provinces.length)} จังหวัด</span></div>
    <ul class="province-list">${provinces.map(p => `<li><button type="button" class="province-row" data-action="select-province" data-id="${esc(p.code)}" aria-label="${esc(p.name)} ${num(p.brands)} แบรนด์ ${num(p.pos)} สาขา กดเพื่อดูจังหวัด"><i class="province-swatch" style="background:${esc(p.fill)}" aria-hidden="true"></i><span class="province-name">${esc(p.name)}</span><span class="province-count data-number">${num(p.brands)}<small>แบรนด์ · ${num(p.pos)} สาขา</small></span></button></li>`).join('')}</ul>
  </section>` : '';
  const narrowed = mode !== 'none' && count > 0 && summary.pos !== insight.totalPos;
  const metrics = `<section class="metrics" aria-label="${narrowed ? 'ตัวเลขของย่านที่โฟกัส' : 'ตัวเลขรวมของข้อมูลที่เลือก'}">
    ${metricTile(summary.brands, `แบรนด์${narrowed ? ' ในโฟกัส' : ''}`, 'brand')}
    ${metricTile(summary.pos, `สาขา${narrowed ? ' ในโฟกัส' : ''}`, 'store')}
    ${metricTile(summary.centers.length, 'ศูนย์การค้า', 'venue')}
    ${metricTile(overview.areaCount, 'ย่าน', 'area')}
  </section>`;
  return `${aha}${metrics}${provinceList}${rankList}<p class="hint panel-foot">Luxury Brands Thailand · ข้อมูล ${esc(thaiDate(asOf))}</p>`;
}

/* ---------- Neighborhood profile ---------- */

export function renderNeighborhood(profile) {
  if (!profile) return '';
  const p = profile;
  const statusText = p.status === 'desk-reviewed' ? 'ตรวจบนโต๊ะแล้ว' : p.status === 'candidate' ? 'ขอบเขตรอทบทวน' : p.status;
  const venues = p.venues.length ? `<section class="panel-section"><div class="section-heading">${heading('venue', 'สถานที่ในย่าน')}<span class="hint">${num(p.venues.length)} แห่ง</span></div>
    <ul class="venue-list">${p.venues.slice(0, 12).map(v => `<li><button type="button" class="venue-row" data-action="select-venue" data-id="${esc(v.mallId)}" data-value="${esc(v.name)}" aria-label="${esc(v.name)} ${num(v.brands)} แบรนด์ ${num(v.pos)} สาขา">
      <span class="venue-name">${esc(v.name)}<small>${esc(v.type || (v.mallId ? 'ศูนย์การค้า' : 'ทำเล / อาคาร'))}</small></span>
      <span class="venue-count data-number">${num(v.brands)}<small>แบรนด์</small></span></button></li>`).join('')}</ul>
    ${p.venues.length > 12 ? `<p class="hint">+ อีก ${num(p.venues.length - 12)} แห่งในตาราง</p>` : ''}</section>` : '';
  const chips = (list, kind) => list.map(b => {
    const brand = typeof b === 'string' ? b : b.brand;
    const logo = getBrandLogo(brand);
    const title = typeof b === 'string' ? `${brand} — เฉพาะย่านนี้` : `${brand} — พบที่ ${b.elsewhere.join(', ')} ด้วย`;
    return `<li><button type="button" class="brand-chip chip-${kind}" data-action="search-brand" data-value="${esc(brand)}" title="${esc(title)}">${logo ? brandLogoMarkup(brand, {className: 'chip-logo'}) : ''}<span>${esc(brand)}</span></button></li>`;
  }).join('');
  const brands = `<section class="panel-section"><div class="section-heading">${heading('exclusive', 'แบรนด์เฉพาะย่านนี้')}<span class="hint">${num(p.exclusive.length)} จาก ${num(p.brands)}</span></div>
    ${p.exclusive.length ? `<ul class="chip-list">${chips(p.exclusive, 'exclusive')}</ul>` : '<p class="hint">ไม่มี — ทุกแบรนด์พบในย่านอื่นด้วย</p>'}
    <div class="section-heading"><h3>พบในย่านอื่นด้วย</h3><span class="hint">${num(p.shared.length)}</span></div>
    ${p.shared.length ? `<ul class="chip-list">${chips(p.shared, 'shared')}</ul>` : '<p class="hint">ไม่มี</p>'}</section>`;
  return `<section class="detail-head">
      <button type="button" class="btn quiet back" data-action="back">กลับ</button>
      <p class="eyebrow">ย่าน${p.rank ? ` · อันดับ ${num(p.rank)} จาก ${num(p.areaCount)}` : ''}</p>
      <h2>${esc(p.name)}</h2>${p.nameEn ? `<p class="subtle">${esc(p.nameEn)}</p>` : ''}
      <div class="metrics compact">${metricTile(p.brands, 'แบรนด์', 'brand')}${metricTile(p.pos, 'สาขา', 'store')}${metricTile(p.venues.length, 'สถานที่', 'venue')}${metricTile(p.exclusive.length, 'เฉพาะย่าน', 'exclusive')}</div>
      ${p.closed ? `<p class="hint">รวมปิดถาวร ${num(p.closed)} สาขา</p>` : ''}
      <div class="detail-actions"><button type="button" class="btn" data-action="open-table">ดูสาขา</button><button type="button" class="btn quiet" data-action="open-charts">เปรียบเทียบย่าน</button></div>
    </section>
    <section class="panel-section"><div class="section-heading">${heading('segment', 'กลุ่มแบรนด์')}<span class="hint">แบรนด์ / สาขา</span></div>${segmentBars(p.segmentMix, p.brands)}</section>
    ${venues}${brands}
    <section class="panel-section boundary"><div class="section-heading"><h3>ขอบเขตย่าน</h3><span class="hint">${esc(statusText)}</span></div>
      <p class="subtle">${esc(p.definition)}</p>
      ${p.sourceURLs.length ? `<p class="links">${p.sourceURLs.slice(0, 4).map((u, i) => link(u, `อ้างอิง ${i + 1}`)).join(' ')}</p>` : ''}
    </section>`;
}

/* ---------- Venue ---------- */

export function renderVenue(v) {
  if (!v) return '';
  const rows = v.rows.map(r => `<li><button type="button" class="brand-row" data-action="select-store" data-id="${esc(r.id)}">${brandLogoMarkup(r.brand)}<span><strong>${esc(r.brand)}</strong><br><span class="small muted">${esc(r.name || r.venue)}</span></span></button></li>`).join('');
  return `<section class="detail-head">
      <button type="button" class="btn quiet back" data-action="back">กลับ</button>
      <p class="eyebrow">${esc(v.type || 'สถานที่')}${v.area ? ` · <button type="button" class="link-button" data-action="select-area" data-id="${esc(v.area.id)}">${esc(v.area.name)}</button>` : ''}</p>
      <h2>${esc(v.name)}</h2>${v.nameTh ? `<p class="subtle">${esc(v.nameTh)} · ${esc(v.province)}</p>` : `<p class="subtle">${esc(v.province)}</p>`}
      <div class="metrics compact">${metricTile(v.brands, 'แบรนด์', 'brand')}${metricTile(v.pos, 'สาขา', 'store')}${v.gla ? metricTile(v.gla, 'GLA ตร.ม.', 'gla') : ''}</div>
      ${v.source ? `<p class="links">${link(v.source, 'ศูนย์การค้านี้ใน CityMETER')}</p>` : ''}
    </section>
    <section class="panel-section"><div class="section-heading">${heading('segment', 'กลุ่มแบรนด์')}<span class="hint">แบรนด์ / สาขา</span></div>${segmentBars(v.segmentMix, v.brands)}</section>
    <section class="panel-section"><div class="section-heading">${heading('store', 'สาขา')}<span class="hint">${num(v.rows.length)}</span></div><ul class="outlet-list">${rows}</ul></section>`;
}

/* ---------- Store ---------- */

export function renderStore(d) {
  if (!d) return '';
  const r = d.row;
  const logo = getBrandLogo(r.brand);
  const others = d.presence.stores.filter(s => s.id !== r.id);
  const coords = hasPoint(r) ? `${r.latitude.toFixed(6)}, ${r.longitude.toFixed(6)}` : 'ยังไม่มีพิกัด';
  return `<section class="detail-head store">
      <button type="button" class="btn quiet back" data-action="back">กลับ</button>
      ${logo ? brandLogoMarkup(r.brand, {className: 'detail-logo', decorative: false}) : ''}
      <p class="eyebrow">${esc(d.segment)}</p>
      <h2>${esc(r.brand)}</h2>
      <p class="subtle">${esc(r.name || r.venue)}</p>
      <p class="store-status">${statusPill(d.status)}</p>
      <dl class="facts">
        <dt>สถานที่</dt><dd>${d.center ? `<button type="button" class="link-button" data-action="select-venue" data-id="${esc(r.mallId)}" data-value="${esc(r.venue)}">${esc(r.venue)}</button>` : esc(r.venue)} · ${esc(r.province)}</dd>
        <dt>ย่าน</dt><dd>${d.area ? `<button type="button" class="link-button" data-action="select-area" data-id="${esc(d.area.id)}">${esc(d.area.name)}</button>` : 'นอกย่านที่นิยามไว้'}</dd>
        <dt>รูปแบบ</dt><dd>${esc(d.channel)}</dd>
        <dt>พิกัด</dt><dd><span class="data-number">${esc(coords)}</span><br><span class="hint" title="${esc(d.geometry.note)}">${esc(d.geometry.label)}${d.coLocated ? ` · ร่วมพิกัดกับอีก ${num(d.coLocated)} สาขา` : ''}</span></dd>
        <dt>ตรวจเมื่อ</dt><dd>${esc(thaiDate(r.checkedOn)) || '—'}</dd>
      </dl>
      <p class="links">${link(r.source, 'หลักฐาน')} ${link(r.statusSource, 'สถานะ')} ${link(r.coordinateSource, 'พิกัด')} ${logo ? link(logo.sourceURL, 'โลโก้') : ''}</p>
    </section>
    <section class="panel-section"><div class="section-heading">${heading('store', `สาขาอื่นของ ${r.brand}`)}<span class="hint">${num(Math.max(0, d.presence.pos - 1))} สาขา · ${num(d.presence.venues)} สถานที่</span></div>
      ${d.presence.areas.length ? `<p class="subtle">${d.presence.areas.map(a => esc(a)).join(' · ')}</p>` : ''}
      ${others.length ? `<ul class="outlet-list">${others.slice(0, 10).map(s => `<li><button type="button" class="brand-row" data-action="select-store" data-id="${esc(s.id)}"><span><strong>${esc(s.venue)}</strong><br><span class="small muted">${esc(s.name || '')} · ${esc(s.province)}</span></span></button></li>`).join('')}</ul>` : '<p class="hint">ไม่มี</p>'}
      <div class="detail-actions"><button type="button" class="btn quiet" data-action="search-brand" data-value="${esc(r.brand)}">ดูเฉพาะแบรนด์นี้</button></div>
    </section>`;
}

/* ---------- Active filter chips ---------- */

export function renderFilterChips(values, labels) {
  const chips = [];
  const push = (key, text) => chips.push(`<li><button type="button" class="filter-chip" data-action="clear-filter" data-id="${esc(key)}" aria-label="ล้างตัวกรอง ${esc(text)}"><span>${esc(text)}</span><i aria-hidden="true">×</i></button></li>`);
  if (values.search) push('search', `ค้นหา “${values.search}”`);
  if (values.cohort && values.cohort !== 'refresh') push('cohort', labels.cohort[values.cohort] || values.cohort);
  if (values.segment) push('segment', SEGMENTS[values.segment] || values.segment);
  if (values.province) push('province', values.province);
  if (values.channel) push('channel', labels.channel[values.channel] || values.channel);
  if (values.venue) push('venue', values.venue);
  if (values.neighborhood) push('neighborhood', labels.neighborhood[values.neighborhood] || values.neighborhood);
  return chips.length ? `<ul class="filter-chips" aria-label="ตัวกรองที่ใช้อยู่">${chips.join('')}<li><button type="button" class="filter-chip clear-all" data-action="clear-filter" data-id="all">ล้างทั้งหมด</button></li></ul>` : '';
}

export {SEGMENT_SHORT, segIndex};
