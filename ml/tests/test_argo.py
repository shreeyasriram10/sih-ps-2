import numpy as np

from data.argo import max_gap, pres_to_depth, profile_to_std

RULES = [[200, 50], [500, 100], [1100, 200]]
STD = np.array([0, 5, 10, 20, 50, 100, 300, 1000], dtype=float)


def test_pres_to_depth_reasonable():
    assert 988 < pres_to_depth(1000.0, 30.0) < 994  # standard ocean ~990-992 m
    assert pres_to_depth(0.0, 10.0) == 0.0
    assert pres_to_depth(1000.0, 5.0) > pres_to_depth(1000.0, 60.0)  # gravity increases with latitude


def test_max_gap():
    assert max_gap(10, RULES) == 50 and max_gap(300, RULES) == 100 and max_gap(1000, RULES) == 200


def test_linear_interpolation_and_surface_rule():
    z = np.array([4.0, 12.0, 30.0, 60.0, 110.0, 290.0, 320.0, 950.0, 1050.0])
    t = 30.0 - 0.02 * z
    out, surf = profile_to_std(z, t, STD, RULES, surf_max=10)
    assert surf  # 0 m (above the 4 m observation) is filled from it; 5 m is interpolated
    assert out[0] == np.float32(t[0])
    np.testing.assert_allclose(out[2:], 30.0 - 0.02 * STD[2:], atol=1e-4)


def test_gap_too_large_gives_nan():
    z = np.array([5.0, 10.0, 120.0, 130.0])  # 110 m gap around 50 and 100 m
    out, _ = profile_to_std(z, np.full(4, 25.0), STD, RULES, surf_max=10)
    assert np.isnan(out[4]) and np.isnan(out[5])
    assert not np.isnan(out[2])


def test_no_surface_extrapolation_when_too_deep():
    z = np.array([15.0, 25.0, 60.0])
    out, surf = profile_to_std(z, np.array([28.0, 27.0, 25.0]), STD, RULES, surf_max=10)
    assert not surf and np.isnan(out[:3]).all() and np.isfinite(out[3])


def test_unsorted_and_duplicate_input():
    z = np.array([50.0, 10.0, 10.0, 100.0, np.nan])
    t = np.array([25.0, 28.0, 28.0, 20.0, 1.0])
    out, _ = profile_to_std(z, t, STD, RULES, surf_max=5)
    assert out[STD == 20][0] == np.float32(28.0 - (10 / 40) * 3.0)
