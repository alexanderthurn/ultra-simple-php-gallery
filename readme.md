# Ultra Simple PHP Gallery

A simple, modern PHP gallery system with password protection and admin panel.

## Features

- **Password-protected galleries** - Each gallery can have its own password for upload/delete operations
- **Public viewing** - Anyone with the gallery name can view images (no password needed)
- **Admin panel** - Create galleries, set passwords, manage all galleries
- **Automatic thumbnails** - Thumbnails are generated automatically using ImageMagick
- **Image compression** - Images are automatically resized to max 1080px width (client-side and server-side)
- **Bulk upload** - Upload multiple files at once with drag & drop support
- **Modern UI** - Clean, responsive design with dark theme

## Installation

1. Upload the `web/` directory contents to your web server
2. Ensure PHP has ImageMagick extension enabled
3. Set up admin credentials:
   - Create `admin/.username` file with your admin username
   - Create `admin/.password` file with a hashed password (use `password_hash()`)
   - Example: `echo '<?php echo password_hash("yourpassword", PASSWORD_DEFAULT); ?>' | php > admin/.password`
4. Set proper permissions:
   - `data/` directory should be writable by the web server
   - `admin/.username` and `admin/.password` should be readable by the web server (chmod 600 recommended)

## Usage

### Accessing a Gallery

Visit `index.html?gallery=your-gallery-name` to view a gallery.

### Uploading Files

1. Enter the gallery password when prompted
2. Click "Upload" or drag & drop files
3. Files will be automatically compressed and thumbnails generated

### Admin Panel

1. Visit `admin/index.html`
2. Login with your admin credentials
3. Create galleries, set passwords, and manage files

## File Structure

```
web/
├── index.html          # Main gallery interface
├── style.css           # Gallery styles
├── app.js              # Gallery JavaScript
├── icon.svg            # Icon/logo
├── api/
│   ├── index.php       # Main API endpoint
│   └── helper.php      # Helper functions (included only)
├── admin/
│   ├── index.html      # Admin panel
│   ├── style.css       # Admin styles
│   ├── app.js          # Admin JavaScript
│   ├── api.php         # Admin API endpoint
│   ├── .username       # Admin username
│   └── .password       # Admin password (hashed)
└── data/               # Gallery folders
    └── gallery-name/
        ├── .password   # Gallery password (hashed)
        └── files...    # Gallery files
```

## Security Notes

- Gallery passwords are hashed using PHP's `password_hash()`
- Admin credentials are stored in `admin/.username` and `admin/.password`
- All file paths are validated to prevent directory traversal
- Only images and videos are allowed for upload
- Gallery folder names are sanitized (alphanumeric, underscore, hyphen only)

## Requirements

- PHP 7.4+
- ImageMagick PHP extension
- Web server with PHP support

## License

MIT

