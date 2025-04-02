import { createContext, useContext, ReactNode, useState } from 'react';
import { MenuItem, Order, OrderItem } from '@shared/schema';

interface Printer {
  id: string;
  name: string;
}

interface PrintSettings {
  kotPrinter: string;
  billPrinter: string;
}

interface KotPrintData {
  orderNumber: string;
  orderType: 'dine_in' | 'parcel';
  tableNumber: number | null;
  items: OrderItem[];
  timestamp: string;
  instructions?: string;
}

interface BillPrintData {
  orderNumber: string;
  orderType: 'dine_in' | 'parcel';
  tableNumber: number | null;
  customerName: string | null;
  items: OrderItem[];
  subtotal: string;
  tax: string;
  serviceCharge?: string;
  totalAmount: string;
  timestamp: string;
  paymentMethod: string | null;
}

interface PrintServiceContextType {
  getAvailablePrinters: () => Printer[];
  getPrinterSettings: () => PrintSettings;
  updatePrinterSettings: (settings: PrintSettings) => boolean;
  printKot: (data: KotPrintData) => Promise<boolean>;
  printBill: (data: BillPrintData, includeServiceCharge: boolean) => Promise<boolean>;
}

const PrintServiceContext = createContext<PrintServiceContextType | null>(null);

export function PrintServiceProvider({ children }: { children: ReactNode }) {
  // In a real implementation, we would retrieve this from an API
  // that interacts with the OS's printer services
  const [availablePrinters] = useState<Printer[]>([
    { id: 'printer1', name: 'Kitchen Printer' },
    { id: 'printer2', name: 'Front Desk Printer' },
    { id: 'printer3', name: 'Bar Printer' },
  ]);
  
  // Default settings
  const [settings, setSettings] = useState<PrintSettings>(() => {
    const storedSettings = localStorage.getItem('printerSettings');
    return storedSettings 
      ? JSON.parse(storedSettings) 
      : { kotPrinter: '', billPrinter: '' };
  });
  
  const getAvailablePrinters = () => {
    return availablePrinters;
  };
  
  const getPrinterSettings = () => {
    return settings;
  };
  
  const updatePrinterSettings = (newSettings: PrintSettings) => {
    try {
      setSettings(newSettings);
      localStorage.setItem('printerSettings', JSON.stringify(newSettings));
      return true;
    } catch (error) {
      console.error('Failed to save printer settings:', error);
      return false;
    }
  };
  
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₹${numAmount.toFixed(2)}`;
  };
  
  const generateKotTemplate = (data: KotPrintData): string => {
    // This would be replaced with actual thermal printer commands
    // In a real implementation
    const kotHtml = `
      <div style="font-family: monospace; width: 300px;">
        <div style="text-align: center; font-weight: bold; padding: 5px;">
          KITCHEN ORDER TICKET
        </div>
        <div style="padding: 2px; border-top: 1px dashed black; border-bottom: 1px dashed black;">
          <div>#${data.orderNumber} | ${data.orderType === 'dine_in' ? `Table: ${data.tableNumber}` : 'PARCEL'}</div>
          <div>${data.timestamp}</div>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid black;">
            <th style="text-align: left; padding: 3px;">Item</th>
            <th style="text-align: center; padding: 3px;">Qty</th>
          </tr>
          ${data.items.map(item => `
            <tr>
              <td style="padding: 3px;">Item #${item.menuItemId}</td>
              <td style="text-align: center; padding: 3px;">${item.quantity}</td>
            </tr>
            ${item.specialInstructions ? `
              <tr>
                <td colspan="2" style="padding: 3px; font-style: italic; font-size: 0.9em;">
                  * ${item.specialInstructions}
                </td>
              </tr>
            ` : ''}
          `).join('')}
        </table>
        ${data.instructions ? `
          <div style="padding: 3px; border-top: 1px dashed black; font-style: italic;">
            Notes: ${data.instructions}
          </div>
        ` : ''}
      </div>
    `;
    
    return kotHtml;
  };
  
  const generateBillTemplate = (data: BillPrintData, includeServiceCharge: boolean): string => {
    // Calculate GST components
    const gstAmount = parseFloat(data.tax);
    const sgst = gstAmount / 2;
    const cgst = gstAmount / 2;
    
    // Calculate service charge if included
    const serviceChargeAmount = includeServiceCharge 
      ? parseFloat(data.serviceCharge || '0') 
      : 0;
    
    // Calculate new total with service charge
    const totalWithServiceCharge = parseFloat(data.totalAmount) + serviceChargeAmount;
    
    // This would be replaced with actual thermal printer commands
    // In a real implementation
    const billHtml = `
      <div style="font-family: monospace; width: 300px;">
        <div style="text-align: center; font-weight: bold; padding: 5px;">
          YOUR RESTAURANT NAME
        </div>
        <div style="text-align: center; padding-bottom: 5px;">
          Address Line 1, City, State<br/>
          Phone: 123-456-7890
        </div>
        <div style="padding: 2px; border-top: 1px dashed black; border-bottom: 1px dashed black;">
          <div>#${data.orderNumber} | ${data.orderType === 'dine_in' ? `Table: ${data.tableNumber}` : 'PARCEL'}</div>
          <div>${data.timestamp}</div>
          ${data.customerName ? `<div>Customer: ${data.customerName}</div>` : ''}
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid black;">
            <th style="text-align: left; padding: 3px;">Item</th>
            <th style="text-align: center; padding: 3px;">Qty</th>
            <th style="text-align: right; padding: 3px;">Price</th>
          </tr>
          ${data.items.map(item => `
            <tr>
              <td style="padding: 3px;">Item #${item.menuItemId}</td>
              <td style="text-align: center; padding: 3px;">${item.quantity}</td>
              <td style="text-align: right; padding: 3px;">${formatCurrency(parseFloat(item.price) * item.quantity)}</td>
            </tr>
          `).join('')}
        </table>
        
        <div style="padding: 5px; border-top: 1px dashed black;">
          <table style="width: 100%;">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right;">${formatCurrency(data.subtotal)}</td>
            </tr>
            <tr>
              <td>SGST (2.5%):</td>
              <td style="text-align: right;">${formatCurrency(sgst)}</td>
            </tr>
            <tr>
              <td>CGST (2.5%):</td>
              <td style="text-align: right;">${formatCurrency(cgst)}</td>
            </tr>
            ${includeServiceCharge ? `
              <tr>
                <td>Service Charge (10%):</td>
                <td style="text-align: right;">${formatCurrency(serviceChargeAmount)}</td>
              </tr>
            ` : ''}
            <tr style="font-weight: bold; border-top: 1px dashed black; margin-top: 5px;">
              <td>Total:</td>
              <td style="text-align: right;">${formatCurrency(includeServiceCharge ? totalWithServiceCharge : data.totalAmount)}</td>
            </tr>
            ${data.paymentMethod ? `
              <tr>
                <td>Payment Method:</td>
                <td style="text-align: right;">${data.paymentMethod.toUpperCase()}</td>
              </tr>
            ` : ''}
          </table>
        </div>
        
        <div style="text-align: center; padding: 10px; font-style: italic;">
          Thank you for your visit!<br/>
          GST No: XXXXXXXXXXXX
        </div>
      </div>
    `;
    
    return billHtml;
  };
  
  const printContent = async (content: string, printerName: string): Promise<boolean> => {
    try {
      // In a real implementation, this would send the content to a printer
      // using a printer API or library
      
      // For this prototype, we'll just open a new window with the content
      const printWindow = window.open('', '_blank');
      if (!printWindow) return false;
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Print ${printerName}</title>
            <style>
              @media print {
                body { margin: 0; padding: 0; }
              }
            </style>
          </head>
          <body>
            ${content}
            <script>
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 500);
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      return true;
    } catch (error) {
      console.error('Print error:', error);
      return false;
    }
  };
  
  const printKot = async (data: KotPrintData): Promise<boolean> => {
    if (!settings.kotPrinter) {
      console.error('KOT printer not configured');
      return false;
    }
    
    const kotTemplate = generateKotTemplate(data);
    return await printContent(kotTemplate, settings.kotPrinter);
  };
  
  const printBill = async (data: BillPrintData, includeServiceCharge: boolean): Promise<boolean> => {
    if (!settings.billPrinter) {
      console.error('Bill printer not configured');
      return false;
    }
    
    const billTemplate = generateBillTemplate(data, includeServiceCharge);
    return await printContent(billTemplate, settings.billPrinter);
  };
  
  return (
    <PrintServiceContext.Provider
      value={{
        getAvailablePrinters,
        getPrinterSettings,
        updatePrinterSettings,
        printKot,
        printBill
      }}
    >
      {children}
    </PrintServiceContext.Provider>
  );
}

export function usePrintService() {
  const context = useContext(PrintServiceContext);
  if (!context) {
    throw new Error('usePrintService must be used within a PrintServiceProvider');
  }
  return context;
}