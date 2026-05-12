// ============================================================================
// FEEDBACK SYSTEM
// Feedback about the map/platform itself (bugs, feature requests, etc.)
// Separate from UserReport which covers infrastructure incidents.
// ============================================================================

const FEEDBACK_API = 'https://oxmap-backend.onrender.com/api/feedback/';

let feedbackMapContext = null;
let feedbackScreenshotUrl = null;

function openFeedbackForm() {
    const center = map.getCenter();
    feedbackMapContext = { lat: center.lat, lng: center.lng, zoom: map.getZoom() };
    feedbackScreenshotUrl = null;

    const overlay = document.createElement('div');
    overlay.id = 'feedback-overlay';
    overlay.className = 'ur-overlay';

    overlay.innerHTML = `
        <div class="ur-form-modal feedback-modal">
            <button class="ur-close-btn" onclick="closeFeedbackForm()">×</button>

            <h2 class="ur-form-title">💬 Enviar Feedback</h2>
            <p class="ur-form-subtitle">Ayúdanos a mejorar el mapa</p>

            <div class="ur-field">
                <label class="ur-label">📋 Tipo de feedback <span class="ur-required">*</span></label>
                <select id="fb-type" class="ur-input" required>
                    <option value="">Selecciona...</option>
                    <option value="bug">🐛 Error / Bug</option>
                    <option value="feature_request">✨ Solicitud de función</option>
                    <option value="improvement">🔧 Mejora sugerida</option>
                    <option value="usability">🤔 Problema de usabilidad</option>
                    <option value="other">💭 Otro</option>
                </select>
            </div>

            <div class="ur-field">
                <label class="ur-label">📝 Descripción <span class="ur-required">*</span></label>
                <textarea id="fb-description" class="ur-input" maxlength="2000" rows="4" required
                    placeholder="Describe tu feedback con el mayor detalle posible..."></textarea>
                <div class="ur-char-counter"><span id="fb-char-count">0</span>/2000</div>
            </div>

            <div class="ur-field">
                <label class="ur-label">📷 Captura de pantalla <span class="ur-optional">(opcional)</span></label>
                <input type="file" id="fb-screenshot-input" accept="image/*" style="display:none">
                <div id="fb-photo-area">
                    <button type="button" id="fb-screenshot-btn" class="ur-upload-btn">📸 Subir Captura</button>
                    <span id="fb-upload-status" style="font-size:12px;color:#6b7280;margin-left:8px"></span>
                </div>
                <div id="fb-photo-preview" style="display:none;margin-top:8px">
                    <img id="fb-preview-img" style="max-width:100%;max-height:120px;border-radius:6px;border:1px solid #e5e7eb">
                    <br>
                    <button type="button" id="fb-change-btn" class="ur-change-photo-btn" style="margin-top:4px">🔄 Cambiar imagen</button>
                </div>
                <p class="ur-help-text">Ayuda a ilustrar el problema o sugerencia</p>
            </div>

            <div class="ur-field">
                <label class="ur-label">📧 Email <span class="ur-optional">(opcional)</span></label>
                <input type="email" id="fb-email" class="ur-input" placeholder="tu@email.com">
                <div class="feedback-checkbox-row">
                    <input type="checkbox" id="fb-wants-updates">
                    <label for="fb-wants-updates">Quiero recibir actualizaciones sobre este feedback</label>
                </div>
                <div class="feedback-checkbox-row">
                    <input type="checkbox" id="fb-available-followup">
                    <label for="fb-available-followup">Estoy disponible para preguntas de seguimiento</label>
                </div>
            </div>

            <div class="feedback-context-info">
                <small>ℹ️ Se incluirá automáticamente: navegador, URL actual y posición del mapa</small>
            </div>

            <div id="fb-error" class="ur-error" style="display:none"></div>

            <div class="ur-form-actions">
                <button type="button" class="ur-btn-secondary" onclick="closeFeedbackForm()">Cancelar</button>
                <button type="button" id="fb-submit-btn" class="ur-btn-primary">Enviar Feedback</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    setupFeedbackHandlers();
}

function closeFeedbackForm() {
    const overlay = document.getElementById('feedback-overlay');
    if (overlay) overlay.remove();
}

function setupFeedbackHandlers() {
    // Character counter
    const textarea = document.getElementById('fb-description');
    const counter = document.getElementById('fb-char-count');
    textarea.addEventListener('input', () => { counter.textContent = textarea.value.length; });

    // Screenshot upload
    const fileInput = document.getElementById('fb-screenshot-input');
    const uploadBtn = document.getElementById('fb-screenshot-btn');
    const statusEl = document.getElementById('fb-upload-status');
    const preview = document.getElementById('fb-photo-preview');
    const previewImg = document.getElementById('fb-preview-img');
    const changeBtn = document.getElementById('fb-change-btn');

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        uploadBtn.disabled = true;
        statusEl.textContent = '⏳ Subiendo...';

        try {
            const url = await urUploadToCloudinary(file);
            feedbackScreenshotUrl = url;
            previewImg.src = url;
            preview.style.display = 'block';
            uploadBtn.style.display = 'none';
            statusEl.textContent = '';
        } catch {
            showFeedbackError('Error al subir la imagen. Inténtalo de nuevo.');
            uploadBtn.disabled = false;
            statusEl.textContent = '';
        }
    });

    changeBtn.addEventListener('click', () => {
        preview.style.display = 'none';
        uploadBtn.style.display = 'inline-block';
        uploadBtn.disabled = false;
        feedbackScreenshotUrl = null;
        fileInput.value = '';
    });

    // Close on backdrop click
    document.getElementById('feedback-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'feedback-overlay') closeFeedbackForm();
    });

    document.getElementById('fb-submit-btn').addEventListener('click', submitFeedback);
}

async function submitFeedback() {
    const type = document.getElementById('fb-type').value;
    const description = document.getElementById('fb-description').value.trim();
    const email = document.getElementById('fb-email').value.trim();
    const wantsUpdates = document.getElementById('fb-wants-updates').checked;
    const availableFollowup = document.getElementById('fb-available-followup').checked;

    if (!type) { showFeedbackError('Por favor selecciona el tipo de feedback'); return; }
    if (!description) { showFeedbackError('Por favor describe tu feedback'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showFeedbackError('Email inválido'); return;
    }

    const submitBtn = document.getElementById('fb-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Enviando...';

    const browserInfo = (() => {
        try {
            const ua = navigator.userAgent;
            const lang = navigator.language || '';
            const inner = ua.match(/\(([^)]+)\)/)?.[1] || '';
            return `${inner} | ${lang}`.slice(0, 200);
        } catch { return ''; }
    })();

    const payload = {
        feedback_type: type,
        description,
        screenshot_url: feedbackScreenshotUrl || '',
        email: email || null,
        wants_updates: wantsUpdates,
        available_for_followup: availableFollowup,
        page_url: window.location.href,
        browser_info: browserInfo,
        map_location: feedbackMapContext || {},
    };

    try {
        const res = await fetch(FEEDBACK_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Error al enviar feedback');
        }

        closeFeedbackForm();
        showFeedbackToast('¡Gracias por tu feedback! Lo revisaremos pronto.');
    } catch (err) {
        showFeedbackError(err.message || 'Error al enviar. Inténtalo de nuevo.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Feedback';
    }
}

function showFeedbackError(message) {
    const el = document.getElementById('fb-error');
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function showFeedbackToast(message) {
    const toast = document.createElement('div');
    toast.className = 'feedback-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Wire up feedback button
document.getElementById('feedback-btn').addEventListener('click', openFeedbackForm);
