#!/usr/bin/env python3
"""
Capture daily pollution snapshot and add to historical data
Creates a new daily GeoJSON file for today's date
"""

import json
import urllib.request
from datetime import datetime, timedelta
from collections import defaultdict
import os

# API URL for pollution data
DATA_URL = "https://opendata.gijon.es/descargar.php?id=1&tipo=JSON"

# Month names in Spanish
MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

def download_pollution_data():
    """Download the latest pollution data"""
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
    station_data = defaultdict(lambda: {
        'pm25': [], 'pm10': [], 'no2': [], 'o3': [],
        'name': None, 'lat': None, 'lon': None,
        'latest_date': None, 'latest_period': 0
    })
    
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
        
        # Store station info
        if station_data[station_id]['name'] is None:
            station_data[station_id]['name'] = reading['título']
            station_data[station_id]['lat'] = reading['latitud']
            station_data[station_id]['lon'] = reading['longitud']
        
        # Collect readings
        if reading.get('pm25') and reading['pm25'] != "":
            try:
                station_data[station_id]['pm25'].append(float(reading['pm25']))
            except (ValueError, TypeError):
                pass
        
        if reading.get('pm10') and reading['pm10'] != "":
            try:
                station_data[station_id]['pm10'].append(float(reading['pm10']))
            except (ValueError, TypeError):
                pass
        
        if reading.get('no2') and reading['no2'] != "":
            try:
                station_data[station_id]['no2'].append(float(reading['no2']))
            except (ValueError, TypeError):
                pass
        
        if reading.get('o3') and reading['o3'] != "":
            try:
                station_data[station_id]['o3'].append(float(reading['o3']))
            except (ValueError, TypeError):
                pass
        
        # Track latest reading
        date_str = reading.get('fecha', '')
        periodo = reading.get('periodo', 0)
        
        if date_str:
            if (station_data[station_id]['latest_date'] is None or 
                date_str > station_data[station_id]['latest_date'] or
                (date_str == station_data[station_id]['latest_date'] and 
                 periodo > station_data[station_id]['latest_period'])):
                station_data[station_id]['latest_date'] = date_str
                station_data[station_id]['latest_period'] = periodo
    
    if stale_readings > 0:
        print(f"⚠ Filtered out {stale_readings} stale readings (older than 30 days)")
    print(f"✓ Using {valid_readings} valid readings")
    
    return station_data

def calculate_aqi(pm25, pm10, no2):
    """Calculate simplified AQI score based on EU standards"""
    scores = []
    
    if pm25:
        scores.append(pm25 / 25 * 100)
    if pm10:
        scores.append(pm10 / 50 * 100)
    if no2:
        scores.append(no2 / 40 * 100)
    
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

def create_daily_snapshot(pollution_data, station_averages, date):
    """Create GeoJSON snapshot for specific date"""
    features = []
    
    year, month, day = date.year, date.month, date.day
    
    for station_id, data in station_averages.items():
        # Calculate averages
        avg_pm25 = sum(data['pm25']) / len(data['pm25']) if data['pm25'] else None
        avg_pm10 = sum(data['pm10']) / len(data['pm10']) if data['pm10'] else None
        avg_no2 = sum(data['no2']) / len(data['no2']) if data['no2'] else None
        avg_o3 = sum(data['o3']) / len(data['o3']) if data['o3'] else None
        
        # Calculate AQI
        aqi_score = calculate_aqi(avg_pm25, avg_pm10, avg_no2)
        aqi_level, color = get_aqi_level(aqi_score)
        
        # Create timestamp
        latest_reading = None
        if data['latest_date']:
            latest_reading = f"{data['latest_date']} {data['latest_period']:02d}:00"
        
        # Create feature
        feature = {
            "type": "Feature",
            "properties": {
                "station_id": station_id,
                "name": data['name'],
                "year": year,
                "month": month,
                "day": day,
                "date": date.strftime("%Y-%m-%d"),
                "pm25_avg": round(avg_pm25, 1) if avg_pm25 else None,
                "pm10_avg": round(avg_pm10, 1) if avg_pm10 else None,
                "no2_avg": round(avg_no2, 1) if avg_no2 else None,
                "o3_avg": round(avg_o3, 1) if avg_o3 else None,
                "aqi_score": round(aqi_score, 1) if aqi_score else None,
                "aqi_level": aqi_level,
                "color": color,
                "latest_reading": latest_reading
            },
            "geometry": {
                "type": "Point",
                "coordinates": [data['lon'], data['lat']]
            }
        }
        
        features.append(feature)
    
    return {
        "type": "FeatureCollection",
        "features": features
    }

def update_index(date, filename):
    """Update index.json with new daily entry"""
    index_path = "historical-pollution/index.json"
    
    # Load existing index
    if os.path.exists(index_path):
        with open(index_path, 'r') as f:
            index = json.load(f)
    else:
        index = {
            "total_periods": 0,
            "periods": [],
            "granularity_summary": {}
        }
    
    # Create new entry
    day = date.day
    month_name = MONTH_NAMES[date.month - 1]
    year = date.year
    
    new_entry = {
        "date": date.strftime("%Y-%m-%d"),
        "display": f"{day} {month_name} {year}",
        "file": filename,
        "granularity": "daily",
        "year": year,
        "month": date.month,
        "day": day
    }
    
    # Check if entry already exists (by date)
    existing_index = next((i for i, p in enumerate(index['periods']) 
                          if p.get('date') == new_entry['date']), None)
    
    if existing_index is not None:
        # Update existing entry
        index['periods'][existing_index] = new_entry
        print(f"✓ Updated existing entry for {new_entry['date']}")
    else:
        # Add new entry (insert in correct chronological position)
        inserted = False
        for i, period in enumerate(index['periods']):
            if period.get('date', '') > new_entry['date']:
                index['periods'].insert(i, new_entry)
                inserted = True
                break
        
        if not inserted:
            index['periods'].append(new_entry)
        
        print(f"✓ Added new entry for {new_entry['date']}")
    
    # Update totals
    index['total_periods'] = len(index['periods'])
    
    # Save updated index
    with open(index_path, 'w') as f:
        json.dump(index, f, indent=2)
    
    print(f"✓ Index updated (total periods: {index['total_periods']})")

def main():
    """Main execution"""
    print("=" * 70)
    print("Daily Pollution Snapshot")
    print("=" * 70)
    
    # Get today's date
    today = datetime.now()
    date_str = today.strftime("%Y-%m-%d")
    filename = f"pollution-{date_str}.geojson"
    filepath = f"historical-pollution/{filename}"
    
    print(f"Date: {date_str}")
    print(f"File: {filename}")
    print()
    
    # Download data
    pollution_data = download_pollution_data()
    
    # Calculate station averages
    print("Calculating station averages...")
    station_averages = calculate_station_averages(pollution_data)
    print(f"✓ Processed {len(station_averages)} stations")
    
    # Create snapshot
    print("Creating daily snapshot...")
    snapshot = create_daily_snapshot(pollution_data, station_averages, today)
    
    # Save snapshot
    os.makedirs("historical-pollution", exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(snapshot, f, indent=2, ensure_ascii=False)
    print(f"✓ Snapshot saved to {filepath}")
    
    # Update index
    print("Updating index...")
    update_index(today, filename)
    
    print()
    print("=" * 70)
    print("✓ Daily snapshot complete!")
    print("=" * 70)

if __name__ == "__main__":
    main()
