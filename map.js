// Initialize map centered on Gijón
const map = L.map('map', {
    zoomControl: false  // Remove default zoom controls
}).setView([43.5322, -5.6611], 13);

// Add OpenStreetMap base layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

// Layer groups for toggling
let cyclingLayer = L.layerGroup();
let busLayer = L.layerGroup();
let pollutionLayer = L.layerGroup();
let iqairLayer = L.layerGroup();
let schoolsLayer = L.layerGroup();

// IQAir API configuration
const IQAIR_API_KEY = '155ae5ba-cd36-4228-8138-fb443109e176';

// Custom bus stop icon
const busIcon = L.divIcon({
    html: '🚌',
    className: 'bus-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

// Custom school icon
const schoolIcon = L.divIcon({
    html: '<div style="background: #f97316; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">🏫</div>',
    className: 'school-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
});

// Function to get pollution circle color
function getPollutionColor(level) {
    const colors = {
        'Good': '#22c55e',
        'Moderate': '#eab308',
        'Poor': '#f97316',
        'Very Poor': '#ef4444',
        'Inactive': '#9ca3af',
        'No data': '#9ca3af'
    };
    return colors[level] || '#9ca3af';
}

// Function to get AQI badge class
function getAqiBadgeClass(level) {
    const classes = {
        'Good': 'aqi-good',
        'Moderate': 'aqi-moderate',
        'Poor': 'aqi-poor',
        'Very Poor': 'aqi-verypoor'
    };
    return classes[level] || '';
}

// Load and display cycling lanes
fetch('data/cycling-lanes.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            style: function(feature) {
                return {
                    color: '#2563eb',
                    weight: 3,
                    opacity: 0.7
                };
            },
            onEachFeature: function(feature, layer) {
                const props = feature.properties;
                let popupContent = '<div class="popup-title">';
                
                if (props.name) {
                    popupContent += props.name;
                } else {
                    popupContent += 'Carril bici';
                }
                
                popupContent += '</div>';
                
                if (props.highway === 'cycleway') {
                    popupContent += '<div class="popup-detail"><strong>Tipo:</strong> Carril bici dedicado</div>';
                } else if (props.cycleway) {
                    popupContent += '<div class="popup-detail"><strong>Tipo:</strong> Carril compartido</div>';
                } else if (props.bicycle === 'designated') {
                    popupContent += '<div class="popup-detail"><strong>Tipo:</strong> Camino peatonal/ciclista</div>';
                }
                
                if (props.surface) {
                    popupContent += `<div class="popup-detail"><strong>Superficie:</strong> ${props.surface}</div>`;
                }
                
                if (props.lit === 'yes') {
                    popupContent += '<div class="popup-detail"><strong>Iluminación:</strong> Sí</div>';
                }
                
                if (props.maxspeed) {
                    popupContent += `<div class="popup-detail"><strong>Velocidad máx:</strong> ${props.maxspeed} km/h</div>`;
                }
                
                layer.bindPopup(popupContent);
            }
        }).addTo(cyclingLayer);
        
        console.log('Cycling lanes loaded');
    })
    .catch(error => console.error('Error loading cycling lanes:', error));

// Load and display bus stops
// Bus routes and stops with offsetting loaded below

// Load and display pollution data (hybrid: live API with fallback)
async function loadPollutionData() {
    const LIVE_API = 'https://opendata.gijon.es/descargar.php?id=1&tipo=JSON';
    const FALLBACK_FILE = 'data/pollution.geojson';
    
    let data;
    let dataSource = 'live';
    
    try {
        // Try live API first
        console.log('Fetching live pollution data from API...');
        const response = await fetch(LIVE_API);
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        
        const apiData = await response.json();
        
        // Convert API format to GeoJSON
        data = convertApiToGeoJSON(apiData);
        console.log('✓ Live pollution data loaded from API');
        
    } catch (error) {
        // Fall back to static file
        console.warn('⚠ Live API failed, falling back to static file:', error.message);
        dataSource = 'cached';
        
        try {
            const response = await fetch(FALLBACK_FILE);
            data = await response.json();
            console.log('✓ Pollution data loaded from static file (cached)');
        } catch (fallbackError) {
            console.error('✗ Both live API and fallback failed:', fallbackError);
            return;
        }
    }
    
    // Display the data on the map
    displayPollutionData(data, dataSource);
}

// Convert API response to GeoJSON format
function convertApiToGeoJSON(apiData) {
    const stations = {};
    const readings = apiData.calidadairemediatemporales.calidadairemediatemporal;
    
    // Group readings by station and calculate averages
    readings.forEach(reading => {
        const stationId = reading.estacion;
        
        if (!stations[stationId]) {
            stations[stationId] = {
                id: stationId,
                name: reading.título,
                lat: reading.latitud,
                lon: reading.longitud,
                pm25: [],
                pm10: [],
                no2: [],
                o3: [],
                latestDate: null,
                latestPeriod: 0
            };
        }
        
        const station = stations[stationId];
        
        // Collect readings
        if (reading.pm25) station.pm25.push(parseFloat(reading.pm25));
        if (reading.pm10) station.pm10.push(parseFloat(reading.pm10));
        if (reading.no2) station.no2.push(parseFloat(reading.no2));
        if (reading.o3) station.o3.push(parseFloat(reading.o3));
        
        // Track latest reading
        const readingDate = reading.fecha;
        const readingPeriod = reading.periodo;
        
        if (!station.latestDate || readingDate > station.latestDate || 
            (readingDate === station.latestDate && readingPeriod > station.latestPeriod)) {
            station.latestDate = readingDate;
            station.latestPeriod = readingPeriod;
        }
    });
    
    // Convert to GeoJSON
    const features = Object.values(stations).map(station => {
        const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b) / arr.length : null;
        
        // Check if station data is stale (more than 30 days old)
        const isStale = (() => {
            if (!station.latestDate) return true;
            const latestDate = new Date(station.latestDate);
            const today = new Date();
            const daysDiff = (today - latestDate) / (1000 * 60 * 60 * 24);
            return daysDiff > 30;
        })();
        
        const pm25Avg = avg(station.pm25);
        const pm10Avg = avg(station.pm10);
        const no2Avg = avg(station.no2);
        const o3Avg = avg(station.o3);
        
        let aqiScore = null;
        let aqiLevel, color;
        
        if (isStale) {
            // Station is inactive - mark as gray
            aqiLevel = 'Inactive';
            color = 'gray';
            aqiScore = null;
        } else {
            // Calculate AQI for active stations
            const scores = [];
            if (pm25Avg) scores.push(pm25Avg / 25 * 100);
            if (pm10Avg) scores.push(pm10Avg / 50 * 100);
            if (no2Avg) scores.push(no2Avg / 40 * 100);
            if (scores.length > 0) aqiScore = scores.reduce((a, b) => a + b) / scores.length;
            
            if (aqiScore < 50) {
                aqiLevel = 'Good';
                color = 'green';
            } else if (aqiScore < 75) {
                aqiLevel = 'Moderate';
                color = 'yellow';
            } else if (aqiScore < 100) {
                aqiLevel = 'Poor';
                color = 'orange';
            } else {
                aqiLevel = 'Very Poor';
                color = 'red';
            }
        }
        
        // Format timestamp
        const latestReading = station.latestDate ? 
            `${station.latestDate} ${String(station.latestPeriod).padStart(2, '0')}:00` : null;
        
        return {
            type: 'Feature',
            properties: {
                station_id: station.id,
                name: station.name,
                pm25_avg: pm25Avg ? Math.round(pm25Avg * 10) / 10 : null,
                pm10_avg: pm10Avg ? Math.round(pm10Avg * 10) / 10 : null,
                no2_avg: no2Avg ? Math.round(no2Avg * 10) / 10 : null,
                o3_avg: o3Avg ? Math.round(o3Avg * 10) / 10 : null,
                aqi_score: aqiScore ? Math.round(aqiScore * 10) / 10 : null,
                aqi_level: aqiLevel,
                color: color,
                latest_reading: latestReading
            },
            geometry: {
                type: 'Point',
                coordinates: [station.lon, station.lat]
            }
        };
    });
    
    return {
        type: 'FeatureCollection',
        features: features
    };
}

