// ============================================================================
// EDUCATION LAYERS
// Public education facilities: preschools, primary schools, high schools
// ============================================================================

const educacionInfantilLayer = L.markerClusterGroup({
    maxClusterRadius: 40,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false
});

const institutosPublicosLayer = L.markerClusterGroup({
    maxClusterRadius: 40,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false
});

async function loadEducationLayers() {
    try {
        const [resInfantil, resInstitutos] = await Promise.all([
            fetch('data/educacion-infantil.geojson'),
            fetch('data/institutos.geojson')
        ]);

        const [dataInfantil, dataInstitutos] = await Promise.all([
            resInfantil.json(),
            resInstitutos.json()
        ]);

        dataInfantil.features.forEach(f => addEducationMarker(f, 'infantil', educacionInfantilLayer));
        dataInstitutos.features.forEach(f => addEducationMarker(f, 'instituto', institutosPublicosLayer));

        console.log(`Education layers loaded: ${dataInfantil.features.length} EEI, ${dataInstitutos.features.length} institutos`);
    } catch (err) {
        console.error('Error loading education layers:', err);
    }
}

function addEducationMarker(feature, type, layer) {
    const [lon, lat] = feature.geometry.coordinates;
    const p = feature.properties;

    const iconMap = { infantil: '🏫', instituto: '🏛️' };
    const colorMap = { infantil: '#60a5fa', instituto: '#1e40af' };

    const icon = L.divIcon({
        html: `<div class="education-marker ${type}" style="background:${colorMap[type]}">${iconMap[type]}</div>`,
        className: 'education-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
    });

    const marker = L.marker([lat, lon], { icon });

    let popup = `<div class="education-popup">`;
    popup += `<div class="education-popup-title">${iconMap[type]} ${p.nombre || p.name || ''}</div>`;
    if (p.direccion || p.address) popup += `<div class="education-popup-field">📍 ${p.direccion || p.address}</div>`;
    if (p.telefono || p.phone) {
        const tel = (p.telefono || p.phone).trim();
        popup += `<div class="education-popup-field">📞 <a href="tel:${tel.replace(/\s/g,'')}">${tel}</a></div>`;
    }
    if (p.email || p.correo_electronico) {
        const email = p.email || p.correo_electronico;
        popup += `<div class="education-popup-field">✉️ <a href="mailto:${email}">${email}</a></div>`;
    }
    if (p.web || p.website) {
        const url = p.web || p.website;
        const domain = url.replace(/^https?:\/\//i, '').split('/')[0];
        popup += `<div class="education-popup-field">🌐 <a href="${url}" target="_blank">${domain}</a></div>`;
    }
    if (p.lineas_bus || p.bus_lines) {
        popup += `<div class="education-popup-field">🚌 ${p.lineas_bus || p.bus_lines}</div>`;
    }
    if (p.distrito || p.district) popup += `<div class="education-popup-field">🗺️ Distrito: ${p.distrito || p.district}</div>`;
    popup += `</div>`;

    marker.bindPopup(popup);
    marker.addTo(layer);
}

document.getElementById('toggle-educacion-infantil').addEventListener('change', function(e) {
    if (e.target.checked) map.addLayer(educacionInfantilLayer);
    else map.removeLayer(educacionInfantilLayer);
});

document.getElementById('toggle-institutos-publicos').addEventListener('change', function(e) {
    if (e.target.checked) map.addLayer(institutosPublicosLayer);
    else map.removeLayer(institutosPublicosLayer);
});

function toggleLayerSection(sectionId) {
    const content = document.getElementById(`section-${sectionId}`);
    const arrow = document.getElementById(`arrow-${sectionId}`);
    if (!content || !arrow) return;
    const isHidden = content.style.display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    arrow.textContent = isHidden ? '▼' : '▶';
}

window.toggleLayerSection = toggleLayerSection;

loadEducationLayers();
