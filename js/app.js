/**
 * CityMETER · Luxury Brands — application orchestration.
 *
 * One committed selection drives everything. Three row scopes exist and are
 * named consistently throughout:
 *   scopeRows — rows after search/cohort/segment/province/channel/venue filters,
 *               BEFORE any neighborhood selection or area focus. This is the
 *               comparison base for the Aha, the choropleth and the charts.
 *   baseRows  — scopeRows narrowed by the selected neighborhood (if any).
 *   rows      — baseRows narrowed by the "explore top 3" area focus (if any).
 *               Pins, counters, the table and the panel counts use `rows`.
 *
 * Focus + context on the map: detail (data fills, category pins, logos, host
 * buildings) is drawn only for the focused part — the selected neighborhood,
 * the explored areas, or everything when nothing is selected. The rest of the
 * filtered scope stays visible but quiet: outline-only areas and tiny context
 * dots, so the eye lands on what was chosen.
 *
 * Panel modes: overview | neighborhood | venue | store (with a back stack).
 * URL state: filters, areas, view, store, place — restored on load.
 * Resilience: core data first; the map (MapLibre, CDN) and optional datasets
 * are independent and retryable; charts are vendor-free.
 */
import {SEGMENTS, CHANNELS, COHORTS, filterRows, summarize, hasPoint, isClosed} from './model.js';
import {summarizeAreaInsight, filterAreaRows} from './area-insight.js';
import {renderInsightChart} from './charts.js';
import {loadMapLibrary} from './vendors.js';
import {installStorePins} from './pins.js';
import {installVenueBuildings} from './buildings.js';
import {assignNeighborhood} from './neighborhoods.js';
import {configureBrandLogos, brandLogoMarkup} from './brand-logos.js';
import {installNeighborhoodLayers, installNeighborhoodLabels, buildAreaModel, featureBounds} from './map-layers.js';
import {buildOverviewInsights, buildNeighborhoodProfile, buildStoreDetail, buildVenueProfile, describeStatus, rankVenues} from './profile-model.js';
import {renderOverview, renderNeighborhood, renderVenue, renderStore, renderFilterChips, statusPill, link, esc, num} from './panel.js';

const $ = id => document.getElementById(id);
const FIELDS = ['search', 'cohort', 'segment', 'province', 'channel', 'venue', 'neighborhood'];
const STYLES = {light: 'https://tiles.openfreemap.org/styles/positron', dark: 'https://tiles.openfreemap.org/styles/dark'};
const BANGKOK = {center: [100.548, 13.738], zoom: 12.6};
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobilePortrait = () => matchMedia('(max-width: 760px) and (orientation: portrait)').matches;
const SEGMENT_LIST = Object.entries(SEGMENTS).map(([id, name]) => ({id, name}));

const state = {
  data: null, neighborhoods: null, buildingData: null,
  scopeRows: [], baseRows: [], rows: [],
  view: 'centers', page: 0,
  focusAreaIds: [], selectedId: '',
  panel: {mode: 'overview', id: '', venue: ''}, history: [],
  map: null, loaded: false, mapTheme: '', popup: null, initialCameraDone: false,
  showCenters: true, showNeighborhoods: true,
  pins: null, buildings: null, areaLayers: null, labels: null, areaModel: null,
};

/* ---------- helpers ---------- */
const values = () => Object.fromEntries(FIELDS.map(k => [k, $(k).value]));
const areaKey = f => (f ? f.id || f.properties.id : '');
const selectedNeighborhood = () => state.neighborhoods.features.find(f => areaKey(f) === $('neighborhood').value) || null;
const areaById = id => state.neighborhoods.features.find(f => areaKey(f) === id) || null;
const rowById = id => state.data.rows.find(r => r.id === id) || null;
const bottomSpace = () => $('insights').getBoundingClientRect().height + 12;
const activeFilterCount = f => FIELDS.filter(k => f[k] && !(k === 'cohort' && f[k] === 'refresh')).length;
const overviewPanel = () => ({mode: 'overview', id: '', venue: ''});
/** On a phone the bottom sheet covers the lower map, so targets are lifted into the visible strip. */
const sheetOffset = () => (mobilePortrait() ? [0, -Math.round(window.innerHeight * 0.2)] : [0, 0]);
const announce = text => { $('announcement').textContent = text; };

function saveURL() {
  const f = values(), p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v && v !== ({cohort: 'refresh'}[k] || '')) p.set(k, v);
  if (state.focusAreaIds.length) p.set('areas', state.focusAreaIds.join(','));
  if (state.view !== 'centers') p.set('view', state.view);
  if (state.panel.mode === 'store' && state.panel.id) p.set('store', state.panel.id);
  if (state.panel.mode === 'venue' && state.panel.id) p.set('place', state.panel.id);
  history.replaceState(null, '', location.pathname + (p.size ? '?' + p : ''));
}

