require('dotenv').config();
const { generateTest } = require('./src/test');

if (!process.env.AWS_BUCKET_REGION || !process.env.AWS_BUCKET_NAME || !process.env.AWS_ACCESS_KEY || !process.env.AWS_SECRET_KEY || !process.env.OPENAI_API_KEY) {
    console.error('Missing required environment variables.');
    process.exit(1);
}

const final_intent = process.argv[2];

if (!final_intent) {
    console.error('Missing required "final_intent" argument.');
    process.exit(1);
}

generateTest();