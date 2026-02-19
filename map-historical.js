// Initialize map centered on Gijón
const map = L.map('map').setView([43.5138, -5.6535], 13);

// Add OpenStreetMap base layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

// Layer groups
let cyclingLayer = L.layerGroup().addTo(map);
let busLayer = L.layerGroup().addTo(map);
let pollutionLayer = L.layerGroup().addTo(map);
let iqairLayer = L.layerGroup().addTo(map);
let schoolsLayer = L.layerGroup();
let historicalPollutionLayer = L.layerGroup();

// View mode state
let currentView = 'current'; // 'current' or 'historical'
let playInterval = null;
let currentMonthIndex = 0;

// Available months index (will be loaded from server)
let availableMonths = [];

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

// Utility functions
function getPollutionColor(level) {
    const colors = {
        'Good': '#22c55e',
        'Moderate': '#eab308',
        'Poor': '#f97316',
        'Very Poor': '#ef4444',
        'No data': '#9ca3af'
    };
    return colors[level] || '#9ca3af';
}

function getAqiBadgeClass(level) {
    const classes = {
        'Good': 'aqi-good',
        'Moderate': 'aqi-moderate',
        'Poor': 'aqi-poor',
        'Very Poor': 'aqi-verypoor'
    };
    return classes[level] || '';
}

function getMonthName(month) {
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1];
}

// Load available periods index (multi-granularity)
async function loadMonthsIndex() {
    try {
        const response = await fetch('historical-pollution/index.json');
        const data = await response.json();
        
        // New format has "periods" array instead of "available_months"
        availableMonths = data.periods || data.available_months;
        
        // Update slider max value
        document.getElementById('time-slider').max = availableMonths.length - 1;
        
        console.log(`Loaded ${availableMonths.length} periods of historical data`);
        console.log(`Granularity: ${JSON.stringify(data.granularity_summary || 'mixed')}`);
        
        // Load first period by default
        if (availableMonths.length > 0) {
            loadHistoricalMonth(0);
        }
    } catch (error) {
        console.error('Error loading months index:', error);
    }
}