/* ---------- theme ---------- */
function applyTheme() {
  const value = $('theme').value;
  const theme = value === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : value;
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('citymeter-luxury-theme', value); } catch {}
  if (state.map && theme !== state.mapTheme) {
    state.loaded = false;
    state.buildings?.dispose(); state.buildings = null;
    state.areaLayers = null;
    state.mapTheme = theme;
    state.map.setStyle(STYLES[theme], {diff: false});
  }
  if (state.data) drawChart();
}

/* ---------- selection ---------- */
function update({fit = false} = {}) {
  const f = values(), feature = selectedNeighborhood();
  state.scopeRows = filterRows(state.data.rows, {...f, neighborhoodIds: null});
  state.baseRows = feature ? state.scopeRows.filter(r => assignNeighborhood(r, state.neighborhoods) === feature) : state.scopeRows;
  state.rows = state.focusAreaIds.length ? filterAreaRows(state.baseRows, state.neighborhoods, new Set(state.focusAreaIds)) : state.baseRows;
  state.page = 0;
  state.areaModel = buildAreaModel(state.scopeRows, state.neighborhoods);
  const s = summarize(state.rows, state.data.centers);

  // Keep the panel honest: drop a store/venue that left the filtered scope.
  const fallback = () => (feature ? {mode: 'neighborhood', id: areaKey(feature), venue: ''} : overviewPanel());
  if (state.panel.mode === 'store' && !state.scopeRows.some(r => r.id === state.panel.id)) { state.panel = fallback(); state.history = []; }
  if (state.panel.mode === 'venue' && !state.scopeRows.some(r => (state.panel.id && r.mallId === state.panel.id) || (!state.panel.id && r.venue === state.panel.venue))) { state.panel = fallback(); state.history = []; }
  if (state.panel.mode === 'neighborhood' && !feature) state.panel = overviewPanel();
  if (feature && state.panel.mode === 'overview') state.panel = {mode: 'neighborhood', id: areaKey(feature), venue: ''};
  if (state.panel.mode !== 'store') { state.selectedId = ''; state.pins?.select(''); state.popup?.remove(); state.popup = null; }
  else state.selectedId = state.panel.id;

  $('result-count').textContent = num(s.pos);
  $('filter-count').textContent = activeFilterCount(f) ? String(activeFilterCount(f)) : '';
  $('filter-chips').innerHTML = renderFilterChips(f, {cohort: COHORTS, channel: CHANNELS, neighborhood: Object.fromEntries(state.neighborhoods.features.map(a => [areaKey(a), a.properties.name]))});
  renderPanel(s);
  renderLegend();
  updatePins();
  if (state.loaded) { updateSpatialLayers(); if (fit) fitMap(); }
  drawChart();
  renderTable();
  saveURL();
  announce(`พบ ${num(s.pos)} รายการ ${num(s.brands)} แบรนด์ มีพิกัด ${num(s.mapped)} รายการ`);
}

/** Focused rows get full detail; the rest of the scope becomes quiet context dots. */
function updatePins() {
  if (!state.pins) return;
  const focused = [...state.rows];
  const selected = state.selectedId ? rowById(state.selectedId) : null;
  if (selected && !focused.some(r => r.id === selected.id)) focused.push(selected);
  const focusIds = new Set(focused.map(r => r.id));
  state.pins.update(focused, {contextRows: state.scopeRows.filter(r => !focusIds.has(r.id))});
  if (state.selectedId) state.pins.select(state.selectedId);
}

/* ---------- panel ---------- */
function renderPanel(summary = summarize(state.rows, state.data.centers)) {
  const view = $('panel-view');
  const mode = state.panel.mode;
  let html = '';
  if (mode === 'neighborhood') html = renderNeighborhood(buildNeighborhoodProfile(state.scopeRows, areaById(state.panel.id), state.neighborhoods, state.data.centers, SEGMENT_LIST));
  else if (mode === 'venue') html = renderVenue(buildVenueProfile(state.scopeRows, {mallId: state.panel.id, venue: state.panel.venue, centers: state.data.centers, geojson: state.neighborhoods}));
  else if (mode === 'store') html = renderStore(buildStoreDetail(rowById(state.panel.id), {rows: state.scopeRows, geojson: state.neighborhoods, centers: state.data.centers}));
  if (!html) {
    const insight = summarizeAreaInsight(state.focusAreaIds.length ? state.rows : state.baseRows, state.neighborhoods);
    const overview = buildOverviewInsights(state.baseRows, state.neighborhoods, SEGMENT_LIST);
    html = renderOverview({insight, overview, summary, focused: state.focusAreaIds.length > 0, areaModel: state.areaModel, asOf: state.data.meta?.asOf || '', venues: overview.areaCount ? [] : rankVenues(state.rows, state.data.centers)});
    renderMapAha(insight);
  } else {
    $('map-aha').hidden = true;
  }
  view.innerHTML = html;
  view.dataset.mode = mode;
  const key = `${mode}:${state.panel.id}:${state.panel.venue}`;
  if (key !== renderPanel.lastKey) $('panel').scrollTop = 0;
  renderPanel.lastKey = key;
}

