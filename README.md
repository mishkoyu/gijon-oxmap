# Mapa de Infraestructura Ciclista - Gijón

Interactive map showing cycling infrastructure, public transport, and air quality data for Gijón, Spain.

## Features

- 🚴 **Cycling lanes** from OpenStreetMap (372 KB of data)
- 🚌 **Bus stops** from OpenStreetMap (233 KB of data)  
- 🌡️ **Air quality monitoring** from Gijón open data (7 stations)
- ✨ Toggle layers on/off
- 📍 Click features for detailed information
- 📱 Mobile-responsive design

## Project Structure

```
gijon-map/
├── index.html          # Main HTML page
├── map.js             # Map functionality
├── README.md          # This file
└── data/
    ├── cycling-lanes.geojson   # Cycling infrastructure
    ├── bus-stops.geojson       # Bus stop locations
    └── pollution.geojson       # Air quality data
```

## Local Testing

### Option 1: Python Simple Server (Recommended)

Open terminal in the `gijon-map` folder and run:

```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then open: `http://localhost:8000`

### Option 2: VS Code Live Server

1. Install "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

### Option 3: Direct File Open

Simply double-click `index.html` to open in your browser.

**Note:** Some browsers block loading local files via JavaScript for security. If the map loads but layers don't appear, use Option 1 or 2.

## Deployment Options

### GitHub Pages (Free)

1. Create a GitHub repository
2. Push this folder to the repo
3. Go to Settings → Pages
4. Select main branch as source
5. Your map will be live at: `https://[username].github.io/[repo-name]/`

### Vercel (Free)

1. Install Vercel CLI: `npm install -g vercel`
2. Run: `vercel` in this folder
3. Follow prompts
4. Map is deployed instantly

### Netlify (Free)

1. Drag and drop this folder to: https://app.netlify.com/drop
2. Instant deployment

## Data Sources

### Cycling Lanes
- **Source:** OpenStreetMap
- **Exported:** February 18, 2026
- **Query:** All cycleways, bike lanes, and designated bicycle paths in Gijón
- **Update:** Re-export from Overpass Turbo monthly

### Bus Stops
- **Source:** OpenStreetMap  
- **Exported:** February 18, 2026
- **Features:** 500+ bus stops with names and routes
- **Update:** Re-export from Overpass Turbo monthly

### Air Quality
- **Source:** Gijón City Council Open Data Portal
- **URL:** https://www.gijon.es/es/datos?sector=Medio%20ambiente
- **Stations:** 7 monitoring stations across the city
- **Metrics:** PM2.5, PM10, NO₂, O₃
- **Update:** Download weekly for latest readings

## Updating Data

### To update cycling lanes:

1. Go to: https://overpass-turbo.eu/
2. Zoom to Gijón
3. Paste query:
```
[out:json][timeout:25];
(
  way["highway"="cycleway"]({{bbox}});
  way["cycleway"]({{bbox}});
  way["highway"="path"]["bicycle"="designated"]({{bbox}});
);
out geom;
```
4. Click Run → Export → GeoJSON
5. Save as `data/cycling-lanes.geojson`

### To update bus stops:

Same process, but use this query:
```
[out:json][timeout:25];
node["highway"="bus_stop"]({{bbox}});
out;
```
Save as `data/bus-stops.geojson`

### To update pollution data:

1. Download latest JSON from: https://www.gijon.es/es/datos?sector=Medio%20ambiente
2. Run the Python script (see `scripts/convert-pollution.py`) to convert to GeoJSON
3. Save as `data/pollution.geojson`

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## Technical Details

- **Map library:** Leaflet.js 1.9.4
- **Base map:** OpenStreetMap tiles
- **Data format:** GeoJSON
- **No backend required:** Pure static files
- **No API keys needed:** All free, open data

## Future Enhancements

Planned features for future versions:

- [ ] User-contributed data (report missing lanes, problems)
- [ ] Historical pollution trends
- [ ] Route planning
- [ ] Export/print functionality
- [ ] Multiple language support
- [ ] Dark mode

## License

- **Code:** MIT License (free to use and modify)
- **Map data:** © OpenStreetMap contributors (ODbL)
- **Pollution data:** Gijón City Council (check their terms)

## Contact

Created by: [Your NGO Name]
For questions or contributions: [contact info]

---

**Last updated:** February 18, 2026
