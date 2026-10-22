#!/usr/bin/env python3
"""Re-fetch venue logo files from their public source URLs and verify each against the sha256
recorded in tools/venue-logo-sources.json. Verified files go to <out>/ok/, unverified bytes to
<out>/unverified/ (kept only for diagnosis), and a JSON report to <out>/report.json.

  python3 tools/fetch-venue-logos.py tools/venue-logo-sources.json <out dir>
"""
import hashlib, json, sys, time, urllib.request
from pathlib import Path

UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

def fetch(url):
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'image/avif,image/webp,image/svg+xml,image/*,*/*;q=0.8', 'Accept-Language': 'th,en;q=0.8'})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.status, r.headers.get('content-type', ''), r.read()
        except Exception as e:  # noqa: BLE001 - report and retry
            last = e
            time.sleep(2 + attempt * 3)
    return None, '', str(last).encode()

def main(src, out):
    spec = json.load(open(src, encoding='utf-8'))
    out = Path(out); (out / 'ok').mkdir(parents=True, exist_ok=True); (out / 'unverified').mkdir(parents=True, exist_ok=True)
    report = []
    for f in spec['files']:
        status, ctype, data = fetch(f['url'])
        digest = hashlib.sha256(data).hexdigest() if status else ''
        ok = bool(status) and digest == f['sha256'].lower()
        (out / ('ok' if ok else 'unverified') / f['filename']).write_bytes(data)
        report.append({'filename': f['filename'], 'status': status, 'contentType': ctype, 'bytes': len(data), 'expectedBytes': f['bytes'], 'sha256': digest, 'verified': ok})
        print(f"{'OK ' if ok else 'XX '} {f['filename']:34} status={status} bytes={len(data)}/{f['bytes']} type={ctype[:40]}")
    (out / 'report.json').write_text(json.dumps(report, indent=1), encoding='utf-8')
    print(f"verified {sum(1 for r in report if r['verified'])} / {len(report)}")

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
