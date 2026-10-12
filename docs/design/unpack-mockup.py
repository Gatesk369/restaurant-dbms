"""Unpack a bundled mock-up (.html) into readable markup, scripts and fonts.

The mock-ups in this folder are single-file bundles: the real markup and the
sample-data logic sit inside gzip+base64 blobs. The staff-app file is a bundle
of five more bundles (one per screen), so this script unpacks recursively.

    python3 unpack-mockup.py ordering-station-mockup.html /tmp/ordering-station
    python3 unpack-mockup.py staff-app-mockups.html /tmp/staff-app

For every bundle you get `template.html` (the screen markup with the exact
inline styles, plus the component script holding the sample data and rules)
and the decoded assets. Nested screens land in sub-folders named after the
iframe title.
"""

import base64
import gzip
import json
import re
import sys
from pathlib import Path

EXT = {
    "text/javascript": "js",
    "text/html": "html",
    "text/css": "css",
    "font/woff2": "woff2",
    "image/svg+xml": "svg",
}


def block(html: str, kind: str):
    match = re.search(
        rf'<script type="__bundler/{kind}"[^>]*>(.*?)</script>', html, re.DOTALL
    )
    return json.loads(match.group(1)) if match else None


def unpack(src: Path, out: Path) -> None:
    html = src.read_text(encoding="utf-8")
    manifest = block(html, "manifest")
    template = block(html, "template")
    if manifest is None or template is None:
        raise SystemExit(f"{src}: not a bundled mock-up")
    out.mkdir(parents=True, exist_ok=True)
    (out / "template.html").write_text(template, encoding="utf-8")

    # Frames in the template point at nested bundles with about:blank#<uuid>.
    titles = dict(
        re.findall(r'src="about:blank#([0-9a-f-]+)"[^>]*title="([^"]+)"', template)
    )
    for uuid, entry in manifest.items():
        raw = base64.b64decode(entry["data"])
        if entry.get("compressed"):
            raw = gzip.decompress(raw)
        if entry["mime"] == "text/html":
            name = re.sub(r"\W+", "-", titles.get(uuid, uuid)).strip("-").lower()
            nested = out / name
            nested.mkdir(parents=True, exist_ok=True)
            page = nested / "bundle.html"
            page.write_bytes(raw)
            unpack(page, nested)
        else:
            (out / f"{uuid}.{EXT.get(entry['mime'], 'bin')}").write_bytes(raw)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    unpack(Path(sys.argv[1]), Path(sys.argv[2]))
