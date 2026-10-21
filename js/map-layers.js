/**
 * Neighborhood layers on the MapLibre map.
 *
 * Overview zooms (< 14.5) show the ten defined neighborhoods as a choropleth
 * of distinct brands per area using the LDS `count` family (scales.js). The
 * fill is inserted beneath the basemap's first line layer so roads and labels
 * stay readable above an exact, opaque data colour. From zoom 14.5 the fill
 * switches off (hard switch, no blended opacity) and only the outline, the
 * selected outline and the HTML labels remain, letting pins, logos and host
 * buildings carry the reading.
 *
 * Value states follow EVID-05: measured (nonzero), measured_zero (defined area
 * with 0 selected brands → lowest fill + zero outline), and out_of_scope for
 * everything outside the defined set (bare basemap, nothing drawn).
 */
import {summarizeNeighborhoods} from './neighborhoods.js';
import {buildCountClasses, classify} from './scales.js';

export const FILL_MAX_ZOOM = 14.5;
const SOURCE = 'neighborhoods';
const LAYERS = {fill: 'neighborhood-fill', zero: 'neighborhood-zero-outline', outline: 'neighborhood-outline', selected: 'neighborhood-selected'};
const areaId = f => f.id || f.properties?.id;

function cssVar(name, fallback) {
  const value = typeof getComputedStyle === 'function' ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : '';
  return value || fallback;
}

/** First basemap line layer id, so data fills stay under roads and labels. */
export function firstLineLayerId(map) {
  const layers = map.getStyle()?.layers || [];
  return (layers.find(l => l.type === 'line') || layers.find(l => l.type === 'symbol'))?.id;
}

export function featureBounds(feature, LngLatBounds) {
  const b = new LngLatBounds();
  const walk = v => { if (typeof v[0] === 'number') b.extend(v); else v.forEach(walk); };
  walk(feature.geometry.coordinates);
  return b;
}

/**
 * Build the per-area model used by the layer, the legend and the labels.
 * Returns {areas, classes} where every defined area carries its EVID-05 state.
 */
export function buildAreaModel(rows, geojson) {
  const summaries = summarizeNeighborhoods(rows, geojson, {includeEmpty: true});
  const classes = buildCountClasses(summaries.map(s => s.brands));
  const areas = summaries.map(s => {
    const c = classify(s.brands, classes);
    return {id: s.id, name: s.name, nameEn: s.nameEn, brands: s.brands, pos: s.pos, state: c.state, fill: c.fill, ink: c.ink, outline: c.outline || null, feature: s.feature, latitude: s.latitude, longitude: s.longitude};
  });
  return {areas, classes, zeroCount: areas.filter(a => a.state === 'measured_zero').length};
}

export function installNeighborhoodLayers(map, geojson, {onSelect} = {}) {
  const beforeId = firstLineLayerId(map);
  map.addSource(SOURCE, {type: 'geojson', data: {type: 'FeatureCollection', features: []}, promoteId: 'id'});
  const outlineColor = () => ['case', ['==', ['get', 'quiet'], 1], cssVar('--border-default', '#C9D0CB'), cssVar('--border-emphasis', '#7D877F')];
  map.addLayer({
    id: LAYERS.fill, type: 'fill', source: SOURCE, maxzoom: FILL_MAX_ZOOM,
    filter: ['==', ['get', 'filled'], 1],
    paint: {'fill-color': ['get', 'fill'], 'fill-opacity': 1, 'fill-antialias': true},
  }, beforeId);
  map.addLayer({
    id: LAYERS.zero, type: 'line', source: SOURCE, maxzoom: FILL_MAX_ZOOM,
    filter: ['all', ['==', ['get', 'state'], 'measured_zero'], ['==', ['get', 'filled'], 1]],
    paint: {'line-color': cssVar('--data-zero-outline', '#7D877F'), 'line-width': 2},
  }, beforeId);
  map.addLayer({
    id: LAYERS.outline, type: 'line', source: SOURCE,
    paint: {'line-color': outlineColor(), 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 14, ['case', ['==', ['get', 'quiet'], 1], 1, 1.6], 17, ['case', ['==', ['get', 'quiet'], 1], 1, 2.2]], 'line-dasharray': [3, 2]},
  });
  map.addLayer({
    id: LAYERS.selected, type: 'line', source: SOURCE,
    filter: ['==', ['get', 'selected'], 1],
    paint: {'line-color': cssVar('--map-selected-stroke', '#176B82'), 'line-width': 3},
  });
  if (onSelect) {
    map.on('click', LAYERS.fill, e => { const f = e.features?.[0]; if (f) onSelect(f.properties.id); });
    map.on('mouseenter', LAYERS.fill, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', LAYERS.fill, () => { map.getCanvas().style.cursor = ''; });
  }
  let current = {areas: [], classes: null, zeroCount: 0};

  /**
   * Focus + context: with no selection every defined area is filled (the
   * overview Aha). With a selected area or an area focus, only those areas keep
   * their data fill; the rest stay as quiet outlines so attention goes to the
   * focused part without recolouring any data value.
   */
  function update({rows = [], selectedId = '', visible = true, focusIds = []} = {}) {
    current = buildAreaModel(rows, geojson);
    const focus = new Set(selectedId ? [selectedId] : focusIds);
    const focusMode = focus.size > 0;
    for (const a of current.areas) { a.focused = !focusMode || focus.has(a.id); a.quiet = focusMode && !focus.has(a.id); }
    const features = current.areas.map(a => ({
      type: 'Feature', id: a.id, geometry: a.feature.geometry,
      properties: {id: a.id, name: a.name, brands: a.brands, pos: a.pos, state: a.state, fill: a.fill, filled: a.focused ? 1 : 0, quiet: a.quiet ? 1 : 0, selected: a.id === selectedId || (focusIds.includes(a.id) && !selectedId) ? 1 : 0},
    }));
    map.getSource(SOURCE)?.setData({type: 'FeatureCollection', features});
    for (const id of Object.values(LAYERS)) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    return current;
  }

  function retheme() {
    if (map.getLayer(LAYERS.outline)) map.setPaintProperty(LAYERS.outline, 'line-color', outlineColor());
    if (map.getLayer(LAYERS.selected)) map.setPaintProperty(LAYERS.selected, 'line-color', cssVar('--map-selected-stroke', '#176B82'));
    if (map.getLayer(LAYERS.zero)) map.setPaintProperty(LAYERS.zero, 'line-color', cssVar('--data-zero-outline', '#7D877F'));
  }

  function dispose() {
    for (const id of Object.values(LAYERS)) if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(SOURCE)) map.removeSource(SOURCE);
  }

  return {update, retheme, dispose, model: () => current, layerIds: LAYERS};
}

