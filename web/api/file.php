<?php
/**
 * File server - serves gallery files securely
 * Prevents direct access to password files and other sensitive files
 */

require_once __DIR__ . '/helper.php';

$gallery = $_GET['gallery'] ?? '';
$file = $_GET['file'] ?? '';

if (empty($gallery) || empty($file)) {
    http_response_code(400);
    die('Invalid request');
}

// Validate gallery and file path
$galleryPath = getGalleryPath($gallery);

if (!is_dir($galleryPath)) {
    http_response_code(404);
    die('Gallery not found');
}

// Validate file path to prevent directory traversal
if (!validateFilePath($file, $galleryPath)) {
    http_response_code(400);
    die('Invalid file path');
}

$filePath = $galleryPath . '/' . $file;

// Check if file exists
if (!file_exists($filePath)) {
    http_response_code(404);
    die('File not found');
}

// Deny access to password files and other sensitive files
$filename = basename($filePath);
if ($filename[0] === '.' || $filename === '.password' || $filename === '.username') {
    http_response_code(403);
    die('Access denied');
}

// Only allow image and video files
if (!isImageFile($filename) && !isVideoFile($filename)) {
    // Allow thumbnails
    if (strpos($filename, '_thumb.') === false) {
        http_response_code(403);
        die('Invalid file type');
    }
}

// Get MIME type
$mimeType = mime_content_type($filePath);
if (!$mimeType) {
    // Fallback MIME types
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    $mimeTypes = [
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'mp4' => 'video/mp4',
        'mov' => 'video/quicktime',
        'webm' => 'video/webm',
        'mkv' => 'video/x-matroska',
        'avi' => 'video/x-msvideo',
        'm4v' => 'video/x-m4v'
    ];
    $mimeType = $mimeTypes[$ext] ?? 'application/octet-stream';
}

// Set headers
header('Content-Type: ' . $mimeType);
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: public, max-age=31536000'); // Cache for 1 year
header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 31536000) . ' GMT');

// Output file
readfile($filePath);
exit;

