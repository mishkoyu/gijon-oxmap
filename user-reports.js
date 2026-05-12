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
    if      (id === 'parking')         { urOpenParkingForm(latlng); }
    else if (id === 'scooter_parking') { urOpenScooterParkingForm(latlng); }
    else if (id === 'pothole')         { urOpenPotholeForm(latlng); }
    else if (id === 'accident')        { urOpenAccidentForm(latlng); }
    else if (id === 'other')           { urOpenOtherForm(latlng); }
    else if (id === 'speed')           { urOpenSpeedForm(latlng); }
    else if (id === 'suggestion')      { urOpenSuggestionForm(latlng); }
    else { urShowToast('🚧 Esta función estará disponible próximamente'); }
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

// ============================================================================
// SHARED SUBMIT HELPER
// ============================================================================

async function urDoSubmit(payload, submitBtn) {
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

// ============================================================================
// ESTACIONAMIENTO IRREGULAR FORM
// ============================================================================

function urOpenParkingForm(latlng) {
    urCloseForm();
    urPhotoUrl = null;

    const overlay = document.createElement('div');
    overlay.id = 'ur-form-overlay';

    overlay.innerHTML = `
        <div class="ur-form-modal">
            <button class="ur-form-close" id="ur-close-btn" title="Cerrar">×</button>
            <h2 class="ur-form-title">🚗 Estacionamiento Irregular</h2>
            <p class="ur-form-subtitle">Documenta vehículos estacionados ilegalmente en infraestructura ciclista o peatonal</p>

            <div class="ur-form-field">
                <label class="ur-label">📍 Ubicación</label>
                <input type="text" value="${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}" readonly class="ur-input ur-input-readonly">
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-blocking-type">🚧 Qué está bloqueando <span class="ur-required">*</span></label>
                <select id="ur-blocking-type" class="ur-input">
                    <option value="">Selecciona...</option>
                    <option value="carril bici">Carril bici</option>
                    <option value="senda ciclable">Senda ciclable</option>
                    <option value="paso de peatones">Paso de peatones</option>
                    <option value="acera">Acera</option>
                    <option value="otro">Otro</option>
                </select>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-duration">⏱️ Tiempo de estacionamiento <span class="ur-required">*</span></label>
                <select id="ur-duration" class="ur-input">
                    <option value="">Selecciona...</option>
                    <option value="menos de 5 minutos">Menos de 5 minutos</option>
                    <option value="5 a 30 minutos">5 a 30 minutos</option>
                    <option value="más de 30 minutos">Más de 30 minutos</option>
                </select>
            </div>

            <div class="ur-form-field">
                <label class="ur-label">🔢 Matrícula visible <span class="ur-required">*</span></label>
                <div class="ur-radio-group">
                    <label><input type="radio" name="ur-plate" value="sí"> Sí</label>
                    <label><input type="radio" name="ur-plate" value="parcialmente"> Parcialmente</label>
                    <label><input type="radio" name="ur-plate" value="no"> No</label>
                </div>
            </div>

            <div class="ur-form-field">
                <label class="ur-label">📷 Foto <span class="ur-required">*</span></label>
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
                <label class="ur-label" for="ur-comment">📝 Comentario (opcional)</label>
                <textarea id="ur-comment" maxlength="500" rows="3"
                    placeholder="Información adicional..." class="ur-input ur-textarea"></textarea>
                <div class="ur-char-count"><span id="ur-char-count">0</span>/500</div>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-email">📧 Email (opcional)</label>
                <input type="email" id="ur-email" placeholder="tu@email.com" class="ur-input">
                <div class="ur-checkbox-row">
                    <input type="checkbox" id="ur-wants-updates">
                    <label for="ur-wants-updates">Quiero recibir actualizaciones</label>
                </div>
            </div>

            <div id="ur-error" class="ur-error-msg" style="display:none"></div>

            <div class="ur-form-actions">
                <button type="button" id="ur-cancel-btn" class="ur-btn-secondary">Cancelar</button>
                <button type="button" id="ur-submit-btn" class="ur-btn-primary">Enviar Reporte</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('ur-close-btn').addEventListener('click', urCloseForm);
    document.getElementById('ur-cancel-btn').addEventListener('click', urCloseForm);
    overlay.addEventListener('click', e => { if (e.target === overlay) urCloseForm(); });
    document.addEventListener('keydown', function escForm(e) {
        if (e.key === 'Escape') { urCloseForm(); document.removeEventListener('keydown', escForm); }
    });

    const photoInput = document.getElementById('ur-photo-input');
    document.getElementById('ur-photo-btn').addEventListener('click', () => photoInput.click());
    document.getElementById('ur-change-photo-btn').addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', urHandlePhotoSelect);

    document.getElementById('ur-comment').addEventListener('input', function () {
        document.getElementById('ur-char-count').textContent = this.value.length;
    });

    document.getElementById('ur-submit-btn').addEventListener('click', () => urSubmitParkingForm(latlng));
}

async function urSubmitParkingForm(latlng) {
    const blockingType = document.getElementById('ur-blocking-type').value;
    const duration     = document.getElementById('ur-duration').value;
    const plateEl      = document.querySelector('input[name="ur-plate"]:checked');
    const comment      = document.getElementById('ur-comment').value.trim();
    const email        = document.getElementById('ur-email').value.trim();
    const wantsUpdates = document.getElementById('ur-wants-updates').checked;

    if (!blockingType) { urShowError('Por favor indica qué está bloqueando'); return; }
    if (!duration)     { urShowError('Por favor indica el tiempo de estacionamiento'); return; }
    if (!plateEl)      { urShowError('Por favor indica si la matrícula es visible'); return; }
    if (!urPhotoUrl)   { urShowError('La foto es obligatoria para este tipo de reporte'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { urShowError('Por favor introduce un email válido'); return; }

    urHideError();
    const submitBtn = document.getElementById('ur-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    await urDoSubmit({
        report_type: 'parking',
        latitude:  parseFloat(latlng.lat.toFixed(6)),
        longitude: parseFloat(latlng.lng.toFixed(6)),
        photo_url: urPhotoUrl,
        comment,
        email: email || null,
        wants_updates: wantsUpdates,
        type_specific_data: { blocking_type: blockingType, duration, plate_visible: plateEl.value },
    }, submitBtn);
}

// ============================================================================
// APARCAMIENTO OCUPADO POR PATINETES FORM
// ============================================================================

function urOpenScooterParkingForm(latlng) {
    urCloseForm();
    urPhotoUrl = null;

    const overlay = document.createElement('div');
    overlay.id = 'ur-form-overlay';

    overlay.innerHTML = `
        <div class="ur-form-modal">
            <button class="ur-form-close" id="ur-close-btn" title="Cerrar">×</button>
            <h2 class="ur-form-title">🛴 Aparcamiento Ocupado por Patinetes</h2>
            <p class="ur-form-subtitle">Reporta patinetes eléctricos mal estacionados en infraestructura ciclista</p>

            <div class="ur-form-field">
                <label class="ur-label">📍 Ubicación</label>
                <input type="text" value="${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}" readonly class="ur-input ur-input-readonly">
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-company">🏢 Empresa <span class="ur-required">*</span></label>
                <select id="ur-company" class="ur-input">
                    <option value="">Selecciona...</option>
                    <option value="Bird">Bird</option>
                    <option value="Lime">Lime</option>
                    <option value="Tier">Tier</option>
                    <option value="Bolt">Bolt</option>
                    <option value="VOI">VOI</option>
                    <option value="desconocida">Desconocida</option>
                    <option value="otra">Otra</option>
                </select>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-scooter-count">🔢 Número de patinetes <span class="ur-required">*</span></label>
                <input type="number" id="ur-scooter-count" min="1" max="50" placeholder="1" class="ur-input">
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-parking-capacity">🅿️ Tipo de aparcamiento ocupado <span class="ur-required">*</span></label>
                <select id="ur-parking-capacity" class="ur-input">
                    <option value="">Selecciona...</option>
                    <option value="aparcamiento de bicis">Aparcamiento de bicis</option>
                    <option value="aparcamiento para motos">Aparcamiento para motos</option>
                    <option value="sin aparcamiento habilitado">Sin aparcamiento habilitado</option>
                    <option value="otro">Otro</option>
                </select>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-frequency">🔄 Frecuencia del problema <span class="ur-required">*</span></label>
                <select id="ur-frequency" class="ur-input">
                    <option value="">Selecciona...</option>
                    <option value="primera vez">Primera vez que lo veo</option>
                    <option value="ocasional">Ocasional</option>
                    <option value="habitual">Habitual</option>
                </select>
            </div>

            <div class="ur-form-field">
                <label class="ur-label">📷 Foto <span class="ur-required">*</span></label>
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
                <label class="ur-label" for="ur-comment">📝 Comentario (opcional)</label>
                <textarea id="ur-comment" maxlength="500" rows="3"
                    placeholder="Información adicional..." class="ur-input ur-textarea"></textarea>
                <div class="ur-char-count"><span id="ur-char-count">0</span>/500</div>
            </div>

            <div id="ur-error" class="ur-error-msg" style="display:none"></div>

            <div class="ur-form-actions">
                <button type="button" id="ur-cancel-btn" class="ur-btn-secondary">Cancelar</button>
                <button type="button" id="ur-submit-btn" class="ur-btn-primary">Enviar Reporte</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('ur-close-btn').addEventListener('click', urCloseForm);
    document.getElementById('ur-cancel-btn').addEventListener('click', urCloseForm);
    overlay.addEventListener('click', e => { if (e.target === overlay) urCloseForm(); });
    document.addEventListener('keydown', function escForm(e) {
        if (e.key === 'Escape') { urCloseForm(); document.removeEventListener('keydown', escForm); }
    });

    const photoInput = document.getElementById('ur-photo-input');
    document.getElementById('ur-photo-btn').addEventListener('click', () => photoInput.click());
    document.getElementById('ur-change-photo-btn').addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', urHandlePhotoSelect);

    document.getElementById('ur-comment').addEventListener('input', function () {
        document.getElementById('ur-char-count').textContent = this.value.length;
    });

    document.getElementById('ur-submit-btn').addEventListener('click', () => urSubmitScooterParkingForm(latlng));
}

async function urSubmitScooterParkingForm(latlng) {
    const company         = document.getElementById('ur-company').value;
    const scooterCountEl  = document.getElementById('ur-scooter-count');
    const scooterCount    = parseInt(scooterCountEl.value, 10);
    const parkingCapacity = document.getElementById('ur-parking-capacity').value;
    const frequency       = document.getElementById('ur-frequency').value;
    const comment         = document.getElementById('ur-comment').value.trim();

    if (!company)         { urShowError('Por favor indica la empresa'); return; }
    if (!scooterCountEl.value || isNaN(scooterCount) || scooterCount < 1 || scooterCount > 50) {
        urShowError('Por favor indica el número de patinetes (entre 1 y 50)'); return;
    }
    if (!parkingCapacity) { urShowError('Por favor indica el tipo de aparcamiento'); return; }
    if (!frequency)       { urShowError('Por favor indica la frecuencia del problema'); return; }
    if (!urPhotoUrl)      { urShowError('La foto es obligatoria para este tipo de reporte'); return; }

    urHideError();
    const submitBtn = document.getElementById('ur-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    await urDoSubmit({
        report_type: 'scooter_parking',
        latitude:  parseFloat(latlng.lat.toFixed(6)),
        longitude: parseFloat(latlng.lng.toFixed(6)),
        photo_url: urPhotoUrl,
        comment,
        type_specific_data: { company, scooter_count: scooterCount, parking_capacity: parkingCapacity, frequency },
    }, submitBtn);
}

