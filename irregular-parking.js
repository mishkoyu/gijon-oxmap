// ============================================================================
// IRREGULAR PARKING REPORTING SYSTEM
// ============================================================================

// Configuration
const API_URL = 'https://oxmap-backend.onrender.com/api/irregular-parking/';
const CLOUDINARY_CLOUD_NAME = 'dqowkswsh';
const CLOUDINARY_UPLOAD_PRESET = 'ml_default';

// Layer
let irregularParkingLayer = L.layerGroup();
let contextMenu = null;
let uploadedPhotoUrl = null;

// Custom marker icon
const irregularParkingIcon = L.divIcon({
    html: '<div style="background: #ef4444; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); font-size: 16px;">🚗</div>',
    className: 'irregular-parking-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
});

// ============================================================================
// CONTEXT MENU
// ============================================================================

function createContextMenu(latlng) {
    // Remove existing menu
    if (contextMenu) {
        contextMenu.remove();
    }

    // Create menu element
    contextMenu = document.createElement('div');
    contextMenu.id = 'context-menu';
    contextMenu.style.cssText = `
        position: fixed;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        min-width: 200px;
        padding: 8px 0;
    `;

    contextMenu.innerHTML = `
        <div style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">
            📍 Añadir Datos
        </div>
        <div id="add-irregular-parking" style="padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.2s;">
            <span style="font-size: 18px;">🚗</span>
            <span>Estacionamiento Irregular</span>
        </div>
    `;

    document.body.appendChild(contextMenu);

    // Position menu (responsive)
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
        // Center on mobile
        contextMenu.style.left = '50%';
        contextMenu.style.top = '50%';
        contextMenu.style.transform = 'translate(-50%, -50%)';
    } else {
        // At cursor on desktop
        const point = map.latLngToContainerPoint(latlng);
        contextMenu.style.left = point.x + 'px';
        contextMenu.style.top = point.y + 'px';
    }

    // Hover effect
    const option = contextMenu.querySelector('#add-irregular-parking');
    option.onmouseover = () => option.style.background = '#f3f4f6';
    option.onmouseout = () => option.style.background = 'transparent';

    // Click handler
    option.onclick = () => {
        contextMenu.remove();
        showReportForm(latlng);
    };

    // Close on click outside
    setTimeout(() => {
        document.addEventListener('click', closeContextMenu);
    }, 100);
}

function closeContextMenu(e) {
    if (contextMenu && !contextMenu.contains(e.target)) {
        contextMenu.remove();
        contextMenu = null;
        document.removeEventListener('click', closeContextMenu);
    }
}

// ============================================================================
// REPORT FORM
// ============================================================================

function showReportForm(latlng) {
    uploadedPhotoUrl = null;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'report-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    `;

    // Responsive form
    const isMobile = window.innerWidth < 768;
    const formWidth = isMobile ? '100%' : '500px';
    const formMaxHeight = isMobile ? '90vh' : '80vh';

    overlay.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 24px; width: ${formWidth}; max-width: 500px; max-height: ${formMaxHeight}; overflow-y: auto;">
            <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #111827;">🚗 Reportar Estacionamiento Irregular</h2>
            <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b7280;">Ayuda a mejorar la movilidad en Gijón</p>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px; color: #374151;">📍 Ubicación</label>
                <input type="text" value="${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}" readonly style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; background: #f9fafb; font-size: 14px;">
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px; color: #374151;">📷 Foto <span style="color: #ef4444;">*</span></label>
                <input type="file" id="photo-input" accept="image/*" capture="environment" style="display: none;">
                <button id="photo-button" style="width: 100%; padding: 40px; border: 2px dashed #d1d5db; border-radius: 8px; background: white; cursor: pointer; font-size: 14px; color: #6b7280; transition: all 0.2s;">
                    📸 Tomar/Elegir Foto
                </button>
                <div id="photo-preview" style="margin-top: 12px; display: none;">
                    <img id="preview-img" style="width: 100%; border-radius: 8px; max-height: 200px; object-fit: cover;">
                    <button id="change-photo" style="margin-top: 8px; padding: 8px; width: 100%; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer; font-size: 13px;">🔄 Cambiar foto</button>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 14px; color: #374151;">💬 Comentario (opcional)</label>
                <textarea id="comment-input" placeholder="Ej: Coche bloqueando carril bici durante horas punta" maxlength="500" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical; min-height: 80px; font-family: inherit;"></textarea>
                <div style="text-align: right; font-size: 12px; color: #9ca3af; margin-top: 4px;">
                    <span id="char-count">0</span>/500
                </div>
            </div>
            
            <div id="error-message" style="display: none; padding: 12px; background: #fee2e2; border: 1px solid #fecaca; border-radius: 6px; color: #991b1b; font-size: 14px; margin-bottom: 16px;"></div>
            
            <div style="display: flex; gap: 12px;">
                <button id="cancel-button" style="flex: 1; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer; font-weight: 500; font-size: 14px;">Cancelar</button>
                <button id="submit-button" style="flex: 1; padding: 12px; border: none; border-radius: 6px; background: #3b82f6; color: white; cursor: pointer; font-weight: 500; font-size: 14px;">Enviar Reporte</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Wire up events
    setupFormEvents(overlay, latlng);
}

