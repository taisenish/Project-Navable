#!/usr/bin/env python3
import urllib.request
import ssl
import json
import math
import csv
from pathlib import Path

MAP_ID = "2099"
KEY = "0001085cc708b9cef47080f064612ca5"

WHEELCHAIR_CAT = 96151
LIMITED_MOBILITY_CAT = 96155

POI_MAPPINGS = {
    76908: ("entrance", ["assisted-entry", "accessible"]),
    83875: ("entrance", ["academic", "building"]),
    76897: ("entrance", ["arts", "museum", "gallery"]),
    76895: ("entrance", ["athletics", "sports", "recreation"]),
    76896: ("entrance", ["housing", "dorm", "residence"]),
    86275: ("entrance", ["library", "study", "books"]),
    86264: ("entrance", ["medical", "hospital", "clinic"]),
    87505: ("entrance", ["cafe", "food", "coffee"]),
    87506: ("entrance", ["market", "store", "grocery"]),
    76910: ("entrance", ["restaurant", "food", "dining"]),
    86276: ("entrance", ["emergency", "phone", "safety"]),
    76900: ("entrance", ["gatehouse", "security"]),
    99201: ("entrance", ["parking", "car", "lot"]),
    76903: ("entrance", ["parking", "visitor", "pay-by-phone"]),
    76902: ("entrance", ["parking", "motorcycle"]),
    76906: ("entrance", ["transit", "light-rail", "train"]),
    76907: ("entrance", ["transit", "bus", "stop"]),
    103422: ("entrance", ["transit", "shuttle", "night"])
}

