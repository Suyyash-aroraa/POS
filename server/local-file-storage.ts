import { promises as fs } from 'fs';
import path from 'path';
import { log } from './vite';
import { 
  User, InsertUser, 
  MenuItem, InsertMenuItem, 
  ItemCategory, InsertItemCategory,
  ItemAttribute, InsertItemAttribute,
  Order, InsertOrder,
  OrderItem, InsertOrderItem
} from '@shared/schema';

/**
 * Local file storage class to handle saving and retrieving data from local files
 */
export class LocalFileStorage {
  private dataDir: string = path.join('.', 'data');
  private usersDir: string;
  private menuItemsDir: string;
  
  constructor() {
    this.usersDir = path.join(this.dataDir, 'users');
    this.menuItemsDir = path.join(this.dataDir, 'menu-items');
    this.initDirectories();
  }
  
  private async initDirectories() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.usersDir, { recursive: true });
      await fs.mkdir(this.menuItemsDir, { recursive: true });
      log('Local file storage directories initialized', 'local-storage');
    } catch (error) {
      log(`Error creating directories: ${error}`, 'local-storage');
    }
  }
  
  // User operations
  async saveUser(userId: number, userData: any): Promise<void> {
    try {
      const filePath = path.join(this.usersDir, `user-${userId}.json`);
      await fs.writeFile(filePath, JSON.stringify(userData, null, 2));
      log(`User ${userId} saved to local file`, 'local-storage');
    } catch (error) {
      log(`Error saving user ${userId} to local file: ${error}`, 'local-storage');
      throw error;
    }
  }
  
  async getUser(userId: number): Promise<any | null> {
    try {
      const filePath = path.join(this.usersDir, `user-${userId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        log(`Error reading user ${userId} from local file: ${error}`, 'local-storage');
      }
      return null;
    }
  }
  
  async getAllUsers(): Promise<any[]> {
    try {
      const files = await fs.readdir(this.usersDir);
      const userFiles = files.filter(file => file.startsWith('user-') && file.endsWith('.json'));
      
      const users = await Promise.all(
        userFiles.map(async (file) => {
          const filePath = path.join(this.usersDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          return JSON.parse(data);
        })
      );
      
      return users;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        log(`Error reading users from local files: ${error}`, 'local-storage');
      }
      return [];
    }
  }
  
  async deleteUser(userId: number): Promise<void> {
    try {
      const filePath = path.join(this.usersDir, `user-${userId}.json`);
      await fs.unlink(filePath);
      log(`User ${userId} deleted from local file`, 'local-storage');
    } catch (error) {
      log(`Error deleting user ${userId} from local file: ${error}`, 'local-storage');
      throw error;
    }
  }
  
  // Menu item operations
  async saveMenuItem(menuItemId: number, menuItemData: any): Promise<void> {
    try {
      const filePath = path.join(this.menuItemsDir, `menu-item-${menuItemId}.json`);
      await fs.writeFile(filePath, JSON.stringify(menuItemData, null, 2));
      log(`Menu item ${menuItemId} saved to local file`, 'local-storage');
    } catch (error) {
      log(`Error saving menu item ${menuItemId} to local file: ${error}`, 'local-storage');
      throw error;
    }
  }
  
  async getMenuItem(menuItemId: number): Promise<any | null> {
    try {
      const filePath = path.join(this.menuItemsDir, `menu-item-${menuItemId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        log(`Error reading menu item ${menuItemId} from local file: ${error}`, 'local-storage');
      }
      return null;
    }
  }
  
  async getAllMenuItems(): Promise<any[]> {
    try {
      const files = await fs.readdir(this.menuItemsDir);
      const menuItemFiles = files.filter(file => file.startsWith('menu-item-') && file.endsWith('.json'));
      
      const menuItems = await Promise.all(
        menuItemFiles.map(async (file) => {
          const filePath = path.join(this.menuItemsDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          return JSON.parse(data);
        })
      );
      
      return menuItems;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        log(`Error reading menu items from local files: ${error}`, 'local-storage');
      }
      return [];
    }
  }
  
  async getMenuItemsByCategory(categoryId: number): Promise<any[]> {
    try {
      const allItems = await this.getAllMenuItems();
      return allItems.filter(item => item.categoryId === categoryId);
    } catch (error) {
      log(`Error getting menu items by category ${categoryId}: ${error}`, 'local-storage');
      return [];
    }
  }
  
  async deleteMenuItem(menuItemId: number): Promise<void> {
    try {
      const filePath = path.join(this.menuItemsDir, `menu-item-${menuItemId}.json`);
      await fs.unlink(filePath);
      log(`Menu item ${menuItemId} deleted from local file`, 'local-storage');
    } catch (error) {
      log(`Error deleting menu item ${menuItemId} from local file: ${error}`, 'local-storage');
      throw error;
    }
  }
  
  // Helper function to check if storage is accessible
  async checkAccess(): Promise<boolean> {
    try {
      await this.initDirectories();
      // Try a basic write/read operation to verify access
      const testFile = path.join(this.dataDir, 'access-test.txt');
      await fs.writeFile(testFile, 'Storage access test');
      await fs.readFile(testFile, 'utf-8');
      await fs.unlink(testFile);
      return true;
    } catch (error) {
      log(`Storage access check failed: ${error}`, 'local-storage');
      return false;
    }
  }
}

export const localFileStorage = new LocalFileStorage();