function renderMapAha(insight) {
  const el = $('map-aha');
  if (!insight.areas.length) { el.hidden = true; return; }
  const focused = state.focusAreaIds.length > 0;
  el.hidden = $('panel').classList.contains('is-open');
  el.innerHTML = focused
    ? `<div><h2>กำลังสำรวจ ${num(insight.areas.length)} ย่าน</h2><p>${num(insight.brands)} แบรนด์ · ${num(insight.pos)} จุดขาย</p></div><button type="button" class="btn" data-action="clear-focus">ดูทุกย่าน</button>`
    : `<div><h2>${num(Math.round(insight.share))}% ของแบรนด์อยู่ใน ${num(insight.areas.length)} ย่าน</h2><p>${insight.areas.map(a => esc(a.name)).join(' · ')}</p></div><button type="button" class="btn primary" data-action="explore-top">สำรวจ</button>`;
}

function pushHistory() { state.history.push({...state.panel}); if (state.history.length > 20) state.history.shift(); }

function goBack() {
  const previous = state.history.pop();
  const leavingArea = state.panel.mode === 'neighborhood';
  if (!previous || previous.mode === 'overview') {
    $('neighborhood').value = '';
    state.panel = overviewPanel();
    update({fit: leavingArea});
    return;
  }
  if (previous.mode === 'neighborhood') $('neighborhood').value = previous.id;
  else if (leavingArea) $('neighborhood').value = '';
  state.panel = previous;
  update();
}

function selectNeighborhood(id, {fromMap = false} = {}) {
  const feature = areaById(id);
  if (!feature) return;
  if (state.panel.mode !== 'neighborhood' || state.panel.id !== id) pushHistory();
  $('neighborhood').value = id;
  state.focusAreaIds = [];
  state.panel = {mode: 'neighborhood', id, venue: ''};
  update();
  if (!fromMap) openMobilePanel();
  if (state.loaded) {
    // Pitch only on wide screens: a pitched fit is approximate and the phone sheet needs an exact frame.
    state.map.jumpTo({pitch: state.showCenters && !mobilePortrait() ? 50 : 0});
    state.map.fitBounds(featureBounds(feature, maplibregl.LngLatBounds), {padding: cameraPadding(), maxZoom: 16, duration: reduced() ? 0 : 650});
  }
}

function selectStore(id, {fly = true, showPopup = false, fromPin = false} = {}) {
  const r = rowById(id);
  if (!r) return;
  if (state.panel.mode !== 'store') pushHistory();
  state.panel = {mode: 'store', id, venue: ''};
  state.selectedId = id;
  state.pins?.select(id);
  renderPanel();
  saveURL();
  if (hasPoint(r) && state.loaded) {
    if (fly) state.map.flyTo({center: [r.longitude, r.latitude], zoom: Math.max(state.map.getZoom(), 16), pitch: state.showCenters ? 50 : 0, offset: sheetOffset(), duration: reduced() ? 0 : 650});
    state.popup?.remove(); state.popup = null;
    if (showPopup && !mobilePortrait()) {
      const wrap = document.createElement('div'), h = document.createElement('h3'), p = document.createElement('p');
      wrap.innerHTML = brandLogoMarkup(r.brand, {className: 'popup-logo'});
      h.textContent = r.brand;
      p.textContent = `${r.name || r.venue}${isClosed(r) ? ' · ปิดถาวร' : ''}`;
      wrap.append(h, p);
      state.popup = new maplibregl.Popup({maxWidth: '280px', offset: 14, closeButton: true}).setLngLat([r.longitude, r.latitude]).setDOMContent(wrap).addTo(state.map);
    }
  }
  if (!fromPin || mobilePortrait()) openMobilePanel();
  announce(`เลือก ${r.brand} ${r.name || r.venue}`);
}