// Load historical pollution data for a specific period (month/week/day)
async function loadHistoricalMonth(index) {
    if (index < 0 || index >= availableMonths.length) return;
    
    const periodData = availableMonths[index];
    
    // Skip if no data (e.g., 2025 gap)
    if (periodData.granularity === 'none' || !periodData.file) {
        historicalPollutionLayer.clearLayers();
        document.getElementById('time-display').textContent = periodData.display;
        console.log('No data available for this period');
        return;
    }
    
    const filename = periodData.file;
    
    try {
        const response = await fetch(`historical-pollution/${filename}`);
        const data = await response.json();
        
        // Clear existing historical data
        historicalPollutionLayer.clearLayers();
        
        // Add new data
        L.geoJSON(data, {
            pointToLayer: function(feature, latlng) {
                const color = getPollutionColor(feature.properties.aqi_level);
                
                // Create glow/halo effect
                const glow = L.circle(latlng, {
                    radius: 150, // meters
                    fillColor: color,
                    fillOpacity: 0.15,
                    color: color,
                    weight: 1,
                    opacity: 0.3
                });
                
                // Create main marker
                const marker = L.circleMarker(latlng, {
                    radius: 10,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.9
                });
                
                marker._isMainMarker = true;
                
                return L.layerGroup([glow, marker]);
            },
            onEachFeature: function(feature, layer) {
                // Find main marker
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
                let popupContent = `<div class="popup-title">${props.name}</div>`;
                
                // Build date display based on granularity
                let dateDisplay = '';
                if (periodData.granularity === 'daily' && props.date) {
                    dateDisplay = periodData.display; // Use the pre-formatted display string
                } else if (periodData.granularity === 'weekly' && props.week_start) {
                    dateDisplay = periodData.display; // Use the pre-formatted week range
                } else if (props.month && props.year) {
                    dateDisplay = `${getMonthName(props.month)} ${props.year}`;
                } else {
                    dateDisplay = periodData.display;
                }
                
                popupContent += `<div class="popup-detail" style="font-size: 11px; color: #888; margin-bottom: 6px;">
                    ${dateDisplay}
                </div>`;
                
                popupContent += `<div class="popup-detail">
                    <span class="aqi-badge ${getAqiBadgeClass(props.aqi_level)}">
                        ${props.aqi_level}
                    </span>
                </div>`;
                
                if (props.aqi_score) {
                    popupContent += `<div class="popup-detail" style="margin-top: 8px;"><strong>Índice:</strong> ${props.aqi_score}</div>`;
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
                
                mainMarker.bindPopup(popupContent);
            }
        }).addTo(historicalPollutionLayer);
        
        // Update display with the pre-formatted display string
        document.getElementById('time-display').textContent = periodData.display;
        
        currentMonthIndex = index;
        
        console.log(`Loaded ${filename} (${periodData.granularity})`);
    } catch (error) {
        console.error(`Error loading ${filename}:`, error);
    }
}

// View mode switching
function switchToCurrentView() {
    currentView = 'current';
    document.getElementById('current-view-btn').classList.add('active');
    document.getElementById('historical-view-btn').classList.remove('active');
    document.getElementById('time-controls').style.display = 'none';
    
    // Show current data layers
    map.removeLayer(historicalPollutionLayer);
    if (document.getElementById('toggle-pollution').checked) {
        map.addLayer(pollutionLayer);
    }
    if (document.getElementById('toggle-iqair').checked) {
        map.addLayer(iqairLayer);
    }
    
    stopPlayback();
}

function switchToHistoricalView() {
    currentView = 'historical';
    document.getElementById('current-view-btn').classList.remove('active');
    document.getElementById('historical-view-btn').classList.add('active');
    document.getElementById('time-controls').style.display = 'block';
    
    // Hide current data, show historical
    map.removeLayer(pollutionLayer);
    map.removeLayer(iqairLayer);
    map.addLayer(historicalPollutionLayer);
    
    stopPlayback();
}

// Playback controls
function startPlayback() {
    const speed = parseInt(document.getElementById('speed-select').value);
    document.getElementById('play-btn').textContent = '⏸ Pausar';
    
    playInterval = setInterval(() => {
        if (currentMonthIndex < availableMonths.length - 1) {
            currentMonthIndex++;
            document.getElementById('time-slider').value = currentMonthIndex;
            loadHistoricalMonth(currentMonthIndex);
        } else {
            stopPlayback();
        }
    }, speed);
}

function stopPlayback() {
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
        document.getElementById('play-btn').textContent = '▶ Reproducir';
    }
}

function togglePlayback() {
    if (playInterval) {
        stopPlayback();
    } else {
        startPlayback();
    }
}

function previousMonth() {
    if (currentMonthIndex > 0) {
        currentMonthIndex--;
        document.getElementById('time-slider').value = currentMonthIndex;
        loadHistoricalMonth(currentMonthIndex);
    }
}

function nextMonth() {
    if (currentMonthIndex < availableMonths.length - 1) {
        currentMonthIndex++;
        document.getElementById('time-slider').value = currentMonthIndex;
        loadHistoricalMonth(currentMonthIndex);
    }
}

// Event listeners
document.getElementById('current-view-btn').addEventListener('click', switchToCurrentView);
document.getElementById('historical-view-btn').addEventListener('click', switchToHistoricalView);

document.getElementById('time-slider').addEventListener('input', function(e) {
    stopPlayback();
    loadHistoricalMonth(parseInt(e.target.value));
});

document.getElementById('play-btn').addEventListener('click', togglePlayback);
document.getElementById('prev-btn').addEventListener('click', previousMonth);
document.getElementById('next-btn').addEventListener('click', nextMonth);

// Layer toggles
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
    if (currentView === 'current') {
        if (e.target.checked) {
            map.addLayer(pollutionLayer);
        } else {
            map.removeLayer(pollutionLayer);
        }
    }
});

