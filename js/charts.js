/**
 * Neighborhood charts rendered as plain HTML/SVG — no chart vendor.
 *
 * Three views share one model (chart-model.js) and the committed selection:
 *  - ranking  (view key `centers`, kept for URL compatibility): distinct brands per area
 *  - mix      : area × segment matrix of distinct brands (numeric heat table)
 *  - compare  : exclusive vs shared brands per area, stacked bars
 *
 * Colour: ranking bars and matrix cells use the LDS `count` family (same HEX on
 * both themes, see scales.js) so the chart reads with the map legend. Compare
 * uses two categorical series with their non-colour cues. Every mark is a real
 * <button>, so keyboard and screen-reader users get the same actions as pointer
 * users. Every click emits {type:'neighborhood', id}; the empty compare state
 * emits {type:'resetAreas'}.
 */
import {buildNeighborhoodChartModel, neighborhoodMatrix} from './chart-model.js';
import {buildCountClasses, classify} from './scales.js';
import {SEGMENT_SHORT} from './model.js';

const NUMBER = new Intl.NumberFormat('th-TH', {maximumFractionDigits: 0});
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const num = n => NUMBER.format(n);

const CUES = {
  hexagon: '<svg viewBox="0 0 12 12" aria-hidden="true"><polygon points="6,1 10.5,3.5 10.5,8.5 6,11 1.5,8.5 1.5,3.5"/></svg>',
  dash: '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="1" y="5" width="10" height="2.4" rx="1"/></svg>',
};

function empty(element, message, actionLabel, action) {
  element.innerHTML = `<div class="chart-empty"><p>${esc(message)}</p>${action ? `<button type="button" class="chart-empty-action">${esc(actionLabel)}</button>` : ''}</div>`;
  if (action) element.querySelector('.chart-empty-action').addEventListener('click', action);
}

function ranking(element, model, select, selectedId) {
  const classes = buildCountClasses(model.areas.map(a => a.brands));
  const max = Math.max(1, ...model.areas.map(a => a.brands));
  const rows = model.areas.map((a, i) => {
    const cls = classify(a.brands, classes);
    const pressed = a.id === selectedId;
    return `<li><button type="button" class="bar-row${pressed ? ' is-selected' : ''}" data-area="${esc(a.id)}" aria-pressed="${pressed}"
      aria-label="อันดับ ${i + 1} ${esc(a.name)}: ${num(a.brands)} แบรนด์, ${num(a.pos)} สาขา กดเพื่อดูย่านนี้">
      <span class="bar-rank data-number" aria-hidden="true">${i + 1}</span>
      <span class="bar-label">${esc(a.name)}</span>
      <span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:${Math.max(2, Math.round((a.brands / max) * 100))}%;background:${cls.fill}"></span></span>
      <span class="bar-value" aria-hidden="true"><b class="data-number">${num(a.brands)}</b><small>${num(a.pos)} สาขา</small></span>
    </button></li>`;
  }).join('');
  element.innerHTML = `<p class="chart-caption">${num(model.areaCount)} ย่าน · จำนวนแบรนด์ · สีเดียวกับแผนที่</p><ol class="chart-bars">${rows}</ol>`;
  element.querySelectorAll('[data-area]').forEach(b => b.addEventListener('click', () => select({type: 'neighborhood', id: b.dataset.area})));
}

function matrix(element, model, select, selectedId) {
  const m = neighborhoodMatrix(model, {areaLimit: 12, segmentLimit: 8});
  const classes = buildCountClasses(m.cells.map(c => c.brands));
  const head = m.segments.map(s => `<th scope="col" title="${esc(s.name)}"><span class="matrix-col"><i class="category-swatch category-${segmentIndex(s.id)}" aria-hidden="true"></i>${esc(SEGMENT_SHORT[s.id] || s.name)}</span></th>`).join('');
  const body = m.areas.map(a => {
    const pressed = a.id === selectedId;
    const cells = m.segments.map(s => {
      const cell = m.cells.find(c => c.areaId === a.id && c.segmentId === s.id);
      const brands = cell?.brands || 0, pos = cell?.pos || 0;
      const cls = classify(brands, classes);
      const style = cls.state === 'measured_zero'
        ? `background:${cls.fill};color:${cls.ink};box-shadow:inset 0 0 0 2px ${cls.outline}`
        : `background:${cls.fill};color:${cls.ink}`;
      return `<td><button type="button" class="matrix-cell is-${cls.state}" data-area="${esc(a.id)}" style="${style}"
        aria-label="${esc(a.name)} × ${esc(s.name)}: ${num(brands)} แบรนด์, ${num(pos)} สาขา กดเพื่อดูย่านนี้"
        title="${esc(a.name)} × ${esc(s.name)} — ${num(brands)} แบรนด์ · ${num(pos)} สาขา"><span class="data-number">${num(brands)}</span></button></td>`;
    }).join('');
    return `<tr${pressed ? ' class="is-selected"' : ''}><th scope="row"><button type="button" class="matrix-row" data-area="${esc(a.id)}" aria-pressed="${pressed}">${esc(a.name)}<small class="data-number">${num(a.brands)}</small></button></th>${cells}</tr>`;
  }).join('');
  const legend = classes.classes.map(c => `<span class="legend-step"><i style="background:${c.fill}" aria-hidden="true"></i>${esc(c.label)}</span>`).join('');
  // Every cell is the same size on purpose: only the tint and the number carry meaning.
  const columns = `<colgroup><col class="matrix-head-col">${m.segments.map(() => '<col class="matrix-cell-col">').join('')}</colgroup>`;
  element.innerHTML = `<p class="chart-caption">${num(m.areas.length)}/${num(m.totalAreas)} ย่าน × ${num(m.segments.length)}/${num(m.totalSegments)} กลุ่ม · ตัวเลข = แบรนด์ · สีเข้ม = มากกว่า</p>
    <div class="matrix-scroll"><table class="matrix" style="--matrix-columns:${m.segments.length}">${columns}<thead><tr><th scope="col" class="matrix-corner">ย่าน · แบรนด์</th>${head}</tr></thead><tbody>${body}</tbody></table></div>
    <p class="chart-legend"><span class="legend-title">ระดับสี (แบรนด์ในช่อง, ${num(classes.classCount)} ระดับเท่าช่วง):</span>${legend}<span class="legend-step"><i class="legend-zero" aria-hidden="true"></i>0 = ไม่พบ</span></p>`;
  element.querySelectorAll('[data-area]').forEach(b => b.addEventListener('click', () => select({type: 'neighborhood', id: b.dataset.area})));
}