function selectVenue(mallId, venue) {
  pushHistory();
  state.panel = {mode: 'venue', id: mallId || '', venue: venue || ''};
  state.selectedId = '';
  state.pins?.select('');
  renderPanel();
  saveURL();
  const profile = buildVenueProfile(state.scopeRows, {mallId, venue, centers: state.data.centers, geojson: state.neighborhoods});
  if (profile && Number.isFinite(profile.latitude) && state.loaded) {
    state.map.flyTo({center: [profile.longitude, profile.latitude], zoom: Math.max(state.map.getZoom(), 16), pitch: state.showCenters ? 50 : 0, offset: sheetOffset(), duration: reduced() ? 0 : 650});
  }
  openMobilePanel();
}

function exploreTop() {
  const insight = summarizeAreaInsight(state.baseRows, state.neighborhoods);
  state.focusAreaIds = insight.areaIds;
  update({fit: true});
  closeMobilePanel();
}

function clearFocus() { state.focusAreaIds = []; update({fit: true}); }

function resetToOverview({fit = true} = {}) {
  state.focusAreaIds = [];
  state.panel = overviewPanel();
  state.history = [];
  update({fit});
}

function clearFilter(key) {
  if (key === 'all') { $('filters').reset(); $('cohort').value = 'refresh'; resetToOverview(); return; }
  if (key === 'neighborhood') { $('neighborhood').value = ''; resetToOverview(); return; }
  $(key).value = key === 'cohort' ? 'refresh' : '';
  update({fit: key !== 'search'});
}

function onPanelAction(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const {action, id, value} = target.dataset;
  switch (action) {
    case 'select-area': selectNeighborhood(id); break;
    case 'select-store': selectStore(id); break;
    case 'select-venue': selectVenue(id, value); break;
    case 'search-brand': $('search').value = value; $('neighborhood').value = ''; resetToOverview(); $('search').focus({preventScroll: true}); break;
    case 'back': goBack(); break;
    case 'explore-top': exploreTop(); break;
    case 'clear-focus': clearFocus(); break;
    case 'open-charts': openInsights(true); closeMobilePanel(); break;
    case 'open-table': $('results').hidden = false; closeMobilePanel(); $('toggle-table').focus({preventScroll: true}); break;
    case 'clear-filter': clearFilter(id); break;
    default: break;
  }
}

/* ---------- legend ---------- */
function renderLegend() {
  const model = state.areaModel;
  const steps = $('legend-steps');
  if (!model || !model.classes.classes.length) { steps.innerHTML = `<span class="hint">ไม่มีย่านที่มีแบรนด์ในตัวกรองนี้</span>`; return; }
  steps.innerHTML = model.classes.classes.map(c => `<span class="legend-step"><i style="background:${c.fill}" aria-hidden="true"></i>${esc(c.label)}</span>`).join('') +
    (model.zeroCount ? `<span class="legend-step" title="ย่านที่นิยามไว้แต่ไม่พบแบรนด์ในตัวกรองนี้"><i class="legend-zero" aria-hidden="true"></i>0</span>` : '');
  $('legend-areas').title = `แบรนด์ไม่ซ้ำต่อย่าน · ${model.classes.classCount} ระดับเท่าช่วง จากค่าสูงสุด ${model.classes.max} · นอกขอบเขตย่านไม่ระบายสี · สีเดียวกันทั้งสองธีม`;
}

/* ---------- charts ---------- */
let chartDispose = null;
function drawChart() {
  if (!state.data) return;
  chartDispose?.(); chartDispose = null;
  for (const b of document.querySelectorAll('[data-view]')) b.setAttribute('aria-selected', String(b.dataset.view === state.view));
  $('chart').setAttribute('aria-labelledby', 'tab-' + state.view);
  const narrowed = selectedNeighborhood() || state.focusAreaIds.length;
  $('chart-scope').textContent = `${num(state.scopeRows.length)} รายการในตัวกรอง${narrowed ? ' · เทียบทุกย่าน ไม่รวมการเลือกย่าน' : ''}`;
  if ($('insight-content').hidden) return;
  chartDispose = renderInsightChart({elementId: 'chart', view: state.view, rows: state.scopeRows, segments: SEGMENT_LIST, neighborhoods: state.neighborhoods, theme: document.documentElement.dataset.theme, selectedAreaId: areaKey(selectedNeighborhood())}, selection => {
    if (selection.type === 'resetAreas') { $('neighborhood').value = ''; resetToOverview(); return; }
    if (selection.type === 'neighborhood') selectNeighborhood(selection.id, {fromMap: true});
  });
}

