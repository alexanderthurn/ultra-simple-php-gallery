<?php
/**
 * File server - serves gallery files securely
 * Prevents direct access to password files and other sensitive files
 */

require_once __DIR__ . '/helper.php';

$gallery = isset($_GET['gallery']) ? $_GET['gallery'] : '';
$file = isset($_GET['file']) ? $_GET['file'] : '';
$viewPassword = isset($_GET['viewPassword']) ? $_GET['viewPassword'] : '';

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

// Validate view password if required
$viewPasswordFile = $galleryPath . '/.viewpassword';
if (file_exists($viewPasswordFile) && !verifyGalleryViewAccess($gallery, $viewPassword)) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'View password required or invalid']);
    exit;
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
if ($filename[0] === '.' || $filename === '.password' || $filename === '.viewpassword' || $filename === '.username') {
    http_response_code(403);
    die('Access denied');
}

// Only allow supported file types (thumbnails are handled separately)
if (!isSupportedFile($filename)) {
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
        'heic' => 'image/heic',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'mp4' => 'video/mp4',
        'mov' => 'video/quicktime',
        'webm' => 'video/webm',
        'mkv' => 'video/x-matroska',
        'avi' => 'video/x-msvideo',
        'm4v' => 'video/x-m4v',
        'wmv' => 'video/x-ms-wmv',
        'mp3' => 'audio/mpeg',
        'wav' => 'audio/wav',
        'ogg' => 'audio/ogg',
        'm4a' => 'audio/mp4',
        'aac' => 'audio/aac',
        'flac' => 'audio/flac',
        'pdf' => 'application/pdf',
        'txt' => 'text/plain',
        'csv' => 'text/csv',
        'json' => 'application/json',
        'md' => 'text/markdown',
        'doc' => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls' => 'application/vnd.ms-excel',
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt' => 'application/vnd.ms-powerpoint',
        'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'zip' => 'application/zip',
        'rar' => 'application/vnd.rar',
        '7z' => 'application/x-7z-compressed',
        'tar' => 'application/x-tar',
        'gz' => 'application/gzip',
        'tgz' => 'application/gzip',
    ];
    $mimeType = isset($mimeTypes[$ext]) ? $mimeTypes[$ext] : 'application/octet-stream';
}

// Set headers (inline by default; support forced download via ?download=1)
$disposition = (isset($_GET['download']) && $_GET['download'] === '1') ? 'attachment' : 'inline';
$safeName = str_replace(['"', '\\'], '', $filename);
header('Content-Type: ' . $mimeType);
header('Content-Length: ' . filesize($filePath));
header('Content-Disposition: ' . $disposition . '; filename="' . $safeName . '"');
header('Cache-Control: public, max-age=31536000'); // Cache for 1 year
header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 31536000) . ' GMT');

// Output file
readfile($filePath);
exit;

