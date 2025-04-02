import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, HardDrive, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type StatusType = "idle" | "loading" | "success" | "error";

export function StorageManager() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [status, setStatus] = useState<StatusType>("idle");
  const [message, setMessage] = useState<string>("");
  const { toast } = useToast();

  const verifyStorage = async () => {
    setIsVerifying(true);
    setStatus("loading");
    
    try {
      const response = await fetch("/api/manage-local-storage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "verify" }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStatus(data.status === "connected" ? "success" : "error");
        setMessage(data.message || "Storage verification completed");
        
        toast({
          title: data.status === "connected" ? "Storage Accessible" : "Storage Issue",
          description: data.message,
          variant: data.status === "connected" ? "default" : "destructive",
        });
      } else {
        setStatus("error");
        setMessage(data.message || "Failed to verify storage");
        
        toast({
          title: "Error",
          description: data.message || "Failed to verify storage",
          variant: "destructive",
        });
      }
    } catch (error) {
      setStatus("error");
      setMessage("Network error when verifying storage");
      
      toast({
        title: "Error",
        description: "Network error when verifying storage",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Local Storage Management
        </CardTitle>
        <CardDescription>
          Verify and manage local file storage for user and menu data
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>
            The application uses local file storage to persist user and menu data.
            Use the controls below to verify storage accessibility.
          </p>
        </div>
        
        {status !== "idle" && (
          <div className={`p-3 rounded-md flex items-center gap-2 ${
            status === "success" ? "bg-green-50 text-green-800" : 
            status === "error" ? "bg-red-50 text-red-800" : 
            "bg-blue-50 text-blue-800"
          }`}>
            {status === "success" ? <CheckCircle className="h-5 w-5 text-green-600" /> : 
             status === "error" ? <XCircle className="h-5 w-5 text-red-600" /> :
             <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
            <span>{message}</span>
          </div>
        )}
        
        <div className="pt-4">
          <Button 
            type="button" 
            disabled={isVerifying}
            onClick={verifyStorage}
            className="w-full"
          >
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify Storage Accessibility
          </Button>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col text-sm text-muted-foreground">
        <p>
          The application requires access to local file storage directories for storing
          user accounts and menu item data.
        </p>
      </CardFooter>
    </Card>
  );
}