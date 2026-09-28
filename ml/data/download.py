"""Download CMEMS subsets month by month (resumable).

Credentials are read by the copernicusmarine client from the environment:
    COPERNICUSMARINE_SERVICE_USERNAME, COPERNICUSMARINE_SERVICE_PASSWORD
They are never passed through, logged or written by this script.

Usage (from ml/):
    python -m data.download --config config.yaml                 # everything
    python -m data.download --config config.yaml --products sst  # subset
    python -m data.download --config config.yaml --dry-run       # size estimate only
"""
from __future__ import annotations

import argparse
import calendar
import json
import os
import sys
import time
from pathlib import Path

from common.config import all_years, load_config, resolve

CRED_VARS = ("COPERNICUSMARINE_SERVICE_USERNAME", "COPERNICUSMARINE_SERVICE_PASSWORD")


def padded_box(cfg: dict) -> dict:
    d, pad = cfg["domain"], cfg["domain"]["download_pad_deg"]
    return dict(minimum_latitude=d["lat"][0] - pad, maximum_latitude=d["lat"][1] + pad,
                minimum_longitude=d["lon"][0] - pad, maximum_longitude=d["lon"][1] + pad)


def month_chunks(years: list[int]):
    for y in years:
        for m in range(1, 13):
            last = calendar.monthrange(y, m)[1]
            yield f"{y}-{m:02d}", f"{y}-{m:02d}-01T00:00:00", f"{y}-{m:02d}-{last}T23:59:59"


def subset_kwargs(cfg: dict, prod: dict) -> dict:
    kw = dict(dataset_id=prod["dataset_id"], variables=prod["variables"], **padded_box(cfg),
              coordinates_selection_method="outside", disable_progress_bar=True)
    if prod.get("dataset_version"):
        kw["dataset_version"] = prod["dataset_version"]
    if "depth" in prod:
        kw["minimum_depth"], kw["maximum_depth"] = prod["depth"]
    return kw


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", required=True)
    ap.add_argument("--products", nargs="*", help="product keys from config (default: all)")
    ap.add_argument("--years", nargs="*", type=int, help="default: all split years")
    ap.add_argument("--dry-run", action="store_true", help="ask the server for size estimates, download nothing")
    args = ap.parse_args(argv)

    import copernicusmarine as cm

    cfg = load_config(args.config)
    keys = args.products or list(cfg["products"])
    years = args.years or all_years(cfg)
    raw = resolve(cfg, "raw")

    missing = [v for v in CRED_VARS if not os.environ.get(v)]
    if missing:  # dry-run size estimates also need a login (the client returns nothing without one)
        print(f"BLOCKED: environment variables not set: {', '.join(missing)}\n"
              "Register at https://marine.copernicus.eu and set them in the shell that runs this script.",
              file=sys.stderr)
        return 2

    log_path = raw / "download_log.jsonl"
    raw.mkdir(parents=True, exist_ok=True)
    total_mb = 0.0
    for key in keys:
        prod = cfg["products"][key]
        out_dir = raw / key
        out_dir.mkdir(parents=True, exist_ok=True)

        if prod.get("static"):
            chunks = [("static", None, None)]
        else:
            chunks = list(month_chunks(years))

        for tag, start, end in chunks:
            final = out_dir / f"{key}_{tag}.nc"
            if final.exists() and not args.dry_run:
                continue
            kw = subset_kwargs(cfg, prod)
            if start:
                kw.update(start_datetime=start, end_datetime=end)
            if args.dry_run:
                resp = cm.subset(**kw, dry_run=True, output_directory=str(out_dir))
                if resp is None or getattr(resp, "file_size", None) is None:
                    raise RuntimeError(f"{key}: server returned no size estimate")
                size = resp.file_size
                total_mb += size
                print(f"{key:10s} {tag:8s} ~{size:8.1f} MB (server estimate)")
                if not prod.get("static"):
                    # one month per product is enough to extrapolate
                    n = len(chunks)
                    print(f"{key:10s} x{n} months ~{size * n / 1024:8.2f} GB")
                    total_mb += size * (n - 1)
                    break
                continue

            part = out_dir / f"{key}_{tag}.part.nc"
            if part.exists():
                part.unlink()
            t0 = time.time()
            for attempt in range(1, 4):
                try:
                    cm.subset(**kw, output_directory=str(out_dir), output_filename=part.name,
                              netcdf_compression_level=1)
                    break
                except Exception as e:  # network hiccups: retry, then give up loudly
                    print(f"{key} {tag}: attempt {attempt} failed: {e}", file=sys.stderr)
                    if attempt == 3:
                        raise
                    time.sleep(10 * attempt)
            part.replace(final)
            mb = final.stat().st_size / 2**20
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(json.dumps({"product": key, "chunk": tag, "file": final.name, "mb": round(mb, 2),
                                    "seconds": round(time.time() - t0, 1), "dataset_id": prod["dataset_id"],
                                    "dataset_version": prod.get("dataset_version")}) + "\n")
            print(f"{key:10s} {tag:8s} {mb:8.1f} MB in {time.time() - t0:5.0f}s")
    if args.dry_run:
        print(f"TOTAL estimate ~{total_mb / 1024:.1f} GB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
