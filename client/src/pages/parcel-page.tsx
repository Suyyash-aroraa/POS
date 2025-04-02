import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TopNav } from "@/components/shared/top-nav";
import { CategoryTabs } from "@/components/menu/category-tabs";
import { MenuGrid } from "@/components/menu/menu-grid";
import { ItemQuantityModal } from "@/components/orders/item-quantity-modal";
import { OrderSummary } from "@/components/orders/order-summary";
import { KotConfirmationModal } from "@/components/orders/kot-confirmation-modal";
import { SettleModal } from "@/components/orders/settle-modal";
import { TableGrid } from "@/components/orders/table-grid";
import { ParcelGrid } from "@/components/orders/parcel-grid";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
// import { usePrintService } from "@/lib/print-service";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MenuItem, Order, OrderItem } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function ParcelPage() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
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
  
  // State for parcel information
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [currentParcelId, setCurrentParcelId] = useState<number | undefined>(undefined);
  
  // Modal states
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showKotModal, setShowKotModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  
  // Get current parcel order if it exists
  const { data: parcelOrders, isLoading: isParcelOrdersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });
  
  // Fetch order items if an order exists
  const { data: orderItems, isLoading: isOrderItemsLoading } = useQuery<OrderItem[]>({
    queryKey: [`/api/orders/${currentParcelId}/items`],
    enabled: !!currentParcelId,
  });
  
  // Get current order
  const { data: currentOrder } = useQuery<Order>({
    queryKey: [`/api/orders/${currentParcelId}`],
    enabled: !!currentParcelId,
  });
  
  // Create new parcel order mutation
  const createParcelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/orders", {
        orderType: "parcel",
        customerName: customerName || "Customer",
        customerPhone: phoneNumber || "",
        paymentStatus: "unpaid",
        packagingFee: "20.00" // Default packaging fee
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setCurrentParcelId(data.id);
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
      if (!currentParcelId) throw new Error("No active order");
      
      // First, get the menu item to get its price
      const menuItemRes = await fetch(`/api/menu-items/${menuItemId}`, {
        credentials: "include",
      });
      
      if (!menuItemRes.ok) {
        throw new Error("Failed to get menu item details");
      }
      
      const menuItem = await menuItemRes.json();
      
      // Then add the item to the order
      const res = await apiRequest("POST", `/api/orders/${currentParcelId}/items`, {
        menuItemId,
        menuItemName: menuItem.name,
        quantity,
        price: menuItem.price,
        status: "pending",
        specialInstructions: specialInstructions || ""
      });
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${currentParcelId}/items`] });
      toast({
        title: "Item added",
        description: "Item has been added to the order",
      });
    },
    onError: (error: Error) => {
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
      if (!currentParcelId) throw new Error("No active order");
      
      const res = await apiRequest("GET", `/api/kot/${currentParcelId}`);
      const data = await res.json();
      
      // Update the order note with the instructions
      if (instructions) {
        await apiRequest("PUT", `/api/orders/${currentParcelId}`, {
          notes: instructions
        });
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${currentParcelId}/items`] });
      
      // Print KOT
      const customerInfo = data.order.customerName || "Customer";
      
      printService.printKOT();
      
      toast({
        title: "KOT printed",
        description: `KOT for Parcel #${data.order.orderNumber} has been printed`,
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
      if (!currentParcelId) throw new Error("No active order");
      
      const res = await apiRequest("GET", `/api/bill/${currentParcelId}`);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${currentParcelId}/items`] });
      
      // Print bill
      const customerInfo = data.order.customerName || "Customer";
      
      printService.printBill();
      
      toast({
        title: "Bill printed",
        description: `Bill for Parcel #${data.order.orderNumber} has been printed`,
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
      if (!currentParcelId) throw new Error("No active order");
      
      const res = await apiRequest("POST", `/api/orders/${currentParcelId}/payment`, {
        paymentMethod,
        bankReference,
        cashAmount,
        bankAmount
      });
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${currentParcelId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      
      toast({
        title: "Payment complete",
        description: "Payment for parcel order has been processed",
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
  
  // Effect to find existing active parcel order
  useEffect(() => {
    if (parcelOrders) {
      // Find the most recent unpaid parcel order
      const existingOrder = parcelOrders.find(order => 
        order.orderType === "parcel" && 
        order.paymentStatus === "unpaid"
      );
      
      if (existingOrder) {
        setCurrentParcelId(existingOrder.id);
        setCustomerName(existingOrder.customerName || "");
        setPhoneNumber(existingOrder.customerPhone || "");
      } else {
        setCurrentParcelId(undefined);
      }
    }
  }, [parcelOrders]);
  
  // Update customer information when it changes
  useEffect(() => {
    if (currentParcelId && (customerName || phoneNumber)) {
      const updateCustomerInfo = async () => {
        try {
          await apiRequest("PUT", `/api/orders/${currentParcelId}`, {
            customerName: customerName || "Customer",
            customerPhone: phoneNumber || ""
          });
        } catch (error) {
          console.error("Failed to update customer info:", error);
        }
      };
      
      updateCustomerInfo();
    }
  }, [currentParcelId, customerName, phoneNumber]);
  
  // Handlers
  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
  };
  
  const handleSelectItem = (item: MenuItem) => {
    setSelectedItem(item);
    setShowItemModal(true);
  };
  
  const handleAddToOrder = (itemId: number, quantity: number, specialInstructions: string) => {
    if (!currentParcelId) {
      // Create new parcel order first, then add item
      createParcelMutation.mutate();
      
      // We need to wait for the order to be created before adding the item
      setTimeout(() => {
        if (currentParcelId) {
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
    if (!currentParcelId) {
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
    if (!currentParcelId) {
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
  
  const handleSettle = () => {
    if (!currentParcelId) {
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
  
  // Derived data
  const pendingItems = orderItems?.filter(item => item.status === "pending") || [];
  
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      
      <div className="flex-1 bg-gray-100 flex overflow-hidden">
        {/* Left Section: Menu Categories and Items */}
        <div className="w-3/5 flex flex-col h-full overflow-hidden">
          {/* Parcel Information */}
          <div className="bg-white p-4 shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-lg font-medium text-gray-800 mr-2">Parcel Information:</span>
              </div>
              <div>
                {currentOrder && (
                  <span className="text-sm text-gray-600">Parcel #{currentOrder.orderNumber}</span>
                )}
              </div>
            </div>
            
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="customer-name">Customer Name</Label>
                <Input
                  id="customer-name"
                  placeholder="Optional"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone-number">Phone Number</Label>
                <Input
                  id="phone-number"
                  placeholder="Optional"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
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
            orderId={currentParcelId}
            orderType="parcel"
            customerName={customerName || "Customer"}
            onPrintKOT={handlePrintKOT}
            onPrintBill={handlePrintBill}
            onFreeTable={() => {}}
            onShiftTable={() => {}}
            onSettle={handleSettle}
          />
        </div>
      </div>
      
      {/* Bottom Section: Tables and Parcels Grid */}
      <div className="px-4 py-2 overflow-y-auto max-h-72">
        <TableGrid 
          onSelectTable={(tableNum) => {
            setLocation('/pos');
          }} 
          selectedTable={0} 
        />
        <ParcelGrid />
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
      
      <SettleModal
        order={currentOrder || null}
        isOpen={showSettleModal}
        onClose={() => setShowSettleModal(false)}
        onConfirm={handleConfirmSettle}
      />
    </div>
  );
}
