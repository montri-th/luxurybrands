/**
 * CityMETER Luxury Brands — exploratory presence charts.
 * Adapted from official amCharts 5 examples (reviewed 2026-10-21):
 * https://www.amcharts.com/demos/bar-chart/
 * https://www.amcharts.com/demos/simple-treemap/
 * https://www.amcharts.com/demos/bubble-chart/
 * API details: https://www.amcharts.com/demos/scatter-chart/
 * https://www.amcharts.com/docs/v5/concepts/accessibility/
 * No example/demo observations are bundled here. All values use the caller's
 * committed, filtered point-of-sale rows; one row is not necessarily one shop.
 */

const roots = new Map();
const FONT = 'Bai Jamjuree';
const NUMBER = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 });
const PERCENT = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 1 });
const INSTRUCTIONS = 'ใช้ปุ่มลูกศรเลือกข้อมูล และกด Enter เพื่อกรอง';

function key(value) { return String(value ?? '').trim(); }
function hash(value) {
  let result = 0;
  for (const character of key(value)) result = ((result * 31) + character.charCodeAt(0)) >>> 0;
  return result;
}
function escapeAmText(value) { return key(value).replaceAll('[', '[['); }
function segmentColor(palette, id) {
  const index = palette.segmentIndex?.get(key(id)) ?? (hash(id) % palette.series.length);
  return palette.series[index];
}

/** Exact CSS data-color pairs; the caller's theme chooses the governed tokens. */
function readPalette(element, am5) {
  const style = getComputedStyle(element);
  const get = (name) => {
    const value = style.getPropertyValue(name).trim();
    if (!value) throw new Error(`Missing chart color token ${name}`);
    return am5.color(value);
  };
  return {
    text: get('--text-primary'),
    metadata: get('--text-metadata'),
    grid: get('--border-hairline'),
    surface: get('--surface-raised'),
    // Neutral label ink preserves categorical fills when a theme's colored
    // series ink does not contrast sufficiently with the same series fill.
    onFill: get('--chart-on-fill'),
    series: Array.from({ length: 8 }, (_, index) => ({
      fill: get(`--series-${index + 1}-fill`),
      ink: get(`--series-${index + 1}-ink`),
    })),
  };
}

function presenceByCenter(rows, centers) {
  const byId = new Map();
  const byVenue = new Map();
  for (const center of centers) {
    if (center.id) byId.set(key(center.id), center);
    if (center.venue) byVenue.set(key(center.venue), center);
    if (center.name) byVenue.set(key(center.name), center);
  }
  const groups = new Map();
  for (const row of rows) {
    const center = byId.get(key(row.mallId));
    // Only count known shopping-center hosts; no guessed mall assignments.
    if (!center) continue;
    const id = key(center.id || center.name);
    if (!groups.has(id)) groups.set(id, {
      id,
      name: key(center.name || center.venue),
      venue: key(center.venue || row.venue || center.name),
      brands: new Set(),
      pos: 0,
      segments: new Map(),
    });
    const group = groups.get(id);
    if (key(row.brand)) group.brands.add(key(row.brand));
    group.pos += 1;
    if (key(row.segment)) group.segments.set(key(row.segment), (group.segments.get(key(row.segment)) || 0) + 1);
  }
  return [...groups.values()].map((center) => ({
    id: center.id,
    name: center.name,
    venue: center.venue,
    brands: center.brands.size,
    pos: center.pos,
    dominantSegment: [...center.segments].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || center.id,
  })).sort((a, b) => b.brands - a.brands || b.pos - a.pos || a.name.localeCompare(b.name));
}

