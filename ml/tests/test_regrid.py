import numpy as np
import pytest

from data.regrid import ConservativeRegridder, cell_edges, target_axis


def test_target_axis():
    c = target_axis(5.0, 6.0, 0.25)
    np.testing.assert_allclose(c, [5.125, 5.375, 5.625, 5.875])
    with pytest.raises(ValueError):
        target_axis(5.0, 6.1, 0.25)


def test_constant_field_preserved_on_misaligned_grid():
    # GLORYS-like 1/12 deg grid (centres on multiples of 1/12) -> 0.25 deg
    src_lat = np.arange(4.5, 7.5, 1 / 12)
    src_lon = np.arange(44.5, 47.5, 1 / 12)
    rg = ConservativeRegridder(src_lat, src_lon, target_axis(5, 7, 0.25), target_axis(45, 47, 0.25))
    out, cov = rg(np.full((src_lat.size, src_lon.size), 3.7))
    np.testing.assert_allclose(out, 3.7, rtol=1e-6)
    np.testing.assert_allclose(cov, 1.0, rtol=1e-6)


def test_block_average_when_aligned():
    # 0.125 -> 0.25: each output is the (area-weighted) mean of a 2x2 block
    src_lat = target_axis(5, 6, 0.125)
    src_lon = target_axis(45, 46, 0.125)
    data = np.arange(64, dtype=float).reshape(8, 8)
    rg = ConservativeRegridder(src_lat, src_lon, target_axis(5, 6, 0.25), target_axis(45, 46, 0.25))
    out, _ = rg(data)
    expected_lon_mean = data.reshape(8, 4, 2).mean(-1)
    # latitude weights differ by cos(lat) only marginally; tolerance covers it
    expected = expected_lon_mean.reshape(4, 2, 4).mean(1)
    np.testing.assert_allclose(out, expected, atol=0.02)


def test_mass_conservation():
    rng = np.random.default_rng(0)
    src_lat = np.arange(4.5, 7.5, 1 / 12)
    src_lon = np.arange(44.5, 47.5, 1 / 12)
    data = rng.normal(size=(src_lat.size, src_lon.size))
    rg = ConservativeRegridder(src_lat, src_lon, src_lat, src_lon)
    out, _ = rg(data)
    np.testing.assert_allclose(out, data, atol=1e-5)  # identity regrid


def test_nan_handling_and_coverage():
    src_lat = target_axis(5, 6, 0.125)
    src_lon = target_axis(45, 46, 0.125)
    data = np.ones((8, 8))
    data[:2, :2] = np.nan  # whole first output cell is land
    data[2, 2] = np.nan  # quarter of second-row, second-col output cell
    rg = ConservativeRegridder(src_lat, src_lon, target_axis(5, 6, 0.25), target_axis(45, 46, 0.25))
    out, cov = rg(data)
    assert np.isnan(out[0, 0]) and cov[0, 0] == 0
    assert out[1, 1] == pytest.approx(1.0) and cov[1, 1] == pytest.approx(0.75, abs=0.01)


def test_leading_axes_broadcast():
    src_lat = target_axis(5, 6, 0.125)
    src_lon = target_axis(45, 46, 0.125)
    data = np.ones((3, 5, 8, 8)) * np.arange(3)[:, None, None, None]
    rg = ConservativeRegridder(src_lat, src_lon, target_axis(5, 6, 0.25), target_axis(45, 46, 0.25))
    out, _ = rg(data)
    assert out.shape == (3, 5, 4, 4)
    np.testing.assert_allclose(out[2], 2.0)


def test_rejects_destination_outside_source():
    with pytest.raises(ValueError):
        ConservativeRegridder(target_axis(5, 6, 0.125), target_axis(45, 46, 0.125),
                              target_axis(4, 6, 0.25), target_axis(45, 46, 0.25))


def test_cell_edges_irregular():
    with pytest.raises(ValueError):
        cell_edges(np.array([0.0, 1.0, 3.0]))
