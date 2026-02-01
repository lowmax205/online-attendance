/**
 * Script to clear all data from production database and create a new admin user
 * Also clears images from Cloudinary and documents from Cloudflare R2
 * WARNING: This will delete ALL data permanently!
 *
 * Usage: npm run db:clear confirm
 */

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { v2 as cloudinary } from "cloudinary";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

/**
 * Configure Cloudinary
 */
function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
  });
}

/**
 * Get Cloudflare R2 client
 */
function getR2Client(): {
  client: S3Client;
  bucket: string;
} | null {
  const CLOUDFLARE_S3_API = process.env.CLOUDFLARE_S3_API;
  const CLOUDFLARE_ACCESS_ID = process.env.CLOUDFLARE_ACCESS_ID;
  const CLOUDFLARE_SECRET_KEY = process.env.CLOUDFLARE_SECRET_KEY;

  if (!CLOUDFLARE_S3_API || !CLOUDFLARE_ACCESS_ID || !CLOUDFLARE_SECRET_KEY) {
    console.log("⚠️  Cloudflare R2 credentials not found, skipping R2 cleanup");
    return null;
  }

  try {
    const endpointUrl = new URL(CLOUDFLARE_S3_API);
    const bucket = endpointUrl.pathname.replace(/^\/+|\/+$/g, "");
    const endpoint = `${endpointUrl.protocol}//${endpointUrl.host}`;

    const client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: CLOUDFLARE_ACCESS_ID,
        secretAccessKey: CLOUDFLARE_SECRET_KEY,
      },
    });

    return { client, bucket };
  } catch (error) {
    console.error("❌ Error configuring R2 client:", error);
    return null;
  }
}

/**
 * Clear all images from Cloudinary
 */
async function clearCloudinaryImages() {
  try {
    const CLOUDINARY_FOLDER =
      process.env.CLOUDINARY_FOLDER || "event-attendance-storage";

    console.log("\n🗑️  Clearing Cloudinary images...\n");

    // Delete all resources in the folder (including subfolders)
    const result = await cloudinary.api.delete_resources_by_prefix(
      CLOUDINARY_FOLDER,
      {
        resource_type: "image",
        type: "upload",
      },
    );

    console.log(
      `✓ Deleted ${Object.keys(result.deleted).length} images from Cloudinary`,
    );

    // Delete the folder structure
    try {
      await cloudinary.api.delete_folder(`${CLOUDINARY_FOLDER}/attendance`);
      await cloudinary.api.delete_folder(`${CLOUDINARY_FOLDER}/events`);
      await cloudinary.api.delete_folder(CLOUDINARY_FOLDER);
      console.log("✓ Cleaned up Cloudinary folder structure");
    } catch {
      // Folders might not exist or already be empty
      console.log("✓ Cloudinary folders cleaned (if they existed)");
    }

    return true;
  } catch (error) {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_SECRET_KEY
    ) {
      console.log(
        "⚠️  Cloudinary credentials not found, skipping Cloudinary cleanup",
      );
      return false;
    }
    console.error("❌ Error clearing Cloudinary images:", error);
    return false;
  }
}

/**
 * Clear all files from Cloudflare R2
 */
async function clearR2Files() {
  const r2Config = getR2Client();

  if (!r2Config) {
    return false;
  }

  const { client, bucket } = r2Config;

  try {
    console.log("\n🗑️  Clearing Cloudflare R2 files...\n");

    let continuationToken: string | undefined;
    let totalDeleted = 0;

    do {
      // List objects in bucket
      const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      });

      const listResponse = await client.send(listCommand);

      if (listResponse.Contents && listResponse.Contents.length > 0) {
        // Delete objects in batches
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: listResponse.Contents.map((obj) => ({ Key: obj.Key! })),
            Quiet: false,
          },
        });

        const deleteResponse = await client.send(deleteCommand);
        const deletedCount = deleteResponse.Deleted?.length || 0;
        totalDeleted += deletedCount;

        console.log(`✓ Deleted ${deletedCount} files from R2`);
      }

      continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);

    if (totalDeleted === 0) {
      console.log("✓ No files found in R2 bucket");
    } else {
      console.log(`✓ Total R2 files deleted: ${totalDeleted}`);
    }

    return true;
  } catch (error) {
    console.error("❌ Error clearing R2 files:", error);
    return false;
  }
}