ALL_CATS = [WHEELCHAIR_CAT, LIMITED_MOBILITY_CAT] + list(POI_MAPPINGS.keys())
CATEGORIES_STR = ",".join(str(c) for c in ALL_CATS)

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the great-circle distance between two points in meters."""
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def round_coord(val, decimals=6):
    return round(float(val), decimals)

def main():
    """Extract, transform, and export map features from Concept3D API.
    
    Fetches raw map layers, breaks polylines into deduplicated edges with slope 
    and surface properties, identifies and cleans POI metadata, and writes the 
    structured data to CSV and JSON formats for the routing backend.
    """
    print("🚀 Starting University of Washington Map Data Extractor...")
    
    url = f"https://api.concept3d.com/categories/{CATEGORIES_STR}?map={MAP_ID}&batch&children&key={KEY}"
    print(f"📡 Requesting Concept3D layers...")
    
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    )
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            res_data = response.read().decode('utf-8')
            categories = json.loads(res_data)
    except Exception as e:
        print(f"❌ Error fetching from Concept3D API: {e}")
        return

    print(f"✅ Fetched {len(categories)} categories.")
    
    edges_dict = {}
    pois = []
    
    for cat in categories:
        cat_id = cat.get('catId')
        cat_name = cat.get('name')
        children = cat.get('children', {})
        locations = children.get('locations', [])
        
        if not cat_id or not locations:
            continue
            
        print(f"📦 Processing category: '{cat_name}' (ID: {cat_id}) with {len(locations)} locations.")
        
        if cat_id in (WHEELCHAIR_CAT, LIMITED_MOBILITY_CAT):
            is_wheelchair = (cat_id == WHEELCHAIR_CAT)
            slope = 1.5 if is_wheelchair else 3.5
            surface = "paved"
            
            for loc in locations:
                shape = loc.get('shape')
                if not shape or shape.get('type') != 'polyline':
                    continue
                    
                path = shape.get('path', [])
                if len(path) < 2:
                    continue
                    
                for i in range(len(path) - 1):
                    p1 = path[i]
                    p2 = path[i+1]
                    
                    lat1, lng1 = round_coord(p1[0]), round_coord(p1[1])
                    lat2, lng2 = round_coord(p2[0]), round_coord(p2[1])
                    
                    node_a = (lat1, lng1)
                    node_b = (lat2, lng2)
                    
                    if node_a == node_b:
                        continue
                        
                    edge_key = tuple(sorted([node_a, node_b]))
                    
                    dist = haversine_distance(lat1, lng1, lat2, lng2)
                    if dist < 0.1:
                        continue
                        
                    edge_data = {
                        "start_lat": edge_key[0][0],
                        "start_lng": edge_key[0][1],
                        "end_lat": edge_key[1][0],
                        "end_lng": edge_key[1][1],
                        "distance_meters": int(round(dist)),
                        "slope_percent": slope,
                        "has_stairs": "false",
                        "surface": surface,
                        "is_closed": "false"
                    }
                    
                    if edge_key in edges_dict:
                        if is_wheelchair:
                            edges_dict[edge_key]["slope_percent"] = 1.5
                    else:
                        edges_dict[edge_key] = edge_data
                        
        elif cat_id in POI_MAPPINGS:
            poi_type, default_tags = POI_MAPPINGS[cat_id]
            for loc in locations:
                poi_id = f"uw-{loc.get('id')}"
                name = loc.get('name', '').strip()
                lat = loc.get('lat')
                lng = loc.get('lng')
                
                if not name or lat is None or lng is None:
                    continue
                    
                name = name.replace('\u00a0', ' ').strip()
                
                tags = list(default_tags)
                name_lower = name.lower()
                final_poi_type = "entrance"
                
                if "elevator" in name_lower:
                    final_poi_type = "elevator"
                    tags.append("elevator")
                elif "ramp" in name_lower:
                    final_poi_type = "ramp"
                    tags.append("ramp")
                elif "restroom" in name_lower or "bathroom" in name_lower or "toilet" in name_lower:
                    final_poi_type = "restroom"
                    tags.append("restroom")
                else:
                    final_poi_type = poi_type

                # Mark as accessible if this is a dedicated assisted-entry category,
                # or if the POI type/name indicates an accessible feature.
                is_accessible = (
                    cat_id == 76908  # Assisted Entry category
                    or final_poi_type in ("elevator", "ramp")
                    or "accessible" in name_lower
                    or "assisted" in name_lower
                )
                    
                pois.append({
                    "id": poi_id,
                    "name": name,
                    "type": final_poi_type,
                    "is_accessible": is_accessible,
                    "location": {
                        "lat": float(lat),
                        "lng": float(lng)
                    },
                    "tags": list(set(tags))
                })

    print(f"📊 Extraction Complete!")
    print(f"   * Total Edges Extracted: {len(edges_dict)}")
    print(f"   * Total POIs Extracted: {len(pois)}")

    script_dir = Path(__file__).resolve().parent
    backend_data_dir = script_dir.parent / "backend" / "src" / "data"
    
    if not backend_data_dir.exists():
        print(f"⚠️  Backend data dir not found at {backend_data_dir}, writing to current directory.")
        backend_data_dir = Path(".")
        
    edges_file = backend_data_dir / "campus_edges.csv"
    pois_file = backend_data_dir / "uw_pois.json"
    
    with edges_file.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["start_lat", "start_lng", "end_lat", "end_lng", "distance_meters", "slope_percent", "has_stairs", "surface", "is_closed"])
        for edge in edges_dict.values():
            writer.writerow([
                edge["start_lat"],
                edge["start_lng"],
                edge["end_lat"],
                edge["end_lng"],
                edge["distance_meters"],
                edge["slope_percent"],
                edge["has_stairs"],
                edge["surface"],
                edge["is_closed"]
            ])
            
    with pois_file.open("w", encoding="utf-8") as f:
        json.dump(pois, f, indent=2, ensure_ascii=False)
        
    print(f"💾 Saved {len(edges_dict)} edges to {edges_file}")
    print(f"💾 Saved {len(pois)} POIs to {pois_file}")
    print("🎉 Done!")

if __name__ == "__main__":
    main()
