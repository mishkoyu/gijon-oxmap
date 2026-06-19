# Gijón Sustainable Transport Advocacy Map

## Project Overview

A web-based interactive mapping platform for sustainable transport advocacy in Gijón, Spain. Created by an NGO to visualize cycling infrastructure, public transport, air quality, and enable citizen reporting across 11 report types (illegal parking, scooter obstructions, potholes, accidents, speed measurements, infrastructure proposals, and more). Also features a crowdsourced urban design tool ("Reimagina Gijón") and public school layers.

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

# reports/models.py - Reimaginacion (crowdsourced urban design)
latitude, longitude, address, space_type
before_photo_url, title, description
creator_name, creator_email
created_at, updated_at

# reports/models.py - ReimaginacionVariant
reimaginacion: ForeignKey(Reimaginacion)
after_photo_url, description
creator_name, creator_email
likes_count, is_deleted, deleted_at
created_at

# reports/models.py - ReimaginacionVariantLike
variant: ForeignKey(ReimaginacionVariant)
ip_address (unique_together with variant)
created_at

# reports/models.py - ReimaginacionDeletionToken
variant: OneToOneField(ReimaginacionVariant)
token (64 char, unique)
expires_at (48h), used: BooleanField
created_at

# reports/models.py - UserFeedback
type, description, screenshot_url
browser_info, page_url, map_lat, map_lng, map_zoom
email (optional)
status: new → reviewing → planned → in_progress → completed → wont_fix → duplicate
priority: low/medium/high/critical
created_at

# reports/models.py - IrregularParking (legacy, kept for data)
latitude, longitude, photo_url, comment, created_at, ip_address
```

**API Design:**
- RESTful endpoints via Django REST Framework
- No authentication (prototype phase - planned for later)
- Rate limiting: 5 reports per hour per IP, 3/hour for feedback
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

### 3. Air Quality Monitoring

**Gijón Municipal Stations:**
- Live data from government API
- Circle markers with color-coded quality levels
- Shows NO2, PM10, PM2.5 measurements

**IQAir Comparative Data:**
- Shows city-wide average for context
- Purple border on markers (#6366f1)

### 4. Places of Interest

**Public Schools - EDUCACIÓN PÚBLICA (sub-collapsible section):**
- Educación Infantil (0-6): 16 schools — File: `eei_data.json`
- Colegios Públicos (6-12): 12 schools
- Institutos Públicos (12-18): 12 schools — File: `institutos.json`
- Advocacy tool for "Safe Routes to School" campaigns

### 5. Citizen Reports (11 types)

**Submission Flow:**
1. Right-click (desktop) or long-press (mobile) on map
2. Context menu appears with sections: INCIDENCIAS / MEDICIONES / INFRAESTRUCTURA / PROPUESTAS / REIMAGINA GIJÓN
3. Select report type → type-specific modal form opens
4. Photo uploads to Cloudinary (required for incidencias, optional for others)
5. Data submits to `/api/user-reports/` backend API
6. Success toast + marker appears on map in the correct layer

**Report Types:**
| Type | Icon | Section | Notes |
|------|------|---------|-------|
| `parking` | 🚗 | INCIDENCIAS | Blocking type, duration, plate |
| `scooter_parking` | 🛴 | INCIDENCIAS | Company, count, frequency |
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
- Layer panel: collapsible sections + collapsible status legend
- Count badges per type, section totals in collapsed headers

### 6. Reimagina Gijón (Crowdsourced Urban Design)

**Concept:** Users upload before/after images showing how a public space could be transformed. Other users can add alternative visions to the same location. Community votes on individual visions.

**Submission Flow:**
1. Right-click map → "Reimagina este espacio" in REIMAGINA GIJÓN section
2. Form: space type (dropdown), before photo, after photo, title, description, name/email (optional)
3. Submitted entry appears on map as 🎨 marker
4. Other users click marker → view gallery → "Añadir mi visión" button
5. Variant form: can download original before photo, upload new vision
6. Gallery: large before/after slider (drag to compare) + variants sidebar

**Gallery UI:**
- Large slider occupying most of screen (~70% width)
- Original photo always in background; selected variant overlaid
- Drag handle to reveal before/after
- Right sidebar: scrollable variant thumbnails with creator name + description
- Click thumbnail → slider updates to show that variant
- Like button per variant (IP-based, no login required)
- Description + creator name below slider updates with selection

**Space Types (for filtering):**
`parking_lot`, `street`, `plaza`, `park`, `building`, `other`

**Anonymous Deletion:**
- Token stored in browser localStorage on upload
- Can delete own variant from same device/browser
- Token expires 48 hours after creation

**Layer Panel:** PROPUESTAS CIUDADANAS > Reimagina Gijón (🎨)

**Files:**
- Frontend: `reimagina-form.js`, `reimaginaciones-layer.js`
- Backend models: `Reimaginacion`, `ReimaginacionVariant`, `ReimaginacionVariantLike`, `ReimaginacionDeletionToken`

**API Endpoints:**
```
GET    /api/reimaginaciones/                          List all (filter ?space_type=)
POST   /api/reimaginaciones/                          Create with before + first variant
GET    /api/reimaginaciones/{id}/                     Detail with variants
GET    /api/reimaginaciones/{id}/variants/            Active variants only
POST   /api/reimaginaciones/{id}/add-variant/         Add new variant
POST   /api/reimaginacion-variants/{id}/like/         Like a variant
POST   /api/reimaginacion-variants/{id}/unlike/       Unlike a variant
DELETE /api/reimaginacion-variants/{id}/delete-with-token/  Soft delete (anonymous)
```

### 7. Feedback System

**Concept:** 💬 button on map allows users to report bugs, suggest features, or give general feedback about the app itself.

**Form Fields:**
- Type (dropdown): bug, feature request, data issue, general
- Description (2000 chars)
- Screenshot (optional, Cloudinary upload)
- Email (optional)
- Auto-captures: browser info, page URL, map lat/lng/zoom

**Backend:** `UserFeedback` model with status/priority tracking
- Status: new → reviewing → planned → in_progress → completed → wont_fix → duplicate
- Priority: low/medium/high/critical
- Admin with bulk actions and filters
- Rate limit: 3/hour per IP

**Files:** `feedback.js`

### 8. Responsive UI Controls

**Mobile (< 768px):**
- Panels hidden by default
- Bottom-left circular buttons (50px): [≡] Layers, [i] Legend, [📍] Location, [💬] Feedback
- Panels slide up from bottom (max-height 60vh)

**Desktop (≥ 768px):**
- Left sidebar with square buttons (40px)
- Panels slide in from left
- Toggle behavior

**Geolocation Feature:**
- Blue dot marker at user's position
- High accuracy mode (GPS on mobile)
- Pans to user location at zoom 17

---

## Layer Panel Organization

```
INFRAESTRUCTURA CICLISTA (collapsed)
  ☐ Carriles Bici Oficiales (35)
  ☐ Sendas Ciclables (16)
  ☐ Ciclocarriles (13)
  ☐ Aparcamientos de Bicis (189)

