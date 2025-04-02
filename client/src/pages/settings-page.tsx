import { useAuth } from "@/hooks/use-auth";
import { StorageManager } from "@/components/settings/storage-manager";
import { StorageStatusDisplay } from "@/components/settings/storage-status";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Settings, 
  HardDrive,
  Printer,
  Database,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function SettingsPage() {
  const { user } = useAuth();

  if (!user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild className="flex items-center gap-1">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-5 w-5" /> Settings
          </h1>
        </div>
      </div>

      <Tabs defaultValue="storage" className="w-full">
        <TabsList>
          <TabsTrigger value="storage" className="flex items-center gap-1">
            <HardDrive className="h-4 w-4" />
            Storage
          </TabsTrigger>
          <TabsTrigger value="printer" className="flex items-center gap-1">
            <Printer className="h-4 w-4" />
            Printer Settings
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-1">
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="storage" className="mt-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Local Storage Integration</h3>
              <p className="text-muted-foreground">
                Manage local file storage for user accounts and menu data.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StorageManager />
              <StorageStatusDisplay />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="printer" className="mt-6">
          <div className="flex items-center justify-center h-64 border rounded-lg">
            <p className="text-muted-foreground">Printer settings will be available soon.</p>
          </div>
        </TabsContent>
        
        <TabsContent value="database" className="mt-6">
          <div className="flex items-center justify-center h-64 border rounded-lg">
            <p className="text-muted-foreground">Database settings will be available soon.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}