# Ultra Simple PHP Gallery

The most simple photo gallery! Just upload it to your Apache/PHP server. It focuses on being fast, minimal, and easy: upload the `web/` folder, visit `admin/`, set an admin password, and let your friends add photos (passwordless or with password)

## What it does

- Simple hosting: upload the `web/` directory to your server and go.
- Self-serve admin: visit `admin/` to set or change the admin password.
- Passworded or passwordless uploads: choose per gallery if uploads need a password.
- Drag-and-drop multi-upload: supports many files at once and even whole directories.
- Subfolder browsing: galleries can be nested; thumbnails are generated automatically.
- Automatic thumbnails: imagick creates fast-loading thumbs on upload.
- Zip export: your friends can download an entire gallery as a zip.

## Quick start

1) Copy `web/` to your Apache/PHP host (ImageMagick extension required).  
2) Make sure `web/data/` is writable by the web server user.  
3) Open `https://yourdomain/admin/` in the browser.  
4) Set an admin user and password when prompted.  
5) Create a gallery, just give it a name and a password (optional)
6) Send the link of the gallery to your friends and let them upload
7) Upload images (single, multi-file, or directory upload). Thumbnails generate on the fly.

## Requirements

- PHP 7.4+ with ImageMagick enabled
- Apache (or any PHP-capable server) with write access to `web/data/`

## File layout (key parts)

```
web/
├── index.html      # Public gallery UI
├── app.js          # Gallery logic
├── style.css       # Gallery styles
├── api/            # Public API for listing/viewing
├── admin/          # Admin UI + upload API
└── data/           # Uploaded images and thumbnails (writable)
```

## Notes

- Passwords are stored hashed; use strong ones for admin.
- Only image uploads are intended; keep `data/` writable and `.htaccess` in place.
- Zip downloads are generated server-side for convenience.

