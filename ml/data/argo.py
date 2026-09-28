"""Fetch Argo core T profiles for the domain with argopy and put them on the standard depths.

- argopy 'standard' user mode: adjusted values where available, only good-QC data.
- We additionally keep only TEMP_QC / PRES_QC in {1, 2} and POSITION_QC / TIME_QC in {1, 2} when present.
- Pressure -> depth with Saunders (1981); interpolation to standard depths is linear and
  refused when the bracketing observations are further apart than the configured max gap.
- Levels shallower than the shallowest observation are filled with it only if that observation
  is within `surface_extrapolate_max_m` (Argo rarely samples above ~5 dbar); count is reported.

Note: GLORYS assimilates Argo, so Argo matchups are NOT independent of the training target.

Usage (from ml/):
    python -m data.argo --config config.yaml
"""
from __future__ import annotations

import argparse
import json
import sys

import numpy as np
import pandas as pd
import xarray as xr

from common.config import all_years, load_config, provenance, resolve

GOOD = {1, 2}


def pres_to_depth(p: np.ndarray, lat_deg: float | np.ndarray) -> np.ndarray:
    """Saunders (1981): z = (1 - c1) p - c2 p^2 (p in dbar, z in m)."""
    s2 = np.sin(np.deg2rad(lat_deg)) ** 2
    c1 = (5.92 + 5.25 * s2) * 1e-3
    return (1 - c1) * p - 2.21e-6 * p ** 2


def max_gap(z: float, rules: list[list[float]]) -> float:
    for upto, gap in rules:
        if z <= upto:
            return gap
    return rules[-1][1]


def profile_to_std(depth: np.ndarray, temp: np.ndarray, std: np.ndarray, gap_rules, surf_max: float):
    """Returns (T on std levels, whether surface extrapolation was used)."""
    ok = np.isfinite(depth) & np.isfinite(temp)
    depth, temp = depth[ok], temp[ok]
    out = np.full(std.size, np.nan, dtype=np.float32)
    if depth.size < 2:
        return out, False
    order = np.argsort(depth)
    depth, temp = depth[order], temp[order]
    depth, uniq = np.unique(depth, return_index=True)
    temp = temp[uniq]
    used_surface = False
    for k, z in enumerate(std):
        if z < depth[0]:
            if depth[0] <= surf_max:
                out[k] = temp[0]
                used_surface = True
            continue
        j = np.searchsorted(depth, z)
        if j < depth.size and depth[j] == z:
            out[k] = temp[j]
            continue
        if j == 0 or j >= depth.size:
            continue
        if depth[j] - depth[j - 1] > max_gap(z, gap_rules):
            continue
        w = (z - depth[j - 1]) / (depth[j] - depth[j - 1])
        out[k] = (1 - w) * temp[j - 1] + w * temp[j]
    return out, used_surface


def qc_ok(ds: xr.Dataset, name: str) -> np.ndarray:
    if name not in ds:
        return np.ones(ds[list(ds.data_vars)[0]].shape, dtype=bool)
    v = ds[name].values
    return np.isin(v.astype(float), list(GOOD))


def fetch_year(cfg, year: int) -> xr.Dataset:
    # erddap.ifremer.fr does not send its intermediate certificate; verify against the OS trust
    # store (which can complete the chain) instead of disabling verification.
    import truststore

    truststore.inject_into_ssl()
    from argopy import DataFetcher

    a = cfg["argo"]
    d = cfg["domain"]
    box = [d["lon"][0], d["lon"][1], d["lat"][0], d["lat"][1], 0, a["max_pres_dbar"],
           f"{year}-01-01", f"{year + 1}-01-01"]
    f = DataFetcher(src=a["source"], mode=a["mode"], parallel=a.get("parallel", True), progress=False)
    return f.region(box).to_xarray()


