import "dotenv/config";
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";

const {
  S3_ENDPOINT,
  S3_REGION,
  S3_BUCKET,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
} = process.env;
if (
  !S3_ENDPOINT ||
  !S3_BUCKET ||
  !S3_ACCESS_KEY_ID ||
  !S3_SECRET_ACCESS_KEY ||
  !["localhost", "127.0.0.1"].includes(new URL(S3_ENDPOINT).hostname)
)
  throw new Error("This command initializes local storage only.");
const client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
async function main() {
  try {
    await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
  } catch (error) {
    if (Reflect.get(Object(error), "$metadata")?.httpStatusCode !== 404)
      throw error;
    await client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
  }
  console.log("Local document bucket is ready.");
}
main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.name : "Storage initialization failed",
    );
    process.exitCode = 1;
  })
  .finally(() => client.destroy());
