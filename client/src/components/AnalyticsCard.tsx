import { Card, CardContent } from "@/components/ui/card";

interface AnalyticsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  color: string;
}

export default function AnalyticsCard({ title, value, subtitle, icon, color }: AnalyticsCardProps) {
  const getColorClasses = () => {
    const colors = {
      primary: "bg-primary text-primary-foreground",
      "chart-1": "bg-chart-1 text-white",
      "chart-2": "bg-chart-2 text-white", 
      "chart-3": "bg-chart-3 text-white",
      "chart-4": "bg-chart-4 text-white",
      "chart-5": "bg-chart-5 text-white",
    };
    return colors[color as keyof typeof colors] || "bg-primary text-primary-foreground";
  };

  return (
    <Card className="border-blue-100 shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold text-foreground" data-testid={`analytics-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-accent">{subtitle}</p>
            )}
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getColorClasses()}`}>
            <i className={`fas ${icon} text-sm`}></i>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