function compare(element, model, select, selectedId) {
  const max = Math.max(1, ...model.areas.map(a => a.brands));
  const rows = model.areas.map(a => {
    const pressed = a.id === selectedId;
    const ex = Math.round((a.exclusiveBrands / max) * 100), sh = Math.round((a.sharedBrands / max) * 100);
    return `<li><button type="button" class="bar-row stacked${pressed ? ' is-selected' : ''}" data-area="${esc(a.id)}" aria-pressed="${pressed}"
      aria-label="${esc(a.name)}: เฉพาะย่านนี้ ${num(a.exclusiveBrands)} แบรนด์, พบในย่านอื่นด้วย ${num(a.sharedBrands)} แบรนด์ จากทั้งหมด ${num(a.brands)} แบรนด์ กดเพื่อดูย่านนี้">
      <span class="bar-label">${esc(a.name)}</span>
      <span class="bar-track" aria-hidden="true">
        <span class="bar-fill seg-exclusive" style="width:${ex}%">${a.exclusiveBrands ? `<span>${num(a.exclusiveBrands)}</span>` : ''}</span><span class="bar-fill seg-shared" style="width:${sh}%">${a.sharedBrands ? `<span>${num(a.sharedBrands)}</span>` : ''}</span>
      </span>
      <span class="bar-value" aria-hidden="true"><b class="data-number">${num(a.brands)}</b><small>แบรนด์</small></span>
    </button></li>`;
  }).join('');
  element.innerHTML = `<p class="chart-caption">${num(model.areaCount)} ย่าน · จำนวนแบรนด์</p>
    <p class="chart-legend"><span class="legend-item"><i class="cue seg-exclusive">${CUES.hexagon}</i>เฉพาะย่านนี้</span><span class="legend-item"><i class="cue seg-shared">${CUES.dash}</i>พบในย่านอื่นด้วย</span></p>
    <ol class="chart-bars">${rows}</ol>`;
  element.querySelectorAll('[data-area]').forEach(b => b.addEventListener('click', () => select({type: 'neighborhood', id: b.dataset.area})));
}

const SEGMENT_ORDER = ['luxury_designer', 'fine_jewelry', 'watches', 'upscale_streetwear', 'thai_designer', 'curated_retailer', 'beauty_fragrance', 'premium_extension'];
const segmentIndex = id => Math.max(0, SEGMENT_ORDER.indexOf(id) + 1);

/**
 * Render one view into #elementId. Returns an idempotent disposer.
 * `view` accepts `centers` (ranking), `mix` and `compare`.
 */
export function renderInsightChart({elementId, view = 'centers', rows = [], segments = [], neighborhoods, theme, selectedAreaId = ''} = {}, onSelect = () => {}) {
  const element = document.getElementById(elementId);
  if (!element) return () => {};
  const select = typeof onSelect === 'function' ? onSelect : () => {};
  element.replaceChildren();
  if (theme) element.dataset.chartTheme = theme;
  const labels = {centers: 'ย่านเรียงตามจำนวนแบรนด์', mix: 'กลุ่มแบรนด์ในแต่ละย่าน', compare: 'แบรนด์เฉพาะย่านและแบรนด์ที่พบร่วมกัน'};
  element.setAttribute('aria-label', labels[view] || labels.centers);
  if (!Array.isArray(rows) || !rows.length) { empty(element, 'ไม่พบสาขาตามตัวกรอง'); return () => element.replaceChildren(); }
  const model = buildNeighborhoodChartModel(rows, neighborhoods, segments);
  if (view === 'compare' && model.areaCount < 2) { empty(element, 'เลือกอย่างน้อย 2 ย่านเพื่อเปรียบเทียบ', 'ดูทุกย่าน', () => select({type: 'resetAreas'})); return () => element.replaceChildren(); }
  if (!model.areaCount) { empty(element, 'ไม่มีย่านในตัวกรองนี้'); return () => element.replaceChildren(); }
  try {
    if (view === 'mix') matrix(element, model, select, selectedAreaId);
    else if (view === 'compare') compare(element, model, select, selectedAreaId);
    else ranking(element, model, select, selectedAreaId);
  } catch (error) {
    console.error('CityMETER insight chart could not render:', error);
    empty(element, 'แสดงกราฟไม่ได้ในขณะนี้ โปรดดูข้อมูลเดียวกันในตาราง');
  }
  return () => element.replaceChildren();
}
