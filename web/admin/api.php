<?php
/**
 * Admin API endpoint
 * Handles: login, list_galleries, create_gallery, set_password, delete_gallery
 */

session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once dirname(__DIR__) . '/api/helper.php';

$action = isset($_GET['action'])
    ? $_GET['action']
    : (isset($_POST['action']) ? $_POST['action'] : '');

switch ($action) {
    case 'login':
        handleLogin();
        break;
    
    case 'logout':
        handleLogout();
        break;
    
    case 'list_galleries':
        handleListGalleries();
        break;
    
    case 'create_gallery':
        handleCreateGallery();
        break;
    
    case 'set_password':
        handleSetPassword();
        break;
    
    case 'delete_gallery':
        handleDeleteGallery();
        break;
    
    case 'rename_gallery':
        handleRenameGallery();
        break;

    case 'change_admin_password':
        handleChangeAdminPassword();
        break;
    
    case 'get_page':
        handleGetPage();
        break;
    
    case 'save_page':
        handleSavePage();
        break;

    case 'get_settings':
        handleGetSettings();
        break;

    case 'save_settings':
        handleSaveSettings();
        break;

    case 'get_gallery_settings':
        handleGetGallerySettings();
        break;

    case 'save_gallery_settings':
        handleSaveGallerySettings();
        break;
    
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
        break;
}

function requireAdmin() {
    if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        exit;
    }
}

function handleLogin() {
    $username = isset($_POST['username']) ? $_POST['username'] : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';
    
    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Username and password required']);
        return;
    }
    
    // If credentials don't exist, create them
    $usernameFile = ADMIN_ROOT . '/.username';
    $passwordFile = ADMIN_ROOT . '/.password';
    
    if (!file_exists($usernameFile) || !file_exists($passwordFile)) {
        // Create credentials with what the user provided
        file_put_contents($usernameFile, $username);
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        file_put_contents($passwordFile, $hashedPassword);
        
        $_SESSION['admin_logged_in'] = true;
        echo json_encode(['success' => true, 'message' => 'Admin credentials created and login successful']);
        return;
    }
    
    // Verify existing credentials
    if (isAdmin($username, $password)) {
        $_SESSION['admin_logged_in'] = true;
        echo json_encode(['success' => true, 'message' => 'Login successful']);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
    }
}

function handleLogout() {
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Logged out']);
}

function handleListGalleries() {
    requireAdmin();
    
    $galleries = [];
    
    if (!is_dir(DATA_ROOT)) {
        echo json_encode(['success' => true, 'galleries' => []]);
        return;
    }
    
    $dirs = scandir(DATA_ROOT);
    
    foreach ($dirs as $dir) {
        if ($dir === '.' || $dir === '..') {
            continue;
        }
        
        $galleryPath = DATA_ROOT . '/' . $dir;
        
        if (is_dir($galleryPath)) {
            $hasPassword = file_exists($galleryPath . '/.password');
            $hasViewPassword = file_exists($galleryPath . '/.viewpassword');
            $stats = getGalleryStats($dir);
            $settings = loadGallerySettings($dir);
            $limits = evaluateGalleryUploadAllowance($dir, $settings, 0, 0);
            
            $galleries[] = [
                'name' => $dir,
                'hasPassword' => $hasPassword,
                'hasEditPassword' => $hasPassword,
                'hasViewPassword' => $hasViewPassword,
                'fileCount' => $stats['fileCount'],
                'totalBytes' => $stats['totalBytes'],
                'settings' => $settings,
                'limits' => $limits
            ];
        }
    }
    
    echo json_encode([
        'success' => true,
        'galleries' => $galleries
    ]);
}

function handleCreateGallery() {
    requireAdmin();
    
    $name = isset($_POST['name']) ? $_POST['name'] : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';
    $viewPassword = isset($_POST['view_password']) ? $_POST['view_password'] : '';
    
    if (empty($name)) {
        http_response_code(400);
        echo json_encode(['error' => 'Gallery name required']);
        return;
    }
    
    $sanitized = sanitizeGalleryName($name);
    
    if ($sanitized !== $name) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid gallery name. Only alphanumeric, underscore, and hyphen allowed.']);
        return;
    }
    
    $galleryPath = getGalleryPath($sanitized);
    
    if (is_dir($galleryPath)) {
        http_response_code(400);
        echo json_encode(['error' => 'Gallery already exists']);
        return;
    }
    
    if (!mkdir($galleryPath, 0755, true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create gallery']);
        return;
    }
    
    // Set password if provided
    if (!empty($password)) {
        setGalleryPassword($sanitized, $password);
    }
    if (!empty($viewPassword)) {
        setGalleryViewPassword($sanitized, $viewPassword);
    }

    // Create initial gallery settings with admin defaults
    $settings = loadGallerySettings($sanitized, 'admin');
    
    echo json_encode([
        'success' => true,
        'message' => 'Gallery created successfully',
        'gallery' => $sanitized,
        'settings' => $settings
    ]);
}

