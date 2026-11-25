const SUPABASE_URL = "https://bpqerikuqclkduumffas.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwcWVyaWt1cWNsa2R1dW1mZmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0NDkwOTcsImV4cCI6MjExMTAyNTA5N30.k30POhTiLBu5qEogtuLOIACn5MlqZBRvnYC3032B1j0";

const SUPABASE_TABLE = 'marely_aquino_flores';
const SUPABASE_BUCKET = 'expediente_digital';

/*Del lado del Back end:  
❖ Crear nuevo proyecto 
❖ En SQL Editor: realizar el código para la base de datos, el nombre de la tabla será su nombre, posteriormente ejecutar el código. 
❖ Se almacenará información, documentos y fotos. 
❖ En el apartado de Table Editor se muestran los datos del front end. 
❖ En el apartado de Database se observará el esquema de la tabla. 
❖ Para vincular la base de datos a Visual Studio Code utilizarán: SUPABASE_URL y SUPABASE_KEY (explicado en clase).  

Manejo de Sesiones: 
❖ Inicio de sesión  
❖ Verifica si el usuario ya inició sesión previamente y mantiene conectado sin pedir credenciales nuevamente. 
❖ Cierre de sesión 
❖ Protección de sesión (verifica si existe una sesión iniciada).  

Manejo de Peticiones Web: 
❖ Comunicación entre el navegador y el servidor (base de datos); esto debe estar en su .js: async / await. 
❖ Peticiones de la BD (tablas). 
❖ Peticiones de Almacenamiento. ❖ Manejo de Errores */

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== ESTADO DE LA APLICACIÓN ====================
let currentUser = null;
let allDocuments = [];
let activeFolder = 'Todas';
let searchQuery = '';

// ==================== REFERENCIAS DEL DOM ====================
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authAlert = document.getElementById('auth-alert');
const appAlert = document.getElementById('app-alert');

const loginForm = document.getElementById('login-form');
const btnRegister = document.getElementById('btn-register');
const btnLogout = document.getElementById('btn-logout');
const userEmailBadge = document.getElementById('user-email-badge');

const btnToggleMenu = document.getElementById('btn-toggle-menu');
const btnCloseSidebar = document.getElementById('btn-close-sidebar');
const sidebarMenu = document.getElementById('sidebar-menu');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');

const folderList = document.getElementById('folder-list');
const currentFolderTitle = document.getElementById('current-folder-title');
const searchInput = document.getElementById('search-input');
const documentsGrid = document.getElementById('documents-grid');

const btnOpenNew = document.getElementById('btn-open-new');
const docModalEl = document.getElementById('docModal');
const docModalLabel = document.getElementById('docModalLabel');
const docForm = document.getElementById('doc-form');
const docIdInput = document.getElementById('doc-id');
const docOldPathInput = document.getElementById('doc-old-path');
const docTituloInput = document.getElementById('doc-titulo');
const docTipoInput = document.getElementById('doc-tipo');
const docCarpetaInput = document.getElementById('doc-carpeta');
const docFileInput = document.getElementById('doc-file');
const fileHelpText = document.getElementById('file-help-text');
const btnSaveDoc = document.getElementById('btn-save-doc');

const previewModalEl = document.getElementById('previewModal');
const previewTitle = document.getElementById('preview-title');
const previewBody = document.getElementById('preview-body');
const previewDownload = document.getElementById('preview-download');

// ==================== UTILIDADES DE UI Y MODALES ====================
function showAlert(targetEl, message, type = 'danger') {
    if (!targetEl) return;
    targetEl.className = `alert alert-${type}`;
    targetEl.textContent = message;
    targetEl.classList.remove('d-none');
}

function hideAlert(targetEl) {
    if (!targetEl) return;
    targetEl.classList.add('d-none');
    targetEl.textContent = '';
}

