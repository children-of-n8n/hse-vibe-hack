import { randomUUID } from "node:crypto";

import {
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type SignerDeps = {
  bucket?: string;
  region?: string;
  baseUrl?: string;
  endpoint?: string;
  credentials?: S3ClientConfig["credentials"];
  client?: S3Client;
};

export type SignedPutUrl = {
  uploadUrl: string;
  photoUrl: string;
  expiresIn: number;
  key: string;
};

const buildBaseUrl = ({
  bucket,
  region,
  endpoint,
}: {
  bucket?: string;
  region: string;
  endpoint?: string;
}) => {
  if (process.env.S3_PUBLIC_BASE_URL) return process.env.S3_PUBLIC_BASE_URL;
  if (endpoint) return `${endpoint}/${bucket ?? ""}`.replace(/\/+$/, "");
  if (bucket) return `https://${bucket}.s3.${region}.amazonaws.com`;
  return "https://example-bucket.s3.local";
};

export const createS3Signer = (deps: SignerDeps = {}) => {
  const bucket = deps.bucket ?? process.env.S3_BUCKET;
  const region = deps.region ?? process.env.S3_REGION ?? "us-east-1";
  const endpoint = deps.endpoint ?? process.env.S3_ENDPOINT;
  const credentials =
    deps.credentials ??
    (process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY
      ? {
          accessKeyId: process.env.S3_ACCESS_KEY,
          secretAccessKey: process.env.S3_SECRET_KEY,
        }
      : undefined);

  const baseUrl = deps.baseUrl ?? buildBaseUrl({ bucket, region, endpoint });

  const client =
    deps.client ??
    (bucket
      ? new S3Client({
          region,
          endpoint,
          forcePathStyle: Boolean(endpoint),
          credentials,
        })
      : null);

  const signPutUrl = async (
    key: string,
    contentType?: string,
    expiresIn = 900,
  ): Promise<SignedPutUrl> => {
    if (!client || !bucket) {
      const signature = randomUUID().replace(/-/g, "");
      return {
        uploadUrl: `${baseUrl}/${key}?signature=${signature}&expires=${expiresIn}`,
        photoUrl: `${baseUrl}/${key}`,
        expiresIn,
        key,
      };
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn });
    return {
      uploadUrl,
      photoUrl: `${baseUrl}/${key}`,
      expiresIn,
      key,
    };
  };

  return { signPutUrl };
};
