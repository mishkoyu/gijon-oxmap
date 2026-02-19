// Initialize map centered on Gijón
const map = L.map('map').setView([43.5138, -5.6535], 13);

// Add OpenStreetMap base layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

// Layer groups for toggling
let cyclingLayer = L.layerGroup().addTo(map);
let busLayer = L.layerGroup().addTo(map);
let pollutionLayer = L.layerGroup().addTo(map);
let iqairLayer = L.layerGroup().addTo(map);
let schoolsLayer = L.layerGroup();
let busRoutesLayer = L.layerGroup();

// Store route data for click interactions
let routesByLine = {};


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
fetch('data/bus-stops.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            pointToLayer: function(feature, latlng) {
                return L.marker(latlng, { icon: busIcon });
            },
            onEachFeature: function(feature, layer) {
                const props = feature.properties;
                let popupContent = '<div class="popup-title">';
                popupContent += props.name || 'Parada de autobús';
                popupContent += '</div>';
                
                if (props.ref) {
                    popupContent += `<div class="popup-detail"><strong>Referencia:</strong> ${props.ref}</div>`;
                }
                
                if (props.operator) {
                    popupContent += `<div class="popup-detail"><strong>Operador:</strong> ${props.operator}</div>`;
                }
                
                if (props.shelter === 'yes') {
                    popupContent += '<div class="popup-detail">✓ Con marquesina</div>';
                }
                
                if (props.bench === 'yes') {
                    popupContent += '<div class="popup-detail">✓ Con banco</div>';
                }
                
                layer.bindPopup(popupContent);
            }
        }).addTo(busLayer);
        
        console.log('Bus stops loaded');
    })
    .catch(error => console.error('Error loading bus stops:', error));

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
                
                mainMarker.bindPopup(popupContent);
            }
        }).addTo(pollutionLayer);
        
        console.log(`Pollution data displayed (source: ${dataSource})`);
}

// Load pollution data on page load
loadPollutionData();

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
document.getElementById('toggle-cycling').addEventListener('change', function(e) {
    if (e.target.checked) {
        map.addLayer(cyclingLayer);
    } else {
        map.removeLayer(cyclingLayer);
    }
});

document.getElementById('toggle-buses').addEventListener('change', function(e) {
    if (e.target.checked) {
        map.addLayer(busLayer);
    } else {
        map.removeLayer(busLayer);
    }
});

document.getElementById('toggle-pollution').addEventListener('change', function(e) {
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

document.getElementById('toggle-schools').addEventListener('change', function(e) {
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


// ============================================================================
// BUS ROUTES SYSTEM
// ============================================================================

// Colors for bus lines
const lineColors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#34495e', '#e67e22', '#16a085', '#c0392b'
];

function getLineColor(lineRef) {
    let hash = 0;
    for (let i = 0; i < lineRef.length; i++) {
        hash = lineRef.charCodeAt(i) + ((hash << 5) - hash);
    }
    return lineColors[Math.abs(hash) % lineColors.length];
}

// Load and display bus routes
async function loadBusRoutes() {
    try {
        const response = await fetch('data/gijon-bus-routes.geojson');
        const data = await response.json();
        
        console.log(`Loading ${data.features.length} bus routes...`);
        
        // Group routes by line number
        data.features.forEach(feature => {
            const line = feature.properties.line;
            if (!routesByLine[line]) {
                routesByLine[line] = [];
            }
            routesByLine[line].push(feature);
        });
        
        // Add all routes to the map
        L.geoJSON(data, {
            style: function(feature) {
                const line = feature.properties.line;
                return {
                    color: getLineColor(line),
                    weight: 4,
                    opacity: 0.7,
                    lineCap: 'round',
                    lineJoin: 'round'
                };
            },
            onEachFeature: function(feature, layer) {
                const props = feature.properties;
                
                let popupContent = `
                    <div class="popup-title">🚌 Línea ${props.line}</div>
                    <div class="popup-detail"><strong>${props.name}</strong></div>
                `;
                
                if (props.from && props.to) {
                    popupContent += `<div class="popup-detail" style="margin-top: 6px;">
                        <strong>Desde:</strong> ${props.from}<br>
                        <strong>Hasta:</strong> ${props.to}
                    </div>`;
                }
                
                popupContent += `<div class="popup-detail" style="margin-top: 6px; font-size: 11px; color: #888;">
                    Click para resaltar esta línea
                </div>`;
                
                layer.bindPopup(popupContent);
                
                // Highlight on hover
                layer.on('mouseover', function() {
                    this.setStyle({ weight: 6, opacity: 0.9 });
                });
                
                layer.on('mouseout', function() {
                    this.setStyle({ weight: 4, opacity: 0.7 });
                });
                
                // Click to highlight
                layer.on('click', function() {
                    highlightBusLine(props.line);
                });
            }
        }).addTo(busRoutesLayer);
        
        console.log(`✓ Loaded routes for ${Object.keys(routesByLine).length} bus lines`);
        
    } catch (error) {
        console.error('Error loading bus routes:', error);
    }
}

// Highlight a specific bus line
function highlightBusLine(lineRef) {
    console.log(`Highlighting line ${lineRef}`);
    
    busRoutesLayer.eachLayer(layer => {
        layer.setStyle({ opacity: 0.2, weight: 3 });
    });
    
    busRoutesLayer.eachLayer(layer => {
        if (layer.feature && layer.feature.properties.line === lineRef) {
            layer.setStyle({ 
                opacity: 1, 
                weight: 6,
                color: getLineColor(lineRef)
            });
            layer.bringToFront();
        }
    });
    
    showLineNotification(lineRef);
}

// Reset all routes
function resetBusRoutes() {
    busRoutesLayer.eachLayer(layer => {
        if (layer.feature) {
            const line = layer.feature.properties.line;
            layer.setStyle({ 
                opacity: 0.7, 
                weight: 4,
                color: getLineColor(line)
            });
        }
    });
}

// Show notification
function showLineNotification(lineRef) {
    const existing = document.getElementById('line-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.id = 'line-notification';
    notification.innerHTML = `
        <strong>Línea ${lineRef}</strong> resaltada
        <button onclick="resetBusRoutes()" style="margin-left: 10px; padding: 2px 8px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: white;">
            Mostrar todas
        </button>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 1000;
        font-size: 14px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Toggle bus routes layer
function toggleBusRoutes() {
    const checkbox = document.getElementById('toggle-bus-routes');
    if (checkbox.checked) {
        map.addLayer(busRoutesLayer);
    } else {
        map.removeLayer(busRoutesLayer);
        const notification = document.getElementById('line-notification');
        if (notification) notification.remove();
    }
}

// Make functions globally accessible
window.toggleBusRoutes = toggleBusRoutes;
window.highlightBusLine = highlightBusLine;
window.resetBusRoutes = resetBusRoutes;

// Load bus routes on page load
loadBusRoutes();

console.log('Map initialized');