function openInsights(open) {
  $('insight-content').hidden = !open;
  $('insights').classList.toggle('is-collapsed', !open);
  $('toggle-insights').setAttribute('aria-expanded', String(open));
  $('toggle-insights').textContent = open ? 'ย่อกราฟ' : 'เปิดกราฟ';
  requestAnimationFrame(() => { syncBottomPanel(); drawChart(); });
}

function syncBottomPanel() {
  document.documentElement.style.setProperty('--bottom-panel-height', `${$('insights').getBoundingClientRect().height}px`);
  state.pins?.layout();
  state.labels?.layout();
}

/* ---------- table ---------- */
function renderTable() {
  const pageSize = 25, start = state.page * pageSize, rs = state.rows.slice(start, start + pageSize);
  $('result-rows').innerHTML = rs.map(r => {
    const area = assignNeighborhood(r, state.neighborhoods);
    return `<tr><td><button type="button" class="row-name brand-row" data-id="${esc(r.id)}">${brandLogoMarkup(r.brand)}<span>${esc(r.brand)}</span></button><small>${esc(r.name)}</small></td>
      <td>${esc(r.venue)}<small>${esc(r.province)}</small></td>
      <td>${area ? esc(area.properties.name) : '<span class="hint">นอกขอบเขตย่าน</span>'}</td>
      <td>${statusPill(describeStatus(r))}</td>
      <td><small class="data-number">${hasPoint(r) ? r.latitude.toFixed(5) + ', ' + r.longitude.toFixed(5) : 'ไม่มีพิกัด'}</small></td>
      <td class="links">${link(r.source, 'รายการ')}${link(r.statusSource, 'สถานะ')}${link(r.coordinateSource, 'พิกัด')}</td></tr>`;
  }).join('') || '<tr><td colspan="6">ไม่พบรายการในขอบเขตที่เลือก ลองล้างตัวกรองหรือเลือกชุดข้อมูลอื่น</td></tr>';
  $('page-label').textContent = state.rows.length ? `${num(start + 1)}–${num(Math.min(start + pageSize, state.rows.length))} / ${num(state.rows.length)}` : '0 รายการ';
  $('prev-page').disabled = state.page === 0;
  $('next-page').disabled = start + pageSize >= state.rows.length;
  for (const b of $('result-rows').querySelectorAll('[data-id]')) b.onclick = () => { selectStore(b.dataset.id); $('panel').scrollTop = 0; };
}

/* ---------- map ---------- */
function cameraPadding() {
  const height = $('map').clientHeight, panel = $('insights').getBoundingClientRect().height;
  const edge = Math.min(48, Math.max(12, (height - panel) / 6));
  const mapTop = $('map').getBoundingClientRect().top, toolbar = document.querySelector('.map-toolbar').getBoundingClientRect();
  const aha = $('map-aha'), legend = $('map-legend');
  const chromeTop = !aha.hidden && aha.offsetHeight ? aha.getBoundingClientRect().top : legend.offsetHeight ? legend.getBoundingClientRect().top : null;
  let bottom = chromeTop != null ? height - (chromeTop - mapTop) + 12 : panel + edge;
  if (mobilePortrait() && $('panel').classList.contains('is-open')) bottom = Math.max(bottom, Math.round(window.innerHeight * 0.64) - (window.innerHeight - height - mapTop) + 8);
  return {top: Math.max(edge, toolbar.bottom - mapTop + 12), left: edge, right: edge, bottom: Math.min(height * 0.7, bottom)};
}

function fitMap() {
  if (!state.loaded) return;
  const rs = state.rows.filter(hasPoint);
  const area = selectedNeighborhood();
  const b = area ? featureBounds(area, maplibregl.LngLatBounds) : new maplibregl.LngLatBounds();
  if (!area) {
    if (!rs.length && !state.focusAreaIds.length) return;
    for (const f of state.neighborhoods.features) if (state.focusAreaIds.includes(areaKey(f))) featureBounds(f, maplibregl.LngLatBounds).toArray().forEach(p => b.extend(p));
    rs.forEach(r => b.extend([r.longitude, r.latitude]));
  }
  const wide = b.getNorth() - b.getSouth() > 0.3 || b.getEast() - b.getWest() > 0.3;
  state.map.jumpTo({pitch: !wide && state.showCenters && !mobilePortrait() && (area || state.focusAreaIds.length) ? 50 : 0});
  state.map.fitBounds(b, {padding: cameraPadding(), maxZoom: area ? 16 : 15, duration: reduced() ? 0 : 650});
}

