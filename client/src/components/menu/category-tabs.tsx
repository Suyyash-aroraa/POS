import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { ItemCategory } from "@shared/schema";

interface CategoryTabsProps {
  onSelectCategory: (categoryId: number) => void;
  selectedCategoryId?: number;
}

export function CategoryTabs({ onSelectCategory, selectedCategoryId }: CategoryTabsProps) {
  const { data: categories, isLoading, error } = useQuery<ItemCategory[]>({
    queryKey: ["/api/categories"],
  });
  
  useEffect(() => {
    if (categories && categories.length > 0 && !selectedCategoryId) {
      // Auto-select first category if none is selected
      onSelectCategory(categories[0].id);
    }
  }, [categories, selectedCategoryId, onSelectCategory]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error || !categories) {
    return (
      <div className="text-center py-4 text-red-500">
        Error loading categories
      </div>
    );
  }
  
  return (
    <div className="bg-white border-b border-gray-200">
      <ScrollArea className="w-full">
        <nav className="flex space-x-2 p-4">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={category.id === selectedCategoryId ? "default" : "outline"}
              className="whitespace-nowrap"
              onClick={() => onSelectCategory(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </nav>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
