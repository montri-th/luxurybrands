#!/usr/bin/env python3
"""Pending venue logos whose exact bytes other CityMETER demos already ship (owner 2026-11-24).

  python3 -I scripts/attach-family-venue-logos.py --family <dir holding the demo checkouts> --checked-on YYYY-MM-DD

Owner 2026-11-24 07:53, VERBATIM: “ทำไมหลายร้านในศูนย์การค้าเราควรจะมี logo แล้ว แต่เวบเดโมไม่แสดงโลโก้ แก้ให้ครบทุก venue
และตรวจใน dataset อื่นๆด้วยในเคสนี้หาวิธีแก้ที่แก้ได้ทุกที่เหมือนกัน”. Since 22 Oct 2026 the registry (data/venue-logos.json,
sheet tab 10_VENUE_LOGOS) has held 17 files “pending transfer”, each named with the SHA-256 the sheet recorded. The shared kit
(scripts/logo-kit/citymeter_logos.py, VenuePool.by_sha, citymeter-logos 1.1.0) finds the family's copy of a file by that
SHA-256 — the same bytes the sheet names, nothing matched by name. This writes data/venue-logo-links.json ({meta, assets,
venues: label → key, centers: id → key}, only the labels and centres the registry ties to those keys) and copies the files
to assets/venue-logos-family/<sheet file name>. data/venue-logos.json is not changed; js/venue-logos.js fills only keys the
registry leaves empty. Run it after every rebuild of the registry (tests/venue-logo-links.test.js).
"""
import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts' / 'logo-kit'))
import citymeter_logos as kit  # noqa: E402

FOLDER = 'assets/venue-logos-family'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--family', required=True)
    ap.add_argument('--checked-on', required=True)
    a = ap.parse_args()
    family = os.path.abspath(a.family)
    if Path(family, 'luxurybrands').resolve() != ROOT:
        sys.exit(f'--family must hold this checkout as luxurybrands/ ({ROOT})')
    pool = kit.build_venue_pool(family)
    if pool.issues:
        sys.exit(f'venue pool issues: {pool.issues[:5]}')
    reg_path = ROOT / 'data' / 'venue-logos.json'
    reg = json.loads(reg_path.read_text(encoding='utf-8'))
    status = {v['label']: v.get('status', '') for v in reg['venues']}
    out = ROOT / FOLDER
    out.mkdir(parents=True, exist_ok=True)
    assets, venues, centers, keep, still = [], {}, {}, set(), []
    for p in reg['meta'].get('pending', []):
        rec = pool.by_sha(p['sheetSha256'])
        if not rec or rec['bytes'] != p['bytes']:
            still.append(p['file'])
            continue
        target = out / p['file']
        raw = open(os.path.join(family, rec['repo'], rec['path']), 'rb').read()
        if kit.sha256_bytes(raw) != p['sheetSha256']:
            sys.exit(f'{p["file"]}: bytes differ from the sheet')
        if not target.exists() or kit.sha256_file(target) != p['sheetSha256']:
            target.write_bytes(raw)
        keep.add(target.name)
        labels = set(p.get('venues') or [])
        assets.append({'key': p['logoKey'], 'file': f'{FOLDER}/{p["file"]}', 'mime': rec['mime'], 'bytes': rec['bytes'], 'sha256': rec['sha256'],
                       'width': rec['width'], 'height': rec['height'], 'background': rec['background'], 'sourcePage': rec['sourcePage'],
                       'sourceKind': 'official_venue' if any(status.get(l) == 'downloaded_official' for l in labels) else 'other_source',
                       'from': rec['repo'], 'sourcePath': rec['path']})
        for v in reg['venues']:
            if v['label'] in labels and not v.get('key'):
                venues[v['label']] = p['logoKey']
        for c in reg['centers']:
            if c.get('label') in labels and not c.get('key'):
                centers[c['id']] = p['logoKey']
    stale = sorted(f.name for f in out.iterdir() if f.name not in keep)
    for name in stale:
        (out / name).unlink()
    body = {
        'meta': {
            'schemaVersion': '1', 'kit': f'{kit.KIT} {kit.VERSION}', 'checkedOn': a.checked_on,
            'rule': 'A file the registry lists as pending transfer is taken from the CityMETER demo family only when its bytes equal the SHA-256 the sheet recorded; it fills only the venue labels and centres the registry ties to that logo key',
            'rights': 'การรวบรวมไฟล์ไม่ใช่ใบอนุญาตเครื่องหมายการค้า สิทธิ์ยังเป็นของเจ้าของ; shown only to identify the venue of observed stores',
            'inputs': {'registrySha256': kit.sha256_file(reg_path)},
            'pool': {k: v for k, v in pool.summary().items() if k != 'issues'},
            'counts': {'pending': len(reg['meta'].get('pending', [])), 'found': len(assets), 'venues': len(venues), 'centers': len(centers)},
            'stillPending': still, 'filesRemoved': stale,
        },
        'assets': sorted(assets, key=lambda x: x['key']),
        'venues': dict(sorted(venues.items())),
        'centers': dict(sorted(centers.items())),
    }
    (ROOT / 'data' / 'venue-logo-links.json').write_text(json.dumps(body, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(json.dumps(body['meta']['counts'], ensure_ascii=False), 'still pending', still)


if __name__ == '__main__':
    main()
