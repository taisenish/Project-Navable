import pytest
from src.services.geocoder import Geocoder, Coordinate

def test_geocoder_matching():
    # Instantiate with relative path to the existing pois file
    geocoder = Geocoder(poi_file_path="../backend/src/data/uw_pois.json")
    
    # 1. Exact match test
    coord1 = geocoder.geocode("Fluke Hall")
    assert coord1 is not None
    # We saw in file: lat 47.655827, lng -122.303223
    assert abs(coord1.lat - 47.655827) < 0.001
    assert abs(coord1.lng - (-122.303223)) < 0.001
    
    # 2. Substring match test
    coord2 = geocoder.geocode("Fluke Hall Assisted Entry")
    assert coord2 is not None
    assert abs(coord2.lat - 47.655827) < 0.001
    
    # 3. None handling
    assert geocoder.geocode(None) is None
    assert geocoder.geocode("Non-Existent Place 12345") is None
