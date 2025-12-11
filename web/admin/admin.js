// State
let isLoggedIn = false;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const adminDashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const adminUsername = document.getElementById('admin-username');
const adminPassword = document.getElementById('admin-password');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const galleriesList = document.getElementById('galleries-list');
const createGalleryBtn = document.getElementById('create-gallery-btn');
const createModal = document.getElementById('create-modal');
const createGalleryForm = document.getElementById('create-gallery-form');
const newGalleryName = document.getElementById('new-gallery-name');
const newGalleryPassword = document.getElementById('new-gallery-password');
const newGalleryViewPassword = document.getElementById('new-gallery-view-password');
const createCancel = document.getElementById('create-cancel');
const passwordModal = document.getElementById('password-modal');
const setPasswordForm = document.getElementById('set-password-form');
const passwordGalleryName = document.getElementById('password-gallery-name');
const passwordInput = document.getElementById('password-input');
const passwordCancel = document.getElementById('password-cancel');
const passwordModalTitle = document.getElementById('password-modal-title');
const passwordSubmitBtn = document.getElementById('password-submit-btn');
const removePasswordBtn = document.getElementById('remove-password-btn');
const passwordTypeInput = document.getElementById('password-type');
const changePasswordBtn = document.getElementById('change-password-btn');
const changeAdminPasswordModal = document.getElementById('change-admin-password-modal');
const changeAdminPasswordConfirm = document.getElementById('change-admin-password-confirm');
const changeAdminPasswordCancel = document.getElementById('change-admin-password-cancel');
const dataPrivacyEditor = document.getElementById('dataprivacy-editor');
const imprintEditor = document.getElementById('imprint-editor');
const saveDataPrivacyBtn = document.getElementById('save-dataprivacy-btn');
const saveImprintBtn = document.getElementById('save-imprint-btn');
const dataPrivacyStatus = document.getElementById('dataprivacy-status');
const imprintStatus = document.getElementById('imprint-status');
const dataPrivacyCode = document.getElementById('dataprivacy-code');
const imprintCode = document.getElementById('imprint-code');
const dataPrivacyToggle = document.getElementById('dataprivacy-toggle');
const imprintToggle = document.getElementById('imprint-toggle');
const settingsForm = document.getElementById('settings-form');
const maxImageWidthInput = document.getElementById('max-image-width');
const maxImageFileSizeInput = document.getElementById('max-image-file-size');
const maxFileSizeInput = document.getElementById('max-file-size');
const contactEmailInput = document.getElementById('contact-email');
const settingsStatus = document.getElementById('settings-status');
const maxImageFileSizeMb = document.getElementById('max-image-file-size-mb');
const maxFileSizeMb = document.getElementById('max-file-size-mb');
const allowPublicGalleryCreationInput = document.getElementById('allow-public-gallery-creation');
const publicMaxGalleryBytesInput = document.getElementById('public-max-gallery-bytes');
const publicMaxGalleryBytesMb = document.getElementById('public-max-gallery-bytes-mb');
const publicMaxPhotosInput = document.getElementById('public-max-photos');
const publicLifetimeDaysInput = document.getElementById('public-lifetime-days');
const publicViewerUploadsInput = document.getElementById('public-viewer-uploads');
const defaultMaxGalleryBytesInput = document.getElementById('default-max-gallery-bytes');
const defaultMaxGalleryBytesMb = document.getElementById('default-max-gallery-bytes-mb');
const defaultMaxPhotosInput = document.getElementById('default-max-photos');
const defaultLifetimeDaysInput = document.getElementById('default-lifetime-days');
const defaultViewerUploadsInput = document.getElementById('default-viewer-uploads');

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    
    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = adminUsername.value.trim();
    const password = adminPassword.value.trim();
    
    if (!username || !password) {
        showError('Please enter username and password');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('action', 'login');
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await fetch('api.php?action=login', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            isLoggedIn = true;
            loginScreen.style.display = 'none';
            adminDashboard.style.display = 'block';
            loadGalleries();
            loadPageContent();
            loadSettings();
        } else {
            showError(data.error || 'Invalid credentials');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Failed to login');
    }
        });
    }
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
    try {
        await fetch('api.php?action=logout');
        isLoggedIn = false;
        loginScreen.style.display = 'flex';
        adminDashboard.style.display = 'none';
        adminUsername.value = '';
        adminPassword.value = '';
        loginError.style.display = 'none';
    } catch (error) {
        console.error('Logout error:', error);
    }
        });
    }
    
    // Create gallery
    if (createGalleryBtn) {
        createGalleryBtn.addEventListener('click', () => {
            newGalleryName.value = '';
            newGalleryPassword.value = '';
            if (newGalleryViewPassword) newGalleryViewPassword.value = '';
            createModal.style.display = 'flex';
        });
    }
    
    if (createCancel) {
        createCancel.addEventListener('click', () => {
            createModal.style.display = 'none';
        });
    }
    
    if (createGalleryForm) {
        createGalleryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = newGalleryName.value.trim();
            const password = newGalleryPassword.value.trim();
            const viewPassword = newGalleryViewPassword ? newGalleryViewPassword.value.trim() : '';
            
            if (!name) {
                alert('Gallery name is required');
                return;
            }
            
            try {
                const formData = new FormData();
                formData.append('action', 'create_gallery');
                formData.append('name', name);
                if (password) {
                    formData.append('password', password);
                }
                if (viewPassword) {
                    formData.append('view_password', viewPassword);
                }
                
                const response = await fetch('api.php?action=create_gallery', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    createModal.style.display = 'none';
                    loadGalleries();
                } else {
                    alert('Error: ' + (data.error || 'Failed to create gallery'));
                }
            } catch (error) {
                console.error('Create gallery error:', error);
                alert('Failed to create gallery');
            }
        });
    }
    
    // Set password
    if (passwordCancel) {
        passwordCancel.addEventListener('click', () => {
            passwordModal.style.display = 'none';
        });
    }
    
    if (setPasswordForm) {
        setPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const gallery = passwordGalleryName.value;
            const password = passwordInput.value.trim();
            const type = passwordTypeInput ? passwordTypeInput.value : 'edit';
            
            // Allow empty password to remove it
            try {
                const formData = new FormData();
                formData.append('action', 'set_password');
                formData.append('gallery', gallery);
                formData.append('password', password);
                formData.append('type', type);
                
                const response = await fetch('api.php?action=set_password', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    if (passwordModal) passwordModal.style.display = 'none';
                    loadGalleries();
                } else {
                    alert('Error: ' + (data.error || 'Failed to set password'));
                }
            } catch (error) {
                console.error('Set password error:', error);
                alert('Failed to set password');
            }
        });
    }
    
    // Remove password button
    if (removePasswordBtn) {
        removePasswordBtn.addEventListener('click', async () => {
            const gallery = passwordGalleryName.value;
            const type = passwordTypeInput ? passwordTypeInput.value : 'edit';
            
            if (!confirm(`Are you sure you want to remove the ${type} password for gallery "${gallery}"?`)) {
                return;
            }
            
            try {
                const formData = new FormData();
                formData.append('action', 'set_password');
                formData.append('gallery', gallery);
                formData.append('password', ''); // Empty password to remove
                formData.append('type', type);
                
                const response = await fetch('api.php?action=set_password', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    if (passwordModal) passwordModal.style.display = 'none';
                    loadGalleries();
                } else {
                    alert('Error: ' + (data.error || 'Failed to remove password'));
                }
            } catch (error) {
                console.error('Remove password error:', error);
                alert('Failed to remove password');
            }
        });
    }
    
    // Close modals on outside click
    if (createModal) {
        createModal.addEventListener('click', (e) => {
            if (e.target === createModal) {
                createModal.style.display = 'none';
            }
        });
    }
    
    if (passwordModal) {
        passwordModal.addEventListener('click', (e) => {
            if (e.target === passwordModal) {
                passwordModal.style.display = 'none';
            }
        });
    }
    
    // Change admin password
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => {
            if (changeAdminPasswordModal) {
                changeAdminPasswordModal.style.display = 'flex';
            }
        });
    }
    
    if (changeAdminPasswordCancel) {
        changeAdminPasswordCancel.addEventListener('click', () => {
            if (changeAdminPasswordModal) {
                changeAdminPasswordModal.style.display = 'none';
            }
        });
    }
    
    if (changeAdminPasswordConfirm) {
        changeAdminPasswordConfirm.addEventListener('click', async () => {
            try {
                const formData = new FormData();
                formData.append('action', 'change_admin_password');
                
                const response = await fetch('api.php?action=change_admin_password', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Reload the page
                    window.location.reload();
                } else {
                    alert('Error: ' + (data.error || 'Failed to reset credentials'));
                }
            } catch (error) {
                console.error('Change admin password error:', error);
                alert('Failed to reset credentials');
            }
        });
    }
    
    if (changeAdminPasswordModal) {
        changeAdminPasswordModal.addEventListener('click', (e) => {
            if (e.target === changeAdminPasswordModal) {
                changeAdminPasswordModal.style.display = 'none';
            }
        });
    }

    if (saveDataPrivacyBtn && dataPrivacyEditor) {
        saveDataPrivacyBtn.addEventListener('click', () => savePage('dataprivacy.html', dataPrivacyEditor, dataPrivacyStatus, dataPrivacyCode));
    }

    if (saveImprintBtn && imprintEditor) {
        saveImprintBtn.addEventListener('click', () => savePage('imprint.html', imprintEditor, imprintStatus, imprintCode));
    }

    if (dataPrivacyToggle && dataPrivacyEditor && dataPrivacyCode) {
        dataPrivacyToggle.addEventListener('click', () => toggleEditor(dataPrivacyEditor, dataPrivacyCode, dataPrivacyToggle));
    }

    if (imprintToggle && imprintEditor && imprintCode) {
        imprintToggle.addEventListener('click', () => toggleEditor(imprintEditor, imprintCode, imprintToggle));
    }

    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveSettings();
        });
    }

    if (maxImageFileSizeInput) {
        maxImageFileSizeInput.addEventListener('input', () => updateSizeDisplay(maxImageFileSizeInput, maxImageFileSizeMb));
    }

    if (maxFileSizeInput) {
        maxFileSizeInput.addEventListener('input', () => updateSizeDisplay(maxFileSizeInput, maxFileSizeMb));
    }

    if (publicMaxGalleryBytesInput) {
        publicMaxGalleryBytesInput.addEventListener('input', () => updateSizeDisplay(publicMaxGalleryBytesInput, publicMaxGalleryBytesMb));
    }

    if (defaultMaxGalleryBytesInput) {
        defaultMaxGalleryBytesInput.addEventListener('input', () => updateSizeDisplay(defaultMaxGalleryBytesInput, defaultMaxGalleryBytesMb));
    }
}