/**
 * Get the appropriate database URL based on the environment
 */
function getDatabaseUrl(): string {
  const nodeEnv = process.env.NODE_ENV;

  // If DATABASE_URL is set, use it (for local development and build)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // In production, fall back to Supabase connection
  if (nodeEnv === "production") {
    const productionUrl = process.env.POSTGRES_URL_NON_POOLING;
    if (!productionUrl) {
      throw new Error(
        "POSTGRES_URL_NON_POOLING is required in production when DATABASE_URL is not set",
      );
    }
    return productionUrl;
  }

  throw new Error("DATABASE_URL is required");
}
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
});

async function clearAllData() {
  const dbUrl = getDatabaseUrl();
  console.log("⚠️  WARNING: This will delete ALL data from the database!");
  console.log("⚠️  WARNING: This will also delete ALL images from Cloudinary!");
  console.log(
    "⚠️  WARNING: This will also delete ALL files from Cloudflare R2!",
  );
  console.log("\nDatabase URL:", dbUrl.split("@")[1]); // Show host only
  console.log("Environment:", process.env.NODE_ENV || "development");

  try {
    // Configure Cloudinary
    configureCloudinary();

    // Clear Cloudinary images first
    await clearCloudinaryImages();

    // Clear Cloudflare R2 files
    await clearR2Files();

    // Delete database data in order to respect foreign key constraints
    console.log("\n🗑️  Deleting database data...\n");

    const attendanceCount = await prisma.attendance.deleteMany({});
    console.log(`✓ Deleted ${attendanceCount.count} attendance records`);

    const exportCount = await prisma.exportRecord.deleteMany({});
    console.log(`✓ Deleted ${exportCount.count} export records`);

    const securityLogCount = await prisma.securityLog.deleteMany({});
    console.log(`✓ Deleted ${securityLogCount.count} security logs`);

    const sessionCount = await prisma.session.deleteMany({});
    console.log(`✓ Deleted ${sessionCount.count} sessions`);

    const eventCount = await prisma.event.deleteMany({});
    console.log(`✓ Deleted ${eventCount.count} events`);

    const profileCount = await prisma.userProfile.deleteMany({});
    console.log(`✓ Deleted ${profileCount.count} user profiles`);

    const configCount = await prisma.systemConfig.deleteMany({});
    console.log(`✓ Deleted ${configCount.count} system configs`);

    const userCount = await prisma.user.deleteMany({});
    console.log(`✓ Deleted ${userCount.count} users`);

    console.log("\n✅ All data cleared successfully!");
    console.log("\n👤 Creating new admin user...\n");

    // Create new admin user
    const adminId = randomUUID();
    const hashedPassword = await hash("Admin@2025!", 10);

    const admin = await prisma.user.create({
      data: {
        id: adminId,
        email: "admin@snsu.ph",
        passwordHash: hashedPassword,
        role: "Administrator",
        emailVerified: true,
        firstName: "System",
        lastName: "Administrator",
        accountStatus: "ACTIVE",
        UserProfile: {
          create: {
            id: randomUUID(),
            studentId: "ADMIN-001",
            department: "CCIS",
            course: "Computer Science",
            yearLevel: 4,
            section: "Admin",
            contactNumber: "+1234567890",
            updatedAt: new Date(),
          },
        },
      },
    });

    console.log("✅ Admin user created successfully!");
    console.log("\n📧 Email:", admin.email);
    console.log("🔑 Password: Admin@2025!");
    console.log("👤 Role:", admin.role);
    console.log("\n⚠️  IMPORTANT: Change this password after first login!\n");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Require confirmation
const args = process.argv.slice(2);
const hasConfirm = args.includes("--confirm") || args.includes("confirm");

if (!hasConfirm) {
  console.log(
    "\n⚠️  This script will DELETE ALL DATA from your production database!",
  );
  console.log("   It will also delete ALL images from Cloudinary!");
  console.log("   It will also delete ALL files from Cloudflare R2!");
  console.log("   Then it will create a new admin user with full control.");
  console.log("\nTo proceed, run:");
  console.log("  npm run db:clear confirm");
  console.log("  or");
  console.log("  npx tsx scripts/clear-production-data.ts --confirm");
  process.exit(0);
}

clearAllData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
