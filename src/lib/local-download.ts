import { mkdir, writeFile, readdir, unlink, stat } from "node:fs/promises";
import path from "node:path";

const DOWNLOAD_ROOT = path.join(process.cwd(), "download");

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "text/csv": ".csv",
  "text/plain": ".txt",
};

function sanitizeSegment(
  value: string | null | undefined,
  fallback = "Unknown",
) {
  const normalized = (value || "").trim();
  if (!normalized) return fallback;
  return normalized
    .replace(/\s+/g, "")
    .replace(/[\\/:*?"<>|]/g, "")
    .slice(0, 80);
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function formatDateFolder(date: Date) {
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const yyyy = date.getFullYear();
  return `Date_${mm}${dd}${yyyy}`;
}

function formatTimeFolder(date: Date, type: "check-in" | "check-out") {
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const label = type === "check-in" ? "Check_In" : "Check_Out";
  return `${label}_${hh}${mm}${ss}`;
}

function buildUserFolderName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  identifier: string,
) {
  const name = sanitizeSegment(`${firstName || ""}${lastName || ""}`);
  const id = sanitizeSegment(identifier, "UnknownID");
  return `${name || "User"}_${id}`;
}

function parseBase64Data(data: string, defaultExt: string) {
  const match = data.match(/^data:([^;]+);base64,(.*)$/);
  if (match) {
    const mime = match[1];
    const base64 = match[2];
    const ext = MIME_EXTENSION_MAP[mime] || defaultExt;
    return { buffer: Buffer.from(base64, "base64"), ext };
  }

  return { buffer: Buffer.from(data, "base64"), ext: defaultExt };
}

async function ensureDir(dirPath: string) {
  await mkdir(dirPath, { recursive: true });
}

export async function saveAttendanceMediaLocally(params: {
  attendanceType: "check-in" | "check-out";
  submittedAt: Date;
  frontPhotoBase64: string;
  backPhotoBase64: string;
  signatureBase64: string;
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  identifier: string;
}) {
  // Only save locally in development mode
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  await ensureDir(DOWNLOAD_ROOT);
  await ensureDir(path.join(DOWNLOAD_ROOT, "attendance"));

  const dateFolder = formatDateFolder(params.submittedAt);
  const timeFolder = formatTimeFolder(
    params.submittedAt,
    params.attendanceType,
  );
  const userFolder = buildUserFolderName(
    params.firstName,
    params.lastName,
    params.identifier,
  );

  const baseDir = path.join(
    DOWNLOAD_ROOT,
    "attendance",
    dateFolder,
    timeFolder,
    userFolder,
  );
  await ensureDir(baseDir);

  const prefix =
    params.attendanceType === "check-in" ? "Check_In" : "Check_Out";
  const id = sanitizeSegment(params.identifier, "UnknownID");

  const front = parseBase64Data(params.frontPhotoBase64, ".jpg");
  const back = parseBase64Data(params.backPhotoBase64, ".jpg");
  const signature = parseBase64Data(params.signatureBase64, ".png");

  await writeFile(
    path.join(baseDir, `${prefix}_Front_${id}${front.ext}`),
    front.buffer,
  );
  await writeFile(
    path.join(baseDir, `${prefix}_Back_${id}${back.ext}`),
    back.buffer,
  );
  await writeFile(
    path.join(baseDir, `Signature_${id}${signature.ext}`),
    signature.buffer,
  );

  return baseDir;
}

export async function saveProfileImageLocally(params: {
  file: File;
  firstName: string;
  lastName: string;
  identifier: string;
}) {
  // Only save locally in development mode
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  await ensureDir(DOWNLOAD_ROOT);
  await ensureDir(path.join(DOWNLOAD_ROOT, "profile_image"));

  const userFolder = buildUserFolderName(
    params.firstName,
    params.lastName,
    params.identifier,
  );
  const baseDir = path.join(DOWNLOAD_ROOT, "profile_image", userFolder);
  await ensureDir(baseDir);

  // Delete old profile images before saving new one
  try {
    const files = await readdir(baseDir);
    for (const file of files) {
      if (file.startsWith("Profile_Image_")) {
        await unlink(path.join(baseDir, file));
      }
    }
  } catch {
    // Directory might not exist yet, ignore error
  }

  const arrayBuffer = await params.file.arrayBuffer();
  const ext =
    MIME_EXTENSION_MAP[params.file.type] ||
    path.extname(params.file.name || "") ||
    ".jpg";

  const filename = `Profile_Image_${sanitizeSegment(params.identifier)}${ext}`;
  await writeFile(path.join(baseDir, filename), Buffer.from(arrayBuffer));

  return baseDir;
}

export async function saveExportFileLocally(params: {
  format: "csv" | "pdf";
  filename: string;
  content: Buffer | string;
}) {
  // Only save locally in development mode
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  await ensureDir(DOWNLOAD_ROOT);
  await ensureDir(path.join(DOWNLOAD_ROOT, "reports"));

  const folder = params.format === "csv" ? "csv" : "pdf";
  const baseDir = path.join(DOWNLOAD_ROOT, "reports", folder);
  await ensureDir(baseDir);

  const fullPath = path.join(baseDir, params.filename);
  const data =
    typeof params.content === "string"
      ? Buffer.from(params.content, "utf-8")
      : params.content;

  await writeFile(fullPath, data);
  return fullPath;
}

/**
 * Clean up attendance files older than 7 days
 * Should be called periodically (e.g., daily cron job)
 */
export async function cleanupOldAttendanceFiles() {
  // Only run in development mode
  if (process.env.NODE_ENV !== "development") {
    return { success: true, deletedCount: 0 };
  }

  const attendanceDir = path.join(DOWNLOAD_ROOT, "attendance");
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let deletedCount = 0;

  try {
    // Read date folders (e.g., Date_01312026)
    const dateFolders = await readdir(attendanceDir);

    for (const dateFolder of dateFolders) {
      const dateFolderPath = path.join(attendanceDir, dateFolder);
      const stats = await stat(dateFolderPath);

      if (!stats.isDirectory()) continue;

      // Check if folder is older than 7 days
      if (stats.mtime < sevenDaysAgo) {
        // Delete all files in the folder recursively
        await deleteDirectoryRecursive(dateFolderPath);
        deletedCount++;
      }
    }

    return { success: true, deletedCount };
  } catch (error) {
    console.error("Error cleaning up old attendance files:", error);
    return { success: false, deletedCount, error };
  }
}

/**
 * Recursively delete a directory and all its contents
 */
async function deleteDirectoryRecursive(dirPath: string) {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await deleteDirectoryRecursive(fullPath);
      } else {
        await unlink(fullPath);
      }
    }

    // Remove the empty directory
    const { rmdir } = await import("node:fs/promises");
    await rmdir(dirPath);
  } catch (error) {
    console.error(`Error deleting directory ${dirPath}:`, error);
    throw error;
  }
}