function presenceBySegment(rows, segments) {
  const names = new Map(segments.map((segment) => [key(segment.id), key(segment.name || segment.id)]));
  const groups = new Map();
  for (const row of rows) {
    const id = key(row.segment) || '__unclassified__';
    groups.set(id, (groups.get(id) || 0) + 1);
  }
  return [...groups].map(([id, value]) => ({
    id,
    name: names.get(id) || (id === '__unclassified__' ? 'ยังไม่จัดกลุ่ม' : id),
    value,
    share: rows.length ? value / rows.length * 100 : 0,
  })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

function tooltip(root, palette, am5) {
  const tip = am5.Tooltip.new(root, {
    getFillFromSprite: false,
    getStrokeFromSprite: false,
    autoTextColor: false,
    pointerOrientation: 'horizontal',
    labelText: '{tooltip}',
  });
  tip.get('background').setAll({
    fill: palette.surface,
    fillOpacity: 1,
    stroke: palette.grid,
    strokeOpacity: 1,
    cornerRadius: 5,
  });
  tip.label.setAll({ fontFamily: FONT, fontSize: 12, fill: palette.text, maxWidth: 280, oversizedBehavior: 'wrap' });
  return tip;
}

function styleRenderer(renderer, palette, axis, am5) {
  renderer.grid.template.setAll({ stroke: palette.grid, strokeOpacity: 1 });
  renderer.labels.template.setAll({
    fontFamily: FONT,
    fontSize: 12,
    fill: axis === 'category' ? palette.text : palette.metadata,
    paddingTop: 5,
    paddingBottom: 5,
  });
  renderer.ticks.template.set('visible', false);
}

function setEmpty(element, message) {
  const paragraph = document.createElement('p');
  paragraph.className = 'chart-empty';
  paragraph.textContent = message;
  paragraph.style.cssText = 'font-family:"Bai Jamjuree",sans-serif;font-size:12px;color:var(--text-metadata);padding:24px;text-align:center;';
  element.replaceChildren(paragraph);
  return () => { if (paragraph.parentNode === element) paragraph.remove(); };
}

function renderBars(root, element, rows, centers, palette, onSelect, am5, am5xy) {
  const allData = presenceByCenter(rows, centers);
  const limit = Math.max(4, Math.min(12, Math.floor((element.clientHeight - 45) / 24) || 8));
  const data = allData.slice(0, limit).map((center) => ({
    ...center,
    category: escapeAmText(center.name),
    tooltip: `${escapeAmText(center.name)}\n${NUMBER.format(center.brands)} แบรนด์ไม่ซ้ำ · ${NUMBER.format(center.pos)} แถวจุดขาย\nกดเพื่อกรองศูนย์การค้านี้`,
    columnSettings: { fill: palette.series[0].fill },
  }));
  if (!data.length) return false;
  element.setAttribute('aria-label', `ศูนย์การค้า ${data.length} จาก ${allData.length} แห่ง เรียงตามจำนวนแบรนด์ไม่ซ้ำในรายการที่เลือก`);
  const chart = root.container.children.push(am5xy.XYChart.new(root, {
    panX: false, panY: false, wheelX: 'none', wheelY: 'none',
    paddingLeft: 0, paddingRight: 30, paddingTop: 4, paddingBottom: 0,
    focusable: true,
    ariaLabel: `ศูนย์การค้า ${data.length} จาก ${allData.length} แห่ง เรียงตามจำนวนแบรนด์ไม่ซ้ำ หน่วยแบรนด์`,
  }));
  const yRenderer = am5xy.AxisRendererY.new(root, { inversed: true, minGridDistance: 20, cellStartLocation: 0.13, cellEndLocation: 0.87 });
  styleRenderer(yRenderer, palette, 'category', am5);
  yRenderer.grid.template.set('visible', false);
  yRenderer.labels.template.setAll({ maxWidth: Math.max(95, Math.min(180, element.clientWidth * 0.31)), oversizedBehavior: 'truncate', ellipsis: '…', textAlign: 'right' });
  const yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'category', renderer: yRenderer }));
  const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 45 });
  styleRenderer(xRenderer, palette, 'value', am5);
  const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { min: 0, maxPrecision: 0, extraMax: 0.08, numberFormat: '#,###', renderer: xRenderer }));
  const series = chart.series.push(am5xy.ColumnSeries.new(root, {
    name: 'แบรนด์ไม่ซ้ำ', xAxis, yAxis, valueXField: 'brands', categoryYField: 'category',
    tooltip: tooltip(root, palette, am5),
    interpolationDuration: 0,
  }));
  series.columns.template.setAll({
    templateField: 'columnSettings',
    fill: palette.series[0].fill,
    fillOpacity: 1,
    stroke: palette.grid,
    strokeOpacity: 1,
    strokeWidth: 1,
    cornerRadiusTR: 3, cornerRadiusBR: 3,
    tooltipText: '{tooltip}', cursorOverStyle: 'pointer',
    focusable: true, hoverOnFocus: true, role: 'button', focusableGroup: 'luxury-center-bars',
    ariaLabel: `{categoryY}: {brands} แบรนด์ไม่ซ้ำ และ {pos} แถวจุดขาย ${INSTRUCTIONS}`,
  });
  series.columns.template.events.on('click', (event) => {
    const row = event.target.dataItem?.dataContext;
    if (row) onSelect({ type: 'venue', value: row.venue, mallId: row.id });
  });
  series.bullets.push(() => am5.Bullet.new(root, {
    locationX: 1,
    sprite: am5.Label.new(root, { text: '{valueX}', populateText: true, centerY: am5.p50, dx: 3, fontFamily: FONT, fontSize: 12, fill: palette.text }),
  }));
  yAxis.data.setAll(data);
  series.data.setAll(data);
  return true;
}

