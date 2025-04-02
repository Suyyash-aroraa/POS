import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OrderItem } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer } from "lucide-react";

interface KotConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (instructions: string) => void;
  pendingItems: OrderItem[];
}

export function KotConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  pendingItems
}: KotConfirmationModalProps) {
  const [instructions, setInstructions] = useState("");
  
  if (pendingItems.length === 0) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print KOT Confirmation
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-4">
            <div className="text-sm font-medium">Items to be printed:</div>
            
            <ScrollArea className="h-[150px] rounded-md border">
              <div className="p-3">
                {pendingItems.map((item) => (
                  <div key={item.id} className="mb-2 pb-2 border-b border-gray-100 last:border-none">
                    <div className="flex justify-between">
                      <span className="font-medium">Item #{item.menuItemId}</span>
                      <span>x{item.quantity}</span>
                    </div>
                    {item.specialInstructions && (
                      <div className="text-xs text-gray-500 mt-1">
                        Note: {item.specialInstructions}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Additional Kitchen Instructions:</div>
              <Textarea
                placeholder="Enter any special instructions for the kitchen..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="resize-none"
                rows={3}
              />
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
            onClick={() => onConfirm(instructions)}
          >
            Print KOT
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}