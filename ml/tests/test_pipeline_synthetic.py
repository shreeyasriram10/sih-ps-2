"""End-to-end test of build_dataset -> stats -> sanity_check on tiny SYNTHETIC files shaped
like the CMEMS downloads. This only tests code paths; nothing here is a result."""
import copy
import json

import numpy as np
import pandas as pd
import pytest
import xarray as xr
import yaml

from common.config import ML_ROOT, load_config
from data import build_dataset, sanity_check, stats

LAT = (5.0, 6.5)
LON = (45.0, 46.5)
MONTHS = ["2017-01", "2018-01", "2019-01"]


def axis(lo, hi, step, offset):
    """centres k*step + offset covering [lo, hi]."""
    k0, k1 = int(np.floor((lo - offset) / step)), int(np.ceil((hi - offset) / step))
    return np.arange(k0, k1 + 1) * step + offset


def write(ds, raw, key, month):
    d = raw / key
    d.mkdir(parents=True, exist_ok=True)
    ds.to_netcdf(d / f"{key}_{month}.nc")


def make_raw(raw):
    pad = 0.25
    blat, blon = (LAT[0] - pad, LAT[1] + pad), (LON[0] - pad, LON[1] + pad)
    for month in MONTHS:
        days = pd.date_range(f"{month}-01", periods=31, freq="D")
        # GLORYS: 1/12 deg centred on multiples of 1/12; land in the NW corner; isolated lake
        la, lo = axis(*blat, 1 / 12, 0), axis(*blon, 1 / 12, 0)
        depth = np.array([0.494, 1.54, 50.0, 100.0, 300.0, 1062.4])
        T = 28 - 0.02 * depth[None, :, None, None] + np.zeros((len(days), 1, la.size, lo.size))
        T = T + 0.1 * np.arange(len(days))[:, None, None, None] / 31
        LA, LO = la[:, None], lo[None, :]
        land = (LA > 6.2) & (LO < 45.6)
        # land barrier cutting off the NE corner cell -> isolated water body, must be dropped
        barrier = ((LA > 5.85) & (LA < 6.15) & (LO > 45.95)) | ((LO > 45.95) & (LO < 46.25) & (LA > 5.85))
        T[:, :, land | barrier] = np.nan
        T[:, 3, la < 5.3, :] = T[:, 2, la < 5.3, :] + 0.3  # inversion 50 -> 100 m in the south
        T[:, 5:, :, lo > 46.2] = np.nan  # shelf: no 1062 m level in the easternmost target column
        # written deepest-first and north-first, like some CMEMS files, to exercise axis sorting
        write(xr.Dataset({"thetao": (("time", "depth", "latitude", "longitude"), T[:, ::-1, ::-1].astype(np.float32))},
                         coords=dict(time=days, depth=depth[::-1], latitude=la[::-1], longitude=lo)),
              raw, "glorys", month)
        # OSTIA 0.05 deg (K), stamped 12:00
        la, lo = axis(*blat, 0.05, 0.025), axis(*blon, 0.05, 0.025)
        sst = np.full((len(days), la.size, lo.size), 301.15)
        sst[:, (la > 6.2)[:, None].repeat(lo.size, 1) & (lo < 45.6)[None, :]] = np.nan
        write(xr.Dataset({"analysed_sst": (("time", "latitude", "longitude"), sst.astype(np.float32))},
                         coords=dict(time=days + pd.Timedelta("12h"), latitude=la, longitude=lo)), raw, "sst", month)
        # 0.125 deg products; SSS carries a depth dim; SLA has a gap day
        la, lo = axis(*blat, 0.125, 0.0625), axis(*blon, 0.125, 0.0625)
        sos = np.full((len(days), 1, la.size, lo.size), 36.0, dtype=np.float32)
        write(xr.Dataset({"sos": (("time", "depth", "latitude", "longitude"), sos)},
                         coords=dict(time=days, depth=[0.0], latitude=la, longitude=lo)), raw, "sss", month)
        sla = np.full((len(days), la.size, lo.size), 0.05, dtype=np.float32)
        sla[3, 3:7, 3:7] = np.nan  # gap covering target cells in the SW -> must be NN-filled and flagged
        write(xr.Dataset({"sla": (("time", "latitude", "longitude"), sla)},
                         coords=dict(time=days, latitude=la, longitude=lo)), raw, "sla", month)
        # hourly winds 0.125 deg
        hours = pd.date_range(f"{month}-01", periods=31 * 24, freq="h")
        u = np.broadcast_to((np.arange(hours.size) % 24)[:, None, None], (hours.size, la.size, lo.size)).astype(np.float32)
        write(xr.Dataset({"eastward_wind": (("time", "latitude", "longitude"), u),
                          "northward_wind": (("time", "latitude", "longitude"), -u)},
                         coords=dict(time=hours, latitude=la, longitude=lo)), raw, "wind", month)
        # currents 0.25 deg with a depth dim
        la, lo = axis(*blat, 0.25, 0.125), axis(*blon, 0.25, 0.125)
        cu = np.full((len(days), 1, la.size, lo.size), 0.2, dtype=np.float32)
        write(xr.Dataset({"uo": (("time", "depth", "latitude", "longitude"), cu),
                          "vo": (("time", "depth", "latitude", "longitude"), -cu)},
                         coords=dict(time=days, depth=[0.0], latitude=la, longitude=lo)), raw, "cur", month)


