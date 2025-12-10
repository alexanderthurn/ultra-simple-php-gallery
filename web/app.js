// State
let currentGallery = '';
let currentFiles = [];
let currentIndex = 0;
let galleryPassword = '';
let galleryHasPassword = false;
let isLoggedIn = false;

// DOM Elements
const galleryInput = document.getElementById('gallery-input');
const loadGalleryBtn = document.getElementById('load-gallery-btn');
const gallerySelector = document.getElementById('gallery-selector');
const headerRight = document.getElementById('header-right');
const loginWrapper = document.getElementById('login-wrapper');
const loggedInWrapper = document.getElementById('logged-in-wrapper');
const headerPasswordInput = document.getElementById('header-password-input');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const galleryInfo = document.getElementById('gallery-info');
const galleryTitle = document.getElementById('gallery-title');
const downloadZipBtn = document.getElementById('download-zip-btn');
const uploadBtn = document.getElementById('upload-btn');
const closeUploadBtn = document.getElementById('close-upload-btn');
const fileInput = document.getElementById('file-input');
const uploadArea = document.getElementById('upload-area');
const uploadDropzone = document.getElementById('upload-dropzone');
const uploadProgress = document.getElementById('upload-progress');
const galleryGrid = document.getElementById('gallery-grid');
const emptyState = document.getElementById('empty-state');
const passwordModal = document.getElementById('password-modal');
const passwordInput = document.getElementById('password-input');
const passwordSubmit = document.getElementById('password-submit');
const passwordCancel = document.getElementById('password-cancel');
const lightbox = document.getElementById('lightbox');
const lightboxContent = document.getElementById('lightbox-content');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxPrev = document.getElementById('lightbox-prev');
const lightboxNext = document.getElementById('lightbox-next');

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const galleryParam = urlParams.get('gallery');
    
    // Setup event listeners
    if (loadGalleryBtn) {
        loadGalleryBtn.addEventListener('click', () => {
            const galleryName = galleryInput.value.trim();
            if (galleryName) {
                window.history.pushState({}, '', `?gallery=${encodeURIComponent(galleryName)}`);
                loadGallery(galleryName);
            }
        });
    }
    
    if (galleryInput) {
        galleryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && loadGalleryBtn) {
                loadGalleryBtn.click();
            }
        });
    }
    
    // Handle login button
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const password = headerPasswordInput.value.trim();
            if (password) {
                verifyPassword(password);
            }
        });
    }
    
    // Handle logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logout();
        });
    }
    
    // Handle header password input Enter key
    if (headerPasswordInput) {
        headerPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const password = headerPasswordInput.value.trim();
                if (password) {
                    verifyPassword(password);
                }
            }
        });
    }
    
    // Close upload area button
    if (closeUploadBtn) {
        closeUploadBtn.addEventListener('click', () => {
            if (uploadArea) uploadArea.style.display = 'none';
            if (closeUploadBtn) closeUploadBtn.style.display = 'none';
            if (uploadBtn) uploadBtn.style.display = 'block';
        });
    }
    
    if (galleryParam) {
        if (galleryInput) galleryInput.value = galleryParam;
        loadGallery(galleryParam);
    } else {
        // No gallery loaded - show selector in empty state
        if (gallerySelector) gallerySelector.style.display = 'flex';
        if (emptyState) emptyState.style.display = 'block';
        if (headerRight) headerRight.style.display = 'none';
    }
});

// Verify password
async function verifyPassword(password) {
    if (!currentGallery) return;
    
    try {
        // Verify password by attempting to delete a non-existent file
        // This will fail with 404 (file not found) if password is correct, or 401 if password is wrong
        const testResponse = await fetch(`api/index.php?action=delete&gallery=${encodeURIComponent(currentGallery)}&file=__password_test__&password=${encodeURIComponent(password)}`, {
            method: 'GET'
        });
        
        // If we get 401, password is wrong
        if (testResponse.status === 401) {
            alert('Invalid password');
            if (headerPasswordInput) headerPasswordInput.value = '';
            return;
        }
        
        // Password is valid (we'll get 404 for file not found, which is fine)
        galleryPassword = password;
        sessionStorage.setItem(`gallery_password_${currentGallery}`, password);
        isLoggedIn = true;
        updateLoginUI();
    } catch (error) {
        console.error('Password verification error:', error);
        alert('Failed to verify password');
    }
}

