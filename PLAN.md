# OceanEmbed: Phase 0 Audit & Plan

SIH 2026 · PS **SIH26066** (MoES / INCOIS) · Written 2026-09-28 · Status: **Phase 0 complete; Phase 1 in progress**

## ⚠ Revision 2026-09-28: scope and phases (supersedes the old Phases 1-5 below)

- **`oceanembed/` is FROZEN.** Nothing in it is modified (a single banner only on explicit request). All work is in `ml/`.
  §5-§6 below (serving, UI pass) are deferred to the new Phase 5 and kept only for reference.
- **Priority is research quality** (UG research / UROP); SIH packaging comes later.

| Phase | Content | Stop condition |
|---|---|---|
| 1 | Data pipeline, as in §3 (unchanged) | Sanity plots + coverage stats ready |
| 2a | `ml/LITERATURE.md`: published surface→subsurface T methods; only papers actually fetched and read; unverified entries marked **UNVERIFIED**; ARMOR3D as operational reference if obtainable | Table ready for review with research guide |
| 2b | Baseline ladder under one interface (config + class per method): climatology, ridge, RF/GBM (pointwise), pointwise MLP (full profile), CNN/U-Net; optional ConvLSTM/transformer. Same data/split/metrics; 3 seeds for stochastic methods; one results table per depth/season/region. **Stated as a fair re-implementation benchmark, not a reproduction of published numbers** | Results table ready |
| 3 | Controlled ablations from the best baseline (fixed base config), one change at a time, mean ± spread over ≥3 seeds: anomaly target (zero-init output); depth-conditioned decoder vs fixed-depth heads (all ~35 levels); physics term (after measuring GLORYS inversion frequency); currents in/out; uncertainty (quantile heads or small ensemble) + calibration; embedding analysis (clustering by season/monsoon regime, nearest-neighbour retrieval). Effects smaller than seed spread → "no significant difference". No cherry-picking of seeds or years | Ablation table ready |
| 4 | Paper/report figures and tables | |
| 5 | UI and API honesty pass (old Phases 4-5: §5-§6) | |

Consequence for §2: design changes D1 (anomaly target), D2 (depth-conditioned decoder), D4 (currents) and D5 (physics
term) are no longer baked into "the model". They become **Phase 3 ablations** measured against the best baseline.

This document covers: (1) what in the current repo is fake, (2) where I disagree with the target design and why,
(3) the data plan with verified product IDs, date coverage, sizes and splits, (4) the model/eval/serving design,
(5) risks, and (6) exactly what I need from you before Phase 1.

---

## 1. Audit: every place the app fakes data or hardcodes results

**Summary: no real number exists anywhere in the app.** There is no model, no dataset, no ARGO data and no
metrics file. Every temperature, profile, embedding, metric and status indicator is either a formula,
`Math.random()`, or a literal. Some pages carry "DEMO / ILLUSTRATIVE" banners, and some state the opposite
("Live Neural Engine", "MODEL READY", "ARGO: AVAILABLE").

### 1.1 Data and inference sources (the root fakes)