function renderTreemap(root, rows, segments, palette, onSelect, am5, am5hierarchy) {
  const data = presenceBySegment(rows, segments).map((segment) => ({
    ...segment,
    name: escapeAmText(segment.name),
    shareLabel: `${PERCENT.format(segment.share)}%`,
    countLabel: `${NUMBER.format(segment.value)} แถว`,
    tooltip: `${escapeAmText(segment.name)}\n${NUMBER.format(segment.value)} แถวจุดขาย · ${PERCENT.format(segment.share)}% ของ ${NUMBER.format(rows.length)} แถวที่เลือก\nกดเพื่อกรองกลุ่มนี้`,
    rectangleSettings: { fill: segmentColor(palette, segment.id).fill },
    labelSettings: { fill: palette.onFill },
  }));
  if (!data.length) return false;
  const series = root.container.children.push(am5hierarchy.Treemap.new(root, {
    singleBranchOnly: false,
    downDepth: 1,
    upDepth: -1,
    initialDepth: 1,
    valueField: 'value', categoryField: 'name', childDataField: 'children',
    nodePaddingOuter: 0, nodePaddingInner: 4,
    sort: 'descending',
    interpolationDuration: 0,
    ariaLabel: 'สัดส่วนแถวจุดขายตามกลุ่มแบรนด์ ขนาดพื้นที่แทนจำนวนแถวจุดขาย',
  }));
  series.rectangles.template.setAll({ templateField: 'rectangleSettings', stroke: palette.grid, strokeWidth: 1, strokeOpacity: 1, fillOpacity: 1, cornerRadiusTL: 4, cornerRadiusTR: 4, cornerRadiusBL: 4, cornerRadiusBR: 4 });
  series.get('colors').setAll({ colors: palette.series.map((color) => color.fill), step: 1 });
  // Hierarchy can assign its own colors after template fields in 5.20.x.
  // A documented adapter keeps every leaf on the exact categorical token.
  series.rectangles.template.adapters.add('fill', (fill, target) => target.dataItem?.dataContext?.rectangleSettings?.fill || fill);
  series.labels.template.adapters.add('fill', () => palette.onFill);
  series.labels.template.setAll({
    templateField: 'labelSettings',
    text: '{name}\n{countLabel} · {shareLabel}',
    fontFamily: FONT, fontSize: 12, textAlign: 'center', oversizedBehavior: 'hide',
    paddingLeft: 5, paddingRight: 5, paddingTop: 4, paddingBottom: 4,
    fill: palette.text,
  });
  series.nodes.template.setAll({
    tooltipText: '{tooltip}', tooltip: tooltip(root, palette, am5),
    cursorOverStyle: 'pointer', toggleKey: 'none',
    focusable: true, isMeasured: true, hoverOnFocus: true, role: 'button',
    focusableGroup: 'luxury-segment-nodes',
    ariaLabel: `{name}: {value} แถวจุดขาย คิดเป็น {shareLabel} ${INSTRUCTIONS}`,
  });
  series.nodes.template.events.on('click', (event) => {
    const row = event.target.dataItem?.dataContext;
    if (row?.id) onSelect({ type: 'segment', value: row.id });
  });
  series.data.setAll([{ name: 'แถวจุดขายที่เลือก', children: data }]);
  series.set('selectedDataItem', series.dataItems[0]);
  return true;
}

