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

$action = isset($_GET['action']) ? $_GET['action'] : '';

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
    
    case 'delete_dir':
        handleDeleteDir();
        break;
    
    case 'download_zip':
        handleDownloadZip();
        break;
    
    case 'create_gallery_public':
        handleCreateGalleryPublic();
        break;

    case 'suggest_gallery_names':
        handleSuggestGalleryNames();
        break;

    case 'auth':
        handleAuth();
        break;

    case 'public_config':
        handlePublicConfig();
        break;

    case 'extend_gallery':
        handleExtendGallery();
        break;
    
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
        break;
}

function handleList() {
    $gallery = isset($_GET['gallery']) ? $_GET['gallery'] : '';
    $dir = isset($_GET['dir']) ? $_GET['dir'] : '';
    $view = isset($_GET['view']) ? $_GET['view'] : 'dir';
    $viewPassword = isset($_GET['viewPassword']) ? $_GET['viewPassword'] : '';
    
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
    
    $hasViewPassword = file_exists($galleryPath . '/.viewpassword');
    if ($hasViewPassword) {
        if (!verifyGalleryViewAccess($gallery, $viewPassword)) {
            http_response_code(401);
            echo json_encode(['error' => 'View password required or invalid']);
            return;
        }
    }
    
    $dir = sanitizeRelativePath($dir);
    
    // Validate directory path
    $targetPath = $dir ? $galleryPath . '/' . $dir : $galleryPath;
    if (!is_dir($targetPath)) {
        http_response_code(404);
        echo json_encode(['error' => 'Directory not found']);
        return;
    }
    
    $listing = ($view === 'flat')
        ? ['dirs' => [], 'files' => scanGallery($gallery, $dir)]
        : listGalleryDirectory($gallery, $dir);
    $hasPassword = file_exists($galleryPath . '/.password');
    $gallerySettings = loadGallerySettings($gallery);
    $limits = evaluateGalleryUploadAllowance($gallery, $gallerySettings, 0, 0);
    
    echo json_encode([
        'success' => true,
        'gallery' => $gallery,
        'dir' => $dir,
        'view' => $view === 'flat' ? 'flat' : 'dir',
        'directories' => $listing['dirs'],
        'files' => $listing['files'],
        'hasPassword' => $hasPassword,
        'hasEditPassword' => $hasPassword,
        'hasViewPassword' => $hasViewPassword,
        'settings' => [
            'viewerUploadsEnabled' => $gallerySettings['viewerUploadsEnabled'],
            'maxGalleryBytes' => $gallerySettings['maxGalleryBytes'],
            'maxPhotos' => $gallerySettings['maxPhotos'],
            'lifetimeDays' => $gallerySettings['lifetimeDays'],
            'createdAt' => $gallerySettings['createdAt'],
            'expiresAt' => isset($gallerySettings['expiresAt']) ? $gallerySettings['expiresAt'] : null,
            'limitActions' => $gallerySettings['limitActions']
        ],
        'limits' => $limits
    ]);
}