| File | Lines | What is fake |
|---|---|---|
| `oceanembed/app/api/reconstruct/route.ts` | 11-15 | "Reconstruction" is `3.5 + (sst-3.5)·exp(-d/185) + 0.35·sin(d/40)`, an analytic curve driven only by the SST argument |
| | 17-20 | "ARGO reference" is the fake reconstruction plus a sine wiggle: fabricated observations |
| | 22-25 | 128-D "embedding" is `sin((i+lat+lon)·0.1)` |
| | 31 | Region chosen by `lat>12 && lon>78` |
| | 34-37 | Default SST/SSS/SSH/wind literals (28.5, 35.8, -0.05, 8.5) presented as "surface_inputs" |
| | 44 | `thermocline_depth_m: 65` hardcoded |
| | 45-49 | `rmse_c: 0.68, mae_c: 0.49, r2_score: 0.942` hardcoded |
| | 29, 58-66 | `model_version 'OceanEmbed-v1.0-DEMO'`, "AQUALENS", "SIH 2024 Telemetry Engine", `status: 'ONLINE'`; advertises `/api/dataset-status`, which does not exist |
| `oceanembed/lib/ocean-simulation.ts` | 25-47 | Sigmoid-thermocline profile generator with `Math.random()` deep temperature and noise |
| | 54-74 | 16 hand-picked "grid points" with literal SST/SSS values |
| | 79-80 | Both `reconstruction` **and** `argo_reference` come from the same generator, so "validation" compares noise to noise |
| | 95-103 | SSH, currents, winds and embedding are all `Math.random()` |
| | 85, 105 | Thermocline depth = `85 + lat·1.1` (formula) |
| | 113 | `DEMO_PROFILES` generated with `Math.random()` **at module load**: values differ between server prerender and client, so this is also a hydration-mismatch bug, and they change on every reload |
| | 145 | `correlation = 0.94 + Math.random()·0.04` ("illustrative"): a random metric |
| | 52, 158-164 | Fixed 2024 demo dates |
| `oceanembed/lib/constants.ts` | 39-47 | `DATA_SOURCES` claims every feed is `READY`; names products we will not use (OSCAR, ASCAT/CCMP, SMAP/SMOS L3) |
| | 49 | `MODEL_VERSION = 'OceanEmbed-v1.0-DEMO'` |
| `oceanembed/store/ocean-store.ts` | 38-46 | `runInference()` is five `setTimeout(600)` steps; nothing runs |

### 1.2 Pages that display fake numbers

| File | Lines | What is fake |
|---|---|---|
| `app/performance/page.tsx` | 9-17 | Depth-wise "metrics" computed from synthetic reconstruction vs synthetic ARGO; correlation is a formula `0.92 + (1-d/1500)·0.06` |
| | 19-30 | `SEASONAL_DATA` / `SEASONAL_BOB`: 8 hardcoded RMSE/bias/r rows |
| | 42-51 | 8 hardcoded overview KPIs (RMSE 0.68, MAE 0.51, bias +0.07, r 0.943, surface/thermocline/deep RMSE, "16 profiles") |
| | 100-107 | Radar "skill profile": 6 hardcoded values |
| | 117-121 | "RMSE by depth zone": 3 hardcoded bars |
| | 222 | Explanatory text for the monsoon RMSE pattern, describing a result that was never computed |
| `app/validation/page.tsx` | 27-47 | All profiles, residuals, scatter and metrics derived from synthetic `DEMO_PROFILES` |
| | 8-16 | "Validation workflow" rendered with green check marks, but none of those steps are implemented |
| `app/reconstruction/page.tsx` | 66-75 | "Custom inference" = `4 + (SST-4)·exp(-d/180) + 0.4·sin(d/50)`; fake ARGO = that + sine |
| | 85-94 | Currents literals, wind split `0.7·speed`, embedding `sin(i·0.1)`, thermocline `65`, strength `0.15` |
| | 118 | Metrics from `computeMetrics` (random correlation) |
| | 129 | Copy says "run live deep-learning inference" |
| `app/backend/page.tsx` | 11-24 | `MODEL_LAYERS`: invented shapes and parameter counts; includes **Global Avg Pool**, which contradicts the per-cell embedding design |
| | 26-55 | `PYTHON_CODE`: fictional `aqualens` package, fictional `oceanembed_v1.pt`, undefined `compute_rmse`/`argo_reference` |
| | 118-120, 131 | "Live Neural Engine", "Real-time interface into the AQUALENS machine learning backend", "ResNet-Encoder" |
| | 229 | Terminal always prints `OK` next to the status code, even for errors |
| `app/command-center/page.tsx` | 84 | Status chips `SYSTEM ONLINE`, `MODEL READY`, `ARGO: AVAILABLE` |
| | 226-231 | "Model Version OceanEmbed-v1.0", "Inference Engine Ready", "ARGO Profiles 16 Available" |
| | 175-208 | Surface values and depth snapshot from synthetic profiles |
| `app/insights/page.tsx` | 21-97 | "Insights" computed from synthetic profiles and labelled "Validated against representative ARGO profiles" (line 38) |
| | 120-125 | `dataCoverage: 100, missingness: 0, inputCompleteness: 100` hardcoded |
| `app/ocean-3d/page.tsx` | 25 | Volume built from synthetic profiles for fixed date `2024-01-15` |
| `app/embedding/page.tsx` | 28-98 | "Embedding space projection" is hand-placed clusters from a `sin`-seeded RNG, with PC axes labelled "Thermal structure" and "Salinity / SSH" as if they were learned |
| | 146-181 | 64/128/256-D selector is cosmetic; latent-vector swatches are `sin/cos` colours |
| | 210-235 | Describes "7 independent channel pathways", "cross-channel self-attention", "global average pooling": none of it exists |
| `app/harmonization/page.tsx` | 81-92 | Pipeline "runs" on page load via timers; no data is processed |
| | 163 | "7 Active Satellite Feeds" badge |
| | 17-74 | Provenance lists OSCAR, SMAP/SMOS L3 and ASCAT/CCMP, which will not be our sources (see §3) |
| `app/about/page.tsx` | 10, 89 | "CNN ResNet-50 backbone … Cross-channel attention … Global average pooling + 128-D FC projection", which also contradicts line 93 ("per-grid-cell embedding") |
| | 19 | "Next.js 14"; actual version is **16.3.5** |
| | 101 | "Validation split: independent ARGO profiles" (ARGO is not independent of GLORYS; see §4.6) |
| | 146 | WOA23 listed as the climatological baseline (not planned; our climatology baseline is built from GLORYS train years) |
| `app/home/page.tsx` | 69, 79 | "AQUALENS" branding |
| `app/login/page.tsx` | 16-23, 218-231 | Fake "connecting to INCOIS data nodes / ARGO registry / inference engine" sequence; auth accepts any password (`sessionStorage` flag). This is decorative, not a security boundary |
| | 257-259, 350-352 | "INCOIS Data Feed" (live dot), "7 Satellites Active", "ARGO Validated", "GLORYS12 Ready" |
| `components/layout/Navigation.tsx` | 70-74 | Sidebar status `Model READY`, `ARGO AVAILABLE` on every page |
| `components/OceanMap.tsx` | 52, 185 | Attribution "INCOIS Data Feed / INCOIS Data Telemetry": no INCOIS data is loaded |

