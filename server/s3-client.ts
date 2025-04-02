import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { log } from "./vite";

// Create a function that returns a fresh S3 client using the latest environment variables
export function createS3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    }
  });
}

// Export the S3 client instance
export let s3Client = createS3Client();

// Function to update the S3 client with new credentials
export function updateS3Client(): void {
  s3Client = createS3Client();
  log("S3 client updated with new credentials");
}

// Export bucket names from environment variables
export const userBucketName = process.env.USER_BUCKET_NAME!;
export const menuBucketName = process.env.MENU_BUCKET_NAME!;

// Check if S3 is configured properly and we have access
export async function checkS3Access(): Promise<boolean> {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    log("S3 access check skipped - AWS credentials not provided");
    return false;
  }
  
  if (!userBucketName || !menuBucketName) {
    log("S3 access check skipped - bucket names not provided");
    return false;
  }
  
  log("Checking S3 access with AWS credentials:");
  log(`  Region: ${process.env.AWS_REGION}`);
  log(`  User Bucket: ${userBucketName}`);
  log(`  Menu Bucket: ${menuBucketName}`);
  log(`  Access Key ID: ${process.env.AWS_ACCESS_KEY_ID.substring(0, 5)}...`);
  
  try {
    // First try a simple operation to check credentials - list buckets
    log("Sending S3 ListBuckets command to verify credentials...");
    const listBucketsResponse = await s3Client.send(new ListBucketsCommand({}));
    
    log(`S3 credentials check successful. Found ${listBucketsResponse.Buckets?.length || 0} buckets.`);
    
    // Check if our expected buckets are in the list
    const foundUserBucket = listBucketsResponse.Buckets?.some(bucket => bucket.Name === userBucketName);
    const foundMenuBucket = listBucketsResponse.Buckets?.some(bucket => bucket.Name === menuBucketName);
    
    if (listBucketsResponse.Buckets) {
      listBucketsResponse.Buckets.forEach(bucket => {
        log(`  - Found bucket: ${bucket.Name}`);
      });
    }
    
    // Additional detailed logs about what we're attempting to access
    if (foundUserBucket) {
      log(`✅ Confirmed access to user bucket: ${userBucketName}`);
    } else {
      log(`⚠️ WARNING: User bucket ${userBucketName} not found in bucket list!`);
    }
    
    if (foundMenuBucket) {
      log(`✅ Confirmed access to menu bucket: ${menuBucketName}`);
    } else {
      log(`⚠️ WARNING: Menu bucket ${menuBucketName} not found in bucket list!`);
    }
    
    if (foundUserBucket && foundMenuBucket) {
      log("✅ S3 integration is FULLY ENABLED");
    } else {
      log("⚠️ S3 integration is PARTIALLY ENABLED - some buckets were not found")
    }
    
    // Return true even if buckets weren't found - we'll try to access them anyway
    // and individual operations will fail if needed
    
    return true;
  } catch (error) {
    log(`S3 access check failed: ${error instanceof Error ? error.message : String(error)}`);
    log("Falling back to in-memory storage only");
    return false;
  }
}

// Flag to track if S3 is accessible
export let s3Accessible = false;

// Initialize function that must be called before server starts
export async function initializeS3(): Promise<void> {
  log("Initializing S3 connectivity...");
  try {
    s3Accessible = await checkS3Access();
    log(`S3 integration status: ${s3Accessible ? 'ENABLED' : 'DISABLED'}`);
    
    if (!s3Accessible && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      // We have credentials but couldn't connect - log detailed troubleshooting info
      log("⚠️ S3 connectivity failed despite credentials being provided:");
      log(`  Region: ${process.env.AWS_REGION || 'us-east-1'}`);
      log(`  User Bucket: ${process.env.USER_BUCKET_NAME || 'not set'}`);
      log(`  Menu Bucket: ${process.env.MENU_BUCKET_NAME || 'not set'}`);
      log("Please check your AWS credentials and bucket configurations.");
    } else if (!s3Accessible) {
      log("S3 integration DISABLED - no credentials provided.");
    }
  } catch (error) {
    s3Accessible = false;
    log(`⚠️ Unexpected error during S3 initialization: ${error instanceof Error ? error.message : String(error)}`);
    log("S3 integration has been DISABLED due to initialization error.");
  }
}