// Check login status
async function checkLoginStatus() {
    // Try to load galleries - if it works, we're logged in
    try {
        const response = await fetch('api.php?action=list_galleries');
        if (response.status === 200) {
            const data = await response.json();
            if (data.success) {
                isLoggedIn = true;
                loginScreen.style.display = 'none';
                adminDashboard.style.display = 'block';
                loadGalleries();
                loadPageContent();
                loadSettings();
                return;
            }
        }
    } catch (error) {
        // Not logged in
    }
    
    loginScreen.style.display = 'flex';
    adminDashboard.style.display = 'none';
}

// Load galleries
async function loadGalleries() {
    try {
        const response = await fetch('api.php?action=list_galleries');
        const data = await response.json();
        
        if (data.success) {
            displayGalleries(data.galleries);
        } else {
            if (response.status === 401) {
                // Not logged in
                isLoggedIn = false;
                loginScreen.style.display = 'flex';
                adminDashboard.style.display = 'none';
            } else {
                showError(data.error || 'Failed to load galleries');
            }
        }
    } catch (error) {
        console.error('Error loading galleries:', error);
        if (error.message.includes('401')) {
            isLoggedIn = false;
            loginScreen.style.display = 'flex';
            adminDashboard.style.display = 'none';
        }
    }
}

