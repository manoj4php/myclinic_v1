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
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">SEO Settings</h2>
        <p className="text-muted-foreground">Manage search engine optimization for all pages</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SEO Management</CardTitle>
        </CardHeader>
        <CardContent>
          <SEOSettings />
        </CardContent>
      </Card>
    </div>
  );
}