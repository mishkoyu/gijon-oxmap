// ============================================================================
// USER REPORTS SYSTEM
// ============================================================================

const USER_REPORTS_API = 'https://oxmap-backend.onrender.com/api/user-reports/';
const UR_CLOUDINARY_CLOUD = 'dqowkswsh';
const UR_CLOUDINARY_PRESET = 'ml_default';

const userReportsLayer = L.layerGroup();

let urCurrentLatlng = null;
let urPhotoUrl = null;

// ============================================================================
// MENU DEFINITIONS
// ============================================================================

const REPORT_MENU_OPTIONS = [
    { type: 'header', text: '📍 Reportar en este punto' },
    { type: 'divider', text: 'INCIDENCIAS' },
    { type: 'option', id: 'parking',        icon: '🚗',   text: 'Estacionamiento Irregular' },
    { type: 'option', id: 'scooter_parking',icon: '🛴',   text: 'Aparcamiento Ocupado por Patinetes' },
    { type: 'option', id: 'pothole',        icon: '🕳️',  text: 'Bache en Infraestructura' },
    { type: 'option', id: 'accident',       icon: '⚠️',  text: 'Siniestro / Accidente' },
    { type: 'option', id: 'other',          icon: '➕',   text: 'Otra Incidencia' },
    { type: 'divider', text: 'MEDICIONES' },
    { type: 'option', id: 'speed',          icon: '📊',   text: 'Velocidad de Vehículos' },
    { type: 'divider', text: 'INFRAESTRUCTURA NUEVA' },
    { type: 'option', id: 'new_bike_parking', icon: '🅿️', text: 'Aparcamiento de Bicis' },
    { type: 'option', id: 'new_bike_lane',    icon: '🛣️', text: 'Carril Bici' },
    { type: 'option', id: 'new_senda',        icon: '🌳',  text: 'Senda Ciclable' },
    { type: 'option', id: 'new_urban_furniture', icon: '🚧', text: 'Mobiliario Urbano' },
    { type: 'divider', text: 'PROPUESTAS' },
    { type: 'option', id: 'suggestion',     icon: '💡',   text: 'Sugerencia de Mejora' },
];

// ============================================================================
// CONTEXT MENU
// ============================================================================

function urGetScreenCoords(leafletEvent) {
    const oe = leafletEvent.originalEvent;
    if (oe.clientX !== undefined) return { x: oe.clientX, y: oe.clientY };
    const touch = (oe.changedTouches || oe.touches)[0];
    return { x: touch.clientX, y: touch.clientY };
}

function urRemoveMenu() {
    const existing = document.getElementById('ur-context-menu');
    if (existing) existing.remove();
}

function urShowMenu(latlng, leafletEvent) {
    urRemoveMenu();
    urCurrentLatlng = latlng;

    const menu = document.createElement('div');
    menu.id = 'ur-context-menu';

    REPORT_MENU_OPTIONS.forEach(item => {
        if (item.type === 'header') {
            const el = document.createElement('div');
            el.className = 'ur-menu-header';
            el.textContent = item.text;
            menu.appendChild(el);
        } else if (item.type === 'divider') {
            const el = document.createElement('div');
            el.className = 'ur-menu-divider';
            el.textContent = item.text;
            menu.appendChild(el);
        } else {
            const btn = document.createElement('button');
            btn.className = 'ur-menu-option';
            btn.innerHTML = `<span class="ur-menu-icon">${item.icon}</span><span>${item.text}</span>`;
            btn.addEventListener('click', () => {
                urRemoveMenu();
                urHandleOption(item.id, latlng);
            });
            menu.appendChild(btn);
        }
    });

    document.body.appendChild(menu);

    // Position near click, clamped to viewport
    const coords = urGetScreenCoords(leafletEvent);
    const pad = 10;
    const mw = 275;
    const mh = menu.offsetHeight || 400;

    let left = coords.x + pad;
    let top  = coords.y + pad;
    if (left + mw  > window.innerWidth  - pad) left = coords.x - mw - pad;
    if (top  + mh  > window.innerHeight - pad) top  = window.innerHeight - mh - pad;
    left = Math.max(pad, left);
    top  = Math.max(pad, top);

    menu.style.left = left + 'px';
    menu.style.top  = top  + 'px';

    // Close when clicking outside
    setTimeout(() => {
        document.addEventListener('click', urRemoveMenu, { once: true });
        map.once('click', urRemoveMenu);
    }, 0);

    // Close on Escape
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') { urRemoveMenu(); document.removeEventListener('keydown', escHandler); }
    });
}