function handleSetPassword() {
    requireAdmin();
    
    $gallery = isset($_POST['gallery']) ? $_POST['gallery'] : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';
    $type = isset($_POST['type']) ? $_POST['type'] : 'edit'; // 'edit' or 'view'
    
    if (empty($gallery)) {
        http_response_code(400);
        echo json_encode(['error' => 'Gallery name required']);
        return;
    }
    
    $galleryPath = getGalleryPath($gallery);
    
    if (!is_dir($galleryPath)) {
        http_response_code(404);
        echo json_encode(['error' => 'Gallery not found']);
        return;
    }
    
    $passwordFile = $type === 'view'
        ? $galleryPath . '/.viewpassword'
        : $galleryPath . '/.password';
    
    // If password is empty, remove the password file
    if (empty($password)) {
        if (file_exists($passwordFile)) {
            if (unlink($passwordFile)) {
                echo json_encode([
                    'success' => true,
                    'message' => ucfirst($type) . ' password removed successfully'
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to remove password']);
            }
        } else {
            // Password file doesn't exist, already no password
            echo json_encode([
                'success' => true,
                'message' => 'Gallery already has no ' . $type . ' password'
            ]);
        }
        return;
    }
    
    // Set new password
    $setter = $type === 'view' ? 'setGalleryViewPassword' : 'setGalleryPassword';
    if ($setter($gallery, $password)) {
        echo json_encode([
            'success' => true,
            'message' => ucfirst($type) . ' password set successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to set password']);
    }
}

function handleDeleteGallery() {
    requireAdmin();
    
    $name = isset($_POST['name']) ? $_POST['name'] : '';
    
    if (empty($name)) {
        http_response_code(400);
        echo json_encode(['error' => 'Gallery name required']);
        return;
    }
    
    $galleryPath = getGalleryPath($name);
    
    if (!is_dir($galleryPath)) {
        http_response_code(404);
        echo json_encode(['error' => 'Gallery not found']);
        return;
    }
    
    // Delete all files recursively
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($galleryPath, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    
    foreach ($iterator as $file) {
        if ($file->isDir()) {
            rmdir($file->getPathname());
        } else {
            unlink($file->getPathname());
        }
    }
    
    if (rmdir($galleryPath)) {
        echo json_encode([
            'success' => true,
            'message' => 'Gallery deleted successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete gallery']);
    }
}

function handleRenameGallery() {
    requireAdmin();

    $oldName = isset($_POST['old_name']) ? $_POST['old_name'] : '';
    $newName = isset($_POST['new_name']) ? $_POST['new_name'] : '';

    if (empty($oldName) || empty($newName)) {
        http_response_code(400);
        echo json_encode(['error' => 'Old and new gallery names are required']);
        return;
    }

    $sanitizedNew = sanitizeGalleryName($newName);
    if ($sanitizedNew !== $newName) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid gallery name. Only alphanumeric, underscore, and hyphen allowed.']);
        return;
    }

    // Prevent renaming to the same name (including case-only changes)
    if (strcasecmp($oldName, $sanitizedNew) === 0) {
        http_response_code(400);
        echo json_encode(['error' => 'New gallery name must be different']);
        return;
    }

    $oldPath = getGalleryPath($oldName);
    $newPath = getGalleryPath($sanitizedNew);

    if (!is_dir($oldPath)) {
        http_response_code(404);
        echo json_encode(['error' => 'Original gallery not found']);
        return;
    }

    if (is_dir($newPath)) {
        http_response_code(400);
        echo json_encode(['error' => 'A gallery with the new name already exists']);
        return;
    }

    // Handle case-insensitive file systems by renaming via a temporary name if needed
    $renameSource = $oldPath;
    $renameTarget = $newPath;
    $tempPath = null;
    if (strtolower($oldPath) === strtolower($newPath)) {
        $tempPath = $oldPath . '_tmp_' . uniqid();
        if (!rename($oldPath, $tempPath)) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to prepare gallery for renaming']);
            return;
        }
        $renameSource = $tempPath;
    }

    if (rename($renameSource, $renameTarget)) {
        if ($tempPath && is_dir($renameSource)) {
            // Cleanup temp path if it still exists for some reason
            @rmdir($renameSource);
        }
        echo json_encode([
            'success' => true,
            'message' => 'Gallery renamed successfully',
            'gallery' => $sanitizedNew
        ]);
    } else {
        // If we used a temp path, try to roll back
        if ($tempPath && is_dir($renameSource)) {
            @rename($renameSource, $oldPath);
        }
        http_response_code(500);
        echo json_encode(['error' => 'Failed to rename gallery']);
    }
}

function handleChangeAdminPassword() {
    requireAdmin();
    
    $usernameFile = ADMIN_ROOT . '/.username';
    $passwordFile = ADMIN_ROOT . '/.password';
    
    // Delete both files
    $deleted = true;
    if (file_exists($usernameFile)) {
        $deleted = $deleted && unlink($usernameFile);
    }
    if (file_exists($passwordFile)) {
        $deleted = $deleted && unlink($passwordFile);
    }
    
    if ($deleted) {
        // Destroy session
        session_destroy();
        echo json_encode([
            'success' => true,
            'message' => 'Admin credentials reset successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to reset credentials']);
    }
}

function handleGetPage() {
    requireAdmin();
    
    $page = isset($_GET['page']) ? $_GET['page'] : '';
    $allowed = ['imprint.html', 'dataprivacy.html'];
    
    if (!in_array($page, $allowed, true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid page']);
        return;
    }
    
    $filePath = WEB_ROOT . '/' . $page;
    if (!file_exists($filePath)) {
        http_response_code(404);
        echo json_encode(['error' => 'File not found']);
        return;
    }
    
    $content = file_get_contents($filePath);
    echo json_encode(['success' => true, 'content' => $content]);
}

function handleSavePage() {
    requireAdmin();
    
    $page = isset($_POST['page']) ? $_POST['page'] : '';
    $content = isset($_POST['content']) ? $_POST['content'] : '';
    $allowed = ['imprint.html', 'dataprivacy.html'];
    
    if (!in_array($page, $allowed, true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid page']);
        return;
    }
    
    $filePath = WEB_ROOT . '/' . $page;
    
    if (file_put_contents($filePath, $content) !== false) {
        echo json_encode(['success' => true, 'message' => 'Page saved']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save file']);
    }
}

function handleGetSettings() {
    requireAdmin();

    $settings = getSettings();
    echo json_encode(['success' => true, 'settings' => $settings]);
}

function handleSaveSettings() {
    requireAdmin();

    $defaults = getDefaultSettings();

    $maxImageWidth = isset($_POST['max_image_width']) ? (int) $_POST['max_image_width'] : $defaults['maxImageWidth'];
    $maxImageFileSize = isset($_POST['max_image_file_size']) ? (int) $_POST['max_image_file_size'] : $defaults['maxImageFileSize'];
    $maxFileSize = isset($_POST['max_file_size']) ? (int) $_POST['max_file_size'] : $defaults['maxFileSize'];
    $contactEmail = isset($_POST['contact_email']) ? trim($_POST['contact_email']) : $defaults['contactEmail'];
    $allowPublic = isset($_POST['allow_public_gallery_creation'])
        ? filter_var($_POST['allow_public_gallery_creation'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false
        : $defaults['allowPublicGalleryCreation'];
    $publicDefaultViewerUploads = isset($_POST['public_default_viewer_uploads_enabled'])
        ? filter_var($_POST['public_default_viewer_uploads_enabled'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false
        : $defaults['publicDefaultViewerUploadsEnabled'];
    $defaultViewerUploads = isset($_POST['default_viewer_uploads_enabled'])
        ? filter_var($_POST['default_viewer_uploads_enabled'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false
        : $defaults['defaultViewerUploadsEnabled'];
    $publicDefaultMaxBytes = isset($_POST['public_default_max_gallery_bytes']) ? (int) $_POST['public_default_max_gallery_bytes'] : $defaults['publicDefaultMaxGalleryBytes'];
    $publicDefaultMaxPhotos = isset($_POST['public_default_max_photos']) ? (int) $_POST['public_default_max_photos'] : $defaults['publicDefaultMaxPhotos'];
    $publicDefaultLifetimeDays = isset($_POST['public_default_lifetime_days']) ? (int) $_POST['public_default_lifetime_days'] : $defaults['publicDefaultLifetimeDays'];
    $defaultMaxBytes = isset($_POST['default_max_gallery_bytes']) ? (int) $_POST['default_max_gallery_bytes'] : $defaults['defaultMaxGalleryBytes'];
    $defaultMaxPhotos = isset($_POST['default_max_photos']) ? (int) $_POST['default_max_photos'] : $defaults['defaultMaxPhotos'];
    $defaultLifetimeDays = isset($_POST['default_lifetime_days']) ? (int) $_POST['default_lifetime_days'] : $defaults['defaultLifetimeDays'];

    $settings = [
        'maxImageWidth' => max(0, $maxImageWidth),
        'maxImageFileSize' => max(0, $maxImageFileSize),
        'maxFileSize' => max(0, $maxFileSize),
        'contactEmail' => $contactEmail,
        'allowPublicGalleryCreation' => $allowPublic ? true : false,
        'publicDefaultViewerUploadsEnabled' => $publicDefaultViewerUploads ? true : false,
        'publicDefaultMaxGalleryBytes' => max(0, $publicDefaultMaxBytes),
        'publicDefaultMaxPhotos' => max(0, $publicDefaultMaxPhotos),
        'publicDefaultLifetimeDays' => max(0, $publicDefaultLifetimeDays),
        'defaultViewerUploadsEnabled' => $defaultViewerUploads ? true : false,
        'defaultMaxGalleryBytes' => max(0, $defaultMaxBytes),
        'defaultMaxPhotos' => max(0, $defaultMaxPhotos),
        'defaultLifetimeDays' => max(0, $defaultLifetimeDays),
    ];

    $path = SETTINGS_PATH;
    $encoded = json_encode($settings, JSON_PRETTY_PRINT);

    if ($encoded === false || file_put_contents($path, $encoded) === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save settings']);
        return;
    }

    echo json_encode(['success' => true, 'settings' => $settings]);
}

function handleGetGallerySettings() {
    requireAdmin();

    $gallery = isset($_GET['gallery']) ? $_GET['gallery'] : '';
    if (empty($gallery)) {
        http_response_code(400);
        echo json_encode(['error' => 'Gallery name required']);
        return;
    }

    $galleryPath = getGalleryPath($gallery);
    if (!is_dir($galleryPath)) {
        http_response_code(404);
        echo json_encode(['error' => 'Gallery not found']);
        return;
    }

    $settings = loadGallerySettings($gallery);
    $limits = evaluateGalleryUploadAllowance($gallery, $settings, 0, 0);

    echo json_encode([
        'success' => true,
        'settings' => $settings,
        'limits' => $limits
    ]);
}

function handleSaveGallerySettings() {
    requireAdmin();

    $gallery = isset($_POST['gallery']) ? $_POST['gallery'] : '';
    if (empty($gallery)) {
        http_response_code(400);
        echo json_encode(['error' => 'Gallery name required']);
        return;
    }

    $galleryPath = getGalleryPath($gallery);
    if (!is_dir($galleryPath)) {
        http_response_code(404);
        echo json_encode(['error' => 'Gallery not found']);
        return;
    }

    $current = loadGallerySettings($gallery);
    $updated = [
        'viewerUploadsEnabled' => isset($_POST['viewer_uploads_enabled'])
            ? filter_var($_POST['viewer_uploads_enabled'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false
            : $current['viewerUploadsEnabled'],
        'maxGalleryBytes' => isset($_POST['max_gallery_bytes'])
            ? max(0, (int) $_POST['max_gallery_bytes'])
            : $current['maxGalleryBytes'],
        'maxPhotos' => isset($_POST['max_photos'])
            ? max(0, (int) $_POST['max_photos'])
            : $current['maxPhotos'],
        'lifetimeDays' => isset($_POST['lifetime_days'])
            ? max(0, (int) $_POST['lifetime_days'])
            : $current['lifetimeDays'],
        'limitActions' => $current['limitActions'],
        'createdAt' => $current['createdAt']
    ];

    $normalized = normalizeGallerySettings($updated, 'admin');

    if (!saveGallerySettings($gallery, $normalized)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save gallery settings']);
        return;
    }

    $limits = evaluateGalleryUploadAllowance($gallery, $normalized, 0, 0);

    echo json_encode([
        'success' => true,
        'settings' => $normalized,
        'limits' => $limits
    ]);
}

