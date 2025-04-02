import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, HardDrive, FolderClosed, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StorageStatusData {
  status: "connected" | "disconnected";
  storageType: string;
  paths: {
    users: string;
    menuItems: string;
  };
}

export function StorageStatusDisplay() {
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<StorageStatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStorageStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/storage-status");
      
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch storage status");
      toast({
        title: "Error",
        description: "Failed to fetch storage status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageStatus();
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status?.status === "connected" ? (
            <HardDrive className="h-5 w-5 text-green-500" />
          ) : (
            <HardDrive className="h-5 w-5 text-red-500" />
          )}
          Local Storage Status
        </CardTitle>
        <CardDescription>
          Current status of local file storage for user and menu data
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-md">
            <p className="font-medium">Error checking storage status</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : status ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="font-medium">Connection Status:</span>
              <Badge variant={status.status === "connected" ? "default" : "destructive"} className={status.status === "connected" ? "bg-green-500" : ""}>
                {status.status === "connected" ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Storage Type:</span>
                <span className="text-sm">{status.storageType || "Not configured"}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Users Directory:</span>
                <span className="text-sm flex items-center">
                  <FolderClosed className="h-3 w-3 mr-1 inline" />
                  {status.paths.users || "Not configured"}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Menu Items Directory:</span>
                <span className="text-sm flex items-center">
                  <FolderClosed className="h-3 w-3 mr-1 inline" />
                  {status.paths.menuItems || "Not configured"}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
      
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={fetchStorageStatus}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Status
        </Button>
      </CardFooter>
    </Card>
  );
}