function updateSpatialLayers() {
  if (!state.loaded) return;
  state.buildings?.update({rows: state.rows, enabled: state.showCenters, theme: document.documentElement.dataset.theme});
  const selectedId = areaKey(selectedNeighborhood());
  const model = state.areaLayers?.update({rows: state.scopeRows, selectedId, visible: state.showNeighborhoods, focusIds: state.focusAreaIds});
  state.labels?.update(model ? model.areas : [], {selectedId, visible: state.showNeighborhoods, LngLatBounds: maplibregl.LngLatBounds});
  state.pins?.layout();
}

function installSpatialLayers() {
  const map = state.map;
  state.loaded = true;
  state.areaLayers = installNeighborhoodLayers(map, state.neighborhoods, {onSelect: id => selectNeighborhood(id, {fromMap: true})});
  state.buildings = installVenueBuildings(map, state.buildingData, {
    rows: state.rows, enabled: state.showCenters, theme: document.documentElement.dataset.theme, beforeId: state.areaLayers.layerIds.outline,
    onSelect: selection => {
      const rs = selection.rows || [];
      if (!rs.length) return;
      if (rs.length === 1) selectStore(rs[0].id, {fly: false, showPopup: true, fromPin: true});
      else selectVenue(rs[0].mallId, rs[0].venue);
    },
  });
  updateSpatialLayers();
  if (!state.initialCameraDone) {
    state.initialCameraDone = true;
    const f = values();
    if (state.panel.mode === 'store') { const r = rowById(state.panel.id); if (r && hasPoint(r)) map.jumpTo({center: [r.longitude, r.latitude], zoom: 16, pitch: state.showCenters ? 50 : 0}); }
    else if (state.panel.mode === 'venue') { const p = buildVenueProfile(state.scopeRows, {mallId: state.panel.id, venue: state.panel.venue, centers: state.data.centers, geojson: state.neighborhoods}); if (p && Number.isFinite(p.latitude)) map.jumpTo({center: [p.longitude, p.latitude], zoom: 16, pitch: state.showCenters ? 50 : 0}); }
    else if (FIELDS.some(k => k !== 'cohort' && f[k]) || f.cohort !== 'refresh' || state.focusAreaIds.length) fitMap();
  }
}

function initMap() {
  if (!window.maplibregl) throw new Error('Map library is unavailable');
  try {
    state.mapTheme = document.documentElement.dataset.theme;
    state.map = new maplibregl.Map({container: 'map', center: BANGKOK.center, zoom: BANGKOK.zoom, pitch: 0, maxPitch: 55, attributionControl: {compact: true}, style: STYLES[state.mapTheme]});
    state.map.addControl(new maplibregl.NavigationControl({showCompass: true, visualizePitch: true}), 'top-right');
    state.labels = installNeighborhoodLabels(state.map, $('map'), {onSelect: id => selectNeighborhood(id, {fromMap: true}), reservedBottom: bottomSpace});
    state.pins = installStorePins(state.map, $('map'), {
      reservedBottom: bottomSpace,
      onSelect: r => selectStore(r.id, {fly: false, showPopup: true, fromPin: true}),
      onLayout: stats => {
        const context = stats.contextPins ? ` · บริบทนอกส่วนที่เลือก ${num(stats.contextPins)} จุด` : '';
        $('map-status').textContent = `${num(stats.visiblePins)} จุดขายในมุมมอง · โลโก้ ${num(stats.visibleLogos)}/${num(stats.logoLimit)}${context}`;
      },
    });
    updatePins();
    state.map.on('style.load', installSpatialLayers);
    state.map.on('error', e => console.warn('Map resource', e.error?.message || e));
  } catch (e) {
    state.loaded = false; state.initialCameraDone = false;
    for (const cleanup of [() => state.pins?.dispose(), () => state.labels?.dispose(), () => state.buildings?.dispose(), () => state.map?.remove()]) { try { cleanup(); } catch (err) { console.warn('Map cleanup', err); } }
    state.map = null; state.pins = null; state.labels = null; state.buildings = null; state.areaLayers = null;
    throw e;
  }
}

async function startMap() {
  const el = $('map-failure');
  try { await loadMapLibrary(); el.hidden = true; initMap(); }
  catch (e) {
    el.hidden = false;
    el.innerHTML = `<p>โหลดแผนที่ไม่สำเร็จ ข้อมูล ตาราง และกราฟยังใช้งานได้</p><p class="hint">${esc(e.message || '')}</p><button type="button" class="btn">ลองโหลดแผนที่ใหม่</button>`;
    el.querySelector('button').onclick = event => { event.target.disabled = true; startMap(); };
    console.warn(e);
  }
}

