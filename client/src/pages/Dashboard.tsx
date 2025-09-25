import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AnalyticsCard from "@/components/AnalyticsCard";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { SEOManager } from "@/components/SEOManager";
import { apiRequest } from "@/lib/queryClient";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: seoConfig } = useQuery({
    queryKey: ["/api/seo-config/dashboard"],
  });

  const handleSaveSEO = async (config: any) => {
    await apiRequest('PUT', '/api/seo-config/dashboard', config);
  };

  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/analytics/dashboard-stats"],
  });

  const { data: specialtyData } = useQuery({
    queryKey: ["/api/analytics/patient-count-by-specialty"],
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["/api/analytics/recent-activity"],
  });

  const { data: recentPatients } = useQuery({
    queryKey: ["/api/patients"],
  });

  const specialtyColors = {
    radiology: "specialty-radiology",
    pediatric: "specialty-pediatric", 
    gynac: "specialty-gynac",
    medicines: "specialty-medicines",
    surgeon: "specialty-surgeon"
  };

  const specialtyIcons = {
    radiology: "fa-x-ray",
    pediatric: "fa-baby",
    gynac: "fa-female",
    medicines: "fa-pills",
    surgeon: "fa-scalpel"
  };

  return (
    <div className="p-6" data-testid="dashboard-view">
      <SEO
        title={seoConfig?.title || 'Dashboard - ClinicConnect'}
        description={seoConfig?.description || 'Your clinical practice dashboard showing patient statistics and recent activity'}
        path="/dashboard"
        {...seoConfig}
      />

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <AnalyticsCard
          title="Total Patients"
          value={(dashboardStats as any)?.totalPatients || 0}
          subtitle="+12 this week"
          icon="fa-users"
          color="primary"
        />
        
        <AnalyticsCard
          title="Today's Patients"
          value={(dashboardStats as any)?.todayPatients || 0}
          subtitle="+3 from yesterday"
          icon="fa-calendar-day"
          color="chart-1"
        />
        
        <AnalyticsCard
          title="Pending Reports"
          value={(dashboardStats as any)?.pendingReports || 0}
          subtitle="2 urgent"
          icon="fa-file-medical"
          color="chart-2"
        />
        
        <AnalyticsCard
          title="Appointments"
          value={(dashboardStats as any)?.appointments || 0}
          subtitle="Next: 3:00 PM"
          icon="fa-clock"
          color="chart-4"
        />
      </div>
      
      {/* Specialty Analytics and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Patient Distribution by Specialty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.isArray(specialtyData) && specialtyData.map((item: any) => (
                <div 
                  key={item.specialty}
                  className={`flex items-center justify-between p-3 rounded-md ${specialtyColors[item.specialty as keyof typeof specialtyColors]} text-white`}
                >
                  <div className="flex items-center space-x-3">
                    <i className={`fas ${specialtyIcons[item.specialty as keyof typeof specialtyIcons]}`}></i>
                    <span className="font-medium capitalize">{item.specialty}</span>
                  </div>
                  <span className="font-bold">{item.count} patients</span>
                </div>
              )) || (
                <div className="text-center py-4 text-muted-foreground">
                  No patient data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.isArray(recentActivity) && recentActivity.slice(0, 5).map((activity: any, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 hover:bg-muted rounded-md">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-user-plus text-xs text-primary-foreground"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )) || (
                <div className="text-center py-4 text-muted-foreground">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Patients Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Patients</CardTitle>
            <a href="/patients" className="text-primary hover:text-primary/80 text-sm font-medium">
              View All Patients
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {Array.isArray(recentPatients) && recentPatients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Patient</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Age</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Specialty</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Last Visit</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentPatients as any[]).slice(0, 5).map((patient: any) => {
                    const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
                    const initials = patient.name.split(' ').map((n: string) => n[0]).join('');
                    
                    return (
                      <tr key={patient.id} className="border-b border-border hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-primary-foreground">{initials}</span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{patient.name}</p>
                              <p className="text-sm text-muted-foreground">{patient.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-foreground">{age}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground capitalize">
                            {patient.specialty}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(patient.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent text-accent-foreground">
                            {patient.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <i className="fas fa-users text-4xl mb-4 opacity-50"></i>
              <p>No patients found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
