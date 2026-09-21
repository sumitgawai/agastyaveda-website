const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { config } = require("./config");

function client() {
  if (!config.aws.region || !config.aws.bucket || !config.aws.accessKeyId || !config.aws.secretAccessKey) return null;
  return new S3Client({
    region: config.aws.region,
    credentials: { accessKeyId: config.aws.accessKeyId, secretAccessKey: config.aws.secretAccessKey }
  });
}

async function putPrivateObject({ key, body, contentType }) {
  const s3 = client();
  if (!s3) throw new Error("Private document storage is not configured.");
  await s3.send(new PutObjectCommand({ Bucket: config.aws.bucket, Key: key, Body: body, ContentType: contentType, ServerSideEncryption: "AES256" }));
  return key;
}

async function createPrivateDownloadUrl(key) {
  const s3 = client();
  if (!s3) throw new Error("Private document storage is not configured.");
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: config.aws.bucket, Key: key }), { expiresIn: 300 });
}

module.exports = { putPrivateObject, createPrivateDownloadUrl };
