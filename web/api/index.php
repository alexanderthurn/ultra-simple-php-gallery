<?php
/**
 * Main API endpoint for gallery operations
 * Handles: list, upload, delete actions
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/helper.php';

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        handleList();
        break;
    
    case 'upload':
        handleUpload();
        break;
    
    case 'delete':
        handleDelete();
        break;
    
    case 'download_zip':
        handleDownloadZip();
        break;
    
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
        break;
}

function handleList() {
    $gallery = $_GET['gallery'] ?? '';
    $dir = $_GET['dir'] ?? '';
    
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
    
    $dir = sanitizeRelativePath($dir);
    
    // Validate directory path
    $targetPath = $dir ? $galleryPath . '/' . $dir : $galleryPath;
    if (!is_dir($targetPath)) {
        http_response_code(404);
        echo json_encode(['error' => 'Directory not found']);
        return;
    }
    
    $listing = listGalleryDirectory($gallery, $dir);
    $hasPassword = file_exists($galleryPath . '/.password');
    
    echo json_encode([
        'success' => true,
        'gallery' => $gallery,
        'dir' => $dir,
        'directories' => $listing['dirs'],
        'files' => $listing['files'],
        'hasPassword' => $hasPassword
    ]);
}

function handleUpload() {
    $gallery = $_GET['gallery'] ?? '';
    $password = $_GET['password'] ?? '';
    
    if (empty($gallery)) {
        http_response_code(400);
        echo json_encode(['error' => 'Gallery name required']);
        return;
    }
    
    $galleryPath = getGalleryPath($gallery);
    $hasPassword = file_exists($galleryPath . '/.password');
    
    // Only require password if gallery has password protection
    if ($hasPassword) {
        if (empty($password)) {
            http_response_code(401);
            echo json_encode(['error' => 'Password required']);
            return;
        }
        
        // Verify password
        if (!verifyGalleryPassword($gallery, $password)) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid password']);
            return;
        }
    }
    
    $galleryPath = getGalleryPath($gallery);
    
    if (!is_dir($galleryPath)) {
        http_response_code(404);
        echo json_encode(['error' => 'Gallery not found']);
        return;
    }
    
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'No file uploaded or upload error']);
        return;
    }
    
    $file = $_FILES['file'];
    $filename = basename($file['name']);
    $requestedPath = $_POST['path'] ?? $filename;
    
    // Sanitize path and preserve folder hierarchy (if provided)
    $relativePath = sanitizeRelativePath($requestedPath);
    if (empty($relativePath)) {
        $relativePath = sanitizePathSegment($filename);
    }
    
    // Validate file type
    if (!isSupportedFile($filename)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid file type. Unsupported extension.']);
        return;
    }
    
    // Break out directory + basename
    $pathInfo = pathinfo($relativePath);
    $dirPart = $pathInfo['dirname'] !== '.' ? $pathInfo['dirname'] : '';
    $baseName = sanitizePathSegment($pathInfo['basename']);
    $extension = $pathInfo['extension'] ?? '';
    
    // Ensure directory exists
    $targetDir = $dirPart ? $galleryPath . '/' . $dirPart : $galleryPath;
    if (!is_dir($targetDir)) {
        if (!mkdir($targetDir, 0755, true)) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create target folder']);
            return;
        }
    }
    
    // Initial target path
    $targetPath = $targetDir . '/' . $baseName;
    
    // Handle overwrite (keep in same dir)
    if (file_exists($targetPath)) {
        $nameOnly = $pathInfo['filename'] ?? pathinfo($baseName, PATHINFO_FILENAME);
        $ext = $extension ? '.' . $extension : (pathinfo($baseName, PATHINFO_EXTENSION) ? '.' . pathinfo($baseName, PATHINFO_EXTENSION) : '');
        $counter = 1;
        do {
            $candidate = $nameOnly . '_' . $counter . $ext;
            $targetPath = $targetDir . '/' . $candidate;
            $relativePath = ($dirPart ? $dirPart . '/' : '') . $candidate;
            $counter++;
        } while (file_exists($targetPath));
    } else {
        // Update relativePath with sanitized base name
        $relativePath = ($dirPart ? $dirPart . '/' : '') . $baseName;
    }
    
    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save file']);
        return;
    }
    
    // Generate thumbnail for images
    if (isImageFile($targetPath)) {
        generateThumbnail($targetPath);
        
        // Resize image if too large (max 1080px width)
        try {
            if (extension_loaded('imagick')) {
                $imagick = new Imagick($targetPath);
                $width = $imagick->getImageWidth();
                
                if ($width > 1080) {
                    $height = $imagick->getImageHeight();
                    $newHeight = intval(($height / $width) * 1080);
                    $imagick->resizeImage(1080, $newHeight, Imagick::FILTER_LANCZOS, 1, true);
                    
                    if ($imagick->getImageFormat() === 'JPEG') {
                        $imagick->setImageCompressionQuality(85);
                    }
                    
                    $imagick->writeImage($targetPath);
                }
                
                $imagick->clear();
                $imagick->destroy();
            }
        } catch (Exception $e) {
            error_log("Image resize failed: " . $e->getMessage());
        }
    }
    
    // Use the resolved relativePath for response
    $fileResponse = buildFileResponse(basename($targetPath), $relativePath, $targetPath);
    
    echo json_encode([
        'success' => true,
        'file' => $fileResponse
    ]);
}

function handleDelete() {
    $gallery = $_GET['gallery'] ?? '';
    $file = $_GET['file'] ?? '';
    $password = $_GET['password'] ?? '';
    
    if (empty($gallery) || empty($file)) {
        http_response_code(400);
        echo json_encode(['error' => 'Gallery name and file path required']);
        return;
    }
    
    $galleryPath = getGalleryPath($gallery);
    $hasPassword = file_exists($galleryPath . '/.password');
    
    // Only require password if gallery has password protection
    if ($hasPassword) {
        if (empty($password)) {
            http_response_code(401);
            echo json_encode(['error' => 'Password required']);
            return;
        }
        
        // Verify password
        if (!verifyGalleryPassword($gallery, $password)) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid password']);
            return;
        }
    }
    
    // Validate file path
    if (!validateFilePath($file, getGalleryPath($gallery))) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid file path']);
        return;
    }
    
    $filePath = getGalleryPath($gallery) . '/' . $file;
    
    if (!file_exists($filePath)) {
        http_response_code(404);
        echo json_encode(['error' => 'File not found']);
        return;
    }
    
    // Delete file
    if (!unlink($filePath)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete file']);
        return;
    }
    
    // Delete thumbnail if it exists
    if (isImageFile($file)) {
        $thumbPath = getThumbnailPath($filePath);
        if (file_exists($thumbPath)) {
            unlink($thumbPath);
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'File deleted successfully'
    ]);
}

function handleDownloadZip() {
    $gallery = $_GET['gallery'] ?? '';
    
    if (empty($gallery)) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Gallery name required']);
        return;
    }
    
    $galleryPath = getGalleryPath($gallery);
    
    if (!is_dir($galleryPath)) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Gallery not found']);
        return;
    }
    
    // Check if ZipArchive is available
    if (!class_exists('ZipArchive')) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'ZipArchive extension not available']);
        return;
    }
    
    // Create zip file
    $zipFilename = $gallery . '_' . date('Y-m-d_His') . '.zip';
    $zipPath = sys_get_temp_dir() . '/' . $zipFilename;
    
    $zip = new ZipArchive();
    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Failed to create zip file']);
        return;
    }
    
    // Add files to zip (excluding thumbnails and password files)
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($galleryPath, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    
    $fileCount = 0;
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
            
            // Only add supported files
            if (isSupportedFile($filename)) {
                $filePath = $file->getPathname();
                $relativePath = str_replace($galleryPath . '/', '', $filePath);
                $zip->addFile($filePath, $relativePath);
                $fileCount++;
            }
        }
    }
    
    $zip->close();
    
    if ($fileCount === 0) {
        unlink($zipPath);
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'No files to download']);
        return;
    }
    
    // Send zip file to browser
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $zipFilename . '"');
    header('Content-Length: ' . filesize($zipPath));
    header('Cache-Control: no-cache, must-revalidate');
    header('Expires: 0');
    
    readfile($zipPath);
    
    // Clean up temporary file
    unlink($zipPath);
    exit;
}

