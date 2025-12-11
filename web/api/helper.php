<?php
/**
 * Helper functions for the gallery system
 * This file is included by other PHP files, never called directly
 */

// Base path for the web directory
define('WEB_ROOT', dirname(dirname(__FILE__)));
define('DATA_ROOT', WEB_ROOT . '/data');
define('ADMIN_ROOT', WEB_ROOT . '/admin');
define('SETTINGS_PATH', WEB_ROOT . '/api/settings.json');
define('GALLERY_SETTINGS_FILE', 'settings.json');

/**
 * Settings helpers
 */
function getDefaultSettings() {
    return [
        'maxImageWidth' => 1080,
        'maxImageFileSize' => 5242880,
        'maxFileSize' => 10485760,
        'contactEmail' => '',
        // Public gallery creation toggle + strict defaults
        'allowPublicGalleryCreation' => false,
        'publicDefaultViewerUploadsEnabled' => true,
        'publicDefaultMaxGalleryBytes' => 10485760,
        'publicDefaultMaxPhotos' => 100,
        'publicDefaultLifetimeDays' => 30,
        // Defaults for admin-created galleries (can be relaxed)
        'defaultViewerUploadsEnabled' => false,
        'defaultMaxGalleryBytes' => 0,
        'defaultMaxPhotos' => 0,
        'defaultLifetimeDays' => 0
    ];
}

function getSettings() {
    $defaults = getDefaultSettings();

    if (!file_exists(SETTINGS_PATH)) {
        return $defaults;
    }

    $content = file_get_contents(SETTINGS_PATH);
    $decoded = json_decode($content, true);

    if (!is_array($decoded)) {
        return $defaults;
    }

    $filtered = array_intersect_key($decoded, $defaults);
    $merged = array_merge($defaults, $filtered);

    // Normalize types
    $merged['allowPublicGalleryCreation'] = !empty($merged['allowPublicGalleryCreation']);
    $merged['publicDefaultViewerUploadsEnabled'] = !empty($merged['publicDefaultViewerUploadsEnabled']);
    $merged['defaultViewerUploadsEnabled'] = !empty($merged['defaultViewerUploadsEnabled']);

    $intKeys = [
        'maxImageWidth',
        'maxImageFileSize',
        'maxFileSize',
        'publicDefaultMaxGalleryBytes',
        'publicDefaultMaxPhotos',
        'publicDefaultLifetimeDays',
        'defaultMaxGalleryBytes',
        'defaultMaxPhotos',
        'defaultLifetimeDays',
    ];

    foreach ($intKeys as $key) {
        if (isset($merged[$key])) {
            $merged[$key] = (int) $merged[$key];
        }
    }

    return $merged;
}

/**
 * Gallery settings helpers
 */

function getGallerySettingsPath($gallery) {
    return getGalleryPath($gallery) . '/' . GALLERY_SETTINGS_FILE;
}

function getDefaultGallerySettings($source = 'admin', $globalSettings = null) {
    $settings = $globalSettings ?? getSettings();
    $usePublicDefaults = ($source === 'public');

    $defaults = [
        'createdAt' => date('c'),
        'originalCreatedAt' => date('c'),
        'viewerUploadsEnabled' => $usePublicDefaults
            ? !empty($settings['publicDefaultViewerUploadsEnabled'])
            : !empty($settings['defaultViewerUploadsEnabled']),
        'maxGalleryBytes' => $usePublicDefaults
            ? (int) ($settings['publicDefaultMaxGalleryBytes'] ?? 0)
            : (int) ($settings['defaultMaxGalleryBytes'] ?? 0),
        'maxPhotos' => $usePublicDefaults
            ? (int) ($settings['publicDefaultMaxPhotos'] ?? 0)
            : (int) ($settings['defaultMaxPhotos'] ?? 0),
        'lifetimeDays' => $usePublicDefaults
            ? (int) ($settings['publicDefaultLifetimeDays'] ?? 0)
            : (int) ($settings['defaultLifetimeDays'] ?? 0),
        'expiresAt' => null,
        'extendCount' => 0,
        'limitActions' => [
            ['type' => 'contact', 'label' => 'Contact admin'],
            ['type' => 'upgrade', 'label' => 'Request more (placeholder)']
        ],
    ];

    return $defaults;
}