### 1.3 Stale copy (Phase 5 checklist)

- **"SIH 2024" → "SIH 2026":** `app/layout.tsx:11`, `app/about/page.tsx:36,174`, `app/api/reconstruct/route.ts:61`,
  `app/login/page.tsx:292,405`, `components/layout/Footer.tsx:75`.
- **"AQUALENS"** (product is OceanEmbed): `app/layout.tsx:10,12`, `app/home/page.tsx:69,79`,
  `app/login/page.tsx:22,252,289,372` (+ `aqualens_auth` key :229), `app/backend/page.tsx:28-29,120`,
  `app/api/reconstruct/route.ts:58`, `components/layout/Navigation.tsx:60,144`. (Footer already says OCEANEMBED.)
- **"Live Neural Engine":** `app/backend/page.tsx:118`; similar claims at `app/reconstruction/page.tsx:129` ("live deep-learning inference").
- `README.md` is the unmodified create-next-app template.

### 1.4 Other observations

- `node_modules` is not installed, so `node_modules/next/dist/docs/` (required reading per `AGENTS.md`) is not
  available yet. I'll run `npm ci` and read the route-handler docs before touching Next.js code in Phase 4.
- The folder is **not a git repository**. For reproducibility (hard rule 6) I recommend `git init` before Phase 1,
  so every metrics file can record a commit hash. I haven't done this without your OK.
- `app/reconstruction`'s **"Custom User Input" mode is incompatible with any spatial model.** You can't type one SST
  value at one point and run a U-Net that needs a full field. See §6 for how I propose to handle it.

---

