import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3Client, userBucketName, menuBucketName, s3Accessible } from "./s3-client";
import { Readable } from "stream";
import { log } from "./vite";

/**
 * Utility function to convert streams to string
 */
async function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

/**
 * S3Storage class to handle saving and retrieving data from AWS S3 buckets
 */
export class S3Storage {
  // User operations
  async saveUser(userId: number, userData: any): Promise<void> {
    // Skip if S3 is not accessible
    if (!s3Accessible) {
      log(`Skipping S3 save for user ${userId} - S3 not accessible`);
      return;
    }
    
    try {
      // Validate userData before saving
      if (!userData) {
        log(`Cannot save user ${userId} to S3: userData is null or undefined`);
        return;
      }
      
      if (!userData.id || !userData.username) {
        log(`Cannot save user ${userId} to S3: userData is missing required fields`);
        log(`User data keys: ${Object.keys(userData).join(', ')}`);
        return;
      }
      
      // Ensure the user ID in the data matches the ID we're saving under
      if (userData.id !== userId) {
        log(`Warning: User ID mismatch during save - path ID: ${userId}, data ID: ${userData.id}`);
        log(`Fixing by updating userData.id to ${userId}`);
        userData.id = userId;
      }
      
      // Create a copy for logging without the password
      const userForLogging = { ...userData };
      if (userForLogging.password) {
        userForLogging.password = `<password hash hidden>`;
      }
      log(`User data before serialization:`);
      log(JSON.stringify(userForLogging, null, 2));
      
      const serializedData = JSON.stringify(userData);
      log(`Serialized user data for ${userId} (${serializedData.length} bytes)`);
      log(`FULL SERIALIZED JSON: ${serializedData}`);
      
      const params = {
        Bucket: userBucketName,
        Key: `user-${userId}.json`,
        Body: serializedData,
        ContentType: "application/json",
      };

      log(`Sending PutObjectCommand to S3 for user-${userId}.json in bucket ${userBucketName}`);
      const result = await s3Client.send(new PutObjectCommand(params));
      
      log(`Successfully saved user ${userId} (${userData.username}) to S3`);
      log(`S3 PutObject result: ${JSON.stringify(result)}`);
      
      // Verify content was saved by doing a quick check
      const checkParams = {
        Bucket: userBucketName,
        Key: `user-${userId}.json`,
      };
      
      try {
        await s3Client.send(new GetObjectCommand(checkParams));
        log(`Verification successful: user-${userId}.json exists in S3`);
      } catch (checkError) {
        log(`WARNING: Verification failed for user-${userId}.json: ${checkError instanceof Error ? checkError.message : String(checkError)}`);
      }
    } catch (error) {
      log(`Error saving user ${userId} to S3: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        log(`Error stack: ${error.stack}`);
      }
      // Just log the error instead of throwing it to allow the app to continue with memory storage
    }
  }

  async getUser(userId: number): Promise<any | null> {
    // Skip if S3 is not accessible
    if (!s3Accessible) {
      log(`Skipping S3 getUser(${userId}) - S3 not accessible`);
      return null;
    }
    
    try {
      const params = {
        Bucket: userBucketName,
        Key: `user-${userId}.json`,
      };

      log(`Getting user ${userId} from S3 bucket ${userBucketName}, key: user-${userId}.json`);
      const response = await s3Client.send(new GetObjectCommand(params));
      
      if (response.Body) {
        const bodyContents = await streamToString(response.Body as Readable);
        log(`Successfully retrieved user ${userId} from S3, parsing JSON data`);
        
        try {
          log(`Raw data from S3: ${bodyContents}`);
          const userData = JSON.parse(bodyContents);
          
          // Validate user data has required fields 
          if (!userData) {
            log(`S3 returned null or undefined user data for ${userId}`);
            return null;
          }
          
          // Create a copy for logging without the password
          const userForLogging = { ...userData };
          if (userForLogging.password) {
            userForLogging.password = `<password hash hidden>`;
          }
          log(`Parsed user data from S3:`);
          log(JSON.stringify(userForLogging, null, 2));
          
          if (!userData.id || !userData.username || !userData.password) {
            log(`S3 user data for ${userId} is missing required fields`);
            log(`User data keys: ${Object.keys(userData).join(', ')}`);
          }
          
          return userData;
        } catch (parseError) {
          log(`Error parsing JSON data for user ${userId}: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
          log(`Raw data from S3 (first 100 chars): ${bodyContents.substring(0, 100)}...`);
          return null;
        }
      } else {
        log(`S3 response for user ${userId} has no body`);
        return null;
      }
    } catch (error: any) {
      // If the object doesn't exist, return null instead of throwing an error
      if (error.name === "NoSuchKey") {
        log(`User ${userId} not found in S3 (NoSuchKey)`);
        return null;
      }
      log(`Error getting user ${userId} from S3: ${error.message || String(error)}`);
      return null; // Return null instead of throwing to fall back to memory storage
    }
  }

  async getAllUsers(): Promise<any[]> {
    // Skip if S3 is not accessible
    if (!s3Accessible) {
      log(`Skipping S3 getAllUsers - S3 not accessible`);
      return [];
    }
    
    try {
      const params = {
        Bucket: userBucketName,
        Prefix: "user-",
      };

      log(`Listing all users from bucket: ${userBucketName} with prefix: user-`);
      const response = await s3Client.send(new ListObjectsV2Command(params));
      
      if (!response.Contents || response.Contents.length === 0) {
        log(`No user objects found in S3 bucket`);
        return [];
      }

      log(`Found ${response.Contents.length} user objects in S3`);
      
      // Log all the keys we found
      response.Contents.forEach(item => {
        if (item.Key) {
          log(`Found S3 object: ${item.Key}`);
        }
      });
      
      const users = await Promise.all(
        response.Contents.map(async (item) => {
          if (!item.Key) return null;
          
          try {
            const userId = parseInt(item.Key.replace("user-", "").replace(".json", ""));
            log(`Retrieving user with ID: ${userId} from S3`);
            const user = await this.getUser(userId);
            
            if (user) {
              log(`Successfully retrieved user ${userId} (${user.username}) from S3`);
              return user;
            } else {
              log(`Retrieved null for user ${userId} from S3`);
              return null;
            }
          } catch (error) {
            log(`Error parsing user ID from key ${item.Key}: ${error instanceof Error ? error.message : String(error)}`);
            return null;
          }
        })
      );
      
      const validUsers = users.filter(Boolean) as any[];
      log(`Retrieved ${validUsers.length} valid users from S3`);
      return validUsers;
    } catch (error) {
      log(`Error getting all users from S3: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async deleteUser(userId: number): Promise<void> {
    // Skip if S3 is not accessible
    if (!s3Accessible) {
      log(`Skipping S3 delete for user ${userId} - S3 not accessible`);
      return;
    }
    
    try {
      const params = {
        Bucket: userBucketName,
        Key: `user-${userId}.json`,
      };

      await s3Client.send(new DeleteObjectCommand(params));
      log(`Successfully deleted user ${userId} from S3`);
    } catch (error) {
      log(`Error deleting user ${userId} from S3: ${error instanceof Error ? error.message : String(error)}`);
      // Don't throw the error to allow the app to continue
    }
  }

  // Menu item operations
  async saveMenuItem(menuItemId: number, menuItemData: any): Promise<void> {
    // Skip if S3 is not accessible
    if (!s3Accessible) {
      log(`Skipping S3 save for menu item ${menuItemId} - S3 not accessible`);
      return;
    }
    
    try {
      const params = {
        Bucket: menuBucketName,
        Key: `menu-item-${menuItemId}.json`,
        Body: JSON.stringify(menuItemData),
        ContentType: "application/json",
      };

      await s3Client.send(new PutObjectCommand(params));
      log(`Successfully saved menu item ${menuItemId} to S3`);
    } catch (error) {
      log(`Error saving menu item ${menuItemId} to S3: ${error instanceof Error ? error.message : String(error)}`);
      // Don't throw the error to allow the app to continue
    }
  }

  async getMenuItem(menuItemId: number): Promise<any | null> {
    // Skip if S3 is not accessible
    if (!s3Accessible) {
      return null;
    }
    
    try {
      const params = {
        Bucket: menuBucketName,
        Key: `menu-item-${menuItemId}.json`,
      };

      const response = await s3Client.send(new GetObjectCommand(params));
      
      if (response.Body) {
        const bodyContents = await streamToString(response.Body as Readable);
        log(`Successfully retrieved menu item ${menuItemId} from S3`);
        return JSON.parse(bodyContents);
      }
      
      return null;
    } catch (error: any) {
      // If the object doesn't exist, return null instead of throwing an error
      if (error.name === "NoSuchKey") {
        log(`Menu item ${menuItemId} not found in S3 (NoSuchKey)`);
        return null;
      }
      log(`Error getting menu item ${menuItemId} from S3: ${error.message || String(error)}`);
      return null; // Return null instead of throwing to fall back to memory storage
    }
  }

  async getAllMenuItems(): Promise<any[]> {
    // Skip if S3 is not accessible
    if (!s3Accessible) {
      return [];
    }
    
    try {
      const params = {
        Bucket: menuBucketName,
        Prefix: "menu-item-",
      };

      const response = await s3Client.send(new ListObjectsV2Command(params));
      
      if (!response.Contents || response.Contents.length === 0) {
        return [];
      }
      
      const menuItems = await Promise.all(
        response.Contents.map(async (item) => {
          if (!item.Key) return null;
          
          const menuItemId = parseInt(item.Key.replace("menu-item-", "").replace(".json", ""));
          return this.getMenuItem(menuItemId);
        })
      );
      
      return menuItems.filter(Boolean) as any[];
    } catch (error) {
      log(`Error getting all menu items from S3: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async getMenuItemsByCategory(categoryId: number): Promise<any[]> {
    // Skip if S3 is not accessible
    if (!s3Accessible) {
      return [];
    }
    
    try {
      const allMenuItems = await this.getAllMenuItems();
      return allMenuItems.filter(item => item.categoryId === categoryId);
    } catch (error) {
      log(`Error getting menu items for category ${categoryId} from S3: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async deleteMenuItem(menuItemId: number): Promise<void> {
    // Skip if S3 is not accessible
    if (!s3Accessible) {
      log(`Skipping S3 delete for menu item ${menuItemId} - S3 not accessible`);
      return;
    }
    
    try {
      const params = {
        Bucket: menuBucketName,
        Key: `menu-item-${menuItemId}.json`,
      };

      await s3Client.send(new DeleteObjectCommand(params));
      log(`Successfully deleted menu item ${menuItemId} from S3`);
    } catch (error) {
      log(`Error deleting menu item ${menuItemId} from S3: ${error instanceof Error ? error.message : String(error)}`);
      // Don't throw the error to allow the app to continue
    }
  }
}

// Create and export a singleton instance of the S3Storage
export const s3Storage = new S3Storage();