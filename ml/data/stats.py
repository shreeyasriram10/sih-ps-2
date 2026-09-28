"""Normalization statistics from TRAIN dates only (guard days excluded).

Inputs: mean/std over ocean cells, excluding values that were gap-filled.
Target: mean/std per native level and per standard level over valid cells.

Usage (from ml/):
    python -m data.stats --config config.yaml
"""
from __future__ import annotations

import argparse
import json
import sys

import numpy as np
import xarray as xr

from common.config import load_config, provenance, resolve, split_dates


def masked_mean_std(arr: xr.DataArray, valid: xr.DataArray, dims) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    a = arr.where(valid)
    n = a.count(dims)
    m = a.mean(dims)
    s = a.std(dims)
    return m.values, s.values, n.values


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", required=True)
    args = ap.parse_args(argv)
    cfg = load_config(args.config)
    proc = resolve(cfg, "processed")
    ds = xr.open_zarr(proc / f"{cfg['domain']['name']}.zarr")
    train = ds.sel(time=split_dates(cfg)["train"])
    ocean = ds["ocean_mask"]

    stats = {"provenance": provenance(cfg), "train_dates": [str(train.time.values[0])[:10], str(train.time.values[-1])[:10]],
             "n_train_days": int(train.sizes["time"]), "inputs": {}, "target": {}}
    for name in cfg["inputs"]:
        valid = ocean & (train[f"{name}_filled"] == 0) & train[name].notnull()
        m, s, n = masked_mean_std(train[name], valid, ("time", "latitude", "longitude"))
        stats["inputs"][name] = {"mean": float(m), "std": float(s), "n": int(n)}
        print(f"{name:8s} mean={float(m):9.4f} std={float(s):8.4f} n={int(n)}")

    for var, zdim, vmask in (("thetao", "depth", "level_valid"), ("thetao_std", "std_depth", "std_level_valid")):
        m, s, n = masked_mean_std(train[var], ds[vmask], ("time", "latitude", "longitude"))
        stats["target"][var] = {"levels": ds[zdim].values.round(3).tolist(), "mean": m.tolist(), "std": s.tolist(),
                                "n": n.astype(int).tolist()}
    with open(proc / "stats.json", "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)
    print(f"wrote {proc / 'stats.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
