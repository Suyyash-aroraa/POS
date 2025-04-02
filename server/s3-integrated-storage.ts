import { s3Storage } from "./s3-storage";
import { MemStorage, storage as memStorage } from "./storage";
import { IStorage } from "./storage";
import { 
  User, InsertUser, MenuItem, InsertMenuItem, ItemCategory, InsertItemCategory,
  ItemAttribute, InsertItemAttribute, Order, InsertOrder, OrderItem, InsertOrderItem 
} from "@shared/schema";
import session from "express-session";
import { log } from "./vite";
import { s3Accessible } from "./s3-client";

/**
 * Hybrid storage class that uses S3 for users and menu items
 * and in-memory storage for everything else
 */
export class S3IntegratedStorage implements IStorage {
  private memStorage: MemStorage;
  sessionStore: any; // Using any for session store type to avoid SessionStore type error

  constructor(memStorage: MemStorage) {
    this.memStorage = memStorage;
    this.sessionStore = memStorage.sessionStore;
  }

  // User operations with S3 integration
  async getUser(id: number): Promise<User | undefined> {
    // Log the current S3 access status
    log(`S3 access status for getUser(${id}): ${s3Accessible ? 'accessible' : 'not accessible'}`);
    
    if (s3Accessible) {
      try {
        // Try to get user from S3 if it's accessible
        log(`Attempting to retrieve user ${id} from S3`);
        const s3User = await s3Storage.getUser(id);
        
        if (s3User) {
          log(`User ${id} (${s3User.username}) retrieved from S3 successfully`);
          
          // Validate that the user object has all required fields
          if (!s3User.id || !s3User.username || !s3User.password) {
            log(`User ${id} from S3 is missing required fields`);
            log(`User object: ${JSON.stringify({
              id: s3User.id,
              username: s3User.username,
              has_password: !!s3User.password,
              displayName: s3User.displayName
            })}`);
          } else {
            return s3User;
          }
        } else {
          log(`User ${id} not found in S3`);
        }
        
        // If not found in S3, check in-memory storage
        const memUser = await this.memStorage.getUser(id);
        if (memUser) {
          // If found in memory but not in S3, save to S3 for future use
          log(`User ${id} (${memUser.username}) found in memory, saving to S3 for future use`);
          await s3Storage.saveUser(id, memUser);
        }
        
        return memUser;
      } catch (error) {
        log(`Error getting user ID ${id} from S3: ${error instanceof Error ? error.message : String(error)}`);
        // Fall back to in-memory storage if S3 fails
      }
    }
    
    // Always fall back to memory storage if S3 is not accessible or failed
    log(`Falling back to memory storage for user ${id}`);
    const memUser = await this.memStorage.getUser(id);
    
    if (memUser) {
      log(`User ${id} (${memUser.username}) retrieved from memory storage`);
    } else {
      log(`User ${id} not found in memory storage either`);
    }
    
    return memUser;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Log the current S3 access status
    log(`S3 access status for getUserByUsername(${username}): ${s3Accessible ? 'accessible' : 'not accessible'}`);
    
    if (s3Accessible) {
      try {
        // Need to get all users to find by username
        // In a real app, you'd maintain a username index or use a database
        log(`Attempting to get all users from S3 to find ${username}`);
        const allUsers = await s3Storage.getAllUsers();
        
        log(`Searching through ${allUsers.length} users from S3 for username: ${username}`);
        // Debug output all usernames found
        allUsers.forEach(user => {
          log(`  - Found user in S3: ${user.id} (${user.username})`);
        });
        
        const s3User = allUsers.find(user => user.username === username);
        
        if (s3User) {
          log(`User ${username} (ID: ${s3User.id}) retrieved from S3 successfully`);
          // Validate that the user object has all required fields
          if (!s3User.id || !s3User.username || !s3User.password) {
            log(`User ${username} from S3 is missing required fields`);
            log(`User object: ${JSON.stringify({
              id: s3User.id,
              username: s3User.username,
              has_password: !!s3User.password,
              displayName: s3User.displayName
            })}`);
          } else {
            return s3User;
          }
        } else {
          log(`User ${username} not found in S3 data`);
        }
      } catch (error) {
        log(`Error getting user by username ${username} from S3: ${error instanceof Error ? error.message : String(error)}`);
        // Will fall back to in-memory storage
      }
    }
    
    // Always fall back to memory storage if S3 is not accessible, user not found, or if an error occurred
    log(`Falling back to memory storage for username ${username}`);
    const memUser = await this.memStorage.getUserByUsername(username);
    
    if (memUser) {
      log(`User ${username} (ID: ${memUser.id}) retrieved from memory storage`);
    } else {
      log(`User ${username} not found in memory storage either`);
    }
    
    return memUser;
  }