function setupFormEvents(overlay, latlng) {
    const photoInput = overlay.querySelector('#photo-input');
    const photoButton = overlay.querySelector('#photo-button');
    const photoPreview = overlay.querySelector('#photo-preview');
    const previewImg = overlay.querySelector('#preview-img');
    const changePhoto = overlay.querySelector('#change-photo');
    const commentInput = overlay.querySelector('#comment-input');
    const charCount = overlay.querySelector('#char-count');
    const cancelButton = overlay.querySelector('#cancel-button');
    const submitButton = overlay.querySelector('#submit-button');
    const errorMessage = overlay.querySelector('#error-message');

    // Photo button
    photoButton.onclick = () => photoInput.click();
    changePhoto.onclick = () => photoInput.click();

    // Photo selection
    photoInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate
        if (file.size > 5 * 1024 * 1024) {
            showError('La foto debe ser menor a 5MB');
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            photoButton.style.display = 'none';
            photoPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);

        // Upload to Cloudinary
        await uploadToCloudinary(file, errorMessage, submitButton);
    };

    // Character count
    commentInput.oninput = () => {
        charCount.textContent = commentInput.value.length;
    };

    // Cancel
    cancelButton.onclick = () => overlay.remove();
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };

    // Submit
    submitButton.onclick = () => submitReport(latlng, commentInput.value, overlay, errorMessage, submitButton);
}

function showError(message) {
    const errorEl = document.querySelector('#error-message');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        setTimeout(() => errorEl.style.display = 'none', 5000);
    }
}

// ============================================================================
// CLOUDINARY UPLOAD
// ============================================================================

async function uploadToCloudinary(file, errorEl, submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Subiendo foto...';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
                method: 'POST',
                body: formData
            }
        );

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        uploadedPhotoUrl = data.secure_url;

        submitButton.disabled = false;
        submitButton.textContent = 'Enviar Reporte';
    } catch (error) {
        console.error('Upload error:', error);
        errorEl.textContent = 'Error al subir la foto. Inténtalo de nuevo.';
        errorEl.style.display = 'block';
        submitButton.disabled = false;
        submitButton.textContent = 'Enviar Reporte';
    }
}

// ============================================================================
// SUBMIT REPORT
// ============================================================================

async function submitReport(latlng, comment, overlay, errorEl, submitButton) {
    // Validate
    if (!uploadedPhotoUrl) {
        errorEl.textContent = 'Por favor, añade una foto';
        errorEl.style.display = 'block';
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';

    const data = {
        latitude: parseFloat(latlng.lat.toFixed(6)),
        longitude: parseFloat(latlng.lng.toFixed(6)),
        photo_url: uploadedPhotoUrl,
        comment: comment.trim()
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al enviar');
        }

        const report = await response.json();

        // Close form
        overlay.remove();

        // Add marker
        addReportMarker(report);

        // Show success
        showSuccessMessage(latlng);

    } catch (error) {
        console.error('Submit error:', error);
        errorEl.textContent = error.message || 'Error al enviar. Inténtalo de nuevo.';
        errorEl.style.display = 'block';
        submitButton.disabled = false;
        submitButton.textContent = 'Enviar Reporte';
    }
}

function showSuccessMessage(latlng) {
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #10b981;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10002;
        font-weight: 500;
    `;
    message.textContent = '✅ ¡Reporte enviado con éxito!';
    document.body.appendChild(message);

    // Pan to location
    map.setView(latlng, Math.max(map.getZoom(), 16));

    setTimeout(() => message.remove(), 3000);
}

// ============================================================================
// LOAD & DISPLAY REPORTS
// ============================================================================

async function loadReports() {
    try {
        const response = await fetch(API_URL);
        const reports = await response.json();

        reports.forEach(report => addReportMarker(report));

        console.log(`Loaded ${reports.length} irregular parking reports`);
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

function addReportMarker(report) {
    const marker = L.marker([report.latitude, report.longitude], {
        icon: irregularParkingIcon
    });

    // Format date
    const date = new Date(report.created_at);
    const timeAgo = getTimeAgo(date);

    // Create popup
    let popup = `
        <div class="popup-title">🚗 Estacionamiento Irregular</div>
    `;

    if (report.photo_url) {
        popup += `
            <div style="margin: 8px 0;">
                <img src="${report.photo_url}" style="width: 100%; border-radius: 6px; cursor: pointer;" onclick="window.open('${report.photo_url}', '_blank')">
            </div>
        `;
    }

    if (report.comment) {
        popup += `<div class="popup-detail" style="margin-top: 8px;">${report.comment}</div>`;
    }

    popup += `<div class="popup-detail" style="margin-top: 8px; font-size: 12px; color: #888;">📅 ${timeAgo}</div>`;

    marker.bindPopup(popup);
    marker.addTo(irregularParkingLayer);
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'Hace unos segundos';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} minutos`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} horas`;
    if (seconds < 2592000) return `Hace ${Math.floor(seconds / 86400)} días`;

    return date.toLocaleDateString('es-ES');
}

// ============================================================================
// MAP INTERACTION
// ============================================================================

// Right-click / long-press handler
map.on('contextmenu', function (e) {
    createContextMenu(e.latlng);
});

// Toggle layer
document.getElementById('toggle-irregular-parking').addEventListener('change', function (e) {
    if (e.target.checked) {
        map.addLayer(irregularParkingLayer);
    } else {
        map.removeLayer(irregularParkingLayer);
    }
});

// ============================================================================
// INITIALIZE
// ============================================================================

loadReports();

console.log('✓ Irregular parking system loaded');