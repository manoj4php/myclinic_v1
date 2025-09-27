import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import { SEOManager } from "@/components/SEOManager";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, PermissionGate } from "@/hooks/usePermissions";
import { Card, CardContent } from "@/components/ui/card";
import { exportToExcel } from "@/lib/exportUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useLocation } from "wouter";
import { 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  FileText, 
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Download,
  Search,
  Filter,
  RefreshCw,
  MonitorPlay,
  History,
  FileUp,
  Paperclip,
  MessageSquare,
  AlertTriangle,
  Clock,
  Info,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest as apiReq, queryClient } from "@/lib/queryClient";
import { EditPatientModal } from "@/components/EditPatientModal";
import AttachReportModal from "@/components/AttachReportModal";
import StudyInfoDialog from "@/components/StudyInfoDialog";
import { DICOMViewer } from "@/components/DICOMViewer";
import { DataTablePagination } from "@/components/DataTablePagination";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function PatientManagement() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { canPerformAction } = usePermissions();

  const { data: seoConfig } = useQuery({
    queryKey: ["/api/seo-config/patient-management"],
  });

  const handleSaveSEO = async (config: any) => {
    await apiReq('PUT', '/api/seo-config/patient-management', config);
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedModality, setSelectedModality] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null); // Single patient selection for toolbar
  const [showDICOMViewer, setShowDICOMViewer] = useState(false);
  const [selectedPatientForDICOM, setSelectedPatientForDICOM] = useState<any>(null);
  const [showAttachReportModal, setShowAttachReportModal] = useState(false);
  const [showStudyInfoDialog, setShowStudyInfoDialog] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const { toast } = useToast();

  // Keyboard navigation for selected patient
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedPatient) return;
      
      if (event.key === 'Escape') {
        setSelectedPatient(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedPatient]);

  // Delete patient mutation
  const deletePatientMutation = useMutation({
    mutationFn: async (patientId: string) => {
      await apiReq("DELETE", `/api/patients/${patientId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Success",
        description: "Patient deactivated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deactivate patient",
        variant: "destructive",
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (patientIds: string[]) => {
      await Promise.all(
        patientIds.map(id => apiReq("DELETE", `/api/patients/${id}`, {}))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Success",
        description: `${selectedPatients.length} patients deactivated successfully`,
      });
      setSelectedPatients([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deactivate patients",
        variant: "destructive",
      });
    },
  });

  // Patient Actions Mutations
  const createReportMutation = useMutation({
    mutationFn: async (patientId: string) => {
      // Navigate to report creation/editing page
      setLocation(`/patients/${patientId}/report`);
    },
    onSuccess: () => {
      toast({
        title: "Opening Report",
        description: "Navigating to report editor...",
      });
    },
  });

  const attachReportMutation = useMutation({
    mutationFn: async ({ patientId, file }: { patientId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'report');
      
      const response = await fetch(`/api/patients/${patientId}/files`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to attach report');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Success",
        description: "Report attached successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to attach report",
        variant: "destructive",
      });
    },
  });

  const attachDocumentMutation = useMutation({
    mutationFn: async ({ patientId, file }: { patientId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'document');
      
      const response = await fetch(`/api/patients/${patientId}/files`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to attach document');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Success",
        description: "Document attached successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to attach document",
        variant: "destructive",
      });
    },
  });

  const toggleEmergencyMutation = useMutation({
    mutationFn: async (patientId: string) => {
      const response = await apiReq("PATCH", `/api/patients/${patientId}/emergency`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Success",
        description: "Emergency status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update emergency status",
        variant: "destructive",
      });
    },
  });

  const { data: patientsResponse, isLoading } = useQuery({
    queryKey: ["/api/patients", { 
      page: currentPage, 
      limit: itemsPerPage, 
      search: (searchQuery && searchQuery.length >= 3) ? searchQuery : undefined,
      specialty: selectedSpecialty !== "all" ? selectedSpecialty : undefined 
    }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      
      if (searchQuery && searchQuery.length >= 3) params.append('search', searchQuery);
      if (selectedSpecialty !== "all") params.append('specialty', selectedSpecialty);
      
      const response = await apiReq("GET", `/api/patients?${params.toString()}`);
      return await response.json();
    },
  });

  const patients = patientsResponse?.data || [];
  const pagination = patientsResponse?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };

  // Fetch file counts for each patient using useQueries to avoid hooks violation
  const fileQueries = useQueries({
    queries: Array.isArray(patients) ? patients.map((patient: any) => ({
      queryKey: ["/api/patients", patient.id, "files"],
      enabled: !!patient.id,
    })) : []
  });

  const patientsWithFiles = Array.isArray(patients) ? patients.map((patient: any, index: number) => {
    const files = fileQueries[index]?.data || [];
    return { 
      ...patient, 
      files: Array.isArray(files) ? files : [],
      fileCount: Array.isArray(files) ? files.length : 0
    };
  }) : [];

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedPatients([]); // Clear selections when changing pages
    setSelectedPatient(null); // Clear selected patient
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
    setSelectedPatients([]); // Clear selections
    setSelectedPatient(null); // Clear selected patient
  };

  // Reset page when filters change
  const handleSearchChange = (newSearchQuery: string) => {
    setSearchQuery(newSearchQuery);
    // Only trigger search/filter when 3 or more characters are entered, or when clearing
    if (newSearchQuery.length >= 3 || newSearchQuery.length === 0) {
      setCurrentPage(1);
      setSelectedPatients([]);
      setSelectedPatient(null); // Clear selected patient
    }
  };

  const handleSpecialtyChange = (newSpecialty: string) => {
    setSelectedSpecialty(newSpecialty);
    setCurrentPage(1);
    setSelectedPatients([]);
    setSelectedPatient(null); // Clear selected patient
  };

  const handleExport = () => {
    if (!filteredPatients?.length) return;
    
    // Prepare data for export
    const exportData = filteredPatients.map((patient: any) => ({
      'Patient ID': patient.id,
      'Name': patient.name,
      'Email': patient.email,
      'Phone': patient.phone,
      'Emergency': patient.emergency ? 'Yes' : 'No',
      'Report Status': patient.reportStatus || 'pending',
      'Reported Type': patient.reportedType || patient.specialty || 'general',
      'Age': getAge(patient.dateOfBirth),
      'Gender': patient.gender,
      'Study Date': new Date(patient.createdAt).toLocaleDateString(),
      'Study Time': patient.studyTime || 'Not set',
      'Accession': patient.accession || 'Not assigned',
      'Study Description': patient.studyDesc || 'Not specified',
      'Modality': patient.modality || 'Not specified',
      'Files Count': patient.fileCount || 0,
      'Center': patient.center || 'Not specified',
      'Referred By': patient.refBy || 'Not specified',
      'Is Printed': patient.isPrinted ? 'Yes' : 'No',
      'Reported By': patient.reportedBy || 'Not reported'
    }));

    exportToExcel({
      data: exportData,
      filename: `patients-list-page${currentPage}-${new Date().toISOString().split('T')[0]}`,
      sheetName: `Patients Page ${currentPage}`,
      dateFields: ['Study Date']
    });
  };

  // DICOM file detection and handling functions
  const isDICOMFile = (fileName: string) => {
    const dicomExtensions = ['.dcm', '.dicom', '.dic'];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    const isDicomByExtension = dicomExtensions.includes(extension);
    const isDicomByName = fileName.toLowerCase().includes('dicom');
    // Also check for common DICOM file patterns (e.g., MRBRAIN files)
    const isDicomByPattern = /\.(dcm|dicom|dic)$/i.test(fileName) || 
                            /^(MR|CT|US|XR|RF|DX|CR|SC)[A-Z0-9_]+/i.test(fileName);
    return isDicomByExtension || isDicomByName || isDicomByPattern;
  };

  const getFileUrl = (file: any) => {
    if (!file.filePath) {
      return '';
    }
    
    // If filePath is already a full URL, use it as is
    if (file.filePath.startsWith('http')) {
      return file.filePath;
    }
    
    // If filePath starts with /api/, use it as is (for backward compatibility)
    if (file.filePath.startsWith('/api/')) {
      return `${window.location.origin}${file.filePath}`;
    }
    
    // For new storage system, construct the URL
    return `${window.location.origin}/api/files/${file.filePath}`;
  };

  const getDICOMFilesForPatient = (patient: any) => {
    if (!patient.files || !Array.isArray(patient.files)) return [];
    
    return patient.files
      .filter((file: any) => isDICOMFile(file.fileName))
      .map((file: any) => getFileUrl(file));
  };

  const openDICOMViewer = (patient: any) => {
    const dicomFiles = getDICOMFilesForPatient(patient);
    
    if (dicomFiles.length === 0) {
      toast({
        title: "No DICOM Files",
        description: "This patient has no DICOM files to view.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedPatientForDICOM(patient);
    setShowDICOMViewer(true);
  };

  const closeDICOMViewer = () => {
    setShowDICOMViewer(false);
    setSelectedPatientForDICOM(null);
  };

  const filteredPatients = patientsWithFiles?.filter((patient: any) => {
    // Search filter - only apply if 3 or more characters
    if (searchQuery && searchQuery.length >= 3) {
      const searchLower = searchQuery.toLowerCase();
      const matchesName = patient.name?.toLowerCase().includes(searchLower);
      const matchesPhone = patient.phone?.toLowerCase().includes(searchLower);
      const matchesEmail = patient.email?.toLowerCase().includes(searchLower);
      const matchesId = patient.id?.toLowerCase().includes(searchLower);
      if (!matchesName && !matchesPhone && !matchesEmail && !matchesId) return false;
    }
    
    // Specialty filter
    if (selectedSpecialty && selectedSpecialty !== "all") {
      if (patient.specialty !== selectedSpecialty) return false;
    }
    
    // Status filter
    if (selectedStatus && selectedStatus !== "all") {
      const isActive = selectedStatus === "active";
      if (patient.isActive !== isActive) return false;
    }

    // Modality filter
    if (selectedModality && selectedModality !== "all") {
      if (patient.modality !== selectedModality) return false;
    }
    
    // Date filter
    if (selectedDate) {
      const patientDate = new Date(patient.createdAt).toDateString();
      const filterDate = new Date(selectedDate).toDateString();
      if (patientDate !== filterDate) return false;
    }
    
    return true;
  });

  const getAge = (dateOfBirth: string) => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const getStatusBadge = (patient: any) => {
    if (!patient.isActive) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Inactive</Badge>;
    }
    if (patient.fileCount > 0) {
      return <Badge className="bg-green-100 text-green-700">Reported</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-700">Active</Badge>;
  };

  const getSpecialtyColor = (specialty: string) => {
    const colors = {
      radiology: "bg-blue-50 text-blue-700 border-blue-200",
      pediatric: "bg-green-50 text-green-700 border-green-200", 
      gynac: "bg-pink-50 text-pink-700 border-pink-200",
      medicines: "bg-purple-50 text-purple-700 border-purple-200",
      surgeon: "bg-red-50 text-red-700 border-red-200",
    };
    return colors[specialty as keyof typeof colors] || "bg-gray-50 text-gray-700 border-gray-200";
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPatients(filteredPatients?.map((p: any) => p.id) || []);
    } else {
      setSelectedPatients([]);
    }
  };

  const handleSelectPatient = (patientId: string, checked: boolean) => {
    if (checked) {
      setSelectedPatients(prev => [...prev, patientId]);
    } else {
      setSelectedPatients(prev => prev.filter(id => id !== patientId));
    }
  };

  const handleDeletePatient = (patientId: string, patientName: string) => {
    if (window.confirm(`Are you sure you want to deactivate ${patientName}? This patient will be marked as inactive but data will be preserved.`)) {
      deletePatientMutation.mutate(patientId);
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to deactivate ${selectedPatients.length} patient(s)? They will be marked as inactive but data will be preserved.`)) {
      bulkDeleteMutation.mutate(selectedPatients);
    }
  };

  // Patient Actions Toolbar Component
  const PatientActionsToolbar = () => {
    if (!selectedPatient) return null;

    const handleFileUpload = (type: 'report' | 'document') => {
      if (type === 'report') {
        setShowAttachReportModal(true);
      } else {
        // Navigate to Attach Document page
        setLocation(`/patients/${selectedPatient.id}/attach-document`);
      }
    };

    const handleComments = () => {
      // Navigate to comments page
      setLocation(`/patients/${selectedPatient.id}/comments`);
    };

    const handleTimeline = () => {
      // Navigate to timeline view
      setLocation(`/patients/${selectedPatient.id}/timeline`);
    };

    const handleStudyInfo = () => {
      // Open study info dialog
      setShowStudyInfoDialog(true);
    };

    return (
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 rounded-lg mb-2 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold">Patient Actions</h3>
            <div className="text-xs opacity-90">
              <span className="font-medium">{selectedPatient.name}</span>
              <span className="mx-1">•</span>
              <span>ID: {selectedPatient.id.slice(0, 8)}</span>
              <span className="mx-1">•</span>
              <span>{selectedPatient.modality || 'N/A'}</span>
              <span className="mx-1">•</span>
              <span>{new Date(selectedPatient.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPatient(null)}
            className="text-white hover:bg-white/20 h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => createReportMutation.mutate(selectedPatient.id)}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-7 px-2 text-xs"
                  disabled={createReportMutation.isPending}
                >
                  <FileUp className="w-3 h-3 mr-1" />
                  New Report
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create a new report for this patient</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleFileUpload('report')}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-7 px-2 text-xs"
                  disabled={attachReportMutation.isPending}
                >
                  <Paperclip className="w-3 h-3 mr-1" />
                  Attach Report
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Upload and attach a report file</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleFileUpload('document')}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-7 px-2 text-xs"
                  disabled={attachDocumentMutation.isPending}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Attach Document
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Upload and attach supporting documents</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleComments}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-7 px-2 text-xs"
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Comments
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View and add comments for this patient</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toggleEmergencyMutation.mutate(selectedPatient.id)}
                  className={`border-white/20 h-7 px-2 text-xs ${
                    selectedPatient.emergency
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  disabled={toggleEmergencyMutation.isPending}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Emergency
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{selectedPatient.emergency ? 'Remove emergency flag' : 'Mark as emergency'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleTimeline}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-7 px-2 text-xs"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Timeline
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View patient timeline and history</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleStudyInfo}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-7 px-2 text-xs"
                >
                  <Info className="w-3 h-3 mr-1" />
                  Study Info
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View detailed study information</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span className="text-lg text-muted-foreground">Loading patient data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50/50 to-white min-h-screen" data-testid="patients-view">
      <SEO
        title={(seoConfig as any)?.title || 'Patient Management - ClinicConnect'}
        description={(seoConfig as any)?.description || 'Manage and view patient records, medical studies, and clinical data'}
        path="/patient-management"
        {...(seoConfig || {})}
      />

      {/* Header Section */}
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Patient Worklist</h1>
            </div>
            <div className="text-xs text-gray-600">
              Medical Records & Study Management System
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span className="flex items-center space-x-1">
                <User className="w-3 h-3" />
                <span>Total: {pagination.total || 0} patients</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>Today: {new Date().toLocaleDateString()}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 px-2"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <PermissionGate module="patients" action="export">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                      className="h-8 px-2"
                      data-testid="button-export-patients"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export to Excel</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </PermissionGate>
            <PermissionGate module="patients" action="add">
              <Button 
                onClick={() => setLocation("/add-patient")}
                size="sm"
                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-xs"
                data-testid="button-add-patient"
              >
                <Plus className="w-3 h-3 mr-1" />
                <span>New Patient</span>
              </Button>
            </PermissionGate>
          </div>
        </div>
      </div>

      {/* Advanced Filter Section */}
      <Card className="mb-4 border-blue-100 shadow-sm">
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
              <Input
                type="text"
                placeholder="Search by name, ID, phone... (min 3 chars)"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-8 text-sm w-full"
                data-testid="input-search-patients"
              />
            </div>
            
            <Select value={selectedSpecialty} onValueChange={handleSpecialtyChange}>
              <SelectTrigger data-testid="select-specialty" className="h-8 text-sm">
                <SelectValue placeholder="All Specialties" />
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
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger data-testid="select-status" className="h-8 text-sm">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedModality} onValueChange={setSelectedModality}>
              <SelectTrigger data-testid="select-modality" className="h-8 text-sm">
                <SelectValue placeholder="All Modalities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modalities</SelectItem>
                <SelectItem value="CT">CT Scan</SelectItem>
                <SelectItem value="MRI">MRI</SelectItem>
                <SelectItem value="X-RAY">X-Ray</SelectItem>
                <SelectItem value="ULTRASOUND">Ultrasound</SelectItem>
                <SelectItem value="MAMMOGRAPHY">Mammography</SelectItem>
                <SelectItem value="NUCLEAR">Nuclear Medicine</SelectItem>
                <SelectItem value="PET">PET Scan</SelectItem>
                <SelectItem value="FLUOROSCOPY">Fluoroscopy</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 text-sm"
              data-testid="input-filter-date"
            />

            <Button 
              variant="outline" 
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => {
                handleSearchChange("");
                handleSpecialtyChange("all");
                setSelectedStatus("all");
                setSelectedModality("all");
                setSelectedDate("");
                setSelectedPatient(null);
              }}
            >
              <Filter className="w-3 h-3 mr-1" />
              <span>Clear</span>
            </Button>

            {selectedPatients.length > 0 && (
              <PermissionGate module="patients" action="delete">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 px-3 text-xs text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                  data-testid="button-bulk-delete"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  <span>
                  {bulkDeleteMutation.isPending ? 'Deactivating...' : `Delete (${selectedPatients.length})`}
                </span>
              </Button>
              </PermissionGate>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Patient Actions Toolbar */}
      <PatientActionsToolbar />

      {/* Medical Worklist Table */}
      <Card className="shadow-md border-blue-100">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2 rounded-t-lg">
          <h2 className="text-sm font-semibold flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Patient Study Worklist</span>
          </h2>
        </div>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-blue-50">
                <TableRow className="border-blue-100 h-10">
                  <TableHead className="w-10 py-2">
                    <Checkbox
                      checked={selectedPatients.length === filteredPatients?.length && filteredPatients.length > 0}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all"
                      className="w-4 h-4"
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-blue-900 text-xs py-2">Action</TableHead>
                  <TableHead className="font-semibold text-blue-900 text-xs py-2">Emergency</TableHead>
                  <TableHead className="font-semibold text-blue-900 text-xs py-2">Report Status</TableHead>
                  <TableHead className="font-semibold text-blue-900 text-xs py-2">Reported Type</TableHead>
                  <TableHead className="font-semibold text-blue-900 text-xs py-2">Patient Id</TableHead>
                  <TableHead className="font-semibold text-blue-900 text-xs py-2">Patient Name</TableHead>
                  <TableHead className="font-semibold text-blue-900 text-xs py-2">Age</TableHead>
                  <TableHead className="font-semibold text-blue-900 text-xs py-2">Sex</TableHead>
                  <TableHead className="font-semibold text-blue-900 text-xs py-2">Study Date</TableHead>
                  <TableHead className="font-semibold text-blue-900 text-xs py-2">Study Time</TableHead>
                  <TableHead className="font-semibold text-blue-900 text-xs py-2">Ref by</TableHead>
                  <TableHead className="font-semibold text-blue-900 text-xs py-2">Accession</TableHead>
                  <TableHead className="font-semibold text-blue-900 text-xs py-2">Study Desc</TableHead>
                  <TableHead className="font-semibold text-blue-900 text-xs py-2">Modality</TableHead>
                  <TableHead className="font-semibold text-blue-900 text-xs py-2">Images</TableHead>
                  <TableHead className="font-semibold text-blue-900 text-xs py-2">Center</TableHead>
                  <TableHead className="font-semibold text-blue-900 text-xs py-2">Is Printed</TableHead>
                  <TableHead className="font-semibold text-blue-900 text-xs py-2">Reported by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients?.length > 0 ? (
                  filteredPatients.map((patient: any, index: number) => (
                    <TableRow 
                      key={patient.id} 
                      className={`
                        hover:bg-blue-50/50 transition-colors cursor-pointer h-10
                        ${selectedPatients.includes(patient.id) ? 'bg-blue-50' : ''}
                        ${selectedPatient?.id === patient.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}
                        ${index % 2 === 0 ? 'bg-gray-50/30' : ''}
                      `}
                      onClick={() => setSelectedPatient(patient)}
                      data-testid={`patient-row-${patient.id}`}
                    >
                      <TableCell className="py-1">
                        <Checkbox
                          checked={selectedPatients.includes(patient.id)}
                          onCheckedChange={(checked) => handleSelectPatient(patient.id, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`checkbox-patient-${patient.id}`}
                          className="w-4 h-4"
                        />
                      </TableCell>
                      
                      <TableCell className="px-1 py-1">
                        <div className="flex items-center space-x-0.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/patients/${patient.id}`);
                            }}
                            data-testid={`button-view-${patient.id}`}
                            title="View Patient Details"
                            className="h-6 w-6 p-0"
                          >
                            <Eye className="w-3 h-3 text-blue-600" />
                          </Button>
                          
                          {/* Patient History Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              // For now, navigate to patient details. Can be modified to open history modal later
                              setLocation(`/patients/${patient.id}/history`);
                            }}
                            data-testid={`button-history-${patient.id}`}
                            title="View Patient History"
                            className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          >
                            <History className="w-3 h-3" />
                          </Button>
                          
                          {/* DICOM Viewer Button - only show if patient has DICOM files */}
                          {getDICOMFilesForPatient(patient).length > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDICOMViewer(patient);
                              }}
                              data-testid={`button-dicom-${patient.id}`}
                              title={`View DICOM Files (${getDICOMFilesForPatient(patient).length})`}
                              className="h-6 w-6 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            >
                              <MonitorPlay className="w-3 h-3" />
                            </Button>
                          )}
                          <PermissionGate module="patients" action="edit">
                            <EditPatientModal
                              patient={patient}
                              trigger={
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  data-testid={`button-edit-${patient.id}`}
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit className="w-3 h-3 text-green-600" />
                                </Button>
                              }
                            />
                          </PermissionGate>
                          <PermissionGate module="patients" action="delete">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePatient(patient.id, patient.name);
                              }}
                              disabled={deletePatientMutation.isPending}
                              data-testid={`button-delete-${patient.id}`}
                              title="Deactivate patient (soft delete)"
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </Button>
                          </PermissionGate>
                        </div>
                      </TableCell>

                      <TableCell className="py-1">
                        {patient.emergency ? (
                          <Badge className="bg-red-500 text-white border-red-600 text-xs px-1 py-0">
                            Emergency
                          </Badge>
                        ) : (
                          <span className="text-gray-500 text-xs">Normal</span>
                        )}
                      </TableCell>

                      <TableCell className="py-1">
                        <Badge 
                          className={`${
                            patient.reportStatus === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                            patient.reportStatus === 'reviewed' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            'bg-yellow-100 text-yellow-800 border-yellow-200'
                          } capitalize text-xs px-1 py-0`}
                        >
                          {patient.reportStatus || 'pending'}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-1">
                        <Badge className="bg-green-100 text-green-800 border-green-200 capitalize text-xs px-1 py-0">
                          {patient.reportedType || patient.specialty || 'general'}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-mono text-xs text-blue-600 py-1">
                        {patient.id.slice(-8).toUpperCase()}
                      </TableCell>

                      <TableCell className="py-1">
                        <div className="font-semibold text-gray-900 text-sm" data-testid={`text-patient-name-${patient.id}`}>
                          {patient.name}
                        </div>
                      </TableCell>

                      <TableCell className="py-1">
                        <div className="text-xs font-medium">{getAge(patient.dateOfBirth)}Y</div>
                      </TableCell>

                      <TableCell className="py-1">
                        <div className="text-xs text-gray-600 capitalize">{patient.gender}</div>
                      </TableCell>

                      <TableCell className="py-1">
                        <div className="text-xs">
                          <div className="font-medium">{new Date(patient.createdAt).toLocaleDateString()}</div>
                        </div>
                      </TableCell>

                      <TableCell className="py-1">
                        <div className="text-xs text-gray-600">
                          {patient.studyTime ? new Date(`2000-01-01T${patient.studyTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : 'Not set'}
                        </div>
                      </TableCell>

                      <TableCell className="py-1">
                        <div className="text-xs text-gray-600">
                          {patient.refBy || 'Not specified'}
                        </div>
                      </TableCell>

                      <TableCell className="py-1">
                        <div className="text-xs font-mono text-gray-600">
                          {patient.accession || 'Not assigned'}
                        </div>
                      </TableCell>

                      <TableCell className="py-1">
                        <div className="text-xs text-gray-600 max-w-32 truncate">
                          {patient.studyDesc || 'Not specified'}
                        </div>
                      </TableCell>

                      <TableCell className="py-1">
                        <div className="text-xs text-gray-600">
                          {patient.modality || 'Not specified'}
                        </div>
                      </TableCell>

                      <TableCell className="py-1">
                        <div className="flex items-center space-x-1">
                          <div className="text-xs font-medium text-blue-600">
                            {patient.fileCount || 0}
                          </div>
                          {patient.fileCount > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/patients/${patient.id}`);
                              }}
                              className={`h-5 w-5 p-0 ${patient.specialty === 'radiology' ? 'bg-blue-50 hover:bg-blue-100' : ''}`}
                              data-testid={`button-files-${patient.id}`}
                              title="View all files"
                            >
                              {patient.specialty === 'radiology' ? (
                                <MonitorPlay className="w-3 h-3 text-blue-600" />
                              ) : (
                                <FileText className="w-3 h-3 text-blue-600" />
                              )}
                            </Button>
                          )}
                          
                          {/* Show DICOM file count if any */}
                          {(() => {
                            const dicomCount = getDICOMFilesForPatient(patient).length;
                            if (dicomCount > 0) {
                              return (
                                <Badge className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5">
                                  {dicomCount} DICOM
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                          
                          {patient.specialty === 'radiology' && patient.fileCount > 0 && (
                            <Badge className="bg-green-100 text-green-800 text-xs px-1 py-0">
                              Medical
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-1">
                        <div className="text-xs text-gray-600">
                          {patient.center || 'Not specified'}
                        </div>
                      </TableCell>

                      <TableCell className="py-1">
                        {patient.isPrinted ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs px-1 py-0">
                            Printed
                          </Badge>
                        ) : (
                          <span className="text-gray-500 text-xs">Not printed</span>
                        )}
                      </TableCell>

                      <TableCell className="py-1">
                        <div className="text-xs text-gray-600">
                          {patient.reportedBy ? 'Dr. Reported' : 'Not reported'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={19} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2 text-gray-500">
                        <FileText className="w-8 h-8" />
                        <div className="text-base font-medium">No patients found</div>
                        <div className="text-xs">Try adjusting your search filters or add a new patient</div>
                        <Button 
                          onClick={() => setLocation("/add-patient")}
                          className="mt-4"
                          data-testid="button-add-first-patient"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add First Patient
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          <DataTablePagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </CardContent>
      </Card>

      {/* DICOM Viewer Modal */}
      {showDICOMViewer && selectedPatientForDICOM && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg max-w-7xl max-h-full w-full h-full m-4 flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <h3 className="text-lg font-semibold" data-testid="dicom-viewer-title">
                DICOM Viewer: {selectedPatientForDICOM.name} ({getDICOMFilesForPatient(selectedPatientForDICOM).length} files)
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeDICOMViewer}
                data-testid="button-close-dicom-viewer"
              >
                ✕
              </Button>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              <DICOMViewer
                imageUrls={getDICOMFilesForPatient(selectedPatientForDICOM)}
                isDICOM={true}
                onClose={closeDICOMViewer}
                patientInfo={{
                  name: selectedPatientForDICOM.name || 'Unknown Patient',
                  id: selectedPatientForDICOM.id || '',
                  age: selectedPatientForDICOM.dateOfBirth ? new Date().getFullYear() - new Date(selectedPatientForDICOM.dateOfBirth).getFullYear() : 'Unknown',
                  sex: selectedPatientForDICOM.gender || 'Unknown'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Attach Report Modal - Handled by toolbar actions */}

      {/* Study Info Dialog */}
      {showStudyInfoDialog && selectedPatient && (
        <StudyInfoDialog
          open={showStudyInfoDialog}
          onClose={() => setShowStudyInfoDialog(false)}
          patientId={selectedPatient.id}
          patient={selectedPatient}
        />
      )}
    </div>
  );
}