def points_to_profiles(pts: xr.Dataset, cfg) -> pd.DataFrame | None:
    a = cfg["argo"]
    std = np.asarray(cfg["depth"]["standard_levels"], dtype=float)
    keep = qc_ok(pts, "TEMP_QC") & qc_ok(pts, "PRES_QC") & qc_ok(pts, "POSITION_QC") & qc_ok(pts, "TIME_QC")
    df = pd.DataFrame({
        "platform": pts["PLATFORM_NUMBER"].values.astype(np.int64),
        "cycle": pts["CYCLE_NUMBER"].values.astype(np.int64),
        "time": pd.to_datetime(pts["TIME"].values),
        "lat": pts["LATITUDE"].values.astype(float),
        "lon": pts["LONGITUDE"].values.astype(float),
        "pres": pts["PRES"].values.astype(float),
        "temp": pts["TEMP"].values.astype(float),
        "data_mode": pts["DATA_MODE"].values.astype(str) if "DATA_MODE" in pts else "?",
        "direction": pts["DIRECTION"].values.astype(str) if "DIRECTION" in pts else "A",
    })[keep]
    if df.empty:
        return None
    rows, n_surf = [], 0
    for (plat, cyc, direc), g in df.groupby(["platform", "cycle", "direction"], sort=False):
        lat = g["lat"].iloc[0]
        z = pres_to_depth(g["pres"].values, lat)
        t_std, surf = profile_to_std(z, g["temp"].values, std, a["max_gap_rules"], a["surface_extrapolate_max_m"])
        if np.isfinite(t_std).sum() < a["min_valid_std_levels"]:
            continue
        n_surf += surf
        rows.append({"platform": plat, "cycle": cyc, "direction": direc, "time": g["time"].iloc[0], "lat": lat,
                     "lon": g["lon"].iloc[0], "data_mode": g["data_mode"].iloc[0],
                     "surface_extrapolated": surf, "shallowest_m": float(np.nanmin(z)),
                     "deepest_m": float(np.nanmax(z)), **{f"T_{int(s)}": v for s, v in zip(std, t_std)}})
    return pd.DataFrame(rows) if rows else None


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", required=True)
    ap.add_argument("--years", nargs="*", type=int)
    args = ap.parse_args(argv)
    cfg = load_config(args.config)
    out_dir = resolve(cfg, "processed")
    out_dir.mkdir(parents=True, exist_ok=True)
    raw_dir = resolve(cfg, "raw") / "argo"
    raw_dir.mkdir(parents=True, exist_ok=True)

    frames = []
    for y in args.years or all_years(cfg):
        raw_file = raw_dir / f"argo_points_{y}.nc"
        if raw_file.exists():
            pts = xr.open_dataset(raw_file)
        else:
            pts = fetch_year(cfg, y)
            pts.to_netcdf(raw_file)
        prof = points_to_profiles(pts, cfg)
        n = 0 if prof is None else len(prof)
        print(f"argo {y}: {pts.sizes.get('N_POINTS', 0)} points -> {n} usable profiles")
        if prof is not None:
            frames.append(prof)
    df = pd.concat(frames, ignore_index=True).sort_values("time")
    df.to_csv(out_dir / "argo_profiles.csv", index=False)
    summary = {
        "provenance": provenance(cfg),
        "n_profiles": int(len(df)),
        "n_floats": int(df["platform"].nunique()),
        "per_year": {str(k): int(v) for k, v in df.groupby(df["time"].dt.year).size().items()},
        "data_mode_counts": {str(k): int(v) for k, v in df["data_mode"].value_counts().items()},
        "surface_extrapolated_profiles": int(df["surface_extrapolated"].sum()),
        "valid_profiles_per_std_level": {c[2:]: int(df[c].notna().sum()) for c in df.columns if c.startswith("T_")},
        "note": "GLORYS assimilates Argo; matchups are not independent of the training target.",
    }
    with open(out_dir / "argo_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(json.dumps({k: v for k, v in summary.items() if k != "provenance"}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