  async createUser(user: InsertUser): Promise<User> {
    log(`Creating new user with username: ${user.username}`);
    
    // Create in memory first to get the ID
    const newUser = await this.memStorage.createUser(user);
    
    // Log the user creation
    log(`Created user ${newUser.id} (${newUser.username}) in memory with role: ${newUser.role}`);
    
    // Only try to save to S3 if it's accessible
    if (s3Accessible) {
      try {
        log(`Attempting to save user ${newUser.id} (${newUser.username}) to S3...`);
        // Save to S3
        await s3Storage.saveUser(newUser.id, newUser);
        
        // Verify the user was saved correctly by retrieving it
        const savedUser = await s3Storage.getUser(newUser.id);
        
        if (savedUser) {
          log(`Successfully saved and retrieved user ${newUser.id} from S3`);
          log(`S3 user data: ${JSON.stringify({
            id: savedUser.id,
            username: savedUser.username,
            has_password: !!savedUser.password,
            displayName: savedUser.displayName,
            role: savedUser.role
          })}`);
        } else {
          log(`WARNING: User ${newUser.id} was saved to S3 but could not be retrieved immediately after`);
        }
      } catch (error) {
        log(`Error saving user ${newUser.id} to S3: ${error instanceof Error ? error.message : String(error)}`);
        log("User will still be available in memory storage");
      }
    } else {
      log(`Skipping S3 save for user ${newUser.id} - S3 not accessible`);
    }
    
    return newUser;
  }

  // Menu item operations with S3 integration
  async getAllMenuItems(): Promise<MenuItem[]> {
    // Log the current S3 access status
    log(`S3 access status for getAllMenuItems(): ${s3Accessible ? 'accessible' : 'not accessible'}`);
    
    if (s3Accessible) {
      try {
        // Try to get all menu items from S3
        const s3MenuItems = await s3Storage.getAllMenuItems();
        if (s3MenuItems && s3MenuItems.length > 0) {
          log(`Retrieved ${s3MenuItems.length} menu items from S3`);
          return s3MenuItems;
        }
        
        // If not found in S3, get from in-memory storage
        const memMenuItems = await this.memStorage.getAllMenuItems();
        
        // Save all to S3 for future use
        if (memMenuItems.length > 0) {
          log(`Saving ${memMenuItems.length} menu items to S3 for future use`);
          for (const item of memMenuItems) {
            await s3Storage.saveMenuItem(item.id, item);
          }
        }
        
        return memMenuItems;
      } catch (error) {
        log(`Error getting menu items from S3: ${error instanceof Error ? error.message : String(error)}`);
        // Fall back to in-memory storage if S3 fails
      }
    }
    
    // Always fall back to memory storage if S3 is not accessible or failed
    log(`Falling back to memory storage for menu items`);
    return this.memStorage.getAllMenuItems();
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    // Log the current S3 access status
    log(`S3 access status for getMenuItem(${id}): ${s3Accessible ? 'accessible' : 'not accessible'}`);
    
    if (s3Accessible) {
      try {
        // Try to get from S3 if it's accessible
        const s3MenuItem = await s3Storage.getMenuItem(id);
        if (s3MenuItem) {
          log(`Menu item ${id} retrieved from S3`);
          return s3MenuItem;
        }
        
        // If not found in S3, check in-memory storage
        const memMenuItem = await this.memStorage.getMenuItem(id);
        if (memMenuItem) {
          // Save to S3 for future use
          log(`Menu item ${id} found in memory, saving to S3 for future use`);
          await s3Storage.saveMenuItem(id, memMenuItem);
        }
        
        return memMenuItem;
      } catch (error) {
        log(`Error getting menu item ID ${id} from S3: ${error instanceof Error ? error.message : String(error)}`);
        // Fall back to in-memory storage if S3 fails
      }
    }
    
    // Always fall back to memory storage if S3 is not accessible or failed
    log(`Falling back to memory storage for menu item ${id}`);
    return this.memStorage.getMenuItem(id);
  }

