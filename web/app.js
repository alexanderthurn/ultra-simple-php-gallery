// State
let currentGallery = '';
let currentFiles = [];
let currentIndex = 0;
let currentDir = '';
let currentView = 'dir';
let galleryPassword = ''; // editor password
let viewerPassword = '';
let galleryHasPassword = false; // backward compatibility (editor)
let galleryHasEditPassword = false;
let galleryHasViewPassword = false;
let hasViewAccess = false;
let isLoggedIn = false; // editor access
const DEFAULT_PAGE_TITLE = 'Gallery';
const DEFAULT_PAGE_DESC = 'Lets share some photos';

// DOM Elements
const galleryInput = document.getElementById('gallery-input');
const loadGalleryBtn = document.getElementById('load-gallery-btn');
const gallerySelector = document.getElementById('gallery-selector');
const brandTitle = document.getElementById('brand-title');
const titleActions = document.getElementById('title-actions');
const headerActions = document.getElementById('header-actions');
const headerRight = document.getElementById('header-right');
const loginToggle = document.getElementById('login-toggle');
const loginWrapper = document.getElementById('login-wrapper');
const headerLoginForm = document.getElementById('login-wrapper');
const loggedInWrapper = document.getElementById('logged-in-wrapper');
const headerPasswordInput = document.getElementById('header-password-input');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const galleryInfo = document.getElementById('gallery-info');
const galleryTitle = document.getElementById('gallery-title');
const downloadZipBtn = document.getElementById('download-zip-btn');
const downloadDirZipBtn = document.getElementById('download-dir-zip-btn');
const downloadDirZipHint = document.getElementById('download-dir-zip-hint');
const uploadBtn = document.getElementById('upload-btn');
const closeUploadBtn = document.getElementById('close-upload-btn');
const fileInput = document.getElementById('file-input');
const dirInput = document.getElementById('dir-input');
const uploadArea = document.getElementById('upload-area');
const uploadDropzone = document.getElementById('upload-dropzone');
const uploadProgress = document.getElementById('upload-progress');
const uploadFilesBtn = document.getElementById('upload-files-btn');
const uploadFolderBtn = document.getElementById('upload-folder-btn');
const viewToggleBtn = document.getElementById('view-toggle-btn');
const directoryList = document.getElementById('directory-list');
const directoryBreadcrumb = document.getElementById('directory-breadcrumb');
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
const lightboxLeftHotspot = document.getElementById('lightbox-left-hotspot');
const lightboxCenterHotspot = document.getElementById('lightbox-center-hotspot');
const lightboxRightHotspot = document.getElementById('lightbox-right-hotspot');

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    setPageMetadata();
    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const galleryParam = urlParams.get('gallery');
    const dirParam = urlParams.get('dir');
    const viewParam = urlParams.get('view');
    
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
    
    // Handle login submit
    if (headerLoginForm) {
        headerLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = headerPasswordInput ? headerPasswordInput.value.trim() : '';
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
    
    // Mobile login toggle
    if (loginToggle) {
        loginToggle.addEventListener('click', () => {
            const isOpen = loginWrapper.classList.toggle('is-open');
            loginToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
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
        loadGallery(galleryParam, dirParam || '', viewParam || 'dir');
    } else {
        // No gallery loaded - show selector in empty state
        if (gallerySelector) gallerySelector.style.display = 'flex';
        if (emptyState) emptyState.style.display = 'block';
        if (headerRight) headerRight.style.display = 'none';
        if (brandTitle) brandTitle.style.display = 'block';
        if (galleryTitle) {
            galleryTitle.textContent = '';
            galleryTitle.style.display = 'none';
        }
        if (headerActions) headerActions.style.display = 'none';
        if (titleActions) titleActions.style.display = 'none';
    }
});

// Verify password
async function verifyPassword(password) {
    if (!currentGallery) return;
    
    try {
        // First, unlock view access (if required)
        const viewAuthUrl = `api/index.php?action=auth&type=view&gallery=${encodeURIComponent(currentGallery)}&password=${encodeURIComponent(password)}`;
        const viewAuthResponse = await fetch(viewAuthUrl);
        const viewAuthData = await viewAuthResponse.json();
        if (viewAuthResponse.status === 401) {
            alert('Invalid view password');
            if (headerPasswordInput) headerPasswordInput.value = '';
            viewerPassword = '';
            sessionStorage.removeItem(`gallery_view_password_${currentGallery}`);
            hasViewAccess = false;
            updateLoginUI();
            return;
        }
        if (viewAuthResponse.ok && viewAuthData.success) {
            galleryHasViewPassword = viewAuthData.hasViewPassword || false;
            if (galleryHasViewPassword) {
                viewerPassword = password;
                sessionStorage.setItem(`gallery_view_password_${currentGallery}`, password);
            } else {
                viewerPassword = '';
                sessionStorage.removeItem(`gallery_view_password_${currentGallery}`);
            }
            hasViewAccess = true;
        }

        // Then, try editor password (if one exists)
        const shouldCheckEdit = viewAuthData.hasEditPassword || galleryHasEditPassword || galleryHasPassword;
        if (shouldCheckEdit) {
            const editorOk = await verifyEditorPassword(password);
            if (editorOk) {
                galleryPassword = password;
                sessionStorage.setItem(`gallery_password_${currentGallery}`, password);
                isLoggedIn = true;
            } else {
                galleryPassword = '';
                sessionStorage.removeItem(`gallery_password_${currentGallery}`);
                // stay in view-only mode
                isLoggedIn = false;
                if (uploadBtn) uploadBtn.style.display = 'none';
                if (uploadArea) uploadArea.style.display = 'none';
                if (closeUploadBtn) closeUploadBtn.style.display = 'none';
            }
        } else {
            galleryPassword = '';
            sessionStorage.removeItem(`gallery_password_${currentGallery}`);
            isLoggedIn = true; // no editor password set
        }

        await loadGallery(currentGallery, currentDir, currentView);
    } catch (error) {
        console.error('Password verification error:', error);
        alert('Failed to verify password');
    }
}

async function verifyEditorPassword(password) {
    if (!currentGallery) return false;
    const viewParam = viewerPassword ? `&viewPassword=${encodeURIComponent(viewerPassword)}` : '';
    try {
        const response = await fetch(`api/index.php?action=auth&type=edit&gallery=${encodeURIComponent(currentGallery)}&password=${encodeURIComponent(password)}${viewParam}`);
        if (!response.ok) {
            return false;
        }
        const data = await response.json();
        return !!data.success;
    } catch (error) {
        console.error('Editor password verification failed:', error);
        return false;
    }
}

// Logout
function logout() {
    galleryPassword = '';
    viewerPassword = '';
    isLoggedIn = false;
    hasViewAccess = !galleryHasViewPassword;
    if (currentGallery) {
        sessionStorage.removeItem(`gallery_password_${currentGallery}`);
        sessionStorage.removeItem(`gallery_view_password_${currentGallery}`);
    }
    if (headerPasswordInput) headerPasswordInput.value = '';
    updateLoginUI();
}

// Update login UI
function updateLoginUI() {
    if (!currentGallery) {
        if (headerRight) headerRight.style.display = 'none';
        if (headerActions) headerActions.style.display = 'none';
        if (titleActions) titleActions.style.display = 'none';
        if (loginToggle) loginToggle.style.display = 'none';
        return;
    }
    
    if (headerRight) headerRight.style.display = 'flex';
    
    const isViewProtected = galleryHasViewPassword;
    const isEditProtected = galleryHasEditPassword;
    const hasAnyProtection = isViewProtected || isEditProtected;
    
    // Handle view access first
    if (isViewProtected && !hasViewAccess) {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if (isMobile) {
            if (loginToggle) {
                loginToggle.style.display = 'inline-flex';
                loginWrapper.classList.remove('is-open');
                loginToggle.setAttribute('aria-expanded', 'false');
            }
            if (loginWrapper) loginWrapper.style.display = 'none';
        } else {
            if (loginToggle) loginToggle.style.display = 'none';
            if (loginWrapper) loginWrapper.style.display = 'flex';
        }
        if (loggedInWrapper) loggedInWrapper.style.display = 'none';
        if (headerActions) headerActions.style.display = 'none';
        if (titleActions) titleActions.style.display = 'none';
        updateDeleteButtonsVisibility();
        return;
    }
    
    // No view password required or already unlocked
    if (!isEditProtected) {
        isLoggedIn = true;
    }
    
    // Fully open gallery: no logout, no login UI
    if (!hasAnyProtection) {
        if (loginWrapper) loginWrapper.style.display = 'none';
        if (loginToggle) loginToggle.style.display = 'none';
        if (loggedInWrapper) loggedInWrapper.style.display = 'none';
        if (headerActions) headerActions.style.display = 'flex';
        if (titleActions) {
            titleActions.style.display = currentGallery ? 'flex' : 'none';
        }
        if (uploadBtn) uploadBtn.style.display = 'block';
        updateDeleteButtonsVisibility();
        return;
    }
    
    // View is unlocked at this point
    if (loginWrapper) loginWrapper.style.display = 'none';
    if (loginToggle) loginToggle.style.display = 'none';
    if (headerActions) headerActions.style.display = 'flex';
    if (titleActions) {
        titleActions.style.display = currentGallery ? 'flex' : 'none';
    }
    
    // Logged-in UI shows for both view-only and editor modes
    if (loggedInWrapper) {
        const modeText = isLoggedIn || !isEditProtected ? 'Editor' : 'Viewer';
        // Decide visibility: show logout only if protection exists
        const shouldShowLogout = isLoggedIn || (isViewProtected && hasViewAccess);
        if (shouldShowLogout) {
            loggedInWrapper.style.display = 'flex';
            if (logoutBtn) {
                logoutBtn.textContent = 'Logout';
                logoutBtn.setAttribute('data-mode', modeText.toLowerCase());
                logoutBtn.style.display = 'inline-flex';
            }
            if (loginWrapper) loginWrapper.style.display = 'none';
        } else {
            loggedInWrapper.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (isEditProtected && hasViewAccess) {
                // edit-protected but not logged-in: show login form
                if (loginWrapper) loginWrapper.style.display = 'flex';
            }
        }
    }
    
    // Show/hide upload button and delete icons based on access
    if (uploadBtn) {
        const canUpload = hasViewAccess && (!isEditProtected || isLoggedIn);
        uploadBtn.style.display = canUpload ? 'block' : 'none';
    }
    if (uploadArea && !isLoggedIn) {
        uploadArea.style.display = 'none';
    }
    if (closeUploadBtn && !isLoggedIn) {
        closeUploadBtn.style.display = 'none';
    }
    
    // Update delete buttons visibility
    updateDeleteButtonsVisibility();
}

// Update delete buttons visibility
function updateDeleteButtonsVisibility() {
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(btn => {
        btn.style.display = isLoggedIn && hasViewAccess ? 'flex' : 'none';
    });
}

function setMetaTag(selector, content) {
    const el = document.querySelector(selector);
    if (el) {
        el.setAttribute('content', content);
    }
}

function setPageMetadata(galleryName, dir = '') {
    const breadcrumb = dir ? `${galleryName} / ${dir}` : galleryName;
    const title = breadcrumb ? breadcrumb : DEFAULT_PAGE_TITLE;
    document.title = title;
    setMetaTag('meta[name="description"]', DEFAULT_PAGE_DESC);
    setMetaTag('meta[property="og:title"]', title);
    setMetaTag('meta[property="og:description"]', DEFAULT_PAGE_DESC);
    setMetaTag('meta[name="twitter:title"]', title);
    setMetaTag('meta[name="twitter:description"]', DEFAULT_PAGE_DESC);
}

// Load gallery
async function loadGallery(galleryName, dir = '', view = currentView) {
    currentGallery = galleryName;
    currentDir = normalizeRelativePath(dir || '');
    currentView = view === 'flat' ? 'flat' : 'dir';
    viewerPassword = sessionStorage.getItem(`gallery_view_password_${galleryName}`) || '';
    // reset upload UI early; will re-show if allowed
    if (uploadBtn) uploadBtn.style.display = 'none';
    if (uploadArea) uploadArea.style.display = 'none';
    if (closeUploadBtn) closeUploadBtn.style.display = 'none';
    if (galleryTitle) {
        galleryTitle.textContent = galleryName;
        galleryTitle.style.display = 'block';
    }
    if (brandTitle) brandTitle.style.display = 'none';
    if (headerActions) headerActions.style.display = 'flex';
    if (titleActions) titleActions.style.display = 'flex';
    
    // Hide empty state and gallery selector
    if (emptyState) emptyState.style.display = 'none';
    if (gallerySelector) gallerySelector.style.display = 'none';
    
    try {
        const dirParam = currentDir ? `&dir=${encodeURIComponent(currentDir)}` : '';
        const viewParam = currentView ? `&view=${encodeURIComponent(currentView)}` : '';
        const viewPasswordParam = viewerPassword ? `&viewPassword=${encodeURIComponent(viewerPassword)}` : '';
        const response = await fetch(`api/index.php?action=list&gallery=${encodeURIComponent(galleryName)}${dirParam}${viewParam}${viewPasswordParam}`);
        const data = await response.json();
        
        if (response.status === 401) {
            galleryHasViewPassword = true;
            galleryHasEditPassword = false;
            hasViewAccess = false;
            isLoggedIn = false;
            galleryPassword = '';
            viewerPassword = '';
            sessionStorage.removeItem(`gallery_view_password_${galleryName}`);
            if (headerPasswordInput) headerPasswordInput.value = '';
            galleryGrid.innerHTML = '<div class="empty-state auth-required"><p>Password required to view this gallery.</p></div>';
            if (galleryInfo) galleryInfo.style.display = 'none';
            if (directoryList) directoryList.innerHTML = '';
            if (headerRight) headerRight.style.display = 'flex';
            setPageMetadata();
            updateLoginUI();
            return;
        }

        if (data.success) {
            currentFiles = data.files;
            currentDir = normalizeRelativePath(data.dir || '');
            currentView = data.view === 'flat' ? 'flat' : 'dir';
            galleryHasEditPassword = data.hasEditPassword ?? data.hasPassword ?? false;
            galleryHasPassword = galleryHasEditPassword;
            galleryHasViewPassword = data.hasViewPassword || false;
            hasViewAccess = true;
            if (!galleryHasViewPassword) {
                viewerPassword = '';
                sessionStorage.removeItem(`gallery_view_password_${galleryName}`);
            }
            
            // Handle password based on gallery's password status
            if (!galleryHasEditPassword) {
                // No password required - clear any stored password
                galleryPassword = '';
                sessionStorage.removeItem(`gallery_password_${galleryName}`);
                if (headerPasswordInput) headerPasswordInput.value = viewerPassword || '';
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
                    if (headerPasswordInput && !headerPasswordInput.value) {
                        headerPasswordInput.value = viewerPassword || '';
                    }
                    isLoggedIn = false;
                }
            }
            
            const hasDirectories = displayDirectories(currentView === 'dir' ? data.directories || [] : []);
            displayGallery(data.files, hasDirectories);
            updateBreadcrumb(hasDirectories);
            updateViewToggleLabel();
            setPageMetadata(currentGallery, currentDir);
            updateLoginUI();

            if (galleryInfo) galleryInfo.style.display = 'flex';
            
            // Reset upload area visibility on gallery load
            if (uploadArea) uploadArea.style.display = 'none';
            if (closeUploadBtn) closeUploadBtn.style.display = 'none';
        } else {
            showError(data.error || 'Failed to load gallery');
            if (galleryGrid) galleryGrid.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            if (gallerySelector) gallerySelector.style.display = 'flex';
            if (headerRight) headerRight.style.display = 'none';
            if (brandTitle) brandTitle.style.display = 'block';
            if (galleryTitle) {
                galleryTitle.textContent = '';
                galleryTitle.style.display = 'none';
            }
            if (headerActions) headerActions.style.display = 'none';
            if (titleActions) titleActions.style.display = 'none';
            setPageMetadata();
        }
    } catch (error) {
        console.error('Error loading gallery:', error);
        showError('Failed to load gallery');
        if (galleryGrid) galleryGrid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (gallerySelector) gallerySelector.style.display = 'flex';
        if (headerRight) headerRight.style.display = 'none';
        if (brandTitle) brandTitle.style.display = 'block';
        if (galleryTitle) {
            galleryTitle.textContent = '';
            galleryTitle.style.display = 'none';
        }
        if (headerActions) headerActions.style.display = 'none';
        if (titleActions) titleActions.style.display = 'none';
        setPageMetadata();
    }
}

