<?php
/**
 * Helper functions for the gallery system
 * This file is included by other PHP files, never called directly
 */

// Base path for the web directory
define('WEB_ROOT', dirname(dirname(__FILE__)));
define('DATA_ROOT', WEB_ROOT . '/data');
define('ADMIN_ROOT', WEB_ROOT . '/admin');

/**
 * Authentication Functions
 */

/**
 * Verify admin credentials
 */
function isAdmin($username, $password) {
    $usernameFile = ADMIN_ROOT . '/.username';
    $passwordFile = ADMIN_ROOT . '/.password';
    
    if (!file_exists($usernameFile) || !file_exists($passwordFile)) {
        return false;
    }
    
    $storedUsername = trim(file_get_contents($usernameFile));
    $storedPasswordHash = trim(file_get_contents($passwordFile));
    
    if ($username !== $storedUsername) {
        return false;
    }
    
    return password_verify($password, $storedPasswordHash);
}

/**
 * Verify gallery password
 */
function verifyGalleryPassword($gallery, $password) {
    $passwordFile = getGalleryPath($gallery) . '/.password';
    
    if (!file_exists($passwordFile)) {
        return false; // No password set means password required but none exists
    }
    
    $storedHash = trim(file_get_contents($passwordFile));
    return password_verify($password, $storedHash);
}

/**
 * Set gallery password
 */
function setGalleryPassword($gallery, $password) {
    $galleryPath = getGalleryPath($gallery);
    
    if (!is_dir($galleryPath)) {
        return false;
    }
    
    $passwordFile = $galleryPath . '/.password';
    $hash = password_hash($password, PASSWORD_DEFAULT);
    
    return file_put_contents($passwordFile, $hash) !== false;
}

/**
 * Thumbnail Functions
 */

/**
 * Get thumbnail path for an image
 */
function getThumbnailPath($imagePath) {
    $pathInfo = pathinfo($imagePath);
    return $pathInfo['dirname'] . '/' . $pathInfo['filename'] . '_thumb.' . $pathInfo['extension'];
}

/**
 * Generate thumbnail for an image using ImageMagick
 */
function generateThumbnail($imagePath) {
    if (!extension_loaded('imagick')) {
        return false;
    }
    
    $thumbPath = getThumbnailPath($imagePath);
    
    // If thumbnail already exists, skip
    if (file_exists($thumbPath)) {
        return true;
    }
    
    // Check if source image exists
    if (!file_exists($imagePath)) {
        return false;
    }
    
    try {
        $imagick = new Imagick($imagePath);
        
        // Get image dimensions
        $width = $imagick->getImageWidth();
        $height = $imagick->getImageHeight();
        
        // Calculate thumbnail dimensions (max 300px, maintain aspect ratio)
        $maxSize = 300;
        if ($width > $height) {
            $newWidth = $maxSize;
            $newHeight = intval(($height / $width) * $maxSize);
        } else {
            $newHeight = $maxSize;
            $newWidth = intval(($width / $height) * $maxSize);
        }
        
        // Resize image
        $imagick->resizeImage($newWidth, $newHeight, Imagick::FILTER_LANCZOS, 1, true);
        
        // Set quality for JPEG
        if ($imagick->getImageFormat() === 'JPEG') {
            $imagick->setImageCompressionQuality(85);
        }
        
        // Write thumbnail
        $result = $imagick->writeImage($thumbPath);
        $imagick->clear();
        $imagick->destroy();
        
        return $result;
    } catch (Exception $e) {
        error_log("Thumbnail generation failed: " . $e->getMessage());
        return false;
    }
}

/**
 * Utility Functions
 */

/**
 * Sanitize gallery name
 */
function sanitizeGalleryName($name) {
    // Only allow alphanumeric, underscore, and hyphen
    $sanitized = preg_replace('/[^a-zA-Z0-9_-]/', '', $name);
    return $sanitized;
}

/**
 * Validate file path to prevent directory traversal
 */
