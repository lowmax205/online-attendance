# PWA Icon Generation Guide

Since this project uses an SVG logo, you'll need to generate PNG icons for PWA support.

## Quick Option: Use an Online Tool

1. Go to <https://realfavicongenerator.net/>
2. Upload your logo.svg file
3. Download the generated icons
4. Place them in `/public/images/icons/` with these names:
   - icon-72x72.png
   - icon-96x96.png
   - icon-128x128.png
   - icon-144x144.png
   - icon-152x152.png
   - icon-192x192.png
   - icon-384x384.png
   - icon-512x512.png

## Alternative: Use Sharp (Node.js)

Install sharp: `npm install sharp --save-dev`

Then run:

```javascript
const sharp = require('sharp');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  sharp('public/images/logo.svg')
    .resize(size, size)
    .png()
    .toFile(`public/images/icons/icon-${size}x${size}.png`);
});
```

## Temporary Placeholder

Until you generate proper icons, the PWA will still work but may show a default icon.
The manifest.json is already configured to look for icons in the correct locations.

## Screenshots (Optional)

For a better install experience, you can also add screenshots:

- `/public/images/screenshots/dashboard-wide.png` (1280x720)
- `/public/images/screenshots/attendance-narrow.png` (750x1334)