// Logout
function logout() {
    galleryPassword = '';
    isLoggedIn = false;
    if (currentGallery) {
        sessionStorage.removeItem(`gallery_password_${currentGallery}`);
    }
    if (headerPasswordInput) headerPasswordInput.value = '';
    updateLoginUI();
}

// Update login UI
function updateLoginUI() {
    if (!currentGallery) {
        if (headerRight) headerRight.style.display = 'none';
        return;
    }
    
    if (headerRight) headerRight.style.display = 'flex';
    
    // If gallery has no password, always show as logged in
    if (!galleryHasPassword) {
        isLoggedIn = true;
        if (loginWrapper) loginWrapper.style.display = 'none';
        if (loggedInWrapper) loggedInWrapper.style.display = 'none';
        // Don't show login UI at all for passwordless galleries
        if (headerRight) headerRight.style.display = 'none';
    } else {
        // Gallery has password
        if (isLoggedIn) {
            if (loginWrapper) loginWrapper.style.display = 'none';
            if (loggedInWrapper) loggedInWrapper.style.display = 'flex';
        } else {
            if (loginWrapper) loginWrapper.style.display = 'flex';
            if (loggedInWrapper) loggedInWrapper.style.display = 'none';
        }
    }
    
    // Show/hide upload button and delete icons based on login status
    if (uploadBtn) {
        uploadBtn.style.display = isLoggedIn ? 'block' : 'none';
    }
    
    // Update delete buttons visibility
    updateDeleteButtonsVisibility();
}

// Update delete buttons visibility
function updateDeleteButtonsVisibility() {
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(btn => {
        btn.style.display = isLoggedIn ? 'flex' : 'none';
    });
}

// Load gallery
async function loadGallery(galleryName) {
    currentGallery = galleryName;
    if (galleryTitle) galleryTitle.textContent = galleryName;
    
    // Hide empty state and gallery selector
    if (emptyState) emptyState.style.display = 'none';
    if (gallerySelector) gallerySelector.style.display = 'none';
    
    try {
        const response = await fetch(`api/index.php?action=list&gallery=${encodeURIComponent(galleryName)}`);
        const data = await response.json();
        
        if (data.success) {
            currentFiles = data.files;
            galleryHasPassword = data.hasPassword || false;
            
            // Handle password based on gallery's password status
            if (!galleryHasPassword) {
                // No password required - clear any stored password
                galleryPassword = '';
                sessionStorage.removeItem(`gallery_password_${galleryName}`);
                if (headerPasswordInput) headerPasswordInput.value = '';
                isLoggedIn = true;
            } else {
                // Gallery has password - load stored password if available
                const storedPassword = sessionStorage.getItem(`gallery_password_${galleryName}`);
                if (storedPassword) {
                    galleryPassword = storedPassword;
                    if (headerPasswordInput) headerPasswordInput.value = storedPassword;
                    isLoggedIn = true;
                } else {
                    galleryPassword = '';
                    isLoggedIn = false;
                }
            }
            
            displayGallery(data.files);
            updateLoginUI();
            
            if (galleryInfo) galleryInfo.style.display = 'flex';
            
            // Reset upload area visibility on gallery load
            if (uploadArea) uploadArea.style.display = 'none';
            if (closeUploadBtn) closeUploadBtn.style.display = 'none';
            if (uploadBtn) uploadBtn.style.display = 'block';
        } else {
            showError(data.error || 'Failed to load gallery');
            if (galleryGrid) galleryGrid.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            if (gallerySelector) gallerySelector.style.display = 'flex';
            if (headerRight) headerRight.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading gallery:', error);
        showError('Failed to load gallery');
        if (galleryGrid) galleryGrid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (gallerySelector) gallerySelector.style.display = 'flex';
        if (headerRight) headerRight.style.display = 'none';
    }
}

// Display gallery
function displayGallery(files) {
    if (files.length === 0) {
        galleryGrid.innerHTML = '<div class="empty-state"><p>This gallery is empty</p></div>';
        return;
    }
    
    galleryGrid.innerHTML = '';
    
    files.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.dataset.index = index;
        
        if (file.type === 'image') {
            const img = document.createElement('img');
            img.src = `api/file.php?gallery=${encodeURIComponent(currentGallery)}&file=${encodeURIComponent(file.thumb || file.path)}`;
            img.alt = file.name;
            img.loading = 'lazy';
            item.appendChild(img);
        } else {
            const videoOverlay = document.createElement('div');
            videoOverlay.className = 'video-overlay';
            videoOverlay.innerHTML = '▶';
            item.appendChild(videoOverlay);
        }
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteFile(file.path);
        };
        item.appendChild(deleteBtn);
        
        item.onclick = () => openLightbox(index);
        galleryGrid.appendChild(item);
    });
    
    // Update delete buttons visibility after displaying
    updateDeleteButtonsVisibility();
}

