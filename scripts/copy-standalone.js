// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

function copyDir(src, dest) {
  // Create destination directory
  fs.mkdirSync(dest, { recursive: true });

  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDir(srcPath, destPath);
    } else {
      // Copy files
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  console.log("Copying public files to standalone build...");
  copyDir("public", ".next/standalone/public");
  console.log("✓ Public files copied");

  console.log("Copying static files to standalone build...");
  copyDir(".next/static", ".next/standalone/.next/static");
  console.log("✓ Static files copied");

  console.log("✓ Standalone build preparation complete");
} catch (error) {
  console.error("Error copying files:", error);
  process.exit(1);
}
