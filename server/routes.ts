import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { localIntegratedStorage as storage } from "./local-integrated-storage";
import { setupAuth } from "./auth";
import { ZodError } from "zod";
import { insertMenuItemSchema, insertItemCategorySchema, insertItemAttributeSchema, salesReportFilters } from "@shared/schema";
import { format } from "date-fns";
import { localFileStorage } from "./local-file-storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Helper function to handle zod validation errors
  const handleZodError = (error: unknown, res: Response) => {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  };

  // Category Routes
  app.get("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const categoryData = insertItemCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  app.put("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const categoryData = insertItemCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, categoryData);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  app.delete("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCategory(id);
      
      if (!success) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Attribute Routes
  app.get("/api/attributes", isAuthenticated, async (req, res) => {
    try {
      const attributes = await storage.getAllAttributes();
      res.json(attributes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch attributes" });
    }
  });

  app.post("/api/attributes", isAuthenticated, async (req, res) => {
    try {
      const attributeData = insertItemAttributeSchema.parse(req.body);
      const attribute = await storage.createAttribute(attributeData);
      res.status(201).json(attribute);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  app.put("/api/attributes/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const attributeData = insertItemAttributeSchema.partial().parse(req.body);
      const attribute = await storage.updateAttribute(id, attributeData);
      
      if (!attribute) {
        return res.status(404).json({ message: "Attribute not found" });
      }
      
      res.json(attribute);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  app.delete("/api/attributes/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAttribute(id);
      
      if (!success) {
        return res.status(404).json({ message: "Attribute not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to delete attribute" });
    }
  });

  // Menu Item Routes
  app.get("/api/menu-items", isAuthenticated, async (req, res) => {
    try {
      const menuItems = await storage.getAllMenuItems();
      res.json(menuItems);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  app.get("/api/menu-items/category/:categoryId", isAuthenticated, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const menuItems = await storage.getMenuItemsByCategory(categoryId);
      res.json(menuItems);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  app.post("/api/menu-items", isAuthenticated, async (req, res) => {
    try {
      const menuItemData = insertMenuItemSchema.parse(req.body);
      const menuItem = await storage.createMenuItem(menuItemData);
      res.status(201).json(menuItem);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  app.put("/api/menu-items/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const menuItemData = insertMenuItemSchema.partial().parse(req.body);
      const menuItem = await storage.updateMenuItem(id, menuItemData);
      
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      res.json(menuItem);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  app.post("/api/menu-items/:id/toggle", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const menuItem = await storage.toggleMenuItem(id);
      
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      res.json(menuItem);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to toggle menu item" });
    }
  });

  // Order Routes
  app.get("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders/report", isAuthenticated, async (req, res) => {
    try {
      const filters = salesReportFilters.parse(req.body);
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // Set to end of day
      
      const orders = await storage.getOrdersByDateRange(startDate, endDate);
      
      // Filter by payment method if specified
      let filteredOrders = orders;
      if (filters.paymentMethod && filters.paymentMethod !== 'all') {
        filteredOrders = orders.filter(order => order.paymentMethod === filters.paymentMethod);
      }
      
      res.json(filteredOrders);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  app.get("/api/orders/export", isAuthenticated, async (req, res) => {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      endDate.setHours(23, 59, 59, 999); // Set to end of day
      
      const paymentMethod = req.query.paymentMethod as string;
      
      const orders = await storage.getOrdersByDateRange(startDate, endDate);
      
      // Filter by payment method if specified
      let filteredOrders = orders;
      if (paymentMethod && paymentMethod !== 'all') {
        filteredOrders = orders.filter(order => order.paymentMethod === paymentMethod);
      }
      
      // Generate CSV
      const headers = [
        'Order Number', 'Type', 'Date', 'Table/Customer', 
        'Subtotal', 'Tax', 'Packaging', 'Total', 
        'Payment Method', 'Payment Status', 'Bank Reference'
      ];
      
      const rows = filteredOrders.map(order => [
        order.orderNumber,
        order.orderType,
        format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        order.orderType === 'dine_in' ? `Table ${order.tableNumber}` : order.customerName || 'Unknown',
        order.subtotal,
        order.tax,
        order.packagingFee || '0',
        order.totalAmount,
        order.paymentMethod || 'None',
        order.paymentStatus,
        order.bankReference || 'N/A',
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="sales-report-${format(new Date(), 'yyyy-MM-dd')}.csv"`);
      
      res.send(csvContent);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to export orders" });
    }
  });

  app.get("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      // Generate a unique order number
      const allOrders = await storage.getAllOrders();
      const orderNumber = String(1000 + allOrders.length + 1);
      
      const orderData = { ...req.body, orderNumber };
      const order = await storage.createOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.put("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.updateOrder(id, req.body);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  app.post("/api/orders/:id/payment", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { paymentMethod, bankReference, cashAmount, bankAmount } = req.body;
      
      const order = await storage.updateOrderPayment(
        id,
        paymentMethod,
        bankReference,
        cashAmount,
        bankAmount
      );
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update order payment" });
    }
  });

  // Order Item Routes
  app.get("/api/orders/:orderId/items", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const items = await storage.getOrderItems(orderId);
      res.json(items);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch order items" });
    }
  });

  app.post("/api/orders/:orderId/items", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const itemData = { ...req.body, orderId };
      
      // Log the item data we're trying to add
      console.log('Adding order item:', JSON.stringify(itemData));
      
      const item = await storage.addOrderItem(itemData);
      
      // Log the result of adding the item
      console.log('Order item added successfully:', JSON.stringify(item));
      
      res.status(201).json(item);
    } catch (error) {
      console.error('Error adding order item:', error);
      res.status(500).json({ message: "Failed to add order item" });
    }
  });

  app.put("/api/order-items/:id/status", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const item = await storage.updateOrderItemStatus(id, status);
      
      if (!item) {
        return res.status(404).json({ message: "Order item not found" });
      }
      
      res.json(item);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update order item status" });
    }
  });

  app.put("/api/order-items/:id/quantity", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { quantity } = req.body;
      const item = await storage.updateOrderItemQuantity(id, quantity);
      
      if (!item) {
        return res.status(404).json({ message: "Order item not found" });
      }
      
      res.json(item);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update order item quantity" });
    }
  });

  app.delete("/api/order-items/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.removeOrderItem(id);
      
      if (!success) {
        return res.status(404).json({ message: "Order item not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to remove order item" });
    }
  });

  // KOT and Bill Printing - handled via client-side printing
  app.get("/api/kot/:orderId", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const items = await storage.getOrderItems(orderId);
      const pendingItems = items.filter(item => item.status === "pending");
      
      // Update status of all pending items
      await Promise.all(pendingItems.map(item => 
        storage.updateOrderItemStatus(item.id, "kot_printed")
      ));
      
      const updatedItems = await storage.getOrderItems(orderId);
      
      res.json({
        order,
        kotItems: pendingItems, // Original pending items for KOT
        allItems: updatedItems // All updated items
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to generate KOT" });
    }
  });

  app.get("/api/bill/:orderId", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const items = await storage.getOrderItems(orderId);
      
      // Check if all items are KOT printed
      const pendingItems = items.filter(item => item.status === "pending");
      if (pendingItems.length > 0) {
        return res.status(400).json({ 
          message: "Cannot print bill with pending items. Please print KOT first."
        });
      }
      
      // Update all items to completed
      await Promise.all(items.map(item => 
        storage.updateOrderItemStatus(item.id, "completed")
      ));
      
      const updatedItems = await storage.getOrderItems(orderId);
      
      res.json({
        order,
        items: updatedItems
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to generate bill" });
    }
  });
  
  // Storage Status route - useful for debugging
  app.get("/api/storage-status", isAuthenticated, async (req, res) => {
    try {
      // Check current storage access status
      const isAccessible = await localFileStorage.checkAccess();
      
      res.json({
        status: isAccessible ? "connected" : "disconnected",
        storageType: "local-file",
        paths: {
          users: "./data/users",
          menuItems: "./data/menu-items"
        }
      });
    } catch (error) {
      console.error("Error checking storage status:", error);
      res.status(500).json({ 
        message: "Failed to check storage status",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint to manage local data storage
  app.post("/api/manage-local-storage", isAuthenticated, async (req, res) => {
    try {
      const { action } = req.body;
      
      if (!action) {
        return res.status(400).json({ 
          message: "Missing required parameter. Please provide an action." 
        });
      }
      
      if (action === 'verify') {
        // Check storage accessibility
        const isAccessible = await localFileStorage.checkAccess();
        
        res.json({
          message: `Local storage ${isAccessible ? 'is' : 'is not'} accessible`,
          status: isAccessible ? "connected" : "disconnected",
          paths: {
            users: "./data/users",
            menuItems: "./data/menu-items"
          }
        });
      } else {
        res.status(400).json({
          message: "Unknown action. Supported actions: verify"
        });
      }
    } catch (error) {
      console.error("Error managing local storage:", error);
      res.status(500).json({ 
        message: "Failed to manage local storage",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
