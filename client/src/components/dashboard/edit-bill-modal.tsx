import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Order, OrderItem } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface EditBillModalProps {
  order: Order | undefined;
  isOpen: boolean;
  onClose: () => void;
}

export function EditBillModal({ order, isOpen, onClose }: EditBillModalProps) {
  const { toast } = useToast();
  
  // Local state for form
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [bankReference, setBankReference] = useState<string>("");
  const [cashAmount, setCashAmount] = useState<string>("");
  const [bankAmount, setBankAmount] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Get order items
  const { data: orderItems, isLoading: isItemsLoading } = useQuery<OrderItem[]>({
    queryKey: [`/api/orders/${order?.id}/items`],
    enabled: isOpen && !!order?.id,
  });
  
  // Update payment method mutation
  const updatePaymentMutation = useMutation({
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
      if (!order) throw new Error("No order selected");
      
      const res = await apiRequest("POST", `/api/orders/${order.id}/payment`, {
        paymentMethod,
        bankReference,
        cashAmount,
        bankAmount
      });
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      
      toast({
        title: "Payment updated",
        description: "Payment method has been updated successfully",
      });
      
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Reset form when order changes
  useEffect(() => {
    if (isOpen && order) {
      setPaymentMethod(order.paymentMethod || "cash");
      setBankReference(order.bankReference || "");
      setCashAmount(order.cashAmount ? String(order.cashAmount) : "");
      setBankAmount(order.bankAmount ? String(order.bankAmount) : "");
      setErrors({});
    }
  }, [isOpen, order]);
  
  // Validate form
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
  
  // Handle form submission
  const handleSubmit = () => {
    if (!validateForm()) return;
    
    let finalCashAmount: number | undefined;
    let finalBankAmount: number | undefined;
    
    if (paymentMethod === "split") {
      finalCashAmount = Number(cashAmount);
      finalBankAmount = Number(bankAmount);
    }
    
    updatePaymentMutation.mutate({
      paymentMethod,
      bankReference: (paymentMethod === "bank" || paymentMethod === "split") ? bankReference : undefined,
      cashAmount: finalCashAmount,
      bankAmount: finalBankAmount
    });
  };
  
  // Loading state
  const isLoading = isItemsLoading || updatePaymentMutation.isPending;
  
  // No order selected
  if (!order) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Bill Payment</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {/* Order Information */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Order Details</h3>
            <div className="bg-gray-50 p-3 rounded-md text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Bill Number:</span> #{order.orderNumber}
                </div>
                <div>
                  <span className="font-medium">Type:</span> {order.orderType === "dine_in" ? "Table" : "Parcel"}
                </div>
                <div>
                  <span className="font-medium">
                    {order.orderType === "dine_in" ? "Table:" : "Customer:"}
                  </span> {order.orderType === "dine_in" ? order.tableNumber : order.customerName}
                </div>
                <div>
                  <span className="font-medium">Amount:</span> ₹{Number(order.totalAmount).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          {/* Payment Method */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Edit Payment Method</h3>
            
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
            disabled={isLoading}
          >
            Cancel
          </Button>
          
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