@pytest.fixture(scope="module")
def built(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("pipe")
    cfg = yaml.safe_load(open(ML_ROOT / "config.yaml"))
    cfg = copy.deepcopy(cfg)
    cfg["domain"].update(name="synthetic", lat=list(LAT), lon=list(LON))
    cfg["split"]["years"] = {"train": [2017, 2017], "val": [2018, 2018], "test": [2019, 2019]}
    cfg["depth"]["standard_levels"] = [0, 10, 50, 75, 100, 200, 1000]
    cfg["regions"] = {"south": {"lat": [5.0, 5.25], "lon": [45.0, 46.5]}, "north": {"lat": [5.5, 6.5], "lon": [45.0, 46.5]}}
    cfg["sanity"]["map_depths"] = [0, 100]
    cfg["paths"] = {"raw": str(tmp / "raw"), "processed": str(tmp / "proc"), "outputs": str(tmp / "out")}
    (tmp / "out").mkdir()
    make_raw(tmp / "raw")
    cfg_path = tmp / "cfg.yaml"
    yaml.safe_dump(cfg, open(cfg_path, "w"))
    assert build_dataset.main(["--config", str(cfg_path)]) == 0
    assert stats.main(["--config", str(cfg_path)]) == 0
    assert sanity_check.main(["--config", str(cfg_path)]) == 0
    return tmp, load_config(cfg_path)


def test_store_contents(built):
    tmp, cfg = built
    ds = xr.open_zarr(tmp / "proc" / "synthetic.zarr")
    assert ds.sizes["latitude"] == 6 and ds.sizes["longitude"] == 6
    assert ds.sizes["time"] == 365 * 3
    ocean = ds.ocean_mask.values
    assert not ocean.all() and ocean.sum() > 20
    assert not ocean[-1, -1]  # isolated NE cell dropped by largest_component
    rep = json.load(open(tmp / "proc" / "build_report.json"))
    assert rep["target"]["cells_dropped_as_disconnected"] >= 1
    # units converted, constant fields preserved
    jan = ds.sel(time="2017-01-10")
    np.testing.assert_allclose(jan.sst.values[ocean], 28.0, atol=1e-4)
    np.testing.assert_allclose(jan.sss.values[ocean], 36.0, atol=1e-4)
    np.testing.assert_allclose(jan.cur_v.values[ocean], -0.2, atol=1e-5)
    np.testing.assert_allclose(jan.wind_u.values[ocean], 11.5, atol=1e-4)  # mean of 0..23
    # land stays NaN in inputs
    assert np.isnan(jan.sst.values[~ocean]).all()
    # months without raw files are NaN, not zero
    assert np.isnan(ds.sst.sel(time="2017-06-01").values).all()


def test_gap_fill_is_flagged(built):
    tmp, _ = built
    ds = xr.open_zarr(tmp / "proc" / "synthetic.zarr")
    day4 = ds.sel(time="2017-01-04")
    assert day4.sla_filled.values.sum() >= 1
    assert ds.sel(time="2017-01-05").sla_filled.values.sum() == 0
    np.testing.assert_allclose(day4.sla.values[ds.ocean_mask.values], 0.05, atol=1e-5)


def test_standard_levels_and_shelf(built):
    tmp, _ = built
    ds = xr.open_zarr(tmp / "proc" / "synthetic.zarr")
    t = ds.thetao_std.sel(time="2017-01-01")
    v = ds.std_level_valid
    # linear profile 28 - 0.02 z (north half, no inversion): 75 m -> 26.5
    north_ocean = (ds.latitude > 5.5) & ds.ocean_mask
    np.testing.assert_allclose(t.sel(std_depth=75).where(north_ocean & v.sel(std_depth=75)).max(), 26.5, atol=1e-3)
    # 1000 m needs the 1062 m level which is missing in the east -> invalid there
    assert not v.sel(std_depth=1000).isel(longitude=-1).any()
    assert v.sel(std_depth=1000).isel(longitude=2).any()


def test_stats_are_train_only(built):
    tmp, _ = built
    s = json.load(open(tmp / "proc" / "stats.json"))
    assert s["train_dates"][0] == "2017-01-01" and s["train_dates"][1] == "2017-12-01"
    assert s["inputs"]["sst"]["n"] > 0
    assert s["provenance"]["split"]["guard_days"] == 30


def test_sanity_outputs(built):
    tmp, _ = built
    out = json.load(open(tmp / "out" / "data_sanity.json"))
    inv = out["glorys_inversions"]
    assert inv["south"]["ALL"]["frac_dT_gt_0.2"] > 0.5  # the planted inversion is detected
    assert inv["north"]["ALL"]["frac_dT_gt_0.05"] == 0.0
    assert (tmp / "out" / "figures" / "data" / "input_sst_seasonal.png").exists()
    assert (tmp / "out" / "data_sanity.md").read_text(encoding="utf-8").startswith("# Data sanity report")
