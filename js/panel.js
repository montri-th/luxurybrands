/**
 * Reading panel views as HTML strings. Pure: no DOM access, no map.
 *
 * Every actionable element carries data-action (and data-id / data-value) and
 * the app binds one delegated click handler. Actions:
 *   select-area · select-store · select-venue · search-brand · back
 *   explore-top · clear-focus · open-charts · open-table · clear-filter
 *
 * Copy is Thai, evidence-aware and specific: counts always say what they count
 * (แบรนด์ไม่ซ้ำ vs รายการจุดขาย), closures stay factual and missing data is
 * never shown as zero.
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

function segmentBars(segmentMix, totalBrands) {
  if (!segmentMix.length) return '';
  const max = Math.max(1, ...segmentMix.map(s => s.brands));
  return `<ul class="mix-list" aria-label="กลุ่มแบรนด์ หน่วย: แบรนด์ไม่ซ้ำ">${segmentMix.map(s => `
    <li><span class="mix-label"><i class="category-swatch category-${s.index}" aria-hidden="true"></i>${esc(s.name)}</span>
      <span class="mix-track" aria-hidden="true"><span class="mix-fill category-${s.index}" style="width:${Math.max(3, Math.round((s.brands / max) * 100))}%"></span></span>
      <span class="mix-value data-number" aria-label="${num(s.brands)} แบรนด์ ${num(s.pos)} จุดขาย">${num(s.brands)}<small>/${num(s.pos)}</small></span></li>`).join('')}</ul>
    <p class="hint">ตัวเลข = แบรนด์ไม่ซ้ำ / รายการจุดขาย · รวม ${num(totalBrands)} แบรนด์</p>`;
}

/* ---------- Overview ---------- */