function normalizeGallerySettings(array $settings, $source = 'admin', $globalSettings = null) {
    $defaults = getDefaultGallerySettings($source, $globalSettings);
    $merged = array_merge($defaults, $settings);

    if (empty($merged['createdAt'])) {
        $merged['createdAt'] = $defaults['createdAt'];
    }
    if (empty($merged['originalCreatedAt'])) {
        $merged['originalCreatedAt'] = $merged['createdAt'];
    }

    $merged['viewerUploadsEnabled'] = !empty($merged['viewerUploadsEnabled']);

    $intKeys = ['maxGalleryBytes', 'maxPhotos', 'lifetimeDays', 'extendCount'];
    foreach ($intKeys as $key) {
        if (isset($merged[$key])) {
            $merged[$key] = (int) $merged[$key];
        }
    }

    if (!isset($merged['limitActions']) || !is_array($merged['limitActions']) || count($merged['limitActions']) === 0) {
        $merged['limitActions'] = $defaults['limitActions'];
    }

    return $merged;
}

function loadGallerySettings($gallery, $source = 'admin', $globalSettings = null) {
    $path = getGallerySettingsPath($gallery);
    $globalSettings = $globalSettings ?? getSettings();
    $defaults = getDefaultGallerySettings($source, $globalSettings);

    if (!file_exists($path)) {
        saveGallerySettings($gallery, $defaults);
        return $defaults;
    }

    $content = file_get_contents($path);
    $decoded = json_decode($content, true);

    if (!is_array($decoded)) {
        saveGallerySettings($gallery, $defaults);
        return $defaults;
    }

    $normalized = normalizeGallerySettings($decoded, $source, $globalSettings);

    // Persist back if normalization added missing fields
    saveGallerySettings($gallery, $normalized);

    return $normalized;
}

function saveGallerySettings($gallery, array $settings) {
    $path = getGallerySettingsPath($gallery);
    $dir = dirname($path);

    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }

    $encoded = json_encode($settings, JSON_PRETTY_PRINT);
    return $encoded !== false && file_put_contents($path, $encoded) !== false;
}

function getGalleryStats($gallery) {
    $galleryPath = getGalleryPath($gallery);
    $result = [
        'totalBytes' => 0,
        'fileCount' => 0,
    ];

    if (!is_dir($galleryPath)) {
        return $result;
    }

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($galleryPath, RecursiveDirectoryIterator::SKIP_DOTS)
    );

    foreach ($iterator as $file) {
        if ($file->isFile()) {
            $filename = $file->getFilename();

            // Skip hidden, password files, and thumbnails
            if ($filename[0] === '.' || $filename === '.password' || $filename === '.viewpassword' || strpos($filename, '_thumb.') !== false) {
                continue;
            }

            if (!isSupportedFile($filename)) {
                continue;
            }

            $result['fileCount']++;
            $result['totalBytes'] += $file->getSize();
        }
    }

    return $result;
}