  async getMenuItemsByCategory(categoryId: number): Promise<MenuItem[]> {
    // Log the current S3 access status
    log(`S3 access status for getMenuItemsByCategory(${categoryId}): ${s3Accessible ? 'accessible' : 'not accessible'}`);
    
    if (s3Accessible) {
      try {
        // Try to get from S3 if it's accessible
        const s3MenuItems = await s3Storage.getMenuItemsByCategory(categoryId);
        if (s3MenuItems && s3MenuItems.length > 0) {
          log(`Retrieved ${s3MenuItems.length} menu items for category ${categoryId} from S3`);
          return s3MenuItems;
        }
        
        // If not found in S3, get from in-memory storage
        const memMenuItems = await this.memStorage.getMenuItemsByCategory(categoryId);
        
        // Save items to S3 for future use
        if (memMenuItems.length > 0) {
          log(`Saving ${memMenuItems.length} menu items for category ${categoryId} to S3 for future use`);
          for (const item of memMenuItems) {
            await s3Storage.saveMenuItem(item.id, item);
          }
        }
        
        return memMenuItems;
      } catch (error) {
        log(`Error getting menu items for category ${categoryId} from S3: ${error instanceof Error ? error.message : String(error)}`);
        // Fall back to in-memory storage if S3 fails
      }
    }
    
    // Always fall back to memory storage if S3 is not accessible or failed
    log(`Falling back to memory storage for menu items in category ${categoryId}`);
    return this.memStorage.getMenuItemsByCategory(categoryId);
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    // Create in memory first to get the ID
    const newItem = await this.memStorage.createMenuItem(item);
    
    // Log the item creation
    log(`Created menu item ${newItem.id} (${newItem.name}) in memory`);
    
    // Only try to save to S3 if it's accessible
    if (s3Accessible) {
      try {
        // Save to S3
        await s3Storage.saveMenuItem(newItem.id, newItem);
        log(`Saved menu item ${newItem.id} to S3`);
      } catch (error) {
        log(`Error saving menu item ${newItem.id} to S3: ${error instanceof Error ? error.message : String(error)}`);
        // If S3 fails, the item will still be in memory - just continue
      }
    } else {
      log(`Skipping S3 save for menu item ${newItem.id} - S3 not accessible`);
    }
    
    return newItem;
  }

  async updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    // Update in memory first
    const updatedItem = await this.memStorage.updateMenuItem(id, item);
    
    if (!updatedItem) {
      log(`Menu item ${id} not found for update`);
      return undefined;
    }
    
    log(`Updated menu item ${id} (${updatedItem.name}) in memory`);
    
    // Only try to save to S3 if it's accessible
    if (s3Accessible) {
      try {
        // Update in S3
        await s3Storage.saveMenuItem(id, updatedItem);
        log(`Updated menu item ${id} in S3`);
      } catch (error) {
        log(`Error updating menu item ${id} in S3: ${error instanceof Error ? error.message : String(error)}`);
        // If S3 fails, the updated item will still be in memory - just continue
      }
    } else {
      log(`Skipping S3 update for menu item ${id} - S3 not accessible`);
    }
    
