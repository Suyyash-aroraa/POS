import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TopNav } from "@/components/shared/top-nav";
import { CategoryTabs } from "@/components/menu/category-tabs";
import { MenuGrid } from "@/components/menu/menu-grid";
import { ItemQuantityModal } from "@/components/orders/item-quantity-modal";
import { OrderSummary } from "@/components/orders/order-summary";
import { KotConfirmationModal } from "@/components/orders/kot-confirmation-modal";
import { FreeTableModal } from "@/components/orders/free-table-modal";
import { SettleModal } from "@/components/orders/settle-modal";
import { TableGrid } from "@/components/orders/table-grid";
import { ParcelGrid } from "@/components/orders/parcel-grid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MenuItem, Order, OrderItem } from "@shared/schema";
import { Loader2 } from "lucide-react";

export default function POSPage() {
  const { toast } = useToast();
  
  // Use a mock print service until the PrintServiceProvider is fully implemented
  const printService = {
    printKOT: async () => {
      toast({ 
        title: "KOT Printed", 
        description: "Kitchen Order Ticket has been sent to the printer" 
      });
      return true;
    },
    printBill: async () => {
      toast({ 
        title: "Bill Printed", 
        description: "Bill has been sent to the printer" 
      });
      return true;
    }
  };
  
  // State for table selection and ordering
  const [tableNumber, setTableNumber] = useState<number>(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [currentOrderId, setCurrentOrderId] = useState<number | undefined>(undefined);
  
  // Modal states
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showKotModal, setShowKotModal] = useState(false);
  const [showFreeTableModal, setShowFreeTableModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  
  // Get current table order if it exists
  const { data: tableOrders, isLoading: isTableOrdersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });
  
  // Fetch order items if an order exists
  const { data: orderItems, isLoading: isOrderItemsLoading } = useQuery<OrderItem[]>({
    queryKey: [`/api/orders/${currentOrderId}/items`],
    enabled: !!currentOrderId,
  });
  
  // Get current order
  const { data: currentOrder } = useQuery<Order>({
    queryKey: [`/api/orders/${currentOrderId}`],
    enabled: !!currentOrderId,
  });
  
  // Create new order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/orders", {
        orderType: "dine_in",
        tableNumber: tableNumber,
        paymentStatus: "unpaid"
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setCurrentOrderId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create order",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Add item to order mutation
  const addItemMutation = useMutation({
    mutationFn: async ({ 
      menuItemId, 
      quantity, 
      specialInstructions 
    }: { 
      menuItemId: number, 
      quantity: number, 
      specialInstructions?: string 
    }) => {
      if (!currentOrderId) throw new Error("No active order");
      
      console.log(`Adding item for order ${currentOrderId}: menuItemId=${menuItemId}, quantity=${quantity}`);
      
      // First, get the menu item to get its price
      const menuItemRes = await fetch(`/api/menu-items/${menuItemId}`, {
        credentials: "include",
      });
      
      if (!menuItemRes.ok) {
        console.error("Failed to get menu item details:", await menuItemRes.text());
        throw new Error("Failed to get menu item details");
      }
      
      const menuItem = await menuItemRes.json();
      console.log("Retrieved menu item:", menuItem);
      
      // Prepare the data to send
      const orderItemData = {
        menuItemId,
        menuItemName: menuItem.name,
        quantity,
        price: menuItem.price,
        status: "pending",
        specialInstructions: specialInstructions || ""
      };
      
      console.log("Sending order item data:", orderItemData);
      
      try {
        // Then add the item to the order
        const res = await apiRequest("POST", `/api/orders/${currentOrderId}/items`, orderItemData);
        
        if (!res.ok) {
          console.error("Failed to add item:", await res.text());
          throw new Error(`Failed to add item: ${res.status} ${res.statusText}`);
        }
        
        const result = await res.json();
        console.log("Successfully added item:", result);
        return result;
      } catch (err) {
        console.error("Error in addItemMutation:", err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${currentOrderId}/items`] });
      toast({
        title: "Item added",
        description: "Item has been added to the order",
      });
    },
    onError: (error: Error) => {
      console.error("addItemMutation error:", error);
      toast({
        title: "Failed to add item",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Print KOT mutation
  const printKotMutation = useMutation({
    mutationFn: async (instructions: string) => {
      if (!currentOrderId) throw new Error("No active order");
      
      const res = await apiRequest("GET", `/api/kot/${currentOrderId}`);
      const data = await res.json();
      
      // Update the order note with the instructions
      if (instructions) {
        await apiRequest("PUT", `/api/orders/${currentOrderId}`, {
          notes: instructions
        });
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${currentOrderId}/items`] });
      
      // Print KOT
      printService.printKOT();
      
      toast({
        title: "KOT printed",
        description: `KOT for Table ${tableNumber} has been printed`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to print KOT",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Print bill mutation
  const printBillMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrderId) throw new Error("No active order");
      
      const res = await apiRequest("GET", `/api/bill/${currentOrderId}`);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${currentOrderId}/items`] });
      
      // Print bill
      printService.printBill();
      
      toast({
        title: "Bill printed",
        description: `Bill for Table ${tableNumber} has been printed`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to print bill",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Free table mutation
  const freeTableMutation = useMutation({
    mutationFn: async (password: string) => {
      // In a real app, we would verify the password on the server
      // For the demo, just check a hardcoded admin password
      if (password !== "admin") {
        throw new Error("Invalid password");
      }
      
      if (!currentOrderId) return;
      
      // Delete the order items first
      const itemsRes = await fetch(`/api/orders/${currentOrderId}/items`, {
        credentials: "include",
      });
      
      if (itemsRes.ok) {
        const items = await itemsRes.json();
        
        // Delete each item
        for (const item of items) {
          await apiRequest("DELETE", `/api/order-items/${item.id}`);
        }
      }
      
      // Then delete or mark the order as canceled
      // For the demo, we'll just update the order to make it clear it was freed
      await apiRequest("PUT", `/api/orders/${currentOrderId}`, {
        notes: "TABLE FREED - Order canceled",
        paymentStatus: "refunded"
      });
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setCurrentOrderId(undefined);
      
      toast({
        title: "Table freed",
        description: `Table ${tableNumber} has been freed`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to free table",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Settle payment mutation
  const settlePaymentMutation = useMutation({
    mutationFn: async ({
      paymentMethod,
      bankReference,
      cashAmount,
      bankAmount
    }: {
      paymentMethod: string,
      bankReference?: string,
      cashAmount?: number,
      bankAmount?: number
    }) => {
      if (!currentOrderId) throw new Error("No active order");
      
      const res = await apiRequest("POST", `/api/orders/${currentOrderId}/payment`, {
        paymentMethod,
        bankReference,
        cashAmount,
        bankAmount
      });
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${currentOrderId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      
      toast({
        title: "Payment complete",
        description: `Payment for Table ${tableNumber} has been processed`,
      });
      
      // After settling, automatically print the bill with payment details
      printBillMutation.mutate();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to process payment",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Effect to find existing order for the selected table
  useEffect(() => {
    if (tableOrders) {
      const existingOrder = tableOrders.find(order => 
        order.orderType === "dine_in" && 
        order.tableNumber === tableNumber &&
        order.paymentStatus === "unpaid"
      );
      
      if (existingOrder) {
        setCurrentOrderId(existingOrder.id);
      } else {
        setCurrentOrderId(undefined);
      }
    }
  }, [tableOrders, tableNumber]);
  
  // Handlers
  const handleTableChange = (value: string) => {
    setTableNumber(parseInt(value));
  };
  
  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
  };
  
  const handleSelectItem = (item: MenuItem) => {
    setSelectedItem(item);
    setShowItemModal(true);
  };
  
  const handleAddToOrder = (itemId: number, quantity: number, specialInstructions: string) => {
    if (!currentOrderId) {
      // Create new order first, then add item
      createOrderMutation.mutate();
      
      // We need to wait for the order to be created before adding the item
      // This is a bit of a hack, but it works for demo purposes
      setTimeout(() => {
        if (currentOrderId) {
          addItemMutation.mutate({ menuItemId: itemId, quantity, specialInstructions });
        }
      }, 500);
    } else {
      // Add item to existing order
      addItemMutation.mutate({ menuItemId: itemId, quantity, specialInstructions });
    }
    
    setShowItemModal(false);
  };
  
  const handlePrintKOT = () => {
    if (!currentOrderId) {
      toast({
        title: "No active order",
        description: "Create an order by adding items first",
        variant: "destructive",
      });
      return;
    }
    
    // Check if there are pending items
    const pendingItems = orderItems?.filter(item => item.status === "pending") || [];
    
    if (pendingItems.length === 0) {
      toast({
        title: "No pending items",
        description: "There are no pending items to print in the KOT",
        variant: "destructive",
      });
      return;
    }
    
    setShowKotModal(true);
  };
  
  const handleConfirmKOT = (instructions: string) => {
    printKotMutation.mutate(instructions);
    setShowKotModal(false);
  };
  
  const handlePrintBill = () => {
    if (!currentOrderId) {
      toast({
        title: "No active order",
        description: "Create an order by adding items first",
        variant: "destructive",
      });
      return;
    }
    
    // Check if all items have KOT printed
    const allKotPrinted = orderItems?.every(item => 
      item.status === "kot_printed" || item.status === "completed"
    );
    
    if (!allKotPrinted) {
      toast({
        title: "Pending items",
        description: "Please print KOT for all pending items before printing the bill",
        variant: "destructive",
      });
      return;
    }
    
    printBillMutation.mutate();
  };
  
  const handleFreeTable = () => {
    if (!currentOrderId) {
      toast({
        title: "No active order",
        description: "There is no order to free for this table",
        variant: "destructive",
      });
      return;
    }
    
    setShowFreeTableModal(true);
  };
  
  const handleConfirmFreeTable = (password: string) => {
    freeTableMutation.mutate(password);
    setShowFreeTableModal(false);
  };
  
  const handleSettle = () => {
    if (!currentOrderId) {
      toast({
        title: "No active order",
        description: "Create an order by adding items first",
        variant: "destructive",
      });
      return;
    }
    
    setShowSettleModal(true);
  };
  
  const handleConfirmSettle = (
    paymentMethod: string,
    bankReference?: string,
    cashAmount?: number,
    bankAmount?: number
  ) => {
    settlePaymentMutation.mutate({
      paymentMethod,
      bankReference,
      cashAmount,
      bankAmount
    });
    setShowSettleModal(false);
  };
  
  const handleShiftTable = () => {
    toast({
      title: "Feature not implemented",
      description: "Table shifting functionality is not implemented in this demo",
    });
  };
  
  // Derived data
  const pendingItems = orderItems?.filter(item => item.status === "pending") || [];
  
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      
      <div className="flex-1 bg-gray-100 flex flex-col overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Section: Menu Categories and Items */}
          <div className="w-3/5 flex flex-col h-full overflow-hidden">
            {/* Table Selection */}
            <div className="bg-white p-4 shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Label className="text-lg font-medium text-gray-800 mr-2">Table:</Label>
                  <Select value={tableNumber.toString()} onValueChange={handleTableChange}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Select table" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          Table {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  {currentOrder && (
                    <span className="text-sm text-gray-600">Order #{currentOrder.orderNumber}</span>
                  )}
                </div>
              </div>
            </div>
          
            {/* Category Tabs */}
            <CategoryTabs 
              onSelectCategory={handleCategorySelect}
              selectedCategoryId={selectedCategoryId}
            />
            
            {/* Menu Items Grid */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
              {selectedCategoryId ? (
                <MenuGrid 
                  categoryId={selectedCategoryId}
                  onSelectItem={handleSelectItem}
                />
              ) : (
                <div className="flex justify-center items-center h-full text-gray-500">
                  Select a category to view items
                </div>
              )}
            </div>
          </div>
          
          {/* Right Section: Order Details and Actions */}
          <div className="w-2/5 flex flex-col h-full bg-white shadow-lg overflow-hidden">
            <OrderSummary
              orderId={currentOrderId}
              orderType="dine_in"
              tableNumber={tableNumber}
              onPrintKOT={handlePrintKOT}
              onPrintBill={handlePrintBill}
              onFreeTable={handleFreeTable}
              onShiftTable={handleShiftTable}
              onSettle={handleSettle}
            />
          </div>
        </div>
        
        {/* Bottom Section: Tables and Parcels Grid */}
        <div className="px-4 py-2 overflow-y-auto max-h-72">
          <TableGrid 
            onSelectTable={handleTableChange} 
            selectedTable={tableNumber} 
          />
          <ParcelGrid />
        </div>
      </div>
      
      {/* Modals */}
      <ItemQuantityModal
        item={selectedItem}
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        onAddToOrder={handleAddToOrder}
      />
      
      <KotConfirmationModal
        isOpen={showKotModal}
        onClose={() => setShowKotModal(false)}
        onConfirm={handleConfirmKOT}
        pendingItems={pendingItems}
      />
      
      <FreeTableModal
        tableNumber={tableNumber}
        isOpen={showFreeTableModal}
        onClose={() => setShowFreeTableModal(false)}
        onConfirm={handleConfirmFreeTable}
      />
      
      <SettleModal
        order={currentOrder || null}
        isOpen={showSettleModal}
        onClose={() => setShowSettleModal(false)}
        onConfirm={handleConfirmSettle}
      />
    </div>
  );
}