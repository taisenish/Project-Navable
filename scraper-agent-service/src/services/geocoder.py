import os
import json
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class Coordinate(BaseModel):
    lat: float
    lng: float


class Geocoder:
    def __init__(self, poi_file_path: str = "../backend/src/data/uw_pois.json"):
        self.poi_file_path = poi_file_path
        self.pois = []
        self._load_pois()

    def _load_pois(self):
        """Loads POI data from the backend's uw_pois.json file."""
        path = self.poi_file_path
        if not os.path.isabs(path):
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            alt_path = os.path.join(base_dir, path.replace("../", ""))
            
            if os.path.exists(path):
                target_path = path
            elif os.path.exists(alt_path):
                target_path = alt_path
            else:
                logger.warning(f"POI file not found at {path} or {alt_path}. Geocoding will be disabled or fallback to mock matching.")
                return
        else:
            target_path = path

        try:
            logger.info(f"Loading POI database from {target_path}")
            with open(target_path, "r", encoding="utf-8") as f:
                self.pois = json.load(f)
            logger.info(f"Loaded {len(self.pois)} POIs successfully for geocoding")
        except Exception as e:
            logger.error(f"Error loading POI file: {e}")

    def geocode(self, location_name: Optional[str]) -> Optional[Coordinate]:
        """
        Geocodes a location name by fuzzy/substring matching against the POI list.
        Returns Coordinate(lat, lng) if matched, else None.
        """
        if not location_name or not self.pois:
            return None

        normalized_query = location_name.strip().lower()
        logger.info(f"Geocoding location: '{location_name}' (normalized: '{normalized_query}')")

        for poi in self.pois:
            poi_name = poi.get("name", "").strip().lower()
            if normalized_query == poi_name:
                loc = poi.get("location", {})
                if "lat" in loc and "lng" in loc:
                    logger.info(f"Found exact match: '{poi.get('name')}' -> {loc}")
                    return Coordinate(lat=loc["lat"], lng=loc["lng"])

        best_match = None
        for poi in self.pois:
            poi_name = poi.get("name", "").strip().lower()
            if normalized_query in poi_name or poi_name in normalized_query:
                loc = poi.get("location", {})
                if "lat" in loc and "lng" in loc:
                    best_match = Coordinate(lat=loc["lat"], lng=loc["lng"])
                    logger.info(f"Found substring match: '{poi.get('name')}' -> {loc}")
                    if normalized_query in poi_name:
                        break

        if best_match:
            return best_match

        query_words = set(normalized_query.split())
        for poi in self.pois:
            poi_name = poi.get("name", "").strip().lower()
            poi_words = set(poi_name.split())
            intersection = query_words.intersection(poi_words)
            meaningful_words = intersection - {
                "hall", "entry", "assisted", "building", "square", "gate", "road", "street", "ave", "place", "center", "room",
                "laundry", "apartments", "house", "garage", "court", "tower", "north", "south", "east", "west",
                "clinic", "office", "lab", "laboratory", "hub", "pavilion", "library", "station", "park", "parking",
                "lot", "plaza", "common", "commons", "field", "walk", "path", "way", "drive", "lane", "boulevard", "blvd",
                "circle", "terrace", "villa", "villas", "residence", "suites", "suite", "home", "centre", "complex",
                "facilities", "facility", "services", "service", "department", "dept", "division", "admin", "administration",
                "school", "college", "university", "inst", "institute", "ctr", "annex", "wing", "mall", "lawn", "deck",
                "dock", "port", "bay", "cafe", "cafeteria", "dining", "food", "restaurant",
                "of", "the", "and", "at", "in", "a", "an", "for", "with", "on", "to", "by", "from"
            }
            if len(meaningful_words) >= 1:
                loc = poi.get("location", {})
                if "lat" in loc and "lng" in loc:
                    logger.info(f"Found fuzzy word-overlap match: '{poi.get('name')}' -> {loc}")
                    return Coordinate(lat=loc["lat"], lng=loc["lng"])

        logger.warning(f"Could not geocode location: '{location_name}'")
        return None