// Display gallery
function displayGallery(files, hasDirectoriesOverride) {
    const hasDirectories = typeof hasDirectoriesOverride === 'boolean'
        ? hasDirectoriesOverride
        : (directoryList && directoryList.children.length > 0 && directoryList.style.display !== 'none');
    if (files.length === 0 && !hasDirectories) {
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
            img.src = getFileUrl(file.thumb || file.path);
            img.alt = file.name;
            img.loading = 'lazy';
            item.appendChild(img);
        } else if (file.type === 'video') {
            const videoOverlay = document.createElement('div');
            videoOverlay.className = 'video-overlay';
            videoOverlay.innerHTML = '▶';
            item.appendChild(videoOverlay);
        } else {
            const fileCard = document.createElement('div');
            fileCard.className = 'file-card';
            
            const badge = document.createElement('div');
            badge.className = 'file-badge';
            badge.textContent = (file.extension || 'FILE').toUpperCase();
            
            const name = document.createElement('div');
            name.className = 'file-name';
            name.textContent = file.name;
            
            const meta = document.createElement('div');
            meta.className = 'file-meta';
            meta.textContent = formatFileType(file.type);
            
            fileCard.appendChild(badge);
            fileCard.appendChild(name);
            fileCard.appendChild(meta);
            item.appendChild(fileCard);
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

// Helpers for non-image/video files
function formatFileType(type) {
    switch (type) {
        case 'image':
            return 'Image';
        case 'video':
            return 'Video';
        case 'audio':
            return 'Audio';
        case 'document':
            return 'Document';
        case 'archive':
            return 'Archive';
        default:
            return 'File';
    }
}

function createFileViewer(file) {
    const wrapper = document.createElement('div');
    wrapper.className = 'file-viewer';
    
    const badge = document.createElement('div');
    badge.className = 'file-badge large';
    badge.textContent = (file.extension || 'FILE').toUpperCase();
    
    const name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = file.name;
    
    const meta = document.createElement('div');
    meta.className = 'file-meta';
    meta.textContent = formatFileType(file.type);
    
    const actions = document.createElement('div');
    actions.className = 'file-actions';
    
    const openLink = document.createElement('a');
    openLink.href = getFileUrl(file.path);
    openLink.target = '_blank';
    openLink.rel = 'noopener';
    openLink.className = 'file-action-btn';
    openLink.textContent = 'Open';
    
    const downloadLink = document.createElement('a');
    downloadLink.href = getFileUrl(file.path);
    downloadLink.download = file.name;
    downloadLink.className = 'file-action-btn secondary';
    downloadLink.textContent = 'Download';
    
    actions.appendChild(openLink);
    actions.appendChild(downloadLink);
    
    wrapper.appendChild(badge);
    wrapper.appendChild(name);
    wrapper.appendChild(meta);
    wrapper.appendChild(actions);
    
    return wrapper;
}

function displayDirectories(directories) {
    if (!directoryList) return;
    
    directoryList.innerHTML = '';
    
    if (!directories || directories.length === 0) {
        directoryList.style.display = 'none';
        updateViewToggleVisibility(false);
        return false;
    }
    
    directoryList.style.display = 'grid';
    
    directories.forEach((dir) => {
        const card = document.createElement('div');
        card.className = 'directory-card';
        
        const icon = document.createElement('div');
        icon.className = 'directory-icon';
        icon.textContent = '📁';
        
        const name = document.createElement('div');
        name.className = 'directory-name';
        name.textContent = dir.name;

        card.appendChild(icon);
        card.appendChild(name);
        
        card.onclick = () => {
            loadGallery(currentGallery, dir.path, currentView);
            const params = new URLSearchParams(window.location.search);
            params.set('gallery', currentGallery);
            params.set('dir', dir.path);
            if (currentView && currentView !== 'dir') {
                params.set('view', currentView);
            } else {
                params.delete('view');
            }
            window.history.pushState({}, '', `?${params.toString()}`);
        };
        
        directoryList.appendChild(card);
    });

    updateViewToggleVisibility(true);
    return true;
}

function updateViewToggleVisibility(hasDirectories) {
    if (!viewToggleBtn) return;
    const shouldShow = currentView === 'flat' || hasDirectories || !!currentDir;
    viewToggleBtn.style.display = shouldShow ? 'inline-flex' : 'none';
}

// Download ZIP functionality
if (downloadZipBtn) {
    downloadZipBtn.addEventListener('click', () => {
        if (!currentGallery) {
            return;
        }
        const viewParam = viewerPassword ? `&viewPassword=${encodeURIComponent(viewerPassword)}` : '';
        window.location.href = `api/index.php?action=download_zip&gallery=${encodeURIComponent(currentGallery)}${viewParam}`;
    });
}

if (downloadDirZipBtn) {
    downloadDirZipBtn.addEventListener('click', () => {
        if (!currentGallery || !currentDir) {
            return;
        }
        const dirParam = currentDir ? `&dir=${encodeURIComponent(currentDir)}` : '';
        const viewParam = viewerPassword ? `&viewPassword=${encodeURIComponent(viewerPassword)}` : '';
        window.location.href = `api/index.php?action=download_zip&gallery=${encodeURIComponent(currentGallery)}${dirParam}${viewParam}`;
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

// View toggle
if (viewToggleBtn) {
    viewToggleBtn.addEventListener('click', () => {
        const nextView = currentView === 'flat' ? 'dir' : 'flat';
        applyView(nextView);
    });
}

// Click gallery title to jump to gallery root (reloads page)
if (galleryTitle) {
    galleryTitle.addEventListener('click', () => {
        if (!currentGallery) return;
        const params = new URLSearchParams();
        params.set('gallery', currentGallery);
        if (currentView && currentView !== 'dir') {
            params.set('view', currentView);
        }
        // Reload to ensure fresh load at root
        window.location.href = `?${params.toString()}`;
    });
}

function applyView(view) {
    currentView = view === 'flat' ? 'flat' : 'dir';
    updateViewToggleLabel();
    pushStateWithParams();
    loadGallery(currentGallery, currentDir, currentView);
}

function updateViewToggleLabel() {
    if (!viewToggleBtn) return;
    viewToggleBtn.textContent = currentView === 'flat'
        ? 'Show folders'
        : 'Show all images in all folders';
}

function pushStateWithParams(overrideDir) {
    const params = new URLSearchParams(window.location.search);
    if (currentGallery) params.set('gallery', currentGallery);
    const dirToUse = typeof overrideDir === 'string' ? normalizeRelativePath(overrideDir) : currentDir;
    if (dirToUse) {
        params.set('dir', dirToUse);
    } else {
        params.delete('dir');
    }
    if (currentView && currentView !== 'dir') {
        params.set('view', currentView);
    } else {
        params.delete('view');
    }
    window.history.pushState({}, '', `?${params.toString()}`);
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
        
        const items = e.dataTransfer.items;
        if (items && items.length > 0) {
            extractFilesFromItems(items)
                .then((files) => uploadFiles(files))
                .catch((err) => {
                    console.error('Folder drop parsing failed:', err);
                    const fallback = Array.from(e.dataTransfer.files);
                    uploadFiles(fallback);
                });
        } else {
            const files = Array.from(e.dataTransfer.files);
            uploadFiles(files);
        }
    });
}

if (uploadFilesBtn) {
    uploadFilesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isLoggedIn) return;
        if (fileInput) fileInput.click();
    });
}