## 2. Where I'd change the target design (with reasons)

| # | Target design says | I propose | Why |
|---|---|---|---|
| D1 | Decoder outputs temperature | Decoder outputs an **anomaly relative to the train-period daily climatology**: T̂ = clim(cell, doy, z) + Δ̂ (behind a config flag, ablated) | Most of the variance at depth is seasonal climatology. Residual learning makes climatology the floor rather than something the net must re-learn, which matters with only 2-3 train years. It also makes "beats climatology" a directly interpretable claim |
| D2 | Train/query at 15 depths | **Train on all GLORYS native levels in 0-1062 m (~35 levels), sampling random subsets per step; report on the 15 standard levels** (standard levels obtained by linear interpolation of GLORYS) | The design wants arbitrary-depth queries, but a head trained on exactly 15 depths has no supervision between them. Native levels are free and dense near the thermocline. Depth encoded as log-depth + Fourier features |
| D3 | 7 input channels | 7 physical channels **+ static/aux channels:** land/ocean mask, log bathymetry, sin/cos day-of-year, normalized lat/lon | The net needs to know where the shelf is (targets below the seafloor are masked) and what season it is. These are cheap and standard |
| D4 | Currents U/V as satellite input | Keep them, but note that CMEMS "GlobCurrent" = altimetric geostrophic (**derived from the same SLA**) + Ekman (**derived from ERA5 wind**) currents. **Ablate** the currents channel | They are largely redundant with SLA and winds. If the ablation shows they add nothing, drop them and simplify |
| D5 | Physics loss: penalize temperature inversions | Before enabling it, **measure how often GLORYS itself has inversions in the region.** Then penalize only inversions beyond a tolerance (e.g. dT/dz > +0.02 °C/m over >5 m), flag-gated, default **off**, ablated | Real temperature inversions occur in the NIO (salinity-stabilised barrier layers, strongest in the Bay of Bengal, also the SE Arabian Sea in winter). A hard monotonicity penalty would bias the model **away from the truth** there. A density-based penalty would be more correct but we don't predict salinity |
| D6 | Validation vs GLORYS + ARGO | Also report **GLORYS-vs-ARGO** error on the same matchups as a reference row | Since we train on GLORYS, GLORYS-vs-ARGO is roughly the best ARGO skill we can hope for. Without that row, ARGO numbers are uninterpretable |
| D7 | Thermocline-depth error | Define thermocline depth as **D20 (depth of the 20 °C isotherm)**, the standard proxy in the tropical Indian Ocean; also report depth of max dT/dz | "Thermocline depth" needs a precise, reproducible definition. D20 is robust and comparable to literature |
| D8 | Strict year split | Year split **plus a 30-day guard**: drop the last 30 days of the final train year from training | Subsurface anomalies persist for weeks. Without a gap, Dec-31 train and Jan-1 val are near-duplicates and val skill is inflated |
| D9 | "Satellite" SSS input | Use CMEMS L4 SSS (015_013) for coverage, but **document that it blends in-situ salinity (incl. Argo)** | Pure satellite SSS in the Arabian Sea suffers SMOS RFI and gaps. The L4 product is gap-free but means near-surface Argo information leaks into inputs. This is a limitation to state, not a dealbreaker (OSTIA also ingests in-situ SST) |

Everything else I agree with: per-cell 128-D embeddings from a U-Net (no global pooling), a depth-conditioned MLP
head, MSE loss, a temporal split, and climatology + ridge baselines.

---

## 3. Data plan

All sources are from **Copernicus Marine (CMEMS)**, so there is **one credential**. OSCAR (PO.DAAC/Earthdata),
ERA5 (CDS) and SMAP L3 (JPL) would each need a separate account. ARGO comes via `argopy` (no credentials).

### 3.1 Products (coverage checked on the CMEMS catalogue, Sept 2026)

