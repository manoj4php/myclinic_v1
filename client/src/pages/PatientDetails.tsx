import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { UploadResult } from "@uppy/core";
import { ArrowLeft, Calendar, Mail, Phone, MapPin, User, Stethoscope, FileText, Upload, Eye, Image as ImageIcon, MonitorPlay } from "lucide-react";
import { DICOMViewer } from "@/components/DICOMViewer";

export default function PatientDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [showDICOMViewer, setShowDICOMViewer] = useState(false);

  // Fetch patient details
  const { data: patient, isLoading: isPatientLoading } = useQuery({
    queryKey: ["/api/patients", id],
    enabled: !!id,
  });

  // Fetch patient files
  const { data: patientFiles, isLoading: isFilesLoading } = useQuery({
    queryKey: ["/api/patients", id, "files"],
    enabled: !!id,
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful) {
      const newFileURLs = result.successful.map(file => file.uploadURL).filter((url): url is string => url !== undefined);
      setUploadedFiles(prev => [...prev, ...newFileURLs]);
    }
  };

  const uploadFilesMutation = useMutation({
    mutationFn: async (fileURLs: string[]) => {
      for (const fileURL of fileURLs) {
        const fileName = fileURL.split('/').pop() || 'upload';
        await apiRequest("PUT", "/api/patient-files", {
          patientId: id,
          fileName,
          fileURL,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", id, "files"] });
      setUploadedFiles([]);
      toast({
        title: "Success",
        description: "Files uploaded successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveFiles = () => {
    if (uploadedFiles.length > 0) {
      uploadFilesMutation.mutate(uploadedFiles);
    }
  };

  const openFileViewer = (file: any) => {
    setSelectedFile(file);
    setShowDICOMViewer(true);
  };

  const closeFileViewer = () => {
    setShowDICOMViewer(false);
    setSelectedFile(null);
  };

  const isDICOMFile = (fileName: string) => {
    const dicomExtensions = ['.dcm', '.dicom', '.dic'];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    const isDicomByExtension = dicomExtensions.includes(extension);
    const isDicomByName = fileName.toLowerCase().includes('dicom');
    return isDicomByExtension || isDicomByName;
  };

  const isRadiologyImage = (fileName: string) => {
    const radiologyTerms = ['xray', 'ct', 'mri', 'scan', 'ultrasound'];
    return radiologyTerms.some(term => fileName.toLowerCase().includes(term));
  };

  const getFileIcon = (fileName: string) => {
    if (isDICOMFile(fileName)) {
      return <MonitorPlay className="w-5 h-5 text-blue-600" />;
    }
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(extension)) {
      return <ImageIcon className="w-5 h-5 text-green-600" />;
    }
    return <FileText className="w-5 h-5 text-gray-600" />;
  };

  if (isPatientLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto" data-testid="patient-details-loading">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-48 bg-muted rounded"></div>
            </div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-center" data-testid="patient-not-found">
        <div className="py-12">
          <h2 className="text-2xl font-bold text-foreground mb-2">Patient Not Found</h2>
          <p className="text-muted-foreground mb-4">The patient you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => setLocation("/patients")} data-testid="button-back-to-patients">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Patients
          </Button>
        </div>
      </div>
    );
  }

  const age = new Date().getFullYear() - new Date((patient as any).dateOfBirth).getFullYear();
  const formattedDate = new Date((patient as any).dateOfBirth).toLocaleDateString();
  const specialtyColors = {
    radiology: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    pediatric: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    gynac: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    medicines: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    surgeon: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto" data-testid="patient-details-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/patients")}
            data-testid="button-back-patients"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Patients
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-patient-name">{(patient as any).name}</h1>
            <p className="text-muted-foreground">Patient ID: {(patient as any).id.slice(-8)}</p>
          </div>
        </div>
        <Badge 
          className={`${specialtyColors[(patient as any).specialty as keyof typeof specialtyColors] || 'bg-gray-100 text-gray-800'}`}
          data-testid="badge-specialty"
        >
          {(patient as any).specialty.charAt(0).toUpperCase() + (patient as any).specialty.slice(1)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3" data-testid="info-phone">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{(patient as any).phone}</p>
                    </div>
                  </div>
                  
                  {(patient as any).email && (
                    <div className="flex items-center space-x-3" data-testid="info-email">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{(patient as any).email}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3" data-testid="info-dob">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Birth</p>
                      <p className="font-medium">{formattedDate} (Age {age})</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3" data-testid="info-gender">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Gender</p>
                      <p className="font-medium capitalize">{(patient as any).gender}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3" data-testid="info-specialty">
                    <Stethoscope className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Specialty</p>
                      <p className="font-medium capitalize">{(patient as any).specialty}</p>
                    </div>
                  </div>
                  
                  {(patient as any).address && (
                    <div className="flex items-center space-x-3" data-testid="info-address">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium">{(patient as any).address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medical Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Medical Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(patient as any).chiefComplaint && (
                <div data-testid="info-chief-complaint">
                  <h4 className="font-medium text-foreground mb-2">Chief Complaint</h4>
                  <p className="text-muted-foreground bg-muted p-3 rounded-md">{(patient as any).chiefComplaint}</p>
                </div>
              )}
              
              {(patient as any).medicalHistory && (
                <div data-testid="info-medical-history">
                  <h4 className="font-medium text-foreground mb-2">Medical History</h4>
                  <p className="text-muted-foreground bg-muted p-3 rounded-md">{(patient as any).medicalHistory}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Files & Upload Section */}
        <div className="space-y-6">
          {/* Existing Files */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Medical Files ({Array.isArray(patientFiles) ? patientFiles.length : 0})</span>
                  {(patient as any)?.specialty === 'radiology' && (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Radiology</Badge>
                  )}
                </span>
                {Array.isArray(patientFiles) && patientFiles.some((file: any) => isDICOMFile(file.fileName)) && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    <MonitorPlay className="w-3 h-3 mr-1" />
                    DICOM Available
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isFilesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : Array.isArray(patientFiles) && patientFiles.length > 0 ? (
                <div className="space-y-3" data-testid="patient-files-list">
                  {patientFiles.map((file: any) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center border">
                          {getFileIcon(file.fileName)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm" data-testid={`file-name-${file.id}`}>{file.fileName}</p>
                          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                            <span>Uploaded {new Date(file.createdAt).toLocaleDateString()}</span>
                            {isDICOMFile(file.fileName) ? (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700 px-2 py-0.5">DICOM</Badge>
                            ) : isRadiologyImage(file.fileName) ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-700 px-2 py-0.5">Radiology</Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant={isDICOMFile(file.fileName) ? "default" : "outline"}
                          onClick={() => openFileViewer(file)}
                          className={`flex items-center space-x-1 ${isDICOMFile(file.fileName) ? 'bg-blue-600 hover:bg-blue-700 text-white' : isRadiologyImage(file.fileName) ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                          data-testid={`button-view-file-${file.id}`}
                        >
                          {isDICOMFile(file.fileName) ? (
                            <MonitorPlay className="w-4 h-4" />
                          ) : isRadiologyImage(file.fileName) ? (
                            <MonitorPlay className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                          <span>
                            {isDICOMFile(file.fileName) 
                              ? 'Open DICOM' 
                              : isRadiologyImage(file.fileName) 
                              ? 'Medical Viewer' 
                              : 'View'}
                          </span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8" data-testid="no-files-message">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No files uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload New Files */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Upload New Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <ObjectUploader
                    maxNumberOfFiles={10}
                    maxFileSize={104857600}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadComplete}
                    buttonClassName="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Files
                  </ObjectUploader>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supported formats: JPEG, PNG, PDF, DICOM (Max 100MB per file)
                    {(patient as any)?.specialty === 'radiology' && (
                      <span className="block text-blue-600 font-medium mt-1">
                        📋 For radiology patients: Upload DICOM, X-ray, CT, MRI, or scan files for advanced viewing
                      </span>
                    )}
                  </p>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-3" data-testid="pending-uploads">
                    <h4 className="text-sm font-medium">Files ready to upload:</h4>
                    {uploadedFiles.map((fileURL, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm">File {index + 1}</span>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                    ))}
                    <Button
                      onClick={handleSaveFiles}
                      className="w-full"
                      disabled={uploadFilesMutation.isPending}
                      data-testid="button-save-files"
                    >
                      {uploadFilesMutation.isPending ? "Saving..." : "Save Files"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* DICOM Viewer Modal */}
        {showDICOMViewer && selectedFile && (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg max-w-7xl max-h-full w-full h-full m-4 flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b">
            <h3 className="text-lg font-semibold" data-testid="dicom-viewer-title">
              Medical Viewer: {selectedFile.fileName}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeFileViewer}
              data-testid="button-close-dicom-viewer"
            >
              ✕
            </Button>
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            {isDICOMFile(selectedFile.fileName) || isRadiologyImage(selectedFile.fileName) || (patient as any)?.specialty === 'radiology' ? (
              <DICOMViewer
                imageUrl={selectedFile.filePath}
                isDICOM={isDICOMFile(selectedFile.fileName) || isRadiologyImage(selectedFile.fileName) || (patient as any)?.specialty === 'radiology'}
                onClose={closeFileViewer}
                patientInfo={{
                  name: (patient as any)?.name || 'Unknown Patient',
                  id: (patient as any)?.id || '',
                  age: (patient as any)?.dateOfBirth ? new Date().getFullYear() - new Date((patient as any).dateOfBirth).getFullYear() : 'Unknown',
                  sex: (patient as any)?.gender || 'Unknown'
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded">
                <img
                  src={selectedFile.filePath}
                  alt={selectedFile.fileName}
                  className="max-w-full max-h-full object-contain"
                  data-testid="image-viewer"
                />
              </div>
            )}
          </div>
        </div>
      </div>
        )}
      </div>
    </div>
  );
}