import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock printer data - will be replaced when PrintServiceProvider is fully implemented
const mockPrinters = [
  { id: 'printer1', name: 'Kitchen Printer' },
  { id: 'printer2', name: 'Front Desk Printer' },
  { id: 'printer3', name: 'Bar Printer' },
];

export function PrinterSettingsModal({ isOpen, onClose }: PrinterSettingsModalProps) {
  const { toast } = useToast();
  
  // Use localStorage for settings persistence
  const [kotPrinter, setKotPrinter] = useState<string>(() => {
    const storedSettings = localStorage.getItem('printerSettings');
    if (storedSettings) {
      const settings = JSON.parse(storedSettings);
      return settings.kotPrinter || '';
    }
    return '';
  });
  
  const [billPrinter, setBillPrinter] = useState<string>(() => {
    const storedSettings = localStorage.getItem('printerSettings');
    if (storedSettings) {
      const settings = JSON.parse(storedSettings);
      return settings.billPrinter || '';
    }
    return '';
  });
  
  const handleSave = () => {
    try {
      const settings = { kotPrinter, billPrinter };
      localStorage.setItem('printerSettings', JSON.stringify(settings));
      
      toast({
        title: "Settings saved",
        description: "Printer settings have been updated successfully.",
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to save printer settings:', error);
      
      toast({
        title: "Failed to save settings",
        description: "There was an error saving your printer settings.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Printer Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="kot-printer">KOT Printer</Label>
              <Select value={kotPrinter} onValueChange={setKotPrinter}>
                <SelectTrigger id="kot-printer">
                  <SelectValue placeholder="Select a printer" />
                </SelectTrigger>
                <SelectContent>
                  {mockPrinters.map((printer) => (
                    <SelectItem key={printer.id} value={printer.id}>
                      {printer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This printer will be used for printing Kitchen Order Tickets.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bill-printer">Bill Printer</Label>
              <Select value={billPrinter} onValueChange={setBillPrinter}>
                <SelectTrigger id="bill-printer">
                  <SelectValue placeholder="Select a printer" />
                </SelectTrigger>
                <SelectContent>
                  {mockPrinters.map((printer) => (
                    <SelectItem key={printer.id} value={printer.id}>
                      {printer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This printer will be used for printing bills and invoices.
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
            onClick={handleSave}
          >
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}