/* ---------- mobile sheet ---------- */
function openMobilePanel() {
  if (!mobilePortrait()) return;
  $('panel').classList.add('is-open');
  $('mobile-panel').setAttribute('aria-expanded', 'true');
  $('map-aha').hidden = true;
}
function closeMobilePanel() {
  $('panel').classList.remove('is-open');
  $('mobile-panel').setAttribute('aria-expanded', 'false');
  if (mobilePortrait()) { $('mobile-panel').focus({preventScroll: true}); if (state.panel.mode === 'overview') renderPanel(); }
}

/* ---------- data loading ---------- */
function validOptionalFeatureCollection(value, kind) {
  if (value?.type !== 'FeatureCollection' || !Array.isArray(value.features)) return false;
  const position = p => Array.isArray(p) && p.length >= 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90;
  const ring = r => Array.isArray(r) && r.length >= 4 && r.every(position) && r[0][0] === r.at(-1)[0] && r[0][1] === r.at(-1)[1];
  const polygon = p => Array.isArray(p) && p.length > 0 && p.every(ring);
  return value.features.every(f => {
    const p = f?.properties, g = f?.geometry;
    if (f?.type !== 'Feature' || !p || typeof p !== 'object' || Array.isArray(p)) return false;
    if (!(g?.type === 'Polygon' ? polygon(g.coordinates) : g?.type === 'MultiPolygon' && Array.isArray(g.coordinates) && g.coordinates.length > 0 && g.coordinates.every(polygon))) return false;
    if (kind === 'neighborhood') { const id = f.id || p.id; return typeof id === 'string' && !!id.trim() && typeof p.name === 'string' && !!p.name.trim(); }
    return p.outlet_ids == null || (Array.isArray(p.outlet_ids) && p.outlet_ids.every(id => typeof id === 'string'));
  });
}

async function fetchJSON(resource) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
  try {
    const r = await fetch(resource, {signal: controller.signal, cache: 'no-cache'});
    if (!r.ok) { const e = new Error('โหลดข้อมูลไม่สำเร็จ'); e.status = r.status; throw e; }
    return await r.json();
  } catch (e) { e.resource = resource; e.phase = 'data'; throw e; }
  finally { clearTimeout(timer); }
}

function options(id, items, labels = {}) {
  const s = $(id);
  for (const v of [...new Set(items)].filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)))) {
    const o = document.createElement('option'); o.value = v; o.textContent = labels[v] || v; s.append(o);
  }
}

function restoreFromURL() {
  const p = new URLSearchParams(location.search);
  for (const f of FIELDS) if (p.has(f)) $(f).value = p.get(f);
  if (!$('cohort').value) $('cohort').value = 'refresh';
  if (['centers', 'mix', 'compare'].includes(p.get('view'))) state.view = p.get('view');
  state.focusAreaIds = [...new Set((p.get('areas') || '').split(','))].filter(id => areaById(id)).slice(0, 3);
  // Legacy `mall` parameter: narrow to that center's venue label when it exists.
  const mall = state.data.centers.find(c => c.id === p.get('mall'));
  if (mall && [...$('venue').options].some(o => o.value === mall.name)) $('venue').value = mall.name;
  if (p.get('store') && rowById(p.get('store'))) state.panel = {mode: 'store', id: p.get('store'), venue: ''};
  else if (p.get('place')) { const c = state.data.centers.find(x => x.id === p.get('place')); if (c) state.panel = {mode: 'venue', id: c.id, venue: c.name}; }
}