| Role | Product ID | Native res. | Variables | Coverage (as listed) |
|---|---|---|---|---|
| **Target** T(z) | `GLOBAL_MULTIYEAR_PHY_001_030` (GLORYS12V1), daily | 1/12°, 50 levels | `thetao` (+ static `deptho`/mask) | 1993-01-01 → 2026-06 (**`my` to ~mid-2021, then `myint` interim**) |
| SST | `SST_GLO_SST_L4_REP_OBSERVATIONS_010_011` (OSTIA reprocessed) | 0.05° | `analysed_sst` | 1981-10 → 2026-03 |
| SSS | `MULTIOBS_GLO_PHY_S_SURFACE_MYNRT_015_013` (L4, SMOS+SMAP+in-situ) | 0.125° | `sos` | 1993-01 → present |
| SLA | `SEALEVEL_GLO_PHY_L4_MY_008_047` (DUACS MY) | 0.125° | `sla` | 1993-01 → 2026-01 |
| Currents | `MULTIOBS_GLO_PHY_MYNRT_015_003` (GlobCurrent, daily mean) | 0.25° | `uo`,`vo` at 0 m | 1993-01 → present |
| Winds | `WIND_GLO_PHY_L4_MY_012_006` (ERA5 bias-corrected with scatterometers) | 0.125° / 0.25°, **hourly** | `eastward_wind`,`northward_wind` | 1994-06 → 2026-05 |
| Validation | Argo core profiles via `argopy` (GDAC/ERDDAP), QC 1-2, delayed-mode preferred | profiles | TEMP, PRES | 2000s → present |
| Validation (optional) | INCOIS gridded Argo (monthly, 1°) | 1° | T(z) | Download from INCOIS; access terms to confirm |

**Pinned in Phase 1 (`copernicusmarine describe`, 2026-09-28); see `ml/config.yaml`:**
GLORYS `cmems_mod_glo_phy_my_0.083deg_P1D-m` v202311 (now a single daily dataset to 2026-06-23; 36 native
levels ≤ 1100 m) · OSTIA `METOFFICE-GLO-SST-L4-REP-OBS-SST` v202003 (K) · SSS `cmems_obs-mob_glo_phy-sss_my_multi_P1D`
v202311 (**MY ends 2024-12-15**) · SLA `cmems_obs-sl_glo_phy-ssh_my_allsat-l4-duacs-0.125deg_P1D` v202411 ·
currents `cmems_obs-mob_glo_phy-cur_my_0.25deg_P1D-m` v202411 (levels 0 and 15 m) · winds
`cmems_obs-wind_glo_phy_my_l4_0.125deg_PT1H` v202211. **The 0.25° wind dataset ends 2009-10**, so the 0.125°
hourly one is required, which raises download volume (below).

**On SSS dates:** SMOS starts 2010 and SMAP 2015-04. The L4 015_013 product extends back to 1993, but before 2010
it is essentially in-situ + SST-driven OI, not satellite SSS. **Training years start in 2016**, so SSS is
satellite-informed throughout, SMAP included (SMAP has less RFI in the Arabian Sea than SMOS).

### 3.2 Domain and grid

- **Pilot:** Arabian Sea **5-25°N, 45-78°E** (matches `REGIONS.ARABIAN_SEA` in `lib/constants.ts`) → 0.25° grid
  of **80 × 132** cells. Marginal seas (Persian Gulf, Red Sea) and shelf cells shallower than the query depth are
  masked out of the loss and metrics.
- **Scale-up:** full NIO **5-30°N, 45-105°E** → **100 × 240** cells.
- Common target grid: cell centres at x.125/x.375/…; conservative (area-weighted) coarsening for finer products
  (OSTIA, GLORYS, SSS, SLA), direct use for 0.25° products. Winds are averaged from hourly to daily first.

### 3.3 Splits (by year, never spatial)

| Stage | Train | Val | Test | Extra |
|---|---|---|---|---|
| **Pilot** | 2017-2018 (last 30 days of 2018 dropped, D8) | 2019 | 2020 | none |
| **Full** | 2010-2017 | 2018 | 2019-2020 | Optional out-of-period check: 2022 (GLORYS `myint`) |