function openModal(modalElement) {
    if (!modalElement) return;
    modalElement.classList.add('is-open');
    modalElement.classList.add('show');
    modalElement.removeAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalElement) {
    if (!modalElement) return;
    modalElement.classList.remove('is-open');
    modalElement.classList.remove('show');
    modalElement.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal.is-open')) {
        document.body.style.overflow = '';
    }
}

function toggleSidebar() {
    if (!sidebarMenu) return;
    if (window.innerWidth < 768) {
        const opening = !sidebarMenu.classList.contains('is-open-mobile');
        sidebarMenu.classList.toggle('is-open-mobile', opening);
        sidebarBackdrop?.classList.toggle('show', opening);
    } else {
        sidebarMenu.classList.toggle('is-collapsed');
    }
}

function closeMobileSidebar() {
    sidebarMenu?.classList.remove('is-open-mobile');
    sidebarBackdrop?.classList.remove('show');
}

function sanitizeFileName(name) {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_');
}

function escapeHtml(text = '') {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==================== MANEJO DE SESIÓN ====================
async function checkInitialSession() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        if (data?.session?.user) {
            await handleAuthenticatedUser(data.session.user);
        } else {
            showAuthView();
        }
    } catch (err) {
        console.error('Error verificando sesión:', err);
        showAuthView();
        showAlert(authAlert, 'No se pudo verificar la sesión: ' + err.message, 'warning');
    }
}

async function handleAuthenticatedUser(user) {
    currentUser = user;
    userEmailBadge.textContent = user.email || 'Sesión activa';
    authContainer.classList.add('d-none');
    appContainer.classList.remove('d-none');
    hideAlert(authAlert);
    hideAlert(appAlert);
    await fetchDocuments();
}

function showAuthView() {
    currentUser = null;
    allDocuments = [];
    appContainer.classList.add('d-none');
    authContainer.classList.remove('d-none');
    if (documentsGrid) documentsGrid.innerHTML = '';
}

loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(authAlert);

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data?.user) {
            await handleAuthenticatedUser(data.user);
        }
    } catch (err) {
        showAlert(authAlert, 'Error al iniciar sesión: ' + err.message, 'danger');
    }
});

btnRegister?.addEventListener('click', async () => {
    hideAlert(authAlert);

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || password.length < 6) {
        showAlert(authAlert, 'Ingresa un correo válido y una contraseña de al menos 6 caracteres.', 'warning');
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;

        if (data?.session?.user) {
            await handleAuthenticatedUser(data.session.user);
        } else {
            showAlert(authAlert, 'Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.', 'success');
        }
    } catch (err) {
        showAlert(authAlert, 'No se pudo crear la cuenta: ' + err.message, 'danger');
    }
});

btnLogout?.addEventListener('click', async () => {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        showAuthView();
    } catch (err) {
        showAlert(appAlert, 'Error al cerrar sesión: ' + err.message, 'danger');
    }
});

supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
        if (!currentUser || currentUser.id !== session.user.id) {
            await handleAuthenticatedUser(session.user);
        }
    } else if (currentUser) {
        showAuthView();
    }
});

// ==================== PETICIONES A BASE DE DATOS Y STORAGE ====================
async function fetchDocuments() {
    if (!currentUser) return;

    try {
        const { data, error } = await supabaseClient
            .from(SUPABASE_TABLE)
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        allDocuments = Array.isArray(data) ? data : [];
        renderDocuments();
    } catch (err) {
        console.error('Error al consultar documentos:', err);
        showAlert(appAlert, 'Error al cargar documentos desde Supabase: ' + err.message, 'danger');
    }
}

async function uploadFileToStorage(file) {
    const cleanName = sanitizeFileName(file.name);
    const filePath = `${currentUser.id}/${Date.now()}_${cleanName}`;

    const { error } = await supabaseClient.storage
        .from(SUPABASE_BUCKET)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) throw error;

    const { data: urlData } = supabaseClient.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(filePath);

    return {
        archivoPath: filePath,
        archivoUrl: urlData?.publicUrl || '',
        nombreArchivo: file.name
    };
}

