# QUICK START GUIDE

## 🚀 Get Your Map Running in 2 Minutes

### Step 1: Download the Project

You now have a folder called `gijon-map` with these files:
```
gijon-map/
├── index.html       ← The map webpage
├── map.js          ← Map functionality  
├── README.md       ← Full documentation
├── QUICK_START.md  ← This file
└── data/           ← Map data (608 KB total)
    ├── cycling-lanes.geojson
    ├── bus-stops.geojson
    └── pollution.geojson
```

### Step 2: Open the Map Locally

**Option A: Simple Python Server** (Recommended)

Open Terminal/Command Prompt, navigate to the `gijon-map` folder:

```bash
cd /path/to/gijon-map
python3 -m http.server 8000
```

Then open your browser to: **http://localhost:8000**

**Option B: Just Double-Click**

Simply double-click `index.html` to open it in your browser.

⚠️ If layers don't load, your browser is blocking local files. Use Option A instead.

### Step 3: Test the Features

✅ You should see:
- A map centered on Gijón
- Blue lines = cycling lanes
- Orange bus icons = bus stops  
- Colored circles = air quality stations

✅ Try clicking:
- Toggle checkboxes in the "Capas del Mapa" panel
- Click on any cycling lane, bus stop, or pollution station
- Zoom in/out, drag the map around

### Step 4: Deploy Online (Optional)

**Easiest: Netlify Drop**
1. Go to: https://app.netlify.com/drop
2. Drag the entire `gijon-map` folder onto the page
3. Get instant live URL (e.g., `https://random-name.netlify.app`)
4. Share with your NGO members!

**Or use GitHub Pages:**
1. Create GitHub account (if you don't have one)
2. Create new repository
3. Upload these files
4. Enable GitHub Pages in Settings
5. Map live at: `https://[username].github.io/[repo-name]/`

---

## 🎯 What You Have Now

✅ **Working interactive map** with 3 data layers  
✅ **All data from February 18, 2026** (cycling lanes, bus stops, pollution)  
✅ **No database or backend needed** - just static files  
✅ **Mobile-friendly** - works on phones and tablets  
✅ **Free to host** - use Netlify, GitHub Pages, or Vercel  

---

## 📊 Data Summary

| Layer | Source | Features | Size |
|-------|--------|----------|------|
| Cycling lanes | OpenStreetMap | 600+ segments | 372 KB |
| Bus stops | OpenStreetMap | 500+ stops | 233 KB |
| Air quality | Gijón Open Data | 7 stations | 3.5 KB |

All stations currently show **GOOD** air quality! ✨

---

## 🔄 Updating the Data

### Monthly: Update cycling lanes and bus stops

1. Visit: https://overpass-turbo.eu/
2. Use the queries from README.md
3. Export new GeoJSON files
4. Replace files in `data/` folder
5. Redeploy

### Weekly: Update pollution data

1. Download from: https://www.gijon.es/es/datos?sector=Medio%20ambiente
2. Convert to GeoJSON (ask Claude for help with Python script)
3. Replace `data/pollution.geojson`
4. Redeploy

---

## ❓ Troubleshooting

**Map loads but no blue lines/icons?**
→ Use Python server (Option A above), don't just double-click

**Layers appear but nothing shows when I click?**
→ Check browser console (F12) for errors. GeoJSON files might be corrupted.

**Want to change the starting zoom or center?**
→ Edit `map.js`, line 2: `setView([43.5138, -5.6535], 13)`
   - First number = latitude
   - Second number = longitude  
   - Third number = zoom level (higher = more zoomed in)

**Need help?**
→ Read the full `README.md` file
→ Ask Claude for assistance

---

## 🎉 Success!

You now have a working map visualization. This is **Phase 1 MVP**.

**Next phases could add:**
- User submissions (report missing lanes, problems)
- Historical trends
- Statistics dashboard
- More data layers (schools, traffic, green spaces)

But for now, test this with your NGO members and gather feedback!

---

**Created:** February 18, 2026  
**Total project size:** 628 KB  
**Time to deploy:** ~5 minutes  
