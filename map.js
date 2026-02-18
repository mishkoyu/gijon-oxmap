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

// Custom bus stop icon
const busIcon = L.divIcon({
    html: '🚌',
    className: 'bus-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
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

// Add scale control
L.control.scale({ imperial: false, metric: true }).addTo(map);

console.log('Map initialized');