if (uploadFolderBtn) {
    uploadFolderBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isLoggedIn) return;
        if (dirInput) dirInput.click();
    });
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        uploadFiles(files);
        fileInput.value = '';
    });
}

if (dirInput) {
    dirInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        uploadFiles(files);
        dirInput.value = '';
    });
}

// Extract files (with relative paths) from DataTransfer items, supporting folders
async function extractFilesFromItems(items) {
    const files = [];
    
    const traverseEntry = async (entry, pathPrefix = '') => {
        if (entry.isFile) {
            const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
            const fullPath = pathPrefix ? `${pathPrefix}/${file.name}` : file.name;
            files.push({ file, path: fullPath });
        } else if (entry.isDirectory) {
            const reader = entry.createReader();
            const readEntries = () => new Promise((resolve) => reader.readEntries(resolve));
            let entries;
            do {
                entries = await readEntries();
                for (const ent of entries) {
                    await traverseEntry(ent, pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name);
                }
            } while (entries.length > 0);
        }
    };
    
    for (const item of items) {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) {
            await traverseEntry(entry, '');
        } else if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) {
                files.push({ file, path: file.webkitRelativePath || file.name });
            }
        }
    }
    
    return files;
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
    
    for (const entry of files) {
        const file = entry.file ? entry.file : entry;
        const relativePath = normalizeRelativePath(entry.path || file.webkitRelativePath || file.name);
        await uploadFile(file, relativePath);
    }
    
    // Reload gallery after uploads complete
    setTimeout(() => {
        loadGallery(currentGallery);
        if (uploadArea) uploadArea.style.display = 'none';
    }, 1000);
}

