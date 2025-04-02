import { useQuery, useMutation } from "@tanstack/react-query";
import { MenuItem, ItemCategory } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MenuItemsTableProps {
  onEditItem: (item: MenuItem) => void;
}

export function MenuItemsTable({ onEditItem }: MenuItemsTableProps) {
  const { toast } = useToast();
  
  const { data: menuItems, isLoading: isItemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });
  
  const { data: categories, isLoading: isCategoriesLoading } = useQuery<ItemCategory[]>({
    queryKey: ["/api/categories"],
  });
  
  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/menu-items/${id}/toggle`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({
        title: "Item status updated",
        description: "The menu item status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleToggleItem = (id: number) => {
    toggleMutation.mutate(id);
  };
  
  const getCategoryName = (categoryId: number) => {
    if (!categories) return "";
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "";
  };
  
  const isLoading = isItemsLoading || isCategoriesLoading || toggleMutation.isPending;
  
  if (isItemsLoading || isCategoriesLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!menuItems || !categories) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading menu items
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 flex justify-between items-center border-b">
        <h3 className="text-lg font-medium">Menu Items</h3>
        <Button 
          onClick={() => onEditItem({} as MenuItem)} 
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          Add New Item
        </Button>
      </div>
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead>Item Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price (₹)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {menuItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {item.name}
              </TableCell>
              <TableCell>
                {getCategoryName(item.categoryId)}
              </TableCell>
              <TableCell>
                {Number(item.price).toFixed(2)}
              </TableCell>
              <TableCell>
                <Badge className={item.isActive ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}>
                  {item.isActive ? "Active" : "Blocked"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="link"
                    className="text-primary hover:text-blue-800 p-0 h-auto"
                    onClick={() => onEditItem(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="link"
                    className={`p-0 h-auto ${item.isActive ? "text-red-600 hover:text-red-800" : "text-green-600 hover:text-green-800"}`}
                    onClick={() => handleToggleItem(item.id)}
                    disabled={isLoading}
                  >
                    {item.isActive ? "Block" : "Activate"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