export function renderOverview({insight, overview, summary, focused, areaModel, asOf, venues = []}) {
  const count = insight.areas.length;
  const share = insight.totalBrands ? Math.round(insight.share) : 0;
  const names = insight.areas.map(a => a.name);
  const nameList = names.length > 1 ? `${names.slice(0, -1).join(' · ')} และ${names.at(-1)}` : names[0] || '';
  let aha;
  if (!count && !summary.pos) {
    aha = `<section class="aha" aria-label="ข้อค้นพบ"><p class="eyebrow">ข้อค้นพบแรก</p><h2>ไม่พบจุดขายตามตัวกรองนี้</h2><p class="aha-copy">ยังไม่พบรายการที่ตรงกับคำค้นหรือตัวกรองที่เลือก ไม่ได้แปลว่าไม่มีร้านในพื้นที่ ลองใช้คำค้นอื่นหรือล้างตัวกรอง</p>
      <div class="aha-actions"><button type="button" data-action="clear-filter" data-id="all" class="btn">ล้างตัวกรอง</button></div></section>`;
  } else if (!count) {
    const top = venues.slice(0, 3);
    aha = `<section class="aha" aria-label="ข้อค้นพบ"><p class="eyebrow">ข้อค้นพบแรก · นอกขอบเขตย่านที่นิยามไว้</p><h2>${num(summary.pos)} รายการนี้อยู่นอกแกนย่านที่นิยามไว้</h2><p class="aha-copy">ขอบเขตย่านชุดนี้ยังครอบคลุมเฉพาะ ${num(areaModel?.areas.length || 0)} แกนย่าน การอยู่นอกขอบเขตไม่ได้แปลว่าไม่มีย่านหรือตลาด${top.length ? ` สถานที่ที่มีแบรนด์มากที่สุดในตัวกรองนี้: ${top.map(c => `${esc(c.name)} (${num(c.brands)} แบรนด์)`).join(' · ')}` : ''}</p>
      <div class="aha-actions"><button type="button" data-action="open-table" class="btn">ดูรายการ</button><button type="button" data-action="clear-filter" data-id="all" class="btn quiet">ล้างตัวกรอง</button></div></section>`;
  } else if (focused) {
    aha = `<section class="aha is-focused" aria-label="ข้อค้นพบ"><p class="eyebrow">กำลังสำรวจ ${num(count)} ย่าน</p>
      <h2>${esc(nameList)}</h2>
      <p class="aha-copy"><strong class="data-number">${num(insight.brands)}</strong> แบรนด์ไม่ซ้ำ · <strong class="data-number">${num(insight.pos)}</strong> รายการจุดขาย ในย่านที่เลือก</p>
      <div class="aha-actions"><button type="button" data-action="clear-focus" class="btn">กลับไปดูทุกย่าน</button><button type="button" data-action="open-charts" class="btn quiet">เปรียบเทียบย่าน</button></div></section>`;
  } else {
    aha = `<section class="aha" aria-label="ข้อค้นพบ"><p class="eyebrow">ข้อค้นพบแรก · อ่านเมืองผ่านย่าน</p>
      <h2><span class="aha-number data-number">${num(share)}%</span><span class="aha-headline">ของแบรนด์ที่เลือกอยู่ใน ${num(count)} ย่านนี้</span></h2>
      <p class="aha-copy">${esc(nameList)} รวมกันมี <strong class="data-number">${num(insight.brands)}</strong> จาก <strong class="data-number">${num(insight.totalBrands)}</strong> แบรนด์ไม่ซ้ำ (${num(insight.pos)} จาก ${num(insight.totalPos)} รายการจุดขาย)</p>
      ${overview.mostExclusive ? `<p class="aha-secondary">ย่านที่มีแบรนด์เฉพาะมากที่สุด: <button type="button" class="link-button" data-action="select-area" data-id="${esc(overview.mostExclusive.id)}">${esc(overview.mostExclusive.name)}</button> — ${num(overview.mostExclusive.exclusiveBrands)} จาก ${num(overview.mostExclusive.brands)} แบรนด์พบเฉพาะที่นี่ในข้อมูลที่เลือก</p>` : ''}
      <div class="aha-actions"><button type="button" data-action="explore-top" class="btn primary">สำรวจ ${num(count)} ย่านนี้</button><button type="button" data-action="open-charts" class="btn quiet">ดูกราฟเปรียบเทียบ</button></div></section>`;
  }
  const ranking = overview.ranking.slice(0, 10);
  const max = Math.max(1, ...ranking.map(a => a.brands));
  const rankList = ranking.length ? `<section class="panel-section" aria-labelledby="rank-title">
    <div class="section-heading"><h3 id="rank-title">ย่านเรียงตามแบรนด์ไม่ซ้ำ</h3><span class="hint">${num(overview.areaCount)} ย่าน · กดเพื่อสำรวจ</span></div>
    <ol class="rank-list">${ranking.map((a, i) => {
      const cls = areaModel?.areas.find(x => x.id === a.id);
      return `<li><button type="button" class="rank-row" data-action="select-area" data-id="${esc(a.id)}" aria-label="อันดับ ${i + 1} ${esc(a.name)} ${num(a.brands)} แบรนด์ไม่ซ้ำ ${num(a.pos)} รายการจุดขาย">
        <span class="rank-index data-number" aria-hidden="true">${i + 1}</span>
        <span class="rank-name">${esc(a.name)}<small>${num(a.pos)} จุดขาย${a.exclusiveBrands ? ` · เฉพาะย่าน ${num(a.exclusiveBrands)}` : ''}</small></span>
        <span class="rank-track" aria-hidden="true"><span class="rank-fill" style="width:${Math.max(3, Math.round((a.brands / max) * 100))}%;background:${cls?.fill || 'var(--scale-count-3)'}"></span></span>
        <span class="rank-value data-number" aria-hidden="true">${num(a.brands)}</span></button></li>`;
    }).join('')}</ol>
    ${overview.outsidePos ? `<p class="hint">อีก ${num(overview.outsidePos)} รายการอยู่นอกขอบเขตย่านที่นิยามไว้ (เช่น ภูเก็ต สนามบิน ศูนย์การค้านอกแกนย่าน) ยังนับในตัวเลขรวมและตาราง</p>` : ''}
  </section>` : (venues.length ? `<section class="panel-section" aria-labelledby="venue-rank-title">
    <div class="section-heading"><h3 id="venue-rank-title">สถานที่เรียงตามแบรนด์ไม่ซ้ำ</h3><span class="hint">${num(venues.length)} แห่ง · กดเพื่อดู</span></div>
    <ul class="venue-list">${venues.slice(0, 10).map(c => `<li><button type="button" class="venue-row" data-action="select-venue" data-id="${esc(c.mallId)}" data-value="${esc(c.venue)}" aria-label="${esc(c.name)} ${num(c.brands)} แบรนด์ ${num(c.pos)} จุดขาย"><span class="venue-name">${esc(c.name)}<small>${esc(c.type || c.province || 'ทำเล')}</small></span><span class="venue-count data-number">${num(c.brands)}<small>แบรนด์</small></span></button></li>`).join('')}</ul>
  </section>` : '');
  const metrics = `<section class="metrics" aria-label="ตัวเลขรวมของข้อมูลที่เลือก">
    <div><strong class="data-number">${num(summary.brands)}</strong><span>แบรนด์ไม่ซ้ำ</span></div>
    <div><strong class="data-number">${num(summary.pos)}</strong><span>รายการจุดขาย</span></div>
    <div><strong class="data-number">${num(summary.centers.length)}</strong><span>ศูนย์การค้าที่จับคู่</span></div>
    <div><strong class="data-number">${num(overview.areaCount)}</strong><span>ย่านที่มีจุดขาย</span></div>
  </section>`;
  return `${aha}${metrics}${rankList}<p class="hint panel-foot">ชุดข้อมูล Luxury Brands Thailand · ตรวจถึง ${esc(thaiDate(asOf))} · ขอบเขตย่านเป็นแกนวิเคราะห์ที่นิยามไว้ ไม่ใช่เขตปกครอง · มีพิกัด ${num(summary.mapped)}/${num(summary.pos)} รายการ</p>`;
}