TRANSPORTE PÚBLICO (collapsed)
  ☐ Rutas de Autobús (49)
  ☐ Paradas de Autobús (529)

CALIDAD DEL AIRE (collapsed)
  ☐ Calidad del Aire Gijón
  ☐ IQAir Comparación

LUGARES DE INTERÉS (collapsed)
  ▶ EDUCACIÓN PÚBLICA (sub-collapsible)
    ☐ Educación Infantil (0-6) — 16
    ☐ Colegios Públicos (6-12) — 12
    ☐ Institutos Públicos (12-18) — 12

INCIDENCIAS (collapsed)
  ☐ Estacionamiento Irregular
  ☐ Aparcamiento Ocupado
  ☐ Baches
  ☐ Siniestros
  ☐ Otras Incidencias

MEDICIONES (collapsed)
  ☐ Velocidad de Vehículos

INFRAESTRUCTURA NUEVA (collapsed)
  ☐ Aparcamientos de Bicis
  ☐ Carriles Bici
  ☐ Sendas Ciclables
  ☐ Mobiliario Urbano

PROPUESTAS CIUDADANAS (collapsed)
  ☐ Sugerencias de Mejora
  ☐ Reimagina Gijón 🎨

ESTADO DE REPORTES (legend, collapsible)
  🔴 Reciente (<24h)
  🟠 Reciente (<3 días)
  🟡 Antiguo
  🟢 Verificado
  🟠 En progreso
  ⚫ Resuelto