document.getElementById('toggle-iqair').addEventListener('change', function(e) {
    if (currentView === 'current') {
        if (e.target.checked) {
            map.addLayer(iqairLayer);
        } else {
            map.removeLayer(iqairLayer);
        }
    }
});

document.getElementById('toggle-schools').addEventListener('change', function(e) {
    if (e.target.checked) {
        map.addLayer(schoolsLayer);
    } else {
        map.removeLayer(schoolsLayer);
    }
});

// Load cycling lanes
fetch('data/cycling-lanes.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            style: {
                color: '#2563eb',
                weight: 3,
                opacity: 0.8
            },
            onEachFeature: function(feature, layer) {
                const props = feature.properties;
                let popupContent = '<div class="popup-title">Carril Bici</div>';
                if (props.name) popupContent += `<div class="popup-detail"><strong>Calle:</strong> ${props.name}</div>`;
                if (props.surface) popupContent += `<div class="popup-detail"><strong>Superficie:</strong> ${props.surface}</div>`;
                if (props.lit) popupContent += `<div class="popup-detail"><strong>Iluminación:</strong> ${props.lit === 'yes' ? 'Sí' : 'No'}</div>`;
                layer.bindPopup(popupContent);
            }
        }).addTo(cyclingLayer);
        console.log('Cycling lanes loaded');
    })
    .catch(error => console.error('Error loading cycling lanes:', error));

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
                let popupContent = '<div class="popup-title">Parada de Autobús</div>';
                if (props.name) popupContent += `<div class="popup-detail"><strong>Nombre:</strong> ${props.name}</div>`;
                if (props.operator) popupContent += `<div class="popup-detail"><strong>Operador:</strong> ${props.operator}</div>`;
                if (props.route_ref) popupContent += `<div class="popup-detail"><strong>Líneas:</strong> ${props.route_ref}</div>`;
                layer.bindPopup(popupContent);
            }
        }).addTo(busLayer);
        console.log('Bus stops loaded');
    })
    .catch(error => console.error('Error loading bus stops:', error));

// Load current pollution data (hybrid: live API with fallback)
async function loadCurrentPollutionData() {
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
    displayCurrentPollutionData(data, dataSource);
}