/* ---------- Neighborhood profile ---------- */

export function renderNeighborhood(profile) {
  if (!profile) return '';
  const p = profile;
  const statusText = p.status === 'desk-reviewed' ? 'ตรวจบนโต๊ะแล้ว' : p.status === 'candidate' ? 'ขอบเขตรอทบทวน' : p.status;
  const venues = p.venues.length ? `<section class="panel-section"><div class="section-heading"><h3>สถานที่ในย่าน</h3><span class="hint">${num(p.venues.length)} แห่ง</span></div>
    <ul class="venue-list">${p.venues.slice(0, 12).map(v => `<li><button type="button" class="venue-row" data-action="select-venue" data-id="${esc(v.mallId)}" data-value="${esc(v.name)}" aria-label="${esc(v.name)} ${num(v.brands)} แบรนด์ ${num(v.pos)} จุดขาย">
      <span class="venue-name">${esc(v.name)}<small>${esc(v.type || (v.mallId ? 'ศูนย์การค้า' : 'ทำเล / อาคาร'))}</small></span>
      <span class="venue-count data-number">${num(v.brands)}<small>แบรนด์</small></span></button></li>`).join('')}</ul>
    ${p.venues.length > 12 ? `<p class="hint">แสดง 12 จาก ${num(p.venues.length)} แห่ง ดูทั้งหมดในตาราง</p>` : ''}</section>` : '';
  const chips = (list, kind) => list.map(b => {
    const brand = typeof b === 'string' ? b : b.brand;
    const logo = getBrandLogo(brand);
    const title = typeof b === 'string' ? `${brand} — พบเฉพาะย่านนี้ในข้อมูลที่เลือก` : `${brand} — พบที่ ${b.elsewhere.join(', ')} ด้วย`;
    return `<li><button type="button" class="brand-chip chip-${kind}" data-action="search-brand" data-value="${esc(brand)}" title="${esc(title)}">${logo ? brandLogoMarkup(brand, {className: 'chip-logo'}) : ''}<span>${esc(brand)}</span></button></li>`;
  }).join('');
  const brands = `<section class="panel-section"><div class="section-heading"><h3>แบรนด์เฉพาะย่านนี้</h3><span class="hint">${num(p.exclusive.length)} จาก ${num(p.brands)} แบรนด์</span></div>
    ${p.exclusive.length ? `<ul class="chip-list">${chips(p.exclusive, 'exclusive')}</ul>` : '<p class="hint">ทุกแบรนด์ในย่านนี้พบในย่านอื่นที่นิยามไว้ด้วย</p>'}
    <div class="section-heading"><h3>แบรนด์ที่พบในย่านอื่นด้วย</h3><span class="hint">${num(p.shared.length)} แบรนด์</span></div>
    ${p.shared.length ? `<ul class="chip-list">${chips(p.shared, 'shared')}</ul>` : '<p class="hint">ไม่มีแบรนด์ที่ซ้ำกับย่านอื่นในข้อมูลที่เลือก</p>'}
    <p class="hint">“เฉพาะ/ร่วม” เทียบกับ ${num(p.areaCount)} ย่านที่มีจุดขายในข้อมูลที่เลือกเท่านั้น ไม่ใช่สิทธิ์จำหน่ายหรือจำนวนสาขาทั้งประเทศ · กดชื่อแบรนด์เพื่อค้นหา</p></section>`;
  return `<section class="detail-head">
      <button type="button" class="btn quiet back" data-action="back">กลับ</button>
      <p class="eyebrow">ย่าน${p.rank ? ` · อันดับ ${num(p.rank)} จาก ${num(p.areaCount)}` : ''}</p>
      <h2>${esc(p.name)}</h2>${p.nameEn ? `<p class="subtle">${esc(p.nameEn)}</p>` : ''}
      <div class="metrics compact"><div><strong class="data-number">${num(p.brands)}</strong><span>แบรนด์ไม่ซ้ำ</span></div><div><strong class="data-number">${num(p.pos)}</strong><span>รายการจุดขาย</span></div><div><strong class="data-number">${num(p.venues.length)}</strong><span>สถานที่</span></div><div><strong class="data-number">${num(p.exclusive.length)}</strong><span>แบรนด์เฉพาะย่าน</span></div></div>
      ${p.closed ? `<p class="hint">รวมรายการปิดถาวร ${num(p.closed)} รายการตามตัวกรองปัจจุบัน</p>` : ''}
      <div class="detail-actions"><button type="button" class="btn" data-action="open-table">ดูรายการในย่าน</button><button type="button" class="btn quiet" data-action="open-charts">เปรียบเทียบย่าน</button></div>
    </section>
    <section class="panel-section"><div class="section-heading"><h3>บุคลิกของย่านตามกลุ่มแบรนด์</h3></div>${segmentBars(p.segmentMix, p.brands)}</section>
    ${venues}${brands}
    <section class="panel-section boundary"><div class="section-heading"><h3>ขอบเขตที่ใช้</h3><span class="hint">${esc(statusText)}</span></div>
      <p class="subtle">${esc(p.definition)}</p>
      <p class="hint">แกนย่านเชิงวิเคราะห์จากแนวถนน คลอง และแม่น้ำ ไม่ใช่เขตปกครองหรือ catchment ที่ยืนยันแล้ว · สมาชิกใช้พิกัดต้นทางแบบ point-in-polygon</p>
      ${p.sourceURLs.length ? `<p class="links">${p.sourceURLs.slice(0, 4).map((u, i) => link(u, `แหล่งอ้างอิงย่าน ${i + 1}`)).join(' ')}</p>` : ''}
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
      <div class="metrics compact"><div><strong class="data-number">${num(v.brands)}</strong><span>แบรนด์ไม่ซ้ำ</span></div><div><strong class="data-number">${num(v.pos)}</strong><span>รายการจุดขาย</span></div>${v.gla ? `<div><strong class="data-number">${num(v.gla)}</strong><span>GLA ตร.ม. ที่รายงาน</span></div>` : ''}</div>
      ${v.source ? `<p class="links">${link(v.source, 'ข้อมูลศูนย์การค้าใน CityMETER')}</p>` : ''}
    </section>
    <section class="panel-section"><div class="section-heading"><h3>กลุ่มแบรนด์</h3></div>${segmentBars(v.segmentMix, v.brands)}</section>
    <section class="panel-section"><div class="section-heading"><h3>รายการจุดขาย</h3><span class="hint">${num(v.rows.length)} รายการ</span></div><ul class="outlet-list">${rows}</ul></section>`;
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
      <p class="store-status">${statusPill(d.status)}<span class="hint">${esc(d.status.detail)}</span></p>
      <dl class="facts">
        <dt>สถานที่</dt><dd>${d.center ? `<button type="button" class="link-button" data-action="select-venue" data-id="${esc(r.mallId)}" data-value="${esc(r.venue)}">${esc(r.venue)}</button>` : esc(r.venue)} · ${esc(r.province)}</dd>
        <dt>ย่าน</dt><dd>${d.area ? `<button type="button" class="link-button" data-action="select-area" data-id="${esc(d.area.id)}">${esc(d.area.name)}</button>` : 'นอกขอบเขตย่านที่นิยามไว้'}</dd>
        <dt>รูปแบบ</dt><dd>${esc(d.channel)}</dd>
        <dt>พิกัด</dt><dd><span class="data-number">${esc(coords)}</span><br><span class="hint">${esc(d.geometry.label)} · ${esc(d.geometry.note)}</span>${d.coLocated ? `<br><span class="hint">มีอีก ${num(d.coLocated)} รายการใช้พิกัดเดียวกัน หมุดถูกจัดวางบนจอเพื่อให้เลือกได้</span>` : ''}</dd>
        <dt>ตรวจเมื่อ</dt><dd>${esc(thaiDate(r.checkedOn)) || 'ไม่ระบุ'}</dd>
      </dl>
      <p class="links">${link(r.source, 'หลักฐานรายการ')} ${link(r.statusSource, 'หลักฐานสถานะ')} ${link(r.coordinateSource, 'ที่มาพิกัด')} ${logo ? link(logo.sourceURL, 'ที่มาโลโก้') : ''}</p>
    </section>
    <section class="panel-section"><div class="section-heading"><h3>${esc(r.brand)} ในข้อมูลที่เลือก</h3><span class="hint">${num(d.presence.pos)} จุดขาย · ${num(d.presence.venues)} สถานที่</span></div>
      ${d.presence.areas.length ? `<p class="subtle">พบใน ${d.presence.areas.map(a => esc(a)).join(' · ')}</p>` : ''}
      ${others.length ? `<ul class="outlet-list">${others.slice(0, 10).map(s => `<li><button type="button" class="brand-row" data-action="select-store" data-id="${esc(s.id)}"><span><strong>${esc(s.venue)}</strong><br><span class="small muted">${esc(s.name || '')} · ${esc(s.province)}</span></span></button></li>`).join('')}</ul>` : '<p class="hint">ไม่มีจุดขายอื่นของแบรนด์นี้ในข้อมูลที่เลือก</p>'}
      <div class="detail-actions"><button type="button" class="btn quiet" data-action="search-brand" data-value="${esc(r.brand)}">กรองเฉพาะแบรนด์นี้</button></div>
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