```

---

## File Structure

### Frontend (`gijon-oxmap`)
```
gijon-oxmap/
├── index.html                  # Main page, all CSS/JS
├── map.js                      # Core map logic (955+ lines)
├── user-reports.js             # Citizen reporting system (~2300 lines)
├── education-layers.js         # Public schools layers
├── reimagina-form.js           # Reimagina Gijón form + gallery UI
├── reimaginaciones-layer.js    # Reimagina Gijón map layer
├── feedback.js                 # App feedback form
├── [GeoJSON data files]
│   ├── gijon-bus-routes.geojson (49 routes)
│   ├── bus-stops.geojson (529 stops)
│   ├── red-de-sendas-ciclables.geojson (16 paths)
│   ├── red-de-ciclocarriles.geojson (13 lanes)
│   ├── aparcamientos-para-bicicletas.geojson (189 spots)
│   ├── eei_data.json (16 preschools)
│   └── institutos.json (12 high schools)
└── README.md
```

### Backend (`oxmap-backend`)
```
oxmap-backend/
├── config/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── reports/
│   ├── models.py       # UserReport, Reimaginacion, ReimaginacionVariant,
│   │                   # ReimaginacionVariantLike, ReimaginacionDeletionToken,
│   │                   # UserFeedback, IrregularParking (legacy)
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── admin.py
│   └── migrations/
├── manage.py
├── requirements.txt
├── build.sh
└── .gitignore
```

---

## API Endpoints

### Backend API

**Base URL:** `https://oxmap-backend.onrender.com`

**User Reports:**
```
GET  /api/user-reports/                     List all reports (?report_type=&status=)
POST /api/user-reports/                     Create report
POST /api/user-reports/{id}/vote/           Vote on suggestion
```

**Reimagina Gijón:**
```
GET    /api/reimaginaciones/                         List all (?space_type=)
POST   /api/reimaginaciones/                         Create with before + first variant
GET    /api/reimaginaciones/{id}/                    Detail with variants
GET    /api/reimaginaciones/{id}/variants/           Active variants
POST   /api/reimaginaciones/{id}/add-variant/        Add variant
POST   /api/reimaginacion-variants/{id}/like/        Like
POST   /api/reimaginacion-variants/{id}/unlike/      Unlike
DELETE /api/reimaginacion-variants/{id}/delete-with-token/  Soft delete
```

**Feedback:**
```
POST /api/feedback/     Submit feedback
```

**Admin:**
```
GET /admin/     Django admin panel
```

### External APIs Used

**Cloudinary Image Upload:**
```
POST https://api.cloudinary.com/v1_1/dqowkswsh/image/upload
Form data: file + upload_preset: ml_default
Response: { secure_url: "https://res.cloudinary.com/..." }
```

---

## Environment Variables

### Backend (`oxmap-backend`)

**Local Development (.env file):**
```
SECRET_KEY=django-insecure-dev-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3
```

**Render Production:** All config hardcoded in settings.py for simplicity. No env vars needed.

### Frontend
No environment variables. Cloudinary credentials are public (upload preset allows anonymous uploads).

---

## Design Decisions & Rationale

### Why No Authentication?
Prototype phase - lower barrier to reporting, IP-based rate limiting sufficient for now.

### Why Leaflet Instead of Google Maps?
Free, open-source, aligns with NGO values, full control over styling.

### Why Render Free Tier?
$0/month for prototype. Upgrade path: $7/month PostgreSQL + $7/month web service = $14/month.

### Why Direct Cloudinary Upload?
Avoids file handling on backend, faster uploads, free tier: 25GB storage.

