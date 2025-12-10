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
    
    case 'change_admin_password':
        handleChangeAdminPassword();
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
            
            // Count files (excluding thumbnails and password files)
            $fileCount = 0;
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($galleryPath, RecursiveDirectoryIterator::SKIP_DOTS)
            );
            
            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $filename = $file->getFilename();
                    
                    // Skip hidden files and password files
                    if ($filename[0] === '.' || $filename === '.password') {
                        continue;
                    }
                    
                    // Skip thumbnail files
                    if (strpos($filename, '_thumb.') !== false) {
                        continue;
                    }
                    
                    // Only count image and video files
                    if (isImageFile($filename) || isVideoFile($filename)) {
                        $fileCount++;
                    }
                }
            }
            
            $galleries[] = [
                'name' => $dir,
                'hasPassword' => $hasPassword,
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
    
    $passwordFile = $galleryPath . '/.password';
    
    // If password is empty, remove the password file
    if (empty($password)) {
        if (file_exists($passwordFile)) {
            if (unlink($passwordFile)) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Password removed successfully'
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to remove password']);
            }
        } else {
            // Password file doesn't exist, already no password
            echo json_encode([
                'success' => true,
                'message' => 'Gallery already has no password'
            ]);
        }
        return;
    }
    
    // Set new password
    if (setGalleryPassword($gallery, $password)) {
        echo json_encode([
            'success' => true,
            'message' => 'Password set successfully'
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

