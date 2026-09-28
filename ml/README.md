# OceanEmbed ML

Research code for reconstructing subsurface ocean temperature (0–1000 m) from surface
satellite fields. Plan and design rationale: [`../PLAN.md`](../PLAN.md).

Everything is driven by one config, [`config.yaml`](config.yaml): domain, grid, temporal split,
pinned CMEMS dataset IDs/versions, and QC thresholds. Every output file carries a provenance block
(config hash, git commit, seed, split, dataset versions).

## Setup

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
```

Copernicus Marine credentials are read from the environment only:

```bash
export COPERNICUSMARINE_SERVICE_USERNAME=...   # never commit, never put in config
export COPERNICUSMARINE_SERVICE_PASSWORD=...
```

## Phase 1: data pipeline (run from `ml/`)

| Step | Command | Output |
|---|---|---|
| 0. size estimate | `python -m data.download --config config.yaml --dry-run` | stdout |
| 1. download (resumable, monthly chunks) | `python -m data.download --config config.yaml` | `data/raw/<product>/*.nc`, `download_log.jsonl` |
| 2. Argo profiles (no login) | `python -m data.argo --config config.yaml` | `data/processed/argo_profiles.csv`, `argo_summary.json` |
| 3. regrid + masks | `python -m data.build_dataset --config config.yaml` | `data/processed/<domain>.zarr`, `build_report.json` |
| 4. train-only normalization stats | `python -m data.stats --config config.yaml` | `data/processed/stats.json` |
| 5. sanity plots + coverage | `python -m data.sanity_check --config config.yaml` | `outputs/data_sanity.{json,md}`, `outputs/figures/data/` |
| tests | `python -m pytest -q` | 19 tests: regridder, Argo QC/interp, synthetic end-to-end |

### Processing choices (what the code actually does)

- **Grid:** 0.25° cells with edges on multiples of 0.25°. Pilot domain 5–25°N, 45–78°E (80 × 132).
  Raw boxes are padded by 0.25°.
- **Regridding:** conservative (area-overlap, spherical-area weighted, separable) for every product.
  An output cell needs ≥ 50 % valid source area. Hourly winds are averaged to UTC days (≥ 20 h
  required). Timestamps are floored to the date.
- **Ocean mask:** GLORYS surface-valid cells, restricted to the largest 4-connected water body, which
  drops isolated fragments such as the part of the Persian Gulf inside the box. Per-level validity also
  comes from GLORYS (shelf / seafloor).
- **Target:** GLORYS `thetao` on all 36 native levels ≤ 1100 m, plus a copy linearly interpolated to
  the 15 standard levels. "0 m" = the top native level (0.49 m). A standard level is invalid if either
  bracketing native level is invalid.
- **Input gaps over ocean:** nearest-neighbour filled, with every filled value flagged in
  `<var>_filled`. Normalization stats exclude filled values and use **train dates only**, with the last
  30 days of the train period removed as a leakage guard.
- **Argo:** argopy `standard` mode (adjusted values, good QC) from the Ifremer ERDDAP, keeping only
  QC flags 1–2. Pressure→depth via Saunders (1981). Interpolation to standard levels is refused across
  gaps > 50 m (≤ 200 m depth), > 100 m (≤ 500 m) or > 200 m (deeper). Levels above the shallowest
  observation are filled only if it is ≤ 10 m (counted in `argo_summary.json`). Profiles are grouped
  by (float, cycle, direction); data mode (R/A/D) is kept so evaluation can restrict to delayed-mode.

### Known limitations (carried into every results file)

- GLORYS assimilates Argo (and satellite SST/SLA), so Argo matchups are **not independent** of the
  training target.
- The SSS L4 product (015_013) blends in-situ salinity (incl. Argo) with SMOS/SMAP. OSTIA also
  ingests in-situ SST.
- Surface currents (015_003) = altimetric geostrophic + ERA5-derived Ekman, so they are largely
  derived from the SLA and wind inputs.
