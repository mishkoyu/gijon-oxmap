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

// ============================================================================
// ENHANCED BUS SYSTEM - Routes + Stops with Two-Way Interaction
// ============================================================================

// Layers
let busRoutesLayer = L.layerGroup();
let busStopsEnhancedLayer = L.layerGroup();
let routesByLine = {};

// Colors for bus lines
const lineColors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#34495e', '#e67e22', '#16a085', '#c0392b',
    '#e91e63', '#00bcd4', '#ff5722', '#795548', '#607d8b'
];

function getLineColor(lineRef) {
    if (!lineRef) return '#999999';
    
    let hash = 0;
    for (let i = 0; i < lineRef.length; i++) {
        hash = lineRef.charCodeAt(i) + ((hash << 5) - hash);
    }
    return lineColors[Math.abs(hash) % lineColors.length];
}

// ============================================================================
// LINE SELECTOR PANEL
// ============================================================================

function createLineSelectorPanel() {
    const panel = document.createElement('div');
    panel.id = 'line-selector-panel';
    panel.style.cssText = `
        position: fixed;
        top: 400px;
        left: 60px;
        background: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
        max-width: 250px;
        display: none;
    `;
    
    panel.innerHTML = `
        <h3 style="font-size: 14px; margin-bottom: 12px; color: #333; font-weight: 600;">
            Líneas de Autobús
        </h3>
        <div id="line-buttons" style="display: flex; flex-wrap: wrap; gap: 6px;"></div>
        <button onclick="resetBusRoutes()" style="
            margin-top: 12px;
            padding: 6px 12px;
            width: 100%;
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
        ">Mostrar todas</button>
    `;
    
    document.body.appendChild(panel);
    return panel;
}

