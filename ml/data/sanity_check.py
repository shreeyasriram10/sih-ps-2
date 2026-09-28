"""Sanity plots and coverage statistics for the processed dataset (Phase 1 stop condition).

Writes:
    outputs/figures/data/*.png
    outputs/data_sanity.json   (all numbers)
    outputs/data_sanity.md     (human-readable tables)

GLORYS inversion frequency is computed on TRAIN dates only, so the decision about the
physics term (Phase 3) does not peek at val/test.

Usage (from ml/):
    python -m data.sanity_check --config config.yaml
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import xarray as xr  # noqa: E402

from common.config import load_config, provenance, resolve, season_of_month, split_dates  # noqa: E402

SEASONS = ["DJF", "MAM", "JJAS", "ON"]


def region_masks(cfg, lat, lon) -> dict[str, np.ndarray]:
    out = {}
    for name, r in cfg["regions"].items():
        la = (lat >= r["lat"][0]) & (lat < r["lat"][1])
        lo = (lon >= r["lon"][0]) & (lon < r["lon"][1])
        out[name] = la[:, None] & lo[None, :]
    return out


def season_da(ds) -> xr.DataArray:
    return xr.DataArray(season_of_month(ds["time"].dt.month.values), dims="time", coords={"time": ds.time},
                        name="season")


def plot_season_maps(da_: xr.DataArray, seasons: xr.DataArray, title: str, path: Path, cmap="viridis"):
    clim = da_.groupby(seasons).mean("time").compute()
    finite = clim.values[np.isfinite(clim.values)]
    vmin, vmax = np.percentile(finite, [2, 98]) if finite.size else (0, 1)
    fig, axes = plt.subplots(1, 4, figsize=(18, 3.8), constrained_layout=True)
    im = None
    for ax, s in zip(axes, SEASONS):
        if s in clim["season"].values:
            im = ax.pcolormesh(da_.longitude, da_.latitude, clim.sel(season=s), vmin=vmin, vmax=vmax,
                               cmap=cmap, shading="auto")
        ax.set_title(f"{title} {s}")
        ax.set_aspect("equal")
    if im is not None:
        fig.colorbar(im, ax=axes, shrink=0.8)
    fig.savefig(path, dpi=110)
    plt.close(fig)


def inversion_stats(ds, cfg, dates, regions) -> dict:
    """Fraction of (cell, day) profiles with a temperature increase with depth between adjacent
    valid native levels in the upper `inversion_max_depth_m`, for several dT thresholds."""
    thr = cfg["sanity"]["inversion_thresholds_c"]
    zmax = cfg["sanity"]["inversion_max_depth_m"]
    depth = ds.depth.values
    kz = np.where(depth <= zmax)[0]
    th = ds["thetao"].isel(depth=kz)
    lv = ds["level_valid"].isel(depth=kz).values
    ocean = ds["ocean_mask"].values
    seasons = season_of_month(pd.DatetimeIndex(dates).month)
    counts = {r: {s: np.zeros(len(thr) + 1) for s in SEASONS + ["ALL"]} for r in list(regions) + ["domain"]}
    max_dt = []
    step = 32
    for i0 in range(0, len(dates), step):
        block = th.sel(time=dates[i0:i0 + step]).values  # (t, z, y, x)
        both = lv[:-1] & lv[1:]
        dT = np.where(both[None], block[:, 1:] - block[:, :-1], np.nan)  # >0: warmer below
        worst = np.nanmax(np.where(np.isfinite(dT), dT, -np.inf), axis=1)  # (t, y, x)
        worst[~np.isfinite(worst)] = np.nan
        max_dt.append(worst[:, ocean])
        for r, rm in list(regions.items()) + [("domain", np.ones_like(ocean))]:
            cells = rm & ocean
            w = worst[:, cells]  # (t, n)
            for ti in range(w.shape[0]):
                s = seasons[i0 + ti]
                valid = np.isfinite(w[ti])
                row = [valid.sum()] + [(w[ti][valid] > t).sum() for t in thr]
                counts[r][s] += row
                counts[r]["ALL"] += row
    res = {}
    for r, bys in counts.items():
        res[r] = {s: ({f"frac_dT_gt_{t}": float(v[k + 1] / v[0]) for k, t in enumerate(thr)} | {"n_profiles": int(v[0])})
                  for s, v in bys.items() if v[0] > 0}
    allmax = np.concatenate([m.ravel() for m in max_dt])
    res["max_inversion_percentiles_c"] = {p: float(np.nanpercentile(allmax, p)) for p in (50, 90, 99, 99.9)}
    res["definition"] = (f"per (cell, day): max over adjacent valid native levels in 0-{zmax} m of T(z_k+1)-T(z_k); "
                         "profile counts as inverted if that exceeds the threshold. TRAIN dates only.")
    return res


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", required=True)
    args = ap.parse_args(argv)
    cfg = load_config(args.config)
    proc = resolve(cfg, "processed")
    figs = resolve(cfg, "outputs") / "figures" / "data"
    figs.mkdir(parents=True, exist_ok=True)
    ds = xr.open_zarr(proc / f"{cfg['domain']['name']}.zarr")
    lat, lon = ds.latitude.values, ds.longitude.values
    ocean = ds["ocean_mask"].values
    regions = region_masks(cfg, lat, lon)
    seasons = season_da(ds)
    splits = split_dates(cfg)
    out = {"provenance": provenance(cfg), "ocean_cells": int(ocean.sum()),
           "region_ocean_cells": {r: int((m & ocean).sum()) for r, m in regions.items()}}

    # ---- mask figure
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.pcolormesh(lon, lat, ocean, shading="auto", cmap="Blues")
    for r, spec in cfg["regions"].items():
        ax.add_patch(plt.Rectangle((spec["lon"][0], spec["lat"][0]), spec["lon"][1] - spec["lon"][0],
                                   spec["lat"][1] - spec["lat"][0], fill=False, ec="r"))
        ax.text(spec["lon"][0] + 0.3, spec["lat"][1] - 1, r, color="r")
    ax.set_title("Ocean mask (largest connected water body) and evaluation sub-regions")
    fig.savefig(figs / "mask_regions.png", dpi=110)
    plt.close(fig)

    # ---- inputs: coverage, ranges, maps, time series
    out["inputs"] = {}
    plaus = cfg["sanity"]["plausible_range"]
    for name in cfg["inputs"]:
        v, f = ds[name], ds[f"{name}_filled"]
        stats = {}
        for split, dates in splits.items():
            vs = v.sel(time=dates).where(ds.ocean_mask)
            fs = f.sel(time=dates).where(ds.ocean_mask)
            stats[split] = {
                "days": len(dates),
                "days_all_nan": int((vs.count(("latitude", "longitude")) == 0).sum()),
                "filled_fraction": float(fs.mean()),
                "min": float(vs.min()), "p1": float(vs.quantile(0.01)), "mean": float(vs.mean()),
                "p99": float(vs.quantile(0.99)), "max": float(vs.max()),
            }
        lo_, hi_ = plaus[name]
        stats["outside_plausible_range"] = bool(min(s["min"] for s in stats.values() if isinstance(s, dict)) < lo_
                                                or max(s["max"] for s in stats.values() if isinstance(s, dict)) > hi_)
        out["inputs"][name] = stats
        plot_season_maps(v.where(ds.ocean_mask), seasons, name, figs / f"input_{name}_seasonal.png",
                         cmap="RdBu_r" if name.startswith(("sla", "cur", "wind")) else "viridis")
        ts = v.where(ds.ocean_mask).mean(("latitude", "longitude")).compute()
        fr = f.where(ds.ocean_mask).mean(("latitude", "longitude")).compute()
        fig, ax = plt.subplots(2, 1, figsize=(12, 4), sharex=True)
        ax[0].plot(ts.time, ts)
        ax[0].set_ylabel(f"domain mean {name}")
        ax[1].plot(fr.time, fr, color="C3")
        ax[1].set_ylabel("filled frac")
        for split, dates in splits.items():
            ax[0].axvspan(dates[0], dates[-1], alpha=0.08, color={"train": "g", "val": "b", "test": "r"}[split])
        fig.savefig(figs / f"input_{name}_timeseries.png", dpi=110)
        plt.close(fig)
        print(f"{name}: done")

    # ---- target: maps at selected depths, mean profiles, coverage
    th = ds["thetao_std"]
    for z in cfg["sanity"]["map_depths"]:
        plot_season_maps(th.sel(std_depth=z).where(ds.std_level_valid.sel(std_depth=z)), seasons,
                         f"T {z} m", figs / f"target_T{z}m_seasonal.png", cmap="turbo")
    fig, ax = plt.subplots(1, 4, figsize=(16, 5), sharey=True)
    train_th = th.sel(time=splits["train"])
    tseas = season_da(train_th)
    for a, s in zip(ax, SEASONS):
        sub = train_th.isel(time=np.where(tseas.values == s)[0])
        for r, rm in regions.items():
            prof = sub.where(xr.DataArray(rm & ocean, dims=("latitude", "longitude"))).mean(("time", "latitude", "longitude")).compute()
            a.plot(prof, prof.std_depth, marker=".", label=r)
        a.set_title(f"GLORYS mean T, train, {s}")
        a.set_xlabel("°C")
    ax[0].invert_yaxis()
    ax[0].set_ylabel("depth (m)")
    ax[-1].legend()
    fig.savefig(figs / "target_mean_profiles.png", dpi=110)
    plt.close(fig)
    out["target"] = {
        "std_levels": ds.std_depth.values.tolist(),
        "valid_cells_per_std_level": ds.std_level_valid.sum(("latitude", "longitude")).values.astype(int).tolist(),
        "days_all_nan": int((th.isel(std_depth=0).count(("latitude", "longitude")) == 0).sum()),
        "min": float(th.min()), "max": float(th.max()),
    }

    # ---- GLORYS inversions (train only)
    out["glorys_inversions"] = inversion_stats(ds, cfg, splits["train"], regions)
    print("inversions: done")

    # ---- Argo
    argo_csv = proc / "argo_profiles.csv"
    if argo_csv.exists():
        df = pd.read_csv(argo_csv, parse_dates=["time"])
        df["season"] = season_of_month(df["time"].dt.month)
        df["split"] = "none"
        for split, dates in splits.items():
            df.loc[df["time"].dt.normalize().isin(dates), "split"] = split
        out["argo"] = {
            "n_profiles": int(len(df)),
            "per_split": df["split"].value_counts().to_dict(),
            "per_split_season": {f"{a}/{b}": int(n) for (a, b), n in df.groupby(["split", "season"]).size().items()},
        }
        fig, ax = plt.subplots(figsize=(8, 5))
        ax.pcolormesh(lon, lat, ocean, shading="auto", cmap="Greys", alpha=0.3)
        for split, c in (("train", "g"), ("val", "b"), ("test", "r")):
            d = df[df.split == split]
            ax.scatter(d.lon, d.lat, s=3, c=c, label=f"{split} ({len(d)})")
        ax.legend()
        ax.set_title("Argo profiles after QC")
        fig.savefig(figs / "argo_locations.png", dpi=110)
        plt.close(fig)
    else:
        out["argo"] = "argo_profiles.csv not found; run python -m data.argo"

    outputs = resolve(cfg, "outputs")
    with open(outputs / "data_sanity.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, default=str)
    write_markdown(out, outputs / "data_sanity.md", cfg)
    print(f"wrote {outputs / 'data_sanity.json'}, data_sanity.md and {figs}")
    return 0


def write_markdown(out: dict, path: Path, cfg: dict):
    L = ["# Data sanity report", "", f"Config hash `{out['provenance']['config_hash']}`, "
         f"split {cfg['split']['years']} (guard {cfg['split']['guard_days']} d).", "",
         f"Ocean cells: {out['ocean_cells']}; per region: {out['region_ocean_cells']}", "",
         "## Inputs", "", "| var | split | days | all-NaN days | filled frac | min | p1 | mean | p99 | max |",
         "|---|---|---|---|---|---|---|---|---|---|"]
    for name, st in out["inputs"].items():
        for split in ("train", "val", "test"):
            s = st[split]
            L.append(f"| {name} | {split} | {s['days']} | {s['days_all_nan']} | {s['filled_fraction']:.4f} | "
                     f"{s['min']:.3f} | {s['p1']:.3f} | {s['mean']:.3f} | {s['p99']:.3f} | {s['max']:.3f} |")
        if st["outside_plausible_range"]:
            L.append(f"| **{name}: values outside plausible range, investigate** |||||||||")
    t = out["target"]
    L += ["", "## Target (GLORYS on standard levels)", "",
          "| level (m) | " + " | ".join(str(int(z)) for z in t["std_levels"]) + " |",
          "|---|" + "---|" * len(t["std_levels"]),
          "| valid cells | " + " | ".join(str(n) for n in t["valid_cells_per_std_level"]) + " |", "",
          f"Days with no target: {t['days_all_nan']}; range {t['min']:.2f} to {t['max']:.2f} °C", "",
          "## GLORYS temperature inversions (train dates)", "", out["glorys_inversions"]["definition"], ""]
    inv = out["glorys_inversions"]
    thr = cfg["sanity"]["inversion_thresholds_c"]
    L.append("| region | season | n | " + " | ".join(f"frac dT>{x}" for x in thr) + " |")
    L.append("|---|---|---|" + "---|" * len(thr))
    for r, bys in inv.items():
        if not isinstance(bys, dict) or r in ("max_inversion_percentiles_c",):
            continue
        for s, v in bys.items():
            L.append(f"| {r} | {s} | {v['n_profiles']} | " + " | ".join(f"{v[f'frac_dT_gt_{x}']:.4f}" for x in thr) + " |")
    L += ["", f"Max-inversion percentiles (°C): {inv['max_inversion_percentiles_c']}", "", "## Argo", "",
          f"```\n{json.dumps(out['argo'], indent=2)}\n```"]
    path.write_text("\n".join(L), encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