function renderScatter(root, rows, centers, palette, onSelect, am5, am5xy) {
  const data = presenceByCenter(rows, centers).map((center) => ({
    ...center,
    tooltip: `${escapeAmText(center.name)}\nแกนนอน ${NUMBER.format(center.brands)} แบรนด์ไม่ซ้ำ\nแกนตั้ง ${NUMBER.format(center.pos)} แถวจุดขาย\nกดเพื่อกรองศูนย์การค้านี้`,
    color: palette.series[0].fill,
  }));
  if (!data.length) return false;
  const chart = root.container.children.push(am5xy.XYChart.new(root, {
    panX: false, panY: false, wheelX: 'none', wheelY: 'none',
    paddingTop: 8, paddingLeft: 0, paddingRight: 12, paddingBottom: 0,
    focusable: true,
    ariaLabel: `เปรียบเทียบศูนย์การค้า ${data.length} แห่ง แกนนอนจำนวนแบรนด์ไม่ซ้ำ แกนตั้งจำนวนแถวจุดขาย จุดที่มีค่าเท่ากันอาจซ้อนกัน ใช้ปุ่มลูกศรหรือดูตารางเพื่อเลือกรายศูนย์`,
  }));
  const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 45 });
  const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 35 });
  styleRenderer(xRenderer, palette, 'value', am5);
  styleRenderer(yRenderer, palette, 'value', am5);
  const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: xRenderer, min: 0, maxPrecision: 0, extraMax: 0.15, numberFormat: '#,###' }));
  const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: yRenderer, min: 0, maxPrecision: 0, extraMax: 0.15, numberFormat: '#,###' }));
  xAxis.children.push(am5.Label.new(root, { text: 'แบรนด์ไม่ซ้ำ (แบรนด์)', x: am5.p50, centerX: am5.p50, fontFamily: FONT, fontSize: 12, fill: palette.metadata, paddingTop: 3 }));
  yAxis.children.unshift(am5.Label.new(root, { text: 'แถวจุดขาย (แถว)', rotation: -90, y: am5.p50, centerX: am5.p50, fontFamily: FONT, fontSize: 12, fill: palette.metadata, paddingBottom: 3 }));
  const series = chart.series.push(am5xy.LineSeries.new(root, { xAxis, yAxis, valueXField: 'brands', valueYField: 'pos', tooltip: tooltip(root, palette, am5), interpolationDuration: 0 }));
  series.strokes.template.set('visible', false);
  series.bullets.push((_root, _series, dataItem) => {
    const row = dataItem.dataContext;
    const circle = am5.Circle.new(root, {
      radius: 6, fill: row.color, fillOpacity: 1, stroke: palette.grid, strokeOpacity: 1, strokeWidth: 1.5,
      tooltipText: '{tooltip}', cursorOverStyle: 'pointer',
      focusable: true, isMeasured: true, hoverOnFocus: true, role: 'button',
      focusableGroup: 'luxury-center-points',
      ariaLabel: `${escapeAmText(row.name)}: ${row.brands} แบรนด์ไม่ซ้ำ และ ${row.pos} แถวจุดขาย ${INSTRUCTIONS}`,
    });
    circle.events.on('click', () => onSelect({ type: 'venue', value: row.venue, mallId: row.id }));
    return am5.Bullet.new(root, { sprite: circle });
  });
  series.data.setAll(data);
  return true;
}

