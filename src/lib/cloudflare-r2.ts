import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const CLOUDFLARE_S3_API = process.env.CLOUDFLARE_S3_API;
const CLOUDFLARE_ACCESS_ID = process.env.CLOUDFLARE_ACCESS_ID;
const CLOUDFLARE_SECRET_KEY = process.env.CLOUDFLARE_SECRET_KEY;
const CLOUDFLARE_R2_PUBLIC_BASE_URL = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL;

interface UploadToR2Options {
  folder?: string;
  filename?: string;
}

interface UploadToR2Result {
  key: string;
  url: string;
}

interface R2Configuration {
  endpoint: string;
  bucket: string;
}

let r2Client: S3Client | null = null;
let cachedConfig: R2Configuration | null = null;

function parseR2Configuration(): R2Configuration {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (!CLOUDFLARE_S3_API) {
    throw new Error("CLOUDFLARE_S3_API is not defined.");
  }

  if (!CLOUDFLARE_ACCESS_ID || !CLOUDFLARE_SECRET_KEY) {
    throw new Error(
      "Cloudflare R2 credentials are not configured. Provide CLOUDFLARE_ACCESS_ID and CLOUDFLARE_SECRET_KEY.",
    );
  }

  const endpointUrl = new URL(CLOUDFLARE_S3_API);
  const bucket = endpointUrl.pathname.replace(/^\/+|\/+$/g, "");

  if (!bucket) {
    throw new Error(
      "CLOUDFLARE_S3_API must include the bucket name, e.g. https://<account>.r2.cloudflarestorage.com/<bucket>.",
    );
  }

  const endpoint = `${endpointUrl.protocol}//${endpointUrl.host}`;

  cachedConfig = { endpoint, bucket };
  return cachedConfig;
}

function getR2Client(): S3Client {
  if (r2Client) {
    return r2Client;
  }

  const { endpoint } = parseR2Configuration();

  r2Client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: CLOUDFLARE_ACCESS_ID as string,
      secretAccessKey: CLOUDFLARE_SECRET_KEY as string,
    },
  });

  return r2Client;
}

function buildR2Key(folder: string | undefined, filename: string): string {
  const cleanedFolder = folder?.replace(/^\/+|\/+$/g, "");
  return cleanedFolder ? `${cleanedFolder}/${filename}` : filename;
}

function buildPublicUrl(key: string): string {
  if (CLOUDFLARE_R2_PUBLIC_BASE_URL) {
    const base = CLOUDFLARE_R2_PUBLIC_BASE_URL.replace(/\/+$/g, "");
    return `${base}/${key}`;
  }

  const api = CLOUDFLARE_S3_API?.replace(/\/+$/g, "");
  if (!api) {
    throw new Error("Unable to derive Cloudflare R2 public URL.");
  }

  return `${api}/${key}`;
}

export async function uploadFileToR2(
  file: File,
  { folder, filename }: UploadToR2Options = {},
): Promise<UploadToR2Result> {
  const { bucket } = parseR2Configuration();
  const client = getR2Client();

  const resolvedFilename =
    filename ||
    file.name ||
    `${folder ? folder.replaceAll("/", "-") : "file"}-${randomUUID()}`;

  const key = buildR2Key(folder, resolvedFilename);

  const arrayBuffer = await file.arrayBuffer();
  const body = Buffer.from(arrayBuffer);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: file.type || "application/octet-stream",
    }),
  );

  return {
    key,
    url: buildPublicUrl(key),
  };
}