function evaluateGalleryUploadAllowance($gallery, array $gallerySettings, $incomingSize = 0, $incomingCount = 1) {
    $stats = getGalleryStats($gallery);
    $blockedReasons = [];
    $expiresAt = null;

    $lifetimeDays = isset($gallerySettings['lifetimeDays']) ? (int) $gallerySettings['lifetimeDays'] : 0;
    $configuredExpires = !empty($gallerySettings['expiresAt']) ? strtotime($gallerySettings['expiresAt']) : null;
    if ($configuredExpires) {
        $expiresAt = $configuredExpires;
    } elseif (!empty($lifetimeDays)) {
        $createdAt = isset($gallerySettings['createdAt']) ? strtotime($gallerySettings['createdAt']) : time();
        $expiresAt = strtotime('+' . $lifetimeDays . ' days', $createdAt);
    }

    if ($expiresAt !== null && $expiresAt !== false && time() >= $expiresAt) {
        $blockedReasons[] = 'expired';
    }

    $maxBytes = isset($gallerySettings['maxGalleryBytes']) ? (int) $gallerySettings['maxGalleryBytes'] : 0;
    if ($maxBytes > 0 && $incomingSize === 0 && $stats['totalBytes'] >= $maxBytes) {
        $blockedReasons[] = 'storage';
    }
    if ($maxBytes > 0 && ($stats['totalBytes'] + (int) $incomingSize) > $maxBytes) {
        $blockedReasons[] = 'storage';
    }

    $maxPhotos = isset($gallerySettings['maxPhotos']) ? (int) $gallerySettings['maxPhotos'] : 0;
    if ($maxPhotos > 0 && $incomingCount === 0 && $stats['fileCount'] >= $maxPhotos) {
        $blockedReasons[] = 'count';
    }
    if ($maxPhotos > 0 && ($stats['fileCount'] + (int) $incomingCount) > $maxPhotos) {
        $blockedReasons[] = 'count';
    }

    $remainingBytes = $maxBytes > 0 ? max(0, $maxBytes - $stats['totalBytes']) : null;
    $remainingPhotos = $maxPhotos > 0 ? max(0, $maxPhotos - $stats['fileCount']) : null;

    return [
        'allowed' => count($blockedReasons) === 0,
        'reasons' => $blockedReasons,
        'stats' => $stats,
        'maxBytes' => $maxBytes,
        'maxPhotos' => $maxPhotos,
        'lifetimeDays' => isset($gallerySettings['lifetimeDays']) ? (int) $gallerySettings['lifetimeDays'] : 0,
        'expiresAt' => $expiresAt ? date('c', $expiresAt) : null,
        'remainingBytes' => $remainingBytes,
        'remainingPhotos' => $remainingPhotos,
        'limitActions' => $gallerySettings['limitActions'] ?? [],
    ];
}

/**
 * Human-readable random gallery names
 */
function generateGallerySlug() {
    $adjectives = [
        'bright', 'calm', 'brave', 'cozy', 'fresh', 'gentle', 'happy', 'jolly', 'kind',
        'lively', 'mellow', 'neat', 'quick', 'shiny', 'silly', 'sunny', 'swift', 'witty',
        'zesty', 'bold', 'chill', 'daring', 'eager', 'friendly', 'goofy', 'mighty', 'nimble'
    ];
    $nouns = [
        'goose', 'panda', 'otter', 'falcon', 'whale', 'tiger', 'koala', 'lynx', 'robin',
        'llama', 'badger', 'eagle', 'dolphin', 'moose', 'buffalo', 'heron', 'fox', 'hedgehog',
        'swan', 'beaver', 'sparrow', 'owl', 'rabbit', 'yak', 'pelican', 'otter', 'seal'
    ];
    $extras = [
        'breeze', 'ember', 'glow', 'meadow', 'harbor', 'cascade', 'echo', 'drift', 'groove',
        'ripple', 'spark', 'trail', 'peak', 'valley', 'hollow', 'harvest', 'sunrise', 'sunset'
    ];

    $parts = [
        $adjectives[random_int(0, count($adjectives) - 1)],
        $nouns[random_int(0, count($nouns) - 1)],
        $extras[random_int(0, count($extras) - 1)]
    ];

    return sanitizeGalleryName(implode('-', $parts));
}

function generateGalleryNameSuggestions($count = 5) {
    $suggestions = [];
    $existing = [];

    if (is_dir(DATA_ROOT)) {
        $dirs = scandir(DATA_ROOT);
        foreach ($dirs as $dir) {
            if ($dir === '.' || $dir === '..') {
                continue;
            }
            if (is_dir(DATA_ROOT . '/' . $dir)) {
                $existing[] = strtolower($dir);
            }
        }
    }

    $attempts = 0;
    $maxAttempts = $count * 15;

    while (count($suggestions) < $count && $attempts < $maxAttempts) {
        $candidate = generateGallerySlug();
        $attempts++;
        if (in_array(strtolower($candidate), $existing, true)) {
            continue;
        }
        if (in_array($candidate, $suggestions, true)) {
            continue;
        }
        $suggestions[] = $candidate;
    }

    return $suggestions;
}

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
 * Verify gallery view password
 */
