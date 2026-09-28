"""Conservative (area-overlap) regridding between regular lat-lon grids.

Both grids are rectilinear, so the 2-D overlap weights factor into a latitude
matrix and a longitude matrix. Latitude overlaps are weighted by exact spherical
area (difference of sin(lat)), longitude overlaps by length. NaNs (land, gaps)
are excluded from the average; an output cell is NaN when less than
``min_coverage`` of its area has valid source data.
"""
from __future__ import annotations

import numpy as np


def cell_edges(centers: np.ndarray) -> np.ndarray:
    """Edges of a regular 1-D grid given its (ascending) cell centres."""
    centers = np.asarray(centers, dtype=np.float64)
    if centers.size < 2:
        raise ValueError("need at least two cell centres")
    step = np.diff(centers)
    if not np.allclose(step, step[0], rtol=1e-4, atol=1e-6):
        raise ValueError("grid is not regular")
    if step[0] <= 0:
        raise ValueError("centres must be ascending")
    half = step[0] / 2.0
    return np.concatenate([centers - half, [centers[-1] + half]])


def overlap_matrix(src_edges: np.ndarray, dst_edges: np.ndarray, spherical_lat: bool = False) -> np.ndarray:
    """W[i, j] = measure of (dst cell i) ∩ (src cell j).

    With ``spherical_lat`` the measure is sin(upper) - sin(lower), which is
    proportional to spherical area for a latitude band.
    """
    lo = np.maximum(dst_edges[:-1, None], src_edges[None, :-1])
    hi = np.minimum(dst_edges[1:, None], src_edges[None, 1:])
    valid = hi > lo
    if spherical_lat:
        w = np.sin(np.deg2rad(hi)) - np.sin(np.deg2rad(lo))
    else:
        w = hi - lo
    return np.where(valid, w, 0.0)


class ConservativeRegridder:
    """Precomputes weights once; applies to arrays whose last two axes are (lat, lon)."""

    def __init__(self, src_lat, src_lon, dst_lat, dst_lon, min_coverage: float = 0.5):
        self.wy = overlap_matrix(cell_edges(src_lat), cell_edges(dst_lat), spherical_lat=True)
        self.wx = overlap_matrix(cell_edges(src_lon), cell_edges(dst_lon))
        # full-coverage measure of each destination cell (needed for the coverage fraction)
        dst_lat_e, dst_lon_e = cell_edges(dst_lat), cell_edges(dst_lon)
        area_y = np.sin(np.deg2rad(dst_lat_e[1:])) - np.sin(np.deg2rad(dst_lat_e[:-1]))
        area_x = np.diff(dst_lon_e)
        self.dst_area = np.outer(area_y, area_x)
        self.min_coverage = min_coverage
        # destination cells must lie inside the source domain, otherwise coverage is silently low
        src_lat_e, src_lon_e = cell_edges(src_lat), cell_edges(src_lon)
        if dst_lat_e[0] < src_lat_e[0] - 1e-9 or dst_lat_e[-1] > src_lat_e[-1] + 1e-9 \
                or dst_lon_e[0] < src_lon_e[0] - 1e-9 or dst_lon_e[-1] > src_lon_e[-1] + 1e-9:
            raise ValueError("destination grid extends beyond source grid; download a padded box")

    def __call__(self, data: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Returns (regridded values, valid-area coverage fraction). Leading axes are broadcast."""
        data = np.asarray(data, dtype=np.float64)
        valid = np.isfinite(data)
        filled = np.where(valid, data, 0.0)
        num = np.einsum("ij,...jk,lk->...il", self.wy, filled, self.wx, optimize=True)
        den = np.einsum("ij,...jk,lk->...il", self.wy, valid.astype(np.float64), self.wx, optimize=True)
        coverage = den / self.dst_area
        with np.errstate(invalid="ignore", divide="ignore"):
            out = num / den
        out[coverage < self.min_coverage] = np.nan
        return out.astype(np.float32), coverage.astype(np.float32)


def target_axis(lo: float, hi: float, res: float) -> np.ndarray:
    """Cell centres of a regular axis whose cell edges are lo, lo+res, ..., hi."""
    n = int(round((hi - lo) / res))
    if not np.isclose(lo + n * res, hi):
        raise ValueError(f"({lo}, {hi}) is not a multiple of {res}")
    return lo + res * (np.arange(n) + 0.5)