function urHandleOption(id, latlng) {
    if (id === 'other') {
        urOpenOtherForm(latlng);
    } else {
        urShowToast('🚧 Esta función estará disponible próximamente');
    }
}

// ============================================================================
// TOAST NOTIFICATION
// ============================================================================

function urShowToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'ur-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('ur-toast-visible'));
    setTimeout(() => {
        toast.classList.remove('ur-toast-visible');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================================
// "OTRA INCIDENCIA" FORM
// ============================================================================

function urOpenOtherForm(latlng) {
    urCloseForm();
    urPhotoUrl = null;

    const overlay = document.createElement('div');
    overlay.id = 'ur-form-overlay';

    overlay.innerHTML = `
        <div class="ur-form-modal">
            <button class="ur-form-close" id="ur-close-btn" title="Cerrar">×</button>

            <h2 class="ur-form-title">➕ Otra Incidencia</h2>
            <p class="ur-form-subtitle">Reporta problemas de infraestructura ciclista</p>

            <div class="ur-form-field">
                <label class="ur-label">📍 Ubicación</label>
                <input type="text" value="${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}" readonly class="ur-input ur-input-readonly">
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-category">📋 Categoría <span class="ur-required">*</span></label>
                <select id="ur-category" class="ur-input">
                    <option value="">Selecciona una categoría</option>
                    <option value="señalización">Señalización (falta o deteriorada)</option>
                    <option value="iluminación">Iluminación (falta o no funciona)</option>
                    <option value="obstáculo">Obstáculo en vía ciclista</option>
                    <option value="vandalismo">Vandalismo</option>
                    <option value="mantenimiento">Mantenimiento necesario</option>
                    <option value="otro">Otro</option>
                </select>
            </div>

            <div class="ur-form-field">
                <label class="ur-label">📷 Foto (opcional)</label>
                <input type="file" id="ur-photo-input" accept="image/*" capture="environment" style="display:none">
                <div id="ur-photo-area">
                    <button type="button" id="ur-photo-btn" class="ur-photo-trigger">📸 Añadir foto</button>
                </div>
                <div id="ur-photo-preview" style="display:none">
                    <img id="ur-preview-img" style="width:100%;border-radius:8px;margin-top:8px;max-height:180px;object-fit:cover">
                    <button type="button" id="ur-change-photo-btn" class="ur-link-btn">🔄 Cambiar foto</button>
                </div>
                <div id="ur-upload-status" style="display:none;font-size:13px;color:#6b7280;margin-top:6px">⏳ Subiendo foto...</div>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-comment">📝 Descripción <span class="ur-required">*</span></label>
                <textarea id="ur-comment" maxlength="1000" rows="4"
                    placeholder="Describe el problema con detalle..." class="ur-input ur-textarea"></textarea>
                <div class="ur-char-count"><span id="ur-char-count">0</span>/1000</div>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-email">📧 Email (opcional)</label>
                <input type="email" id="ur-email" placeholder="tu@email.com" class="ur-input">
                <div class="ur-checkbox-row">
                    <input type="checkbox" id="ur-wants-updates">
                    <label for="ur-wants-updates">Quiero recibir actualizaciones sobre este reporte</label>
                </div>
                <p class="ur-help-text">No compartiremos tu email con terceros.</p>
            </div>

            <div id="ur-error" class="ur-error-msg" style="display:none"></div>

            <div class="ur-form-actions">
                <button type="button" id="ur-cancel-btn" class="ur-btn-secondary">Cancelar</button>
                <button type="button" id="ur-submit-btn" class="ur-btn-primary">Enviar Reporte</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Close handlers
    document.getElementById('ur-close-btn').addEventListener('click', urCloseForm);
    document.getElementById('ur-cancel-btn').addEventListener('click', urCloseForm);
    overlay.addEventListener('click', e => { if (e.target === overlay) urCloseForm(); });

    document.addEventListener('keydown', function escForm(e) {
        if (e.key === 'Escape') { urCloseForm(); document.removeEventListener('keydown', escForm); }
    });

    // Photo upload
    const photoInput = document.getElementById('ur-photo-input');
    document.getElementById('ur-photo-btn').addEventListener('click', () => photoInput.click());
    document.getElementById('ur-change-photo-btn').addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', urHandlePhotoSelect);

    // Char counter
    document.getElementById('ur-comment').addEventListener('input', function () {
        document.getElementById('ur-char-count').textContent = this.value.length;
    });

    // Submit
    document.getElementById('ur-submit-btn').addEventListener('click', () => urSubmitOtherForm(latlng));
}

function urCloseForm() {
    const overlay = document.getElementById('ur-form-overlay');
    if (overlay) overlay.remove();
    urPhotoUrl = null;
}

async function urHandlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
        urShowError('La foto no puede superar los 10MB');
        return;
    }

    const status = document.getElementById('ur-upload-status');
    const photoBtn = document.getElementById('ur-photo-btn');
    status.style.display = 'block';
    photoBtn.disabled = true;

    try {
        urPhotoUrl = await urUploadToCloudinary(file);
        document.getElementById('ur-preview-img').src = urPhotoUrl;
        document.getElementById('ur-photo-area').style.display = 'none';
        document.getElementById('ur-photo-preview').style.display = 'block';
    } catch {
        urShowError('Error al subir la foto. Inténtalo de nuevo.');
    } finally {
        status.style.display = 'none';
        photoBtn.disabled = false;
    }
}

async function urUploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UR_CLOUDINARY_PRESET);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${UR_CLOUDINARY_CLOUD}/image/upload`,
        { method: 'POST', body: formData }
    );
    const data = await res.json();
    if (!data.secure_url) throw new Error('Upload failed');
    return data.secure_url;
}

async function urSubmitOtherForm(latlng) {
    const category    = document.getElementById('ur-category').value;
    const comment     = document.getElementById('ur-comment').value.trim();
    const email       = document.getElementById('ur-email').value.trim();
    const wantsUpdates = document.getElementById('ur-wants-updates').checked;

    if (!category) { urShowError('Por favor selecciona una categoría'); return; }
    if (!comment)  { urShowError('Por favor describe el problema'); return; }
    if (comment.length > 1000) { urShowError('La descripción no puede superar los 1000 caracteres'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        urShowError('Por favor introduce un email válido');
        return;
    }

    urHideError();

    const submitBtn = document.getElementById('ur-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    const payload = {
        report_type: 'other',
        latitude:  parseFloat(latlng.lat.toFixed(6)),
        longitude: parseFloat(latlng.lng.toFixed(6)),
        comment,
        email: email || null,
        wants_updates: wantsUpdates,
        type_specific_data: { category },
    };
    if (urPhotoUrl) payload.photo_url = urPhotoUrl;

    try {
        const res = await fetch(USER_REPORTS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(urParseApiError(data));

        urCloseForm();
        urAddReportMarker(data);

        // Make sure the layer is on the map so the new marker is visible
        if (!map.hasLayer(userReportsLayer)) {
            map.addLayer(userReportsLayer);
            const toggle = document.getElementById('toggle-user-reports');
            if (toggle) toggle.checked = true;
        }

        urShowToast('✅ Reporte enviado. ¡Gracias por tu contribución!');
    } catch (err) {
        urShowError(err.message || 'Error al enviar el reporte. Inténtalo de nuevo.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Reporte';
    }
}

function urParseApiError(data) {
    if (data.error)  return data.error;
    if (data.detail) return data.detail;
    const msgs = Object.values(data).flat().filter(v => typeof v === 'string');
    return msgs.length ? msgs.join(' ') : 'Error desconocido';
}

function urShowError(msg) {
    const el = document.getElementById('ur-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function urHideError() {
    const el = document.getElementById('ur-error');
    if (el) el.style.display = 'none';
}

// ============================================================================
// MAP MARKERS & POPUPS
// ============================================================================

const UR_TYPE_CONFIG = {
    other:              { icon: '➕', color: '#8b5cf6', label: 'Otra Incidencia' },
    parking:            { icon: '🚗', color: '#ef4444', label: 'Estacionamiento Irregular' },
    scooter_parking:    { icon: '🛴', color: '#f97316', label: 'Aparcamiento de Patinetes' },
    pothole:            { icon: '🕳️', color: '#92400e', label: 'Bache' },
    accident:           { icon: '⚠️', color: '#dc2626', label: 'Siniestro' },
    speed:              { icon: '📊', color: '#d97706', label: 'Velocidad de Vehículos' },
    suggestion:         { icon: '💡', color: '#10b981', label: 'Sugerencia' },
    new_bike_parking:   { icon: '🅿️', color: '#3b82f6', label: 'Aparcamiento de Bicis' },
    new_bike_lane:      { icon: '🛣️', color: '#2563eb', label: 'Carril Bici' },
    new_senda:          { icon: '🌳', color: '#059669', label: 'Senda Ciclable' },
    new_urban_furniture:{ icon: '🚧', color: '#7c3aed', label: 'Mobiliario Urbano' },
};

function urAddReportMarker(report) {
    const cfg = UR_TYPE_CONFIG[report.report_type] || UR_TYPE_CONFIG.other;

    const icon = L.divIcon({
        html: `<div class="ur-marker" style="background:${cfg.color}">${cfg.icon}</div>`,
        className: 'ur-marker-wrapper',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20],
    });

    const marker = L.marker([report.latitude, report.longitude], { icon });

    const category = (report.type_specific_data && report.type_specific_data.category) || '';
    const timeAgo  = urTimeAgo(new Date(report.created_at));
    const statusTxt = urStatusText(report.status);

    let popup = `<div class="ur-popup">
        <div class="ur-popup-title">${cfg.icon} ${cfg.label}</div>`;

    if (category) {
        popup += `<div class="ur-popup-category">${category}</div>`;
    }
    if (report.photo_url) {
        popup += `<div class="ur-popup-photo">
            <img src="${report.photo_url}" onclick="window.open('${report.photo_url}','_blank')">
        </div>`;
    }
    if (report.comment) {
        popup += `<div class="ur-popup-comment">${report.comment}</div>`;
    }
    popup += `<div class="ur-popup-meta">
        <span class="ur-status ur-status-${report.status}">${statusTxt}</span>
        <span class="ur-timestamp">📅 ${timeAgo}</span>
    </div></div>`;

    marker.bindPopup(popup);
    marker.addTo(userReportsLayer);
}

function urStatusText(status) {
    return { pending: 'Pendiente', verified: 'Verificado', in_progress: 'En progreso',
             resolved: 'Resuelto', rejected: 'Rechazado' }[status] || status;
}

function urTimeAgo(date) {
    const s = Math.floor((new Date() - date) / 1000);
    if (s < 60)    return 'Hace unos segundos';
    if (s < 3600)  return `Hace ${Math.floor(s / 60)} minutos`;
    if (s < 86400) return `Hace ${Math.floor(s / 3600)} horas`;
    if (s < 2592000) return `Hace ${Math.floor(s / 86400)} días`;
    return date.toLocaleDateString('es-ES');
}

// ============================================================================
// LOAD REPORTS FROM API
// ============================================================================

async function loadUserReports() {
    try {
        const res = await fetch(USER_REPORTS_API);
        const reports = await res.json();
        reports.forEach(r => urAddReportMarker(r));
        console.log(`✓ ${reports.length} user reports loaded`);
    } catch (err) {
        console.error('Error loading user reports:', err);
    }
}

// ============================================================================
// LAYER TOGGLE
// ============================================================================

document.getElementById('toggle-user-reports').addEventListener('change', e => {
    if (e.target.checked) {
        map.addLayer(userReportsLayer);
    } else {
        map.removeLayer(userReportsLayer);
    }
});

// ============================================================================
// INITIALIZE — replace old contextmenu handler with unified report menu
// ============================================================================

map.off('contextmenu');
map.on('contextmenu', e => urShowMenu(e.latlng, e));

loadUserReports();

console.log('✓ User reports system loaded');