function validateFilePath($path, $basePath = DATA_ROOT) {
    $realBasePath = realpath($basePath);
    $realFilePath = realpath($basePath . '/' . $path);
    
    if ($realFilePath === false) {
        return false;
    }
    
    return strpos($realFilePath, $realBasePath) === 0;
}

/**
 * Get safe path to gallery folder
 */
function getGalleryPath($gallery) {
    $sanitized = sanitizeGalleryName($gallery);
    return DATA_ROOT . '/' . $sanitized;
}

/**
 * Check if file is an image
 */
function getFileExtension($filename) {
    return strtolower(pathinfo($filename, PATHINFO_EXTENSION));
}

/**
 * Classify a file into a supported category
 */
function getFileCategory($filename) {
    $ext = getFileExtension($filename);
    
    $imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'bmp', 'heic'];
    $videoExts = ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', 'wmv'];
    $audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];
    $documentExts = ['pdf', 'txt', 'csv', 'json', 'md', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    $archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'tgz'];
    
    if (in_array($ext, $imageExts, true)) {
        return ['category' => 'image', 'extension' => $ext];
    }
    
    if (in_array($ext, $videoExts, true)) {
        return ['category' => 'video', 'extension' => $ext];
    }
    
    if (in_array($ext, $audioExts, true)) {
        return ['category' => 'audio', 'extension' => $ext];
    }
    
    if (in_array($ext, $documentExts, true)) {
        return ['category' => 'document', 'extension' => $ext];
    }
    
    if (in_array($ext, $archiveExts, true)) {
        return ['category' => 'archive', 'extension' => $ext];
    }
    
    return ['category' => null, 'extension' => $ext];
}

/**
 * Check if file is an image
 */
function isImageFile($filename) {
    return getFileCategory($filename)['category'] === 'image';
}

/**
 * Check if file is a video
 */
function isVideoFile($filename) {
    return getFileCategory($filename)['category'] === 'video';
}

/**
 * Check if file is allowed in the gallery
 */
function isSupportedFile($filename) {
    return getFileCategory($filename)['category'] !== null;
}

/**
 * Build a file response payload
 */
function buildFileResponse($filename, $relativePath, $absolutePath) {
    $fileInfo = getFileCategory($filename);
    
    if (!$fileInfo['category']) {
        return null;
    }
    
    $thumb = null;
    
    if ($fileInfo['category'] === 'image') {
        generateThumbnail($absolutePath);
        $thumb = str_replace(
            $filename,
            pathinfo($filename, PATHINFO_FILENAME) . '_thumb.' . pathinfo($filename, PATHINFO_EXTENSION),
            $relativePath
        );
    }
    
    return [
        'type' => $fileInfo['category'],
        'name' => $filename,
        'path' => $relativePath,
        'thumb' => $thumb,
        'extension' => $fileInfo['extension']
    ];
}

/**
 * Scan gallery folder recursively and return files
 */
function scanGallery($gallery, $subfolder = '') {
    $galleryPath = getGalleryPath($gallery);
    $scanPath = $galleryPath . ($subfolder ? '/' . $subfolder : '');
    
    if (!is_dir($scanPath)) {
        return [];
    }
    
    $files = [];
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($scanPath, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    
    foreach ($iterator as $file) {
        if ($file->isFile()) {
            $filename = $file->getFilename();
            
            // Skip hidden files and password files
            if ($filename[0] === '.' || $filename === '.password') {
                continue;
            }
            
            // Skip thumbnail files (we'll generate them on the fly)
            if (strpos($filename, '_thumb.') !== false) {
                continue;
            }
            
            // Only include supported file types
            if (!isSupportedFile($filename)) {
                continue;
            }
            
            $relativePath = str_replace($galleryPath . '/', '', $file->getPathname());
            $fileEntry = buildFileResponse($filename, $relativePath, $file->getPathname());
            
            if ($fileEntry) {
                $files[] = $fileEntry;
            }
        }
    }
    
    return $files;
}