### CORS Middleware Position (CRITICAL)
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # MUST BE SECOND
    'whitenoise.middleware.WhiteNoiseMiddleware',
    # ...
]
```

### Why Soft Delete on Reimaginacion Variants?
Data isn't permanently lost, audit trail preserved, admin can restore if needed.

---

## Known Issues & Limitations

### 1. PostgreSQL Free Tier Resets
Render free tier PostgreSQL has 90-day limit. Upgrade to paid ($7/month) before expiry.

### 2. Data Persistence
Reports have disappeared after redeployments. Root cause unresolved. Check build.sh superuser creation.

### 3. Geolocation Accuracy
Desktop browsers use IP/WiFi triangulation (inaccurate). Feature works best on mobile with GPS.

### 4. Rate Limiting by IP
Multiple users behind same NAT share one IP limit. Will improve with user accounts.

### 5. Anonymous Deletion Scope
Reimaginacion variant deletion via localStorage token only works from same browser/device. No cross-device deletion for anonymous users.

---

## Investigated & Abandoned

### Gijón Bici Public Bike Share
KML has 827 stations but no live availability. fifteen.eu operator API CORS blocked. Skipped — bad UX without live data.

### EMTUSA Real-Time Bus Arrivals
API endpoint found (emtusari.pub.gijon.es) but IP-restricted — DNS fails from Render, CORS blocked in browser. Cannot proxy. No public access.

### api.gijon.es
Domain exists, returns 405 "La solicitud no está permitida desde este origen." API is locked to whitelisted IPs/origins only. Contact: Servicio de Comunicación y Nuevos Proyectos del Ayuntamiento de Gijón.

### observa.gijon.es (Socrata data portal)
Domain is parked/dead as of June 2026.

---

## Development Workflow

### Local Frontend Development
```bash
python -m http.server 8080
# Visit: http://localhost:8080
# API calls go to live backend automatically
```

### Local Backend Development
```bash
cd oxmap-backend
py -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
py manage.py migrate
py manage.py createsuperuser
py manage.py runserver
```

**Important:** Django is not installed globally. Always use a venv. Migrations must be generated locally and committed — Render runs `migrate` but not `makemigrations`.

### Deployment
Both repos auto-deploy on push to `main`. Frontend: ~1-2 min. Backend: ~2-3 min (runs build.sh).

### Adding New Models
```bash
# Always do this locally before pushing
python manage.py makemigrations reports
git add reports/migrations/
git commit -m "Add: migration for [model name]"
git push
# Render will run migrate automatically
```

---

## Troubleshooting Guide

### "Your models have changes not reflected in a migration"
Render log warning means migration files not committed. Run `makemigrations` locally, commit, push.

### 500 on New API Endpoints
Usually missing migration (tables don't exist). Check Render logs for migration warnings.

### "CORS Missing Allow Origin" Error
1. CORS middleware must be 2nd in MIDDLEWARE list
2. Verify CORS_ALLOWED_ORIGINS includes frontend URL
3. Check backend logs on Render

### Backend Won't Start (Port Timeout)
Check Gunicorn command: `gunicorn config.wsgi:application`. Check logs for Python errors.

### Reports Not Appearing on Map
1. Check browser console for JS errors
2. Visit `/api/user-reports/` directly
3. Verify layer toggle is checked
4. Check `urLoadReports()` in user-reports.js

### Photo Upload Fails
File >5MB, Cloudinary quota exceeded, or network error. Check browser Network tab.

---

## Useful Commands

### Backend
```bash
python manage.py makemigrations    # Generate migrations (run locally!)
python manage.py migrate           # Apply migrations
python manage.py createsuperuser
python manage.py runserver
python manage.py dumpdata reports > backup.json
python manage.py loaddata backup.json
```

### Frontend
```bash
python -m http.server 8080
npx serve
```

### Git
```bash
# Frontend
git clone https://github.com/mishkoyu/gijon-oxmap

# Backend
git clone https://github.com/mishkoyu/oxmap-backend
```

---

## Version History

**v0.1 - Initial Prototype (March 2026)**
- Basic map with cycling infrastructure
- Bus routes and stops
- Air quality monitoring
- Illegal parking reporting (single type)
- Mobile-responsive UI

**v0.2 - Citizen Reporting Expansion (May 2026)**
- 11 report types across 4 categories
- Type-specific forms with validation
- Suggestion voting (cookie-based)
- Speed measurement form
- Accident location blurring
- Status-based marker colors
- Collapsible layer sections with count badges
- Backend: UserReport model, vote endpoint, admin CSV export

**v0.3 - Education, Feedback & Reimagina Gijón (June 2026)**
- Education layers (3 school types, 40+ schools total)
- App feedback system (💬 button, UserFeedback model)
- Reimagina Gijón: crowdsourced urban design feature
  - Before/after image submissions
  - Variant system (multiple visions per location)
  - Before/after slider gallery UI
  - IP-based voting per variant
  - Anonymous deletion via localStorage token
  - Space type filtering (6 categories)
- Layer panel: PROPUESTAS CIUDADANAS now has 2 sub-types
- Security: removed .vscode/settings.local.json from git history

---

## Planned Features

### Short Term
- Fix data persistence issue (reports disappearing after redeploy)
- Report clustering (Leaflet.markercluster for dense areas)
- Admin moderation / pre-approval workflow

### Medium Term
- User authentication (email/password)
- Email notifications (admin alerts, status updates)
- Heat map view for problem areas
- Comments on Reimagina Gijón visions

### Long Term
- Safe-route routing (cycling infrastructure only)
- Multi-language (Spanish, Asturian, English)
- Public API for other orgs
- Mobile app (iOS/Android)

---

*Last updated: June 2026 (v0.3)*