function updateLineSelectorButtons() {
    const container = document.getElementById('line-buttons');
    if (!container) return;
    
    container.innerHTML = '';
    
    const sortedLines = Object.keys(routesByLine).sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, '')) || 999;
        const numB = parseInt(b.replace(/[^0-9]/g, '')) || 999;
        return numA - numB;
    });
    
    sortedLines.forEach(line => {
        const color = getLineColor(line);
        const button = document.createElement('button');
        button.textContent = line;
        button.className = 'line-button';
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
            transition: transform 0.1s;
        `;
        button.onmouseover = function() {
            this.style.transform = 'scale(1.1)';
        };
        button.onmouseout = function() {
            this.style.transform = 'scale(1)';
        };
        button.onclick = function() {
            highlightBusLine(line);
        };
        container.appendChild(button);
    });
}

// ============================================================================
// LOAD BUS ROUTES
// ============================================================================

async function loadBusRoutes() {
    try {
        const response = await fetch('data/gijon-bus-routes-CLEAN.geojson');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        console.log(`Loading ${data.features.length} bus routes...`);
        
        // Process routes
        let validFeatures = 0;
        data.features.forEach(feature => {
            if (!feature.properties || !feature.properties.line) {
                return;
            }
            
            const line = feature.properties.line;
            if (!routesByLine[line]) {
                routesByLine[line] = [];
            }
            routesByLine[line].push(feature);
            validFeatures++;
        });
        
        console.log(`✓ Found ${validFeatures} valid route features`);
        
        if (validFeatures === 0) {
            console.error('No valid bus routes found!');
            return;
        }
        
        L.geoJSON(data, {
            filter: function(feature) {
                return feature.properties && feature.properties.line;
            },
            style: function(feature) {
                const line = feature.properties.line || 'unknown';
                return {
                    color: getLineColor(line),
                    weight: 4,
                    opacity: 0.6,
                    lineCap: 'round',
                    lineJoin: 'round'
                };
            },
            onEachFeature: function(feature, layer) {
                const props = feature.properties;
                
                let popupContent = `
                    <div class="popup-title">🚌 Línea ${props.line || 'Sin número'}</div>
                    <div class="popup-detail"><strong>${props.name || 'Ruta sin nombre'}</strong></div>
                `;
                
                if (props.from && props.to) {
                    popupContent += `<div class="popup-detail" style="margin-top: 6px;">
                        <strong>Desde:</strong> ${props.from}<br>
                        <strong>Hasta:</strong> ${props.to}
                    </div>`;
                }
                
                layer.bindPopup(popupContent);
                
                layer.on('mouseover', function() {
                    this.setStyle({ weight: 6, opacity: 0.9 });
                });
                
                layer.on('mouseout', function() {
                    const isHighlighted = this.options.opacity === 1;
                    if (!isHighlighted) {
                        this.setStyle({ weight: 4, opacity: 0.6 });
                    }
                });
                
                layer.on('click', function() {
                    if (props.line) {
                        highlightBusLine(props.line);
                    }
                });
            }
        }).addTo(busRoutesLayer);
        
        createLineSelectorPanel();
        updateLineSelectorButtons();
        
        console.log(`✓ Loaded routes for ${Object.keys(routesByLine).length} bus lines`);
        
    } catch (error) {
        console.error('Error loading bus routes:', error);
    }
}

// ============================================================================
// LOAD ENHANCED BUS STOPS
// ============================================================================

async function loadEnhancedBusStops() {
    try {
        const response = await fetch('data/bus-stops-enhanced.geojson');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        console.log(`Loading ${data.features.length} enhanced bus stops...`);
        
        L.geoJSON(data, {
            pointToLayer: function(feature, latlng) {
                return L.marker(latlng, { icon: busIcon });
            },
            onEachFeature: function(feature, layer) {
                const props = feature.properties;
                
                // Create enhanced popup
                let popupContent = `<div class="popup-title">🚏 ${props.name}</div>`;
                
                // Show amenities if available
                const amenities = [];
                if (props.shelter === 'yes') amenities.push('Refugio');
                if (props.bench === 'yes') amenities.push('Asientos');
                if (props.departures_board === 'yes') amenities.push('Pantalla');
                if (props.wheelchair === 'yes') amenities.push('Accesible');
                
                if (amenities.length > 0) {
                    popupContent += `<div class="popup-detail" style="margin-top: 6px;">
                        <strong>📍 Comodidades:</strong> ${amenities.join(', ')}
                    </div>`;
                }
                
                // Show lines
                if (props.lines && props.lines.length > 0) {
                    popupContent += `<div class="popup-detail" style="margin-top: 8px;">
                        <strong>🚌 Líneas que paran aquí:</strong>
                    </div>`;
                    popupContent += '<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">';
                    
                    props.lines.forEach(line => {
                        const color = getLineColor(line);
                        popupContent += `
                            <button class="line-button-popup" data-line="${line}" style="
                                background: ${color};
                                color: white;
                                border: none;
                                padding: 4px 10px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-weight: bold;
                                font-size: 11px;
                            ">${line}</button>
                        `;
                    });
                    
                    popupContent += '</div>';
                    popupContent += `<div class="popup-detail" style="margin-top: 6px; font-size: 11px; color: #888;">
                        Click una línea para ver su recorrido
                    </div>`;
                }
                
                layer.bindPopup(popupContent);
                
                // Add event listener after popup opens
                layer.on('popupopen', function() {
                    const buttons = document.querySelectorAll('.line-button-popup');
                    buttons.forEach(btn => {
                        btn.addEventListener('click', function() {
                            const line = this.dataset.line;
                            highlightBusLine(line);
                        });
                    });
                });
            }
        }).addTo(busStopsEnhancedLayer);
        
        console.log(`✓ Loaded ${data.features.length} enhanced bus stops`);
        
    } catch (error) {
        console.error('Error loading enhanced bus stops:', error);
    }
}

// ============================================================================
// HIGHLIGHT / RESET FUNCTIONS
// ============================================================================

function highlightBusLine(lineRef) {
    console.log(`Highlighting line ${lineRef}`);
    
    // Fade all routes
    busRoutesLayer.eachLayer(layer => {
        layer.setStyle({ opacity: 0.15, weight: 3 });
    });
    
    // Highlight selected line
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
    
    // Update panel button states
    const panelButtons = document.querySelectorAll('#line-buttons button');
    panelButtons.forEach(btn => {
        if (btn.dataset.line === lineRef) {
            btn.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.3)';
        } else {
            btn.style.boxShadow = 'none';
        }
    });
}

function resetBusRoutes() {
    busRoutesLayer.eachLayer(layer => {
        if (layer.feature) {
            const line = layer.feature.properties.line;
            layer.setStyle({ 
                opacity: 0.6, 
                weight: 4,
                color: getLineColor(line)
            });
        }
    });
    
    // Reset panel button states
    const panelButtons = document.querySelectorAll('#line-buttons button');
    panelButtons.forEach(btn => {
        btn.style.boxShadow = 'none';
    });
}

// ============================================================================
// TOGGLE FUNCTIONS
// ============================================================================

// Event listener for bus routes toggle
document.getElementById('toggle-bus-routes').addEventListener('change', function(e) {
    const panel = document.getElementById('line-selector-panel');
    
    if (e.target.checked) {
        map.addLayer(busRoutesLayer);
        if (panel) panel.style.display = 'block';
    } else {
        map.removeLayer(busRoutesLayer);
        if (panel) panel.style.display = 'none';
        resetBusRoutes();
    }
});

// Replace the old bus stops toggle with enhanced version
document.getElementById('toggle-buses').addEventListener('change', function(e) {
    if (e.target.checked) {
        map.addLayer(busStopsEnhancedLayer);
    } else {
        map.removeLayer(busStopsEnhancedLayer);
    }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

// Make functions globally accessible
window.highlightBusLine = highlightBusLine;
window.resetBusRoutes = resetBusRoutes;

// Load both routes and enhanced stops
loadBusRoutes();
loadEnhancedBusStops();