// Download ZIP functionality
if (downloadZipBtn) {
    downloadZipBtn.addEventListener('click', () => {
        if (!currentGallery) {
            return;
        }
        // Download zip - available to everyone, no password needed
        window.location.href = `api/index.php?action=download_zip&gallery=${encodeURIComponent(currentGallery)}`;
    });
}

// Upload functionality
if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
        if (!isLoggedIn) {
            // Should not happen as button should be hidden, but just in case
            if (galleryHasPassword) {
                alert('Please login first');
            }
            return;
        }
        // User is logged in, show upload area
        if (uploadArea) {
            uploadArea.style.display = 'block';
            if (closeUploadBtn) closeUploadBtn.style.display = 'block';
            if (uploadBtn) uploadBtn.style.display = 'none';
            // Scroll to upload area
            uploadArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

if (uploadDropzone) {
    uploadDropzone.addEventListener('click', () => {
        if (!isLoggedIn) {
            return;
        }
        if (fileInput) fileInput.click();
    });

    uploadDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (uploadDropzone) uploadDropzone.style.borderColor = 'var(--accent)';
    });

    uploadDropzone.addEventListener('dragleave', () => {
        if (uploadDropzone) uploadDropzone.style.borderColor = 'var(--border)';
    });

    uploadDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (uploadDropzone) uploadDropzone.style.borderColor = 'var(--border)';
        
        if (!isLoggedIn) {
            return;
        }
        
        const files = Array.from(e.dataTransfer.files);
        uploadFiles(files);
    });
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        uploadFiles(files);
        fileInput.value = '';
    });
}

// Password modal
let passwordCallback = null;

function showPasswordModal(action) {
    passwordModal.style.display = 'flex';
    passwordInput.focus();
    passwordCallback = action;
}

passwordSubmit.addEventListener('click', async () => {
    const password = passwordInput.value.trim();
    
    if (!password) {
        return;
    }
    
    // Store password
    galleryPassword = password;
    sessionStorage.setItem(`gallery_password_${currentGallery}`, password);
    headerPasswordInput.value = password;
    passwordModal.style.display = 'none';
    passwordInput.value = '';
    
    if (passwordCallback === 'upload') {
        fileInput.click();
    } else if (passwordCallback === 'delete' && typeof passwordCallback === 'function') {
        passwordCallback();
    }
});

passwordCancel.addEventListener('click', () => {
    passwordModal.style.display = 'none';
    passwordInput.value = '';
    passwordCallback = null;
});

passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        passwordSubmit.click();
    }
});

// Upload files with compression
async function uploadFiles(files) {
    if (!isLoggedIn) {
        return;
    }
    
    if (uploadArea) uploadArea.style.display = 'block';
    if (uploadProgress) uploadProgress.innerHTML = '';
    
    for (const file of files) {
        await uploadFile(file);
    }
    
    // Reload gallery after uploads complete
    setTimeout(() => {
        loadGallery(currentGallery);
        if (uploadArea) uploadArea.style.display = 'none';
    }, 1000);
}