/**
 * Render one view and return its idempotent disposer. Re-rendering the same
 * element disposes its old root, preventing duplicate canvases and listeners.
 * onSelect receives {type:'venue', value, mallId} or {type:'segment', value}.
 * The parent owns filters, scope descriptions and the equivalent data table.
 */
export function renderInsightChart({ elementId, view = 'centers', rows = [], centers = [], segments = [], theme } = {}, onSelect = () => {}) {
  roots.get(elementId)?.();
  const element = document.getElementById(elementId);
  if (!element) return () => {};
  element.replaceChildren();
  const am5 = globalThis.am5;
  const am5xy = globalThis.am5xy;
  const am5hierarchy = globalThis.am5hierarchy;
  if (!am5 || !am5xy || (view === 'mix' && !am5hierarchy)) {
    const cleanup = setEmpty(element, 'กราฟยังโหลดไม่สำเร็จ โปรดดูข้อมูลเดียวกันในตาราง');
    roots.set(elementId, cleanup);
    return cleanup;
  }
  if (!rows.length) {
    const cleanup = setEmpty(element, 'ไม่พบแถวจุดขายตามตัวกรองนี้');
    roots.set(elementId, cleanup);
    return cleanup;
  }
  const label = view === 'mix' ? 'สัดส่วนจุดขายตามกลุ่มแบรนด์' : view === 'compare' ? 'เปรียบเทียบแบรนด์และจุดขายในศูนย์การค้า' : 'ศูนย์การค้าเรียงตามจำนวนแบรนด์ไม่ซ้ำ';
  element.setAttribute('aria-label', label);
  if (theme) element.dataset.chartTheme = theme;
  const root = am5.Root.new(elementId, { focusable: true, ariaLabel: label, role: 'document', focusPadding: 2 });
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    root.dispose();
    if (roots.get(elementId) === dispose) roots.delete(elementId);
  };
  roots.set(elementId, dispose);
  try {
    const palette = readPalette(element, am5);
    palette.segmentIndex = new Map(segments.map((segment, index) => [key(segment.id), index % 8]));
    const themeRules = am5.Theme.new(root);
    themeRules.rule('Label').setAll({ fontFamily: FONT, fontSize: 12, fill: palette.text });
    // This chart family uses no transition animation, including reduced motion.
    themeRules.rule('Sprite').setAll({ stateAnimationDuration: 0 });
    root.setThemes([themeRules]);
    root.interfaceColors.setAll({ text: palette.text, alternativeText: palette.metadata, grid: palette.grid });
    root.numberFormatter.set('numberFormat', '#,###');
    const select = typeof onSelect === 'function' ? onSelect : () => {};
    const populated = view === 'mix'
      ? renderTreemap(root, rows, segments, palette, select, am5, am5hierarchy)
      : view === 'compare'
        ? renderScatter(root, rows, centers, palette, select, am5, am5xy)
        : renderBars(root, element, rows, centers, palette, select, am5, am5xy);
    if (!populated) {
      dispose();
      const cleanup = setEmpty(element, 'ยังไม่มีศูนย์การค้าที่จับคู่ได้ในรายการที่เลือก ดูร้านนอกศูนย์การค้าได้ในแผนที่และตาราง');
      roots.set(elementId, cleanup);
      return cleanup;
    }
  } catch (error) {
    dispose();
    console.error('CityMETER insight chart could not render:', error);
    const cleanup = setEmpty(element, 'แสดงกราฟไม่ได้ในขณะนี้ โปรดดูข้อมูลเดียวกันในตาราง');
    roots.set(elementId, cleanup);
    return cleanup;
  }
  return dispose;
}
