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
const createCancel = document.getElementById('create-cancel');
const passwordModal = document.getElementById('password-modal');
const setPasswordForm = document.getElementById('set-password-form');
const passwordGalleryName = document.getElementById('password-gallery-name');
const passwordInput = document.getElementById('password-input');
const passwordCancel = document.getElementById('password-cancel');
const passwordModalTitle = document.getElementById('password-modal-title');
const passwordSubmitBtn = document.getElementById('password-submit-btn');
const removePasswordBtn = document.getElementById('remove-password-btn');
const changePasswordBtn = document.getElementById('change-password-btn');
const changeAdminPasswordModal = document.getElementById('change-admin-password-modal');
const changeAdminPasswordConfirm = document.getElementById('change-admin-password-confirm');
const changeAdminPasswordCancel = document.getElementById('change-admin-password-cancel');

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
            
            // Allow empty password to remove it
            try {
                const formData = new FormData();
                formData.append('action', 'set_password');
                formData.append('gallery', gallery);
                formData.append('password', password);
                
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
            
            if (!confirm(`Are you sure you want to remove the password for gallery "${gallery}"?`)) {
                return;
            }
            
            try {
                const formData = new FormData();
                formData.append('action', 'set_password');
                formData.append('gallery', gallery);
                formData.append('password', ''); // Empty password to remove
                
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
        
        const name = document.createElement('div');
        name.className = 'gallery-name';
        name.textContent = gallery.name;
        
        const badge = document.createElement('span');
        badge.className = gallery.hasPassword ? 'password-badge' : 'no-password-badge';
        badge.textContent = gallery.hasPassword ? 'Protected' : 'No password';
        name.appendChild(badge);
        
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
        
        const passwordBtn = document.createElement('button');
        passwordBtn.className = 'btn-secondary';
        passwordBtn.textContent = gallery.hasPassword ? 'Change Password' : 'Set Password';
        passwordBtn.onclick = () => {
            passwordGalleryName.value = gallery.name;
            if (passwordInput) passwordInput.value = '';
            if (passwordModalTitle) {
                passwordModalTitle.textContent = gallery.hasPassword ? 'Change Password' : 'Set Password';
            }
            if (passwordSubmitBtn) {
                passwordSubmitBtn.textContent = gallery.hasPassword ? 'Change Password' : 'Set Password';
            }
            if (removePasswordBtn) {
                removePasswordBtn.style.display = gallery.hasPassword ? 'block' : 'none';
            }
            if (passwordInput) {
                passwordInput.required = false;
                passwordInput.placeholder = gallery.hasPassword 
                    ? 'New password (leave empty to remove password)' 
                    : 'New password (optional)';
            }
            if (passwordModal) passwordModal.style.display = 'flex';
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
        actions.appendChild(passwordBtn);
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

