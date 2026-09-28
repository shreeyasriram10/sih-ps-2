"""Regrid raw CMEMS downloads onto the common 0.25 deg grid and write one zarr store.

Order matters: the GLORYS target is processed first because it defines the ocean
mask (surface-valid cells, largest connected water body) and per-level validity
(shelf / seafloor). Inputs are then regridded, gaps over ocean are filled by
nearest neighbour, and the fill is recorded in a per-variable mask so no filled
value is ever mistaken for an observation.

Usage (from ml/):
    python -m data.build_dataset --config config.yaml
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import dask.array as da
import numpy as np
import pandas as pd
import xarray as xr
from scipy import ndimage

from common.config import all_years, load_config, provenance, resolve
from data.regrid import ConservativeRegridder, target_axis

RENAME = {"lat": "latitude", "lon": "longitude", "nav_lat": "latitude", "nav_lon": "longitude"}


# ---------------------------------------------------------------- helpers
def grid(cfg):
    d, r = cfg["domain"], cfg["grid"]["res_deg"]
    return target_axis(*d["lat"], r), target_axis(*d["lon"], r)


def daily_times(cfg) -> pd.DatetimeIndex:
    ys = all_years(cfg)
    return pd.date_range(f"{ys[0]}-01-01", f"{ys[-1]}-12-31", freq="D")


def open_raw(path: Path) -> xr.Dataset:
    ds = xr.open_dataset(path)
    ds = ds.rename({k: v for k, v in RENAME.items() if k in ds.dims or k in ds.coords})
    # CMEMS catalogue lists GLORYS depth deepest-first; everything below assumes ascending axes
    for c in ("latitude", "longitude", "depth"):
        if c in ds.dims and ds[c].size > 1 and ds[c].values[0] > ds[c].values[-1]:
            ds = ds.sortby(c)
    return ds


def raw_files(cfg, key) -> list[Path]:
    files = sorted((resolve(cfg, "raw") / key).glob(f"{key}_*.nc"))
    return [f for f in files if not f.name.endswith(".part.nc")]


def to_daily(da_: xr.DataArray, prod: dict) -> xr.DataArray:
    """Hourly -> daily UTC mean (needs >= min_hours); daily stamps floored to the date."""
    if prod.get("aggregate") == "hourly_to_daily":
        day = da_["time"].dt.floor("D")
        count = da_.notnull().groupby(day).sum("time")
        mean = da_.groupby(day).mean("time")
        mean = mean.where(count >= prod.get("min_hours", 20))
        return mean.rename({"floor": "time"}) if "floor" in mean.dims else mean
    return da_.assign_coords(time=da_["time"].dt.floor("D"))


def convert_units(arr: np.ndarray, prod: dict, var: str) -> np.ndarray:
    conv = prod.get("convert", {}).get(var)
    if conv == "K_to_C":
        return arr - 273.15
    if conv is not None:
        raise ValueError(f"unknown conversion {conv}")
    return arr


def largest_component(mask: np.ndarray) -> np.ndarray:
    lab, n = ndimage.label(mask)  # 4-connectivity
    if n == 0:
        return mask
    sizes = ndimage.sum(mask, lab, index=range(1, n + 1))
    return lab == (1 + int(np.argmax(sizes)))


def nn_fill(field: np.ndarray, ocean: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Fill NaN ocean cells from the nearest finite cell. Returns (filled, filled_mask)."""
    finite = np.isfinite(field)
    need = ocean & ~finite
    if not need.any():
        return np.where(ocean, field, np.nan), need
    if not finite.any():
        return np.full_like(field, np.nan), ocean.copy()
    _, (iy, ix) = ndimage.distance_transform_edt(~finite, return_indices=True)
    out = field[iy, ix]
    return np.where(ocean, out, np.nan).astype(np.float32), need


def interp_to_std(profile_block: np.ndarray, depth: np.ndarray, std: np.ndarray) -> np.ndarray:
    """Linear interpolation along axis 0 (depth). Above the top native level uses the top value
    (GLORYS top level is 0.49 m, used as '0 m'). Below the deepest valid level -> NaN."""
    nz = profile_block.shape[0]
    flat = profile_block.reshape(nz, -1)
    out = np.full((std.size, flat.shape[1]), np.nan, dtype=np.float32)
    for k, z in enumerate(std):
        if z <= depth[0]:
            out[k] = flat[0]
            continue
        j = np.searchsorted(depth, z)  # depth[j-1] < z <= depth[j]
        if j >= nz:
            continue
        w = (z - depth[j - 1]) / (depth[j] - depth[j - 1])
        out[k] = (1 - w) * flat[j - 1] + w * flat[j]  # NaN if either bracket is invalid
    return out.reshape((std.size,) + profile_block.shape[1:])