function handleUpload() {
    $gallery = isset($_GET['gallery']) ? $_GET['gallery'] : '';
    $password = isset($_GET['password']) ? $_GET['password'] : '';
    $viewPassword = isset($_GET['viewPassword']) ? $_GET['viewPassword'] : '';
    $conflictMode = isset($_POST['conflict']) ? $_POST['conflict'] : 'add'; // add | replace | skip | ask
    $settings = getSettings();
    $maxImageWidth = (int) (isset($settings['maxImageWidth']) ? $settings['maxImageWidth'] : 0);
    $maxImageFileSize = (int) (isset($settings['maxImageFileSize']) ? $settings['maxImageFileSize'] : 0);
    $maxFileSize = (int) (isset($settings['maxFileSize']) ? $settings['maxFileSize'] : 0);
    
    if (empty($gallery)) {
        http_response_code(400);
        echo json_encode(['error' => 'Gallery name required']);
        return;
    }
    
    $galleryPath = getGalleryPath($gallery);
    $hasPassword = file_exists($galleryPath . '/.password');
    $hasViewPassword = file_exists($galleryPath . '/.viewpassword');
    $gallerySettings = loadGallerySettings($gallery);
    
    if ($hasViewPassword && !verifyGalleryViewAccess($gallery, $viewPassword)) {
        http_response_code(401);
        echo json_encode(['error' => 'View password required or invalid']);
        return;
    }

    $hasViewAccess = !$hasViewPassword || verifyGalleryViewAccess($gallery, $viewPassword);
    $allowViewerUpload = !empty($gallerySettings['viewerUploadsEnabled']);
    $editorVerified = false;
    
    // Only require password if gallery has password protection
    if ($hasPassword) {
        if (!empty($password) && verifyGalleryPassword($gallery, $password)) {
            $editorVerified = true;
        }

        $canSkipEditorPassword = $allowViewerUpload && $hasViewAccess;

        if (!$editorVerified && !$canSkipEditorPassword) {
            if (empty($password)) {
                http_response_code(401);
                echo json_encode(['error' => 'Password required']);
                return;
            }
            http_response_code(401);
            echo json_encode(['error' => 'Invalid password']);
            return;
        }
    }

    if (!$hasPassword) {
        $editorVerified = true;
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
    $requestedPath = isset($_POST['path']) ? $_POST['path'] : $filename;
    $isImage = isImageFile($filename);
    $originalSize = isset($file['size']) ? $file['size'] : filesize($file['tmp_name']);
    
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
    $extension = isset($pathInfo['extension']) ? $pathInfo['extension'] : '';
    
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
    $incomingTmp = isset($file['tmp_name']) ? $file['tmp_name'] : null;
    
    // Handle overwrite (keep in same dir)
    if (file_exists($targetPath)) {
        if ($conflictMode === 'skip') {
            if ($incomingTmp && file_exists($incomingTmp)) {
                @unlink($incomingTmp);
            }
            echo json_encode([
                'success' => true,
                'skipped' => true,
                'message' => 'Skipped existing file'
            ]);
            return;
        }
        
        if ($conflictMode === 'replace') {
            // delete existing file and thumb if any
            if (is_file($targetPath)) {
                @unlink($targetPath);
            }
            if (isImageFile($baseName)) {
                $thumbPathExisting = getThumbnailPath($targetPath);
                if (file_exists($thumbPathExisting)) {
                    @unlink($thumbPathExisting);
                }
            }
            // keep name as-is
            $relativePath = ($dirPart ? $dirPart . '/' : '') . $baseName;
        } elseif ($conflictMode === 'ask') {
            if ($incomingTmp && file_exists($incomingTmp)) {
                @unlink($incomingTmp);
            }
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'conflict' => true,
                'message' => 'File already exists',
                'file' => $relativePath,
                'options' => ['replace', 'add', 'skip']
            ]);
            return;
        } else {
            // add (default) - keep existing rename behavior
            $nameOnly = isset($pathInfo['filename']) ? $pathInfo['filename'] : pathinfo($baseName, PATHINFO_FILENAME);
            $ext = $extension ? '.' . $extension : (pathinfo($baseName, PATHINFO_EXTENSION) ? '.' . pathinfo($baseName, PATHINFO_EXTENSION) : '');
            $counter = 1;
            do {
                $candidate = $nameOnly . '_' . $counter . $ext;
                $targetPath = $targetDir . '/' . $candidate;
                $relativePath = ($dirPart ? $dirPart . '/' : '') . $candidate;
                $counter++;
            } while (file_exists($targetPath));
        }
    } else {
        // Update relativePath with sanitized base name
        $relativePath = ($dirPart ? $dirPart . '/' : '') . $baseName;
    }

    // Enforce global max file size early for non-images
    if (!$isImage && $maxFileSize > 0 && $originalSize > $maxFileSize) {
        http_response_code(413);
        echo json_encode(['error' => 'File exceeds maximum allowed size']);
        return;
    }

    $chosenTmpPath = $file['tmp_name'];
    $chosenSize = $originalSize;
    $tempCandidate = null;

    if ($isImage) {
        $hasImagick = class_exists('Imagick');
        $imageInfo = @getimagesize($file['tmp_name']);

        if ($hasImagick) {
            try {
                $imagick = new Imagick($file['tmp_name']);
                $width = $imagick->getImageWidth();
                $height = $imagick->getImageHeight();
                $needsResize = $maxImageWidth > 0 && $width > $maxImageWidth;
                $needsReduce = $maxImageFileSize > 0 && $originalSize > $maxImageFileSize;

                if ($needsResize || $needsReduce) {
                    $tempCandidate = tempnam(sys_get_temp_dir(), 'imgopt_');
                    if ($needsResize) {
                        $newWidth = $maxImageWidth;
                        $newHeight = intval(($height / $width) * $maxImageWidth);
                        $imagick->resizeImage($newWidth, $newHeight, Imagick::FILTER_LANCZOS, 1, true);
                    }

                    $imagick->stripImage();
                    if ($imagick->getImageFormat() === 'JPEG') {
                        $imagick->setImageCompressionQuality(85);
                    }
                    $imagick->writeImage($tempCandidate);
                    $candidateSize = filesize($tempCandidate);

                    // If still above desired image size, try lowering quality gradually
                    if ($maxImageFileSize > 0 && $candidateSize > $maxImageFileSize) {
                        $quality = 80;
                        while ($quality >= 50 && $candidateSize > $maxImageFileSize) {
                            $imagick->setImageCompressionQuality($quality);
                            $imagick->writeImage($tempCandidate);
                            $candidateSize = filesize($tempCandidate);
                            $quality -= 5;
                        }
                    }

                    $candidateSize = filesize($tempCandidate);
                    if ($candidateSize < $chosenSize) {
                        $chosenTmpPath = $tempCandidate;
                        $chosenSize = $candidateSize;
                    } else {
                        // Candidate is not smaller; discard
                        @unlink($tempCandidate);
                        $tempCandidate = null;
                    }
                }

                $imagick->clear();
                $imagick->destroy();
            } catch (Exception $e) {
                error_log("Image processing failed: " . $e->getMessage());
            }
        } else {
            // Without Imagick we cannot resize; reject if width exceeds limit
            if ($maxImageWidth > 0 && $imageInfo && isset($imageInfo[0]) && $imageInfo[0] > $maxImageWidth) {
                http_response_code(413);
                echo json_encode(['error' => 'Image exceeds maximum width and cannot be resized (Imagick missing)']);
                return;
            }
        }

        // Enforce image-specific max size
        if ($maxImageFileSize > 0 && $chosenSize > $maxImageFileSize) {
            if ($tempCandidate) {
                @unlink($tempCandidate);
            }
            http_response_code(413);
            echo json_encode(['error' => 'Image exceeds maximum file size']);
            return;
        }
    }

    // Final global size check (applies to all files)
    if ($maxFileSize > 0 && $chosenSize > $maxFileSize) {
        if ($tempCandidate) {
            @unlink($tempCandidate);
        }
        http_response_code(413);
        echo json_encode(['error' => 'File exceeds maximum allowed size']);
        return;
    }

    // Per-gallery aggregate limits (bytes, count, lifetime)
    $limitState = evaluateGalleryUploadAllowance($gallery, $gallerySettings, $chosenSize, 1);
    if (!$limitState['allowed']) {
        if ($tempCandidate) {
            @unlink($tempCandidate);
        }
        http_response_code(413);
        echo json_encode([
            'error' => 'Gallery upload limit reached',
            'reason' => $limitState['reasons'],
            'limits' => $limitState
        ]);
        return;
    }

    // Move chosen file to target
    $moved = false;
    if ($chosenTmpPath === $file['tmp_name']) {
        $moved = move_uploaded_file($chosenTmpPath, $targetPath);
    } else {
        $moved = rename($chosenTmpPath, $targetPath);
        // Clean up original upload temp file
        @unlink($file['tmp_name']);
    }

    if (!$moved) {
        if ($tempCandidate && file_exists($tempCandidate)) {
            @unlink($tempCandidate);
        }
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save file']);
        return;
    }

    // Generate thumbnail for images
    if ($isImage) {
        generateThumbnail($targetPath);
    }
    
    // Use the resolved relativePath for response
    $fileResponse = buildFileResponse(basename($targetPath), $relativePath, $targetPath);
    $limitsAfter = evaluateGalleryUploadAllowance($gallery, $gallerySettings, 0, 0);
    
    echo json_encode([
        'success' => true,
        'file' => $fileResponse,
        'limits' => $limitsAfter
    ]);
}

