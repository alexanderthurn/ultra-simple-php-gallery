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
const settingsStatus = document.getElementById('settings-status');

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
            const { maxImageWidth, maxImageFileSize, maxFileSize } = data.settings;
            if (maxImageWidthInput) maxImageWidthInput.value = maxImageWidth ?? '';
            if (maxImageFileSizeInput) maxImageFileSizeInput.value = maxImageFileSize ?? '';
            if (maxFileSizeInput) maxFileSizeInput.value = maxFileSize ?? '';
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
        
        const info = document.createElement('div');
        info.className = 'gallery-info';
        const hasEditPassword = gallery.hasEditPassword ?? gallery.hasPassword;
        const hasViewPassword = gallery.hasViewPassword ?? false;
        
        const name = document.createElement('div');
        name.className = 'gallery-name';
        name.textContent = gallery.name;
        
        const badges = document.createElement('div');
        badges.className = 'badge-row';
        const viewBadge = document.createElement('span');
        viewBadge.className = hasViewPassword ? 'password-badge' : 'no-password-badge';
        viewBadge.textContent = hasViewPassword ? 'View protected' : 'View open';
        const editBadge = document.createElement('span');
        editBadge.className = hasEditPassword ? 'password-badge' : 'no-password-badge';
        editBadge.textContent = hasEditPassword ? 'Edit protected' : 'Edit open';
        badges.appendChild(viewBadge);
        badges.appendChild(editBadge);
        name.appendChild(badges);
        
        const meta = document.createElement('div');
        meta.className = 'gallery-meta';
        meta.innerHTML = `<span>${gallery.fileCount} file${gallery.fileCount !== 1 ? 's' : ''}</span>`;
        
        info.appendChild(name);
        info.appendChild(meta);
        
        const actions = document.createElement('div');
        actions.className = 'gallery-actions';
        
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn-secondary';
        viewBtn.textContent = 'View';
        viewBtn.onclick = () => {
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
        
        actions.appendChild(viewBtn);
        actions.appendChild(viewPasswordBtn);
        actions.appendChild(editPasswordBtn);
        actions.appendChild(renameBtn);
        actions.appendChild(deleteBtn);
        
        card.appendChild(info);
        card.appendChild(actions);
        galleriesList.appendChild(card);
    });
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

