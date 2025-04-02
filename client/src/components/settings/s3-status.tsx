import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface S3StatusData {
  statusBefore: "connected" | "disconnected";
  statusNow: "connected" | "disconnected";
  buckets: {
    user: string;
    menu: string;
  };
  region: string;
}

export function S3StatusDisplay() {
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<S3StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchS3Status = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/s3-status");
      
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch S3 status");
      toast({
        title: "Error",
        description: "Failed to fetch S3 status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchS3Status();
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status?.statusNow === "connected" ? (
            <Cloud className="h-5 w-5 text-green-500" />
          ) : (
            <CloudOff className="h-5 w-5 text-red-500" />
          )}
          S3 Storage Status
        </CardTitle>
        <CardDescription>
          Current status of AWS S3 connection for cloud storage
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-md">
            <p className="font-medium">Error checking S3 status</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : status ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="font-medium">Connection Status:</span>
              <Badge variant={status.statusNow === "connected" ? "default" : "destructive"} className={status.statusNow === "connected" ? "bg-green-500" : ""}>
                {status.statusNow === "connected" ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Region:</span>
                <span className="text-sm">{status.region || "Not configured"}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">User Bucket:</span>
                <span className="text-sm">{status.buckets.user || "Not configured"}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Menu Bucket:</span>
                <span className="text-sm">{status.buckets.menu || "Not configured"}</span>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
      
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={fetchS3Status}
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