# ---------------------------------------------------------------- template
def create_store(cfg, store: Path, depth: np.ndarray):
    lat, lon = grid(cfg)
    times = daily_times(cfg)
    std = np.asarray(cfg["depth"]["standard_levels"], dtype=np.float32)
    nt, ny, nx, nz = len(times), len(lat), len(lon), len(depth)
    ct = cfg["build"]["time_chunk"]

    def empty(shape, chunks, dtype=np.float32, fill=np.nan):
        return da.full(shape, fill, dtype=dtype, chunks=chunks)

    data_vars = {
        "thetao": (("time", "depth", "latitude", "longitude"), empty((nt, nz, ny, nx), (ct, nz, ny, nx))),
        "thetao_std": (("time", "std_depth", "latitude", "longitude"),
                       empty((nt, std.size, ny, nx), (ct, std.size, ny, nx))),
    }
    for name in cfg["inputs"]:
        data_vars[name] = (("time", "latitude", "longitude"), empty((nt, ny, nx), (ct, ny, nx)))
        data_vars[f"{name}_filled"] = (("time", "latitude", "longitude"),
                                       empty((nt, ny, nx), (ct, ny, nx), dtype=np.uint8, fill=0))
    ds = xr.Dataset(data_vars, coords=dict(time=times, latitude=lat, longitude=lon,
                                           depth=depth.astype(np.float32), std_depth=std))
    ds.attrs["provenance"] = json.dumps(provenance(cfg))
    # Write the all-NaN template eagerly. With a lazy template (compute=False) unwritten chunks
    # (days without raw data) read back as zarr's default fill value 0, which would silently
    # enter normalization stats as real values. Verified by tests/test_pipeline_synthetic.py.
    ds.to_zarr(store, mode="w", consolidated=True)


def write_region(store: Path, ds: xr.Dataset, t0: int):
    """Write data variables (no coordinates) into the time window [t0, t0+nt) of an existing store."""
    ds = ds.drop_vars(list(ds.coords))
    ds.to_zarr(store, region={"time": slice(t0, t0 + ds.sizes["time"])})


# ---------------------------------------------------------------- builders
def build_target(cfg, store: Path, report: dict):
    prod = cfg["products"]["glorys"]
    files = raw_files(cfg, "glorys")
    if not files:
        raise FileNotFoundError("no raw GLORYS files; run data.download first")
    lat, lon = grid(cfg)
    times = daily_times(cfg)
    std = np.asarray(cfg["depth"]["standard_levels"], dtype=np.float32)
    min_cov = cfg["build"]["min_coverage"]

    first = open_raw(files[0])
    depth = first["depth"].values
    keep = depth <= cfg["depth"]["max_native_m"]
    depth = depth[keep]
    rg = ConservativeRegridder(first.latitude.values, first.longitude.values, lat, lon, min_cov)
    create_store(cfg, store, depth)

    level_valid = None
    days_seen = 0
    for f in files:
        ds = open_raw(f)
        assert np.allclose(ds.latitude.values, first.latitude.values), f"grid changed in {f}"
        th = to_daily(ds[prod["variables"][0]], prod).isel(depth=np.where(keep)[0])
        tidx = times.get_indexer(pd.DatetimeIndex(th.time.values))
        sel = tidx >= 0
        th = th.isel(time=np.where(sel)[0])
        tidx = tidx[sel]
        if th.sizes["time"] == 0:
            continue
        assert np.all(np.diff(tidx) == 1), f"non-contiguous days in {f}"
        out = np.empty((th.sizes["time"], depth.size, lat.size, lon.size), np.float32)
        for i in range(th.sizes["time"]):
            out[i], _ = rg(th.isel(time=i).values)
        valid_now = np.isfinite(out[0])
        if level_valid is None:
            level_valid = valid_now
        elif not np.array_equal(level_valid, valid_now):
            report.setdefault("warnings", []).append(f"GLORYS validity pattern changed in {f.name}")
            level_valid &= valid_now
        stdv = np.stack([interp_to_std(o, depth, std) for o in out])
        write_region(store, xr.Dataset({
            "thetao": (("time", "depth", "latitude", "longitude"), out),
            "thetao_std": (("time", "std_depth", "latitude", "longitude"), stdv)}), int(tidx[0]))
        days_seen += len(tidx)
        print(f"glorys {f.name}: {len(tidx)} days")

    ocean = largest_component(level_valid[0])
    lv = level_valid & ocean[None]
    std_valid = np.isfinite(interp_to_std(np.where(lv, 0.0, np.nan).astype(np.float32), depth, std))
    static = xr.Dataset({
        "ocean_mask": (("latitude", "longitude"), ocean),
        "level_valid": (("depth", "latitude", "longitude"), lv),
        "std_level_valid": (("std_depth", "latitude", "longitude"), std_valid),
    })
    static.to_zarr(store, mode="a", consolidated=True)
    report["target"] = {
        "days_present": days_seen, "days_expected": len(times),
        "native_levels": depth.round(2).tolist(),
        "ocean_cells": int(ocean.sum()),
        "cells_dropped_as_disconnected": int(level_valid[0].sum() - ocean.sum()),
        "valid_cells_per_std_level": dict(zip(std.astype(int).tolist(), std_valid.sum((1, 2)).astype(int).tolist())),
    }
    return ocean


