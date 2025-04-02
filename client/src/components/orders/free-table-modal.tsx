import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Unlock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FreeTableModalProps {
  tableNumber: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
}

export function FreeTableModal({ 
  tableNumber, 
  isOpen, 
  onClose, 
  onConfirm
}: FreeTableModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const handleConfirm = () => {
    if (!password) {
      setError("Please enter the supervisor password");
      return;
    }
    onConfirm(password);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5" />
            Free Table Confirmation
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              You are about to free table <span className="font-bold">#{tableNumber}</span>. This action will remove all unpaid orders linked to this table.
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="supervisor-password" className="text-sm font-medium">
                Supervisor Password
              </Label>
              <Input
                id="supervisor-password"
                type="password"
                placeholder="Enter supervisor password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className={error ? "border-red-300" : ""}
              />
              
              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}
              
              <p className="text-xs text-muted-foreground">
                A supervisor password is required to free a table. This helps prevent accidental removal of orders.
              </p>
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
            variant="destructive"
            onClick={handleConfirm}
          >
            Free Table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}