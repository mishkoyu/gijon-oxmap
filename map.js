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

// Load and display pollution data
fetch('data/pollution.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            pointToLayer: function(feature, latlng) {
                const color = getPollutionColor(feature.properties.aqi_level);
                return L.circleMarker(latlng, {
                    radius: 10,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                });
            },
            onEachFeature: function(feature, layer) {
                const props = feature.properties;
                let popupContent = '<div class="popup-title">' + props.name + '</div>';
                popupContent += '<div class="popup-detail" style="font-size: 11px; color: #888; margin-bottom: 6px;">Datos oficiales Gijón</div>';
                
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
                
                popupContent += '<div class="popup-detail" style="margin-top: 6px; font-size: 11px; color: #888;">Promedio de últimas lecturas</div>';
                
                layer.bindPopup(popupContent);
            }
        }).addTo(pollutionLayer);
        
        console.log('Pollution data loaded');
    })
    .catch(error => console.error('Error loading pollution data:', error));

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

console.log('Map initialized');
