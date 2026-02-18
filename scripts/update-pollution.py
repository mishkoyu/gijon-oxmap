#!/usr/bin/env python3
"""
Download pollution data from Gijón Open Data Portal and convert to GeoJSON
Updates: data/pollution.geojson
"""

import json
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta

# Gijón pollution data URL
DATA_URL = "https://opendata.gijon.es/descargar.php?id=1&tipo=JSON"

def download_pollution_data():
    """Download the latest pollution data from Gijón"""
    print(f"Downloading data from {DATA_URL}...")
    
    try:
        with urllib.request.urlopen(DATA_URL) as response:
            data = json.loads(response.read().decode('utf-8'))
        print("✓ Data downloaded successfully")
        return data
    except Exception as e:
        print(f"✗ Error downloading data: {e}")
        raise

def calculate_station_averages(pollution_data):
    """Calculate average pollution levels per station (excluding stale data)"""
    station_data = defaultdict(lambda: {'pm25': [], 'pm10': [], 'no2': [], 'o3': []})
    
    # Get current date and 30-day cutoff
    today = datetime.now()
    cutoff_date = today - timedelta(days=30)
    
    stale_readings = 0
    valid_readings = 0
    
    for reading in pollution_data['calidadairemediatemporales']['calidadairemediatemporal']:
        station_id = reading['estacion']
        
        # Check date - skip if older than 30 days
        date_str = reading.get('fecha', '')
        if date_str:
            try:
                reading_date = datetime.strptime(date_str, '%Y-%m-%d')
                if reading_date < cutoff_date:
                    stale_readings += 1
                    continue  # Skip this reading - it's too old
            except ValueError:
                pass  # If date parsing fails, include the reading
        
        valid_readings += 1
        
        # Collect PM2.5 readings
        if reading.get('pm25') and reading['pm25'] != "":
            try:
                station_data[station_id]['pm25'].append(float(reading['pm25']))
            except (ValueError, TypeError):
                pass
        
        # Collect PM10 readings
        if reading.get('pm10') and reading['pm10'] != "":
            try:
                station_data[station_id]['pm10'].append(float(reading['pm10']))
            except (ValueError, TypeError):
                pass
        
        # Collect NO2 readings
        if reading.get('no2') and reading['no2'] != "":
            try:
                station_data[station_id]['no2'].append(float(reading['no2']))
            except (ValueError, TypeError):
                pass
        
        # Collect O3 readings
        if reading.get('o3') and reading['o3'] != "":
            try:
                station_data[station_id]['o3'].append(float(reading['o3']))
            except (ValueError, TypeError):
                pass
    
    if stale_readings > 0:
        print(f"⚠ Filtered out {stale_readings} stale readings (older than 30 days)")
    print(f"✓ Processed {valid_readings} valid readings")
    
    return station_data

def calculate_aqi(pm25, pm10, no2):
    """Calculate simplified AQI score based on EU standards"""
    scores = []
    
    if pm25:
        scores.append(pm25 / 25 * 100)  # EU limit: 25 μg/m³
    if pm10:
        scores.append(pm10 / 50 * 100)  # EU limit: 50 μg/m³
    if no2:
        scores.append(no2 / 40 * 100)   # EU limit: 40 μg/m³
    
    if not scores:
        return None
    
    return sum(scores) / len(scores)

def get_aqi_level(score):
    """Determine air quality level from AQI score"""
    if score is None:
        return "No data", "gray"
    elif score < 50:
        return "Good", "green"
    elif score < 75:
        return "Moderate", "yellow"
    elif score < 100:
        return "Poor", "orange"
    else:
        return "Very Poor", "red"

def convert_to_geojson(pollution_data, station_averages):
    """Convert pollution data to GeoJSON format"""
    features = []
    processed_stations = set()
    
    for reading in pollution_data['calidadairemediatemporales']['calidadairemediatemporal']:
        station_id = reading['estacion']
        
        # Only process each station once
        if station_id in processed_stations:
            continue
        
        processed_stations.add(station_id)
        
        # Calculate averages for this station
        avg_pm25 = None
        avg_pm10 = None
        avg_no2 = None
        avg_o3 = None
        
        if station_averages[station_id]['pm25']:
            avg_pm25 = sum(station_averages[station_id]['pm25']) / len(station_averages[station_id]['pm25'])
        
        if station_averages[station_id]['pm10']:
            avg_pm10 = sum(station_averages[station_id]['pm10']) / len(station_averages[station_id]['pm10'])
        
        if station_averages[station_id]['no2']:
            avg_no2 = sum(station_averages[station_id]['no2']) / len(station_averages[station_id]['no2'])
        
        if station_averages[station_id]['o3']:
            avg_o3 = sum(station_averages[station_id]['o3']) / len(station_averages[station_id]['o3'])
        
        # Calculate AQI
        aqi_score = calculate_aqi(avg_pm25, avg_pm10, avg_no2)
        aqi_level, color = get_aqi_level(aqi_score)
        
        # Create GeoJSON feature
        feature = {
            "type": "Feature",
            "properties": {
                "station_id": station_id,
                "name": reading['título'],
                "pm25_avg": round(avg_pm25, 1) if avg_pm25 else None,
                "pm10_avg": round(avg_pm10, 1) if avg_pm10 else None,
                "no2_avg": round(avg_no2, 1) if avg_no2 else None,
                "o3_avg": round(avg_o3, 1) if avg_o3 else None,
                "aqi_score": round(aqi_score, 1) if aqi_score else None,
                "aqi_level": aqi_level,
                "color": color
            },
            "geometry": {
                "type": "Point",
                "coordinates": [reading['longitud'], reading['latitud']]
            }
        }
        
        features.append(feature)
    
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    return geojson

def save_geojson(geojson, output_path):
    """Save GeoJSON to file"""
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, indent=2, ensure_ascii=False)
    print(f"✓ Saved to {output_path}")

def main():
    """Main execution"""
    print("=" * 60)
    print("Gijón Pollution Data Updater")
    print("=" * 60)
    
    # Download data
    pollution_data = download_pollution_data()
    
    # Calculate averages
    print("Calculating station averages...")
    station_averages = calculate_station_averages(pollution_data)
    
    # Convert to GeoJSON
    print("Converting to GeoJSON...")
    geojson = convert_to_geojson(pollution_data, station_averages)
    
    # Save
    output_path = "data/pollution.geojson"
    save_geojson(geojson, output_path)
    
    # Print summary
    print("\n" + "=" * 60)
    print("Update Summary")
    print("=" * 60)
    print(f"Stations updated: {len(geojson['features'])}")
    print("\nStation details:")
    for feature in geojson['features']:
        props = feature['properties']
        print(f"  • {props['name']}: {props['aqi_level']}")
        if props['pm25_avg']:
            print(f"    PM2.5: {props['pm25_avg']} μg/m³")
        if props['no2_avg']:
            print(f"    NO2: {props['no2_avg']} μg/m³")
    
    print("\n✓ Update complete!")

if __name__ == "__main__":
    main()