function handleDelete() {
    $gallery = isset($_GET['gallery']) ? $_GET['gallery'] : '';
    $file = isset($_GET['file']) ? $_GET['file'] : '';
    $password = isset($_GET['password']) ? $_GET['password'] : '';
    $viewPassword = isset($_GET['viewPassword']) ? $_GET['viewPassword'] : '';
    
    if (empty($gallery) || empty($file)) {
        http_response_code(400);
        echo json_encode(['error' => 'Gallery name and file path required']);
        return;
    }
    
    $galleryPath = getGalleryPath($gallery);
    $hasPassword = file_exists($galleryPath . '/.password');
    $hasViewPassword = file_exists($galleryPath . '/.viewpassword');
    
    if ($hasViewPassword && !verifyGalleryViewAccess($gallery, $viewPassword)) {
        http_response_code(401);
        echo json_encode(['error' => 'View password required or invalid']);
        return;
    }
    
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

function handleDeleteDir() {
    $gallery = isset($_GET['gallery']) ? $_GET['gallery'] : '';
    $dirParam = isset($_GET['dir']) ? $_GET['dir'] : '';
    $password = isset($_GET['password']) ? $_GET['password'] : '';
    $viewPassword = isset($_GET['viewPassword']) ? $_GET['viewPassword'] : '';
    
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
    
    $hasPassword = file_exists($galleryPath . '/.password');
    $hasViewPassword = file_exists($galleryPath . '/.viewpassword');
    
    if ($hasViewPassword && !verifyGalleryViewAccess($gallery, $viewPassword)) {
        http_response_code(401);
        echo json_encode(['error' => 'View password required or invalid']);
        return;
    }
    
    if ($hasPassword) {
        if (empty($password)) {
            http_response_code(401);
            echo json_encode(['error' => 'Password required']);
            return;
        }
        
        if (!verifyGalleryPassword($gallery, $password)) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid password']);
            return;
        }
    }
    
    $dir = sanitizeRelativePath($dirParam);
    if ($dir === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid directory path']);
        return;
    }
    
    $targetPath = $galleryPath . '/' . $dir;
    if (!is_dir($targetPath)) {
        http_response_code(404);
        echo json_encode(['error' => 'Directory not found']);
        return;
    }
    
    if (!validateFilePath($dir, $galleryPath)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid directory path']);
        return;
    }
    
    if (!deleteDirectoryRecursive($targetPath)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete directory']);
        return;
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Directory deleted successfully'
    ]);
}

