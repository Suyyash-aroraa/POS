import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Order } from "@shared/schema";

interface SettleModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: string, bankReference?: string, cashAmount?: number, bankAmount?: number) => void;
}

export function SettleModal({
  order,
  isOpen,
  onClose,
  onConfirm
}: SettleModalProps) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [bankReference, setBankReference] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [bankAmount, setBankAmount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setPaymentMethod("cash");
      setBankReference("");
      setCashAmount("");
      setBankAmount("");
      setErrors({});
    }
  }, [isOpen]);
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (paymentMethod === "bank" && !bankReference) {
      newErrors.bankReference = "Bank reference is required";
    }
    
    if (paymentMethod === "split") {
      if (!cashAmount) {
        newErrors.cashAmount = "Cash amount is required";
      } else if (isNaN(Number(cashAmount))) {
        newErrors.cashAmount = "Must be a valid number";
      }
      
      if (!bankAmount) {
        newErrors.bankAmount = "Bank amount is required";
      } else if (isNaN(Number(bankAmount))) {
        newErrors.bankAmount = "Must be a valid number";
      }
      
      if (!bankReference) {
        newErrors.bankReference = "Bank reference is required";
      }
      
      // Validate that the total matches
      if (order && !newErrors.cashAmount && !newErrors.bankAmount) {
        const total = Number(order.totalAmount);
        const cash = Number(cashAmount);
        const bank = Number(bankAmount);
        
        if (Math.abs((cash + bank) - total) > 0.01) { // Allow tiny floating point diff
          newErrors.total = `Total amounts must add up to ₹${total.toFixed(2)}`;
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleConfirm = () => {
    if (!validateForm()) return;
    
    let finalCashAmount: number | undefined;
    let finalBankAmount: number | undefined;
    
    if (paymentMethod === "split") {
      finalCashAmount = Number(cashAmount);
      finalBankAmount = Number(bankAmount);
    }
    
    onConfirm(
      paymentMethod,
      (paymentMethod === "bank" || paymentMethod === "split") ? bankReference : undefined,
      finalCashAmount,
      finalBankAmount
    );
  };
  
  if (!order) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settle Payment</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-4">
            <h4 className="text-base font-medium text-gray-800 mb-2">Order Summary</h4>
            
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Subtotal:</span>
                <span className="text-sm text-gray-800">₹{Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Tax (5%):</span>
                <span className="text-sm text-gray-800">₹{Number(order.tax).toFixed(2)}</span>
              </div>
              {Number(order.packagingFee) > 0 && (
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Packaging:</span>
                  <span className="text-sm text-gray-800">₹{Number(order.packagingFee).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span className="text-sm text-gray-800">Total:</span>
                <span className="text-sm text-gray-800">₹{Number(order.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h4 className="text-base font-medium text-gray-800 mb-2">Payment Method</h4>
            
            <RadioGroup
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="payment-cash" />
                <Label htmlFor="payment-cash">Cash</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank" id="payment-bank" />
                <Label htmlFor="payment-bank">Bank</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="split" id="payment-split" />
                <Label htmlFor="payment-split">Split Payment</Label>
              </div>
            </RadioGroup>
            
            {/* Bank Reference */}
            {(paymentMethod === "bank" || paymentMethod === "split") && (
              <div className="mt-3">
                <Label htmlFor="bank-reference">Bank Reference</Label>
                <Input
                  id="bank-reference"
                  type="text"
                  placeholder="Transaction ID / Reference"
                  value={bankReference}
                  onChange={(e) => setBankReference(e.target.value)}
                  className={errors.bankReference ? "border-red-500" : ""}
                />
                {errors.bankReference && (
                  <p className="text-xs text-red-500 mt-1">{errors.bankReference}</p>
                )}
              </div>
            )}
            
            {/* Split Payment Details */}
            {paymentMethod === "split" && (
              <div className="border border-gray-200 rounded-md p-3 mt-3">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="cash-amount">Cash Amount</Label>
                    <Input
                      id="cash-amount"
                      type="text"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      className={errors.cashAmount ? "border-red-500" : ""}
                    />
                    {errors.cashAmount && (
                      <p className="text-xs text-red-500 mt-1">{errors.cashAmount}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="bank-amount">Bank Amount</Label>
                    <Input
                      id="bank-amount"
                      type="text"
                      value={bankAmount}
                      onChange={(e) => setBankAmount(e.target.value)}
                      className={errors.bankAmount ? "border-red-500" : ""}
                    />
                    {errors.bankAmount && (
                      <p className="text-xs text-red-500 mt-1">{errors.bankAmount}</p>
                    )}
                  </div>
                  
                  {errors.total && (
                    <p className="text-xs text-red-500 mt-1">{errors.total}</p>
                  )}
                </div>
              </div>
            )}
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
            variant="default"
            onClick={handleConfirm}
          >
            Complete Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
