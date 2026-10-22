#!/usr/bin/env python3
"""Build the venue-logo registry (data/venue-logos.json + assets/venue-logos/ + assets/venue-logos-manifest.json)
from the research manifest 00_venue_logo_manifest.json (sheet tab 10_VENUE_LOGOS, Drive folder of logo files).

  python3 scripts/build-venue-logos.py <manifest.json> <dir with the downloaded logo files>

Every file is verified against the manifest sha256 before it is copied (unchanged bytes). The UI backing
colour per mark is derived from the artwork (PIL for PNG/JPEG, a headless Chromium render for SVG):
transparent marks get the LDS surface-soft stone #E5E9E6, light/white transparent marks the dark #182327,
opaque files keep their own background (#FFFFFF). Collecting the files is not a trademark licence.
"""
import hashlib, json, re, shutil, sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / 'assets' / 'venue-logos'
STONE, DARK, WHITE = '#E5E9E6', '#182327', '#FFFFFF'
MIME = {'png': 'image/png', 'jpeg': 'image/jpeg', 'jpg': 'image/jpeg', 'svg': 'image/svg+xml', 'webp': 'image/webp'}
PRIVATE_HOSTS = re.compile(r'(^|\.)(drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com|googleusercontent\.com|localhost)$')

def public_url(value):
    if not isinstance(value, str): return None
    try:
        u = urlparse(value)
    except Exception:
        return None
    if u.scheme != 'https' or not u.hostname or '.' not in u.hostname or PRIVATE_HOSTS.search(u.hostname.lower()):
        return None
    return value

def analyse_raster(path):
    from PIL import Image
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    px = im.getdata()
    opaque = [(r, g, b) for r, g, b, a in px if a > 127]
    has_alpha = len(opaque) < w * h * 0.98
    if not opaque:
        return w, h, False, 1.0
    lum = sum(0.2126 * r + 0.7152 * g + 0.0722 * b for r, g, b in opaque) / (255 * len(opaque))
    return w, h, has_alpha, lum

def analyse_svgs(paths):
    """Render each SVG on a transparent page at 320×160 (contain) and analyse the pixels."""
    from playwright.sync_api import sync_playwright
    from PIL import Image
    import io, base64
    results = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={'width': 320, 'height': 160})
        for path in paths:
            svg = path.read_bytes()
            data = base64.b64encode(svg).decode()
            page.set_content(f'<html><body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,{data}" style="width:320px;height:160px;object-fit:contain"></body></html>')
            page.wait_for_timeout(150)
            size = page.evaluate("(() => { const i = document.querySelector('img'); return [i.naturalWidth, i.naturalHeight]; })()")
            shot = page.screenshot(omit_background=True)
            im = Image.open(io.BytesIO(shot)).convert('RGBA')
            px = im.getdata()
            opaque = [(r, g, b) for r, g, b, a in px if a > 127]
            lum = (sum(0.2126 * r + 0.7152 * g + 0.0722 * b for r, g, b in opaque) / (255 * len(opaque))) if opaque else 1.0
            results[path.name] = (size[0] or 0, size[1] or 0, True, lum)
        b.close()
    return results

