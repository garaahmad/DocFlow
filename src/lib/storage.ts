import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ServiceError } from "@/lib/access";

let s3: S3Client | undefined;
function storage() {
  const {
    S3_ENDPOINT,
    S3_REGION,
    S3_BUCKET,
    S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY,
  } = process.env;
  if (!S3_REGION || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY)
    throw new ServiceError(503, "Private document storage is not configured.");
  s3 ??= new S3Client({
    endpoint: S3_ENDPOINT || undefined,
    region: S3_REGION,
    forcePathStyle: process.env.S3_PATH_STYLE === "true",
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    maxAttempts: 2,
  });
  return { s3, bucket: S3_BUCKET };
}
export async function putFile(key: string, bytes: Uint8Array, mime: string) {
  const { s3, bucket } = storage();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: mime,
    }),
    { abortSignal: AbortSignal.timeout(25000) },
  );
}
export async function readFile(key: string) {
  const { s3, bucket } = storage();
  const result = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { abortSignal: AbortSignal.timeout(25000) },
  );
  if (!result.Body) throw new Error("Stored document is unavailable.");
  return result.Body.transformToByteArray();
}
export async function removeFile(key: string) {
  const { s3, bucket } = storage();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), {
    abortSignal: AbortSignal.timeout(15000),
  });
}
export async function signFile(
  key: string,
  filename: string,
  mime: string,
  download: boolean,
) {
  const { s3, bucket } = storage();
  const safeName = filename.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 100);
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentType: mime,
      ResponseCacheControl: "private, no-store",
      ResponseContentDisposition:
        (download ? "attachment" : "inline") + '; filename="' + safeName + '"',
    }),
    { expiresIn: 90 },
  );
}
