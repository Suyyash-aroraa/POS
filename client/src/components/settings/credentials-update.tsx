import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, KeyRound, CheckCircle, XCircle } from "lucide-react";

export function CredentialsUpdateForm() {
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessKeyId || !secretAccessKey) {
      toast({
        title: "Missing credentials",
        description: "Please provide both Access Key ID and Secret Access Key.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUpdating(true);
    setStatus("idle");
    setMessage("");
    
    try {
      const response = await fetch("/api/update-aws-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessKeyId,
          secretAccessKey,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStatus("success");
        setMessage(data.message);
        toast({
          title: "Credentials updated",
          description: data.message,
        });
      } else {
        setStatus("error");
        setMessage(data.message);
        toast({
          title: "Update failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      setStatus("error");
      setMessage("Network error occurred.");
      toast({
        title: "Network error",
        description: "Failed to connect to the server.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const checkS3Status = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch("/api/s3-status");
      const data = await response.json();
      
      if (response.ok) {
        setStatus(data.statusNow === "connected" ? "success" : "error");
        setMessage(
          data.statusNow === "connected" 
            ? `Connected to S3 (buckets: ${data.buckets.user}, ${data.buckets.menu})`
            : "Not connected to S3"
        );
      } else {
        setStatus("error");
        setMessage("Failed to check S3 status");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Network error when checking S3 status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Update AWS Credentials
        </CardTitle>
        <CardDescription>
          Update AWS credentials for S3 storage integration without restarting the server
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accessKeyId">AWS Access Key ID</Label>
            <Input
              id="accessKeyId"
              type="text"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              placeholder="Enter your AWS Access Key ID"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secretAccessKey">AWS Secret Access Key</Label>
            <Input
              id="secretAccessKey"
              type="password"
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              placeholder="Enter your AWS Secret Access Key"
              required
            />
          </div>

          {status !== "idle" && (
            <div className={`p-3 rounded-md flex items-center gap-2 ${
              status === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
            }`}>
              {status === "success" ? 
                <CheckCircle className="h-5 w-5 text-green-600" /> : 
                <XCircle className="h-5 w-5 text-red-600" />
              }
              <span>{message}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button type="submit" disabled={isUpdating} className="flex-1">
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Credentials
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={checkS3Status} 
              disabled={isUpdating}
              className="flex-1"
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Check S3 Status
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col text-sm text-muted-foreground">
        <p>
          Your AWS credentials will be securely updated in the running environment
          and will not be stored permanently on the server.
        </p>
      </CardFooter>
    </Card>
  );
}