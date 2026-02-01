/**
 * Generate PWA icons from the SVG logo
 * Run with: node scripts/generate-pwa-icons.js
 */

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
// Use the hex-color version of the logo for Sharp compatibility
const inputPath = path.join(__dirname, "../public/images/logo.svg");
const outputDir = path.join(__dirname, "../public/images/icons");

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log("Generating PWA icons from:", inputPath);
  console.log("Output directory:", outputDir);
  console.log("");

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    try {
      await sharp(inputPath)
        .resize(size, size, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .png()
        .toFile(outputPath);
      console.log(`✓ Generated icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`✗ Failed to generate icon-${size}x${size}.png:`, error.message);
    }
  }

  console.log("");
  console.log("Done! Icons generated in public/images/icons/");
}

generateIcons().catch(console.error);
