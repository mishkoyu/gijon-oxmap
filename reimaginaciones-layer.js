// ============================================================================
// REIMAGINA GIJÓN — MAP LAYER & MARKERS
// ============================================================================

const reimaginacionesLayer = L.markerClusterGroup({
    maxClusterRadius: 40,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false
});

async function reimaginaLoadLayer() {
    try {
        const res = await fetch(REIMAGINA_API);
        if (!res.ok) throw new Error('Failed to load reimaginaciones');

        const data = await res.json();
        reimaginacionesLayer.clearLayers();

        data.forEach(item => {
            const icon = L.divIcon({
                html: '<div class="reimagina-marker">🎨</div>',
                className: 'reimagina-icon',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -16]
            });

            const marker = L.marker(
                [item.latitude, item.longitude],
                { icon }
            );

            marker.on('click', () => reimaginaOpenGallery(item));
            marker.addTo(reimaginacionesLayer);
        });

        // Update count badge
        const countEl = document.getElementById('count-reimaginaciones');
        if (countEl) countEl.textContent = `(${data.length})`;

        console.log(`✓ Reimagina Gijón: ${data.length} reimaginaciones loaded`);
    } catch (error) {
        console.error('Error loading reimaginaciones:', error);
    }
}

// Wire toggle checkbox
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('toggle-reimaginaciones');
    if (toggle) {
        toggle.addEventListener('change', e => {
            if (e.target.checked) {
                map.addLayer(reimaginacionesLayer);
            } else {
                map.removeLayer(reimaginacionesLayer);
            }
        });
    }

    reimaginaLoadLayer();
});
