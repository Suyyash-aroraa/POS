import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { TopNav } from "@/components/shared/top-nav";
import { StatsCard } from "@/components/dashboard/stats-card";
import { SalesTable } from "@/components/dashboard/sales-table";
import { MenuItemsTable } from "@/components/dashboard/menu-items-table";
import { ItemFormModal } from "@/components/dashboard/item-form-modal";
import { EditBillModal } from "@/components/dashboard/edit-bill-modal";
import { PrinterSettingsModal } from "@/components/settings/printer-settings";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { Loader2, Download, PlusCircle, Printer } from "lucide-react";
import { MenuItem, Order } from "@shared/schema";
import { format, subDays } from "date-fns";

export default function DashboardPage() {
  // Date range state for sales report
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  
  // Payment method filter state
  const [paymentMethod, setPaymentMethod] = useState("all");
  
  // Modal states
  const [showItemFormModal, setShowItemFormModal] = useState(false);
  const [showEditBillModal, setShowEditBillModal] = useState(false);
  const [showPrinterSettingsModal, setShowPrinterSettingsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | undefined>(undefined);
  const [selectedOrder, setSelectedOrder] = useState<Order | undefined>(undefined);
  
  // Get dashboard statistics
  const { data: orders, isLoading: isOrdersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });
  
  // Calculate dashboard statistics
  const calculateStats = () => {
    if (!orders) return { todaySales: "0.00", totalOrders: 0, tableOrders: 0, parcelOrders: 0 };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= today;
    });
    
    const todaySales = todayOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const tableOrders = orders.filter(order => order.orderType === "dine_in").length;
    const parcelOrders = orders.filter(order => order.orderType === "parcel").length;
    
    return {
      todaySales: todaySales.toFixed(2),
      totalOrders: orders.length,
      tableOrders,
      parcelOrders
    };
  };
  
  const stats = calculateStats();
  
  // Handle add/edit menu item
  const handleAddItem = () => {
    setSelectedItem(undefined);
    setShowItemFormModal(true);
  };
  
  const handleEditItem = (item: MenuItem) => {
    setSelectedItem(item);
    setShowItemFormModal(true);
  };
  
  // Handle edit bill
  const handleEditBill = (order: Order) => {
    setSelectedOrder(order);
    setShowEditBillModal(true);
  };
  
  // Handle CSV export
  const handleExportCSV = () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    const url = `/api/orders/export?startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}&paymentMethod=${paymentMethod}`;
    window.open(url, '_blank');
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      
      <div className="flex-1 overflow-auto p-4 bg-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
            <p className="text-gray-600">Monitor and manage your restaurant performance</p>
          </div>
          <div className="flex space-x-3">
            <Link to="/pos">
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Open POS System
              </Button>
            </Link>
            <Link to="/parcel">
              <Button size="lg" variant="outline">
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                Parcel Orders
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatsCard 
            title="Today's Sales" 
            value={`₹${stats.todaySales}`} 
            icon="sales"
          />
          
          <StatsCard 
            title="Total Orders" 
            value={String(stats.totalOrders)} 
            subtext={`Table: ${stats.tableOrders} | Parcel: ${stats.parcelOrders}`}
            icon="orders"
          />
          
          <StatsCard 
            title="Best Selling Item" 
            value="Chicken Biryani" 
            subtext="24 orders today"
            icon="item"
          />
        </div>
        
        {/* Sales Report Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">Sales Report</h3>
            
            <div className="flex items-center space-x-2">
              {/* Date Range Picker */}
              <DateRangePicker 
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
              
              {/* Payment Method Filter */}
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Payment Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="split">Split Payment</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Export Button */}
              <Button 
                className="flex items-center" 
                onClick={handleExportCSV}
                disabled={!dateRange?.from || !dateRange?.to}
              >
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
            </div>
          </div>
          
          {/* Sales Table */}
          {dateRange?.from && dateRange?.to ? (
            <SalesTable 
              startDate={dateRange.from}
              endDate={dateRange.to}
              paymentMethod={paymentMethod}
              onEditBill={handleEditBill}
            />
          ) : (
            <div className="bg-white p-4 rounded-lg shadow text-center text-gray-500">
              Please select a date range
            </div>
          )}
        </div>
        
        {/* Item Management Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">Menu Items Management</h3>
            
            <Button 
              className="flex items-center bg-secondary hover:bg-green-700" 
              onClick={handleAddItem}
            >
              <PlusCircle className="h-4 w-4 mr-1" /> Add New Item
            </Button>
          </div>
          
          {/* Menu Items Table */}
          <MenuItemsTable onEditItem={handleEditItem} />
        </div>
        
        {/* Settings Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">Settings</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowPrinterSettingsModal(true)}>
              <div className="flex items-center mb-2">
                <Printer className="h-5 w-5 text-primary mr-2" />
                <h4 className="font-medium">Printer Configuration</h4>
              </div>
              <p className="text-sm text-gray-600">Configure KOT and bill printers for your restaurant</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <ItemFormModal 
        item={selectedItem}
        isOpen={showItemFormModal}
        onClose={() => setShowItemFormModal(false)}
      />
      
      <EditBillModal 
        order={selectedOrder}
        isOpen={showEditBillModal}
        onClose={() => setShowEditBillModal(false)}
      />
      
      <PrinterSettingsModal
        isOpen={showPrinterSettingsModal}
        onClose={() => setShowPrinterSettingsModal(false)}
      />
    </div>
  );
}
