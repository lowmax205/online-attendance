#!/usr/bin/env tsx

/**
 * Cleanup script for old attendance files
 * Deletes attendance media files older than 7 days from the local download folder
 * 
 * Usage:
 *   npm run cleanup:attendance
 *   or
 *   tsx scripts/cleanup-old-attendance.ts
 */

import { cleanupOldAttendanceFiles } from "../src/lib/local-download";

async function main() {
  console.log("🗑️  Starting cleanup of old attendance files...\n");
  
  const result = await cleanupOldAttendanceFiles();
  
  if (result.success) {
    console.log(`✅ Cleanup completed successfully!`);
    console.log(`📊 Deleted ${result.deletedCount} date folder(s) older than 7 days\n`);
  } else {
    console.error("❌ Cleanup failed:", result.error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
