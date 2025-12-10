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

$action = $_GET['action'] ?? $_POST['action'] ?? '';

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
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    
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
            
            // Count files (excluding thumbnails and password files)
            $fileCount = 0;
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($galleryPath, RecursiveDirectoryIterator::SKIP_DOTS)
            );
            
            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $filename = $file->getFilename();
                    
                    // Skip hidden files and password files
                    if ($filename[0] === '.' || $filename === '.password' || $filename === '.viewpassword') {
                        continue;
                    }
                    
                    // Skip thumbnail files
                    if (strpos($filename, '_thumb.') !== false) {
                        continue;
                    }
                    
                    // Only count supported files
                    if (isSupportedFile($filename)) {
                        $fileCount++;
                    }
                }
            }
            
            $galleries[] = [
                'name' => $dir,
                'hasPassword' => $hasPassword,
                'hasEditPassword' => $hasPassword,
                'hasViewPassword' => $hasViewPassword,
                'fileCount' => $fileCount
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
    
    $name = $_POST['name'] ?? '';
    $password = $_POST['password'] ?? '';
    $viewPassword = $_POST['view_password'] ?? '';
    
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
    
    echo json_encode([
        'success' => true,
        'message' => 'Gallery created successfully',
        'gallery' => $sanitized
    ]);
}

function handleSetPassword() {
    requireAdmin();
    
    $gallery = $_POST['gallery'] ?? '';
    $password = $_POST['password'] ?? '';
    $type = $_POST['type'] ?? 'edit'; // 'edit' or 'view'
    
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
    
    $name = $_POST['name'] ?? '';
    
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

    $oldName = $_POST['old_name'] ?? '';
    $newName = $_POST['new_name'] ?? '';

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
    
    $page = $_GET['page'] ?? '';
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
    
    $page = $_POST['page'] ?? '';
    $content = $_POST['content'] ?? '';
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

function getSettingsPath() {
    return WEB_ROOT . '/api/settings.json';
}

function getDefaultSettings() {
    return [
        'maxImageWidth' => 1080,
        'maxImageFileSize' => 5242880,
        'maxFileSize' => 10485760
    ];
}

function readSettingsFile() {
    $defaults = getDefaultSettings();
    $path = getSettingsPath();

    if (!file_exists($path)) {
        return $defaults;
    }

    $content = file_get_contents($path);
    $decoded = json_decode($content, true);

    if (!is_array($decoded)) {
        return $defaults;
    }

    // Only keep known keys and merge with defaults
    return array_merge(
        $defaults,
        array_intersect_key($decoded, $defaults)
    );
}

function handleGetSettings() {
    requireAdmin();

    $settings = readSettingsFile();
    echo json_encode(['success' => true, 'settings' => $settings]);
}

function handleSaveSettings() {
    requireAdmin();

    $defaults = getDefaultSettings();

    $maxImageWidth = isset($_POST['max_image_width']) ? (int) $_POST['max_image_width'] : $defaults['maxImageWidth'];
    $maxImageFileSize = isset($_POST['max_image_file_size']) ? (int) $_POST['max_image_file_size'] : $defaults['maxImageFileSize'];
    $maxFileSize = isset($_POST['max_file_size']) ? (int) $_POST['max_file_size'] : $defaults['maxFileSize'];

    $settings = [
        'maxImageWidth' => max(0, $maxImageWidth),
        'maxImageFileSize' => max(0, $maxImageFileSize),
        'maxFileSize' => max(0, $maxFileSize)
    ];

    $path = getSettingsPath();
    $encoded = json_encode($settings, JSON_PRETTY_PRINT);

    if ($encoded === false || file_put_contents($path, $encoded) === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save settings']);
        return;
    }

    echo json_encode(['success' => true, 'settings' => $settings]);
}

