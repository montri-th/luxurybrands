/**
 * CityMETER · Luxury Brands — application orchestration.
 *
 * One committed selection drives everything. Three row scopes exist and are
 * named consistently throughout:
 *   scopeRows — rows after search/cohort/segment/province/channel/venue filters,
 *               BEFORE any neighborhood selection or area focus. This is the
 *               comparison base for the Aha, the choropleth and the charts.
 *   baseRows  — scopeRows narrowed by the selected neighborhood (if any).
 *   rows      — baseRows narrowed by the area focus (if any).
 *               Pins, counters, the table and the panel counts use `rows`.
 *
 * Area focus has three modes (state.focusAreaIds / state.autoFocus):
 *   auto     — default: the top-three neighborhoods of the current scope are
 *              the focus, so the first screen already shows detail only there
 *              (the first Aha in 3D); URL stays clean.
 *   explicit — ?areas=a,b,c chosen by the user.
 *   none     — ?areas=all: every area filled, nothing quiet.
 *
 * Focus + quiet on the map: data fills, category pins, logos, host buildings
 * and rounded focus massing only for the focused part; everything else stays
 * visible but quiet (outline-only areas, grey dots, pale city massing).
 *
 * Camera: 3D by default (camera.js presets city/model/eye) with a 2D plan
 * toggle; the basemap is generated (map-style.js) on OpenFreeMap tiles.
 * Panel modes: overview | neighborhood | venue | store (with a back stack).
 * URL state: filters, areas, view, store, place, view3d, cam — restored on load.
 * Resilience: core data first; the map (MapLibre, CDN) and optional datasets
 * are independent and retryable; charts are vendor-free.
 */
import {SEGMENTS, CHANNELS, COHORTS, PROVINCES, provinceByName, provinceNameFrom, filterRows, summarize, hasPoint, isClosed} from './model.js';
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
import {buildMapStyle, basemapPalette, TILEJSON_URL, MASSING_BEFORE} from './map-style.js';
import {installMassing, outerRings} from './massing.js';
import {presetFor, applyPreset, fitPitched, framePoint} from './camera.js';
import {buildBreadcrumb, renderBreadcrumb, breadcrumbText} from './breadcrumb.js';

const $ = id => document.getElementById(id);
const FIELDS = ['search', 'cohort', 'segment', 'province', 'channel', 'venue', 'neighborhood'];
const BANGKOK = {center: [100.548, 13.738], zoom: 12.6};
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobilePortrait = () => matchMedia('(max-width: 760px) and (orientation: portrait)').matches;
const SEGMENT_LIST = Object.entries(SEGMENTS).map(([id, name]) => ({id, name}));

const state = {
  data: null, neighborhoods: null, buildingData: null,
  scopeRows: [], baseRows: [], rows: [],
  view: 'centers', page: 0,
  focusAreaIds: [], autoFocus: true, focusIds: [], selectedId: '',
  panel: {mode: 'overview', id: '', venue: ''}, history: [],
  map: null, loaded: false, mapTheme: '', popup: null, initialCameraDone: false, tileTemplate: '',
  view3d: true, twoPoint: true, showNeighborhoods: true,
  pins: null, buildings: null, massing: null, areaLayers: null, labels: null, areaModel: null,
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
const theme = () => document.documentElement.dataset.theme;
const focusMode = () => (state.focusAreaIds.length ? 'explicit' : state.focusIds.length ? 'auto' : 'none');
// The two-point venue view needs the full screen: while the mobile sheet covers the map it waits (model preset), and the sheet's close re-frames.
const sheetOpen = () => mobilePortrait() && $('panel').classList.contains('is-open');
const cameraPreset = () => presetFor({view3d: state.view3d, mode: state.panel.mode === 'overview' ? 'overview' : 'detail', twoPoint: state.twoPoint && venueLevel() && !sheetOpen()});
const animate = () => !reduced();

function saveURL() {
  const f = values(), p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (!v || v === ({cohort: 'refresh'}[k] || '')) continue;
    p.set(k, k === 'province' ? (provinceByName(v)?.code || v) : v);
  }
  if (state.focusAreaIds.length) p.set('areas', state.focusAreaIds.join(','));
  else if (!state.autoFocus) p.set('areas', 'all');
  if (state.view !== 'centers') p.set('view', state.view);
  if (state.panel.mode === 'store' && state.panel.id) p.set('store', state.panel.id);
  if (state.panel.mode === 'venue' && state.panel.id) p.set('place', state.panel.id);
  if (!state.view3d) p.set('view3d', '0');
  if (!state.twoPoint) p.set('cam', 'model');
  history.replaceState(null, '', location.pathname + (p.size ? '?' + p : ''));
}

