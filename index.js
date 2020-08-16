const sharp = require("sharp");
const fs = require("fs").promises;
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const os = require("os");

AWS.config.update({ region: "us-west-2" });
const s3 = new AWS.S3();

exports.handler = async (event, context) => {
  try {
    const fileProcessed = event.Records.map(async (record) => {
      const bucket = record.s3.bucket.name;
      const fileName = record.s3.object.key;

      // Get file from s3
      const getParams = { Bucket: bucket, Key: fileName };
      const inputData = await s3.getObject(getParams).promise();

      // Resize Image
      // Read-only file system : need to use os.temdir() to write
      const tempFilePath = `${os.tmpdir()}/${uuidv4()}.jpg`;
      await sharp(inputData.Body).resize(150, 150).toFile(tempFilePath);

      // Read resized file
      const resizedData = await fs.readFile(tempFilePath);

      // Updoad resized image to s3
      const targetFileName = `${fileName}-sm.jpg`;
      const putParams = {
        Bucket: `${bucket}-sm`,
        Key: targetFileName,
        Body: Buffer.from(resizedData),
        ContentType: "image/jpeg",
      };
      await s3.putObject(putParams).promise();
    });
    await Promise.all(fileProcessed);
    return "done";
  } catch (error) {
    console.error(error);
    throw error;
  }
};