// Display pollution data on map
function displayPollutionData(data, dataSource) {
        L.geoJSON(data, {
            pointToLayer: function(feature, latlng) {
                const color = getPollutionColor(feature.properties.aqi_level);
                
                // Create glow/halo effect (larger transparent circle)
                const glowRadius = 150; // meters (~2 blocks)
                const glow = L.circle(latlng, {
                    radius: glowRadius,
                    fillColor: color,
                    fillOpacity: 0.15,
                    color: color,
                    weight: 1,
                    opacity: 0.3,
                    className: 'pollution-glow'
                });
                
                // Create main station marker (smaller solid circle)
                const marker = L.circleMarker(latlng, {
                    radius: 10,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.9
                });
                
                // Store reference to marker for popup binding
                marker._isMainMarker = true;
                
                // Group them together
                const layerGroup = L.layerGroup([glow, marker]);
                
                return layerGroup;
            },
            onEachFeature: function(feature, layer) {
                // Find the main marker within the layer group
                let mainMarker = null;
                if (layer instanceof L.LayerGroup) {
                    layer.eachLayer(function(l) {
                        if (l._isMainMarker) {
                            mainMarker = l;
                        }
                    });
                } else {
                    mainMarker = layer;
                }
                
                if (!mainMarker) return;
                
                const props = feature.properties;
                let popupContent = '<div class="popup-title">' + props.name + '</div>';

                // Check if station is inactive
                if (props.aqi_level === 'Inactive') {
                    popupContent += '<div class="popup-detail" style="font-size: 11px; color: #888; margin-bottom: 6px;">Estación inactiva</div>';
                    popupContent += `<div class="popup-detail">
                        <span class="aqi-badge" style="background-color: #9ca3af;">
                            Fuera de servicio
                        </span>
                    </div>`;

                    if (props.latest_reading) {
                        popupContent += `<div class="popup-detail" style="margin-top: 8px; font-size: 12px; color: #666;">Última lectura: ${props.latest_reading}</div>`;
                        popupContent += `<div class="popup-detail" style="font-size: 11px; color: #999; margin-top: 4px;">Esta estación lleva más de 30 días sin reportar datos.</div>`;
                    }

                    mainMarker.bindPopup(popupContent);
                    return;
                }

                // Active station - show normal data
                const sourceLabel = dataSource === 'live' ?
                    'Datos en tiempo real' : 'Datos en caché';
                popupContent += `<div class="popup-detail" style="font-size: 11px; color: #888; margin-bottom: 6px;">${sourceLabel}</div>`;

                popupContent += `<div class="popup-detail">
                    <span class="aqi-badge ${getAqiBadgeClass(props.aqi_level)}">
                        ${props.aqi_level}
                    </span>
                </div>`;

                if (props.aqi_score) {
                    popupContent += `<div class="popup-detail" style="margin-top: 8px;"><strong>Índice de calidad:</strong> ${props.aqi_score}</div>`;
                }

                if (props.pm25_avg) {
                    popupContent += `<div class="popup-detail"><strong>PM2.5:</strong> ${props.pm25_avg} μg/m³</div>`;
                }

                if (props.pm10_avg) {
                    popupContent += `<div class="popup-detail"><strong>PM10:</strong> ${props.pm10_avg} μg/m³</div>`;
                }

                if (props.no2_avg) {
                    popupContent += `<div class="popup-detail"><strong>NO₂:</strong> ${props.no2_avg} μg/m³</div>`;
                }

                if (props.o3_avg) {
                    popupContent += `<div class="popup-detail"><strong>O₃:</strong> ${props.o3_avg} μg/m³</div>`;
                }

                // Add timestamp if available
                if (props.latest_reading) {
                    popupContent += `<div class="popup-detail" style="margin-top: 6px; font-size: 11px; color: #888;">Última lectura: ${props.latest_reading}</div>`;
                } else {
                    popupContent += '<div class="popup-detail" style="margin-top: 6px; font-size: 11px; color: #888;">Promedio de últimas lecturas</div>';
                }

                // Placeholder for 7-day trend (loaded lazily on popup open)
                popupContent += '<div id="trend-' + props.station_id + '" style="margin-top:10px;border-top:1px solid #eee;padding-top:8px;font-size:11px;color:#9ca3af;">Cargando tendencia semanal...</div>';

                mainMarker.bindPopup(popupContent, { minWidth: 220 });

                mainMarker.on('popupopen', function () {
                    pollutionLoadTrend(props.station_id);
                });
            }
        }).addTo(pollutionLayer);
        
        console.log(`Pollution data displayed (source: ${dataSource})`);
}

// Load pollution data on page load
loadPollutionData();

// ============================================================================
// 7-DAY POLLUTION TREND (lazy-loaded on popup open)
// ============================================================================

var _pollutionHistory = null;

function pollutionBuildSparkline(values, color) {
    var filtered = values.filter(function (v) { return v !== null; });
    if (filtered.length < 2) return '';

    var w = 120, h = 28, pad = 2;
    var min = Math.min.apply(null, filtered);
    var max = Math.max.apply(null, filtered);
    var range = max - min || 1;

    var points = [];
    var step = (w - pad * 2) / (values.length - 1);
    values.forEach(function (v, i) {
        if (v === null) return;
        var x = pad + i * step;
        var y = h - pad - ((v - min) / range) * (h - pad * 2);
        points.push(x.toFixed(1) + ',' + y.toFixed(1));
    });

    return '<svg width="' + w + '" height="' + h + '" style="display:block;margin:2px 0">'
        + '<polyline points="' + points.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
        + '</svg>';
}

function pollutionRenderTrend(stationId, history) {
    var el = document.getElementById('trend-' + stationId);
    if (!el) return;

    var station = history[String(stationId)];
    if (!station || !station.daily || station.daily.length === 0) {
        el.innerHTML = '<span style="color:#9ca3af">Sin datos históricos</span>';
        return;
    }

    var days = station.daily;
    var pollutants = [
        { key: 'pm25', label: 'PM2.5', color: '#3b82f6' },
        { key: 'pm10', label: 'PM10', color: '#10b981' },
        { key: 'no2',  label: 'NO₂',  color: '#f59e0b' },
        { key: 'o3',   label: 'O₃',   color: '#8b5cf6' }
    ];

    var html = '<div style="font-size:11px;font-weight:600;color:#374151;margin-bottom:4px">Tendencia 7 días</div>';

    pollutants.forEach(function (p) {
        var values = days.map(function (d) { return d[p.key]; });
        var hasData = values.some(function (v) { return v !== null; });
        if (!hasData) return;

        var latest = null;
        for (var i = values.length - 1; i >= 0; i--) {
            if (values[i] !== null) { latest = values[i]; break; }
        }

        var sparkline = pollutionBuildSparkline(values, p.color);

        html += '<div style="display:flex;align-items:center;gap:6px;margin:3px 0">'
            + '<span style="font-size:10px;color:#6b7280;width:36px">' + p.label + '</span>'
            + sparkline
            + '<span style="font-size:10px;color:#374151">' + latest + '</span>'
            + '</div>';
    });

    // Date range label
    var first = days[0].date.slice(5);
    var last = days[days.length - 1].date.slice(5);
    html += '<div style="font-size:9px;color:#9ca3af;margin-top:2px">' + first + ' → ' + last + '</div>';

    el.innerHTML = html;
}

