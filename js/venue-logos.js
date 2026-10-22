/**
 * Venue (host) logos — identity support for the venue panel, venue lists and
 * store details. Registry: data/venue-logos.json (built by
 * scripts/build-venue-logos.py from the research sheet tab 10_VENUE_LOGOS and
 * the verified logo files in assets/venue-logos/).
 *
 * Rules: the venue name stays the record of identity; a logo never changes a
 * row, a venue label, a coordinate or a status. Lookup goes by the CityMETER
 * Shopping Center id first (39 linked centers), then by the exact venue label
 * of the rows; nothing is fuzzy-matched. Shared banners (department-store /
 * chain) and parent-complex marks keep their explicit role so the UI can say so.
 * Collecting the files is not a trademark licence.
 */
const FILE_PATTERN = /^assets\/venue-logos\/[A-Za-z0-9._-]+\.(svg|png|jpe?g|webp)$/;
const MIME_TYPES = new Set(['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp']);
export const ROLE_LABELS = Object.freeze({
  venue_specific: '', parent_complex: 'โลโก้โครงการแม่', shared_department_store_banner: 'โลโก้ห้างสรรพสินค้าในเครือ', shared_chain_banner: 'โลโก้เครือ', none: '',
});
let assets = new Map(), byCenter = new Map(), byLabel = new Map(), meta = {}, configured = false;

export function normalizeVenueLabel(value) {
  return typeof value === 'string' ? value.normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ') : '';
}

function approvedAsset(item) {
  if (!item || typeof item !== 'object' || !/^VL-[a-f0-9]{16}$/.test(item.key || '') || !FILE_PATTERN.test(item.file || '')) return null;
  const width = Number(item.width), height = Number(item.height);
  if (!MIME_TYPES.has(item.mime) || !/^[a-f0-9]{64}$/.test(item.sha256 || '') || !(width > 0) || !(height > 0)) return null;
  return Object.freeze({key: item.key, file: item.file, mime: item.mime, width, height, sha256: item.sha256,
    background: /^#[0-9A-Fa-f]{6}$/.test(item.background || '') ? item.background : '#E5E9E6',
    sourcePage: typeof item.sourcePage === 'string' ? item.sourcePage : '', sourceKind: item.sourceKind || ''});
}

/** Load the registry; returns coverage figures and rejected records (never throws on a bad catalog). */
export function configureVenueLogos(catalog) {
  assets = new Map(); byCenter = new Map(); byLabel = new Map(); meta = {};
  const issues = [];
  const list = Array.isArray(catalog?.assets) ? catalog.assets : [];
  if (!Array.isArray(catalog?.assets)) issues.push({reason: 'invalid_catalog'});
  for (const item of list) { const a = approvedAsset(item); if (a) assets.set(a.key, a); else issues.push({reason: 'invalid_asset', key: item?.key}); }
  for (const c of (Array.isArray(catalog?.centers) ? catalog.centers : [])) {
    if (typeof c?.id === 'string' && c.id && c.key && assets.has(c.key)) byCenter.set(c.id, {key: c.key, role: c.role || 'venue_specific', name: c.name || ''});
  }
  for (const v of (Array.isArray(catalog?.venues) ? catalog.venues : [])) {
    const label = normalizeVenueLabel(v?.label);
    if (label && v.key && assets.has(v.key) && !byLabel.has(label)) byLabel.set(label, {key: v.key, role: v.role || 'venue_specific', canonical: v.canonical || v.label});
  }
  meta = catalog?.meta && typeof catalog.meta === 'object' ? catalog.meta : {};
  configured = true;
  return {assets: assets.size, centers: byCenter.size, venues: byLabel.size, issues, complete: issues.length === 0};
}

/** The logo for a venue: by center id first, then by the rows' venue label. null when none. */
export function getVenueLogo({mallId = '', venue = ''} = {}) {
  if (!configured) return null;
  const link = (mallId && byCenter.get(mallId)) || byLabel.get(normalizeVenueLabel(venue)) || null;
  if (!link) return null;
  const asset = assets.get(link.key);
  return asset ? {...asset, role: link.role, roleLabel: ROLE_LABELS[link.role] ?? '', altTh: `โลโก้ ${link.name || link.canonical || venue}`} : null;
}

/**
 * Markup: a backplate box with the image (decorative unless `decorative: false`).
 * `size` sm (list rows, 28 px tall) | md (store facts, 36 px) | lg (venue heading, 56 px).
 */
export function venueLogoMarkup(ref, {className = '', size = 'sm', decorative = true} = {}) {
  const logo = getVenueLogo(ref);
  if (!logo) return '';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const role = logo.roleLabel ? ` data-role="${esc(logo.role)}" title="${esc(logo.roleLabel)}"` : ` data-role="${esc(logo.role)}"`;
  return `<span class="venue-logo venue-logo-${esc(size)}${className ? ' ' + esc(className) : ''}" style="--venue-logo-bg:${esc(logo.background)}"${role}><img src="${esc(logo.file)}" width="${Math.round(logo.width)}" height="${Math.round(logo.height)}" alt="${decorative ? '' : esc(logo.altTh)}" loading="lazy" decoding="async"></span>`;
}

export function venueLogoMeta() { return {...meta, count: assets.size}; }