async function uploadFile(file, relativePath) {
    const incomingPath = normalizeRelativePath(relativePath || file.webkitRelativePath || file.name);
    const baseDir = currentDir ? normalizeRelativePath(currentDir) : '';
    let safePath = incomingPath;
    if (baseDir && !incomingPath.startsWith(baseDir + '/')) {
        safePath = normalizeRelativePath(`${baseDir}/${incomingPath}`);
    }
    
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
        formData.append('path', safePath);
        
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
        if (galleryHasViewPassword && viewerPassword) {
            uploadUrl += `&viewPassword=${encodeURIComponent(viewerPassword)}`;
        }
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
        if (galleryHasViewPassword && viewerPassword) {
            deleteUrl += `&viewPassword=${encodeURIComponent(viewerPassword)}`;
        }
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
        img.src = getFileUrl(file.path);
        img.alt = file.name;
        lightboxContent.appendChild(img);
        if (lightboxCenterHotspot) lightboxCenterHotspot.style.display = 'block';
    } else if (file.type === 'video') {
        const video = document.createElement('video');
        video.src = getFileUrl(file.path);
        video.controls = true;
        video.autoplay = true;
        video.addEventListener('error', () => {
            // Fallback for unsupported video formats: offer download instead of a broken player
            lightboxContent.innerHTML = '';
            const fallback = createFileViewer(file);
            const note = document.createElement('div');
            note.className = 'file-meta';
            note.textContent = 'Playback not supported in this browser. Use Download.';
            fallback.appendChild(note);
            lightboxContent.appendChild(fallback);
        });
        lightboxContent.appendChild(video);
        if (lightboxCenterHotspot) lightboxCenterHotspot.style.display = 'none';
    } else if (file.type === 'audio') {
        const audio = document.createElement('audio');
        audio.src = getFileUrl(file.path);
        audio.controls = true;
        audio.autoplay = true;
        audio.style.width = '100%';
        lightboxContent.appendChild(audio);
        if (lightboxCenterHotspot) lightboxCenterHotspot.style.display = 'none';
    } else {
        const fileViewer = createFileViewer(file);
        lightboxContent.appendChild(fileViewer);
        if (lightboxCenterHotspot) lightboxCenterHotspot.style.display = 'none';
    }
    
    if (lightboxLeftHotspot) lightboxLeftHotspot.style.display = 'block';
    if (lightboxRightHotspot) lightboxRightHotspot.style.display = 'block';
    
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

