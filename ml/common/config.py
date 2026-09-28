"""Config loading, path resolution, seeding and run provenance shared by all ml/ scripts."""
from __future__ import annotations

import hashlib
import json
import os
import random
import subprocess
from pathlib import Path

import numpy as np
import yaml

ML_ROOT = Path(__file__).resolve().parents[1]


def load_config(path: str | os.PathLike) -> dict:
    path = Path(path)
    if not path.is_absolute():
        path = (Path.cwd() / path).resolve()
    with open(path, encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    cfg["_path"] = str(path)
    cfg["_hash"] = config_hash(cfg)
    return cfg


def config_hash(cfg: dict) -> str:
    clean = {k: v for k, v in cfg.items() if not k.startswith("_")}
    return hashlib.sha256(json.dumps(clean, sort_keys=True, default=str).encode()).hexdigest()[:12]


def resolve(cfg: dict, key: str) -> Path:
    """Paths in config are relative to ml/."""
    p = Path(cfg["paths"][key])
    return p if p.is_absolute() else ML_ROOT / p


def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)
    try:
        import torch

        torch.manual_seed(seed)
        torch.use_deterministic_algorithms(True, warn_only=True)
    except ImportError:
        pass


def git_commit() -> str | None:
    try:
        out = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ML_ROOT, capture_output=True, text=True, timeout=10)
        return out.stdout.strip() or None
    except (OSError, subprocess.SubprocessError):
        return None


def provenance(cfg: dict) -> dict:
    """Block that every output file (stats, metrics) must carry."""
    return {
        "config_path": cfg["_path"],
        "config_hash": cfg["_hash"],
        "git_commit": git_commit(),
        "seed": cfg["seed"],
        "domain": cfg["domain"],
        "split": cfg["split"],
        "products": {k: {"product_id": v["product_id"], "dataset_id": v["dataset_id"],
                         "dataset_version": v.get("dataset_version")}
                     for k, v in cfg["products"].items()},
    }


def split_years(cfg: dict) -> dict[str, list[int]]:
    return {name: list(range(y[0], y[1] + 1)) for name, y in cfg["split"]["years"].items()}


def all_years(cfg: dict) -> list[int]:
    return sorted({y for ys in split_years(cfg).values() for y in ys})


def split_dates(cfg: dict):
    """Daily dates per split. The last `guard_days` of the train period are dropped so that
    train and val are not near-duplicates across the boundary (subsurface persistence)."""
    import pandas as pd

    out = {}
    for name, years in split_years(cfg).items():
        idx = pd.date_range(f"{years[0]}-01-01", f"{years[-1]}-12-31", freq="D")
        if name == "train" and cfg["split"].get("guard_days", 0):
            idx = idx[: -cfg["split"]["guard_days"]]
        out[name] = idx
    return out


def season_of_month(month) -> "np.ndarray":
    """Season labels used everywhere (NIO monsoon calendar)."""
    lut = {12: "DJF", 1: "DJF", 2: "DJF", 3: "MAM", 4: "MAM", 5: "MAM",
           6: "JJAS", 7: "JJAS", 8: "JJAS", 9: "JJAS", 10: "ON", 11: "ON"}
    return np.vectorize(lut.get)(np.asarray(month))
