import { 
  User, InsertUser, 
  MenuItem, InsertMenuItem, 
  ItemCategory, InsertItemCategory,
  ItemAttribute, InsertItemAttribute,
  Order, InsertOrder,
  OrderItem, InsertOrderItem
} from '@shared/schema';
import { MemStorage, storage as memStorage } from './storage';
import { localFileStorage } from './local-file-storage';
import { log } from './vite';
import session from 'express-session';

/**
 * Hybrid storage class that uses local file storage for users and menu items
 * and in-memory storage for everything else
 */
export class LocalIntegratedStorage implements IStorage {
  private memStorage: MemStorage;
  sessionStore: any; // Using any for session store to avoid type issues

  constructor(memStorage: MemStorage) {
    this.memStorage = memStorage;
    this.sessionStore = memStorage.sessionStore;
    this.initLocalStorage();
  }

  private async initLocalStorage() {
    try {
      const accessible = await localFileStorage.checkAccess();
      log(`Local file storage ${accessible ? 'is' : 'is not'} accessible`, 'local-storage');
    } catch (error) {
      log(`Error initializing local storage: ${error}`, 'local-storage');
    }
  }

  // USER OPERATIONS
  async getUser(id: number): Promise<User | undefined> {
    try {
      // Try to get from local storage first
      const userData = await localFileStorage.getUser(id);
      if (userData) {
        return userData as User;
      }

      // Fall back to memory storage
      log(`User ${id} not found in local storage, falling back to memory`, 'local-storage');
      return this.memStorage.getUser(id);
    } catch (error) {
      log(`Error in getUser(${id}): ${error}`, 'local-storage');
      return this.memStorage.getUser(id);
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      // Get all users from local storage
      const users = await localFileStorage.getAllUsers();
      const user = users.find(u => u.username === username);

      if (user) {
        return user as User;
      }

      // Fall back to memory storage
      log(`User ${username} not found in local storage, falling back to memory`, 'local-storage');
      return this.memStorage.getUserByUsername(username);
    } catch (error) {
      log(`Error in getUserByUsername(${username}): ${error}`, 'local-storage');
      return this.memStorage.getUserByUsername(username);
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Create user in memory first to get an ID
      const user = await this.memStorage.createUser(insertUser);

      // Save to local file storage
      await localFileStorage.saveUser(user.id, user);

      return user;
    } catch (error) {
      log(`Error in createUser: ${error}`, 'local-storage');
      throw error;
    }
  }

  // MENU ITEMS OPERATIONS
  async getAllMenuItems(): Promise<MenuItem[]> {
    try {
      // Try to get from local storage first
      const menuItems = await localFileStorage.getAllMenuItems();
      if (menuItems && menuItems.length > 0) {
        return menuItems as MenuItem[];
      }

      // Fall back to memory storage
      log('No menu items found in local storage, falling back to memory', 'local-storage');
      return this.memStorage.getAllMenuItems();
    } catch (error) {
      log(`Error in getAllMenuItems: ${error}`, 'local-storage');
      return this.memStorage.getAllMenuItems();
    }
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    try {
      // Try to get from local storage first
      const menuItem = await localFileStorage.getMenuItem(id);
      if (menuItem) {
        return menuItem as MenuItem;
      }

      // Fall back to memory storage
      log(`Menu item ${id} not found in local storage, falling back to memory`, 'local-storage');
      return this.memStorage.getMenuItem(id);
    } catch (error) {
      log(`Error in getMenuItem(${id}): ${error}`, 'local-storage');
      return this.memStorage.getMenuItem(id);
    }
  }

  async getMenuItemsByCategory(categoryId: number): Promise<MenuItem[]> {
    try {
      // Try to get from local storage first
      const menuItems = await localFileStorage.getMenuItemsByCategory(categoryId);
      if (menuItems && menuItems.length > 0) {
        return menuItems as MenuItem[];
      }

      // Fall back to memory storage
      log(`No menu items found for category ${categoryId} in local storage, falling back to memory`, 'local-storage');
      return this.memStorage.getMenuItemsByCategory(categoryId);
    } catch (error) {
      log(`Error in getMenuItemsByCategory(${categoryId}): ${error}`, 'local-storage');
      return this.memStorage.getMenuItemsByCategory(categoryId);
    }
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    try {
      // First create in memory to get an ID
      const newItem = await this.memStorage.createMenuItem(item);

      // Then store in local file
      await localFileStorage.saveMenuItem(newItem.id, newItem);
      log(`Menu item ${newItem.id} saved to local storage`, 'local-storage');

      return newItem;
    } catch (error) {
      log(`Error in createMenuItem: ${error}`, 'local-storage');
      throw error;
    }
  }

  async updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    try {
      // First update in memory
      const updatedItem = await this.memStorage.updateMenuItem(id, item);

      if (updatedItem) {
        // Then update in local file
        await localFileStorage.saveMenuItem(id, updatedItem);
        log(`Menu item ${id} updated in local storage`, 'local-storage');
      }

      return updatedItem;
    } catch (error) {
      log(`Error in updateMenuItem(${id}): ${error}`, 'local-storage');
      return this.memStorage.updateMenuItem(id, item);
    }
  }

  async toggleMenuItem(id: number): Promise<MenuItem | undefined> {
    try {
      // First toggle in memory
      const toggled = await this.memStorage.toggleMenuItem(id);

      if (toggled) {
        // Then update in local file
        await localFileStorage.saveMenuItem(id, toggled);
        log(`Menu item ${id} toggled in local storage`, 'local-storage');
      }

      return toggled;
    } catch (error) {
      log(`Error in toggleMenuItem(${id}): ${error}`, 'local-storage');
      return this.memStorage.toggleMenuItem(id);
    }
  }

  // For all other operations, delegate to memory storage
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

  async updateOrderPayment(
    id: number, 
    paymentMethod: string, 
    bankReference?: string, 
    cashAmount?: number, 
    bankAmount?: number
  ): Promise<Order | undefined> {
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

// Import IStorage here to avoid circular dependency
import { IStorage } from './storage';

// Create and export an instance
export const localIntegratedStorage = new LocalIntegratedStorage(memStorage);