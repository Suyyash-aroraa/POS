import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";

export function TopNav() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  const formattedTime = format(currentTime, "MMM dd, yyyy | HH:mm");
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <nav className="bg-white shadow-sm px-4 py-2 flex justify-between items-center">
      <div className="flex items-center">
        <h1 className="text-xl font-bold text-gray-800">Restaurant POS</h1>
        
        <div className="ml-10">
          <ul className="flex space-x-4 text-sm">
            <li>
              <Link 
                to="/"
                className={`px-3 py-2 rounded-md ${location === "/" ? "text-primary font-medium" : "text-gray-500 hover:text-primary font-medium"}`}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link 
                to="/pos"
                className={`px-3 py-2 rounded-md ${location === "/pos" ? "text-primary font-medium" : "text-gray-500 hover:text-primary font-medium"}`}
              >
                POS
              </Link>
            </li>
            <li>
              <Link 
                to="/parcel"
                className={`px-3 py-2 rounded-md ${location === "/parcel" ? "text-primary font-medium" : "text-gray-500 hover:text-primary font-medium"}`}
              >
                Parcel
              </Link>
            </li>
            <li>
              <Link 
                to="/settings"
                className={`px-3 py-2 rounded-md ${location === "/settings" ? "text-primary font-medium" : "text-gray-500 hover:text-primary font-medium"}`}
              >
                <span className="flex items-center gap-1">
                  <Settings className="h-3.5 w-3.5" />
                  Settings
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="flex items-center">
        <div className="mr-4 text-sm text-gray-600">
          <span>{formattedTime}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {user?.displayName}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
