import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MenuItem } from "@shared/schema";
import { AlertCircle, Utensils } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ItemQuantityModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToOrder: (itemId: number, quantity: number, specialInstructions: string) => void;
}

export function ItemQuantityModal({ 
  item, 
  isOpen, 
  onClose, 
  onAddToOrder
}: ItemQuantityModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [spicyLevel, setSpicyLevel] = useState("regular");
  const [error, setError] = useState<string | null>(null);
  
  // Reset state when modal opens with a new item
  useEffect(() => {
    if (isOpen && item) {
      setQuantity(1);
      setSpecialInstructions("");
      setSpicyLevel("regular");
      setError(null);
    }
  }, [isOpen, item]);
  
  if (!item) return null;
  
  const handleAddToOrder = () => {
    if (quantity <= 0) {
      setError("Quantity must be at least 1");
      return;
    }
    
    // Combine spicy level with any other special instructions
    const finalInstructions = spicyLevel !== "regular" 
      ? `${spicyLevel.toUpperCase()} spicy. ${specialInstructions}`
      : specialInstructions;
    
    onAddToOrder(item.id, quantity, finalInstructions.trim());
    onClose();
  };
  
  const incrementQuantity = () => {
    setQuantity(prev => prev + 1);
    setError(null);
  };
  
  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
    setError(null);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Add {item.name} to Order
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quantity</Label>
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 rounded-r-none"
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1) {
                      setQuantity(val);
                      setError(null);
                    }
                  }}
                  className="h-8 rounded-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 rounded-l-none"
                  onClick={incrementQuantity}
                >
                  +
                </Button>
              </div>
              
              {error && (
                <Alert variant="destructive" className="py-2 mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Spicy Level</Label>
              <RadioGroup value={spicyLevel} onValueChange={setSpicyLevel} className="flex space-x-2">
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="mild" id="mild" />
                  <Label htmlFor="mild" className="text-sm">Mild</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="regular" id="regular" />
                  <Label htmlFor="regular" className="text-sm">Regular</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="extra" id="extra" />
                  <Label htmlFor="extra" className="text-sm">Extra</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="special-instructions" className="text-sm font-medium">
                Special Instructions
              </Label>
              <Textarea
                id="special-instructions"
                placeholder="Any special instructions or modifications..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
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
            onClick={handleAddToOrder}
          >
            Add to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}