Rationale: every product is on its reprocessed ("MY") stream for 2010-2020, and the GLORYS `my`→`myint` switch in
mid-2021 is kept out of train/val/test. Test years are full calendar years, so all four seasons are present.
**Note:** 2019 was a strong positive-IOD year, so val skill may not be representative. I'd rather know this now
than tune to it. The split is written in the config and copied into every metrics file.

### 3.4 Download size estimates (float32, before compression)

| | Pilot box (AS) per year | Full NIO per year |
|---|---|---|
| GLORYS `thetao`, 36 levels ≤ 1062 m, 1/12° (padded box) | **~5.2 GB** | ~11.8 GB |
| OSTIA SST 0.05° | 0.40 GB | 0.9 GB |
| Winds hourly (**0.125°** dataset, 2 vars; revised up) | **3.1 GB** | 7.0 GB |
| SSS + SLA + currents | ~0.16 GB | ~0.36 GB |
| **Raw total** | **~8.9 GB/yr → ~35 GB for pilot (4 yrs)** | **~20 GB/yr → ~220 GB for 11 yrs** |
| **After regrid to 0.25° (what training reads)** | **~0.6 GB/yr → ~2.5 GB** (fits in RAM) | ~1.4 GB/yr → ~15 GB (lazy zarr) |

NetCDF/zarr compression should shrink raw sizes by roughly 1.5-2× (land fraction is large). Disk is not a problem
(E: has 4.2 TB free). **Download time is the unknown:** at an assumed 5-20 MB/s the pilot takes ~20 min-1.5 h, and
the full set several hours. The downloader will be resumable and chunked by month; raw files are kept so
regridding can be re-run.

### 3.5 Preprocessing (Phase 1, `ml/data/`)

1. `download.py`: `copernicusmarine.subset(...)` per product/month; credentials from
   `COPERNICUSMARINE_SERVICE_USERNAME` / `COPERNICUSMARINE_SERVICE_PASSWORD` env vars only.
2. `regrid.py`: coarsen/average to the common grid; hourly→daily winds; GLORYS kept on native depth levels ≤ 1062 m
   plus a derived 15-standard-level copy.
3. `masks.py`: ocean mask = GLORYS valid at surface; per-level validity from GLORYS (handles the shelf); inputs with
   residual NaNs over ocean are filled by nearest-neighbour, with a per-channel "was filled" fraction logged.
4. `normalize.py`: per-channel mean/std and the daily climatology (31-day smoothed, or 3 harmonics) from **train
   years only**, saved to `ml/data/processed/stats.json`.
5. Output: `ml/data/processed/{inputs,target}.zarr` + `stats.json`.
6. `sanity_check.py`: one map per variable per season, NaN/coverage table, value ranges, GLORYS inversion frequency
   (feeds D5), written to `ml/outputs/figures/data/`.

---

## 4. Model, training and evaluation

### 4.1 Architecture

```
inputs [B, C≈13, 80, 132]  (7 physical + mask, bathy, sin/cos doy, lat, lon)
  │  pad to 80×136
  ▼
U-Net encoder–decoder (4 levels, base 32 ch, GroupNorm, ~1–3 M params)
  ▼
per-cell embedding E [B, 128, H, W]          ← the "ocean embedding"; no global pooling
  ▼
depth head: MLP([E(cell) ; φ(z)]) → Δ̂T(cell, z)   φ = log-depth + Fourier features
  ▼
T̂ = clim(cell, doy, z) + Δ̂T                  (residual mode; flag-gated, D1)
```

- Loss: masked MSE on normalized T (or Δ) over valid (cell, z); optional inversion penalty λ·ReLU(dT̂/dz - τ)²
  (flag, D5).
- Training on CPU: sample ~25% of ocean cells × 8 random native depths per image per step, so head cost stays small.
  AdamW, cosine LR, early stopping on val RMSE, `seed` fixed for Python/NumPy/PyTorch, deterministic algorithms on.
- **Sanity gates before any real run:** (a) overfit 4 samples to near-zero loss; (b) loss decreasing on the pilot;
  (c) prediction shape/mask unit tests.

