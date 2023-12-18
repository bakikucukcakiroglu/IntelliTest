const S3 = require('aws-sdk/clients/s3');
const fs = require('fs');

const s3 = new S3({
    region: process.env.AWS_BUCKET_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
});

async function uploadFileToS3(filePath) {
    try {
        const uploadResult = await uploadFile(filePath);
        console.log("Image uploaded to S3 bucket successfully!", uploadResult.Location);
        return uploadResult.Location;
    } catch (err) {
        console.error('Error in uploadFileToS3!');
        throw err;
    }
}
exports.uploadFileToS3 = uploadFileToS3;

async function uploadFile(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const fileName = extractFileName(filePath);
    const uploadParams = { Bucket: process.env.AWS_BUCKET_NAME, Body: fileStream, Key: fileName };
    return s3.upload(uploadParams).promise();
}

async function deleteLocalFile(filePath) {
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('Error deleting local file:', err);
        }
        console.log('Local file deleted successfully:', filePath);
    });
}
exports.deleteLocalFile = deleteLocalFile;

function extractFileName(path) {
    const regex = /\/([^\/]+)$/;
    const match = path.match(regex);
    return match ? match[1] : null;
}