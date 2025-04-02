import { useQuery } from "@tanstack/react-query";
import { MenuItem } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface MenuGridProps {
  categoryId: number;
  onSelectItem: (item: MenuItem) => void;
}

export function MenuGrid({ categoryId, onSelectItem }: MenuGridProps) {
  const { data: menuItems, isLoading, error } = useQuery<MenuItem[]>({
    queryKey: [`/api/menu-items/category/${categoryId}`],
    enabled: !!categoryId,
  });
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error || !menuItems) {
    return (
      <div className="text-center py-4 text-red-500">
        Error loading menu items
      </div>
    );
  }
  
  if (menuItems.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No items in this category
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-3 gap-3 p-4">
      {menuItems.map((item) => (
        <Card 
          key={item.id} 
          className="hover:shadow-md cursor-pointer transition border border-gray-200"
          onClick={() => onSelectItem(item)}
        >
          <CardContent className="p-3">
            <h3 className="font-medium text-gray-800">{item.name}</h3>
            <p className="text-gray-600 text-sm">₹{Number(item.price).toFixed(2)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
