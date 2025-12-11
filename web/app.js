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
let currentSettings = null;
let currentLimits = null;
let publicConfig = null;
let contactEmail = '';
let nameSuggestions = [];
let suggestionIndex = 0;
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
const uploadConflictModal = document.getElementById('upload-conflict-modal');
const uploadConflictList = document.getElementById('upload-conflict-list');
const uploadConflictConfirm = document.getElementById('upload-conflict-confirm');
const uploadConflictCancel = document.getElementById('upload-conflict-cancel');
const uploadConflictApplyAllBlock = document.getElementById('upload-conflict-applyall-block');
const uploadConflictApplyAllSelect = document.getElementById('upload-conflict-applyall-select');
const uploadConflictApplyAllBtn = document.getElementById('upload-conflict-applyall-btn');
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
const limitBanner = document.getElementById('limit-banner');
const limitBannerText = document.getElementById('limit-banner-text');
const limitBannerActions = document.getElementById('limit-banner-actions');
const needMoreModal = document.getElementById('need-more-modal');
const needMoreModalActions = document.getElementById('need-more-modal-actions');
const needMoreModalClose = document.getElementById('need-more-modal-close');
const needMoreModalDesc = document.getElementById('need-more-modal-desc');
const publicCreate = document.getElementById('public-create');
const publicCreateName = document.getElementById('public-create-name');
const publicCreateRefresh = document.getElementById('public-create-refresh');
const publicCreateSubmit = document.getElementById('public-create-submit');
const publicCreateStatus = document.getElementById('public-create-status');
const recentVisits = document.getElementById('recent-visits');
const recentList = document.getElementById('recent-list');

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    setPageMetadata();
    loadPublicConfig();
    renderRecentGalleries();
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

    if (publicCreateRefresh) {
        publicCreateRefresh.addEventListener('click', (e) => {
            e.preventDefault();
            rotateSuggestion();
        });
    }

    if (publicCreateSubmit) {
        publicCreateSubmit.addEventListener('click', async (e) => {
            e.preventDefault();
            await createPublicGallery();
        });
    }

    if (needMoreModalClose) {
        needMoreModalClose.addEventListener('click', () => {
            hideNeedMoreDialog();
        });
    }
    
    // Close upload area button
    if (closeUploadBtn) {
        closeUploadBtn.addEventListener('click', () => {
            if (uploadArea) uploadArea.style.display = 'none';
            if (closeUploadBtn) closeUploadBtn.style.display = 'none';
            if (uploadBtn) uploadBtn.style.display = 'block';
        if (uploadArea) uploadArea.classList.remove('keep-open', 'is-uploading');
        if (uploadDropzone) uploadDropzone.style.display = 'block';
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
    currentSettings = null;
    currentLimits = null;
    updateLimitBanner();
    if (currentGallery) {
        sessionStorage.removeItem(`gallery_password_${currentGallery}`);
        sessionStorage.removeItem(`gallery_view_password_${currentGallery}`);
    }
    if (headerPasswordInput) headerPasswordInput.value = '';
    updateLoginUI();
}

function getRecentGalleries() {
    try {
        const raw = localStorage.getItem('recent_galleries');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveRecentGalleries(list) {
    try {
        localStorage.setItem('recent_galleries', JSON.stringify(list));
    } catch (e) {
        // ignore
    }
}

function addVisitedGallery(name) {
    const normalized = (name || '').trim();
    if (!normalized) return;
    const list = getRecentGalleries().filter(g => g.toLowerCase() !== normalized.toLowerCase());
    list.unshift(normalized);
    const trimmed = list.slice(0, 5);
    saveRecentGalleries(trimmed);
}

function renderRecentGalleries() {
    if (!recentVisits || !recentList) return;
    const list = getRecentGalleries();
    if (!list.length) {
        recentVisits.style.display = 'none';
        recentList.innerHTML = '';
        return;
    }
    recentVisits.style.display = 'block';
    recentList.innerHTML = '';
    list.forEach((name) => {
        const pill = document.createElement('button');
        pill.className = 'recent-pill';
        pill.textContent = name;
        pill.onclick = () => {
            if (galleryInput) galleryInput.value = name;
            const params = new URLSearchParams();
            params.set('gallery', name);
            window.history.pushState({}, '', `?${params.toString()}`);
            loadGallery(name);
        };
        recentList.appendChild(pill);
    });
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
        const canUpload = userCanUpload();
        uploadBtn.style.display = canUpload ? 'block' : 'none';
    }
    const canUploadNow = userCanUpload();
    if (uploadArea && !canUploadNow) {
        uploadArea.style.display = 'none';
    }
    if (closeUploadBtn && !canUploadNow) {
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

async function loadPublicConfig() {
    try {
        const resp = await fetch('api/index.php?action=public_config');
        const data = await resp.json();
        if (resp.ok && data.success && data.allowPublicGalleryCreation) {
            publicConfig = data;
            contactEmail = data.contactEmail || '';
            if (publicCreate) publicCreate.style.display = 'block';
            await fetchNameSuggestions();
        } else {
            if (publicCreate) publicCreate.style.display = 'none';
        }
    } catch (error) {
        // silent fail; public create stays hidden
        publicConfig = null;
    }
}

async function fetchNameSuggestions() {
    try {
        const resp = await fetch('api/index.php?action=suggest_gallery_names');
        const data = await resp.json();
        if (resp.ok && data.success && Array.isArray(data.suggestions) && data.suggestions.length) {
            nameSuggestions = data.suggestions;
            suggestionIndex = 0;
            updatePublicCreateName();
        }
    } catch (error) {
        console.error('Failed to fetch name suggestions', error);
    }
}

function rotateSuggestion() {
    if (!nameSuggestions || nameSuggestions.length === 0) {
        fetchNameSuggestions();
        return;
    }
    suggestionIndex = (suggestionIndex + 1) % nameSuggestions.length;
    updatePublicCreateName();
}

function updatePublicCreateName() {
    if (!publicCreateName) return;
    if (!nameSuggestions || nameSuggestions.length === 0) {
        publicCreateName.value = '';
        return;
    }
    const next = nameSuggestions[suggestionIndex] || nameSuggestions[0];
    publicCreateName.value = next;
    publicCreateName.classList.add('spin-text');
    setTimeout(() => publicCreateName.classList.remove('spin-text'), 400);
}

async function createPublicGallery() {
    if (!publicConfig || !publicConfig.allowPublicGalleryCreation) return;
    const name = (publicCreateName?.value || '').trim();
    if (!name) {
        await fetchNameSuggestions();
        if (publicCreateName && publicCreateName.value) {
            return createPublicGallery();
        }
        return;
    }
    if (publicCreateStatus) {
        publicCreateStatus.textContent = 'Creating...';
        publicCreateStatus.style.color = 'var(--text-secondary)';
    }
    try {
        const formData = new FormData();
        formData.append('action', 'create_gallery_public');
        formData.append('name', name);
        const resp = await fetch('api/index.php?action=create_gallery_public', {
            method: 'POST',
            body: formData
        });
        const data = await resp.json();
        if (resp.ok && data.success) {
            if (publicCreateStatus) {
                publicCreateStatus.textContent = 'Created!';
                publicCreateStatus.style.color = 'var(--text-secondary)';
            }
            if (galleryInput) galleryInput.value = name;
            window.history.pushState({}, '', `?gallery=${encodeURIComponent(name)}`);
            await loadGallery(name);
        } else {
            if (publicCreateStatus) {
                publicCreateStatus.textContent = data.error || 'Failed to create';
                publicCreateStatus.style.color = 'var(--error)';
            }
        }
    } catch (error) {
        console.error('Create public gallery failed', error);
        if (publicCreateStatus) {
            publicCreateStatus.textContent = 'Failed to create';
            publicCreateStatus.style.color = 'var(--error)';
        }
    }
}

// Load gallery
async function loadGallery(galleryName, dir = '', view = currentView) {
    currentGallery = galleryName;
    currentDir = normalizeRelativePath(dir || '');
    currentView = view === 'flat' ? 'flat' : 'dir';
    viewerPassword = sessionStorage.getItem(`gallery_view_password_${galleryName}`) || '';
    // reset upload UI early; will re-show if allowed
    const keepUploadAreaOpen = uploadArea?.classList.contains('keep-open') || uploadArea?.classList.contains('is-uploading');
    if (uploadBtn) uploadBtn.style.display = 'none';
    if (uploadArea && !keepUploadAreaOpen) uploadArea.style.display = 'none';
    if (closeUploadBtn) {
        closeUploadBtn.style.display = keepUploadAreaOpen ? 'block' : 'none';
    }
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
            currentSettings = null;
            currentLimits = null;
            updateLimitBanner();
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
            currentSettings = data.settings || null;
            currentLimits = data.limits || null;
            addVisitedGallery(galleryName);
            renderRecentGalleries();
            if (!galleryHasViewPassword) {
                viewerPassword = '';
                sessionStorage.removeItem(`gallery_view_password_${galleryName}`);
            }
            updateLimitBanner();
            
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
            
            // Respect open upload area so progress/results stay visible
            if (uploadArea) {
                if (keepUploadAreaOpen) {
                    uploadArea.style.display = 'block';
                } else {
                    uploadArea.style.display = 'none';
                    uploadArea.classList.remove('keep-open', 'is-uploading');
                }
            }
            if (closeUploadBtn) {
                closeUploadBtn.style.display = keepUploadAreaOpen ? 'block' : 'none';
            }
        } else {
            showError(data.error || 'Failed to load gallery');
            if (galleryGrid) galleryGrid.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            if (gallerySelector) gallerySelector.style.display = 'flex';
            if (headerRight) headerRight.style.display = 'none';
            if (brandTitle) brandTitle.style.display = 'block';
            currentSettings = null;
            currentLimits = null;
            updateLimitBanner();
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
        currentSettings = null;
        currentLimits = null;
        updateLimitBanner();
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
        const canUpload = userCanUpload();
        const msg = canUpload
            ? 'No photos yet. Drag your images here or click Upload.'
            : 'This gallery is empty';
        galleryGrid.innerHTML = `<div class="empty-state"><p>${msg}</p></div>`;
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

function formatMBOneDecimalComma(bytes) {
    const mb = (bytes || 0) / (1024 * 1024);
    return mb.toFixed(1).replace('.', ',') + ' MB';
}

function showNeedMoreDialog(actionsOverride) {
    if (!needMoreModal || !needMoreModalActions || !needMoreModalDesc) return;
    const modalTitle = needMoreModal.querySelector('h3');
    if (modalTitle) modalTitle.textContent = 'Need more?';
    needMoreModalDesc.textContent = 'You can contact the admin to get a higher data limit. If you just want to extend the expiry date, click the button "Extend".';
    needMoreModalActions.innerHTML = '';
    const btnExtend = document.createElement('button');
    btnExtend.className = 'btn-primary';
    btnExtend.textContent = 'Extend';
    btnExtend.onclick = () => extendGalleryLifetime();
    needMoreModalActions.appendChild(btnExtend);

    const emailText = contactEmail || 'admin@example.com';
    const emailLink = document.createElement('a');
    emailLink.href = `mailto:${emailText}`;
    emailLink.className = 'btn-secondary';
    emailLink.textContent = emailText;
    needMoreModalActions.appendChild(emailLink);

    needMoreModal.style.display = 'flex';
}

async function extendGalleryLifetime() {
    if (!currentGallery) return;
    try {
        const formData = new FormData();
        formData.append('action', 'extend_gallery');
        formData.append('gallery', currentGallery);
        if (viewerPassword) formData.append('viewPassword', viewerPassword);
        const resp = await fetch('api/index.php?action=extend_gallery', {
            method: 'POST',
            body: formData
        });
        const data = await resp.json();
        if (!resp.ok || !data.success) {
            alert(data.error || 'Failed to extend gallery');
            return;
        }
        currentLimits = data.limits || currentLimits;
        currentSettings = data.settings || currentSettings;
        updateLimitBanner();
        hideNeedMoreDialog();
        await loadGallery(currentGallery, currentDir, currentView);
    } catch (e) {
        console.error('Extend failed', e);
        alert('Failed to extend gallery');
    }
}

function hideNeedMoreDialog() {
    if (needMoreModal) needMoreModal.style.display = 'none';
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

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.title = `Delete folder ${dir.name}`;
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteDirectory(dir.path);
        };
        card.appendChild(deleteBtn);
        
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
            uploadArea.classList.add('keep-open');
            if (closeUploadBtn) closeUploadBtn.style.display = 'block';
            if (uploadBtn) uploadBtn.style.display = 'none';
            // Scroll to upload area
            uploadArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (uploadDropzone) uploadDropzone.style.display = 'block';
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

function userCanUpload() {
    const isEditProtected = galleryHasEditPassword;
    const viewerUploadsAllowed = currentSettings?.viewerUploadsEnabled;
    const limitsOk = !currentLimits || !Array.isArray(currentLimits.reasons) || currentLimits.reasons.length === 0;
    return hasViewAccess && limitsOk && (!isEditProtected || isLoggedIn || viewerUploadsAllowed);
}

function updateLimitBanner() {
    if (!limitBanner || !limitBannerText || !limitBannerActions) return;
    if (!currentLimits) {
        limitBanner.style.display = 'none';
        limitBannerActions.innerHTML = '';
        return;
    }

    const reasons = Array.isArray(currentLimits.reasons) ? currentLimits.reasons : [];
    const stats = currentLimits.stats || {};
    const usedBytesText = formatMBOneDecimalComma(stats.totalBytes || 0);
    const maxBytesText = currentLimits.maxBytes
        ? formatMBOneDecimalComma(currentLimits.maxBytes)
        : null;
    const bytesText = maxBytesText ? `${usedBytesText} of ${maxBytesText}` : `${usedBytesText} used`;
    const photosText = currentLimits.maxPhotos
        ? `${stats.fileCount || 0} of ${currentLimits.maxPhotos} photos`
        : `${stats.fileCount || 0} photos`;
    const expiresText = currentLimits.expiresAt
        ? `Expires on ${new Date(currentLimits.expiresAt).toLocaleDateString()}`
        : 'No expiry';

    const blocked = reasons.length > 0;
    const reasonText = blocked ? 'Quota reached' : '';

    limitBannerText.innerHTML = '';

    const infoRow = document.createElement('div');
    infoRow.className = 'limit-banner-row';

    const infoGroup = document.createElement('div');
    infoGroup.className = 'limit-banner-info';

    const bytesBtn = document.createElement('button');
    bytesBtn.type = 'button';
    bytesBtn.className = 'link-button';
    bytesBtn.textContent = bytesText;
    bytesBtn.onclick = () => showNeedMoreDialog();

    const photosBtn = document.createElement('button');
    photosBtn.type = 'button';
    photosBtn.className = 'link-button';
    photosBtn.textContent = ` · ${photosText}`;
    photosBtn.onclick = () => showNeedMoreDialog();

    const expiresBtn = document.createElement('button');
    expiresBtn.type = 'button';
    expiresBtn.className = 'link-button';
    expiresBtn.textContent = ` · ${expiresText}`;
    expiresBtn.onclick = () => showNeedMoreDialog();

    infoGroup.appendChild(bytesBtn);
    infoGroup.appendChild(photosBtn);
    infoGroup.appendChild(expiresBtn);
    infoRow.appendChild(infoGroup);

    if (reasonText) {
        const reasonSpan = document.createElement('span');
        reasonSpan.className = 'limit-banner-reason';
        reasonSpan.textContent = reasonText;
        infoRow.appendChild(reasonSpan);
    }

    limitBannerText.appendChild(infoRow);
    limitBanner.classList.toggle('limit-banner--blocked', blocked);
    limitBanner.style.display = 'block';

    limitBannerActions.innerHTML = '';
    // No inline actions; use the Need more? dialog instead.
}

function openUploadAreaForDrag() {
    if (!uploadArea) return;
    uploadArea.style.display = 'block';
    uploadArea.classList.add('keep-open');
    if (closeUploadBtn) closeUploadBtn.style.display = 'block';
    if (uploadBtn) uploadBtn.style.display = 'none';
    uploadArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (uploadDropzone) uploadDropzone.style.display = 'block';
    if (uploadConflictModal) uploadConflictModal.style.display = 'none';
}

let lastUploadPermissionNotice = 0;
function showUploadPermissionNotice() {
    const now = Date.now();
    if (now - lastUploadPermissionNotice < 3000) return; // throttle to avoid spam
    lastUploadPermissionNotice = now;
    const blockedByLimit = currentLimits && Array.isArray(currentLimits.reasons) && currentLimits.reasons.length > 0;
    if (blockedByLimit) {
        alert('Upload limit reached for this gallery. See the limit banner for details.');
    } else {
        alert('You need permission to upload files to this gallery.');
    }
}

function updateViewToggleLabel() {
    if (!viewToggleBtn) return;
    viewToggleBtn.textContent = currentView === 'flat'
        ? 'Flat View'
        : 'Folder View';
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
        const hasItems = items && items.length > 0;
        const hasDirectory = hasItems && Array.from(items).some((it) => {
            const entry = it.webkitGetAsEntry ? it.webkitGetAsEntry() : null;
            return entry && entry.isDirectory;
        });

        if (hasItems && hasDirectory) {
            extractFilesFromItems(items)
                .then((files) => uploadFiles(files))
                .catch((err) => {
                    console.error('Folder drop parsing failed:', err);
                    const fallback = Array.from(e.dataTransfer.files || []);
                    uploadFiles(fallback);
                });
        } else {
            const files = Array.from(e.dataTransfer.files || []);
            uploadFiles(files);
        }
    });
}

// Global drag & drop to start uploads anywhere on the page
document.addEventListener('dragover', (e) => {
    if (!e.dataTransfer) return;
    e.preventDefault();
    if (!currentGallery || !userCanUpload()) return;
    if (uploadDropzone && (uploadDropzone === e.target || uploadDropzone.contains(e.target))) return;
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    openUploadAreaForDrag();
});

document.addEventListener('drop', (e) => {
    if (!e.dataTransfer) return;
    e.preventDefault();
    if (!currentGallery || !userCanUpload()) {
        showUploadPermissionNotice();
        return;
    }
    if (uploadDropzone && (uploadDropzone === e.target || uploadDropzone.contains(e.target))) return;
    openUploadAreaForDrag();
    if (uploadDropzone) uploadDropzone.style.borderColor = 'var(--border)';
    const items = e.dataTransfer?.items;
    const hasItems = items && items.length > 0;
    const hasDirectory = hasItems && Array.from(items).some((it) => {
        const entry = it.webkitGetAsEntry ? it.webkitGetAsEntry() : null;
        return entry && entry.isDirectory;
    });

    if (hasItems && hasDirectory) {
        extractFilesFromItems(items)
            .then((files) => uploadFiles(files))
            .catch((err) => {
                console.error('Global drop parsing failed:', err);
                const fallback = Array.from(e.dataTransfer.files || []);
                uploadFiles(fallback);
            });
    } else if (e.dataTransfer?.files?.length) {
        uploadFiles(Array.from(e.dataTransfer.files));
    }
});

function showConflictResolver(conflicts, totalCount = 0) {
    return new Promise((resolve, reject) => {
        if (!uploadConflictModal || !uploadConflictList || !uploadConflictConfirm || !uploadConflictCancel) {
            resolve({});
            return;
        }

        uploadConflictList.innerHTML = '';
        const selects = [];

        const heading = uploadConflictModal.querySelector('.upload-conflict-headings h4');
        const sub = uploadConflictModal.querySelector('.upload-conflict-headings p');
        if (heading) {
            heading.textContent = `Duplicates found (${conflicts.length}${totalCount ? ` / ${totalCount} files` : ''})`;
        }
        if (sub) {
            sub.textContent = `${conflicts.length} duplicate${conflicts.length === 1 ? '' : 's'} out of ${totalCount || conflicts.length} files. Choose what to do before uploading.`;
        }

        conflicts.forEach((conflict) => {
            const item = document.createElement('div');
            item.className = 'upload-conflict-item';

            const name = document.createElement('div');
            name.className = 'upload-conflict-name';
            name.textContent = conflict.safePath || conflict.relativePath || conflict.file?.name || 'Existing file';

            const select = document.createElement('select');
            select.innerHTML = `
                <option value="add">Add as new (rename)</option>
                <option value="replace">Replace existing</option>
                <option value="skip">Skip</option>
            `;
            select.value = 'add';
            select.dataset.path = conflict.safePath;

            item.appendChild(name);
            item.appendChild(select);
            uploadConflictList.appendChild(item);
            selects.push(select);
        });

        if (uploadConflictApplyAllBlock) {
            uploadConflictApplyAllBlock.style.display = conflicts.length > 1 ? 'flex' : 'none';
        }

        if (uploadConflictApplyAllBtn && uploadConflictApplyAllSelect) {
            uploadConflictApplyAllBtn.onclick = () => {
                const choice = uploadConflictApplyAllSelect.value || 'add';
                selects.forEach((sel) => sel.value = choice);
            };
        }

        uploadConflictConfirm.onclick = () => {
            const choices = {};
            selects.forEach((sel) => {
                const path = sel.dataset.path;
                const value = sel.value || 'add';
                if (path) choices[path] = value;
            });
            uploadConflictModal.style.display = 'none';
            resolve(choices);
        };

        uploadConflictCancel.onclick = () => {
            uploadConflictModal.style.display = 'none';
            reject(new Error('cancelled'));
        };

        uploadConflictModal.style.display = 'block';
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
    if (!userCanUpload()) {
        showUploadPermissionNotice();
        return;
    }

    if (currentLimits && Array.isArray(currentLimits.reasons) && currentLimits.reasons.length > 0) {
        updateLimitBanner();
        return;
    }
    
    if (!files || files.length === 0) {
        return;
    }

    if (uploadArea) {
        uploadArea.style.display = 'block';
        uploadArea.classList.add('keep-open', 'is-uploading');
        uploadArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (closeUploadBtn) closeUploadBtn.style.display = 'block';
    if (uploadBtn) uploadBtn.style.display = 'none';
    if (uploadProgress) uploadProgress.innerHTML = '';
    if (uploadDropzone) uploadDropzone.style.display = 'none'; // hide dropzone after starting upload
    const uploadResults = [];

    // Build safe paths and detect duplicates before uploading
    const baseDir = currentDir ? normalizeRelativePath(currentDir) : '';

    // Fetch a flat list to catch duplicates in subfolders, not just the current view
    let existingPaths = new Set((currentFiles || []).map(f => normalizeRelativePath(f.path)));
    try {
        const flatPaths = await fetchExistingPathsForConflicts();
        if (flatPaths && flatPaths.size > 0) {
            existingPaths = flatPaths;
        }
    } catch (err) {
        console.warn('Conflict pre-check fallback to current view:', err);
    }
    const preparedEntries = files.map((entry) => {
        const file = entry.file ? entry.file : entry;
        const relativePath = normalizeRelativePath(entry.path || file.webkitRelativePath || file.name);
        const safePath = computeSafePath(relativePath, baseDir);
        const conflict = existingPaths.has(safePath);
        return { file, relativePath, safePath, conflict };
    });

    const conflicts = preparedEntries.filter(e => e.conflict);
    let conflictChoices = {};

    if (conflicts.length > 0) {
        try {
            conflictChoices = await showConflictResolver(conflicts, preparedEntries.length);
        } catch (err) {
            // User cancelled
            if (uploadArea) uploadArea.classList.remove('is-uploading');
            if (uploadDropzone) uploadDropzone.style.display = 'block';
            return;
        }
    }

    for (const entry of preparedEntries) {
        const choice = conflictChoices[entry.safePath] || (entry.conflict ? 'add' : 'add');
        const result = await uploadFile(entry.file, entry.safePath, choice);
        uploadResults.push(result);
    }
    
    if (uploadArea) uploadArea.classList.remove('is-uploading');

    // Reload gallery after uploads complete
    await loadGallery(currentGallery, currentDir, currentView);

    // Show a concise summary below the progress list
    if (uploadProgress && uploadResults.length > 0) {
        const successCount = uploadResults.filter(r => r.success).length;
        const summary = document.createElement('div');
        const allSuccess = successCount === uploadResults.length;
        summary.className = `upload-summary ${allSuccess ? 'success' : 'error'}`;
        summary.textContent = allSuccess
            ? `Uploaded ${uploadResults.length} file${uploadResults.length > 1 ? 's' : ''} successfully.`
            : `Uploaded ${successCount}/${uploadResults.length} files. Check errors above.`;
        uploadProgress.appendChild(summary);
    }
}

async function fetchExistingPathsForConflicts() {
    if (!currentGallery) return new Set();
    const viewPasswordParam = viewerPassword ? `&viewPassword=${encodeURIComponent(viewerPassword)}` : '';
    const url = `api/index.php?action=list&gallery=${encodeURIComponent(currentGallery)}&view=flat${viewPasswordParam}`;
    const resp = await fetch(url);
    if (!resp.ok) return new Set();
    const data = await resp.json();
    if (!data || !data.files) return new Set();
    const set = new Set();
    data.files.forEach(f => {
        if (f.path) set.add(normalizeRelativePath(f.path));
    });
    return set;
}

async function uploadFile(
    file,
    relativePath,
    conflictMode = 'add'
) {
    const baseDir = currentDir ? normalizeRelativePath(currentDir) : '';
    const safePath = computeSafePath(relativePath || file.webkitRelativePath || file.name, baseDir);
    
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
    if (uploadProgress) uploadProgress.appendChild(item);
    
    try {
        let fileToUpload = file;
        
        // Compress image if needed
        if (file.type.startsWith('image/')) {
            fileToUpload = await compressImage(file);
        }
        
        const sendUpload = (modeToUse) => {
            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('path', safePath);
            formData.append('conflict', modeToUse);
            
            return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = (e.loaded / e.total) * 100;
                    progressFill.style.width = percent + '%';
                }
            });
            
            xhr.addEventListener('load', () => {
                let response = {};
                try {
                    response = JSON.parse(xhr.responseText || '{}');
                } catch (err) {
                    // ignore parse error; will fallback to generic message
                }
                
                if (xhr.status === 200) {
                    if (response.skipped) {
                        if (name) {
                            name.textContent = `${file.name} - Skipped (exists)`;
                            name.style.color = 'var(--text-secondary)';
                        }
                        resolve({ success: true, skipped: true });
                        return;
                    }
                    if (response.limits) {
                        currentLimits = response.limits;
                        updateLimitBanner();
                    }
                    if (progressFill) progressFill.style.width = '100%';
                    if (item) item.style.opacity = '0.5';
                    resolve({ success: true });
                } else {
                    const errorMsg = response.error || 'Upload failed';
                    if (name) {
                        name.textContent = `${file.name} - Error: ${errorMsg}`;
                        name.style.color = 'var(--error)';
                    }
                    
                    // If unauthorized, logout
                    if (xhr.status === 401) {
                        logout();
                        alert('Password invalid. Please login again.');
                    } else if (xhr.status === 413 && response.limits) {
                        currentLimits = response.limits;
                        updateLimitBanner();
                    }
                    resolve({ success: false, error: errorMsg });
                }
            });
            
            xhr.addEventListener('error', () => {
                name.textContent = `${file.name} - Upload failed`;
                name.style.color = 'var(--error)';
                resolve({ success: false, error: 'Upload failed' });
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
        });
        };
        
        const modeToUse = conflictMode || 'add';
        if (modeToUse === 'skip') {
            if (name) {
                name.textContent = `${file.name} - Skipped (exists)`;
                name.style.color = 'var(--text-secondary)';
            }
            return { success: true, skipped: true };
        }

        return await sendUpload(modeToUse);
        
    } catch (error) {
        console.error('Upload error:', error);
        name.textContent = `${file.name} - Error: ${error.message}`;
        name.style.color = 'var(--error)';
        return { success: false, error: error.message };
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
            loadGallery(currentGallery, currentDir, currentView);
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

// Delete directory (recursive)
async function deleteDirectory(dirPath) {
    if (!isLoggedIn || !dirPath) {
        return;
    }
    
    if (!confirm('Delete this folder and all its contents?')) {
        return;
    }
    
    try {
        let deleteUrl = `api/index.php?action=delete_dir&gallery=${encodeURIComponent(currentGallery)}&dir=${encodeURIComponent(dirPath)}`;
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
            const isDeletingCurrentDir = normalizeRelativePath(dirPath) === normalizeRelativePath(currentDir);
            if (isDeletingCurrentDir) {
                const parent = currentDir.split('/').slice(0, -1).join('/');
                loadGallery(currentGallery, parent, currentView);
            } else {
                loadGallery(currentGallery, currentDir, currentView);
            }
        } else {
            if (response.status === 401) {
                logout();
                alert('Password invalid. Please login again.');
            } else {
                alert('Error: ' + (data.error || 'Failed to delete folder'));
            }
        }
    } catch (error) {
        console.error('Delete directory error:', error);
        alert('Failed to delete folder');
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

function computeSafePath(relativePath, baseDir = '') {
    const incoming = normalizeRelativePath(relativePath || '');
    if (!incoming && !baseDir) return '';
    const base = baseDir ? normalizeRelativePath(baseDir) : '';
    return base ? normalizeRelativePath(`${base}/${incoming}`) : incoming;
}

function showError(message) {
    // Simple error display - could be enhanced with a toast notification
    console.error(message);
}

