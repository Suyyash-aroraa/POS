import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Order } from "@shared/schema";
import { Receipt } from "lucide-react";

interface BillConfirmationModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (includeServiceCharge: boolean) => void;
}

export function BillConfirmationModal({
  order,
  isOpen,
  onClose,
  onConfirm
}: BillConfirmationModalProps) {
  const [includeServiceCharge, setIncludeServiceCharge] = useState(false);
  
  if (!order) return null;
  
  // Calculate subtotal and potential service charge
  const subtotal = Number(order.subtotal);
  const serviceCharge = subtotal * 0.1; // 10% service charge
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Print Bill Confirmation
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Subtotal:</span>
                <span className="text-sm text-gray-800">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">GST (5%):</span>
                <span className="text-sm text-gray-800">₹{Number(order.tax).toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-500 ml-4">
                <div className="flex justify-between">
                  <span>SGST (2.5%):</span>
                  <span>₹{(Number(order.tax) / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST (2.5%):</span>
                  <span>₹{(Number(order.tax) / 2).toFixed(2)}</span>
                </div>
              </div>
              {order.orderType === 'parcel' && Number(order.packagingFee) > 0 && (
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Packaging:</span>
                  <span className="text-sm text-gray-800">₹{Number(order.packagingFee).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 mt-2 pt-2"></div>
              <div className="flex justify-between font-medium">
                <span className="text-sm text-gray-800">Current Total:</span>
                <span className="text-sm text-gray-800">₹{Number(order.totalAmount).toFixed(2)}</span>
              </div>
              
              {includeServiceCharge && (
                <>
                  <div className="flex justify-between text-primary mt-2">
                    <span className="text-sm">Service Charge (10%):</span>
                    <span className="text-sm">₹{serviceCharge.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium mt-1">
                    <span className="text-sm text-gray-800">New Total:</span>
                    <span className="text-sm text-gray-800">₹{(Number(order.totalAmount) + serviceCharge).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="service-charge" 
                checked={includeServiceCharge}
                onCheckedChange={(checked) => setIncludeServiceCharge(checked as boolean)}
              />
              <Label htmlFor="service-charge" className="cursor-pointer">
                Include 10% service charge
              </Label>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          
          <Button
            type="button"
            onClick={() => onConfirm(includeServiceCharge)}
          >
            Print Bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}