async function deleteFileFromStorage(filePath) {
    if (!filePath) return;
    const { error } = await supabaseClient.storage
        .from(SUPABASE_BUCKET)
        .remove([filePath]);

    if (error) {
        console.warn('No se pudo eliminar el archivo de Storage:', error.message);
    }
}

// ==================== CREAR Y EDITAR DOCUMENTOS ====================
function resetDocModalForCreate() {
    docForm.reset();
    docIdInput.value = '';
    docOldPathInput.value = '';
    docModalLabel.textContent = 'Subir Nuevo Documento';
    docFileInput.required = true;
    fileHelpText.textContent = 'Obligatorio al subir un registro nuevo (PDF, JPG, PNG o WEBP).';
}

function openDocModalForEdit(docId) {
    const doc = allDocuments.find((item) => String(item.id) === String(docId));
    if (!doc) return;

    docForm.reset();
    docIdInput.value = doc.id;
    docOldPathInput.value = doc.archivo_path || '';
    docTituloInput.value = doc.titulo || '';
    docTipoInput.value = doc.tipo_documento || '';
    docCarpetaInput.value = doc.carpeta || 'Documentos Privados';
    docModalLabel.textContent = 'Editar Documento';
    docFileInput.required = false;
    fileHelpText.textContent = 'Opcional al editar: déjalo vacío si deseas conservar el archivo actual.';
    openModal(docModalEl);
}

btnOpenNew?.addEventListener('click', () => {
    resetDocModalForCreate();
    openModal(docModalEl);
});

docForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(appAlert);

    if (!currentUser) {
        showAlert(appAlert, 'Debes iniciar sesión para guardar documentos.', 'warning');
        return;
    }

    const editingId = docIdInput.value.trim();
    const titulo = docTituloInput.value.trim();
    const tipoDocumento = docTipoInput.value;
    const carpeta = docCarpetaInput.value;
    const file = docFileInput.files[0];

    if (!titulo || !tipoDocumento || !carpeta) {
        showAlert(appAlert, 'Completa todos los campos obligatorios.', 'warning');
        return;
    }

    if (!editingId && !file) {
        showAlert(appAlert, 'Selecciona un archivo para subir.', 'warning');
        return;
    }

    btnSaveDoc.disabled = true;
    const originalBtnText = btnSaveDoc.textContent;
    btnSaveDoc.textContent = 'Guardando...';

    let newlyUploadedPath = null;

    try {
        const existingDoc = editingId
            ? allDocuments.find((d) => String(d.id) === String(editingId))
            : null;

        let archivoPath = docOldPathInput.value || existingDoc?.archivo_path || '';
        let archivoUrl = existingDoc?.archivo_url || '';
        let nombreArchivo = existingDoc?.nombre_archivo || '';

        if (file) {
            const uploaded = await uploadFileToStorage(file);
            newlyUploadedPath = uploaded.archivoPath;
            archivoPath = uploaded.archivoPath;
            archivoUrl = uploaded.archivoUrl;
            nombreArchivo = uploaded.nombreArchivo;
        }

        if (editingId) {
            const updatePayload = {
                titulo,
                tipo_documento: tipoDocumento,
                carpeta,
                archivo_url: archivoUrl,
                archivo_path: archivoPath,
                nombre_archivo: nombreArchivo
            };

            const { error } = await supabaseClient
                .from(SUPABASE_TABLE)
                .update(updatePayload)
                .eq('id', editingId)
                .eq('user_id', currentUser.id);

            if (error) throw error;

            if (file && docOldPathInput.value && docOldPathInput.value !== archivoPath) {
                await deleteFileFromStorage(docOldPathInput.value);
            }

            showAlert(appAlert, 'Documento actualizado correctamente.', 'success');
        } else {
            const insertPayload = {
                user_id: currentUser.id,
                titulo,
                tipo_documento: tipoDocumento,
                carpeta,
                archivo_url: archivoUrl,
                archivo_path: archivoPath,
                nombre_archivo: nombreArchivo
            };

            const { error } = await supabaseClient
                .from(SUPABASE_TABLE)
                .insert([insertPayload]);

            if (error) throw error;

            showAlert(appAlert, 'Documento subido y guardado correctamente.', 'success');
        }

        closeModal(docModalEl);
        await fetchDocuments();
    } catch (err) {
        console.error('Error guardando documento:', err);
        if (newlyUploadedPath) {
            await deleteFileFromStorage(newlyUploadedPath);
        }
        showAlert(appAlert, 'Error al guardar el documento: ' + err.message, 'danger');
    } finally {
        btnSaveDoc.disabled = false;
        btnSaveDoc.textContent = originalBtnText;
    }
});