// ============================================================================
// BACHE EN INFRAESTRUCTURA FORM
// ============================================================================

function urOpenPotholeForm(latlng) {
    urCloseForm();
    urPhotoUrl = null;

    const overlay = document.createElement('div');
    overlay.id = 'ur-form-overlay';

    overlay.innerHTML = `
        <div class="ur-form-modal">
            <button class="ur-form-close" id="ur-close-btn" title="Cerrar">×</button>
            <h2 class="ur-form-title">🕳️ Bache en Infraestructura</h2>
            <p class="ur-form-subtitle">Reporta baches o deterioro del pavimento en infraestructura ciclista o peatonal</p>

            <div class="ur-form-field">
                <label class="ur-label">📍 Ubicación</label>
                <input type="text" value="${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}" readonly class="ur-input ur-input-readonly">
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-surface">🛤️ Tipo de infraestructura <span class="ur-required">*</span></label>
                <select id="ur-surface" class="ur-input">
                    <option value="">Selecciona...</option>
                    <option value="carril bici">Carril bici</option>
                    <option value="senda ciclable">Senda ciclable</option>
                    <option value="calzada">Calzada</option>
                    <option value="acera">Acera</option>
                    <option value="otro">Otro</option>
                </select>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-severity">⚠️ Gravedad <span class="ur-required">*</span></label>
                <select id="ur-severity" class="ur-input">
                    <option value="">Selecciona...</option>
                    <option value="leve">Leve (incomodidad menor)</option>
                    <option value="moderado">Moderado (riesgo de caída)</option>
                    <option value="grave">Grave (peligroso)</option>
                    <option value="muy grave">Muy grave (hace la vía intransitable)</option>
                </select>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-width">📏 Tamaño aproximado <span class="ur-required">*</span></label>
                <select id="ur-width" class="ur-input">
                    <option value="">Selecciona...</option>
                    <option value="menos de 20cm">Menos de 20 cm</option>
                    <option value="20 a 50cm">20 a 50 cm</option>
                    <option value="más de 50cm">Más de 50 cm</option>
                </select>
            </div>

            <div class="ur-form-field">
                <label class="ur-label">📷 Foto <span class="ur-required">*</span></label>
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
                <label class="ur-label" for="ur-comment">📝 Comentario (opcional)</label>
                <textarea id="ur-comment" maxlength="500" rows="3"
                    placeholder="Información adicional..." class="ur-input ur-textarea"></textarea>
                <div class="ur-char-count"><span id="ur-char-count">0</span>/500</div>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-email">📧 Email (opcional)</label>
                <input type="email" id="ur-email" placeholder="tu@email.com" class="ur-input">
                <div class="ur-checkbox-row">
                    <input type="checkbox" id="ur-wants-updates">
                    <label for="ur-wants-updates">Quiero recibir actualizaciones</label>
                </div>
            </div>

            <div id="ur-error" class="ur-error-msg" style="display:none"></div>

            <div class="ur-form-actions">
                <button type="button" id="ur-cancel-btn" class="ur-btn-secondary">Cancelar</button>
                <button type="button" id="ur-submit-btn" class="ur-btn-primary">Enviar Reporte</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('ur-close-btn').addEventListener('click', urCloseForm);
    document.getElementById('ur-cancel-btn').addEventListener('click', urCloseForm);
    overlay.addEventListener('click', e => { if (e.target === overlay) urCloseForm(); });
    document.addEventListener('keydown', function escForm(e) {
        if (e.key === 'Escape') { urCloseForm(); document.removeEventListener('keydown', escForm); }
    });

    const photoInput = document.getElementById('ur-photo-input');
    document.getElementById('ur-photo-btn').addEventListener('click', () => photoInput.click());
    document.getElementById('ur-change-photo-btn').addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', urHandlePhotoSelect);

    document.getElementById('ur-comment').addEventListener('input', function () {
        document.getElementById('ur-char-count').textContent = this.value.length;
    });

    document.getElementById('ur-submit-btn').addEventListener('click', () => urSubmitPotholeForm(latlng));
}

async function urSubmitPotholeForm(latlng) {
    const surface      = document.getElementById('ur-surface').value;
    const severity     = document.getElementById('ur-severity').value;
    const width        = document.getElementById('ur-width').value;
    const comment      = document.getElementById('ur-comment').value.trim();
    const email        = document.getElementById('ur-email').value.trim();
    const wantsUpdates = document.getElementById('ur-wants-updates').checked;

    if (!surface)    { urShowError('Por favor indica el tipo de infraestructura'); return; }
    if (!severity)   { urShowError('Por favor indica la gravedad'); return; }
    if (!width)      { urShowError('Por favor indica el tamaño aproximado'); return; }
    if (!urPhotoUrl) { urShowError('La foto es obligatoria para este tipo de reporte'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { urShowError('Por favor introduce un email válido'); return; }

    urHideError();
    const submitBtn = document.getElementById('ur-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    await urDoSubmit({
        report_type: 'pothole',
        latitude:  parseFloat(latlng.lat.toFixed(6)),
        longitude: parseFloat(latlng.lng.toFixed(6)),
        photo_url: urPhotoUrl,
        comment,
        email: email || null,
        wants_updates: wantsUpdates,
        type_specific_data: { surface, severity, width },
    }, submitBtn);
}

// ============================================================================
// SINIESTRO / ACCIDENTE FORM
// ============================================================================

function urOpenAccidentForm(latlng) {
    urCloseForm();

    const today = new Date().toISOString().split('T')[0];
    const overlay = document.createElement('div');
    overlay.id = 'ur-form-overlay';

    overlay.innerHTML = `
        <div class="ur-form-modal">
            <button class="ur-form-close" id="ur-close-btn" title="Cerrar">×</button>
            <h2 class="ur-form-title">⚠️ Siniestro / Accidente</h2>
            <p class="ur-form-subtitle">Documenta siniestros viales que afecten a ciclistas o peatones</p>

            <div class="ur-warning-box">
                📍 La ubicación exacta no será pública para proteger la privacidad de las personas involucradas.
            </div>

            <div class="ur-form-field">
                <label class="ur-label">📍 Ubicación (aproximada)</label>
                <input type="text" value="${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}" readonly class="ur-input ur-input-readonly">
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-date">📅 Fecha del siniestro <span class="ur-required">*</span></label>
                <input type="date" id="ur-date" max="${today}" class="ur-input">
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-time">🕐 Hora aproximada (opcional)</label>
                <input type="time" id="ur-time" class="ur-input">
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-severity">🩺 Gravedad <span class="ur-required">*</span></label>
                <select id="ur-severity" class="ur-input">
                    <option value="">Selecciona...</option>
                    <option value="solo daños materiales">Solo daños materiales</option>
                    <option value="heridos leves">Heridos leves</option>
                    <option value="heridos graves">Heridos graves</option>
                    <option value="víctima mortal">Víctima mortal</option>
                </select>
            </div>

            <div class="ur-form-field">
                <label class="ur-label">🚗 Vehículos implicados <span class="ur-required">*</span></label>
                <div class="ur-checkbox-group">
                    <label><input type="checkbox" name="ur-vehicle" value="bicicleta"> Bicicleta</label>
                    <label><input type="checkbox" name="ur-vehicle" value="patinete"> Patinete</label>
                    <label><input type="checkbox" name="ur-vehicle" value="coche"> Coche / Turismo</label>
                    <label><input type="checkbox" name="ur-vehicle" value="motocicleta"> Motocicleta</label>
                    <label><input type="checkbox" name="ur-vehicle" value="autobús"> Autobús / Camión</label>
                    <label><input type="checkbox" name="ur-vehicle" value="peatón"> Peatón</label>
                    <label><input type="checkbox" name="ur-vehicle" value="otro"> Otro</label>
                </div>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-news-link">📰 Enlace a noticia (opcional)</label>
                <input type="url" id="ur-news-link" placeholder="https://..." class="ur-input">
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-description">📝 Descripción <span class="ur-required">*</span></label>
                <textarea id="ur-description" maxlength="1000" rows="4"
                    placeholder="Describe lo ocurrido con el máximo detalle posible..." class="ur-input ur-textarea"></textarea>
                <div class="ur-char-count"><span id="ur-char-count">0</span>/1000</div>
            </div>

            <div id="ur-error" class="ur-error-msg" style="display:none"></div>

            <div class="ur-form-actions">
                <button type="button" id="ur-cancel-btn" class="ur-btn-secondary">Cancelar</button>
                <button type="button" id="ur-submit-btn" class="ur-btn-primary">Enviar Reporte</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('ur-close-btn').addEventListener('click', urCloseForm);
    document.getElementById('ur-cancel-btn').addEventListener('click', urCloseForm);
    overlay.addEventListener('click', e => { if (e.target === overlay) urCloseForm(); });
    document.addEventListener('keydown', function escForm(e) {
        if (e.key === 'Escape') { urCloseForm(); document.removeEventListener('keydown', escForm); }
    });

    document.getElementById('ur-description').addEventListener('input', function () {
        document.getElementById('ur-char-count').textContent = this.value.length;
    });

    document.getElementById('ur-submit-btn').addEventListener('click', () => urSubmitAccidentForm(latlng));
}

