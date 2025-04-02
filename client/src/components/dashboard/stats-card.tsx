import { Card, CardContent } from "@/components/ui/card";
import { Banknote, Receipt, Utensils, TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  subtext?: string;
  icon: 'sales' | 'orders' | 'item';
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatsCard({ title, value, subtext, icon, trend }: StatsCardProps) {
  const getIcon = () => {
    switch (icon) {
      case 'sales':
        return <Banknote className="text-primary h-5 w-5" />;
      case 'orders':
        return <Receipt className="text-primary h-5 w-5" />;
      case 'item':
        return <Utensils className="text-primary h-5 w-5" />;
      default:
        return <Banknote className="text-primary h-5 w-5" />;
    }
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-700">{title}</h3>
          {getIcon()}
        </div>
        
        <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        
        {(trend || subtext) && (
          <p className={`text-sm mt-1 ${trend ? (trend.isPositive ? 'text-green-600' : 'text-red-600') : 'text-gray-600'}`}>
            {trend && (
              <span className="inline-flex items-center">
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {trend.value}
              </span>
            )}
            {!trend && subtext && subtext}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
