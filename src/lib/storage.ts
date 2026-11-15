import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

function getS3Client() {
  const endpoint = process.env["AWS_ENDPOINT_URL_S3"];
  const accessKeyId = process.env["AWS_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["AWS_SECRET_ACCESS_KEY"];
  const region = process.env["AWS_REGION"] ?? "ap-southeast-1";

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("Neon Object Storage S3 credentials not configured in environment.");
  }

  return new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export const getBucketName = () => process.env["NEON_STORAGE_BUCKET"] ?? "uploads";

export async function uploadToNeonStorage(
  fileBuffer: Buffer | Uint8Array,
  fileName: string,
  contentType: string = "image/jpeg",
): Promise<string> {
  const s3 = getS3Client();
  const bucket = getBucketName();

  const ext = fileName.includes(".") ? fileName.split(".").pop() : "jpg";
  const uniqueKey = `menu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: uniqueKey,
      Body: fileBuffer,
      ContentType: contentType,
    }),
  );

  return `/api/storage/${uniqueKey}`;
}

export async function getFromNeonStorage(key: string) {
  const s3 = getS3Client();
  const bucket = getBucketName();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await s3.send(command);
}

export async function deleteFromNeonStorage(key: string) {
  try {
    const s3 = getS3Client();
    const bucket = getBucketName();
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  } catch (error) {
    console.warn("Failed to delete object from storage:", key, error);
  }
}