// Convert API response to GeoJSON format (same as map.js)
function convertApiToGeoJSON(apiData) {
    const stations = {};
    const readings = apiData.calidadairemediatemporales.calidadairemediatemporal;
    
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
        
        if (reading.pm25) station.pm25.push(parseFloat(reading.pm25));
        if (reading.pm10) station.pm10.push(parseFloat(reading.pm10));
        if (reading.no2) station.no2.push(parseFloat(reading.no2));
        if (reading.o3) station.o3.push(parseFloat(reading.o3));
        
        const readingDate = reading.fecha;
        const readingPeriod = reading.periodo;
        
        if (!station.latestDate || readingDate > station.latestDate || 
            (readingDate === station.latestDate && readingPeriod > station.latestPeriod)) {
            station.latestDate = readingDate;
            station.latestPeriod = readingPeriod;
        }
    });
    
    const features = Object.values(stations).map(station => {
        const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b) / arr.length : null;
        
        const pm25Avg = avg(station.pm25);
        const pm10Avg = avg(station.pm10);
        const no2Avg = avg(station.no2);
        const o3Avg = avg(station.o3);
        
        let aqiScore = null;
        const scores = [];
        if (pm25Avg) scores.push(pm25Avg / 25 * 100);
        if (pm10Avg) scores.push(pm10Avg / 50 * 100);
        if (no2Avg) scores.push(no2Avg / 40 * 100);
        if (scores.length > 0) aqiScore = scores.reduce((a, b) => a + b) / scores.length;
        
        let aqiLevel, color;
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

// Display current pollution data
function displayCurrentPollutionData(data, dataSource) {
        L.geoJSON(data, {
            pointToLayer: function(feature, latlng) {
                const color = getPollutionColor(feature.properties.aqi_level);
                
                // Create glow/halo effect
                const glow = L.circle(latlng, {
                    radius: 150, // meters
                    fillColor: color,
                    fillOpacity: 0.15,
                    color: color,
                    weight: 1,
                    opacity: 0.3
                });
                
                // Create main marker
                const marker = L.circleMarker(latlng, {
                    radius: 10,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.9
                });
                
                marker._isMainMarker = true;
                
                return L.layerGroup([glow, marker]);
            },
            onEachFeature: function(feature, layer) {
                // Find main marker
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
                
                const sourceLabel = dataSource === 'live' ? 
                    'Datos en tiempo real' : 'Datos en caché';
                popupContent += `<div class="popup-detail" style="font-size: 11px; color: #888; margin-bottom: 6px;">${sourceLabel}</div>`;
                
                popupContent += `<div class="popup-detail">
                    <span class="aqi-badge ${getAqiBadgeClass(props.aqi_level)}">
                        ${props.aqi_level}
                    </span>
                </div>`;
                
                if (props.aqi_score) popupContent += `<div class="popup-detail" style="margin-top: 8px;"><strong>Índice:</strong> ${props.aqi_score}</div>`;
                if (props.pm25_avg) popupContent += `<div class="popup-detail"><strong>PM2.5:</strong> ${props.pm25_avg} μg/m³</div>`;
                if (props.pm10_avg) popupContent += `<div class="popup-detail"><strong>PM10:</strong> ${props.pm10_avg} μg/m³</div>`;
                if (props.no2_avg) popupContent += `<div class="popup-detail"><strong>NO₂:</strong> ${props.no2_avg} μg/m³</div>`;
                
                // Add timestamp if available
                if (props.latest_reading) {
                    popupContent += `<div class="popup-detail" style="margin-top: 6px; font-size: 11px; color: #888;">Última lectura: ${props.latest_reading}</div>`;
                }
                
                mainMarker.bindPopup(popupContent);
            }
        }).addTo(pollutionLayer);
        console.log(`Pollution data displayed (source: ${dataSource})`);
}

// Load pollution on page load
loadCurrentPollutionData();

// Load IQAir data
async function loadIQAirData() {
    try {
        const lat = 43.5138;
        const lon = -5.6535;
        const url = `https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lon}&key=${IQAIR_API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.status !== 'success') return;
        
        const pollution = data.data.current.pollution;
        const aqi = pollution.aqius;
        
        let color;
        if (aqi <= 50) color = '#22c55e';
        else if (aqi <= 100) color = '#eab308';
        else if (aqi <= 150) color = '#f97316';
        else color = '#ef4444';
        
        const marker = L.circleMarker([lat, lon], {
            radius: 12,
            fillColor: color,
            color: '#6366f1',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.7
        }).addTo(iqairLayer);
        
        let aqiLevel;
        if (aqi <= 50) aqiLevel = 'Good';
        else if (aqi <= 100) aqiLevel = 'Moderate';
        else if (aqi <= 150) aqiLevel = 'Unhealthy for Sensitive';
        else aqiLevel = 'Unhealthy';
        
        let popupContent = '<div class="popup-title">IQAir - Gijón (Ciudad)</div>';
        popupContent += '<div class="popup-detail" style="font-size: 11px; color: #888; margin-bottom: 6px;">Estimación a nivel ciudad</div>';
        popupContent += `<div class="popup-detail"><span class="aqi-badge" style="background-color: ${color};">${aqiLevel}</span></div>`;
        popupContent += `<div class="popup-detail" style="margin-top: 8px;"><strong>AQI (US):</strong> ${aqi}</div>`;
        if (pollution.pm25) popupContent += `<div class="popup-detail"><strong>PM2.5:</strong> ${pollution.pm25} μg/m³</div>`;
        
        marker.bindPopup(popupContent);
        console.log('IQAir data loaded');
    } catch (error) {
        console.error('Error loading IQAir data:', error);
    }
}

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

// Initialize
loadIQAirData();
loadMonthsIndex();