// ==================== ELIMINAR Y VISUALIZAR DOCUMENTOS ====================
async function deleteDocument(docId) {
    const doc = allDocuments.find((item) => String(item.id) === String(docId));
    if (!doc) return;

    const confirmed = window.confirm(`¿Seguro que deseas eliminar "${doc.titulo}"?`);
    if (!confirmed) return;

    hideAlert(appAlert);

    try {
        const { error } = await supabaseClient
            .from(SUPABASE_TABLE)
            .delete()
            .eq('id', doc.id)
            .eq('user_id', currentUser.id);

        if (error) throw error;

        if (doc.archivo_path) {
            await deleteFileFromStorage(doc.archivo_path);
        }

        showAlert(appAlert, 'Documento eliminado correctamente.', 'success');
        await fetchDocuments();
    } catch (err) {
        console.error('Error eliminando documento:', err);
        showAlert(appAlert, 'No se pudo eliminar el documento: ' + err.message, 'danger');
    }
}

function getFileUrl(doc) {
    if (doc.archivo_url) return doc.archivo_url;
    if (!doc.archivo_path) return '#';
    const { data } = supabaseClient.storage.from(SUPABASE_BUCKET).getPublicUrl(doc.archivo_path);
    return data?.publicUrl || '#';
}

function openPreviewModal(docId) {
    const doc = allDocuments.find((item) => String(item.id) === String(docId));
    if (!doc) return;

    const url = getFileUrl(doc);
    const refName = (doc.nombre_archivo || doc.archivo_path || '').toLowerCase();
    const isPdf = refName.endsWith('.pdf') || url.toLowerCase().includes('.pdf');

    previewTitle.textContent = `${doc.tipo_documento || 'Documento'} — ${doc.titulo || ''}`;
    previewDownload.href = url;

    if (isPdf) {
        previewBody.innerHTML = `<iframe src="${escapeHtml(url)}" style="width: 100%; height: 72vh;" title="Vista previa PDF"></iframe>`;
    } else {
        previewBody.innerHTML = `<img src="${escapeHtml(url)}" alt="${escapeHtml(doc.titulo)}" style="max-width: 100%; max-height: 72vh; object-fit: contain; padding: 1rem;">`;
    }

    openModal(previewModalEl);
}

