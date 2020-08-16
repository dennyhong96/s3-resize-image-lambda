const os = require("os");
const fs = require("fs").promises;
const AWS = require("aws-sdk");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");

AWS.config.update({ region: "us-west-2" });
const s3 = new AWS.S3();

exports.handler = async (event, context) => {
  try {
    const fileProcessed = event.Records.map(async (record) => {
      const bucket = record.s3.bucket.name;
      const fileName = record.s3.object.key;

      // Get file from s3
      const getObjParams = { Bucket: bucket, Key: fileName };
      const inputData = await s3.getObject(getObjParams).promise();

      // Resize Image
      // Read-only file system : need to use os.temdir() to write to temporary dir
      const tempFilePath = `${os.tmpdir()}/${uuidv4()}.jpg`;
      await sharp(inputData.Body).resize(150, 150).toFile(tempFilePath);

      // Read resized file
      const resizedData = await fs.readFile(tempFilePath);

      // Updoad resized image to s3
      const putObjParams = {
        Bucket: `${bucket}-sm`, // another bucket to store small images
        Key: `${fileName}-sm.jpg`, // new image name
        Body: Buffer.from(resizedData),
        ContentType: "image/jpeg",
      };
      await s3.putObject(putObjParams).promise();
    });
    await Promise.all(fileProcessed);
    return "done";
  } catch (error) {
    console.error(error);
    throw error;
  }
};