// Lightbox hotspots
if (lightboxLeftHotspot) {
    lightboxLeftHotspot.addEventListener('click', (e) => {
        e.stopPropagation();
        lightboxPrev.click();
    });
}

if (lightboxRightHotspot) {
    lightboxRightHotspot.addEventListener('click', (e) => {
        e.stopPropagation();
        lightboxNext.click();
    });
}

if (lightboxCenterHotspot) {
    lightboxCenterHotspot.addEventListener('click', (e) => {
        e.stopPropagation();
        const file = currentFiles[currentIndex];
        if (!file) return;
        const url = getFileUrl(file.path);
        window.open(url, '_blank', 'noopener');
    });
}

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
function getFileUrl(filePath) {
    const viewParam = viewerPassword ? `&viewPassword=${encodeURIComponent(viewerPassword)}` : '';
    return `api/file.php?gallery=${encodeURIComponent(currentGallery)}&file=${encodeURIComponent(filePath)}${viewParam}`;
}

function updateBreadcrumb(hasDirectories) {
    if (!directoryBreadcrumb) return;
    
    directoryBreadcrumb.innerHTML = '';
    
    // Only show breadcrumbs when inside a subdirectory
    const shouldShow = !!currentDir;
    if (downloadDirZipBtn) {
        downloadDirZipBtn.style.display = shouldShow ? 'inline-flex' : 'none';
    }
    if (downloadDirZipHint) {
        // Allow CSS hover rules to control visibility when present
        downloadDirZipHint.style.display = shouldShow ? '' : 'none';
    }
    if (!shouldShow) {
        directoryBreadcrumb.style.display = 'none';
        return;
    }
    
    const crumbs = [];
    
    const rootCrumb = document.createElement('button');
    rootCrumb.type = 'button';
    rootCrumb.className = 'breadcrumb-btn';
    rootCrumb.textContent = currentGallery || 'Home';
    rootCrumb.onclick = () => {
        loadGallery(currentGallery, '');
        pushStateWithParams();
    };
    crumbs.push(rootCrumb);
    
    if (currentDir) {
        const parts = currentDir.split('/').filter(Boolean);
        let accum = '';
        parts.forEach((part) => {
            accum = accum ? `${accum}/${part}` : part;
            const path = accum; // capture per-crumb
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'breadcrumb-btn';
            btn.textContent = part;
            btn.onclick = () => {
                loadGallery(currentGallery, path, currentView);
                pushStateWithParams(path);
            };
            crumbs.push(btn);
        });
    }
    
    crumbs.forEach((c, idx) => {
        directoryBreadcrumb.appendChild(c);
        if (idx < crumbs.length - 1) {
            const sep = document.createElement('span');
            sep.className = 'breadcrumb-sep';
            sep.textContent = '/';
            directoryBreadcrumb.appendChild(sep);
        }
    });
    
    directoryBreadcrumb.style.display = 'flex';
}

function normalizeRelativePath(path) {
    if (!path) return '';
    // Ensure forward slashes and no leading slash
    let clean = path.replace(/\\/g, '/').replace(/^\/+/, '');
    // Remove redundant ./ segments
    clean = clean.split('/').filter(p => p !== '' && p !== '.').join('/');
    return clean || path;
}

function showError(message) {
    // Simple error display - could be enhanced with a toast notification
    console.error(message);
}