// ==================== FILTRADO, BUSCADOR Y RENDERIZADO ====================
function renderDocuments() {
    if (!documentsGrid) return;

    const term = searchQuery.trim().toLowerCase();

    const filtered = allDocuments.filter((doc) => {
        const matchesFolder = activeFolder === 'Todas' || doc.carpeta === activeFolder;
        if (!matchesFolder) return false;

        if (!term) return true;
        const titulo = (doc.titulo || '').toLowerCase();
        const tipo = (doc.tipo_documento || '').toLowerCase();
        const carpeta = (doc.carpeta || '').toLowerCase();
        const nombreArchivo = (doc.nombre_archivo || '').toLowerCase();
        return titulo.includes(term) || tipo.includes(term) || carpeta.includes(term) || nombreArchivo.includes(term);
    });

    if (filtered.length === 0) {
        documentsGrid.innerHTML = `
            <div class="col-12">
                <div class="card border-0 shadow-sm p-4 text-center text-muted">
                    <p class="mb-1 fw-semibold">No hay documentos para mostrar en esta vista.</p>
                    <small>Usa el botón <strong>+ Subir Documento</strong> o cambia de carpeta/búsqueda.</small>
                </div>
            </div>
        `;
        return;
    }

    documentsGrid.innerHTML = filtered
        .map((doc) => {
            const fecha = doc.created_at
                ? new Date(doc.created_at).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                  })
                : '';

            return `
                <div class="col-sm-6 col-lg-4">
                    <div class="card doc-card shadow-sm border">
                        <div class="card-body">
                            <div>
                                <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                                    <span class="badge bg-pastel-primary text-dark">${escapeHtml(doc.tipo_documento || 'Documento')}</span>
                                    <small class="text-muted">${escapeHtml(fecha)}</small>
                                </div>
                                <h6 class="card-title fw-bold mb-1">${escapeHtml(doc.titulo || 'Sin título')}</h6>
                                <p class="card-text small text-muted mb-1">📁 ${escapeHtml(doc.carpeta || '')}</p>
                                <p class="card-text small text-muted mb-0">📄 ${escapeHtml(doc.nombre_archivo || '')}</p>
                            </div>

                            <div class="d-flex flex-wrap gap-2 pt-2 border-top">
                                <button type="button" class="btn btn-sm btn-outline-primary flex-fill" data-action="view" data-id="${escapeHtml(doc.id)}">
                                    Ver
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="${escapeHtml(doc.id)}">
                                    Editar
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${escapeHtml(doc.id)}">
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        })
        .join('');
}

folderList?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-folder]');
    if (!btn) return;

    activeFolder = btn.getAttribute('data-folder') || 'Todas';
    folderList.querySelectorAll('[data-folder]').forEach((item) => {
        item.classList.toggle('active', item === btn);
    });

    currentFolderTitle.textContent = activeFolder === 'Todas' ? 'Todos los archivos' : activeFolder;
    renderDocuments();
    closeMobileSidebar();
});

searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value || '';
    renderDocuments();
});

documentsGrid?.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('button[data-action]');
    if (!actionBtn) return;

    const action = actionBtn.getAttribute('data-action');
    const docId = actionBtn.getAttribute('data-id');

    if (action === 'view') openPreviewModal(docId);
    if (action === 'edit') openDocModalForEdit(docId);
    if (action === 'delete') deleteDocument(docId);
});

// ==================== EVENTOS DE MENÚ Y CIERRE DE MODALES ====================
btnToggleMenu?.addEventListener('click', toggleSidebar);
btnCloseSidebar?.addEventListener('click', closeMobileSidebar);
sidebarBackdrop?.addEventListener('click', closeMobileSidebar);

window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
        sidebarBackdrop?.classList.remove('show');
        sidebarMenu?.classList.remove('is-open-mobile');
    }
});

document.getElementById('btn-close-doc-modal')?.addEventListener('click', () => closeModal(docModalEl));
document.getElementById('btn-cancel-doc-modal')?.addEventListener('click', () => closeModal(docModalEl));
document.getElementById('btn-close-preview-modal')?.addEventListener('click', () => closeModal(previewModalEl));
document.getElementById('btn-close-preview-footer')?.addEventListener('click', () => closeModal(previewModalEl));

[docModalEl, previewModalEl].forEach((modalEl) => {
    modalEl?.addEventListener('click', (e) => {
        if (e.target === modalEl) {
            closeModal(modalEl);
        }
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal(docModalEl);
        closeModal(previewModalEl);
        closeMobileSidebar();
    }
});

// ==================== ARRANQUE ====================
checkInitialSession();