function pollutionLoadTrend(stationId) {
    if (_pollutionHistory) {
        pollutionRenderTrend(stationId, _pollutionHistory);
        return;
    }

    fetch('data/pollution-history.json')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            _pollutionHistory = data;
            pollutionRenderTrend(stationId, data);
        })
        .catch(function () {
            var el = document.getElementById('trend-' + stationId);
            if (el) el.innerHTML = '<span style="color:#9ca3af">Sin datos históricos</span>';
        });
}

// Load and display IQAir data
async function loadIQAirData() {
    try {
        // Use GPS coordinates for Gijón instead of city/state names
        const lat = 43.5138;
        const lon = -5.6535;
        const url = `https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lon}&key=${IQAIR_API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            console.error('IQAir API error:', response.status);
            return;
        }
        
        const data = await response.json();
        
        if (data.status !== 'success') {
            console.error('IQAir API returned error:', data);
            return;
        }
        
        const pollution = data.data.current.pollution;
        const weather = data.data.current.weather;
        
        // Calculate color based on AQI
        let color;
        const aqi = pollution.aqius;
        if (aqi <= 50) {
            color = '#22c55e'; // Good - green
        } else if (aqi <= 100) {
            color = '#eab308'; // Moderate - yellow
        } else if (aqi <= 150) {
            color = '#f97316'; // Unhealthy for sensitive - orange
        } else {
            color = '#ef4444'; // Unhealthy - red
        }
        
        // Create IQAir marker (different style - diamond shape)
        const iqairMarker = L.circleMarker([lat, lon], {
            radius: 12,
            fillColor: color,
            color: '#6366f1', // Indigo border to distinguish from official stations
            weight: 3,
            opacity: 1,
            fillOpacity: 0.7
        }).addTo(iqairLayer);
        
        // Create popup content
        let popupContent = '<div class="popup-title">IQAir - Gijón (Ciudad)</div>';
        popupContent += '<div class="popup-detail" style="font-size: 11px; color: #888; margin-bottom: 6px;">Estimación a nivel ciudad</div>';
        
        let aqiLevel;
        if (aqi <= 50) {
            aqiLevel = 'Good';
        } else if (aqi <= 100) {
            aqiLevel = 'Moderate';
        } else if (aqi <= 150) {
            aqiLevel = 'Unhealthy for Sensitive';
        } else {
            aqiLevel = 'Unhealthy';
        }
        
        popupContent += `<div class="popup-detail">
            <span class="aqi-badge" style="background-color: ${color};">
                ${aqiLevel}
            </span>
        </div>`;
        
        popupContent += `<div class="popup-detail" style="margin-top: 8px;"><strong>AQI (US):</strong> ${aqi}</div>`;
        
        if (pollution.pm25) {
            popupContent += `<div class="popup-detail"><strong>PM2.5:</strong> ${pollution.pm25} μg/m³</div>`;
        }
        
        if (weather.tp) {
            popupContent += `<div class="popup-detail"><strong>Temperatura:</strong> ${weather.tp}°C</div>`;
        }
        
        if (weather.hu) {
            popupContent += `<div class="popup-detail"><strong>Humedad:</strong> ${weather.hu}%</div>`;
        }
        
        popupContent += '<div class="popup-detail" style="margin-top: 6px; font-size: 11px; color: #888;">Datos en tiempo real de IQAir</div>';
        
        iqairMarker.bindPopup(popupContent);
        
        console.log('IQAir data loaded successfully');
    } catch (error) {
        console.error('Error loading IQAir data:', error);
    }
}

// Load IQAir data when map loads
loadIQAirData();

// Layer toggle controls
document.getElementById('toggle-carriles-bici').addEventListener('change', function(e) {
    if (e.target.checked) {
        map.addLayer(cyclingLayer);
    } else {
        map.removeLayer(cyclingLayer);
    }
});

document.getElementById('toggle-paradas-autobus').addEventListener('change', function(e) {
    if (e.target.checked) {
        map.addLayer(busLayer);
    } else {
        map.removeLayer(busLayer);
    }
});

document.getElementById('toggle-calidad-aire').addEventListener('change', function(e) {
    if (e.target.checked) {
        map.addLayer(pollutionLayer);
    } else {
        map.removeLayer(pollutionLayer);
    }
});

document.getElementById('toggle-iqair').addEventListener('change', function(e) {
    if (e.target.checked) {
        map.addLayer(iqairLayer);
    } else {
        map.removeLayer(iqairLayer);
    }
});

document.getElementById('toggle-colegios-publicos').addEventListener('change', function(e) {
    if (e.target.checked) {
        map.addLayer(schoolsLayer);
    } else {
        map.removeLayer(schoolsLayer);
    }
});

// Load schools
fetch('data/schools.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            pointToLayer: function(feature, latlng) {
                return L.marker(latlng, { icon: schoolIcon });
            },
            onEachFeature: function(feature, layer) {
                const props = feature.properties;
                let popupContent = '<div class="popup-title">🏫 ' + props.name + '</div>';
                if (props.address) popupContent += `<div class="popup-detail"><strong>Dirección:</strong> ${props.address}</div>`;
                if (props.phone) popupContent += `<div class="popup-detail"><strong>Teléfono:</strong> ${props.phone}</div>`;
                if (props.email) popupContent += `<div class="popup-detail"><strong>Email:</strong> ${props.email}</div>`;
                if (props.hours) popupContent += `<div class="popup-detail"><strong>Horario:</strong> ${props.hours}</div>`;
                if (props.info) popupContent += `<div class="popup-detail" style="font-size: 12px; color: #666; margin-top: 6px;">${props.info}</div>`;
                layer.bindPopup(popupContent);
            }
        }).addTo(schoolsLayer);
        console.log('Schools loaded');
    })
    .catch(error => console.error('Error loading schools:', error));

// Add scale control
L.control.scale({ imperial: false, metric: true }).addTo(map);

console.log('Map initialized');


// ============================================================================
// BUS SYSTEM - WITH LINE OFFSETTING FOR OVERLAPPING ROUTES
// ============================================================================

let busRoutesLayer = L.layerGroup();
let routesByLine = {};
let allRouteReferences = [];

const busLineColors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', 
    '#1abc9c', '#e67e22', '#16a085', '#c0392b', '#9c27b0',
    '#ff5722', '#00bcd4', '#795548', '#607d8b', '#ff9800'
];

function getBusLineColor(lineRef) {
    if (!lineRef) return '#999999';
    let hash = 0;
    for (let i = 0; i < lineRef.length; i++) {
        hash = lineRef.charCodeAt(i) + ((hash << 5) - hash);
    }
    return busLineColors[Math.abs(hash) % busLineColors.length];
}


function updateLineButtons() {
    const container = document.getElementById('line-buttons-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const sortedLines = Object.keys(routesByLine).sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, '')) || 999;
        const numB = parseInt(b.replace(/[^0-9]/g, '')) || 999;
        return numA - numB;
    });
    
    sortedLines.forEach(line => {
        const color = getBusLineColor(line);
        const button = document.createElement('button');
        button.textContent = line;
        button.className = 'line-selector-btn';
        button.dataset.line = line;
        button.style.cssText = `
            background: ${color};
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 12px;
            transition: all 0.2s;
        `;
        
        button.onclick = function() {
            highlightBusLine(line);
        };
        
        container.appendChild(button);
    });
}

// Function to offset a LineString by a perpendicular distance
function offsetLineString(coordinates, offsetPixels) {
    if (coordinates.length < 2) return coordinates;
    
    const offsetDegrees = offsetPixels * 0.00001; // Approximate conversion
    const offsetCoords = [];
    
    for (let i = 0; i < coordinates.length - 1; i++) {
        const p1 = coordinates[i];
        const p2 = coordinates[i + 1];
        
        // Calculate perpendicular vector
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const len = Math.sqrt(dx * dx + dy * dy);
        
        if (len === 0) {
            offsetCoords.push([p1[0], p1[1]]);
            continue;
        }
        
        // Perpendicular vector (rotated 90 degrees)
        const perpX = -dy / len;
        const perpY = dx / len;
        
        // Apply offset
        const offsetPoint = [
            p1[0] + perpX * offsetDegrees,
            p1[1] + perpY * offsetDegrees
        ];
        
        offsetCoords.push(offsetPoint);
    }
    
    // Add last point
    const lastIdx = coordinates.length - 1;
    const p1 = coordinates[lastIdx - 1];
    const p2 = coordinates[lastIdx];
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len > 0) {
        const perpX = -dy / len;
        const perpY = dx / len;
        offsetCoords.push([
            p2[0] + perpX * offsetDegrees,
            p2[1] + perpY * offsetDegrees
        ]);
    } else {
        offsetCoords.push([p2[0], p2[1]]);
    }
    
    return offsetCoords;
}

// Apply offset to geometry
function offsetGeometry(geometry, offsetPixels) {
    if (geometry.type === 'LineString') {
        return {
            type: 'LineString',
            coordinates: offsetLineString(geometry.coordinates, offsetPixels)
        };
    } else if (geometry.type === 'MultiLineString') {
        return {
            type: 'MultiLineString',
            coordinates: geometry.coordinates.map(line => 
                offsetLineString(line, offsetPixels)
            )
        };
    }
    return geometry;
}

// Load bus routes with offsetting
fetch('data/gijon-bus-routes.geojson')
    .then(response => response.json())
    .then(data => {
        console.log(`Loading ${data.features.length} route features...`);
        
        // Group by line
        data.features.forEach(feature => {
            const line = feature.properties.line;
            if (!routesByLine[line]) {
                routesByLine[line] = [];
            }
            routesByLine[line].push(feature);
        });
        
        console.log(`Grouped into ${Object.keys(routesByLine).length} unique lines`);
        
        // Assign offset to each route based on its position in the list
        // Routes will be offset from -15 to +15 pixels perpendicular to the line
        const totalRoutes = data.features.length;
        
        data.features.forEach((feature, index) => {
            const line = feature.properties.line;
            const color = getBusLineColor(line);
            
            // Calculate offset: spread routes across a range
            // For overlapping routes, this creates parallel lines
            const offsetPixels = ((index % 7) - 3) * 5; // -15, -10, -5, 0, 5, 10, 15
            
            // Apply offset to geometry
            const offsetGeom = offsetGeometry(feature.geometry, offsetPixels);
            
            // Create feature with offset geometry
            const offsetFeature = {
                type: 'Feature',
                properties: feature.properties,
                geometry: offsetGeom
            };
            
            // Create layer
            const routeLayer = L.geoJSON(offsetFeature, {
                style: {
                    color: color,
                    weight: 4,
                    opacity: 0.7,
                    lineCap: 'round',
                    lineJoin: 'round'
                },
                onEachFeature: function(feat, layer) {
                    const props = feat.properties;
                    let popup = `<div class="popup-title">🚌 Línea ${props.line}</div>`;
                    if (props.name) {
                        popup += `<div class="popup-detail"><strong>${props.name}</strong></div>`;
                    }
                    if (props.from && props.to) {
                        popup += `<div class="popup-detail" style="margin-top: 6px;">
                            <strong>Desde:</strong> ${props.from}<br>
                            <strong>Hasta:</strong> ${props.to}
                        </div>`;
                    }
                    layer.bindPopup(popup);
                }
            });
            
            routeLayer.addTo(busRoutesLayer);
            
            allRouteReferences.push({
                layer: routeLayer,
                line: line,
                color: color
            });
        });
        
        updateLineButtons();
        
        console.log(`✓ Loaded ${allRouteReferences.length} route layers with offsets`);
    })
    .catch(error => console.error('Error loading bus routes:', error));

// Load bus stops
fetch('data/bus-stops.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            pointToLayer: function(feature, latlng) {
                return L.marker(latlng, { icon: busIcon });
            },
            onEachFeature: function(feature, layer) {
                const props = feature.properties;
                let popup = '<div class="popup-title">🚏 Parada de Autobús</div>';
                
                if (props.name) {
                    popup += `<div class="popup-detail"><strong>${props.name}</strong></div>`;
                }
                
                if (props.lines_array && props.lines_array.length > 0) {
                    popup += `<div class="popup-detail" style="margin-top: 8px;">
                        <strong>🚌 Líneas que paran aquí:</strong>
                    </div>`;
                    popup += '<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">';
                    
                    props.lines_array.forEach(line => {
                        const color = getBusLineColor(line);
                        popup += `<button 
                            class="stop-line-btn" 
                            data-line="${line}"
                            style="background: ${color}; color: white; border: none; 
                                   padding: 5px 11px; border-radius: 4px; cursor: pointer;
                                   font-weight: bold; font-size: 12px; transition: all 0.2s;">
                            ${line}
                        </button>`;
                    });
                    
                    popup += '</div>';
                    popup += `<div class="popup-detail" style="margin-top: 6px; font-size: 11px; color: #888;">
                        Click una línea para resaltarla
                    </div>`;
                }
                
                layer.bindPopup(popup);
                
                layer.on('popupopen', function() {
                    document.querySelectorAll('.stop-line-btn').forEach(btn => {
                        btn.onmouseover = function() {
                            this.style.transform = 'scale(1.1)';
                        };
                        btn.onmouseout = function() {
                            this.style.transform = 'scale(1)';
                        };
                        btn.onclick = function() {
                            highlightBusLine(this.dataset.line);
                        };
                    });
                });
            }
        }).addTo(busLayer);
        
        console.log('Bus stops loaded');
    })
    .catch(error => console.error('Error loading bus stops:', error));

function highlightBusLine(lineRef) {
    console.log('Highlighting line:', lineRef);
    
    allRouteReferences.forEach(ref => {
        ref.layer.eachLayer(layer => {
            if (layer.setStyle) {
                layer.setStyle({
                    opacity: 0.2,
                    weight: 3
                });
            }
        });
    });
    
    allRouteReferences.forEach(ref => {
        if (ref.line === lineRef) {
            ref.layer.eachLayer(layer => {
                if (layer.setStyle) {
                    layer.setStyle({
                        opacity: 1,
                        weight: 6,
                        color: ref.color
                    });
                    layer.bringToFront();
                }
            });
        }
    });
    
    document.querySelectorAll('.line-selector-btn').forEach(btn => {
        if (btn.dataset.line === lineRef) {
            btn.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.3)';
        } else {
            btn.style.boxShadow = 'none';
        }
    });
}

function resetAllBusRoutes() {
    console.log('Resetting all routes');
    
    allRouteReferences.forEach(ref => {
        ref.layer.eachLayer(layer => {
            if (layer.setStyle) {
                layer.setStyle({
                    opacity: 0.7,
                    weight: 4,
                    color: ref.color
                });
            }
        });
    });
    
    document.querySelectorAll('.line-selector-btn').forEach(btn => {
        btn.style.boxShadow = 'none';
    });
}

document.getElementById('toggle-rutas-autobus').addEventListener('change', function(e) {
    const section = document.getElementById('bus-line-section');

    if (e.target.checked) {
        map.addLayer(busRoutesLayer);
        if (section) section.style.display = 'block';
    } else {
        map.removeLayer(busRoutesLayer);
        if (section) section.style.display = 'none';
        resetAllBusRoutes();
    }
});

window.highlightBusLine = highlightBusLine;
window.resetAllBusRoutes = resetAllBusRoutes;

console.log('✓ Enhanced bus system with line offsetting loaded');


// ============================================================================
// RED DE SENDAS CICLABLES (CYCLING PATHS NETWORK)
// ============================================================================

let sendasLayer = L.layerGroup();

// Load cycling paths network
fetch('data/red-de-sendas-ciclables.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            style: function(feature) {
                return {
                    color: '#10b981',  // Green color for cycling paths
                    weight: 4,
                    opacity: 0.8,
                    lineCap: 'round',
                    lineJoin: 'round',
                    dashArray: '8, 4'  // Dashed line to differentiate from bike lanes
                };
            },
            onEachFeature: function(feature, layer) {
                const props = feature.properties;
                
                let popupContent = '<div class="popup-title">🚴 Senda Ciclable</div>';
                
                if (props.layer) {
                    popupContent += `<div class="popup-detail"><strong>Tipo:</strong> ${props.layer}</div>`;
                }
                
                if (props.longitud) {
                    const lengthKm = (props.longitud / 1000).toFixed(2);
                    popupContent += `<div class="popup-detail"><strong>Longitud:</strong> ${lengthKm} km</div>`;
                }
                
                layer.bindPopup(popupContent);
                
                // Highlight on hover
                layer.on('mouseover', function() {
                    this.setStyle({ weight: 6, opacity: 1 });
                });
                
                layer.on('mouseout', function() {
                    this.setStyle({ weight: 4, opacity: 0.8 });
                });
            }
        }).addTo(sendasLayer);
        
        console.log('Sendas ciclables loaded');
    })
    .catch(error => console.error('Error loading sendas ciclables:', error));

// Toggle sendas ciclables
document.getElementById('toggle-sendas').addEventListener('change', function(e) {
    if (e.target.checked) {
        map.addLayer(sendasLayer);
    } else {
        map.removeLayer(sendasLayer);
    }
});


// ============================================================================
// RED DE CICLOCARRILES (SHARED CAR/BIKE STREETS)
// ============================================================================

let ciclocarrilesLayer = L.layerGroup();

// Load ciclocarriles (shared streets with bike markings)
fetch('data/red-de-ciclocarriles.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            style: function(feature) {
                return {
                    color: '#f59e0b',  // Amber/orange color for shared use
                    weight: 4,
                    opacity: 0.7,
                    lineCap: 'round',
                    lineJoin: 'round',
                    dashArray: '10, 5, 2, 5'  // Dash-dot pattern to show shared nature
                };
            },
            onEachFeature: function(feature, layer) {
                const props = feature.properties;
                
                let popupContent = '<div class="popup-title">🚴🚗 Ciclocarril</div>';
                popupContent += '<div class="popup-detail" style="font-size: 12px; color: #666; margin-top: 4px;">Calle compartida con marcas ciclistas</div>';
                
                if (props.tipo) {
                    popupContent += `<div class="popup-detail" style="margin-top: 6px;"><strong>Tipo:</strong> ${props.tipo}</div>`;
                }
                
                if (props.longitud_m) {
                    const lengthKm = (props.longitud_m / 1000).toFixed(2);
                    popupContent += `<div class="popup-detail"><strong>Longitud:</strong> ${lengthKm} km</div>`;
                }
                
                layer.bindPopup(popupContent);
                
                // Highlight on hover
                layer.on('mouseover', function() {
                    this.setStyle({ weight: 6, opacity: 0.95 });
                });
                
                layer.on('mouseout', function() {
                    this.setStyle({ weight: 4, opacity: 0.7 });
                });
            }
        }).addTo(ciclocarrilesLayer);
        
        console.log('Ciclocarriles loaded');
    })
    .catch(error => console.error('Error loading ciclocarriles:', error));

// Toggle ciclocarriles
document.getElementById('toggle-ciclocarriles').addEventListener('change', function(e) {
    if (e.target.checked) {
        map.addLayer(ciclocarrilesLayer);
    } else {
        map.removeLayer(ciclocarrilesLayer);
    }
});


// ============================================================================
// APARCAMIENTOS PARA BICICLETAS (BIKE PARKING)
// ============================================================================

let bikesParkingLayer = L.layerGroup();

// Custom bike parking icon
const bikeParkingIcon = L.divIcon({
    html: '<div style="background: #8b5cf6; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 14px;">🅿️</div>',
    className: 'bike-parking-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

// Load bike parking locations
fetch('data/aparcamientos-para-bicicletas.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            pointToLayer: function(feature, latlng) {
                return L.marker(latlng, { icon: bikeParkingIcon });
            },
            onEachFeature: function(feature, layer) {
                const props = feature.properties;
                
                let popupContent = '<div class="popup-title">🅿️ Aparcamiento de Bicicletas</div>';
                
                // Show coordinates as reference
                if (props.latitud && props.longitud) {
                    popupContent += `<div class="popup-detail" style="font-size: 11px; color: #888;">
                        ${props.latitud.toFixed(5)}, ${props.longitud.toFixed(5)}
                    </div>`;
                }
                
                // If capacity info exists
                if (props.plazas) {
                    popupContent += `<div class="popup-detail" style="margin-top: 6px;">
                        <strong>Plazas:</strong> ${props.plazas}
                    </div>`;
                }
                
                // If type info exists
                if (props.tipo) {
                    popupContent += `<div class="popup-detail">
                        <strong>Tipo:</strong> ${props.tipo}
                    </div>`;
                }
                
                layer.bindPopup(popupContent);
            }
        }).addTo(bikesParkingLayer);
        
        console.log(`Bike parking loaded: ${data.features.length} locations`);
    })
    .catch(error => console.error('Error loading bike parking:', error));

// Toggle bike parking
document.getElementById('toggle-aparcamientos-bici').addEventListener('change', function(e) {
    if (e.target.checked) {
        map.addLayer(bikesParkingLayer);
    } else {
        map.removeLayer(bikesParkingLayer);
    }
});

// ============================================================================
// ADDRESS SEARCH — live autocomplete (Nominatim, biased to Gijón)
// ============================================================================

(function () {
    var searchInput = document.getElementById('search-input');
    var clearBtn = document.getElementById('search-clear-btn');
    var searchBar = document.getElementById('search-bar');
    if (!searchInput || !clearBtn || !searchBar) return;

    var searchMarker = null;
    var debounceTimer = null;
    var currentResults = [];
    var highlightIndex = -1;

    // Create dropdown element
    var dropdown = document.createElement('div');
    dropdown.id = 'search-dropdown';
    searchBar.appendChild(dropdown);

    function buildQuery(raw) {
        var q = raw.trim();
        if (!q) return '';
        if (q.toLowerCase().includes('gijón') || q.toLowerCase().includes('gijon')) return q;
        return q + ', Gijón, Asturias, Spain';
    }

    function fetchResults(query) {
        var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=6'
            + '&viewbox=-5.73,43.58,-5.58,43.47&bounded=0&countrycodes=es'
            + '&q=' + encodeURIComponent(query);

        return fetch(url).then(function (r) { return r.json(); });
    }

    function shortenName(displayName) {
        var parts = displayName.split(',');
        // Show up to 3 parts (street, area, city) to keep it readable
        return parts.slice(0, 3).map(function (s) { return s.trim(); }).join(', ');
    }

    function renderDropdown(results) {
        currentResults = results;
        highlightIndex = -1;
        dropdown.innerHTML = '';

        if (results.length === 0) {
            dropdown.innerHTML = '<div class="search-dropdown-empty">Sin resultados</div>';
            dropdown.style.display = 'block';
            return;
        }

        results.forEach(function (result, i) {
            var item = document.createElement('div');
            item.className = 'search-dropdown-item';
            item.textContent = shortenName(result.display_name);
            item.addEventListener('mousedown', function (e) {
                e.preventDefault();
                selectResult(result);
            });
            dropdown.appendChild(item);
        });

        dropdown.style.display = 'block';
    }

    function closeDropdown() {
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
        currentResults = [];
        highlightIndex = -1;
    }

    function selectResult(result) {
        var lat = parseFloat(result.lat);
        var lng = parseFloat(result.lon);

        if (searchMarker) map.removeLayer(searchMarker);

        searchMarker = L.marker([lat, lng]).addTo(map);
        var popupHtml = '<strong>' + shortenName(result.display_name) + '</strong>'
            + '<div style="margin-top:8px"><button onclick="routeDirectionsTo('
            + lat + ',' + lng + ',\'' + shortenName(result.display_name).replace(/'/g, "\\'") + '\')"'
            + ' style="background:#3b82f6;color:white;border:none;border-radius:4px;padding:5px 10px;font-size:11px;cursor:pointer;width:100%">'
            + '🧭 Cómo llegar</button></div>';
        searchMarker.bindPopup(popupHtml).openPopup();

        map.flyTo([lat, lng], 17, { duration: 1 });

        searchInput.value = shortenName(result.display_name);
        clearBtn.style.display = 'block';
        closeDropdown();
    }

    function updateHighlight() {
        var items = dropdown.querySelectorAll('.search-dropdown-item');
        items.forEach(function (el, i) {
            el.classList.toggle('highlighted', i === highlightIndex);
        });
    }

    function doLiveSearch() {
        var raw = searchInput.value.trim();
        if (raw.length < 3) {
            closeDropdown();
            return;
        }

        var query = buildQuery(raw);
        fetchResults(query)
            .then(function (data) {
                if (searchInput.value.trim().length < 3) return;
                renderDropdown(data || []);
            })
            .catch(function () {
                closeDropdown();
            });
    }

    // Debounced input handler
    searchInput.addEventListener('input', function () {
        clearBtn.style.display = searchInput.value ? 'block' : 'none';
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(doLiveSearch, 350);
    });

    // Keyboard navigation
    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentResults.length > 0) {
                highlightIndex = Math.min(highlightIndex + 1, currentResults.length - 1);
                updateHighlight();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentResults.length > 0) {
                highlightIndex = Math.max(highlightIndex - 1, 0);
                updateHighlight();
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightIndex >= 0 && highlightIndex < currentResults.length) {
                selectResult(currentResults[highlightIndex]);
            } else if (currentResults.length > 0) {
                selectResult(currentResults[0]);
            } else {
                doLiveSearch();
            }
        } else if (e.key === 'Escape') {
            closeDropdown();
            searchInput.blur();
        }
    });

    // Close on blur (with small delay so mousedown on items fires first)
    searchInput.addEventListener('blur', function () {
        setTimeout(closeDropdown, 150);
    });

    // Clear button
    clearBtn.addEventListener('click', function () {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        closeDropdown();
        if (searchMarker) {
            map.removeLayer(searchMarker);
            searchMarker = null;
        }
    });

    console.log('✓ Address search loaded');
})();

// ============================================================================
// WALK ROUTING (OSRM)
// ============================================================================

var routeFromCoords = null;
var routeToCoords = null;
var routeLine = null;
var routeStartMarker = null;
var routeEndMarker = null;
var routeMode = 'foot';
var bikeInfraLines = null; // cached merged bike infrastructure LineStrings

function routeNominatimSearch(query, callback) {
    var q = query.trim();
    if (q.length < 3) { callback([]); return; }
    if (!q.toLowerCase().includes('gijón') && !q.toLowerCase().includes('gijon')) {
        q += ', Gijón, Asturias, Spain';
    }
    var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=5'
        + '&viewbox=-5.73,43.58,-5.58,43.47&bounded=0&countrycodes=es'
        + '&q=' + encodeURIComponent(q);
    fetch(url)
        .then(function (r) { return r.json(); })
        .then(callback)
        .catch(function () { callback([]); });
}

function routeShortenName(displayName) {
    return displayName.split(',').slice(0, 3).map(function (s) { return s.trim(); }).join(', ');
}

function routeTogglePanel(show) {
    var panel = document.getElementById('route-panel');
    var btn = document.getElementById('route-toggle-btn');
    if (show === undefined) show = panel.style.display === 'none';
    panel.style.display = show ? 'block' : 'none';
    btn.classList.toggle('active', show);

    // Push layer controls down when panel is visible
    var lc = document.querySelector('.layer-controls');
    if (window.innerWidth >= 769 && lc) {
        lc.style.top = show ? '' : '';
    }
}

function routeGetUserLocation(callback) {
    if (!navigator.geolocation) {
        urShowToast('Tu navegador no soporta geolocalización');
        return;
    }
    navigator.geolocation.getCurrentPosition(
        function (pos) { callback(pos.coords.latitude, pos.coords.longitude); },
        function () { urShowToast('No se pudo obtener tu ubicación'); },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function routeSetupDropdown(inputId, dropdownId, onSelect) {
    var input = document.getElementById(inputId);
    var dropdown = document.getElementById(dropdownId);
    var timer = null;

    input.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
            var q = input.value.trim();
            if (q.length < 3) { dropdown.style.display = 'none'; dropdown.innerHTML = ''; return; }
            routeNominatimSearch(q, function (results) {
                dropdown.innerHTML = '';
                if (!results.length) { dropdown.style.display = 'none'; return; }
                results.forEach(function (r) {
                    var item = document.createElement('div');
                    item.className = 'route-dropdown-item';
                    item.textContent = routeShortenName(r.display_name);
                    item.addEventListener('mousedown', function (e) {
                        e.preventDefault();
                        onSelect(parseFloat(r.lat), parseFloat(r.lon), routeShortenName(r.display_name));
                        dropdown.style.display = 'none';
                    });
                    dropdown.appendChild(item);
                });
                dropdown.style.display = 'block';
            });
        }, 350);
    });

    input.addEventListener('blur', function () {
        setTimeout(function () { dropdown.style.display = 'none'; }, 150);
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { dropdown.style.display = 'none'; }
    });
}

function routeCalculate() {
    if (!routeFromCoords || !routeToCoords) {
        urShowToast('Selecciona origen y destino');
        return;
    }

    var calcBtn = document.getElementById('route-calculate-btn');
    calcBtn.disabled = true;
    calcBtn.textContent = '⏳ Calculando...';

    var profile = routeMode === 'bike' ? 'bike' : 'foot';
    var url = 'https://graphhopper.com/api/1/route?profile=' + profile + '&locale=es&points_encoded=false'
        + '&point=' + routeFromCoords[0] + ',' + routeFromCoords[1]
        + '&point=' + routeToCoords[0] + ',' + routeToCoords[1]
        + '&key=[YOUR_API_KEY]';

    fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            calcBtn.disabled = false;
            calcBtn.textContent = 'Calcular ruta';

            if (!data.paths || !data.paths.length) {
                urShowToast('No se encontró ruta');
                return;
            }

            var path = data.paths[0];
            routeClearFromMap();

            if (routeMode === 'bike') {
                routeDrawBikeRoute(path);
            } else {
                routeLine = L.geoJSON(path.points, {
                    style: { color: '#3b82f6', weight: 5, opacity: 0.8 }
                }).addTo(map);
            }

            // Start/end markers
            var startIcon = L.divIcon({
                html: '<div style="background:#22c55e;border:2px solid white;border-radius:50%;width:14px;height:14px;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
                className: '',
                iconSize: [14, 14],
                iconAnchor: [7, 7]
            });
            var endIcon = L.divIcon({
                html: '<div style="background:#ef4444;border:2px solid white;border-radius:50%;width:14px;height:14px;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
                className: '',
                iconSize: [14, 14],
                iconAnchor: [7, 7]
            });

            routeStartMarker = L.marker(routeFromCoords, { icon: startIcon }).addTo(map);
            routeEndMarker = L.marker(routeToCoords, { icon: endIcon }).addTo(map);

            // GraphHopper: distance in meters, time in milliseconds
            var distKm = (path.distance / 1000).toFixed(1);
            var durMin = Math.round(path.time / 60000);
            var resultInfo = document.getElementById('route-result-info');

            if (routeMode === 'bike') {
                var score = routeScoreCycling(path.points.coordinates);
                var icon = score.safePercent >= 70 ? '🟢' : score.safePercent >= 40 ? '🟡' : '🔴';
                resultInfo.innerHTML = '🚲 <strong>' + distKm + ' km</strong> · ' + durMin + ' min en bici'
                    + '<div style="margin-top:6px;font-size:12px;color:#374151">'
                    + icon + ' <strong>' + score.safePercent + '%</strong> en infraestructura ciclista segura'
                    + '</div>'
                    + '<div style="font-size:11px;color:#6b7280;margin-top:2px">'
                    + '(' + (score.safeDistance / 1000).toFixed(1) + ' km protegido de '
                    + (score.totalDistance / 1000).toFixed(1) + ' km total)</div>';
            } else {
                resultInfo.innerHTML = '🚶 <strong>' + distKm + ' km</strong> · ' + durMin + ' min a pie';
            }

            document.getElementById('route-result').style.display = 'block';
        })
        .catch(function (err) {
            console.error('Routing error:', err);
            calcBtn.disabled = false;
            calcBtn.textContent = 'Calcular ruta';
            urShowToast('Error al calcular la ruta');
        });
}

// ============================================================================
// CYCLE ROUTE SCORING
// ============================================================================

function routeLoadBikeInfra() {
    if (bikeInfraLines) return Promise.resolve(bikeInfraLines);

    return Promise.all([
        fetch('data/cycling-lanes.geojson').then(function (r) { return r.json(); }),
        fetch('data/red-de-sendas-ciclables.geojson').then(function (r) { return r.json(); }),
        fetch('data/red-de-ciclocarriles.geojson').then(function (r) { return r.json(); })
    ]).then(function (results) {
        bikeInfraLines = [];
        results.forEach(function (geojson) {
            if (!geojson || !geojson.features) return;
            geojson.features.forEach(function (f) {
                if (f.geometry && (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString')) {
                    bikeInfraLines.push(f);
                }
            });
        });
        console.log('✓ Bike infrastructure loaded: ' + bikeInfraLines.length + ' segments');
        return bikeInfraLines;
    });
}

function routePointNearBikeInfra(lon, lat, infraLines, thresholdKm) {
    var pt = turf.point([lon, lat]);
    for (var i = 0; i < infraLines.length; i++) {
        var line = infraLines[i];
        try {
            var snapped = turf.nearestPointOnLine(line, pt);
            if (snapped.properties.dist <= thresholdKm) {
                return true;
            }
        } catch (e) {
            // skip malformed geometries
        }
    }
    return false;
}

function routeScoreCycling(coordinates) {
    // coordinates is an array of [lon, lat] from GraphHopper GeoJSON
    if (!bikeInfraLines || !coordinates || coordinates.length < 2) {
        return { safePercent: 0, safeDistance: 0, totalDistance: 0 };
    }

    var thresholdKm = 0.015; // 15 meters
    var safeDistance = 0;
    var totalDistance = 0;
    var safeSegments = [];
    var unsafeSegments = [];
    var currentSafe = [];
    var currentUnsafe = [];

    for (var i = 0; i < coordinates.length - 1; i++) {
        var from = coordinates[i];
        var to = coordinates[i + 1];
        var segDist = turf.distance(turf.point(from), turf.point(to), { units: 'kilometers' }) * 1000;
        totalDistance += segDist;

        // Check midpoint of segment against bike infra
        var midLon = (from[0] + to[0]) / 2;
        var midLat = (from[1] + to[1]) / 2;
        var isSafe = routePointNearBikeInfra(midLon, midLat, bikeInfraLines, thresholdKm);

        if (isSafe) {
            safeDistance += segDist;
            if (currentUnsafe.length > 0) {
                unsafeSegments.push(currentUnsafe);
                currentUnsafe = [];
            }
            currentSafe.push(from);
            if (i === coordinates.length - 2) currentSafe.push(to);
        } else {
            if (currentSafe.length > 0) {
                safeSegments.push(currentSafe);
                currentSafe = [];
            }
            currentUnsafe.push(from);
            if (i === coordinates.length - 2) currentUnsafe.push(to);
        }
    }
    if (currentSafe.length > 0) safeSegments.push(currentSafe);
    if (currentUnsafe.length > 0) unsafeSegments.push(currentUnsafe);

    var safePercent = totalDistance > 0 ? Math.round((safeDistance / totalDistance) * 100) : 0;

    return {
        safePercent: safePercent,
        safeDistance: Math.round(safeDistance),
        totalDistance: Math.round(totalDistance),
        safeSegments: safeSegments,
        unsafeSegments: unsafeSegments
    };
}

function routeDrawBikeRoute(path) {
    var score = routeScoreCycling(path.points.coordinates);

    // Draw safe segments in green, unsafe in orange/red
    routeLine = L.layerGroup();

    if (score.safeSegments) {
        score.safeSegments.forEach(function (coords) {
            if (coords.length >= 2) {
                var latlngs = coords.map(function (c) { return [c[1], c[0]]; });
                L.polyline(latlngs, { color: '#22c55e', weight: 5, opacity: 0.85 }).addTo(routeLine);
            }
        });
    }

    if (score.unsafeSegments) {
        score.unsafeSegments.forEach(function (coords) {
            if (coords.length >= 2) {
                var latlngs = coords.map(function (c) { return [c[1], c[0]]; });
                L.polyline(latlngs, { color: '#f59e0b', weight: 5, opacity: 0.85 }).addTo(routeLine);
            }
        });
    }

    routeLine.addTo(map);
}

function routeClearFromMap() {
    if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
    if (routeStartMarker) { map.removeLayer(routeStartMarker); routeStartMarker = null; }
    if (routeEndMarker) { map.removeLayer(routeEndMarker); routeEndMarker = null; }
    document.getElementById('route-result').style.display = 'none';
}

function routeClearAll() {
    routeClearFromMap();
    routeFromCoords = null;
    routeToCoords = null;
    document.getElementById('route-from-input').value = '';
    document.getElementById('route-to-input').value = '';
}

function routeDirectionsTo(lat, lng, name) {
    routeTogglePanel(true);
    document.getElementById('route-to-input').value = name;
    routeToCoords = [lat, lng];

    // Pre-fill from with geolocation
    var fromInput = document.getElementById('route-from-input');
    if (!routeFromCoords) {
        fromInput.value = 'Localizando...';
        routeGetUserLocation(function (uLat, uLng) {
            routeFromCoords = [uLat, uLng];
            fromInput.value = 'Mi ubicación';
        });
    }
}

// Initialize routing panel
(function () {
    // Toggle button
    document.getElementById('route-toggle-btn').addEventListener('click', function (e) {
        e.stopPropagation();
        routeTogglePanel();
    });

    // Close button
    document.getElementById('route-panel-close').addEventListener('click', function () {
        routeTogglePanel(false);
    });

    // From: location button
    document.getElementById('route-from-locate').addEventListener('click', function () {
        var fromInput = document.getElementById('route-from-input');
        fromInput.value = 'Localizando...';
        routeGetUserLocation(function (lat, lng) {
            routeFromCoords = [lat, lng];
            fromInput.value = 'Mi ubicación';
        });
    });

    // From: autocomplete
    routeSetupDropdown('route-from-input', 'route-from-dropdown', function (lat, lng, name) {
        routeFromCoords = [lat, lng];
        document.getElementById('route-from-input').value = name;
    });

    // To: autocomplete
    routeSetupDropdown('route-to-input', 'route-to-dropdown', function (lat, lng, name) {
        routeToCoords = [lat, lng];
        document.getElementById('route-to-input').value = name;
    });

    // Mode buttons
    var modeBtns = document.querySelectorAll('.route-mode-btn');
    modeBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            modeBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            routeMode = btn.dataset.mode;
            if (routeMode === 'bike') routeLoadBikeInfra();
        });
    });

    // Calculate button
    document.getElementById('route-calculate-btn').addEventListener('click', function () {
        if (routeMode === 'bike' && !bikeInfraLines) {
            routeLoadBikeInfra().then(routeCalculate);
        } else {
            routeCalculate();
        }
    });

    // Clear button
    document.getElementById('route-clear-btn').addEventListener('click', routeClearAll);

    // Enter key in inputs triggers calculate
    document.getElementById('route-from-input').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); routeCalculate(); }
    });
    document.getElementById('route-to-input').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); routeCalculate(); }
    });

    console.log('✓ Routing loaded (walk + bike)');
})();

// ============================================================================
// SAFE ROUTING — Phase 1: Data Loading + Phase 2: Graph Building
// ============================================================================

var safeRoutingResidential = null;

function safeRoutingLoadResidential() {
    if (safeRoutingResidential) return Promise.resolve(safeRoutingResidential);

    var query = '[out:json][timeout:15][bbox:43.47,-5.73,43.58,-5.58];'
        + '(way["highway"="residential"];way["highway"="tertiary"];way["highway"="unclassified"];way["highway"="living_street"];way["highway"="pedestrian"];);'
        + 'out geom;';

    var url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);

    return fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            safeRoutingResidential = [];
            if (!data.elements) return safeRoutingResidential;

            data.elements.forEach(function (el) {
                if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) return;

                var coords = el.geometry.map(function (node) {
                    return [node.lon, node.lat];
                });

                safeRoutingResidential.push({
                    type: 'Feature',
                    properties: {
                        osm_id: el.id,
                        highway: el.tags ? el.tags.highway : 'residential',
                        name: el.tags ? (el.tags.name || '') : '',
                        oneway: el.tags ? (el.tags.oneway === 'yes') : false
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: coords
                    }
                });
            });

            console.log('✓ Residential streets loaded: ' + safeRoutingResidential.length + ' ways');
            return safeRoutingResidential;
        })
        .catch(function (err) {
            console.warn('⚠ Overpass API failed, residential streets unavailable:', err.message);
            safeRoutingResidential = [];
            return safeRoutingResidential;
        });
}

// ----------------------------------------------------------------------------
// Phase 2: Graph building
// ----------------------------------------------------------------------------

function safeRoutingNodeKey(lon, lat) {
    return lon.toFixed(6) + ',' + lat.toFixed(6);
}

function safeRoutingBuildGraph(bikeFeatures, residentialFeatures) {
    console.log('Building safe routing graph...');

    var nodeMap = {};
    var nodeCount = 0;

    function addNode(lon, lat) {
        var key = safeRoutingNodeKey(lon, lat);
        if (!nodeMap[key]) {
            nodeMap[key] = { id: nodeCount++, lat: lat, lon: lon };
        }
        return nodeMap[key].id;
    }

    // ngraph.graph UMD exposes as window.createGraph
    var graphFactory = window.createGraph || (window.ngraph && window.ngraph.graph) || null;

    if (!graphFactory) {
        console.warn('⚠ ngraph.graph not available, graph building skipped');
        return null;
    }

    var graph = graphFactory();

    function processFeatures(features, edgeType, weight) {
        features.forEach(function (f) {
            var geom = f.geometry;
            if (!geom) return;

            var lineStrings = [];
            if (geom.type === 'LineString') {
                lineStrings.push(geom.coordinates);
            } else if (geom.type === 'MultiLineString') {
                lineStrings = geom.coordinates;
            }

            lineStrings.forEach(function (coords) {
                for (var i = 0; i < coords.length - 1; i++) {
                    var fromLon = coords[i][0], fromLat = coords[i][1];
                    var toLon = coords[i + 1][0], toLat = coords[i + 1][1];

                    var fromId = addNode(fromLon, fromLat);
                    var toId = addNode(toLon, toLat);

                    if (fromId === toId) continue;

                    var dx = toLon - fromLon;
                    var dy = toLat - fromLat;
                    var dist = Math.sqrt(dx * dx + dy * dy) * 111320;

                    var edgeData = { weight: weight, distance: dist, type: edgeType };

                    if (!graph.getNode(fromId)) graph.addNode(fromId, { lat: fromLat, lon: fromLon });
                    if (!graph.getNode(toId)) graph.addNode(toId, { lat: toLat, lon: toLon });

                    graph.addLink(fromId, toId, edgeData);
                    graph.addLink(toId, fromId, edgeData);
                }
            });
        });
    }

    processFeatures(bikeFeatures, 'bike', 1);
    processFeatures(residentialFeatures, 'residential', 3);

    console.log('✓ Graph built: ' + graph.getNodesCount() + ' nodes, ' + graph.getLinksCount() + ' edges');

    return { graph: graph, nodeMap: nodeMap, nodeCount: nodeCount };
}

// ----------------------------------------------------------------------------
// Init
// ----------------------------------------------------------------------------

function initSafeRouting() {
    console.log('Loading safe routing data...');

    Promise.all([
        routeLoadBikeInfra(),
        safeRoutingLoadResidential()
    ]).then(function (results) {
        var infra = results[0] || [];
        var streets = results[1] || [];

        window.bikeInfrastructure = { type: 'FeatureCollection', features: infra };
        window.residentialStreets = { type: 'FeatureCollection', features: streets };

        console.log('✓ Safe routing data ready ('
            + infra.length + ' bike infra + '
            + streets.length + ' residential streets)');

        var result = safeRoutingBuildGraph(infra, streets);
        if (result) {
            window.safeRoutingGraph = result.graph;
            window.safeRoutingNodeMap = result.nodeMap;
            window.safeRoutingNodeCount = result.nodeCount;
            console.log('✓ Safe routing graph available for pathfinding');
        }
    });
}

document.addEventListener('DOMContentLoaded', initSafeRouting);
