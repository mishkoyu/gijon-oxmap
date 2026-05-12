markdown# Gijón Sustainable Transport Advocacy Map

## Project Overview

A web-based interactive mapping platform for sustainable transport advocacy in Gijón, Spain. Created by an NGO to visualize cycling infrastructure, public transport, air quality, and enable citizen reporting across 11 report types (illegal parking, scooter obstructions, potholes, accidents, speed measurements, infrastructure proposals, and more).

**Live URLs:**
- Frontend: https://gijon-oxmap.onrender.com
- Backend API: https://oxmap-backend.onrender.com
- Django Admin: https://oxmap-backend.onrender.com/admin/

**Repositories:**
- Frontend: https://github.com/mishkoyu/gijon-oxmap
- Backend: https://github.com/mishkoyu/oxmap-backend

---

## Tech Stack

### Frontend
- **Leaflet.js** - Interactive mapping library
- **OpenStreetMap** - Base map tiles
- **Vanilla JavaScript** - No framework, pure JS
- **HTML/CSS** - Responsive design
- **Cloudinary** - Photo storage (cloud: `dqowkswsh`, preset: `ml_default`)
- **Deployed on:** Render (static site, auto-deploys from GitHub)

### Backend
- **Django 6.0.3** - Python web framework (requires Python 3.12+)
- **Django REST Framework** - API endpoints
- **PostgreSQL** - Production database (Render free tier, 90-day limit)
- **SQLite** - Local development database
- **Gunicorn** - WSGI server
- **WhiteNoise** - Static file serving
- **django-cors-headers** - CORS handling
- **Deployed on:** Render (web service, auto-deploys from GitHub)

### Data Sources
- **OpenStreetMap Overpass API** - Bus routes and stops
- **Gijón Government APIs** - Air quality data, cycling infrastructure
- **IQAir API** - Comparative air quality data
- **Manual GeoJSON files** - Curated datasets for schools, parking

---

## Key Architecture Decisions

### Frontend Architecture

**No Build Process:**
- All vanilla JS, no bundler
- Files loaded directly in HTML
- Keeps deployment simple for non-technical maintainers

**Mobile-First Design:**
- Primary use case: citizens reporting issues from phones on the street
- Collapsible panels on mobile (bottom-left buttons)
- Desktop: left sidebar with OpenStreetMap-style controls

**Data Loading:**
- GeoJSON files fetched at page load
- Air quality API called live on each page load
- No caching to ensure fresh pollution data

**Map Structure:**
- Base Leaflet map with OSM tiles
- Multiple togglable layers (checkboxes in control panel)
- Custom icons and styling for each layer type

### Backend Architecture

**Database Models:**
```python
# reports/models.py - UserReport (primary model)
report_type: CharField  # parking, scooter_parking, pothole, accident, other,
                        # speed, suggestion, new_bike_parking, new_bike_lane,
                        # new_senda, new_urban_furniture
status: CharField       # pending, verified, in_progress, resolved, rejected
latitude: DecimalField(max_digits=9, decimal_places=6)
longitude: DecimalField(max_digits=9, decimal_places=6)
location_blurred: BooleanField  # True for accident reports (privacy)
photo_url: URLField(max_length=500, blank=True)
comment: TextField(max_length=500, blank=True)
type_specific_data: JSONField   # varies by report_type
email: EmailField(blank=True)
wants_updates: BooleanField
created_at: DateTimeField(auto_now_add=True)
status_updated_at: DateTimeField
resolved_at: DateTimeField(null=True)
ip_address: GenericIPAddressField(null=True, blank=True)
vote_count: IntegerField(default=0)  # suggestions only

# reports/models.py - IrregularParking (legacy, kept for data)
latitude, longitude, photo_url, comment, created_at, ip_address
```

**API Design:**
- RESTful endpoints via Django REST Framework
- No authentication (prototype phase - planned for later)
- Rate limiting: 5 reports per hour per IP
- Geographic validation: coordinates must be within Gijón bounds
  - Latitude: 43.47 to 43.58
  - Longitude: -5.73 to -5.58

**CORS Configuration:**
- Allows requests from frontend domain only
- Configured in `settings.py` (NOT environment variables)
- CORS middleware positioned SECOND in middleware stack (critical!)

**Photo Storage:**
- Frontend uploads directly to Cloudinary
- Backend only stores the resulting URL
- No file handling on backend server
- Cloudinary provides CDN delivery

---

## Features Built

### 1. Cycling Infrastructure Layers

