from __future__ import annotations

import csv
import json
from functools import lru_cache
from pathlib import Path

from src.models.schemas import Alert, Poi

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class UWDataService:
    def __init__(self, data_dir: Path = DATA_DIR) -> None:
        self.data_dir = data_dir

    @lru_cache(maxsize=1)
    def load_pois(self) -> list[Poi]:
        with (self.data_dir / "uw_pois.json").open("r", encoding="utf-8") as f:
            raw = json.load(f)
        return [Poi.model_validate(item) for item in raw]

    @lru_cache(maxsize=1)
    def load_alerts(self) -> list[Alert]:
        with (self.data_dir / "uw_alerts.json").open("r", encoding="utf-8") as f:
            raw = json.load(f)
        return [Alert.model_validate(item) for item in raw]

    @lru_cache(maxsize=1)
    def load_edges(self) -> list[dict[str, str]]:
        with (self.data_dir / "campus_edges.csv").open("r", encoding="utf-8") as f:
            return list(csv.DictReader(f))
