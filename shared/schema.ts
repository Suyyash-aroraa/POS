import { pgTable, text, serial, integer, boolean, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("staff"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  role: true,
});

// Item Categories Table
export const itemCategories = pgTable("item_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

export const insertItemCategorySchema = createInsertSchema(itemCategories).pick({
  name: true,
  displayOrder: true,
});

// Item Attributes Table (for special instructions)
export const itemAttributes = pgTable("item_attributes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

export const insertItemAttributeSchema = createInsertSchema(itemAttributes).pick({
  name: true,
  displayOrder: true,
});

// Menu Items Table
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: numeric("price").notNull(),
  categoryId: integer("category_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).pick({
  name: true,
  price: true,
  categoryId: true,
  isActive: true,
});

// Status enum for order items
export const orderItemStatusEnum = pgEnum("order_item_status", ["pending", "kot_printed", "completed"]);

// Orders Table
export const orderTypes = pgEnum("order_type", ["dine_in", "parcel"]);

export const paymentStatusEnum = pgEnum("payment_status", ["unpaid", "paid", "refunded"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "bank", "split"]);

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  orderType: orderTypes("order_type").notNull(),
  tableNumber: integer("table_number"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  subtotal: numeric("subtotal").notNull().default("0"),
  tax: numeric("tax").notNull().default("0"),
  packagingFee: numeric("packaging_fee").default("0"),
  totalAmount: numeric("total_amount").notNull().default("0"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("unpaid"),
  paymentMethod: paymentMethodEnum("payment_method"),
  bankReference: text("bank_reference"),
  cashAmount: numeric("cash_amount"),
  bankAmount: numeric("bank_amount"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  notes: text("notes"),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Order Items Table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  menuItemId: integer("menu_item_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  price: numeric("price").notNull(),
  status: orderItemStatusEnum("status").notNull().default("pending"),
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ItemCategory = typeof itemCategories.$inferSelect;
export type InsertItemCategory = z.infer<typeof insertItemCategorySchema>;

export type ItemAttribute = typeof itemAttributes.$inferSelect;
export type InsertItemAttribute = z.infer<typeof insertItemAttributeSchema>;

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

// Extended schema for frontend use
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

// Extended schema for CSV export
export const salesReportFilters = z.object({
  startDate: z.string(),
  endDate: z.string(),
  paymentMethod: z.string().optional(),
});

export type SalesReportFilters = z.infer<typeof salesReportFilters>;