// Load legal pages
async function loadPageContent() {
    await Promise.all([
        loadPage('dataprivacy.html', dataPrivacyEditor, dataPrivacyStatus, dataPrivacyCode),
        loadPage('imprint.html', imprintEditor, imprintStatus, imprintCode)
    ]);
}

async function loadSettings() {
    if (!settingsStatus) return;
    setStatus(settingsStatus, 'Loading...');
    try {
        const response = await fetch('api.php?action=get_settings');
        const data = await response.json();
        if (response.ok && data.success && data.settings) {
            const {
                maxImageWidth,
                maxImageFileSize,
                maxFileSize,
                contactEmail,
                allowPublicGalleryCreation,
                publicDefaultViewerUploadsEnabled,
                publicDefaultMaxGalleryBytes,
                publicDefaultMaxPhotos,
                publicDefaultLifetimeDays,
                defaultViewerUploadsEnabled,
                defaultMaxGalleryBytes,
                defaultMaxPhotos,
                defaultLifetimeDays
            } = data.settings;
            if (maxImageWidthInput) maxImageWidthInput.value = maxImageWidth ?? '';
            if (maxImageFileSizeInput) maxImageFileSizeInput.value = maxImageFileSize ?? '';
            if (maxFileSizeInput) maxFileSizeInput.value = maxFileSize ?? '';
            if (contactEmailInput) contactEmailInput.value = contactEmail ?? '';
            if (allowPublicGalleryCreationInput) allowPublicGalleryCreationInput.checked = !!allowPublicGalleryCreation;
            if (publicMaxGalleryBytesInput) publicMaxGalleryBytesInput.value = publicDefaultMaxGalleryBytes ?? '';
            if (publicMaxPhotosInput) publicMaxPhotosInput.value = publicDefaultMaxPhotos ?? '';
            if (publicLifetimeDaysInput) publicLifetimeDaysInput.value = publicDefaultLifetimeDays ?? '';
            if (publicViewerUploadsInput) publicViewerUploadsInput.checked = !!publicDefaultViewerUploadsEnabled;
            if (defaultMaxGalleryBytesInput) defaultMaxGalleryBytesInput.value = defaultMaxGalleryBytes ?? '';
            if (defaultMaxPhotosInput) defaultMaxPhotosInput.value = defaultMaxPhotos ?? '';
            if (defaultLifetimeDaysInput) defaultLifetimeDaysInput.value = defaultLifetimeDays ?? '';
            if (defaultViewerUploadsInput) defaultViewerUploadsInput.checked = !!defaultViewerUploadsEnabled;
            updateSizeDisplay(maxImageFileSizeInput, maxImageFileSizeMb);
            updateSizeDisplay(maxFileSizeInput, maxFileSizeMb);
            updateSizeDisplay(publicMaxGalleryBytesInput, publicMaxGalleryBytesMb);
            updateSizeDisplay(defaultMaxGalleryBytesInput, defaultMaxGalleryBytesMb);
            setStatus(settingsStatus, 'Loaded');
        } else {
            setStatus(settingsStatus, data.error || 'Failed to load', true);
        }
    } catch (error) {
        console.error('Load settings error:', error);
        setStatus(settingsStatus, 'Failed to load', true);
    }
}

