import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

// -------------------------------------------------------------
// CLOUDFLARE R2 STORAGE
// -------------------------------------------------------------
// Two separate buckets, two separate credential pairs, on purpose:
//   - PUBLIC bucket: product/vendor photos, brand logo, popup image.
//     Uploaded objects get a real, directly-loadable URL.
//   - PRIVATE bucket: payment receipts and pickup vouchers. Never made
//     publicly readable -- objects are only ever reachable through a
//     freshly-generated, short-lived signed URL, via the /api/r2/private-image
//     proxy endpoint in server.ts.
// Splitting credentials (not just buckets) means a leaked public-bucket
// key can never touch a single receipt, and vice versa.
//
// EVERYTHING here is fail-safe by design: if the required env vars
// aren't set yet (e.g. mid-setup, or Vercel temporarily blocked from
// saving them), every function below returns null / falls back cleanly
// instead of throwing -- callers are expected to fall back to the
// existing base64-in-database behavior in that case, so the app keeps
// working exactly as it does today until R2 is fully wired up.

const endpoint = process.env.R2_ENDPOINT;
const publicBucket = process.env.R2_PUBLIC_BUCKET_NAME;
const privateBucket = process.env.R2_PRIVATE_BUCKET_NAME;
// Custom domain pointed at the public bucket (e.g. https://images.owode.ng).
// Optional -- if not set yet, falls back to the raw R2 endpoint URL, which
// works for uploading but won't actually be publicly viewable until a
// custom domain or the r2.dev managed domain is enabled for that bucket.
const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

function makeClient(accessKeyId?: string, secretAccessKey?: string): S3Client | null {
  if (!endpoint || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

const publicClient = makeClient(process.env.R2_PUBLIC_ACCESS_KEY_ID, process.env.R2_PUBLIC_SECRET_ACCESS_KEY);
const privateClient = makeClient(process.env.R2_PRIVATE_ACCESS_KEY_ID, process.env.R2_PRIVATE_SECRET_ACCESS_KEY);

export const isPublicR2Configured = () => !!(publicClient && publicBucket);
export const isPrivateR2Configured = () => !!(privateClient && privateBucket);

interface ParsedDataUri {
  buffer: Buffer;
  contentType: string;
  ext: string;
}

function parseDataUri(dataUri: string): ParsedDataUri | null {
  const match = dataUri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const [, contentType, base64Data] = match;
  const ext = contentType.split("/")[1]?.replace("+xml", "") || "jpg";
  try {
    return { buffer: Buffer.from(base64Data, "base64"), contentType, ext };
  } catch {
    return null;
  }
}

// Uploads a base64 data URI to the PUBLIC bucket and returns a real,
// directly-loadable URL. Returns null (never throws) if R2 isn't
// configured, the input isn't a genuine image data URI, or the upload
// fails for any reason -- callers must fall back to storing the
// original value unchanged in that case.
export async function uploadPublicImage(dataUri: string, folder: string): Promise<string | null> {
  if (!publicClient || !publicBucket) return null;
  const parsed = parseDataUri(dataUri);
  if (!parsed) return null;

  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}.${parsed.ext}`;
  try {
    await publicClient.send(new PutObjectCommand({
      Bucket: publicBucket,
      Key: key,
      Body: parsed.buffer,
      ContentType: parsed.contentType,
    }));
  } catch (err) {
    console.error(`[R2] Public upload failed for key "${key}":`, err);
    return null;
  }

  const base = publicBaseUrl ? publicBaseUrl.replace(/\/$/, "") : `${endpoint}/${publicBucket}`;
  return `${base}/${key}`;
}

// Uploads a base64 data URI to the PRIVATE bucket. Rather than returning
// a raw R2 URL (which wouldn't be viewable at all -- the bucket is never
// made public), this returns a stable URL pointing at this app's own
// /api/r2/private-image proxy endpoint. That endpoint generates a fresh
// signed R2 URL on every request, so the stored value works exactly like
// a normal image URL in any existing <img src>, with no special handling
// needed anywhere else in the app.
export async function uploadPrivateImage(dataUri: string, folder: string): Promise<string | null> {
  if (!privateClient || !privateBucket) return null;
  const parsed = parseDataUri(dataUri);
  if (!parsed) return null;

  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}.${parsed.ext}`;
  try {
    await privateClient.send(new PutObjectCommand({
      Bucket: privateBucket,
      Key: key,
      Body: parsed.buffer,
      ContentType: parsed.contentType,
    }));
  } catch (err) {
    console.error(`[R2] Private upload failed for key "${key}":`, err);
    return null;
  }

  return `/api/r2/private-image?key=${encodeURIComponent(key)}`;
}

// Generates a short-lived signed URL for a private-bucket object. Used
// exclusively by the /api/r2/private-image proxy endpoint. A short expiry
// (5 minutes) limits exposure if a generated link were ever shared or
// logged somewhere unintended -- it's regenerated fresh on every view
// anyway, so there's no real downside to keeping it short.
export async function getSignedPrivateUrl(key: string): Promise<string | null> {
  if (!privateClient || !privateBucket) return null;
  try {
    const command = new GetObjectCommand({ Bucket: privateBucket, Key: key });
    return await getSignedUrl(privateClient, command, { expiresIn: 300 });
  } catch (err) {
    console.error(`[R2] Failed to generate signed URL for key "${key}":`, err);
    return null;
  }
}

// Deletes an object from whichever bucket it belongs to -- used when an
// image is replaced (e.g. a vendor uploads a new logo) so the old file
// doesn't sit around unused forever. Best-effort: a failed delete here
// should never block the actual save it's cleaning up after.
export async function deleteR2Object(url: string): Promise<void> {
  try {
    if (url.startsWith("/api/r2/private-image")) {
      if (!privateClient || !privateBucket) return;
      const key = new URL(url, "http://localhost").searchParams.get("key");
      if (!key) return;
      await privateClient.send(new DeleteObjectCommand({ Bucket: privateBucket, Key: key }));
    } else if (publicBaseUrl && url.startsWith(publicBaseUrl)) {
      if (!publicClient || !publicBucket) return;
      const key = url.slice(publicBaseUrl.replace(/\/$/, "").length + 1);
      await publicClient.send(new DeleteObjectCommand({ Bucket: publicBucket, Key: key }));
    }
  } catch (err) {
    console.error(`[R2] Failed to delete object for URL "${url}":`, err);
  }
}