def build_input(cfg, store: Path, name: str, ocean: np.ndarray, report: dict):
    spec = cfg["inputs"][name]
    key, var = spec["product"], spec["variable"]
    prod = cfg["products"][key]
    files = raw_files(cfg, key)
    if not files:
        raise FileNotFoundError(f"no raw files for {key}")
    lat, lon = grid(cfg)
    times = daily_times(cfg)
    first = open_raw(files[0])
    rg = ConservativeRegridder(first.latitude.values, first.longitude.values, lat, lon,
                               cfg["build"]["min_coverage"])
    n_ocean = int(ocean.sum())
    per_day_nan_frac = np.full(len(times), np.nan)
    for f in files:
        ds = open_raw(f)
        arr = ds[var]
        if "depth" in arr.dims:
            arr = arr.isel(depth=0)
        arr = to_daily(arr, prod)
        tidx = times.get_indexer(pd.DatetimeIndex(arr.time.values))
        sel = tidx >= 0
        arr, tidx = arr.isel(time=np.where(sel)[0]), tidx[sel]
        if arr.sizes["time"] == 0:
            continue
        assert np.all(np.diff(tidx) == 1), f"non-contiguous days in {f}"
        vals = np.empty((arr.sizes["time"], lat.size, lon.size), np.float32)
        filled = np.zeros_like(vals, dtype=np.uint8)
        for i in range(arr.sizes["time"]):
            r, _ = rg(convert_units(arr.isel(time=i).values.astype(np.float64), prod, var))
            per_day_nan_frac[tidx[i]] = float((ocean & ~np.isfinite(r)).sum()) / n_ocean
            vals[i], m = nn_fill(r, ocean)
            filled[i] = m
        write_region(store, xr.Dataset({name: (("time", "latitude", "longitude"), vals),
                                        f"{name}_filled": (("time", "latitude", "longitude"), filled)}),
                     int(tidx[0]))
        print(f"{name} {f.name}: {len(tidx)} days")
    missing_days = int(np.isnan(per_day_nan_frac).sum())
    report.setdefault("inputs", {})[name] = {
        "product": key, "variable": var,
        "days_missing_entirely": missing_days,
        "ocean_gap_fraction_before_fill_mean": float(np.nanmean(per_day_nan_frac)) if missing_days < len(times) else None,
        "ocean_gap_fraction_before_fill_max": float(np.nanmax(per_day_nan_frac)) if missing_days < len(times) else None,
    }


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", required=True)
    args = ap.parse_args(argv)
    cfg = load_config(args.config)
    proc = resolve(cfg, "processed")
    proc.mkdir(parents=True, exist_ok=True)
    store = proc / f"{cfg['domain']['name']}.zarr"
    report = {"provenance": provenance(cfg)}
    ocean = build_target(cfg, store, report)
    for name in cfg["inputs"]:
        build_input(cfg, store, name, ocean, report)
    with open(proc / "build_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"wrote {store} and build_report.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