    return updatedItem;
  }

  async toggleMenuItem(id: number): Promise<MenuItem | undefined> {
    // Toggle in memory first
    const toggledItem = await this.memStorage.toggleMenuItem(id);
    
    if (!toggledItem) {
      log(`Menu item ${id} not found for toggling`);
      return undefined;
    }
    
    log(`Toggled menu item ${id} (${toggledItem.name}) to ${toggledItem.isActive ? 'active' : 'inactive'} in memory`);
    
    // Only try to save to S3 if it's accessible
    if (s3Accessible) {
      try {
        // Update in S3
        await s3Storage.saveMenuItem(id, toggledItem);
        log(`Updated toggled menu item ${id} in S3`);
      } catch (error) {
        log(`Error updating toggled menu item ${id} in S3: ${error instanceof Error ? error.message : String(error)}`);
        // If S3 fails, the updated item will still be in memory - just continue
      }
    } else {
      log(`Skipping S3 update for toggled menu item ${id} - S3 not accessible`);
    }
    
    return toggledItem;
  }

  // Delegate other methods to in-memory storage
  async getAllCategories(): Promise<ItemCategory[]> {
    return this.memStorage.getAllCategories();
  }

  async createCategory(category: InsertItemCategory): Promise<ItemCategory> {
    return this.memStorage.createCategory(category);
  }

  async updateCategory(id: number, category: Partial<InsertItemCategory>): Promise<ItemCategory | undefined> {
    return this.memStorage.updateCategory(id, category);
  }

  async deleteCategory(id: number): Promise<boolean> {
    return this.memStorage.deleteCategory(id);
  }

  async getAllAttributes(): Promise<ItemAttribute[]> {
    return this.memStorage.getAllAttributes();
  }

  async createAttribute(attribute: InsertItemAttribute): Promise<ItemAttribute> {
    return this.memStorage.createAttribute(attribute);
  }

  async updateAttribute(id: number, attribute: Partial<InsertItemAttribute>): Promise<ItemAttribute | undefined> {
    return this.memStorage.updateAttribute(id, attribute);
  }

  async deleteAttribute(id: number): Promise<boolean> {
    return this.memStorage.deleteAttribute(id);
  }

  async getAllOrders(): Promise<Order[]> {
    return this.memStorage.getAllOrders();
  }

  async getOrdersByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
    return this.memStorage.getOrdersByDateRange(startDate, endDate);
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.memStorage.getOrder(id);
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    return this.memStorage.getOrderByNumber(orderNumber);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    return this.memStorage.createOrder(order);
  }

  async updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined> {
    return this.memStorage.updateOrder(id, order);
  }

  async updateOrderPayment(id: number, paymentMethod: string, bankReference?: string, cashAmount?: number, bankAmount?: number): Promise<Order | undefined> {
    return this.memStorage.updateOrderPayment(id, paymentMethod, bankReference, cashAmount, bankAmount);
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return this.memStorage.getOrderItems(orderId);
  }

  async addOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    return this.memStorage.addOrderItem(item);
  }

  async updateOrderItemStatus(id: number, status: string): Promise<OrderItem | undefined> {
    return this.memStorage.updateOrderItemStatus(id, status);
  }

  async updateOrderItemQuantity(id: number, quantity: number): Promise<OrderItem | undefined> {
    return this.memStorage.updateOrderItemQuantity(id, quantity);
  }

  async removeOrderItem(id: number): Promise<boolean> {
    return this.memStorage.removeOrderItem(id);
  }
}

// Create and export a singleton instance of the S3IntegratedStorage
export const s3IntegratedStorage = new S3IntegratedStorage(memStorage);