async function saveSettings() {
    if (!settingsStatus) return;
    setStatus(settingsStatus, 'Saving...');
    try {
        const formData = new FormData();
        formData.append('action', 'save_settings');
        if (maxImageWidthInput) formData.append('max_image_width', maxImageWidthInput.value || '0');
        if (maxImageFileSizeInput) formData.append('max_image_file_size', maxImageFileSizeInput.value || '0');
        if (maxFileSizeInput) formData.append('max_file_size', maxFileSizeInput.value || '0');
        if (contactEmailInput) formData.append('contact_email', contactEmailInput.value || '');
        if (allowPublicGalleryCreationInput) formData.append('allow_public_gallery_creation', allowPublicGalleryCreationInput.checked ? '1' : '0');
        if (publicMaxGalleryBytesInput) formData.append('public_default_max_gallery_bytes', publicMaxGalleryBytesInput.value || '0');
        if (publicMaxPhotosInput) formData.append('public_default_max_photos', publicMaxPhotosInput.value || '0');
        if (publicLifetimeDaysInput) formData.append('public_default_lifetime_days', publicLifetimeDaysInput.value || '0');
        if (publicViewerUploadsInput) formData.append('public_default_viewer_uploads_enabled', publicViewerUploadsInput.checked ? '1' : '0');
        if (defaultMaxGalleryBytesInput) formData.append('default_max_gallery_bytes', defaultMaxGalleryBytesInput.value || '0');
        if (defaultMaxPhotosInput) formData.append('default_max_photos', defaultMaxPhotosInput.value || '0');
        if (defaultLifetimeDaysInput) formData.append('default_lifetime_days', defaultLifetimeDaysInput.value || '0');
        if (defaultViewerUploadsInput) formData.append('default_viewer_uploads_enabled', defaultViewerUploadsInput.checked ? '1' : '0');

        const response = await fetch('api.php?action=save_settings', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (response.ok && data.success) {
            setStatus(settingsStatus, 'Saved');
        } else {
            setStatus(settingsStatus, data.error || 'Save failed', true);
        }
    } catch (error) {
        console.error('Save settings error:', error);
        setStatus(settingsStatus, 'Save failed', true);
    }
}

function updateSizeDisplay(inputEl, displayEl) {
    if (!inputEl || !displayEl) return;
    const bytes = parseInt(inputEl.value, 10);
    const mb = isNaN(bytes) ? 0 : bytes / (1024 * 1024);
    displayEl.textContent = `≈ ${mb.toFixed(2)} MB`;
}

async function loadPage(page, editorEl, statusEl, codeEl) {
    if (!editorEl || !statusEl) return;
    setStatus(statusEl, 'Loading...');
    try {
        const response = await fetch(`api.php?action=get_page&page=${encodeURIComponent(page)}`);
        const data = await response.json();
        if (response.ok && data.success) {
            editorEl.innerHTML = data.content || '';
            if (codeEl) {
                codeEl.value = data.content || '';
            }
            setStatus(statusEl, 'Loaded');
        } else {
            setStatus(statusEl, data.error || 'Failed to load', true);
        }
    } catch (error) {
        console.error('Load page error:', error);
        setStatus(statusEl, 'Failed to load', true);
    }
}

async function savePage(page, editorEl, statusEl, codeEl) {
    if (!editorEl || !statusEl) return;
    setStatus(statusEl, 'Saving...');
    try {
        const formData = new FormData();
        formData.append('action', 'save_page');
        formData.append('page', page);
        const useCode = codeEl && codeEl.style.display !== 'none';
        const content = useCode ? codeEl.value : editorEl.innerHTML;
        formData.append('content', content);
        
        const response = await fetch('api.php?action=save_page', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (response.ok && data.success) {
            setStatus(statusEl, 'Saved');
        } else {
            setStatus(statusEl, data.error || 'Save failed', true);
        }
    } catch (error) {
        console.error('Save page error:', error);
        setStatus(statusEl, 'Save failed', true);
    }
}

function setStatus(el, text, isError = false) {
    if (!el) return;
    el.textContent = text;
    el.style.color = isError ? 'var(--error)' : 'var(--text-secondary)';
    if (!isError) {
        setTimeout(() => {
            el.textContent = '';
        }, 2000);
    }
}

function toggleEditor(editorEl, codeEl, toggleBtn) {
    if (!editorEl || !codeEl || !toggleBtn) return;
    const codeVisible = codeEl.style.display !== 'none';
    if (!codeVisible) {
        // Switch to code view
        codeEl.value = editorEl.innerHTML;
        codeEl.style.display = 'block';
        editorEl.style.display = 'none';
        toggleBtn.textContent = 'Visual';
    } else {
        // Switch to visual
        editorEl.innerHTML = codeEl.value;
        editorEl.style.display = 'block';
        codeEl.style.display = 'none';
        toggleBtn.textContent = 'HTML';
    }
}

function openPasswordModal(type, galleryName, hasPassword) {
    if (passwordGalleryName) passwordGalleryName.value = galleryName;
    if (passwordTypeInput) passwordTypeInput.value = type;
    if (passwordInput) {
        passwordInput.required = false;
        passwordInput.value = '';
        passwordInput.placeholder = hasPassword
            ? `New ${type} password (leave empty to remove)`
            : `New ${type} password (optional)`;
    }
    if (passwordModalTitle) {
        passwordModalTitle.textContent = type === 'view' ? 'Viewer Password' : 'Editor Password';
    }
    if (passwordSubmitBtn) {
        passwordSubmitBtn.textContent = hasPassword ? 'Change Password' : 'Set Password';
    }
    if (removePasswordBtn) {
        removePasswordBtn.style.display = hasPassword ? 'block' : 'none';
    }
    if (passwordModal) passwordModal.style.display = 'flex';
}

// Display galleries
function displayGalleries(galleries) {
    if (galleries.length === 0) {
        galleriesList.innerHTML = '<p style="color: var(--text-muted);">No galleries yet. Create one to get started.</p>';
        return;
    }
    
    galleriesList.innerHTML = '';
    
    galleries.forEach(gallery => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        
        const header = document.createElement('div');
        header.className = 'gallery-header-row';
        const name = document.createElement('div');
        name.className = 'gallery-name';
        const nameText = document.createElement('span');
        nameText.className = 'gallery-name-text';
        nameText.textContent = gallery.name;
        nameText.onclick = (e) => {
            e.stopPropagation();
            window.open(`../?gallery=${encodeURIComponent(gallery.name)}`, '_blank');
        };
        name.appendChild(nameText);
        header.appendChild(name);

        const summary = document.createElement('div');
        summary.className = 'gallery-summary';
        summary.textContent = buildGallerySummary(gallery);
        header.appendChild(summary);

        const detail = document.createElement('div');
        detail.className = 'gallery-detail';
        detail.style.display = 'none';

        const info = document.createElement('div');
        info.className = 'gallery-info';
        const hasEditPassword = gallery.hasEditPassword ?? gallery.hasPassword;
        const hasViewPassword = gallery.hasViewPassword ?? false;
        
        const badges = document.createElement('div');
        badges.className = 'badge-row';
        const viewBadge = document.createElement('span');
        viewBadge.className = hasViewPassword ? 'password-badge' : 'no-password-badge';
        viewBadge.textContent = hasViewPassword ? 'Login is needed to view' : 'Anyone can view';
        const editBadge = document.createElement('span');
        editBadge.className = hasEditPassword ? 'password-badge' : 'no-password-badge';
        let editText = 'Anyone can change/upload';
        if (hasEditPassword) {
            editText = 'Login is needed to change/upload';
        } else if (hasViewPassword) {
            editText = 'Viewer can change/upload';
        }
        editBadge.textContent = editText;
        badges.appendChild(viewBadge);
        badges.appendChild(editBadge);
        
        const meta = document.createElement('div');
        meta.className = 'gallery-meta';
        meta.innerHTML = `<span>${gallery.fileCount} file${gallery.fileCount !== 1 ? 's' : ''}</span>`;
        
        info.appendChild(badges);
        info.appendChild(meta);
        
        const actions = document.createElement('div');
        actions.className = 'gallery-actions';
        
        const showBtn = document.createElement('button');
        showBtn.className = 'btn-primary gallery-view-btn';
        showBtn.textContent = 'Show Gallery';
        showBtn.onclick = () => {
            window.open(`../?gallery=${encodeURIComponent(gallery.name)}`, '_blank');
        };
        
        const viewPasswordBtn = document.createElement('button');
        viewPasswordBtn.className = 'btn-secondary';
        viewPasswordBtn.textContent = hasViewPassword ? 'Change View Password' : 'Set View Password';
        viewPasswordBtn.onclick = () => openPasswordModal('view', gallery.name, hasViewPassword);

        const editPasswordBtn = document.createElement('button');
        editPasswordBtn.className = 'btn-secondary';
        editPasswordBtn.textContent = hasEditPassword ? 'Change Editor Password' : 'Set Editor Password';
        editPasswordBtn.onclick = () => openPasswordModal('edit', gallery.name, hasEditPassword);
        
        const renameBtn = document.createElement('button');
        renameBtn.className = 'btn-secondary';
        renameBtn.textContent = 'Rename';
        renameBtn.onclick = () => {
            const newName = prompt('Enter a new gallery name', gallery.name);
            if (!newName) {
                return;
            }
            const trimmed = newName.trim();
            if (!trimmed) {
                alert('Gallery name cannot be empty');
                return;
            }
            if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
                alert('Invalid gallery name. Use letters, numbers, underscore, or hyphen.');
                return;
            }
            if (trimmed === gallery.name) {
                alert('Please choose a different name');
                return;
            }
            const exists = galleries.some(g => g.name.toLowerCase() === trimmed.toLowerCase());
            if (exists) {
                alert('A gallery with that name already exists');
                return;
            }
            renameGallery(gallery.name, trimmed);
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => {
            if (confirm(`Are you sure you want to delete the gallery "${gallery.name}"? This cannot be undone.`)) {
                deleteGallery(gallery.name);
            }
        };
        
        actions.appendChild(showBtn);
        actions.appendChild(viewPasswordBtn);
        actions.appendChild(editPasswordBtn);
        actions.appendChild(renameBtn);
        actions.appendChild(deleteBtn);
        
        detail.appendChild(info);
        detail.appendChild(actions);
        detail.appendChild(renderGallerySettingsBlock(gallery));

        const toggleDetails = () => {
            const willOpen = detail.style.display !== 'block';
            detail.style.display = willOpen ? 'block' : 'none';
            card.classList.toggle('is-open', willOpen);
            summary.style.display = willOpen ? 'none' : 'block';
        };

        header.addEventListener('click', (event) => {
            if (name.contains(event.target)) return;
            toggleDetails();
        });

        card.addEventListener('click', (event) => {
            if (name.contains(event.target)) return;
            if (detail.contains(event.target) && detail.style.display === 'block') return;
            toggleDetails();
        });

        card.appendChild(header);
        card.appendChild(detail);
        galleriesList.appendChild(card);
    });
}

function renderGallerySettingsBlock(gallery) {
    const wrapper = document.createElement('div');
    wrapper.className = 'gallery-settings-block';
    const settings = gallery.settings || {};
    const limits = gallery.limits || {};
    const stats = limits.stats || {};

    const title = document.createElement('div');
    title.className = 'gallery-settings-title';
    title.textContent = 'Gallery limits';
    wrapper.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'gallery-settings-grid';

    const maxBytesField = document.createElement('div');
    maxBytesField.className = 'gallery-settings-field form-field';
    const maxBytesLabel = document.createElement('label');
    maxBytesLabel.textContent = 'Max size (bytes, 0 = unlimited)';
    const maxBytesHint = document.createElement('span');
    maxBytesHint.className = 'field-inline';
    maxBytesHint.textContent = '≈ 0.00 MB';
    maxBytesLabel.appendChild(maxBytesHint);
    const maxBytesInput = document.createElement('input');
    maxBytesInput.type = 'number';
    maxBytesInput.min = '0';
    maxBytesInput.step = '1';
    maxBytesInput.value = settings.maxGalleryBytes ?? 0;
    maxBytesField.appendChild(maxBytesLabel);
    maxBytesField.appendChild(maxBytesInput);
    const maxBytesHelp = document.createElement('span');
    maxBytesHelp.className = 'field-hint';
    maxBytesHelp.textContent = '0 means no size limit';
    maxBytesField.appendChild(maxBytesHelp);
    updateSizeDisplay(maxBytesInput, maxBytesHint);
    maxBytesInput.addEventListener('input', () => updateSizeDisplay(maxBytesInput, maxBytesHint));
    grid.appendChild(maxBytesField);

    const maxPhotosField = document.createElement('div');
    maxPhotosField.className = 'gallery-settings-field form-field';
    const maxPhotosLabel = document.createElement('label');
    maxPhotosLabel.textContent = 'Max photos (0 = unlimited)';
    const maxPhotosInput = document.createElement('input');
    maxPhotosInput.type = 'number';
    maxPhotosInput.min = '0';
    maxPhotosInput.step = '1';
    maxPhotosInput.value = settings.maxPhotos ?? 0;
    maxPhotosField.appendChild(maxPhotosLabel);
    maxPhotosField.appendChild(maxPhotosInput);
    const maxPhotosHint = document.createElement('span');
    maxPhotosHint.className = 'field-hint';
    maxPhotosHint.textContent = '0 means no photo limit';
    maxPhotosField.appendChild(maxPhotosHint);
    grid.appendChild(maxPhotosField);

    const lifetimeField = document.createElement('div');
    lifetimeField.className = 'gallery-settings-field form-field';
    const lifetimeLabel = document.createElement('label');
    lifetimeLabel.textContent = 'Lifetime (days, 0 = unlimited)';
    const lifetimeInput = document.createElement('input');
    lifetimeInput.type = 'number';
    lifetimeInput.min = '0';
    lifetimeInput.step = '1';
    lifetimeInput.value = settings.lifetimeDays ?? 0;
    lifetimeField.appendChild(lifetimeLabel);
    lifetimeField.appendChild(lifetimeInput);
    const lifetimeHint = document.createElement('span');
    lifetimeHint.className = 'field-hint';
    lifetimeHint.textContent = '0 keeps the gallery forever';
    lifetimeField.appendChild(lifetimeHint);
    grid.appendChild(lifetimeField);

    const viewerField = document.createElement('label');
    viewerField.className = 'gallery-settings-field checkbox checkbox-field';
    const viewerInput = document.createElement('input');
    viewerInput.type = 'checkbox';
    viewerInput.checked = !!settings.viewerUploadsEnabled;
    viewerField.appendChild(viewerInput);
    viewerField.appendChild(document.createTextNode('Allow viewers to upload'));
    viewerField.style.gridColumn = '1 / -1';
    grid.appendChild(viewerField);

    wrapper.appendChild(grid);

    const status = document.createElement('div');
    status.className = 'gallery-settings-status';
    wrapper.appendChild(status);

    const actions = document.createElement('div');
    actions.className = 'gallery-settings-actions';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-secondary';
    saveBtn.textContent = 'Save limits';
    saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        status.textContent = 'Saving...';
        const payload = {
            viewer_uploads_enabled: viewerInput.checked ? '1' : '0',
            max_gallery_bytes: maxBytesInput.value || '0',
            max_photos: maxPhotosInput.value || '0',
            lifetime_days: lifetimeInput.value || '0'
        };
        const ok = await saveGallerySettingsApi(gallery.name, payload, status);
        saveBtn.disabled = false;
        if (ok) {
            loadGalleries();
        }
    };
    actions.appendChild(saveBtn);
    wrapper.appendChild(actions);

    return wrapper;
}

