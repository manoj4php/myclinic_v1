import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export default function Reports() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedType, setSelectedType] = useState("");

  // This would fetch actual reports data
  const { data: reports, isLoading } = useQuery({
    queryKey: ["/api/reports"],
    queryFn: async () => {
      // Mock data for now since reports endpoint doesn't exist yet
      return [];
    },
  });

  const handleExportToExcel = () => {
    // Implementation for Excel export
    console.log("Exporting to Excel...");
  };

  const handleExportToCSV = () => {
    // Implementation for CSV export
    console.log("Exporting to CSV...");
  };

  const handleGenerateReport = () => {
    // Implementation for generating new report
    console.log("Generating new report...");
  };

  return (
    <div className="p-6" data-testid="reports-view">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Medical Reports</h2>
          <p className="text-muted-foreground">View, generate, and export patient reports</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={handleExportToExcel}
            data-testid="button-export-excel"
          >
            <i className="fas fa-file-excel mr-2"></i>
            Export Excel
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportToCSV}
            data-testid="button-export-csv"
          >
            <i className="fas fa-file-csv mr-2"></i>
            Export CSV
          </Button>
          <Button onClick={handleGenerateReport} data-testid="button-generate-report">
            <i className="fas fa-plus mr-2"></i>
            Generate Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-reports"
            />
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger data-testid="select-report-type">
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="radiology">Radiology Report</SelectItem>
                <SelectItem value="lab">Lab Report</SelectItem>
                <SelectItem value="pathology">Pathology Report</SelectItem>
                <SelectItem value="discharge">Discharge Summary</SelectItem>
                <SelectItem value="consultation">Consultation Note</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger data-testid="select-report-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              type="date"
              data-testid="input-report-date"
            />
          </div>
        </CardContent>
      </Card>

      {/* Report Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <i className="fas fa-x-ray text-primary-foreground"></i>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Radiology Report</h3>
                <p className="text-sm text-muted-foreground">Standard radiology report template</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-chart-1 rounded-full flex items-center justify-center">
                <i className="fas fa-flask text-white"></i>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Lab Report</h3>
                <p className="text-sm text-muted-foreground">Laboratory test results template</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-chart-2 rounded-full flex items-center justify-center">
                <i className="fas fa-microscope text-white"></i>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Pathology Report</h3>
                <p className="text-sm text-muted-foreground">Pathology examination template</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border border-border rounded">
                  <div className="h-10 w-10 bg-muted rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-3 bg-muted rounded w-1/6"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : reports?.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report: any) => (
                <div key={report.id} className="flex items-center justify-between p-4 border border-border rounded hover:bg-muted/50">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <i className="fas fa-file-medical text-primary-foreground"></i>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{report.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Patient: {report.patientName} • {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>
                      {report.status}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <i className="fas fa-eye"></i>
                    </Button>
                    <Button variant="ghost" size="sm">
                      <i className="fas fa-download"></i>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <i className="fas fa-file-medical text-4xl text-muted-foreground mb-4"></i>
              <h3 className="text-lg font-medium text-foreground mb-2">No Reports Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedType || selectedStatus 
                  ? "No reports match your current filters." 
                  : "Start by generating your first report."}
              </p>
              <Button onClick={handleGenerateReport}>
                <i className="fas fa-plus mr-2"></i>
                Generate Report
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
