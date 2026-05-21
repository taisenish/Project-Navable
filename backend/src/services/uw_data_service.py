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

    def save_alert(self, alert: Alert) -> None:
        """Saves or updates an alert in the backend JSON file, clearing the cache."""
        file_path = self.data_dir / "uw_alerts.json"
        alerts = []
        if file_path.exists():
            try:
                with file_path.open("r", encoding="utf-8") as f:
                    alerts = json.load(f)
            except Exception:
                alerts = []

        new_alert_dict = alert.model_dump()
        
        updated = False
        for i, existing in enumerate(alerts):
            if existing.get("id") == alert.id:
                alerts[i] = new_alert_dict
                updated = True
                break

        if not updated:
            alerts.append(new_alert_dict)

        with file_path.open("w", encoding="utf-8") as f:
            json.dump(alerts, f, indent=2)

        self.load_alerts.cache_clear()

    @lru_cache(maxsize=1)
    def load_edges(self) -> list[dict[str, str]]:
        with (self.data_dir / "campus_edges.csv").open("r", encoding="utf-8") as f:
            return list(csv.DictReader(f))