/* ---------- theme ---------- */
function applyTheme() {
  const value = $('theme').value;
  const next = value === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : value;
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('citymeter-luxury-theme', value); } catch {}
  if (state.map && next !== state.mapTheme) {
    state.loaded = false;
    state.buildings?.dispose(); state.buildings = null;
    state.massing?.dispose(); state.massing = null;
    state.areaLayers = null;
    state.mapTheme = next;
    state.map.setStyle(buildMapStyle(next), {diff: false});
  }
  if (state.data) drawChart();
}

/* ---------- selection ---------- */
function update({fit = false} = {}) {
  const f = values(), feature = selectedNeighborhood();
  state.scopeRows = filterRows(state.data.rows, {...f, neighborhoodIds: null});
  state.baseRows = feature ? state.scopeRows.filter(r => assignNeighborhood(r, state.neighborhoods) === feature) : state.scopeRows;
  const top = summarizeAreaInsight(state.baseRows, state.neighborhoods);
  state.focusIds = state.focusAreaIds.length ? state.focusAreaIds : (state.autoFocus && !feature ? top.areaIds : []);
  state.rows = state.focusIds.length ? filterAreaRows(state.baseRows, state.neighborhoods, new Set(state.focusIds)) : state.baseRows;
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
  $('filter-chips').innerHTML = renderFilterChips(f, {cohort: COHORTS, channel: CHANNELS, province: Object.fromEntries(PROVINCES.map(p => [p.en, p.th])), neighborhood: Object.fromEntries(state.neighborhoods.features.map(a => [areaKey(a), a.properties.name]))});
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
/** Rows that belong to the venue being looked at (same membership rule as buildVenueProfile). */
function venueRows(rows, venue = currentVenue()) {
  if (!venue) return rows;
  return rows.filter(r => (venue.id ? r.mallId === venue.id : r.venue === venue.label));
}
/**
 * Rows that get full detail on the map. At venue level (owner decision 2026-10-22)
 * only the venue's own rows do: its host building is the only blue one, other
 * venues' buildings fall back to quiet massing and their pins to context dots.
 */
const detailRows = () => (venueLevel() ? venueRows(state.rows) : state.rows);

function updatePins() {
  if (!state.pins) return;
  const focused = [...detailRows()];
  const selected = state.selectedId ? rowById(state.selectedId) : null;
  if (selected && !focused.some(r => r.id === selected.id)) focused.push(selected);
  const focusIds = new Set(focused.map(r => r.id));
  state.pins.update(focused, {contextRows: state.scopeRows.filter(r => !focusIds.has(r.id))});
  if (state.selectedId) state.pins.select(state.selectedId);
}

/* ---------- breadcrumb ---------- */
/**
 * The venue level (ศูนย์การค้า / สถานที่) of the open venue or store: id is the
 * CityMETER Shopping Center id when the venue is a matched center, else '' with
 * the plain venue label. `point` is the venue's representative point (center
 * coordinates, else the first member row with a point) — the ย่าน crumb is decided
 * by point-in-polygon on it, never by name.
 */
function currentVenue() {
  const {mode, id, venue} = state.panel;
  if (mode === 'venue') {
    const c = state.data.centers.find(x => x.id === id) || null;
    const member = state.scopeRows.find(r => (id && r.mallId === id) || (!id && r.venue === venue)) || null;
    const label = c?.name || venue || member?.venue || '';
    if (!label) return null;
    const point = Number.isFinite(c?.latitude) && Number.isFinite(c?.longitude) ? c : (member && hasPoint(member) ? member : null);
    return {id: id || '', label, province: member?.province || '', point};
  }
  if (mode === 'store') {
    const r = rowById(id);
    if (!r) return null;
    const c = r.mallId ? state.data.centers.find(x => x.id === r.mallId) || null : null;
    const label = c?.name || r.venue || '';
    if (!label) return null;
    const point = Number.isFinite(c?.latitude) && Number.isFinite(c?.longitude) ? c : (hasPoint(r) ? r : null);
    return {id: r.mallId || '', label, province: r.province || '', point};
  }
  return null;
}
/** True when the camera is looking at one venue (venue mode, or a store inside a venue). */
const venueLevel = () => state.panel.mode === 'venue' || (state.panel.mode === 'store' && Boolean(currentVenue()));

function renderCrumbs() {
  const venue = currentVenue();
  const area = selectedNeighborhood() || (venue?.point ? assignNeighborhood(venue.point, state.neighborhoods) : null);
  const crumbs = buildBreadcrumb({area, provinceName: $('province').value, venue});
  $('crumbs').innerHTML = renderBreadcrumb(crumbs);
  document.title = `${breadcrumbText(crumbs)} · Luxury Brands · CityMETER`;
  return crumbs;
}

/* ---------- panel ---------- */
function renderPanel(summary = summarize(state.rows, state.data.centers)) {
  const view = $('panel-view');
  const mode = state.panel.mode;
  renderCrumbs();
  syncEyeToggle();
  let html = '';
  if (mode === 'neighborhood') html = renderNeighborhood(buildNeighborhoodProfile(state.scopeRows, areaById(state.panel.id), state.neighborhoods, state.data.centers, SEGMENT_LIST));
  else if (mode === 'venue') html = renderVenue(buildVenueProfile(state.scopeRows, {mallId: state.panel.id, venue: state.panel.venue, centers: state.data.centers, geojson: state.neighborhoods}));
  else if (mode === 'store') html = renderStore(buildStoreDetail(rowById(state.panel.id), {rows: state.scopeRows, geojson: state.neighborhoods, centers: state.data.centers}));
  if (!html) {
    const insight = summarizeAreaInsight(focusMode() === 'explicit' ? state.rows : state.baseRows, state.neighborhoods);
    const overview = buildOverviewInsights(state.baseRows, state.neighborhoods, SEGMENT_LIST);
    html = renderOverview({insight, overview, summary, focusMode: focusMode(), areaModel: state.areaModel, asOf: state.data.meta?.asOf || '', venues: overview.areaCount ? [] : rankVenues(state.rows, state.data.centers), view3d: state.view3d});
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
  const mode = focusMode();
  el.hidden = $('panel').classList.contains('is-open');
  const crumb = `<p class="map-aha-crumb">${esc(breadcrumbText(buildBreadcrumb({area: null, provinceName: $('province').value})))}</p>`;
  el.innerHTML = mode === 'explicit'
    ? `<div>${crumb}<h2>กำลังสำรวจ ${num(insight.areas.length)} ย่าน</h2><p>${num(insight.brands)} แบรนด์ · ${num(insight.pos)} จุดขาย</p></div><button type="button" class="btn" data-action="clear-focus">ดูทุกย่าน</button>`
    : `<div>${crumb}<h2>${num(Math.round(insight.share))}% ของแบรนด์อยู่ใน ${num(insight.areas.length)} ย่าน</h2><p>${insight.areas.map(a => esc(a.name)).join(' · ')}</p></div>${mode === 'auto'
      ? '<button type="button" class="btn" data-action="clear-focus">ดูทุกย่าน</button>'
      : '<button type="button" class="btn primary" data-action="explore-top">โฟกัส</button>'}`;
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
  if (state.loaded) fitArea(feature);
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
  if (state.loaded) { updatePins(); updateSpatialLayers(); }
  if (hasPoint(r) && state.loaded) {
    if (fly) framePoint(state.map, [r.longitude, r.latitude], {preset: cameraPreset(), zoom: 16, offset: sheetOffset(), animate: animate()});
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
  if (state.loaded) { updatePins(); updateSpatialLayers(); }
  const profile = buildVenueProfile(state.scopeRows, {mallId, venue, centers: state.data.centers, geojson: state.neighborhoods});
  if (state.loaded) frameVenue(profile);
  openMobilePanel();
}

/**
 * Frame the venue: its host building(s) when the data layer has them (every
 * footprint vertex inside the padded viewport, with headroom for the building's
 * height under the near-horizontal eye camera), else the venue point.
 */
function frameVenue(profile, {animate: anim = animate(), instant = false} = {}) {
  const map = state.map, preset = cameraPreset();
  const targets = venueTargets(state.buildings?.displayedFeatures() || []);
  if (targets.length && preset !== 'plan' && !mobilePortrait()) {
    const pts = targets.flatMap(t => t.ring);
    const bounds = pts.reduce((b, p) => b.extend(p), new maplibregl.LngLatBounds(pts[0], pts[0]));
    const h = map.getContainer().clientHeight;
    const headroom = Math.round(h * (preset === 'eye' ? 0.26 : 0.12));
    fitPitched(map, bounds, {preset, points: pts, padding: {top: headroom, bottom: 48, left: 48, right: 48}, maxZoom: 17.6, minZoom: 14.5, animate: anim && !instant});
    return;
  }
  if (profile && Number.isFinite(profile.latitude)) framePoint(map, [profile.longitude, profile.latitude], {preset, zoom: 16, offset: sheetOffset(), animate: anim && !instant});
}

/** Focus the top three areas of the current scope (auto mode; URL stays clean). */
function exploreTop() { state.autoFocus = true; state.focusAreaIds = []; update({fit: true}); closeMobilePanel(); }
/** Show every area with detail (no quiet context) — ?areas=all. */
function clearFocus() { state.autoFocus = false; state.focusAreaIds = []; update({fit: true}); }

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
    case 'crumb-country': $('province').value = ''; $('neighborhood').value = ''; resetToOverview(); break;
    case 'crumb-province': { const name = provinceNameFrom(id); if ([...$('province').options].some(o => o.value === name)) $('province').value = name; $('neighborhood').value = ''; resetToOverview(); break; }
    case 'crumb-area': selectNeighborhood(id); break;
    case 'crumb-venue': selectVenue(id, value); break;
    case 'crumb-expand': { const ol = target.closest('.crumbs'); ol.classList.add('is-expanded'); target.setAttribute('aria-expanded', 'true'); ol.querySelector('.crumb:not(.crumb-more)')?.focus({preventScroll: true}); break; }
    case 'toggle-3d': toggle3d(); break;
    default: break;
  }
}

/* ---------- legend ---------- */
function renderLegend() {
  const model = state.areaModel;
  const steps = $('legend-steps');
  if (!model || !model.classes.classes.length) { steps.innerHTML = `<span class="hint">ไม่มีย่านที่มีแบรนด์ในตัวกรองนี้</span>`; }
  else {
    steps.innerHTML = model.classes.classes.map(c => `<span class="legend-step"><i style="background:${c.fill}" aria-hidden="true"></i>${esc(c.label)}</span>`).join('') +
      (model.zeroCount ? `<span class="legend-step" title="ย่านที่นิยามไว้แต่ไม่พบแบรนด์ในตัวกรองนี้"><i class="legend-zero" aria-hidden="true"></i>0</span>` : '');
    $('legend-areas').title = `แบรนด์ไม่ซ้ำต่อย่าน · ${model.classes.classCount} ระดับเท่าช่วง จากค่าสูงสุด ${model.classes.max} · นอกขอบเขตย่านไม่ระบายสี · สีเดียวกันทั้งสองธีม`;
  }
  document.querySelector('.map-panel').classList.toggle('is-3d', state.view3d);
}

/* ---------- charts ---------- */
let chartDispose = null;
function drawChart() {
  if (!state.data) return;
  chartDispose?.(); chartDispose = null;
  for (const b of document.querySelectorAll('[data-view]')) b.setAttribute('aria-selected', String(b.dataset.view === state.view));
  $('chart').setAttribute('aria-labelledby', 'tab-' + state.view);
  const narrowed = selectedNeighborhood() || state.focusIds.length;
  $('chart-scope').textContent = `${num(state.scopeRows.length)} รายการในตัวกรอง${narrowed ? ' · เทียบทุกย่าน ไม่รวมการเลือกย่าน' : ''}`;
  if ($('insight-content').hidden) return;
  chartDispose = renderInsightChart({elementId: 'chart', view: state.view, rows: state.scopeRows, segments: SEGMENT_LIST, neighborhoods: state.neighborhoods, theme: theme(), selectedAreaId: areaKey(selectedNeighborhood())}, selection => {
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
      <td>${esc(r.venue)}<small>${esc(provinceByName(r.province)?.th || r.province)}</small></td>
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

/** Padding for pitched fits: the legend is ignored (foreshortening already lifts the content). */
function pitchedPadding() {
  const mapTop = $('map').getBoundingClientRect().top, toolbar = document.querySelector('.map-toolbar').getBoundingClientRect();
  return {top: Math.round(toolbar.bottom - mapTop + 12), bottom: Math.round($('insights').getBoundingClientRect().height + 40), left: 24, right: 24};
}

function vertices(features) {
  const out = [];
  const walk = v => { if (typeof v[0] === 'number') out.push(v); else v.forEach(walk); };
  for (const f of features) walk(f.geometry.coordinates);
  return out;
}

/**
 * Frame one neighborhood. On a phone with the sheet open only the strip above the
 * sheet is visible, so the fit is a flat plan there; the 3D preset is applied when
 * the sheet closes (closeMobilePanel → fitMap).
 */
function fitArea(feature, {instant = false} = {}) {
  const sheetOpen = mobilePortrait() && $('panel').classList.contains('is-open');
  const preset = sheetOpen ? 'plan' : cameraPreset();
  const pitched = preset !== 'plan' && !mobilePortrait();
  fitPitched(state.map, featureBounds(feature, maplibregl.LngLatBounds), {preset, padding: pitched ? pitchedPadding() : cameraPadding(), maxZoom: 16, animate: animate() && !instant, points: vertices([feature]), shift: mobilePortrait() ? -0.08 : null});
}

function fitMap({instant = false} = {}) {
  if (!state.loaded) return;
  const rs = state.rows.filter(hasPoint);
  const area = selectedNeighborhood();
  const b = area ? featureBounds(area, maplibregl.LngLatBounds) : new maplibregl.LngLatBounds();
  const focusFeatures = area ? [area] : state.neighborhoods.features.filter(f => state.focusIds.includes(areaKey(f)));
  if (!area) {
    if (!rs.length && !state.focusIds.length) return;
    for (const f of focusFeatures) featureBounds(f, maplibregl.LngLatBounds).toArray().forEach(p => b.extend(p));
    rs.forEach(r => b.extend([r.longitude, r.latitude]));
  }
  if (area) { fitArea(area, {instant}); return; }
  const wide = b.getNorth() - b.getSouth() > 0.3 || b.getEast() - b.getWest() > 0.3;
  const preset = wide ? 'plan' : cameraPreset();
  const pitched = preset !== 'plan' && !mobilePortrait();
  const points = focusFeatures.length && rs.every(r => assignNeighborhood(r, state.neighborhoods)) ? vertices(focusFeatures) : null;
  fitPitched(state.map, b, {preset, padding: pitched ? pitchedPadding() : cameraPadding(), maxZoom: 15, animate: animate() && !instant, points, shift: mobilePortrait() && !wide ? -0.12 : null});
}

function updateSpatialLayers() {
  if (!state.loaded) return;
  const feature = selectedNeighborhood();
  state.buildings?.update({rows: detailRows(), enabled: true, theme: theme()});
  const selectedId = areaKey(feature);
  const model = state.areaLayers?.update({rows: state.scopeRows, selectedId, visible: state.showNeighborhoods, focusIds: state.focusIds});
  state.labels?.update(model ? model.areas : [], {selectedId, visible: state.showNeighborhoods, LngLatBounds: maplibregl.LngLatBounds});
  const focusFeatures = feature ? [feature] : state.focusIds.map(areaById).filter(Boolean);
  const hostFeatures = state.buildings?.displayedFeatures() || [];
  state.massing?.update({
    regions: focusFeatures.flatMap(outerRings),
    hosts: hostFeatures.flatMap(outerRings),
    enabled: true, city: state.view3d, zoom: state.map.getZoom(), latitude: state.map.getCenter().lat,
  })?.catch(e => console.warn('Massing', e));
  // Venue-level two-point view: surroundings very quiet, buildings hiding the venue see-through.
  state.massing?.setScene(cameraPreset() === 'eye' ? 'eye' : 'default', venueTargets(hostFeatures));
  state.pins?.layout();
}

/** Host building rings (+ display height) of the venue being looked at — the occlusion targets. */
function venueTargets(hostFeatures) {
  const v = currentVenue();
  if (!v) return [];
  const asList = value => Array.isArray(value) ? value : (typeof value === 'string' ? (() => { try { const x = JSON.parse(value); return Array.isArray(x) ? x : []; } catch { return []; } })() : []);
  return hostFeatures
    .filter(f => (v.id && asList(f.properties?.mall_ids).includes(v.id)) || asList(f.properties?.venue_names).includes(v.label))
    .flatMap(f => outerRings(f).map(ring => ({ring, height: Number(f.properties?.display_height_m) || 3})));
}

function installSpatialLayers() {
  const map = state.map;
  state.loaded = true;
  const palette = basemapPalette(theme());
  state.areaLayers = installNeighborhoodLayers(map, state.neighborhoods, {onSelect: id => selectNeighborhood(id, {fromMap: true})});
  state.massing = installMassing(map, {
    beforeId: MASSING_BEFORE, colors: {quiet: palette.massingQuiet, focus: palette.massingFocus},
    tileUrl: t => (state.tileTemplate ? state.tileTemplate.replace('{z}', t.z).replace('{x}', t.x).replace('{y}', t.y) : ''),
    // Applied results (also zoom-triggered rebuilds) → status line and the dev hook.
    onResult: result => { state.massingResult = result; $('map-status').dataset.massing = `${result.features || 0}`; },
  });
  state.buildings = installVenueBuildings(map, state.buildingData, {
    rows: state.rows, enabled: true, theme: theme(), beforeId: MASSING_BEFORE,
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
    if (state.panel.mode === 'store') { const r = rowById(state.panel.id); if (r && hasPoint(r)) framePoint(map, [r.longitude, r.latitude], {preset: cameraPreset(), zoom: 16, animate: false}); }
    else if (state.panel.mode === 'venue') { const p = buildVenueProfile(state.scopeRows, {mallId: state.panel.id, venue: state.panel.venue, centers: state.data.centers, geojson: state.neighborhoods}); frameVenue(p, {instant: true}); }
    else fitMap({instant: true});
  }
}

function initMap() {
  if (!window.maplibregl) throw new Error('Map library is unavailable');
  try {
    state.mapTheme = theme();
    state.map = new maplibregl.Map({container: 'map', center: BANGKOK.center, zoom: BANGKOK.zoom, pitch: 0, maxPitch: 85, attributionControl: {compact: true}, style: buildMapStyle(state.mapTheme)});
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
    // The same TileJSON MapLibre reads gives the tile template for the focus massing decoder.
    fetch(TILEJSON_URL).then(r => r.json()).then(j => { state.tileTemplate = j.tiles?.[0] || ''; if (state.loaded) updateSpatialLayers(); }).catch(e => console.warn('TileJSON', e));
  } catch (e) {
    state.loaded = false; state.initialCameraDone = false;
    for (const cleanup of [() => state.pins?.dispose(), () => state.labels?.dispose(), () => state.buildings?.dispose(), () => state.massing?.dispose(), () => state.map?.remove()]) { try { cleanup(); } catch (err) { console.warn('Map cleanup', err); } }
    state.map = null; state.pins = null; state.labels = null; state.buildings = null; state.massing = null; state.areaLayers = null;
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

/** 3D ↔ 2D: massing and hosts follow; the camera eases to the matching preset at the current centre/zoom. */
function toggle3d() {
  state.view3d = !state.view3d;
  $('toggle-3d').setAttribute('aria-pressed', String(state.view3d));
  syncEyeToggle();
  renderLegend();
  renderPanel();
  updateSpatialLayers();
  if (state.map) applyPreset(state.map, cameraPreset(), {animate: animate()});
  saveURL();
}

function toggleTwoPoint() {
  state.twoPoint = !state.twoPoint;
  syncEyeToggle();
  if (state.map && state.view3d) {
    if (state.panel.mode === 'venue') frameVenue(buildVenueProfile(state.scopeRows, {mallId: state.panel.id, venue: state.panel.venue, centers: state.data.centers, geojson: state.neighborhoods}));
    else applyPreset(state.map, cameraPreset(), {animate: animate()});
  }
  updateSpatialLayers();
  saveURL();
}
/** มุมสถาปนิก is a venue-level camera: pressed by default there, unavailable elsewhere and in 2D. */
function syncEyeToggle() {
  const b = $('toggle-eye');
  b.setAttribute('aria-pressed', String(state.twoPoint));
  b.disabled = !state.view3d || !venueLevel();
}

/* ---------- mobile sheet ---------- */
function openMobilePanel() {
  if (!mobilePortrait()) return;
  $('panel').classList.add('is-open');
  $('mobile-panel').setAttribute('aria-expanded', 'true');
  $('map-aha').hidden = true;
}
function closeMobilePanel() {
  const wasOpen = $('panel').classList.contains('is-open');
  $('panel').classList.remove('is-open');
  $('mobile-panel').setAttribute('aria-expanded', 'false');
  if (mobilePortrait()) {
    $('mobile-panel').focus({preventScroll: true});
    if (state.panel.mode === 'overview') renderPanel();
    // The sheet covered most of the map: re-frame the selected area with the full screen (3D preset when on).
    else if (wasOpen && state.panel.mode === 'neighborhood' && state.loaded) { const f = selectedNeighborhood(); if (f) fitArea(f); }
    else if (wasOpen && state.loaded && state.panel.mode === 'venue') frameVenue(buildVenueProfile(state.scopeRows, {mallId: state.panel.id, venue: state.panel.venue, centers: state.data.centers, geojson: state.neighborhoods}));
    else if (wasOpen && state.loaded && state.panel.mode === 'store') { const r = rowById(state.panel.id); if (r && hasPoint(r)) framePoint(state.map, [r.longitude, r.latitude], {preset: cameraPreset(), zoom: 16, animate: animate()}); }
    updateSpatialLayers();
  }
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
  for (const v of [...new Set(items)].filter(Boolean).sort((a, b) => String(labels[a] || a).localeCompare(String(labels[b] || b), 'th'))) {
    const o = document.createElement('option'); o.value = v; o.textContent = labels[v] || v; s.append(o);
  }
}

function restoreFromURL() {
  const p = new URLSearchParams(location.search);
  for (const f of FIELDS) if (p.has(f)) $(f).value = f === 'province' ? (provinceNameFrom(p.get(f)) || p.get(f)) : p.get(f);
  if (!$('cohort').value) $('cohort').value = 'refresh';
  if (['centers', 'mix', 'compare'].includes(p.get('view'))) state.view = p.get('view');
  const areas = p.get('areas') || '';
  if (areas === 'all') { state.autoFocus = false; state.focusAreaIds = []; }
  else state.focusAreaIds = [...new Set(areas.split(','))].filter(id => areaById(id)).slice(0, 3);
  state.view3d = p.get('view3d') !== '0';
  state.twoPoint = p.get('cam') !== 'model'; // venue-level two-point view is on by default; legacy cam=eye also means on
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
  $('crumbs').addEventListener('click', onPanelAction);

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
  $('bangkok-map').onclick = () => { if (state.map) applyPreset(state.map, state.view3d ? 'city' : 'plan', {center: BANGKOK.center, zoom: BANGKOK.zoom, animate: animate()}); };
  $('toggle-3d').onclick = toggle3d;
  $('toggle-eye').onclick = toggleTwoPoint;
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
    options('province', state.data.rows.map(r => r.province), Object.fromEntries(PROVINCES.map(p => [p.en, p.th])));
    options('venue', state.data.rows.map(r => r.venue));
    for (const f of state.neighborhoods.features) { const o = document.createElement('option'); o.value = areaKey(f); o.textContent = f.properties.name; $('neighborhood').append(o); }
    $('category-items').innerHTML = Object.entries(SEGMENTS).map(([, name], i) => `<span><i class="category-swatch category-${i + 1}" aria-hidden="true"></i>${esc(name)}</span>`).join('');

    restoreFromURL();
    $('toggle-3d').setAttribute('aria-pressed', String(state.view3d));
    syncEyeToggle();
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

// Developer hook for live tuning in a browser console (not an API; may change without notice).
window.__citymeter = {state, get map() { return state.map; }, update, fitMap, updateSpatialLayers, applyPreset: (name, opts) => state.map && applyPreset(state.map, name, opts), fitPitched: (b, opts) => state.map && fitPitched(state.map, b, opts), cameraPadding, buildMapStyle};

init();