function handleDownloadZip() {
    $gallery = isset($_GET['gallery']) ? $_GET['gallery'] : '';
    $viewPassword = isset($_GET['viewPassword']) ? $_GET['viewPassword'] : '';
    $dirParam = isset($_GET['dir']) ? $_GET['dir'] : '';
    
    if (empty($gallery)) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Gallery name required']);
        return;
    }
    
    $galleryPath = getGalleryPath($gallery);
    $dir = sanitizeRelativePath($dirParam);
    $targetPath = $dir ? $galleryPath . '/' . $dir : $galleryPath;
    $hasViewPassword = file_exists($galleryPath . '/.viewpassword');
    if ($hasViewPassword && !verifyGalleryViewAccess($gallery, $viewPassword)) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'View password required or invalid']);
        return;
    }
    
    if (!is_dir($galleryPath)) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Gallery not found']);
        return;
    }

    if (!is_dir($targetPath)) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Directory not found']);
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
    $zipLabel = $gallery;
    if ($dir) {
        $zipLabel .= '_' . str_replace(['/', ' '], ['-', '_'], $dir);
    }
    $zipFilename = $zipLabel . '_' . date('Y-m-d_His') . '.zip';
    $zipPath = sys_get_temp_dir() . '/' . $zipFilename;
    
    $zip = new ZipArchive();
    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Failed to create zip file']);
        return;
    }
    
    // Add files to zip (excluding thumbnails and password files)
    $basePrefix = $dir ? trim($dir, '/') . '/' : '';
    $normalizedTarget = rtrim($targetPath, '/');
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($targetPath, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    
    $fileCount = 0;
    foreach ($iterator as $file) {
        if ($file->isFile()) {
            $filename = $file->getFilename();
            
            // Skip hidden files, password files, and per-gallery settings file
            if ($filename[0] === '.' || $filename === '.password' || $filename === '.viewpassword' || $filename === GALLERY_SETTINGS_FILE) {
                continue;
            }
            
            // Skip thumbnail files
            if (strpos($filename, '_thumb.') !== false) {
                continue;
            }
            
            // Only add supported files
            if (isSupportedFile($filename)) {
                $filePath = $file->getPathname();
                $relativeWithinTarget = ltrim(str_replace($normalizedTarget . '/', '', $filePath), '/');
                if ($relativeWithinTarget === '') {
                    $relativeWithinTarget = $filename;
                }
                $relativePath = $basePrefix ? $basePrefix . $relativeWithinTarget : $relativeWithinTarget;
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

function handleCreateGalleryPublic() {
    $settings = getSettings();

    if (empty($settings['allowPublicGalleryCreation'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Public gallery creation is disabled']);
        return;
    }

    $name = isset($_POST['name']) ? $_POST['name'] : '';
    if ($name === '') {
        $name = generateGallerySlug();
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

    if (!is_dir(DATA_ROOT)) {
        @mkdir(DATA_ROOT, 0755, true);
    }

    if (!mkdir($galleryPath, 0755, true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create gallery']);
        return;
    }

    // Initialize per-gallery settings using strict public defaults
    $gallerySettings = loadGallerySettings($sanitized, 'public', $settings);

    echo json_encode([
        'success' => true,
        'gallery' => $sanitized,
        'settings' => $gallerySettings
    ]);
}

function handleSuggestGalleryNames() {
    $settings = getSettings();
    if (empty($settings['allowPublicGalleryCreation'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Public gallery creation is disabled']);
        return;
    }

    $count = isset($_GET['count']) ? (int) $_GET['count'] : 5;
    $count = max(1, min(10, $count));

    echo json_encode([
        'success' => true,
        'suggestions' => generateGalleryNameSuggestions($count)
    ]);
}

function handlePublicConfig() {
    $settings = getSettings();
    echo json_encode([
        'success' => true,
        'allowPublicGalleryCreation' => !empty($settings['allowPublicGalleryCreation']),
        'contactEmail' => isset($settings['contactEmail']) ? $settings['contactEmail'] : '',
        'publicDefaults' => [
            'viewerUploadsEnabled' => !empty($settings['publicDefaultViewerUploadsEnabled']),
            'maxGalleryBytes' => (int) ($settings['publicDefaultMaxGalleryBytes'] ?? 0),
            'maxPhotos' => (int) ($settings['publicDefaultMaxPhotos'] ?? 0),
            'lifetimeDays' => (int) ($settings['publicDefaultLifetimeDays'] ?? 0),
        ]
    ]);
}

function handleExtendGallery() {
    $gallery = isset($_POST['gallery']) ? $_POST['gallery'] : '';
    $viewPassword = isset($_POST['viewPassword']) ? $_POST['viewPassword'] : '';

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

    $hasViewPassword = file_exists($galleryPath . '/.viewpassword');
    if ($hasViewPassword && !verifyGalleryViewAccess($gallery, $viewPassword)) {
        http_response_code(401);
        echo json_encode(['error' => 'View password required or invalid']);
        return;
    }

    $globalSettings = getSettings();
    // Load with admin source to keep existing per-gallery data intact
    $settings = loadGallerySettings($gallery, 'admin', $globalSettings);

    // Fallback for older public shares where lifetime was not stored
    $lifetime = isset($settings['lifetimeDays']) ? (int) $settings['lifetimeDays'] : 0;
    if ($lifetime <= 0) {
        $fallbackLifetime = (int) ($globalSettings['publicDefaultLifetimeDays'] ?? 0);
        if ($fallbackLifetime > 0) {
            $lifetime = $fallbackLifetime;
            $settings['lifetimeDays'] = $fallbackLifetime;
        }
    }

    if ($lifetime <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Lifetime not configured for this gallery']);
        return;
    }

    // Extend from "today" using the configured lifetime
    $expiresAt = date('c', strtotime('+' . $lifetime . ' days'));
    $settings['expiresAt'] = $expiresAt;
    if (empty($settings['originalCreatedAt'])) {
        $settings['originalCreatedAt'] = $settings['createdAt'] ?? date('c');
    }
    $settings['extendCount'] = isset($settings['extendCount']) ? ((int) $settings['extendCount'] + 1) : 1;
    if (empty($settings['createdAt'])) {
        $settings['createdAt'] = date('c');
    }

    if (!saveGallerySettings($gallery, $settings)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to extend gallery']);
        return;
    }

    $limits = evaluateGalleryUploadAllowance($gallery, $settings, 0, 0);

    echo json_encode([
        'success' => true,
        'expiresAt' => $expiresAt,
        'extendCount' => $settings['extendCount'],
        'limits' => $limits,
        'settings' => $settings
    ]);
}

function handleAuth() {
    $gallery = isset($_GET['gallery']) ? $_GET['gallery'] : (isset($_POST['gallery']) ? $_POST['gallery'] : '');
    $type = isset($_GET['type']) ? $_GET['type'] : (isset($_POST['type']) ? $_POST['type'] : 'edit');
    $password = isset($_GET['password']) ? $_GET['password'] : (isset($_POST['password']) ? $_POST['password'] : '');
    $viewPassword = isset($_GET['viewPassword']) ? $_GET['viewPassword'] : (isset($_POST['viewPassword']) ? $_POST['viewPassword'] : '');
    
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
    
    $hasEditPassword = file_exists($galleryPath . '/.password');
    $hasViewPassword = file_exists($galleryPath . '/.viewpassword');
    
    if ($type === 'view') {
        $pwToUse = $password !== '' ? $password : $viewPassword;
        if ($hasViewPassword && !verifyGalleryViewAccess($gallery, $pwToUse)) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid view password']);
            return;
        }
        
        echo json_encode([
            'success' => true,
            'hasEditPassword' => $hasEditPassword,
            'hasViewPassword' => $hasViewPassword
        ]);
        return;
    }
    
    // Default: edit/auth for uploads & deletes
    if (!$hasEditPassword) {
        echo json_encode([
            'success' => true,
            'hasEditPassword' => false,
            'hasViewPassword' => $hasViewPassword
        ]);
        return;
    }

    $viewGatePassword = $viewPassword !== '' ? $viewPassword : $password;
    if ($hasViewPassword && !verifyGalleryViewAccess($gallery, $viewGatePassword)) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid view password']);
        return;
    }
    
    if (!verifyGalleryPassword($gallery, $password)) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid editor password']);
        return;
    }
    
    echo json_encode([
        'success' => true,
        'hasEditPassword' => $hasEditPassword,
        'hasViewPassword' => $hasViewPassword
    ]);
}

function deleteDirectoryRecursive($path) {
    if (!is_dir($path)) {
        return false;
    }
    
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($path, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    
    foreach ($iterator as $item) {
        if ($item->isDir()) {
            rmdir($item->getRealPath());
        } else {
            unlink($item->getRealPath());
        }
    }
    
    return rmdir($path);
}