### 4.2 Baselines (implemented and logged **before** the deep model)

1. **Climatology:** train-period daily climatology per cell and depth (same one used in D1).
2. **Ridge regression:** per standard depth, features = the same inputs at the cell (+ 3×3 neighbourhood mean),
   alpha tuned on val. Trained on the same years and masks.
3. (Reference row, not a baseline) **GLORYS vs ARGO** on the ARGO matchups.

If the U-Net does not beat both baselines on the test year, the metrics file and the UI will say so plainly.

### 4.3 Metrics (`ml/eval.py` → `ml/outputs/metrics.json`)

For each of {unet, ridge, climatology} and each reference {GLORYS test year, ARGO matchups}:

- RMSE, MAE, bias, Pearson r, per **15 standard depths** and aggregated (0-30 m, 50-200 m, 300-1000 m, all).
- By **season**: Winter DJF, Pre-monsoon MAM, Monsoon JJAS, Post-monsoon ON (matches UI labels).
- By **sub-region** (pilot): W. Arabian Sea 45-60°E, Central 60-70°E, E. Arabian Sea 70-78°E. BoB / EIO added at scale-up.
- **D20 error** (m) and max-gradient-depth error; % of profiles where D20 is defined.
- Counts of samples/profiles behind every number. Every file records the config hash, git commit, split years, seed
  and data version.

Figures in `ml/outputs/figures/`: depth-wise RMSE/bias per model, baseline comparison table (also as
`metrics.md`), seasonal bars, error maps at 50/100/200/500 m, sample profiles vs ARGO, and a PCA of real
embeddings, which replaces the fake scatter on `/embedding`.

### 4.4 ARGO matchups

`argopy` fetch of the domain and test years; QC flags 1-2 (delayed-mode where available); pressure → depth;
interpolate to standard levels (drop profiles with gaps > 50 m in the upper 200 m); match to the nearest 0.25°
cell on the same UTC day. Expect on the order of **10³ profiles per year** in the Arabian Sea (exact count
reported in Phase 1).

### 4.5 Config & reproducibility

One file, `ml/config.yaml`: domain, grid, products and dataset IDs, years per split, guard days, depths, model
hyper-parameters, loss flags, seed, paths. Every CLI script takes `--config`. Pinned `ml/requirements.txt`
(torch CPU, xarray, zarr, netCDF4, copernicusmarine, argopy, scikit-learn, matplotlib, fastapi, uvicorn).

### 4.6 Known scientific limitations (to be stated in the UI and README)

- **GLORYS assimilates Argo T/S profiles** (and satellite SST/SLA). ARGO matchups are therefore **not independent**
  of the training target. They check the target+model chain, not an independent truth.
- SSS L4 and OSTIA ingest in-situ observations (D9).
- The model learns GLORYS, including its biases. It is an emulator of a reanalysis from surface fields, not an
  observation-based product.
- Currents input is derived from SLA and ERA5 winds (D4).

---

## 5. Serving (Phase 4)

- `ml/serve.py` (FastAPI): loads the checkpoint + `stats.json` + preprocessed inputs zarr.
  - `GET /health` → model version, checkpoint hash, config hash, available date range, test-split years.
  - `POST /reconstruct {date, lat, lon, depths?}` → runs the U-Net on that date's field (cached per date),
    returns the profile at the nearest ocean cell: temperatures at requested depths, D20, the 128-D embedding, the
    **actual surface inputs used**, GLORYS at that cell/date (labelled "reanalysis"), an ARGO profile **only if a
    real matchup exists**, and whether the date is in train/val/test.
  - Returns 404 or 422 for dates without data, land cells, or points outside the domain. Never a synthetic
    fallback.
- ONNX export is optional (only if it simplifies deployment).
- `oceanembed/app/api/reconstruct/route.ts` becomes a thin proxy to `OCEANEMBED_API_URL` (env var). If the service
  is down it returns 503 and the UI shows "model service unavailable", not demo data.