**Carriles Bici (Bike Lanes):**
- Solid blue lines (#2563eb)
- 35 route features
- Source: Gijón government GeoJSON

**Sendas Ciclables (Shared Cycling Paths):**
- Dashed green lines (#10b981)
- 16 features
- File: `red-de-sendas-ciclables.geojson`

**Ciclocarriles (Shared Lane Markings):**
- Dash-dot amber lines (#f59e0b)
- 13 features
- File: `red-de-ciclocarriles.geojson`

**Aparcamientos para Bicicletas (Bike Parking):**
- Purple 🅿️ markers
- 189 locations
- File: `aparcamientos-para-bicicletas.geojson`
- Unchecked by default (visual clutter reduction)

### 2. Public Transport Integration

**Bus Stops:**
- 529 stops with line information
- 🚌 emoji markers
- File: `bus-stops.geojson`
- Popups show all lines serving that stop
- Clickable line buttons to highlight routes

**Bus Routes:**
- 49 routes across 25 unique lines
- File: `gijon-bus-routes.geojson`
- Color-coded by line
- Offset rendering for parallel routes (prevents visual overlap)
- Lines: B1, L1, L2, L4, L6, L10, L12, L14, L15, L16, L20, L21, L24, L25, L34, L35, L36, L-2, L-6, L-18, AG1, GA1, GO2, OG2, VAC-160

**Line Selector Panel:**
- "Mostrar todas" button to reset highlighting
- Individual line buttons to highlight specific route
- Solves UX problem of overlapping routes (click-on-route didn't work)

**Technical Implementation:**
- `allRouteReferences[]` array tracks all route layers
- `highlightBusLine(lineRef)` - highlights selected, fades others
- `resetAllBusRoutes()` - restores all routes to default opacity
- Perpendicular vector calculation for route offsetting
- `lines_array` property on each stop for multi-line support

### 3. Air Quality Monitoring

**Gijón Municipal Stations:**
- Live data from government API
- Circle markers with color-coded quality levels:
  - 🟢 Green (#22c55e): Good (0-50 µg/m³)
  - 🟡 Yellow (#eab308): Moderate (50-100 µg/m³)
  - 🟠 Orange (#f97316): Poor (100-150 µg/m³)
  - 🔴 Red (#ef4444): Very Poor (150+ µg/m³)
- Shows NO2, PM10, PM2.5 measurements
- Popups display all pollutant readings

**IQAir Comparative Data:**
- Shows city-wide average for context
- Purple border on markers (#6366f1)
- Allows comparison: municipal stations vs city average

### 4. Points of Interest

**Public Schools (Colegios Públicos):**
- 🏫 emoji markers
- Shows locations where safe routes to school matter
- Advocacy tool for "Safe Routes to School" campaigns

### 5. User-Generated Content: Citizen Reports (11 types)

**Submission Flow:**
1. Right-click (desktop) or long-press (mobile) on map
2. Context menu appears with sections: INCIDENCIAS / MEDICIONES / INFRAESTRUCTURA / PROPUESTAS
3. Select report type → type-specific modal form opens
4. Photo uploads to Cloudinary (required for incidencias, optional for others)
5. Data submits to `/api/user-reports/` backend API
6. Success toast + marker appears on map in the correct layer

**Report Types:**
| Type | Icon | Section | Notes |
|------|------|---------|-------|
| `parking` | 🚗 | INCIDENCIAS | Blocking type, duration, plate |
| `scooter_parking` | 🛴 | INCIDENCIAS | Company (Bird/Lime/Tier/Voi), count, frequency |
| `pothole` | 🕳️ | INCIDENCIAS | Surface, severity, width |
| `accident` | ⚠️ | INCIDENCIAS | Date/time, severity, vehicles — location blurred |
| `other` | ➕ | INCIDENCIAS | Free-form |
| `speed` | 📊 | MEDICIONES | Speed, time of day (auto-detected), road type |
| `suggestion` | 💡 | PROPUESTAS | Votable (cookie-based dedup, 365-day) |
| `new_bike_parking` | 🅿️ | INFRAESTRUCTURA | Capacity, type, urgency |
| `new_bike_lane` | 🛣️ | INFRAESTRUCTURA | Lane type, length, condition |
| `new_senda` | 🌳 | INFRAESTRUCTURA | Path type, length, condition |
| `new_urban_furniture` | 🚧 | INFRAESTRUCTURA | Furniture type, quantity, urgency |

**Map Display:**
- 11 separate Leaflet layer groups (`urLayers` object)
- Status-based marker color: red (<24h pending), orange (<3d), yellow (older), green (verified), amber (in_progress), gray (resolved)
- Layer panel: 4 collapsible sections + collapsible status legend
- Count badges per type, section totals in collapsed headers
- Sections start collapsed by default; panel is scrollable

**Backend Validation:**
- Photo URL must be valid Cloudinary URL (where required)
- Coordinates must be within Gijón bounds
- Rate limiting: 5 reports per hour per IP
- Accident reports have location blurred (privacy)

**Technical Details:**
- Frontend: `user-reports.js` (~2300 lines)
- Key functions: `urHandleOption`, `urDoSubmit`, `urAddReportMarker`, `urGetMarkerColor`
- `urInitializeLayers()` — wires all 11 toggle checkboxes
- `urUpdateLayerCounts()` / `urUpdateSectionTotals()` — update badges on load
- `urToggleSection(id)` — collapse/expand section in layer panel
- `urVoteForSuggestion(id)` — cookie-based vote, updates popup DOM
- Toggle IDs use hyphens: `toggle-parking`, `toggle-scooter-parking`, `toggle-new-bike-parking`, etc.
- Count badge IDs: `count-parking`, `count-scooter-parking`, etc.
- Section total IDs: `total-incidencias`, `total-mediciones`, `total-infraestructura`, `total-propuestas`

### 6. Responsive UI Controls

**Mobile (< 768px):**
- Panels hidden by default
- Bottom-left circular buttons (50px):
  - [≡] Layers
  - [i] Legend
  - [📍] Location
- Panels slide up from bottom (max-height 60vh)
- Semi-transparent overlay behind open panel
- Tap overlay or × button to close
- Only one panel open at a time

**Desktop (≥ 768px):**
- Left sidebar with square buttons (40px):
  - [+] Zoom in
  - [−] Zoom out
  - [≡] Layers
  - [i] Legend
  - [📍] Location
- Panels slide in from left
- Toggle behavior (click again to close)
- One panel at a time
- Close button hidden (not needed on desktop)

**Geolocation Feature:**
- Blue dot marker at user's position
- High accuracy mode (GPS on mobile)
- Pans to user location at zoom 17
- Popup: "📍 Tu ubicación"
- Error handling with Spanish messages
- Use case: Find yourself → report nearby issue

---

## File Structure

### Frontend (`gijon-oxmap`)
gijon-oxmap/
├── index.html              # Main page, includes all CSS/JS
├── map.js                  # Core map logic (955+ lines)
│   ├── Map initialization (Leaflet)
│   ├── Layer loading (cycling, buses, pollution)
│   ├── Bus route offsetting algorithm
│   ├── Line highlighting functions
│   ├── Air quality API integration
│   └── Event handlers
├── user-reports.js         # Citizen reporting system (~2300 lines)
│   ├── Context menu (11 report types)
│   ├── Type-specific forms (mobile-first)
│   ├── Cloudinary upload
│   ├── Backend API calls (/api/user-reports/)
│   ├── 11 Leaflet layer groups (urLayers)
│   ├── Status-based marker coloring
│   ├── Collapsible layer panel sections
│   ├── Voting system for suggestions
│   └── Count badges + section totals
├── [GeoJSON data files]
│   ├── gijon-bus-routes.geojson (49 routes)
│   ├── bus-stops.geojson (529 stops)
│   ├── red-de-sendas-ciclables.geojson (16 paths)
│   ├── red-de-ciclocarriles.geojson (13 lanes)
│   └── aparcamientos-para-bicicletas.geojson (189 spots)
└── README.md (if exists)

### Backend (`oxmap-backend`)
oxmap-backend/
├── config/
│   ├── settings.py         # Django settings
│   │   ├── CORS config (middleware position critical!)
│   │   ├── Database config (dj-database-url)
│   │   ├── ALLOWED_HOSTS = ['*']
│   │   └── Static files (WhiteNoise)
│   ├── urls.py             # URL routing (admin + api/)
│   └── wsgi.py
├── reports/
│   ├── models.py           # UserReport + IrregularParking (legacy) models
│   ├── serializers.py      # DRF serializers
│   │   ├── Cloudinary URL validation
│   │   └── Gijón bounds checking
│   ├── views.py            # ViewSets: UserReportViewSet + IrregularParkingViewSet
│   │   ├── Rate limiting (5/hour per IP)
│   │   ├── Vote action (POST /api/user-reports/{id}/vote/)
│   │   └── Filter by report_type, status, created_after
│   ├── urls.py             # Router for /api/user-reports/ + /api/irregular-parking/
│   └── admin.py            # Admin with status actions + CSV export
├── manage.py
├── requirements.txt        # Python dependencies
├── build.sh                # Render build script
│   ├── pip install
│   ├── collectstatic
│   ├── migrate
│   └── Auto-create superuser (admin/admin123)
├── .env                    # Local only (gitignored)
└── .gitignore

---

## API Endpoints

### Backend API

**Base URL:** `https://oxmap-backend.onrender.com`

**Endpoints:**
GET  /api/user-reports/
Returns: Array of all citizen reports (all types)
Query params: ?report_type=parking&status=pending&created_after=2026-01-01
Response: [
{
  "id": 1,
  "report_type": "parking",
  "status": "pending",
  "latitude": "43.532100",
  "longitude": "-5.661200",
  "location_blurred": false,
  "photo_url": "https://res.cloudinary.com/...",
  "comment": "Blocking bike lane",
  "type_specific_data": {"blocking_type": "Carril bici", "duration": "Más de 1 hora"},
  "created_at": "2026-03-10T16:28:45Z",
  "vote_count": 0
}
]
POST /api/user-reports/
Body: {
  "report_type": "parking",
  "latitude": 43.532100,
  "longitude": -5.661200,
  "photo_url": "https://res.cloudinary.com/...",
  "comment": "Optional comment",
  "type_specific_data": {}
}
Validation:
- coordinates must be in Gijón bounds
- rate limit: 5/hour per IP
- accident reports auto-set location_blurred=true
Response: Created report object (201) or error (400/429)

POST /api/user-reports/{id}/vote/
Increments vote_count (suggestions only). Uses cookie dedup.
Response: { "vote_count": 3 }

GET  /api/irregular-parking/   (legacy - still active)
GET  /admin/
Django admin panel (username: admin, password: see Render logs)
Admin actions: mark_as_verified, mark_as_in_progress, mark_as_resolved, export_as_csv

### External APIs Used

**Cloudinary Image Upload:**
POST https://api.cloudinary.com/v1_1/dqowkswsh/image/upload
Form data:
- file: [binary image]
- upload_preset: ml_default
Response: { secure_url: "https://res.cloudinary.com/..." }

**Gijón Air Quality** (exact endpoint TBD - check map.js):
GET [government API endpoint]
Returns: Station data with NO2, PM10, PM2.5 readings

**IQAir:**
GET [IQAir API endpoint]
Returns: City-wide air quality average

---

## Environment Variables

### Backend (`oxmap-backend`)

**Local Development (.env file):**
SECRET_KEY=django-insecure-dev-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3

**Render Production:**

Currently NO environment variables set (all hardcoded in settings.py).

If you need to add them back:
- `SECRET_KEY` - Django secret key
- `DEBUG` - Set to False in production
- `DATABASE_URL` - Provided automatically by Render PostgreSQL
- `PYTHON_VERSION=3.13.0` - Required for Django 6.0.3

**Note:** We intentionally removed CORS and ALLOWED_HOSTS from env vars because they were overriding settings.py. Everything is now in settings.py for simplicity.

### Frontend

No environment variables needed. Cloudinary credentials are public (upload preset allows anonymous uploads).

---

## Design Decisions & Rationale

### Why No Authentication?

**Decision:** Prototype phase has no user accounts.

**Rationale:**
- Lower barrier to reporting (no signup friction)
- Faster to build and test
- IP-based rate limiting prevents spam
- Sufficient for NGO prototype phase

**Planned:** Pre-moderation workflow when auth is added (reports pending approval).

### Why Leaflet Instead of Google Maps?

**Decision:** Use Leaflet.js with OpenStreetMap.

**Rationale:**
- Free, no API costs
- Open-source aligns with NGO values
- Full control over styling
- OSM data includes cycling infrastructure details
- No vendor lock-in

**Trade-off:** Less polished than Google Maps, but sufficient for advocacy use.

### Why Render Free Tier?

**Decision:** Deploy both frontend and backend on Render free tier.

**Rationale:**
- $0/month for prototype validation
- Easy GitHub integration (auto-deploy)
- Supports both static sites and Django apps
- PostgreSQL included in free tier (90 days)

**Trade-off:** 
- Database resets after 90 days (need to upgrade before then)
- Cold starts after inactivity
- Good enough for prototype, plan to upgrade if successful

**Upgrade Path:** $7/month PostgreSQL + $7/month web service = $14/month when needed.

### Why Direct Cloudinary Upload?

**Decision:** Frontend uploads directly to Cloudinary (not through backend).

**Rationale:**
- Avoids file upload handling on backend
- Reduces server load and storage needs
- Faster uploads (direct to CDN)
- Free tier: 25GB storage

**Security:** Upload preset is public but restricted to specific transformations.

### Why Offset Bus Routes?

**Decision:** Calculate perpendicular offsets for parallel routes instead of layering them.

**Rationale:**
- Overlapping routes were invisible (clicking one showed all of them)
- Line selector panel needed visual distinction
- Users need to see individual routes highlighted
- 5-pixel perpendicular offset makes parallel routes visible

**Implementation:** Vector math to calculate perpendicular direction, offset coordinates accordingly.

### Why No Build Process?

**Decision:** Pure vanilla JS, no webpack/vite/etc.

**Rationale:**
- Simpler deployment (just upload files)
- Non-technical volunteers can edit HTML/CSS
- No build step means faster iteration
- Render can serve static files directly

**Trade-off:** Larger file sizes, no tree-shaking, but not a problem for this scale.

### CORS Middleware Position

**CRITICAL:** `corsheaders.middleware.CorsMiddleware` MUST be second in middleware stack.

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # MUST BE HERE
    'whitenoise.middleware.WhiteNoiseMiddleware',
    # ...
]
```

**Why:** CORS headers must be added before WhiteNoise processes static files. Wrong position = no CORS headers = frontend can't call API.

---

## Known Issues & Limitations

### 1. PostgreSQL Free Tier Resets

**Issue:** Render free tier PostgreSQL has 90-day limit. Database will be deleted.

**Impact:** All user-submitted citizen reports will be lost.

**Workaround:** 
- Upgrade to paid PostgreSQL before 90 days ($7/month)
- OR export data regularly and restore after reset
- OR migrate to another database provider

**Status:** Monitoring. Will upgrade when prototype validated.

### 2. Data Persistence Problems

**Issue:** User-submitted citizen reports have disappeared multiple times during development.

**Suspected Causes:**
- Backend redeployments running fresh migrations
- Free tier database resets
- Auto-created superuser script in build.sh might interfere

**Status:** UNRESOLVED - needs investigation of Render logs to determine root cause.

**TODO:** Check if build.sh superuser creation causes migration issues.

### 3. Geolocation Accuracy

**Issue:** Desktop browsers use IP/WiFi triangulation (inaccurate).

**Impact:** Desktop users might see location 100m+ off their actual position.

**Workaround:** Feature works best on mobile with GPS.

**Mitigation:** Error messages explain this to users.

### 4. Rate Limiting by IP

**Issue:** Multiple users behind same NAT/proxy share one IP.

**Impact:** Entire office/household hits 5-report limit together.

**Status:** Acceptable for prototype. Will improve with user accounts.

### 5. No Offline Support

**Issue:** Map requires internet connection to load tiles and data.

**Impact:** Can't use in areas with poor cell coverage.

**Status:** Not planned. PWA/offline mode is future enhancement.

### 6. Mobile Browser Compatibility

**Issue:** Safari on iOS might handle geolocation differently than Chrome/Firefox.

**Status:** Needs testing on actual iOS devices.

---

## Development Workflow

### Local Frontend Development

```bash
# No build process - just open in browser
# Serve with any static server, e.g.:
python -m http.server 8080
# or
npx serve

# Then visit: http://localhost:8080
```

**Note:** API calls will go to live backend (oxmap-backend.onrender.com).

### Local Backend Development

```bash
cd oxmap-backend

# Create virtual environment (Windows)
py -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
py manage.py migrate

# Create superuser
py manage.py createsuperuser

# Run development server
py manage.py runserver

# Visit: http://127.0.0.1:8000/admin/
# API: http://127.0.0.1:8000/api/user-reports/
```

**Note:** Uses SQLite locally, PostgreSQL in production.

### Deployment

**Both repos auto-deploy on push to `main` branch.**

**Frontend:**
1. Commit changes to `gijon-oxmap`
2. Push to GitHub
3. Render auto-deploys in ~1-2 minutes
4. Visit https://gijon-oxmap.onrender.com

**Backend:**
1. Commit changes to `oxmap-backend`
2. Push to GitHub
3. Render auto-deploys in ~2-3 minutes
4. Runs `build.sh` script automatically
5. Visit https://oxmap-backend.onrender.com/api/user-reports/

### Testing Checklist

**Frontend:**
- [ ] All layers load (check console for errors)
- [ ] Bus routes display with correct offsets
- [ ] Line highlighting works
- [ ] Geolocation button works
- [ ] Right-click context menu appears with all 11 report type options
- [ ] Each form type opens and validates correctly
- [ ] Photo upload to Cloudinary works
- [ ] Report submission succeeds → marker appears in correct layer
- [ ] Layer panel sections collapse/expand with arrow toggle
- [ ] Count badges update after new submission
- [ ] Section totals update after new submission
- [ ] Suggestion voting works (second click blocked by cookie)
- [ ] Status-based marker colors: red/orange/yellow for pending ages
- [ ] Mobile responsive (resize browser to < 768px)
- [ ] Panels slide correctly on mobile
- [ ] Overlay dims background on mobile

**Backend:**
- [ ] Admin panel accessible
- [ ] Can view/update status on reports in admin
- [ ] Admin actions: mark verified/in_progress/resolved, CSV export
- [ ] API returns reports: /api/user-reports/
- [ ] POST creates new report with correct report_type
- [ ] Accident reports auto-set location_blurred=true
- [ ] Vote endpoint increments count (suggestions only)
- [ ] Validation rejects out-of-bounds coordinates
- [ ] Rate limiting works (try 6 submissions rapidly)

---

## Planned Features (Not Yet Built)

### Short Term

1. **Fix Data Persistence Issue**
   - Investigate why reports disappear after redeploys
   - Ensure database migrations don't wipe data
   - Fix build.sh if it's causing problems

2. **Report Clustering**
   - When multiple reports are close together, cluster markers
   - Show count badge on cluster
   - Expand on click to see individual reports

3. **Admin Moderation**
   - Status workflow is built (pending → verified → in_progress → resolved)
   - Pre-moderation (approve before showing on map) not yet implemented

4. **Better Timestamps** ✅ DONE
   - `urTimeAgo()` shows "Hace X horas/días" in all popups

5. **Export Reports** ✅ DONE
   - CSV export action in Django admin (`export_as_csv`)

### Medium Term

6. **User Authentication**
   - Simple email/password accounts
   - Track who submitted what
   - User profiles with submission history
   - Better spam prevention

7. **Report Categories** ✅ DONE
   - 11 report types across 4 sections
   - Type-specific forms and icons
   - Filter by type in API (?report_type=parking)
   - Separate layer toggle per type

8. **Email Notifications**
   - Admin gets email when new report submitted
   - Auto-escalate to city officials
   - "Your report was reviewed" confirmations

9. **Heat Map View**
   - Aggregate reports over time
   - Show problem areas in red
   - Advocacy tool: "This intersection has 23 safety complaints"

10. **Air Quality Improvements**
    - Auto-refresh every 30 minutes
    - Show "Last updated: X minutes ago"
    - Historical data/trends
    - Alerts when air quality degrades

### Long Term

11. **Safe-Route Routing**
    - Click two points, show route using ONLY cycling infrastructure
    - Highlight gaps in network ("no safe route exists here")
    - Advocacy tool: "23% of route requests can't use safe infrastructure"
    - Prefer: sendas > carriles > ciclocarriles > (none = show gap)

12. **Live Location Tracking**
    - Follow user as they move
    - Recalculate route if user goes off-course
    - Turn-by-turn navigation

13. **Multi-Language Support**
    - Spanish (current default)
    - Asturian (regional language)
    - English (for tourists/internationals)

14. **Public API**
    - Let other orgs query the data
    - JSON feeds of reports
    - Documentation for developers

15. **Mobile App**
    - Native iOS/Android apps
    - Offline map caching
    - Push notifications

---

## Data Sources & Attribution

### OpenStreetMap
- **License:** ODbL (Open Database License)
- **Attribution Required:** © OpenStreetMap contributors
- **Usage:** Bus routes, bus stops (via Overpass API)
- **Export:** Exported GeoJSON files in repo

### Gijón Municipal Data
- **Source:** Gobierno del Principado de Asturias
- **Data:** Cycling infrastructure, air quality stations
- **License:** Open data (verify specific terms)
- **Usage:** GeoJSON files for carriles, sendas, ciclocarriles, bike parking

### IQAir
- **Source:** IQAir.com API
- **Data:** City-wide air quality average
- **License:** Check IQAir API terms
- **Attribution:** Display "Powered by IQAir" (if required)

### User-Generated Content
- **Source:** Citizens via irregular-parking reporting
- **License:** Submitted by users, owned by NGO
- **Privacy:** IP addresses logged, photos publicly visible
- **Usage:** Advocacy, reporting to city officials

---

## Technical Debt & Refactoring Needs

### Code Quality

**map.js (955+ lines):**
- Needs modularization (split into layers/, utils/, api/)
- Bus route logic could be separate module
- Pollution API calls should be in service layer
- Consider ES6 modules instead of global namespace

**irregular-parking.js (437 lines):**
- Form handling could be separate from map interaction
- Cloudinary upload could be utility function
- Error handling could be centralized

**index.html:**
- CSS should be in separate file
- JavaScript in `<style>` tag is hard to maintain
- Consider splitting into components

### Performance

**Layer Loading:**
- All GeoJSON loaded on page load (slow on mobile networks)
- Could lazy-load layers (load only when toggled on)
- Consider clustering for large datasets (bike parking: 189 points)

**Map Rendering:**
- 49 bus routes + 529 stops = many DOM elements
- Could use canvas rendering for routes
- Leaflet.markercluster for stops

**API Calls:**
- Pollution API called every page load
- Could cache for 15-30 minutes
- Local storage to reduce API hits

### Security

**No Input Sanitization:**
- Comments are stored raw (XSS risk if displayed in admin)
- Should sanitize before display
- Django templates auto-escape, but be careful

**No CSRF on API:**
- API endpoints don't use CSRF tokens
- Currently okay (no cookies/sessions)
- Will need when auth is added

**Rate Limiting:**
- IP-based is easily bypassed (VPN, proxies)
- Need better rate limiting with user accounts

### Database

**No Indexes:**
- Add index on `created_at` for date filtering
- Add spatial index on lat/lng for geographic queries
- Will matter when dataset grows

**No Soft Deletes:**
- Reports are hard-deleted (gone forever)
- Consider soft delete (is_deleted flag) for audit trail

---

## Troubleshooting Guide

### "CORS Missing Allow Origin" Error

**Symptom:** Frontend can't call backend API, 404 or CORS error in console.

**Causes:**
1. CORS middleware in wrong position
2. Frontend URL not in CORS_ALLOWED_ORIGINS
3. Backend not running

**Fix:**
1. Check `settings.py` - CORS middleware must be 2nd
2. Verify `CORS_ALLOWED_ORIGINS` includes `https://gijon-oxmap.onrender.com`
3. Check backend logs on Render

### Backend Won't Start (Port Timeout)

**Symptom:** Render logs show "No open HTTP ports detected"

**Causes:**
1. Gunicorn not binding to correct port
2. App crashed during startup
3. Database connection failed

**Fix:**
1. Check Gunicorn command in Render settings: `gunicorn config.wsgi:application`
2. Check logs for Python errors
3. Verify DATABASE_URL environment variable

### Reports Not Appearing on Map

**Symptom:** Submit report successfully, but marker doesn't show.

**Causes:**
1. Frontend JS error preventing marker creation
2. API returning empty array
3. Layer toggled off

**Fix:**
1. Check browser console for errors
2. Visit `/api/irregular-parking/` directly - see if data exists
3. Verify the relevant layer type toggle is checked (11 separate toggles in collapsible sections)
4. Check `user-reports.js` loadUserReports() function

### Photo Upload Fails

**Symptom:** "Error al subir la foto" message

**Causes:**
1. File too large (>5MB limit in code)
2. Cloudinary quota exceeded
3. Network error

**Fix:**
1. Try smaller image
2. Check Cloudinary dashboard for quota
3. Check browser Network tab for failed request

### Geolocation Doesn't Work

**Symptom:** "No se pudo obtener tu ubicación" error

**Causes:**
1. User denied permission
2. Not using HTTPS (geolocation requires secure context)
3. Desktop browser using IP geolocation (inaccurate)

**Fix:**
1. Check browser asked for permission, user clicked "Allow"
2. Verify site is using HTTPS (it is: gijon-oxmap.onrender.com)
3. Try on mobile device with GPS

### Database Migrations Fail

**Symptom:** Build fails on Render with migration errors

**Causes:**
1. Conflicting migrations
2. Database schema mismatch
3. PostgreSQL connection issues

**Fix:**
1. Check Render logs for specific migration error
2. Might need to reset database (WARNING: loses data)
3. Verify DATABASE_URL is set correctly

### Map Not Loading

**Symptom:** Blank page or map tiles don't appear

**Causes:**
1. Leaflet.js not loaded
2. Network blocking tile requests
3. JavaScript error stopping execution

**Fix:**
1. Check browser console for errors
2. Verify Leaflet CDN link in index.html
3. Check Network tab - are tile requests failing?

---

## Code Snippets for Common Tasks

### Add a New GeoJSON Layer

```javascript
// In map.js

// 1. Create layer group
const myNewLayer = L.layerGroup();

// 2. Fetch and display data
fetch('path/to/new-data.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            style: {
                color: '#ff0000',
                weight: 3
            },
            onEachFeature: (feature, layer) => {
                layer.bindPopup(feature.properties.name);
            }
        }).addTo(myNewLayer);
        
        console.log('New layer loaded');
    });

// 3. Add toggle control (in HTML)
// <input type="checkbox" id="toggle-new-layer" checked>
// <label for="toggle-new-layer">My New Layer</label>

// 4. Wire up toggle
document.getElementById('toggle-new-layer').addEventListener('change', (e) => {
    if (e.target.checked) {
        map.addLayer(myNewLayer);
    } else {
        map.removeLayer(myNewLayer);
    }
});
```

### Add a New API Endpoint

```python
# In reports/models.py
class NewModel(models.Model):
    field1 = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

# In reports/serializers.py
class NewModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewModel
        fields = '__all__'

# In reports/views.py
class NewModelViewSet(viewsets.ModelViewSet):
    queryset = NewModel.objects.all()
    serializer_class = NewModelSerializer

# In reports/urls.py
router.register(r'new-endpoint', NewModelViewSet)

# Run migrations
python manage.py makemigrations
python manage.py migrate
```

### Add Custom Marker Icon

```javascript
const customIcon = L.divIcon({
    html: '<div style="background: #ff0000; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">🔥</div>',
    className: 'custom-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

L.marker([lat, lng], { icon: customIcon })
    .bindPopup('Custom marker')
    .addTo(map);
```

---

## Useful Commands

### Backend

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run dev server
python manage.py runserver

# Shell (Django ORM)
python manage.py shell

# Collect static files
python manage.py collectstatic

# Export data (backup)
python manage.py dumpdata reports > backup.json

# Import data (restore)
python manage.py loaddata backup.json
```

### Frontend

```bash
# Serve locally (Python)
python -m http.server 8080

# Serve locally (Node)
npx serve

# Serve locally (PHP)
php -S localhost:8080
```

### Git

```bash
# Frontend repo
git clone https://github.com/mishkoyu/gijon-oxmap
cd gijon-oxmap
# Make changes
git add .
git commit -m "Description"
git push

# Backend repo
git clone https://github.com/mishkoyu/oxmap-backend
cd oxmap-backend
# Make changes
git add .
git commit -m "Description"
git push
```

---

## Contact & Maintenance

**Primary Developer:** User via Claude Code

**Deployment Platform:** Render
- Dashboard: https://dashboard.render.com
- Auto-deploy on GitHub push

**Admin Access:**
- Username: `admin`
- Password: Created via build.sh auto-creation (check Render logs or create new superuser)

**Service Status:**
- If backend is down: Check Render dashboard
- Free tier sleeps after 15min inactivity (30-60sec wake time)
- Cold starts are normal on free tier

---

## License & Legal

**Code License:** TBD (recommend MIT or GPL for open-source advocacy tool)

**Data:**
- OpenStreetMap: ODbL
- Municipal data: Check Gijón open data terms
- User photos: Implicitly licensed to NGO for advocacy use

**Privacy:**
- No user accounts = minimal PII
- IP addresses logged for rate limiting
- Photos are public (warn users at submission)

**GDPR Compliance:**
- IP addresses are personal data
- Need privacy policy if storing IPs
- Users should be informed their submissions are public

---

## Questions for Future Development

1. **Scaling:** What happens when there are 10,000+ reports?
2. **Moderation:** Who reviews reports? How fast?
3. **City Integration:** Can we auto-forward reports to city officials?
4. **Funding:** Budget for paid Render tier after prototype?
5. **Open Source:** Should this be public GitHub repo?
6. **Expansion:** Other cities in Asturias? All of Spain?
7. **Impact Metrics:** How to measure success? (Reports filed? Infrastructure added?)

---

## Version History

**v0.1 - Initial Prototype (March 2026)**
- Basic map with cycling infrastructure
- Bus routes and stops
- Air quality monitoring
- Illegal parking reporting (single type)
- Mobile-responsive UI
- Deployed to Render

**v0.2 - Citizen Reporting Expansion (May 2026)**
- Replaced `irregular-parking.js` with full `user-reports.js` system
- 11 report types across 4 categories (INCIDENCIAS, MEDICIONES, INFRAESTRUCTURA, PROPUESTAS)
- Type-specific forms with field validation
- Suggestion voting (cookie-based dedup)
- Speed measurement form with auto-detected time of day
- Accident reports with location blurring (privacy)
- Status-based marker color coding
- 11 separate layer groups with per-type toggles
- Collapsible layer panel sections with count badges and section totals
- Status legend (collapsible)
- Backend: UserReport model, vote endpoint, admin CSV export, status workflow

**Known Version:** Current as of May 12, 2026

---

*This document should be updated as the project evolves. When adding features, update the relevant sections above.*