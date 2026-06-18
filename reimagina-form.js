// ============================================================================
// REIMAGINA GIJÓN — FORM HANDLING
// ============================================================================

const REIMAGINA_API = 'https://oxmap-backend.onrender.com/api/reimaginaciones/';
const REIMAGINA_VARIANTS_API = 'https://oxmap-backend.onrender.com/api/reimaginacion-variants/';

const SPACE_TYPES = {
    'parking_lot': 'Aparcamiento',
    'street': 'Calle',
    'plaza': 'Plaza',
    'park': 'Parque',
    'building': 'Edificio',
    'other': 'Otro'
};

let reimaginaBeforeUrl = null;
let reimaginaAfterUrl = null;

// ============================================================================
// CLOUDINARY UPLOAD (reuses existing constants from user-reports.js)
// ============================================================================

async function reimaginaUploadToCloudinary(file) {
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

// ============================================================================
// CREATE REIMAGINACIÓN FORM
// ============================================================================

function reimaginaOpenForm(latlng) {
    reimaginaCloseForm();
    reimaginaBeforeUrl = null;
    reimaginaAfterUrl = null;

    const overlay = document.createElement('div');
    overlay.id = 'reimagina-form-overlay';

    overlay.innerHTML = `
        <div class="ur-form-modal" style="max-width:520px">
            <button class="ur-form-close" id="reimagina-close-btn" title="Cerrar">×</button>

            <h2 class="ur-form-title">🎨 Reimagina este espacio</h2>
            <p class="ur-form-subtitle">Comparte tu visión de cómo podría ser diferente</p>

            <div class="ur-form-field">
                <label class="ur-label">📍 Tipo de espacio <span class="ur-required">*</span></label>
                <select id="reimagina-space-type" class="ur-input" required>
                    <option value="">Selecciona el tipo de espacio...</option>
                    ${Object.entries(SPACE_TYPES).map(([key, label]) =>
                        `<option value="${key}">${label}</option>`
                    ).join('')}
                </select>
            </div>

            <div class="ur-form-field">
                <label class="ur-label">📸 Foto actual (ANTES) <span class="ur-required">*</span></label>
                <input type="file" id="reimagina-before-file" accept="image/*" style="display:none">
                <button class="ur-photo-trigger" id="reimagina-before-btn">📸 Subir Foto Actual</button>
                <div id="reimagina-before-preview" style="display:none">
                    <img id="reimagina-before-img" style="max-width:100%;max-height:200px;border-radius:6px;margin-top:8px">
                    <button class="ur-link-btn" id="reimagina-change-before">🔄 Cambiar foto</button>
                </div>
                <p class="ur-help-text">Foto actual del espacio que quieres reimaginar</p>
            </div>

            <div class="ur-form-field">
                <label class="ur-label">🎨 Tu visión (DESPUÉS) <span class="ur-required">*</span></label>
                <input type="file" id="reimagina-after-file" accept="image/*" style="display:none">
                <button class="ur-photo-trigger" id="reimagina-after-btn">🎨 Subir Tu Visión</button>
                <div id="reimagina-after-preview" style="display:none">
                    <img id="reimagina-after-img" style="max-width:100%;max-height:200px;border-radius:6px;margin-top:8px">
                    <button class="ur-link-btn" id="reimagina-change-after">🔄 Cambiar foto</button>
                </div>
                <p class="ur-help-text">Tu idea de cómo podría transformarse</p>
            </div>

            <div class="ur-form-field">
                <label class="ur-label">📝 Título <span class="ur-required">*</span></label>
                <input type="text" id="reimagina-title" class="ur-input" maxlength="200" required
                    placeholder="Ej: Transformar aparcamiento en parque verde">
            </div>

            <div class="ur-form-field">
                <label class="ur-label">💭 Descripción <span class="ur-required">*</span></label>
                <textarea id="reimagina-description" class="ur-input ur-textarea" maxlength="2000" required
                    placeholder="Explica tu visión con el mayor detalle posible..."></textarea>
                <div class="ur-char-count"><span id="reimagina-desc-count">0</span>/2000</div>
            </div>

            <div class="ur-form-field">
                <label class="ur-label">✨ Tu nombre (opcional)</label>
                <input type="text" id="reimagina-name" class="ur-input" maxlength="100"
                    placeholder="¿Cómo te llamas? (opcional)">
            </div>

            <div class="ur-form-field">
                <label class="ur-label">📧 Tu email (opcional)</label>
                <input type="email" id="reimagina-email" class="ur-input"
                    placeholder="tu@email.com (opcional)">
                <p class="ur-help-text">Si dejas tu email podrás borrar tu aportación después</p>
            </div>

            <div id="reimagina-error" class="ur-error-msg" style="display:none"></div>

            <div class="ur-form-actions">
                <button class="ur-btn-secondary" id="reimagina-cancel-btn">Cancelar</button>
                <button class="ur-btn-primary" id="reimagina-submit-btn">Compartir Mi Visión</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    window._reimaginaLatlng = latlng;

    // Wire up handlers
    const closeBtn = document.getElementById('reimagina-close-btn');
    const cancelBtn = document.getElementById('reimagina-cancel-btn');
    closeBtn.addEventListener('click', reimaginaCloseForm);
    cancelBtn.addEventListener('click', reimaginaCloseForm);
    overlay.addEventListener('click', e => { if (e.target === overlay) reimaginaCloseForm(); });

    // Character counter
    const textarea = document.getElementById('reimagina-description');
    textarea.addEventListener('input', () => {
        document.getElementById('reimagina-desc-count').textContent = textarea.value.length;
    });

    // Before photo
    const beforeFile = document.getElementById('reimagina-before-file');
    const beforeBtn = document.getElementById('reimagina-before-btn');
    const beforePreview = document.getElementById('reimagina-before-preview');
    beforeBtn.addEventListener('click', () => beforeFile.click());
    beforeFile.addEventListener('change', e => reimaginaHandlePhoto(e, 'before', beforeBtn, beforePreview));
    document.getElementById('reimagina-change-before').addEventListener('click', () => {
        beforePreview.style.display = 'none';
        beforeBtn.style.display = 'block';
        reimaginaBeforeUrl = null;
    });

    // After photo
    const afterFile = document.getElementById('reimagina-after-file');
    const afterBtn = document.getElementById('reimagina-after-btn');
    const afterPreview = document.getElementById('reimagina-after-preview');
    afterBtn.addEventListener('click', () => afterFile.click());
    afterFile.addEventListener('change', e => reimaginaHandlePhoto(e, 'after', afterBtn, afterPreview));
    document.getElementById('reimagina-change-after').addEventListener('click', () => {
        afterPreview.style.display = 'none';
        afterBtn.style.display = 'block';
        reimaginaAfterUrl = null;
    });

    // Submit
    document.getElementById('reimagina-submit-btn').addEventListener('click', reimaginaSubmit);
}

function reimaginaCloseForm() {
    const overlay = document.getElementById('reimagina-form-overlay');
    if (overlay) overlay.remove();
    reimaginaBeforeUrl = null;
    reimaginaAfterUrl = null;
}

async function reimaginaHandlePhoto(event, type, button, preview) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        reimaginaShowError('La imagen debe ser menor a 5MB');
        return;
    }

    button.disabled = true;
    const origText = button.textContent;
    button.textContent = '⏳ Subiendo...';

    try {
        const url = await reimaginaUploadToCloudinary(file);
        document.getElementById(`reimagina-${type}-img`).src = url;
        preview.style.display = 'block';
        button.style.display = 'none';

        if (type === 'before') reimaginaBeforeUrl = url;
        else reimaginaAfterUrl = url;
    } catch (error) {
        console.error('Reimagina upload error:', error);
        reimaginaShowError('Error al subir la imagen. Intenta de nuevo.');
        button.disabled = false;
        button.textContent = origText;
    }
}

async function reimaginaSubmit() {
    const spaceType   = document.getElementById('reimagina-space-type').value;
    const title       = document.getElementById('reimagina-title').value.trim();
    const description = document.getElementById('reimagina-description').value.trim();
    const name        = document.getElementById('reimagina-name').value.trim();
    const email       = document.getElementById('reimagina-email').value.trim();

    if (!spaceType)        { reimaginaShowError('Por favor selecciona el tipo de espacio'); return; }
    if (!reimaginaBeforeUrl){ reimaginaShowError('Por favor sube la foto actual'); return; }
    if (!reimaginaAfterUrl) { reimaginaShowError('Por favor sube tu visión'); return; }
    if (!title)            { reimaginaShowError('Por favor añade un título'); return; }
    if (!description)      { reimaginaShowError('Por favor describe tu visión'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        reimaginaShowError('Email inválido'); return;
    }

    const submitBtn = document.getElementById('reimagina-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Enviando...';

    const payload = {
        latitude: window._reimaginaLatlng.lat,
        longitude: window._reimaginaLatlng.lng,
        address: '',
        space_type: spaceType,
        before_photo_url: reimaginaBeforeUrl,
        title: title,
        description: description,
        creator_name: name || null,
        creator_email: email || null,
        after_photo_url: reimaginaAfterUrl,
        after_description: description
    };

    try {
        const response = await fetch(REIMAGINA_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || JSON.stringify(error) || 'Error al enviar');
        }

        reimaginaCloseForm();
        urShowToast('✅ ¡Gracias! Tu visión ha sido compartida.');
        reimaginaLoadLayer();
    } catch (error) {
        console.error('Reimagina submission error:', error);
        reimaginaShowError(error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Compartir Mi Visión';
    }
}

function reimaginaShowError(message) {
    const el = document.getElementById('reimagina-error');
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ============================================================================
// GALLERY — VIEW REIMAGINACIÓN + VARIANTS
// ============================================================================

function reimaginaOpenGallery(reimaginacion) {
    reimaginaCloseGallery();

    const spaceLabel = SPACE_TYPES[reimaginacion.space_type] || reimaginacion.space_type;
    const hasVariants = reimaginacion.variants && reimaginacion.variants.length > 0;
    const firstVariant = hasVariants ? reimaginacion.variants[0] : null;

    const overlay = document.createElement('div');
    overlay.id = 'reimagina-gallery-overlay';

    overlay.innerHTML = `
        <div class="reimagina-gallery-modal-new">
            <button class="ur-form-close" id="reimagina-gallery-close" title="Cerrar">×</button>

            <div class="gallery-header">
                <h2 style="margin:0 0 4px;font-size:20px">🎨 ${reimaginacion.title}</h2>
                <p class="gallery-space-type">${spaceLabel}</p>
            </div>

            <div class="gallery-main-container">
                <div class="gallery-slider-container">
                    <div class="before-after-slider" id="reimagina-slider">
                        <img id="gallery-slider-before" src="${reimaginacion.before_photo_url}"
                            class="slider-image slider-before" alt="Imagen actual">
                        <div class="slider-after-wrapper" id="slider-after-wrapper">
                            <img id="gallery-slider-after"
                                src="${firstVariant ? firstVariant.after_photo_url : reimaginacion.before_photo_url}"
                                class="slider-image slider-after" alt="Visión">
                        </div>
                        <div class="slider-handle-line" id="slider-handle-line"></div>
                        <div class="slider-handle-grip" id="slider-handle-grip">⇔</div>
                        <div class="slider-label slider-label-before">ACTUAL</div>
                        <div class="slider-label slider-label-after">VISIÓN</div>
                    </div>

                    <div class="slider-description">
                        <p id="gallery-desc-text">${reimaginacion.description}</p>
                        <p class="gallery-meta" id="gallery-desc-meta">
                            Propuesto por: ${reimaginacion.creator_name || 'Anónimo'}
                        </p>
                    </div>
                </div>

                <div class="gallery-variants-sidebar">
                    <h3 style="margin:0 0 12px;font-size:13px;font-weight:600;color:#374151">Variantes de visión</h3>
                    <div id="gallery-variants-list" class="variants-list"></div>
                    <button class="ur-btn-primary" id="reimagina-add-variant-btn" style="width:100%;margin-top:12px">
                        ➕ Añadir mi visión
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Close handlers
    document.getElementById('reimagina-gallery-close').addEventListener('click', reimaginaCloseGallery);
    overlay.addEventListener('click', e => { if (e.target === overlay) reimaginaCloseGallery(); });

    // Set up drag-based slider
    reimaginaInitSlider();

    // Populate variant thumbnails
    reimaginaPopulateVariants(reimaginacion);

    // Add variant button
    document.getElementById('reimagina-add-variant-btn').addEventListener('click', () => {
        reimaginaCloseGallery();
        reimaginaOpenVariantForm(reimaginacion.id, reimaginacion.before_photo_url);
    });
}

function reimaginaInitSlider() {
    const slider = document.getElementById('reimagina-slider');
    const wrapper = document.getElementById('slider-after-wrapper');
    const afterImg = document.getElementById('gallery-slider-after');
    const line = document.getElementById('slider-handle-line');
    const grip = document.getElementById('slider-handle-grip');
    let dragging = false;

    function syncAfterImageWidth() {
        afterImg.style.width = slider.offsetWidth + 'px';
    }

    function setPosition(clientX) {
        const rect = slider.getBoundingClientRect();
        let pct = ((clientX - rect.left) / rect.width) * 100;
        pct = Math.max(0, Math.min(100, pct));
        wrapper.style.width = pct + '%';
        line.style.left = pct + '%';
        grip.style.left = pct + '%';
    }

    // Size after image to full slider width so it aligns with the before image
    syncAfterImageWidth();
    window._reimaginaResizeHandler = syncAfterImageWidth;
    window.addEventListener('resize', syncAfterImageWidth);

    // Initialize at 50%
    wrapper.style.width = '50%';
    line.style.left = '50%';
    grip.style.left = '50%';

    // Mouse events
    slider.addEventListener('mousedown', e => {
        dragging = true;
        setPosition(e.clientX);
        e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
        if (dragging) setPosition(e.clientX);
    });
    document.addEventListener('mouseup', () => { dragging = false; });

    // Touch events
    slider.addEventListener('touchstart', e => {
        dragging = true;
        setPosition(e.touches[0].clientX);
        e.preventDefault();
    }, { passive: false });
    document.addEventListener('touchmove', e => {
        if (dragging) setPosition(e.touches[0].clientX);
    });
    document.addEventListener('touchend', () => { dragging = false; });
}

function reimaginaCloseGallery() {
    const el = document.getElementById('reimagina-gallery-overlay');
    if (el) el.remove();
    if (window._reimaginaResizeHandler) {
        window.removeEventListener('resize', window._reimaginaResizeHandler);
        window._reimaginaResizeHandler = null;
    }
}

function reimaginaPopulateVariants(reimaginacion) {
    const list = document.getElementById('gallery-variants-list');
    list.innerHTML = '';

    if (!reimaginacion.variants || reimaginacion.variants.length === 0) {
        const empty = document.createElement('p');
        empty.style.cssText = 'font-size:12px;color:#9ca3af;margin:8px 0';
        empty.textContent = 'Aún no hay variantes. ¡Sé el primero!';
        list.appendChild(empty);
        return;
    }

    reimaginacion.variants.forEach((variant, index) => {
        const isFirst = index === 0;
        const div = document.createElement('div');
        div.className = `variant-thumbnail-item${isFirst ? ' active' : ''}`;
        div.innerHTML = `
            <div class="variant-thumb-image-wrapper">
                <img src="${variant.after_photo_url}" class="variant-thumb-image" alt="Visión ${index + 1}">
                <div class="variant-thumb-overlay">Visión ${index + 1}</div>
            </div>
            <div class="variant-thumb-info">
                <p class="variant-thumb-creator">${variant.creator_name || 'Anónimo'}</p>
                <p class="variant-thumb-description">${variant.description}</p>
            </div>
            <div class="variant-thumb-actions">
                <button class="reimagina-like-btn ${variant.user_has_liked ? 'liked' : ''}"
                    data-variant-id="${variant.id}">
                    ❤️ ${variant.likes_count}
                </button>
            </div>
        `;

        // Click thumbnail to load into slider
        div.addEventListener('click', e => {
            if (e.target.closest('button')) return;

            document.querySelectorAll('.variant-thumbnail-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');

            const afterImg = document.getElementById('gallery-slider-after');
            afterImg.src = variant.after_photo_url;
            afterImg.style.width = document.getElementById('reimagina-slider').offsetWidth + 'px';
            document.getElementById('gallery-desc-text').textContent = variant.description;
            document.getElementById('gallery-desc-meta').textContent =
                `Propuesto por: ${variant.creator_name || 'Anónimo'}`;

            // Reset slider to 50%
            const wrapper = document.getElementById('slider-after-wrapper');
            const line = document.getElementById('slider-handle-line');
            const grip = document.getElementById('slider-handle-grip');
            wrapper.style.width = '50%';
            line.style.left = '50%';
            grip.style.left = '50%';
        });

        // Like button
        div.querySelector('.reimagina-like-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            const btn = e.currentTarget;
            const variantId = btn.dataset.variantId;
            const hasLiked = btn.classList.contains('liked');
            const endpoint = hasLiked ? 'unlike' : 'like';

            try {
                const res = await fetch(`${REIMAGINA_VARIANTS_API}${variantId}/${endpoint}/`, { method: 'POST' });
                if (!res.ok) throw new Error('Error');
                const data = await res.json();
                btn.textContent = `❤️ ${data.likes_count}`;
                btn.classList.toggle('liked');
            } catch (err) {
                console.error('Like error:', err);
            }
        });

        list.appendChild(div);
    });
}

