import { SEOSettings } from "@/components/SEOSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export default function SEOSettingsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect non-super-admin users to dashboard
  if (user?.role !== "super_admin") {
    setLocation("/");
    return null;
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50/50 to-white min-h-screen">
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div>
              <h1 className="text-lg font-bold text-gray-900">SEO Settings</h1>
            </div>
            <div className="text-xs text-gray-600">
              Search Engine Optimization Management
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      <Card className="border-blue-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">SEO Management</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <SEOSettings />
        </CardContent>
      </Card>
    </div>
  );
}