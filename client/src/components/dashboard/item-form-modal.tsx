import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MenuItem, ItemCategory } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface ItemFormModalProps {
  item?: MenuItem;
  isOpen: boolean;
  onClose: () => void;
}

export function ItemFormModal({ item, isOpen, onClose }: ItemFormModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { data: categories, isLoading: isCategoriesLoading } = useQuery<ItemCategory[]>({
    queryKey: ["/api/categories"],
  });
  
  const createMutation = useMutation({
    mutationFn: async (newItem: { name: string, price: string, categoryId: number }) => {
      const res = await apiRequest("POST", "/api/menu-items", {
        name: newItem.name,
        price: newItem.price,
        categoryId: newItem.categoryId,
        isActive: true,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({
        title: "Item created",
        description: "The menu item has been created successfully.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Create failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async (updatedItem: { id: number, name: string, price: string, categoryId: number }) => {
      const res = await apiRequest("PUT", `/api/menu-items/${updatedItem.id}`, {
        name: updatedItem.name,
        price: updatedItem.price,
        categoryId: updatedItem.categoryId,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({
        title: "Item updated",
        description: "The menu item has been updated successfully.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  useEffect(() => {
    if (isOpen) {
      if (item) {
        setName(item.name);
        setPrice(String(item.price));
        setCategoryId(String(item.categoryId));
      } else {
        setName("");
        setPrice("");
        setCategoryId(categories && categories.length > 0 ? String(categories[0].id) : "");
      }
      setErrors({});
    }
  }, [isOpen, item, categories]);
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = "Name is required";
    }
    
    if (!price) {
      newErrors.price = "Price is required";
    } else if (isNaN(Number(price)) || Number(price) <= 0) {
      newErrors.price = "Price must be a positive number";
    }
    
    if (!categoryId) {
      newErrors.categoryId = "Category is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = () => {
    if (!validateForm()) return;
    
    if (item) {
      updateMutation.mutate({
        id: item.id,
        name,
        price,
        categoryId: Number(categoryId),
      });
    } else {
      createMutation.mutate({
        name,
        price,
        categoryId: Number(categoryId),
      });
    }
  };
  
  const isLoading = createMutation.isPending || updateMutation.isPending || isCategoriesLoading;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Menu Item" : "Add New Menu Item"}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Item Name</Label>
              <Input
                id="item-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={errors.name ? "border-red-500" : ""}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="item-price">Price (₹)</Label>
              <Input
                id="item-price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={errors.price ? "border-red-500" : ""}
                disabled={isLoading}
              />
              {errors.price && (
                <p className="text-xs text-red-500">{errors.price}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="item-category">Category</Label>
              {isCategoriesLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading categories...</span>
                </div>
              ) : (
                <>
                  <Select
                    value={categoryId}
                    onValueChange={setCategoryId}
                    disabled={isLoading || !categories || categories.length === 0}
                  >
                    <SelectTrigger className={errors.categoryId ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.categoryId && (
                    <p className="text-xs text-red-500">{errors.categoryId}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {item ? "Update Item" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