// ============================================================================
// ADD VARIANT FORM
// ============================================================================

function reimaginaOpenVariantForm(reimaginacionId, beforePhotoUrl) {
    reimaginaCloseVariantForm();
    let variantPhotoUrl = null;

    const overlay = document.createElement('div');
    overlay.id = 'reimagina-variant-overlay';

    overlay.innerHTML = `
        <div class="ur-form-modal" style="max-width:520px">
            <button class="ur-form-close" id="variant-close-btn" title="Cerrar">×</button>

            <h2 class="ur-form-title">🎨 Añade tu visión alternativa</h2>
            <p class="ur-form-subtitle">Propón otra forma de transformar este espacio</p>

            <div class="ur-form-field">
                <label class="ur-label">Foto actual (referencia)</label>
                <img src="${beforePhotoUrl}" style="width:100%;max-height:200px;border-radius:6px;margin:8px 0;object-fit:cover">
            </div>

            <div class="ur-form-field">
                <label class="ur-label">🎨 Tu visión (DESPUÉS) <span class="ur-required">*</span></label>
                <input type="file" id="variant-after-file" accept="image/*" style="display:none">
                <button class="ur-photo-trigger" id="variant-after-btn">🎨 Subir Tu Visión</button>
                <div id="variant-after-preview" style="display:none">
                    <img id="variant-after-img" style="max-width:100%;max-height:200px;border-radius:6px;margin-top:8px">
                    <button class="ur-link-btn" id="variant-change-after">🔄 Cambiar foto</button>
                </div>
            </div>

            <div class="ur-form-field">
                <label class="ur-label">💭 Descripción <span class="ur-required">*</span></label>
                <textarea id="variant-description" class="ur-input ur-textarea" maxlength="2000" required
                    placeholder="Explica tu visión alternativa..."></textarea>
                <div class="ur-char-count"><span id="variant-desc-count">0</span>/2000</div>
            </div>

            <div class="ur-form-field">
                <label class="ur-label">✨ Tu nombre (opcional)</label>
                <input type="text" id="variant-name" class="ur-input" maxlength="100">
            </div>

            <div class="ur-form-field">
                <label class="ur-label">📧 Tu email (opcional)</label>
                <input type="email" id="variant-email" class="ur-input">
                <p class="ur-help-text">Si dejas tu email podrás borrar tu visión después</p>
            </div>

            <div id="variant-error" class="ur-error-msg" style="display:none"></div>

            <div class="ur-form-actions">
                <button class="ur-btn-secondary" id="variant-cancel-btn">Cancelar</button>
                <button class="ur-btn-primary" id="variant-submit-btn">Compartir Visión</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Close handlers
    document.getElementById('variant-close-btn').addEventListener('click', reimaginaCloseVariantForm);
    document.getElementById('variant-cancel-btn').addEventListener('click', reimaginaCloseVariantForm);
    overlay.addEventListener('click', e => { if (e.target === overlay) reimaginaCloseVariantForm(); });

    // Character counter
    document.getElementById('variant-description').addEventListener('input', e => {
        document.getElementById('variant-desc-count').textContent = e.target.value.length;
    });

    // Photo upload
    const photoFile = document.getElementById('variant-after-file');
    const photoBtn = document.getElementById('variant-after-btn');
    const photoPreview = document.getElementById('variant-after-preview');

    photoBtn.addEventListener('click', () => photoFile.click());
    photoFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            reimaginaShowVariantError('La imagen debe ser menor a 5MB');
            return;
        }
        photoBtn.disabled = true;
        photoBtn.textContent = '⏳ Subiendo...';
        try {
            variantPhotoUrl = await reimaginaUploadToCloudinary(file);
            document.getElementById('variant-after-img').src = variantPhotoUrl;
            photoPreview.style.display = 'block';
            photoBtn.style.display = 'none';
        } catch (err) {
            reimaginaShowVariantError('Error al subir la imagen');
            photoBtn.disabled = false;
            photoBtn.textContent = '🎨 Subir Tu Visión';
        }
    });

    document.getElementById('variant-change-after').addEventListener('click', () => {
        photoPreview.style.display = 'none';
        photoBtn.style.display = 'block';
        variantPhotoUrl = null;
    });

    // Submit
    document.getElementById('variant-submit-btn').addEventListener('click', async () => {
        const description = document.getElementById('variant-description').value.trim();
        const name = document.getElementById('variant-name').value.trim();
        const email = document.getElementById('variant-email').value.trim();

        if (!variantPhotoUrl) { reimaginaShowVariantError('Por favor sube una imagen'); return; }
        if (!description) { reimaginaShowVariantError('Por favor describe tu visión'); return; }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            reimaginaShowVariantError('Email inválido'); return;
        }

        const submitBtn = document.getElementById('variant-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Enviando...';

        try {
            const res = await fetch(`${REIMAGINA_API}${reimaginacionId}/add-variant/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    after_photo_url: variantPhotoUrl,
                    description: description,
                    creator_name: name || null,
                    creator_email: email || null
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Error al enviar');
            }

            reimaginaCloseVariantForm();
            urShowToast('✅ ¡Gracias! Tu visión ha sido añadida.');
            reimaginaLoadLayer();
        } catch (error) {
            console.error('Variant submission error:', error);
            reimaginaShowVariantError(error.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Compartir Visión';
        }
    });
}

function reimaginaCloseVariantForm() {
    const el = document.getElementById('reimagina-variant-overlay');
    if (el) el.remove();
}

function reimaginaShowVariantError(message) {
    const el = document.getElementById('variant-error');
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ============================================================================
// DELETE VARIANT
// ============================================================================

async function reimaginaDeleteVariant(variantId) {
    const email = prompt('Introduce tu email para confirmar la eliminación:');
    if (!email) return;

    try {
        const res = await fetch(`${REIMAGINA_VARIANTS_API}${variantId}/delete-with-token/`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: email })
        });

        if (!res.ok) throw new Error('Invalid token or email');

        urShowToast('✅ Visión eliminada');
        reimaginaCloseGallery();
        reimaginaLoadLayer();
    } catch (error) {
        console.error('Delete error:', error);
        alert('No se pudo eliminar. Verifica que el email sea correcto.');
    }
}
