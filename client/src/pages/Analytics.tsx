import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AnalyticsCard from "@/components/AnalyticsCard";
import { useState } from "react";
import type { DashboardStats, SpecialtyData } from "@/types";
import { SEO } from "@/components/SEO";
import { SEOManager } from "@/components/SEOManager";
import { useAuth } from "@/hooks/useAuth";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("all");
  const [specialty, setSpecialty] = useState("all");
  const { user } = useAuth();

  const { data: seoConfig } = useQuery({
    queryKey: ["/api/seo-config/analytics"],
  });

  const handleSaveSEO = async (config: any) => {
    await fetch('/api/seo-config/analytics', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  };

  const { data: dashboardStats } = useQuery<DashboardStats>({
    queryKey: ["/api/analytics/dashboard-stats"],
  });

  const { data: specialtyData } = useQuery<SpecialtyData[]>({
    queryKey: ["/api/analytics/patient-count-by-specialty"],
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
    <div className="p-6" data-testid="analytics-view">
      <SEO
        title={seoConfig?.title || 'Analytics - ClinicConnect'}
        description={seoConfig?.description || 'View detailed analytics and insights for your clinical practice'}
        path="/analytics"
        {...seoConfig}
      />

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
        <p className="text-muted-foreground">Detailed insights and analytics for your clinic</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger data-testid="select-time-range">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="6months">6 Months</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Specialty</label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger data-testid="select-specialty-filter">
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specialties</SelectItem>
                  <SelectItem value="radiology">Radiology</SelectItem>
                  <SelectItem value="pediatric">Pediatric</SelectItem>
                  <SelectItem value="gynac">Gynecology</SelectItem>
                  <SelectItem value="medicines">General Medicine</SelectItem>
                  <SelectItem value="surgeon">Surgery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Medical Abbreviations</label>
              <Select>
                <SelectTrigger data-testid="select-medical-abbreviation">
                  <SelectValue placeholder="Filter by abbreviation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mr">MR - Magnetic Resonance</SelectItem>
                  <SelectItem value="cr">CR - Computed Radiography</SelectItem>
                  <SelectItem value="us">US - Ultrasound</SelectItem>
                  <SelectItem value="dx">DX - Diagnosis</SelectItem>
                  <SelectItem value="nm">NM - Nuclear Medicine</SelectItem>
                  <SelectItem value="pt">PT - Physical Therapy</SelectItem>
                  <SelectItem value="px">PX - Physical Examination</SelectItem>
                  <SelectItem value="mg">MG - Mammography</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <AnalyticsCard
          title="Total Patients"
          value={dashboardStats?.totalPatients || 0}
          subtitle={`${timeRange === 'all' ? 'All time' : 'Current period'}`}
          icon="fa-users"
          color="primary"
        />
        
        <AnalyticsCard
          title="New Patients"
          value={dashboardStats?.todayPatients || 0}
          subtitle={`${timeRange === 'today' ? 'Today' : 'This period'}`}
          icon="fa-user-plus"
          color="chart-1"
        />
        
        <AnalyticsCard
          title="Pending Reports"
          value={dashboardStats?.pendingReports || 0}
          subtitle="Awaiting review"
          icon="fa-file-medical"
          color="chart-2"
        />
        
        <AnalyticsCard
          title="Appointments"
          value={dashboardStats?.appointments || 0}
          subtitle="Scheduled"
          icon="fa-calendar-check"
          color="chart-4"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Distribution by Specialty */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Distribution by Specialty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {specialtyData?.map((item: SpecialtyData) => (
                <div 
                  key={item.specialty}
                  className={`flex items-center justify-between p-3 rounded-md ${specialtyColors[item.specialty as keyof typeof specialtyColors]} text-white`}
                >
                  <div className="flex items-center space-x-3">
                    <i className={`fas ${specialtyIcons[item.specialty as keyof typeof specialtyIcons]}`}></i>
                    <span className="font-medium capitalize">{item.specialty}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{item.count}</div>
                    <div className="text-xs opacity-90">
                      {specialtyData && ((item.count / specialtyData.reduce((sum: number, s: SpecialtyData) => sum + s.count, 0)) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-muted-foreground">
                  <i className="fas fa-chart-pie text-4xl mb-4 opacity-50"></i>
                  <p>No specialty data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Patient Satisfaction</span>
                  <span className="text-sm text-muted-foreground">95%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-accent h-2 rounded-full" style={{ width: '95%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Average Wait Time</span>
                  <span className="text-sm text-muted-foreground">12 min</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Report Completion Rate</span>
                  <span className="text-sm text-muted-foreground">88%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-chart-1 h-2 rounded-full" style={{ width: '88%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">System Uptime</span>
                  <span className="text-sm text-muted-foreground">99.9%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-chart-2 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