async function uploadFile(file) {
    const item = document.createElement('div');
    item.className = 'upload-item';
    
    const name = document.createElement('div');
    name.className = 'upload-item-name';
    name.textContent = file.name;
    
    const progressBar = document.createElement('div');
    progressBar.className = 'upload-progress-bar';
    const progressFill = document.createElement('div');
    progressFill.className = 'upload-progress-fill';
    progressFill.style.width = '0%';
    progressBar.appendChild(progressFill);
    
    item.appendChild(name);
    item.appendChild(progressBar);
    uploadProgress.appendChild(item);
    
    try {
        let fileToUpload = file;
        
        // Compress image if needed
        if (file.type.startsWith('image/')) {
            fileToUpload = await compressImage(file);
        }
        
        const formData = new FormData();
        formData.append('file', fileToUpload);
        
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                progressFill.style.width = percent + '%';
            }
        });
        
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                if (progressFill) progressFill.style.width = '100%';
                if (item) item.style.opacity = '0.5';
            } else {
                const response = JSON.parse(xhr.responseText);
                if (name) {
                    name.textContent = `${file.name} - Error: ${response.error || 'Upload failed'}`;
                    name.style.color = 'var(--error)';
                }
                
                // If unauthorized, logout
                if (xhr.status === 401) {
                    logout();
                    alert('Password invalid. Please login again.');
                }
            }
        });
        
        xhr.addEventListener('error', () => {
            name.textContent = `${file.name} - Upload failed`;
            name.style.color = 'var(--error)';
        });
        
        // Only include password parameter if gallery has password
        let uploadUrl = `api/index.php?action=upload&gallery=${encodeURIComponent(currentGallery)}`;
        if (galleryHasPassword && galleryPassword) {
            uploadUrl += `&password=${encodeURIComponent(galleryPassword)}`;
        }
        xhr.open('POST', uploadUrl);
        xhr.send(formData);
        
    } catch (error) {
        console.error('Upload error:', error);
        name.textContent = `${file.name} - Error: ${error.message}`;
        name.style.color = 'var(--error)';
    }
}

// Compress image
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Resize if width > 1080px
                if (width > 1080) {
                    height = (height / width) * 1080;
                    width = 1080;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(compressedFile);
                    } else {
                        resolve(file); // Fallback to original
                    }
                }, 'image/jpeg', 0.85);
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target.result;
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// Delete file
async function deleteFile(filePath) {
    if (!isLoggedIn) {
        return;
    }
    
    if (!confirm('Are you sure you want to delete this file?')) {
        return;
    }
    
    try {
        // Only include password parameter if gallery has password
        let deleteUrl = `api/index.php?action=delete&gallery=${encodeURIComponent(currentGallery)}&file=${encodeURIComponent(filePath)}`;
        if (galleryHasPassword && galleryPassword) {
            deleteUrl += `&password=${encodeURIComponent(galleryPassword)}`;
        }
        const response = await fetch(deleteUrl, {
            method: 'GET'
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadGallery(currentGallery);
        } else {
            if (response.status === 401) {
                // Password invalid, logout
                logout();
                alert('Password invalid. Please login again.');
            } else {
                alert('Error: ' + (data.error || 'Failed to delete file'));
            }
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete file');
    }
}

// Lightbox
function openLightbox(index) {
    currentIndex = index;
    updateLightbox();
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.style.display = 'none';
    document.body.style.overflow = '';
    lightboxContent.innerHTML = '';
}

function updateLightbox() {
    const file = currentFiles[currentIndex];
    lightboxContent.innerHTML = '';
    
    if (file.type === 'image') {
        const img = document.createElement('img');
        img.src = `api/file.php?gallery=${encodeURIComponent(currentGallery)}&file=${encodeURIComponent(file.path)}`;
        img.alt = file.name;
        lightboxContent.appendChild(img);
    } else {
        const video = document.createElement('video');
        video.src = `api/file.php?gallery=${encodeURIComponent(currentGallery)}&file=${encodeURIComponent(file.path)}`;
        video.controls = true;
        video.autoplay = true;
        lightboxContent.appendChild(video);
    }
    
    lightboxCaption.textContent = `${currentIndex + 1} / ${currentFiles.length} - ${file.name}`;
}

lightboxClose.addEventListener('click', closeLightbox);
lightboxPrev.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + currentFiles.length) % currentFiles.length;
    updateLightbox();
});
lightboxNext.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % currentFiles.length;
    updateLightbox();
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (lightbox.style.display === 'flex') {
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            lightboxPrev.click();
        } else if (e.key === 'ArrowRight') {
            lightboxNext.click();
        }
    }
});

// Click outside lightbox to close
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
        closeLightbox();
    }
});

// Utility
function showError(message) {
    // Simple error display - could be enhanced with a toast notification
    console.error(message);
}