function wireEvents() {
  let timer;
  for (const f of FIELDS) $(f).addEventListener(f === 'search' ? 'input' : 'change', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.focusAreaIds = [];
      state.history = [];
      const feature = selectedNeighborhood();
      state.panel = feature ? {mode: 'neighborhood', id: areaKey(feature), venue: ''} : overviewPanel();
      update({fit: f !== 'search'});
    }, f === 'search' ? 180 : 0);
  });
  $('filters').addEventListener('reset', () => setTimeout(() => { $('cohort').value = 'refresh'; resetToOverview(); }, 0));
  $('panel-view').addEventListener('click', onPanelAction);
  $('filter-chips').addEventListener('click', onPanelAction);
  $('map-aha').addEventListener('click', onPanelAction);

  const tabs = [...document.querySelectorAll('[data-view]')];
  tabs.forEach((b, i) => {
    b.onclick = () => { state.view = b.dataset.view; drawChart(); saveURL(); };
    b.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[j].focus(); tabs[j].click();
    });
  });

  $('fit-map').onclick = () => { if (selectedNeighborhood() || state.rows.some(hasPoint)) fitMap(); };
  $('bangkok-map').onclick = () => state.map?.flyTo({center: BANGKOK.center, zoom: BANGKOK.zoom, pitch: 0, duration: reduced() ? 0 : 600});
  $('toggle-centers').onclick = () => {
    state.showCenters = !state.showCenters;
    $('toggle-centers').setAttribute('aria-pressed', String(state.showCenters));
    updateSpatialLayers();
    if (state.map && state.map.getZoom() >= 14) state.map.easeTo({pitch: state.showCenters ? 50 : 0, duration: reduced() ? 0 : 400});
  };
  $('toggle-neighborhoods').onclick = () => { state.showNeighborhoods = !state.showNeighborhoods; $('toggle-neighborhoods').setAttribute('aria-pressed', String(state.showNeighborhoods)); updateSpatialLayers(); };
  $('mobile-panel').onclick = () => { $('panel').classList.contains('is-open') ? closeMobilePanel() : openMobilePanel(); };
  $('close-mobile-panel').onclick = closeMobilePanel;
  document.querySelector('.skip').onclick = () => { openMobilePanel(); $('dataset-title').focus(); };
  $('toggle-insights').onclick = () => openInsights($('insight-content').hidden);
  if (typeof ResizeObserver === 'function') new ResizeObserver(syncBottomPanel).observe($('insights')); else window.addEventListener('resize', syncBottomPanel);
  $('open-table').onclick = () => { $('results').hidden = false; closeMobilePanel(); $('toggle-table').focus(); };
  $('toggle-table').onclick = () => { $('results').hidden = true; $('open-table').focus(); };
  $('prev-page').onclick = () => { state.page--; renderTable(); };
  $('next-page').onclick = () => { state.page++; renderTable(); };
  $('theme').onchange = applyTheme;
  const colorMedia = matchMedia('(prefers-color-scheme: dark)');
  const onColorChange = () => { if ($('theme').value === 'auto') applyTheme(); };
  if (colorMedia.addEventListener) colorMedia.addEventListener('change', onColorChange); else colorMedia.addListener(onColorChange);
  matchMedia('(max-width: 760px) and (orientation: portrait)').addEventListener?.('change', () => { if (!mobilePortrait()) $('panel').classList.remove('is-open'); renderPanel(); });
}

async function init() {
  try {
    const resources = ['data/luxury.json', 'data/neighborhoods.geojson', 'data/venue-buildings.geojson', 'data/brand-logos.json'];
    const results = await Promise.allSettled(resources.map(fetchJSON));
    if (results[0].status === 'rejected') throw results[0].reason;
    state.data = results[0].value;
    for (const [index, kind] of [[1, 'neighborhood'], [2, 'building']]) {
      if (results[index].status === 'fulfilled' && !validOptionalFeatureCollection(results[index].value, kind)) {
        const error = new Error('Invalid optional polygon FeatureCollection');
        error.resource = resources[index]; error.phase = 'data-schema';
        results[index] = {status: 'rejected', reason: error};
        console.warn('Optional dataset unavailable', error);
      }
    }
    state.neighborhoods = results[1].status === 'fulfilled' ? results[1].value : {type: 'FeatureCollection', features: []};
    state.buildingData = results[2].status === 'fulfilled' ? results[2].value : {type: 'FeatureCollection', features: []};
    const coverage = configureBrandLogos(results[3].status === 'fulfilled' ? results[3].value : {brands: []}, state.data.rows);
    if (!coverage.complete) console.warn('Brand logo coverage', coverage);

    options('segment', Object.keys(SEGMENTS), SEGMENTS);
    options('channel', state.data.rows.map(r => r.channel), CHANNELS);
    options('province', state.data.rows.map(r => r.province));
    options('venue', state.data.rows.map(r => r.venue));
    for (const f of state.neighborhoods.features) { const o = document.createElement('option'); o.value = areaKey(f); o.textContent = f.properties.name; $('neighborhood').append(o); }
    $('category-items').innerHTML = Object.entries(SEGMENTS).map(([, name], i) => `<span><i class="category-swatch category-${i + 1}" aria-hidden="true"></i>${esc(name)}</span>`).join('');

    restoreFromURL();
    try { $('theme').value = localStorage.getItem('citymeter-luxury-theme') || 'auto'; } catch {}
    applyTheme();
    wireEvents();
    update();
    if (state.panel.mode !== 'overview') openMobilePanel();
    window.dispatchEvent(new CustomEvent('citymeter:ready'));
    startMap();
  } catch (e) {
    window.dispatchEvent(new CustomEvent('citymeter:load-error', {detail: {message: 'โหลดข้อมูลจุดขายไม่สำเร็จ กรุณาลองอีกครั้ง', resource: e.resource, status: e.status, phase: e.phase || 'startup', diagnostic: e.message}}));
    console.error(e);
  }
}

init();
