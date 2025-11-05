# How to Generate favicon.ico

## Quick Method (Recommended)

1. **Use an online converter:**
   - Visit: https://convertio.co/svg-ico/ or https://www.icoconverter.com/
   - Upload `app/icon.svg`
   - Download the generated `favicon.ico`
   - Place it in the `public` folder as `public/favicon.ico`

## Alternative Methods

### Using ImageMagick (Command Line)
```bash
# Install ImageMagick first
magick convert app/icon.svg -resize 32x32 public/favicon.ico
```

### Using Node.js script
```bash
npm install sharp
node scripts/generate-favicon.js
```

## Current Setup

- ✅ `app/icon.svg` - SVG favicon (works in modern browsers)
- ✅ Metadata configured in `app/layout.tsx`
- ⏳ `public/favicon.ico` - Needs to be generated from SVG

The SVG icon will work as a fallback, but for best compatibility, generate the .ico file using one of the methods above.