## 6. UI honesty pass (Phase 5)

- Delete `lib/ocean-simulation.ts`. Pages read `metrics.json` (served by a route handler) and the API, and show
  **"not yet computed"** when absent.
- `/performance`, `/validation`, `/insights`: driven by metrics.json and real matchups; baselines shown side by side.
- `/reconstruction`: presets become real dates from the test year. **Custom User Input**: my recommendation is to
  **remove it**. Alternative: reimplement it as a clearly labelled *sensitivity experiment* (perturb the real
  surface field around the point and rerun). **Your call** (Q5 below).
- `/embedding`: PCA of real embeddings from eval output; remove the latent-dim selector.
- `/backend`, `/about`, `/embedding`, `/harmonization`: architecture, layer shapes and param counts generated from the
  actual model (`ml/outputs/model_summary.json`); data sources from the config.
- Status chips (sidebar, command center, login) reflect `/health`; remove fake "INCOIS Data Feed" and "7 Satellites
  Active" labels.
- Copy fixes listed in §1.3.

---

## 7. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **No CUDA GPU** (this machine: i5-1235U, 16 GB RAM, Intel UHD) | Pilot trainable on CPU (est. minutes/epoch with cell/depth subsampling); full NIO × 8 yrs likely **hours per epoch** | Pilot on CPU. For scale-up, use a GPU (Colab/Kaggle T4 or a lab machine); code is device-agnostic |
| Download volume/time (~25 GB pilot, ~160 GB full raw) | Slow Phase 1 | Month-chunked, resumable downloads; pilot first |
| Only 2 train years in pilot | Noisy climatology, weak model; U-Net may not beat ridge | Expected for a pilot. Judge the architecture at full scale; report honestly either way |
| U-Net fails to beat baselines at depth (>300 m surface signal is weak) | Headline claim is weaker | Report per-depth; residual mode (D1) guarantees ≈ climatology at depth rather than worse |
| GLORYS–ARGO dependence | Over-optimistic ARGO skill | GLORYS-vs-ARGO reference row; documented |
| `my`/`myint` GLORYS discontinuity | Distribution shift | Keep all splits ≤ 2020; `myint` only as an explicit out-of-period test |
| CMEMS product versions change | Irreproducibility | Pin dataset version strings in config; record them in metrics files |
| Next.js 16 API differences | Phase 4/5 breakage | Install deps and read `node_modules/next/dist/docs/` first (per AGENTS.md) |

---

## 8. What I need from you

1. **Copernicus Marine account.** Free registration at marine.copernicus.eu. Set these env vars in the shell that
   will run the scripts (don't paste them into chat or files):
   `COPERNICUSMARINE_SERVICE_USERNAME`, `COPERNICUSMARINE_SERVICE_PASSWORD`.
   **This is the only blocker for Phase 1.**
2. **Permission to create a Python env and install packages** (`python -m venv ml/.venv` + pip install of the list
   in §4.5, ~2-3 GB incl. CPU PyTorch), and to run `npm ci` in `oceanembed/` in Phase 4.
3. **Permission to download ~25 GB** (pilot) to `E:\…\ml\data\raw`, and later ~160 GB for the full run.
4. **GPU plan for scale-up:** do you have access to a CUDA machine / Colab / Kaggle, or should the full run stay a
   CPU-sized compromise (e.g. every-other-day sampling, fewer years)?
5. **Decisions:**
   - (Q1) Accept design changes D1-D9? In particular D1 (residual on climatology) and D2 (train on native levels).
   - (Q2) Accept the pilot split: train 2017-18 / val 2019 / test 2020?
   - (Q3) Layout: I propose `ml/` at the **repo root**, next to `oceanembed/`, not inside the Next.js app. The
     frontend will read metrics via an env-configured path. OK?
   - (Q4) OK to `git init` the repo?
   - (Q5) Reconstruction page "Custom User Input": remove, or keep as a labelled sensitivity experiment?
   - (Q6) INCOIS gridded Argo: do you have access or a download link? If not, validation uses argopy profiles only.