function verifyGalleryViewPassword($gallery, $password) {
    $passwordFile = getGalleryPath($gallery) . '/.viewpassword';
    
    if (!file_exists($passwordFile)) {
        return true; // No password set, view is open
    }
    
    if ($password === '') {
        return false;
    }
    
    $storedHash = trim(file_get_contents($passwordFile));
    return password_verify($password, $storedHash);
}

/**
 * Verify view access using either the view password or the editor password
 */
function verifyGalleryViewAccess($gallery, $password) {
    $viewFile = getGalleryPath($gallery) . '/.viewpassword';
    
    // No view password set, open access
    if (!file_exists($viewFile)) {
        return true;
    }
    
    if ($password === '') {
        return false;
    }
    
    // Accept dedicated view password
    if (verifyGalleryViewPassword($gallery, $password)) {
        return true;
    }
    
    // Accept editor password as fallback
    return verifyGalleryPassword($gallery, $password);
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
 * Set gallery view password
 */
function setGalleryViewPassword($gallery, $password) {
    $galleryPath = getGalleryPath($gallery);
    
    if (!is_dir($galleryPath)) {
        return false;
    }
    
    $passwordFile = $galleryPath . '/.viewpassword';
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
 * Sanitize an individual path segment (file or folder name)
 */
function sanitizePathSegment($segment) {
    // Allow spaces, dots, underscores, hyphens; replace everything else with underscore
    $clean = preg_replace('/[^a-zA-Z0-9._\\- ]/', '_', $segment);
    $clean = trim($clean);
    // Avoid empty segments
    return $clean === '' ? '_' : $clean;
}

/**
 * Sanitize a relative path (no leading slash, no traversal)
 */
function sanitizeRelativePath($path) {
    if ($path === null) {
        return '';
    }
    
    $path = str_replace('\\', '/', $path); // normalize separators
    $parts = explode('/', $path);
    $safeParts = [];
    
    foreach ($parts as $part) {
        if ($part === '' || $part === '.' || $part === '..') {
            continue;
        }
        $safeParts[] = sanitizePathSegment($part);
    }
    
    return implode('/', $safeParts);
}

/**
 * List immediate directories and supported files within a gallery path
 */
function listGalleryDirectory($gallery, $dir = '') {
    $galleryPath = getGalleryPath($gallery);
    $scanPath = $dir ? $galleryPath . '/' . $dir : $galleryPath;
    
    if (!is_dir($scanPath)) {
        return ['dirs' => [], 'files' => []];
    }
    
    $dirs = [];
    $files = [];
    
    $iterator = new DirectoryIterator($scanPath);
    foreach ($iterator as $entry) {
        if ($entry->isDot()) {
            continue;
        }
        
        $name = $entry->getFilename();
        
        // Skip hidden and password files
        if ($name[0] === '.' || $name === '.password' || $name === '.viewpassword' || $name === GALLERY_SETTINGS_FILE) {
            continue;
        }
        
        $relative = $dir ? $dir . '/' . $name : $name;
        
        if ($entry->isDir()) {
            $dirs[] = [
                'name' => $name,
                'path' => $relative,
            ];
            continue;
        }
        
        // Skip thumbnails
        if (strpos($name, '_thumb.') !== false) {
            continue;
        }
        
        if (!isSupportedFile($name)) {
            continue;
        }
        
        $fileEntry = buildFileResponse($name, $relative, $entry->getPathname());
        if ($fileEntry) {
            $files[] = $fileEntry;
        }
    }
    
    return ['dirs' => $dirs, 'files' => $files];
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
            
            // Skip hidden files, password files, and per-gallery settings file
            if ($filename[0] === '.' || $filename === '.password' || $filename === '.viewpassword' || $filename === GALLERY_SETTINGS_FILE) {
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