/**
 * HTML labels for the defined neighborhoods: name + distinct-brand badge.
 * Collision-managed against each other and the map chrome; hidden below z12.
 */
export function installNeighborhoodLabels(map, container, {onSelect, reservedBottom = () => 0} = {}) {
  const host = document.createElement('div');
  host.id = 'neighborhood-labels';
  host.setAttribute('aria-label', 'ย่านบนแผนที่');
  container.append(host);
  let labels = [], frame = 0;
  const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

  function layout() {
    const width = container.clientWidth, height = container.clientHeight - reservedBottom();
    const panel = container.closest('.map-panel'), rect = container.getBoundingClientRect();
    const chrome = [...panel.querySelectorAll('.map-toolbar, .map-legend, .map-status, .map-aha, .maplibregl-ctrl-top-right')]
      .filter(e => e.offsetWidth && e.offsetHeight)
      .map(e => { const b = e.getBoundingClientRect(); return {left: b.left - rect.left - 4, right: b.right - rect.left + 4, top: b.top - rect.top - 4, bottom: b.bottom - rect.top + 4}; });
    const placed = [];
    const zoom = map.getZoom();
    panel.classList.toggle('is-detail-zoom', zoom >= FILL_MAX_ZOOM);
    for (const e of labels) {
      const p = map.project(e.center);
      const baseY = p.y;
      e.button.hidden = !(e.visible && zoom >= 11.5 && p.x > 0 && p.x < width && baseY > 48 && baseY < height);
      if (e.button.hidden) continue;
      const w = e.button.offsetWidth, h = e.button.offsetHeight;
      let position = null;
      for (const [dx, dy] of [[0, 0], [0, -30], [0, 30], [-40, 0], [40, 0], [0, -60], [0, 60]]) {
        const x = p.x + dx, y = baseY + dy;
        const box = {left: x - w / 2 - 4, right: x + w / 2 + 4, top: y - h / 2 - 3, bottom: y + h / 2 + 3};
        if (box.left < 4 || box.right > width - 4 || box.top < 48 || box.bottom > height || placed.some(b => overlaps(box, b)) || chrome.some(b => overlaps(box, b))) continue;
        position = {x, y, box};
        break;
      }
      e.button.hidden = !position;
      if (position) { e.button.style.left = `${position.x}px`; e.button.style.top = `${position.y}px`; placed.push(position.box); }
    }
  }
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(layout); };

  function update(areas, {selectedId = '', visible = true, LngLatBounds} = {}) {
    host.replaceChildren();
    labels = [];
    for (const a of areas) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `neighborhood-label is-${a.state}${a.id === selectedId ? ' is-selected' : ''}${a.quiet ? ' is-quiet' : ''}`;
      button.innerHTML = `<span class="label-name"></span><span class="label-count data-number" aria-hidden="true"></span>`;
      button.querySelector('.label-name').textContent = a.name;
      button.querySelector('.label-count').textContent = String(a.brands);
      button.setAttribute('aria-label', `${a.name}: ${a.brands} แบรนด์ไม่ซ้ำ, ${a.pos} รายการจุดขาย กดเพื่อสำรวจย่าน`);
      button.title = `${a.name} · ${a.brands} แบรนด์ · ${a.pos} จุดขาย`;
      button.setAttribute('aria-pressed', String(a.id === selectedId));
      if (a.state === 'measured_zero') { button.classList.add('is-zero'); }
      button.onclick = () => onSelect?.(a.id);
      const center = a.feature ? featureBounds(a.feature, LngLatBounds).getCenter().toArray() : [a.longitude, a.latitude];
      host.append(button);
      labels.push({button, center, visible});
    }
    schedule();
  }
  map.on('move', schedule);
  map.on('resize', schedule);
  return {update, layout: schedule, dispose() { cancelAnimationFrame(frame); map.off('move', schedule); map.off('resize', schedule); host.remove(); }};
}