async function urSubmitAccidentForm(latlng) {
    const date        = document.getElementById('ur-date').value;
    const time        = document.getElementById('ur-time').value;
    const severity    = document.getElementById('ur-severity').value;
    const vehicles    = [...document.querySelectorAll('input[name="ur-vehicle"]:checked')].map(el => el.value);
    const newsLink    = document.getElementById('ur-news-link').value.trim();
    const description = document.getElementById('ur-description').value.trim();

    if (!date)            { urShowError('Por favor indica la fecha del siniestro'); return; }
    if (!severity)        { urShowError('Por favor indica la gravedad'); return; }
    if (!vehicles.length) { urShowError('Por favor selecciona al menos un vehículo implicado'); return; }
    if (newsLink && !/^https?:\/\/.+/.test(newsLink)) { urShowError('El enlace debe ser una URL válida (https://...)'); return; }
    if (!description)     { urShowError('Por favor describe el siniestro'); return; }

    urHideError();
    const submitBtn = document.getElementById('ur-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    const typeData = { date, severity, vehicles };
    if (time)     typeData.time = time;
    if (newsLink) typeData.news_link = newsLink;

    await urDoSubmit({
        report_type: 'accident',
        latitude:  parseFloat(latlng.lat.toFixed(6)),
        longitude: parseFloat(latlng.lng.toFixed(6)),
        comment: description,
        type_specific_data: typeData,
    }, submitBtn);
}

// ============================================================================
// VELOCIDAD DE VEHÍCULOS FORM
// ============================================================================

function urOpenSpeedForm(latlng) {
    urCloseForm();
    urPhotoUrl = null;

    const now = new Date();
    const hour = now.getHours();
    let timeOfDay = 'noche';
    if      (hour >= 6  && hour < 12) timeOfDay = 'mañana';
    else if (hour >= 12 && hour < 14) timeOfDay = 'mediodia';
    else if (hour >= 14 && hour < 20) timeOfDay = 'tarde';
    const exactTime = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const overlay = document.createElement('div');
    overlay.id = 'ur-form-overlay';

    overlay.innerHTML = `
        <div class="ur-form-modal">
            <button class="ur-form-close" id="ur-close-btn" title="Cerrar">×</button>
            <h2 class="ur-form-title">📊 Velocidad de Vehículos</h2>
            <p class="ur-form-subtitle">Reporte de exceso de velocidad en infraestructura ciclista o peatonal</p>

            <div class="ur-form-field">
                <label class="ur-label">📍 Ubicación</label>
                <input type="text" value="${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}" readonly class="ur-input ur-input-readonly">
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-observed-speed">🚗 Velocidad observada (km/h) <span class="ur-required">*</span></label>
                <input type="number" id="ur-observed-speed" min="1" max="200" placeholder="Ej: 58" class="ur-input">
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-speed-limit">🚦 Límite de velocidad (km/h)</label>
                <input type="number" id="ur-speed-limit" min="0" max="120" placeholder="Ej: 30" class="ur-input">
                <div class="ur-checkbox-row" style="margin-top:8px">
                    <input type="checkbox" id="ur-no-limit">
                    <label for="ur-no-limit">No hay límite visible</label>
                </div>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-measurement-type">📱 Medición con <span class="ur-required">*</span></label>
                <select id="ur-measurement-type" class="ur-input">
                    <option value="">Selecciona...</option>
                    <option value="dispositivo">Dispositivo (radar/GPS/app)</option>
                    <option value="estimación visual">Estimación visual</option>
                </select>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-vehicle-type">🚘 Tipo de vehículo <span class="ur-required">*</span></label>
                <select id="ur-vehicle-type" class="ur-input">
                    <option value="">Selecciona...</option>
                    <option value="coche">Coche</option>
                    <option value="moto">Moto</option>
                    <option value="camión">Camión</option>
                    <option value="autobús">Autobús</option>
                </select>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-time-of-day">🕐 Momento del día</label>
                <select id="ur-time-of-day" class="ur-input">
                    <option value="">Selecciona...</option>
                    <option value="mañana">Mañana (6-12h)</option>
                    <option value="mediodia">Mediodía (12-14h)</option>
                    <option value="tarde">Tarde (14-20h)</option>
                    <option value="noche">Noche (20-6h)</option>
                </select>
                <p class="ur-help-text">Auto-detectado: ${exactTime}</p>
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
                <p class="ur-help-text">Foto de la calle o las condiciones del tráfico</p>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-comment">💬 Comentario adicional (opcional)</label>
                <textarea id="ur-comment" maxlength="1000" rows="3"
                    placeholder="Ej: Calle residencial con niños jugando, zona escolar" class="ur-input ur-textarea"></textarea>
                <div class="ur-char-count"><span id="ur-char-count">0</span>/1000</div>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-email">📧 Email (opcional)</label>
                <input type="email" id="ur-email" placeholder="tu@email.com" class="ur-input">
                <div class="ur-checkbox-row">
                    <input type="checkbox" id="ur-wants-updates">
                    <label for="ur-wants-updates">Quiero recibir actualizaciones</label>
                </div>
            </div>

            <div id="ur-error" class="ur-error-msg" style="display:none"></div>

            <div class="ur-form-actions">
                <button type="button" id="ur-cancel-btn" class="ur-btn-secondary">Cancelar</button>
                <button type="button" id="ur-submit-btn" class="ur-btn-primary">Enviar Reporte</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Pre-select auto-detected time of day
    document.getElementById('ur-time-of-day').value = timeOfDay;

    document.getElementById('ur-close-btn').addEventListener('click', urCloseForm);
    document.getElementById('ur-cancel-btn').addEventListener('click', urCloseForm);
    overlay.addEventListener('click', e => { if (e.target === overlay) urCloseForm(); });
    document.addEventListener('keydown', function escForm(e) {
        if (e.key === 'Escape') { urCloseForm(); document.removeEventListener('keydown', escForm); }
    });

    const photoInput = document.getElementById('ur-photo-input');
    document.getElementById('ur-photo-btn').addEventListener('click', () => photoInput.click());
    document.getElementById('ur-change-photo-btn').addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', urHandlePhotoSelect);

    document.getElementById('ur-comment').addEventListener('input', function () {
        document.getElementById('ur-char-count').textContent = this.value.length;
    });

    // "No limit visible" disables the speed limit input
    document.getElementById('ur-no-limit').addEventListener('change', function () {
        const limitInput = document.getElementById('ur-speed-limit');
        limitInput.disabled = this.checked;
        if (this.checked) limitInput.value = '';
    });

    document.getElementById('ur-submit-btn').addEventListener('click', () => urSubmitSpeedForm(latlng, timeOfDay, exactTime));
}

async function urSubmitSpeedForm(latlng, autoTimeOfDay, exactTime) {
    const observedSpeedEl = document.getElementById('ur-observed-speed');
    const observedSpeed   = parseInt(observedSpeedEl.value, 10);
    const speedLimitEl    = document.getElementById('ur-speed-limit');
    const speedLimit      = speedLimitEl.value ? parseInt(speedLimitEl.value, 10) : null;
    const noLimit         = document.getElementById('ur-no-limit').checked;
    const measurementType = document.getElementById('ur-measurement-type').value;
    const vehicleType     = document.getElementById('ur-vehicle-type').value;
    const timeOfDay       = document.getElementById('ur-time-of-day').value || autoTimeOfDay;
    const comment         = document.getElementById('ur-comment').value.trim();
    const email           = document.getElementById('ur-email').value.trim();
    const wantsUpdates    = document.getElementById('ur-wants-updates').checked;

    if (!observedSpeedEl.value || isNaN(observedSpeed) || observedSpeed < 1 || observedSpeed > 200) {
        urShowError('Por favor indica la velocidad observada (1-200 km/h)'); return;
    }
    if (!noLimit && speedLimitEl.value && (isNaN(speedLimit) || speedLimit < 0 || speedLimit > 120)) {
        urShowError('El límite de velocidad debe estar entre 0 y 120 km/h'); return;
    }
    if (!measurementType) { urShowError('Por favor indica cómo se realizó la medición'); return; }
    if (!vehicleType)     { urShowError('Por favor indica el tipo de vehículo'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { urShowError('Por favor introduce un email válido'); return; }

    urHideError();
    const submitBtn = document.getElementById('ur-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    const typeData = {
        observed_speed: observedSpeed,
        measurement_type: measurementType,
        vehicle_type: vehicleType,
        time_of_day: timeOfDay,
        exact_time: exactTime,
        no_limit_visible: noLimit,
    };
    if (speedLimit !== null && !noLimit) typeData.posted_limit = speedLimit;

    const payload = {
        report_type: 'speed',
        latitude:  parseFloat(latlng.lat.toFixed(6)),
        longitude: parseFloat(latlng.lng.toFixed(6)),
        comment,
        email: email || null,
        wants_updates: wantsUpdates,
        type_specific_data: typeData,
    };
    if (urPhotoUrl) payload.photo_url = urPhotoUrl;

    await urDoSubmit(payload, submitBtn);
}

// ============================================================================
// SUGERENCIA DE INFRAESTRUCTURA FORM
// ============================================================================

function urOpenSuggestionForm(latlng) {
    urCloseForm();
    urPhotoUrl = null;

    const overlay = document.createElement('div');
    overlay.id = 'ur-form-overlay';

    overlay.innerHTML = `
        <div class="ur-form-modal">
            <button class="ur-form-close" id="ur-close-btn" title="Cerrar">×</button>
            <h2 class="ur-form-title">💡 Sugerencia de Infraestructura</h2>
            <p class="ur-form-subtitle">Propuesta de mejora para la movilidad sostenible en Gijón</p>

            <div class="ur-form-field">
                <label class="ur-label">📍 Ubicación</label>
                <input type="text" value="${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}" readonly class="ur-input ur-input-readonly">
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-improvement-type">💡 Tipo de mejora <span class="ur-required">*</span></label>
                <select id="ur-improvement-type" class="ur-input">
                    <option value="">Selecciona...</option>
                    <option value="carril bici nuevo">Carril bici nuevo</option>
                    <option value="ensanchar carril">Ensanchar carril existente</option>
                    <option value="aparcamiento bicis">Aparcamiento de bicicletas</option>
                    <option value="semáforo ciclista">Semáforo para ciclistas</option>
                    <option value="cruce seguro">Cruce seguro / Paso elevado</option>
                    <option value="señalización">Señalización mejorada</option>
                    <option value="iluminación">Iluminación</option>
                    <option value="reductor velocidad">Reductor de velocidad / Badén</option>
                    <option value="separación física">Separación física (bolardos)</option>
                    <option value="mobiliario urbano">Mobiliario urbano de control de tráfico</option>
                    <option value="otro">Otro</option>
                </select>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-priority">❗ Prioridad (tu opinión) <span class="ur-required">*</span></label>
                <select id="ur-priority" class="ur-input">
                    <option value="">Selecciona...</option>
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                </select>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-description">📝 ¿Por qué es necesaria esta mejora? <span class="ur-required">*</span></label>
                <textarea id="ur-description" maxlength="1000" rows="4"
                    placeholder="Describe el problema actual y cómo esta mejora lo resolvería" class="ur-input ur-textarea"></textarea>
                <div class="ur-char-count"><span id="ur-char-count">0</span>/1000</div>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-would-use">🚴 ¿La usarías si se construye? <span class="ur-required">*</span></label>
                <select id="ur-would-use" class="ur-input">
                    <option value="">Selecciona...</option>
                    <option value="diariamente">Sí, diariamente</option>
                    <option value="semanalmente">Sí, semanalmente</option>
                    <option value="ocasionalmente">Sí, ocasionalmente</option>
                    <option value="no estoy seguro">No estoy seguro/a</option>
                </select>
            </div>

            <div class="ur-form-field">
                <div class="ur-checkbox-row">
                    <input type="checkbox" id="ur-willing-advocate">
                    <label for="ur-willing-advocate">Estoy dispuesto/a a ayudar a defender esta propuesta (asistir a reuniones, firmar peticiones)</label>
                </div>
            </div>

            <div class="ur-form-field">
                <label class="ur-label">📷 Foto del estado actual (opcional)</label>
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
                <label class="ur-label" for="ur-extra-comment">💬 Comentario adicional (opcional)</label>
                <textarea id="ur-extra-comment" maxlength="1000" rows="3"
                    placeholder="Información adicional..." class="ur-input ur-textarea"></textarea>
                <div class="ur-char-count"><span id="ur-extra-char-count">0</span>/1000</div>
            </div>

            <div class="ur-form-field">
                <label class="ur-label" for="ur-email">📧 Email (opcional)</label>
                <input type="email" id="ur-email" placeholder="tu@email.com" class="ur-input">
                <div class="ur-checkbox-row">
                    <input type="checkbox" id="ur-wants-updates">
                    <label for="ur-wants-updates">Quiero recibir actualizaciones</label>
                </div>
                <p class="ur-help-text">Si compartes tu email, te contactaremos para organizar apoyo ciudadano si esta propuesta avanza.</p>
            </div>

            <div id="ur-error" class="ur-error-msg" style="display:none"></div>

            <div class="ur-form-actions">
                <button type="button" id="ur-cancel-btn" class="ur-btn-secondary">Cancelar</button>
                <button type="button" id="ur-submit-btn" class="ur-btn-primary">Enviar Sugerencia</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('ur-close-btn').addEventListener('click', urCloseForm);
    document.getElementById('ur-cancel-btn').addEventListener('click', urCloseForm);
    overlay.addEventListener('click', e => { if (e.target === overlay) urCloseForm(); });
    document.addEventListener('keydown', function escForm(e) {
        if (e.key === 'Escape') { urCloseForm(); document.removeEventListener('keydown', escForm); }
    });

    const photoInput = document.getElementById('ur-photo-input');
    document.getElementById('ur-photo-btn').addEventListener('click', () => photoInput.click());
    document.getElementById('ur-change-photo-btn').addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', urHandlePhotoSelect);

    document.getElementById('ur-description').addEventListener('input', function () {
        document.getElementById('ur-char-count').textContent = this.value.length;
    });
    document.getElementById('ur-extra-comment').addEventListener('input', function () {
        document.getElementById('ur-extra-char-count').textContent = this.value.length;
    });

    document.getElementById('ur-submit-btn').addEventListener('click', () => urSubmitSuggestionForm(latlng));
}

async function urSubmitSuggestionForm(latlng) {
    const improvementType   = document.getElementById('ur-improvement-type').value;
    const priority          = document.getElementById('ur-priority').value;
    const description       = document.getElementById('ur-description').value.trim();
    const wouldUse          = document.getElementById('ur-would-use').value;
    const willingToAdvocate = document.getElementById('ur-willing-advocate').checked;
    const extraComment      = document.getElementById('ur-extra-comment').value.trim();
    const email             = document.getElementById('ur-email').value.trim();
    const wantsUpdates      = document.getElementById('ur-wants-updates').checked;

    if (!improvementType) { urShowError('Por favor indica el tipo de mejora'); return; }
    if (!priority)        { urShowError('Por favor indica la prioridad'); return; }
    if (!description)     { urShowError('Por favor describe por qué es necesaria esta mejora'); return; }
    if (!wouldUse)        { urShowError('Por favor indica si usarías esta infraestructura'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { urShowError('Por favor introduce un email válido'); return; }

    urHideError();
    const submitBtn = document.getElementById('ur-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    const typeData = {
        improvement_type: improvementType,
        priority,
        would_use: wouldUse,
        willing_to_advocate: willingToAdvocate,
    };
    if (extraComment) typeData.extra_comment = extraComment;

    const payload = {
        report_type: 'suggestion',
        latitude:  parseFloat(latlng.lat.toFixed(6)),
        longitude: parseFloat(latlng.lng.toFixed(6)),
        comment: description,
        email: email || null,
        wants_updates: wantsUpdates,
        type_specific_data: typeData,
    };
    if (urPhotoUrl) payload.photo_url = urPhotoUrl;

    await urDoSubmit(payload, submitBtn);
}

// ============================================================================
// VOTING SYSTEM
// ============================================================================

function urGetVotedReports() {
    const cookie = document.cookie.split('; ').find(r => r.startsWith('voted_reports='));
    if (!cookie) return [];
    const val = cookie.split('=')[1];
    return val ? val.split(',').map(Number).filter(n => !isNaN(n)) : [];
}

function urSaveVotedReport(reportId) {
    const voted = urGetVotedReports();
    voted.push(reportId);
    const expires = new Date(Date.now() + 365 * 24 * 3600 * 1000).toUTCString();
    document.cookie = `voted_reports=${voted.join(',')};expires=${expires};path=/;SameSite=Lax`;
}

async function urVoteForSuggestion(reportId) {
    if (urGetVotedReports().includes(reportId)) {
        urShowToast('Ya has votado por esta sugerencia');
        return;
    }

    try {
        const res = await fetch(`${USER_REPORTS_API}${reportId}/vote/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al votar');

        urSaveVotedReport(reportId);
        urUpdateVoteDisplay(reportId, data.vote_count);
        urShowToast('¡Voto registrado! Gracias por tu apoyo 👍');
    } catch (err) {
        urShowToast('Error al registrar el voto. Inténtalo de nuevo.');
        console.error('Vote error:', err);
    }
}

function urUpdateVoteDisplay(reportId, newCount) {
    document.querySelectorAll(`[data-vote-for="${reportId}"]`).forEach(section => {
        const numEl   = section.querySelector('.ur-vote-number');
        const labelEl = section.querySelector('.ur-vote-label');
        const btn     = section.querySelector('.ur-vote-btn');
        if (numEl)   numEl.textContent   = newCount;
        if (labelEl) labelEl.textContent = `persona${newCount !== 1 ? 's' : ''} apoyan esto`;
        if (btn) {
            btn.textContent = '✓ Ya has votado';
            btn.classList.add('ur-voted');
            btn.disabled = true;
            btn.onclick  = null;
        }
    });
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
    speed:              { icon: '📊', color: '#06b6d4', label: 'Velocidad de Vehículos' },
    suggestion:         { icon: '💡', color: '#8b5cf6', label: 'Sugerencia' },
    new_bike_parking:   { icon: '🅿️', color: '#3b82f6', label: 'Aparcamiento de Bicis' },
    new_bike_lane:      { icon: '🛣️', color: '#2563eb', label: 'Carril Bici' },
    new_senda:          { icon: '🌳', color: '#059669', label: 'Senda Ciclable' },
    new_urban_furniture:{ icon: '🚧', color: '#7c3aed', label: 'Mobiliario Urbano' },
};

function urAddReportMarker(report) {
    const cfg = UR_TYPE_CONFIG[report.report_type] || UR_TYPE_CONFIG.other;

    const hasBadge = report.report_type === 'suggestion' && (report.vote_count || 0) >= 5;
    const iconHtml = hasBadge
        ? `<div class="ur-marker" style="background:${cfg.color};position:relative">${cfg.icon}<span class="ur-vote-badge">${report.vote_count}</span></div>`
        : `<div class="ur-marker" style="background:${cfg.color}">${cfg.icon}</div>`;

    const icon = L.divIcon({
        html: iconHtml,
        className: 'ur-marker-wrapper',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20],
    });

    const marker = L.marker([report.latitude, report.longitude], { icon });

    const timeAgo   = urTimeAgo(new Date(report.created_at));
    const statusTxt = urStatusText(report.status);

    let popup = `<div class="ur-popup">
        <div class="ur-popup-title">${cfg.icon} ${cfg.label}</div>`;

    popup += urTypeDetails(report);
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

function urTypeDetails(report) {
    const d = report.type_specific_data || {};
    switch (report.report_type) {
        case 'parking':
            return [
                d.blocking_type  && `<div class="ur-popup-detail">🚧 Bloquea: <strong>${d.blocking_type}</strong></div>`,
                d.duration       && `<div class="ur-popup-detail">⏱️ Duración: <strong>${d.duration}</strong></div>`,
                d.plate_visible  && `<div class="ur-popup-detail">🔢 Matrícula: <strong>${d.plate_visible}</strong></div>`,
            ].filter(Boolean).join('');
        case 'scooter_parking':
            return [
                d.company          && `<div class="ur-popup-detail">🛴 Empresa: <strong>${d.company}</strong></div>`,
                d.scooter_count    && `<div class="ur-popup-detail">🔢 Patinetes: <strong>${d.scooter_count}</strong></div>`,
                d.parking_capacity && `<div class="ur-popup-detail">🅿️ Aparcamiento: <strong>${d.parking_capacity}</strong></div>`,
                d.frequency        && `<div class="ur-popup-detail">🔄 Frecuencia: <strong>${d.frequency}</strong></div>`,
            ].filter(Boolean).join('');
        case 'pothole':
            return [
                d.surface   && `<div class="ur-popup-detail">🛤️ Superficie: <strong>${d.surface}</strong></div>`,
                d.severity  && `<div class="ur-popup-detail">⚠️ Gravedad: <strong>${d.severity}</strong></div>`,
                d.width     && `<div class="ur-popup-detail">📏 Tamaño: <strong>${d.width}</strong></div>`,
            ].filter(Boolean).join('');
        case 'accident':
            return [
                d.date     && `<div class="ur-popup-detail">📅 Fecha: <strong>${d.date}${d.time ? ' ' + d.time : ''}</strong></div>`,
                d.severity && `<div class="ur-popup-detail">🩺 Gravedad: <strong>${d.severity}</strong></div>`,
                d.vehicles && d.vehicles.length && `<div class="ur-popup-detail">🚗 Vehículos: <strong>${d.vehicles.join(', ')}</strong></div>`,
                d.news_link && `<div class="ur-popup-detail">📰 <a href="${d.news_link}" target="_blank" rel="noopener noreferrer">Ver noticia</a></div>`,
                `<div class="ur-popup-blurred">📍 Ubicación aproximada (privacidad)</div>`,
            ].filter(Boolean).join('');
        case 'speed':
            return [
                d.observed_speed != null && `<div class="ur-popup-detail">🚗 Velocidad: <strong>${d.observed_speed} km/h</strong></div>`,
                d.posted_limit   != null && `<div class="ur-popup-detail">🚦 Límite: <strong>${d.posted_limit} km/h</strong></div>`,
                d.no_limit_visible        && `<div class="ur-popup-detail">🚦 Sin límite visible</div>`,
                d.vehicle_type            && `<div class="ur-popup-detail">🚘 Vehículo: <strong>${d.vehicle_type}</strong></div>`,
                d.measurement_type        && `<div class="ur-popup-detail">📱 Medición: <strong>${d.measurement_type}</strong></div>`,
                d.time_of_day             && `<div class="ur-popup-detail">🕐 Momento: <strong>${d.time_of_day}</strong></div>`,
            ].filter(Boolean).join('');
        case 'suggestion': {
            const hasVoted = urGetVotedReports().includes(report.id);
            const voteBtn  = hasVoted
                ? `<button class="ur-vote-btn ur-voted" disabled>✓ Ya has votado</button>`
                : `<button class="ur-vote-btn" onclick="urVoteForSuggestion(${report.id})">👍 Apoyar esta sugerencia</button>`;
            return [
                d.improvement_type && `<div class="ur-popup-detail">💡 <strong>${d.improvement_type}</strong></div>`,
                d.priority         && `<div class="ur-popup-detail">❗ Prioridad: <strong>${d.priority}</strong></div>`,
                d.would_use        && `<div class="ur-popup-detail">🚴 Uso: <strong>${d.would_use}</strong></div>`,
                `<div class="ur-vote-section" data-vote-for="${report.id}">
                    <div class="ur-vote-count">
                        <span class="ur-vote-number">${report.vote_count || 0}</span>
                        <span class="ur-vote-label">persona${(report.vote_count || 0) !== 1 ? 's' : ''} apoyan esto</span>
                    </div>
                    ${voteBtn}
                </div>`,
            ].filter(Boolean).join('');
        }
        case 'other':
            return d.category ? `<div class="ur-popup-detail">📋 Categoría: <strong>${d.category}</strong></div>` : '';
        default:
            return '';
    }
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