def main(manifest_path, files_dir):
    m = json.load(open(manifest_path, encoding='utf-8'))
    files_dir = Path(files_dir)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    assets, manifest_files, issues = [], [], []
    svg_paths = [files_dir / a['filename'] for a in m['assets'] if a['filename'].lower().endswith('.svg') and (files_dir / a['filename']).exists()]
    svg_info = analyse_svgs(svg_paths) if svg_paths else {}
    venue_by_key = {}
    for v in m['venues']:
        if v.get('logo_key'): venue_by_key.setdefault(v['logo_key'], v)
    for a in m['assets']:
        src = files_dir / a['filename']
        if not src.exists():
            issues.append({'file': a['filename'], 'reason': 'missing'}); continue
        raw = src.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        if digest != a['sha256'].lower():
            issues.append({'file': a['filename'], 'reason': 'sha256 mismatch'}); continue
        ext = a['filename'].rsplit('.', 1)[1].lower()
        if ext == 'svg':
            w, h, has_alpha, lum = svg_info.get(a['filename'], (0, 0, True, 0.5))
        else:
            w, h, has_alpha, lum = analyse_raster(src)
        background = (DARK if lum > 0.8 else STONE) if has_alpha else WHITE
        dest = OUT_DIR / a['filename']
        shutil.copyfile(src, dest)
        v = venue_by_key.get(a['logo_key'], {})
        assets.append({
            'key': a['logo_key'], 'file': f'assets/venue-logos/{a["filename"]}', 'mime': MIME.get(ext, 'application/octet-stream'),
            'bytes': len(raw), 'sha256': digest, 'width': round(w, 2), 'height': round(h, 2), 'background': background,
            'sourcePage': public_url(v.get('source_page')), 'assetURL': public_url(v.get('asset_url')),
            'sourceKind': 'official_venue' if v.get('status') == 'downloaded_official' else 'other_source',
        })
        manifest_files.append({'path': f'assets/venue-logos/{a["filename"]}', 'sha256': digest, 'bytes': len(raw), 'logoKey': a['logo_key'],
                               'sourcePage': public_url(v.get('source_page')), 'assetURL': public_url(v.get('asset_url')), 'status': v.get('status', ''), 'checkedOn': v.get('checked_on', m['checked_on'])})
    keys = {a['key'] for a in assets}
    # Files recorded in the sheet whose byte-exact copy has not reached the build yet (missing here, or a copy that
    # failed the sheet's sha256): the venue keeps its name and shows no logo until the verified file arrives.
    pending = [{'file': a['filename'], 'logoKey': a['logo_key'], 'reason': 'transfer_pending', 'sheetSha256': a['sha256'].lower(), 'bytes': a['bytes'],
                'venues': [v['raw_label'] for v in m['venues'] if v.get('logo_key') == a['logo_key']]} for a in m['assets'] if a['logo_key'] not in keys]
    venues = [{'label': v['raw_label'], 'canonical': v.get('canonical_name', v['raw_label']), 'type': v.get('venue_type', ''), 'role': v.get('logo_role', 'none'),
               'key': v['logo_key'] if v.get('logo_key') in keys else None, 'status': v.get('status', '')} for v in m['venues']]
    centers = [{'id': c['citymeter_id'], 'name': c['center_name'], 'label': c.get('venue_label', ''), 'key': c['key'] if c.get('key') in keys else None, 'role': c.get('logo_role', 'none')} for c in m['shopping_center_links']]
    roles = {'venue_specific': 'โลโก้ของสถานที่โดยตรง', 'parent_complex': 'โลโก้โครงการแม่', 'shared_department_store_banner': 'แบนเนอร์ห้างสรรพสินค้าที่ใช้ร่วมกัน', 'shared_chain_banner': 'แบนเนอร์เครือที่ใช้ร่วมกัน', 'none': 'ไม่มีโลโก้ venue แยก'}
    registry = {
        'meta': {'asOf': m['checked_on'], 'version': f"{m['checked_on']}-r1", 'count': len(assets), 'expected': len(m['assets']), 'folder': 'assets/venue-logos/',
                 'registry': 'CityMETER Luxury Brands Thailand — Market Refresh 2026-10-21, tab 10_VENUE_LOGOS (checked 2026-10-22)',
                 'counts': m.get('counts', {}), 'missing': m.get('missing', []), 'pending': pending,
                 'status': 'complete' if not pending else f'partial: {len(assets)} of {len(m["assets"])} files verified; {len(pending)} pending transfer (venues keep their name, no logo shown)',
                 'roles': roles,
                 'identityRole': 'Identify the venue (host) of observed stores in the venue panel, venue lists and store details; the venue name stays the record of identity',
                 'backgroundRule': f'transparent marks on {STONE} (LDS surface-soft stone), light transparent marks on {DARK}, opaque files on their own {WHITE}; artwork bytes unchanged',
                 'licenseNote': 'การรวบรวมไฟล์ไม่ใช่ใบอนุญาตเครื่องหมายการค้า สิทธิ์ยังเป็นของเจ้าของ; shown only to identify the venue of observed stores',
                 'notes': m.get('notes', '')},
        'assets': assets, 'venues': venues, 'centers': centers, 'issues': issues,
    }
    (ROOT / 'data' / 'venue-logos.json').write_text(json.dumps(registry, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    (ROOT / 'assets' / 'venue-logos-manifest.json').write_text(json.dumps({'checkedOn': m['checked_on'], 'source': registry['meta']['registry'], 'status': registry['meta']['status'], 'files': manifest_files, 'pending': pending, 'issues': issues}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'assets {len(assets)} of {len(m["assets"])}, venues {len(venues)} ({sum(1 for v in venues if v["key"])} with a logo), centers {len(centers)} ({sum(1 for c in centers if c["key"])} with a logo), pending {len(pending)}, issues {len(issues)}')
    for a in assets: print(f'  {a["file"]:48} {a["background"]} {a["width"]}x{a["height"]} {a["mime"]}')

if __name__ == '__main__':
    if len(sys.argv) < 3: raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
