import { users, User, InsertUser, menuItems, MenuItem, InsertMenuItem, itemCategories, ItemCategory, InsertItemCategory, orders, Order, InsertOrder, orderItems, OrderItem, InsertOrderItem, itemAttributes, ItemAttribute, InsertItemAttribute } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

// Session store
const MemoryStore = createMemoryStore(session);

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Category operations
  getAllCategories(): Promise<ItemCategory[]>;
  createCategory(category: InsertItemCategory): Promise<ItemCategory>;
  updateCategory(id: number, category: Partial<InsertItemCategory>): Promise<ItemCategory | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // Attribute operations
  getAllAttributes(): Promise<ItemAttribute[]>;
  createAttribute(attribute: InsertItemAttribute): Promise<ItemAttribute>;
  updateAttribute(id: number, attribute: Partial<InsertItemAttribute>): Promise<ItemAttribute | undefined>;
  deleteAttribute(id: number): Promise<boolean>;

  // Menu item operations
  getAllMenuItems(): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  getMenuItemsByCategory(categoryId: number): Promise<MenuItem[]>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  toggleMenuItem(id: number): Promise<MenuItem | undefined>;

  // Order operations
  getAllOrders(): Promise<Order[]>;
  getOrdersByDateRange(startDate: Date, endDate: Date): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined>;
  updateOrderPayment(id: number, paymentMethod: string, bankReference?: string, cashAmount?: number, bankAmount?: number): Promise<Order | undefined>;

  // Order item operations
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  addOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  updateOrderItemStatus(id: number, status: string): Promise<OrderItem | undefined>;
  updateOrderItemQuantity(id: number, quantity: number): Promise<OrderItem | undefined>;
  removeOrderItem(id: number): Promise<boolean>;

  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, ItemCategory>;
  private attributes: Map<number, ItemAttribute>;
  private menuItems: Map<number, MenuItem>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem>;
  
  private currentUserId: number;
  private currentCategoryId: number;
  private currentAttributeId: number;
  private currentMenuItemId: number;
  private currentOrderId: number;
  private currentOrderItemId: number;
  
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.attributes = new Map();
    this.menuItems = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    
    this.currentUserId = 1;
    this.currentCategoryId = 1;
    this.currentAttributeId = 1;
    this.currentMenuItemId = 1;
    this.currentOrderId = 1;
    this.currentOrderItemId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
    
    // Initialize with admin user
    // For testing, instead of pre-setting a hash, we'll register this user with the register endpoint
    // This approach ensures the password hashing is consistent with the application logic
    
    // Initialize with default categories
    const categories = [
      "Veg Starters", "Non Veg Starters", "Veg Main Course", 
      "Non Veg Main Course", "Rice & Breads", "Desserts", "Beverages"
    ];
    
    categories.forEach((name, index) => {
      this.createCategory({ name, displayOrder: index });
    });
    
    // Initialize with default attributes
    const attributes = [
      "Extra Spicy", "Medium Spicy", "Less Spicy", "No Spice",
      "No Onion", "No Garlic", "Extra Cheese", "Well Done"
    ];
    
    attributes.forEach((name, index) => {
      this.createAttribute({ name, displayOrder: index });
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Category operations
  async getAllCategories(): Promise<ItemCategory[]> {
    return Array.from(this.categories.values())
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async createCategory(category: InsertItemCategory): Promise<ItemCategory> {
    const id = this.currentCategoryId++;
    const newCategory: ItemCategory = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertItemCategory>): Promise<ItemCategory | undefined> {
    const existingCategory = this.categories.get(id);
    if (!existingCategory) return undefined;
    
    const updatedCategory = { ...existingCategory, ...category };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    return this.categories.delete(id);
  }

  // Attribute operations
  async getAllAttributes(): Promise<ItemAttribute[]> {
    return Array.from(this.attributes.values())
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async createAttribute(attribute: InsertItemAttribute): Promise<ItemAttribute> {
    const id = this.currentAttributeId++;
    const newAttribute: ItemAttribute = { ...attribute, id };
    this.attributes.set(id, newAttribute);
    return newAttribute;
  }

  async updateAttribute(id: number, attribute: Partial<InsertItemAttribute>): Promise<ItemAttribute | undefined> {
    const existingAttribute = this.attributes.get(id);
    if (!existingAttribute) return undefined;
    
    const updatedAttribute = { ...existingAttribute, ...attribute };
    this.attributes.set(id, updatedAttribute);
    return updatedAttribute;
  }

  async deleteAttribute(id: number): Promise<boolean> {
    return this.attributes.delete(id);
  }

  // Menu item operations
  async getAllMenuItems(): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values());
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    return this.menuItems.get(id);
  }

  async getMenuItemsByCategory(categoryId: number): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values())
      .filter(item => item.categoryId === categoryId && item.isActive);
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const id = this.currentMenuItemId++;
    const newItem: MenuItem = { ...item, id };
    this.menuItems.set(id, newItem);
    return newItem;
  }

  async updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const existingItem = this.menuItems.get(id);
    if (!existingItem) return undefined;
    
    const updatedItem = { ...existingItem, ...item };
    this.menuItems.set(id, updatedItem);
    return updatedItem;
  }

  async toggleMenuItem(id: number): Promise<MenuItem | undefined> {
    const existingItem = this.menuItems.get(id);
    if (!existingItem) return undefined;
    
    const updatedItem = { ...existingItem, isActive: !existingItem.isActive };
    this.menuItems.set(id, updatedItem);
    return updatedItem;
  }

  // Order operations
  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getOrdersByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(
      (order) => order.orderNumber === orderNumber,
    );
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.currentOrderId++;
    const newOrder: Order = { 
      ...order, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const existingOrder = this.orders.get(id);
    if (!existingOrder) return undefined;
    
    const updatedOrder = { 
      ...existingOrder, 
      ...order,
      updatedAt: new Date()
    };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async updateOrderPayment(
    id: number, 
    paymentMethod: string, 
    bankReference?: string, 
    cashAmount?: number, 
    bankAmount?: number
  ): Promise<Order | undefined> {
    const existingOrder = this.orders.get(id);
    if (!existingOrder) return undefined;
    
    const updatedOrder = { 
      ...existingOrder, 
      paymentStatus: "paid",
      paymentMethod,
      bankReference: bankReference || null,
      cashAmount: cashAmount || null,
      bankAmount: bankAmount || null,
      updatedAt: new Date()
    };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  // Order item operations
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values())
      .filter(item => item.orderId === orderId);
  }

  async addOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    try {
      console.log('Memory storage - Adding order item:', JSON.stringify(item));
      
      const id = this.currentOrderItemId++;
      const newItem: OrderItem = { 
        ...item, 
        id,
        createdAt: new Date()
      };
      
      // Debug: Make sure all required fields exist in the item
      if (!item.orderId) console.error('Missing orderId in order item');
      if (!item.menuItemId) console.error('Missing menuItemId in order item');
      if (!item.price) console.error('Missing price in order item');
      
      console.log('Memory storage - Created new item with ID:', id);
      
      this.orderItems.set(id, newItem);
      
      // Update order total
      await this.recalculateOrderTotal(item.orderId);
      
      console.log('Memory storage - Order total recalculated');
      console.log('Memory storage - Returning item:', JSON.stringify(newItem));
      
      return newItem;
    } catch (error) {
      console.error('Error in memory storage addOrderItem:', error);
      throw error;
    }
  }

  async updateOrderItemStatus(id: number, status: string): Promise<OrderItem | undefined> {
    const existingItem = this.orderItems.get(id);
    if (!existingItem) return undefined;
    
    const updatedItem = { ...existingItem, status };
    this.orderItems.set(id, updatedItem);
    return updatedItem;
  }

  async updateOrderItemQuantity(id: number, quantity: number): Promise<OrderItem | undefined> {
    const existingItem = this.orderItems.get(id);
    if (!existingItem) return undefined;
    
    const updatedItem = { ...existingItem, quantity };
    this.orderItems.set(id, updatedItem);
    
    // Update order total
    await this.recalculateOrderTotal(existingItem.orderId);
    
    return updatedItem;
  }

  async removeOrderItem(id: number): Promise<boolean> {
    const item = this.orderItems.get(id);
    if (!item) return false;
    
    const result = this.orderItems.delete(id);
    
    // Update order total
    if (result) {
      await this.recalculateOrderTotal(item.orderId);
    }
    
    return result;
  }

  // Helper method to recalculate order total
  private async recalculateOrderTotal(orderId: number): Promise<void> {
    const order = await this.getOrder(orderId);
    if (!order) return;
    
    const items = await this.getOrderItems(orderId);
    const subtotal = items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    const tax = subtotal * 0.05; // 5% tax
    const totalAmount = subtotal + tax + Number(order.packagingFee || 0);
    
    await this.updateOrder(orderId, {
      subtotal: subtotal.toString(),
      tax: tax.toString(),
      totalAmount: totalAmount.toString()
    });
  }
}

export const storage = new MemStorage();