async function saveGallerySettingsApi(galleryName, payload, statusEl) {
    try {
        const formData = new FormData();
        formData.append('action', 'save_gallery_settings');
        formData.append('gallery', galleryName);
        Object.entries(payload).forEach(([key, val]) => formData.append(key, val));

        const response = await fetch('api.php?action=save_gallery_settings', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (response.ok && data.success) {
            if (statusEl) {
                statusEl.textContent = 'Saved';
                statusEl.style.color = 'var(--text-secondary)';
                setTimeout(() => statusEl.textContent = '', 2000);
            }
            return true;
        }
        if (statusEl) {
            statusEl.textContent = data.error || 'Save failed';
            statusEl.style.color = 'var(--error)';
        }
        return false;
    } catch (error) {
        console.error('Save gallery settings error:', error);
        if (statusEl) {
            statusEl.textContent = 'Save failed';
            statusEl.style.color = 'var(--error)';
        }
        return false;
    }
}

function formatBytesShort(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let idx = 0;
    let value = bytes;
    while (value >= 1024 && idx < units.length - 1) {
        value /= 1024;
        idx++;
    }
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[idx]}`;
}

function formatMbCompact(bytes) {
    const mb = (bytes || 0) / (1024 * 1024);
    return `${mb.toLocaleString(undefined, {
        minimumFractionDigits: mb >= 10 ? 0 : 1,
        maximumFractionDigits: 1
    })} MB`;
}

function formatDeleteCountdown(expiresAt, lifetimeDays) {
    if (expiresAt) {
        const expiresDate = new Date(expiresAt);
        const diffDays = Math.ceil((expiresDate - new Date()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) return '0 days';
        return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
    }
    if (lifetimeDays) {
        return `${lifetimeDays} day${lifetimeDays === 1 ? '' : 's'}`;
    }
    return '∞ days';
}

function buildGallerySummary(gallery) {
    const limits = gallery.limits || {};
    const stats = limits.stats || {};
    const settings = gallery.settings || {};
    const sizeText = formatMbCompact(stats.totalBytes || 0);
    const fileCount = stats.fileCount || 0;
    const photosText = `${fileCount} photo${fileCount === 1 ? '' : 's'}`;
    const deleteText = formatDeleteCountdown(limits.expiresAt, settings.lifetimeDays);
    return `${sizeText} / ${photosText} / ${deleteText}`;
}

// Delete gallery
async function deleteGallery(galleryName) {
    try {
        const formData = new FormData();
        formData.append('action', 'delete_gallery');
        formData.append('name', galleryName);
        
        const response = await fetch('api.php?action=delete_gallery', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadGalleries();
        } else {
            alert('Error: ' + (data.error || 'Failed to delete gallery'));
        }
    } catch (error) {
        console.error('Delete gallery error:', error);
        alert('Failed to delete gallery');
    }
}

// Rename gallery
async function renameGallery(oldName, newName) {
    try {
        const formData = new FormData();
        formData.append('action', 'rename_gallery');
        formData.append('old_name', oldName);
        formData.append('new_name', newName);

        const response = await fetch('api.php?action=rename_gallery', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            loadGalleries();
        } else {
            alert('Error: ' + (data.error || 'Failed to rename gallery'));
        }
    } catch (error) {
        console.error('Rename gallery error:', error);
        alert('Failed to rename gallery');
    }
}

// Utility
function showError(message) {
    if (loginError) {
        loginError.textContent = message;
        loginError.style.display = 'block';
        setTimeout(() => {
            loginError.style.display = 'none';
        }, 5000);
    }
}

