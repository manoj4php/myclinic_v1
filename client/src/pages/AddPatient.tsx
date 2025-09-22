import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ObjectUploader } from "@/components/ObjectUploader";
import { LoadingOverlay } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { insertPatientSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import type { UploadResult } from "@uppy/core";
import { z } from "zod";

const formSchema = insertPatientSchema.extend({
  dateOfBirth: z.string().min(1, "Date of birth is required"),
});

export default function AddPatient() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [fileNameMapping, setFileNameMapping] = useState<Record<string, string>>({});
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Update current date/time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Fetch doctors for the dropdown
  const { data: doctors } = useQuery({
    queryKey: ["/api/users"],
    select: (data) => Array.isArray(data) ? data.filter((user: any) => user.role !== 'super_admin') : [],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      dateOfBirth: "",
      gender: undefined,
      specialty: undefined,
      chiefComplaint: "",
      medicalHistory: "",
      doctorId: "",
      // New fields - Auto-populate studyTime with current time
      emergency: false,
      reportStatus: "pending",
      studyTime: currentDateTime.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      accession: "",
      studyDesc: "",
      modality: "",
      center: "",
      refBy: "",
      isPrinted: false,
      reportedBy: "",
    },
  });

  // Update form's studyTime when currentDateTime changes
  useEffect(() => {
    form.setValue('studyTime', currentDateTime.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    }));
  }, [currentDateTime, form]);

  // DICOM file detection functions
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

  const isRadiologyImage = (fileName: string) => {
    const radiologyTerms = ['xray', 'ct', 'mri', 'scan', 'ultrasound'];
    return radiologyTerms.some(term => fileName.toLowerCase().includes(term));
  };

  const getFileIcon = (fileName: string) => {
    if (isDICOMFile(fileName)) {
      return '🏥'; // Medical/DICOM icon
    }
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(extension)) {
      return '🖼️'; // Image icon
    }
    return '📄'; // Document icon
  };

  const getFileTypeLabel = (fileName: string) => {
    if (isDICOMFile(fileName)) {
      return 'DICOM';
    }
    if (isRadiologyImage(fileName)) {
      return 'Radiology';
    }
    return 'Document';
  };

  const createPatientMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const submissionTime = new Date(); // Get current time at submission
      
      // Clean up empty strings from optional fields
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key, 
          typeof value === 'string' && value.trim() === '' ? undefined : value
        ])
      );
      
      const patientData = {
        ...cleanData,
        dateOfBirth: new Date(data.dateOfBirth),
        studyDate: submissionTime, // Auto-set study date to current date/time
        studyTime: submissionTime.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        }), // Auto-set study time to current time
      };
      const response = await apiRequest("POST", "/api/patients", patientData);
      return response.json();
    },
    onSuccess: async (patient) => {
      // Upload files if any
      for (const fileURL of uploadedFiles) {
        // Use the mapping to get the original filename
        const originalFileName = fileNameMapping[fileURL];
        const fileName = originalFileName || fileURL.split('/').pop() || 'upload';
        
        console.log('Creating patient file:', { 
          patientId: patient.id, 
          fileName: fileName, 
          originalFileName, 
          fileURL 
        });
        
        await apiRequest("PUT", "/api/patient-files", {
          patientId: patient.id,
          fileName,
          fileURL,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setUploadedFiles([]);
      setFileNameMapping({}); // Clear the mapping
      toast({
        title: "Success",
        description: "Patient added successfully!",
      });
      setLocation("/patients");
    },
    onError: (error) => {
      console.error("Error creating patient:", error);
      toast({
        title: "Error",
        description: "Failed to add patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload", {});
      const data = await response.json();
      console.log("Upload URL received:", data.uploadURL);
      
      if (!data.uploadURL) {
        throw new Error("No upload URL received from server");
      }
      
      return {
        method: "PUT" as const,
        url: data.uploadURL,
      };
    } catch (error) {
      console.error("Error getting upload parameters:", error);
      toast({
        title: "Upload Error",
        description: "Failed to prepare file upload. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    console.log("Upload result:", result);
    
    if (result.successful && result.successful.length > 0) {
      // Create a mapping of upload URLs to original filenames
      const fileMapping: Record<string, string> = {};
      
      result.successful.forEach(file => {
        let fileUrl = '';
        
        // New storage system returns fileUrl in the response
        const responseBody = file.response?.body as any;
        if (responseBody?.fileUrl) {
          fileUrl = responseBody.fileUrl;
        } else if (file.uploadURL) {
          // Fallback: extract from upload URL for backward compatibility
          fileUrl = file.uploadURL as string;
        }
        
        if (fileUrl && file.name) {
          fileMapping[fileUrl] = file.name as string;
        }
      });
      
      // Store the mapping for use in createPatientMutation
      setFileNameMapping(prev => ({ ...prev, ...fileMapping }));
      
      const newFileURLs = result.successful.map(file => {
        // New storage system returns fileUrl in the response
        const responseBody = file.response?.body as any;
        if (responseBody?.fileUrl) {
          return responseBody.fileUrl;
        }
        
        // Fallback: extract from upload URL for backward compatibility
        const uploadURL = file.uploadURL;
        if (uploadURL) {
          return uploadURL;
        }
        
        // Last resort fallback
        return `File_${Date.now()}`;
      }).filter((url): url is string => url !== undefined);
      
      setUploadedFiles(prev => [...prev, ...newFileURLs]);
      
      toast({
        title: "Upload Successful",
        description: `${result.successful.length} file(s) uploaded successfully!`,
      });
    }
    
    if (result.failed && result.failed.length > 0) {
      console.error("Upload failures:", result.failed);
      toast({
        title: "Upload Failed",
        description: `${result.failed.length} file(s) failed to upload. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createPatientMutation.mutate(data);
  };

  return (
    <LoadingOverlay 
      isLoading={createPatientMutation.isPending}
      message="Creating patient..."
    >
      <div className="p-6 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 min-h-screen" data-testid="add-patient-view">
        <div className="max-w-5xl mx-auto">
          {/* Professional Header */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-blue-600 rounded-full">
                <i className="fas fa-user-plus text-white text-2xl"></i>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Patient Registration</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">Complete patient information form for medical records</p>
            <div className="w-24 h-1 bg-blue-600 mx-auto mt-4 rounded-full"></div>
          </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Personal Information */}
            <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center text-lg">
                  <i className="fas fa-user mr-3"></i>
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter patient's full name" 
                            data-testid="input-patient-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth *</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            data-testid="input-patient-dob"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-patient-gender">
                              <SelectValue placeholder="Select Gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+1 (555) 123-4567" 
                            data-testid="input-patient-phone"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="patient@email.com"
                            data-testid="input-patient-email"
                            {...field}
                            value={field.value ?? ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="specialty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specialty *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-patient-specialty">
                              <SelectValue placeholder="Select Specialty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="radiology">Radiology</SelectItem>
                            <SelectItem value="pediatric">Pediatric</SelectItem>
                            <SelectItem value="gynac">Gynecology</SelectItem>
                            <SelectItem value="medicines">General Medicine</SelectItem>
                            <SelectItem value="surgeon">Surgery</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="doctorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Doctor</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-patient-doctor">
                              <SelectValue placeholder="Select Doctor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Doctor Assigned</SelectItem>
                            {doctors?.map((doctor: any) => (
                              <SelectItem key={doctor.id} value={doctor.id}>
                                {doctor.firstName && doctor.lastName 
                                  ? `Dr. ${doctor.firstName} ${doctor.lastName}` 
                                  : doctor.username || doctor.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="mt-6">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter complete address"
                            data-testid="textarea-patient-address"
                            {...field}
                            value={field.value ?? ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Medical History */}
            <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
              <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center text-lg">
                  <i className="fas fa-notes-medical mr-3"></i>
                  Medical History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="chiefComplaint"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chief Complaint</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the patient's main concern or symptoms"
                            data-testid="textarea-chief-complaint"
                            {...field}
                            value={field.value ?? ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="medicalHistory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medical History</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Previous medical conditions, surgeries, medications, allergies"
                            rows={4}
                            data-testid="textarea-medical-history"
                            {...field}
                            value={field.value ?? ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Study Details Section */}
            <Card>
              <CardHeader>
                <CardTitle>Study Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="emergency"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Emergency Case</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Mark as emergency if urgent attention required
                          </div>
                        </div>
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value ?? false}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="w-4 h-4"
                            data-testid="checkbox-emergency"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reportStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Report Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-report-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="reviewed">Reviewed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="studyTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Study Date & Time</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input 
                              value={currentDateTime.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              })}
                              readOnly
                              className="bg-gray-50"
                              placeholder="Study Date"
                            />
                            <Input 
                              type="time"
                              data-testid="input-study-time"
                              {...field}
                              value={currentDateTime.toLocaleTimeString('en-US', { 
                                hour12: false, 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })} 
                              readOnly
                              className="bg-gray-50"
                            />
                          </div>
                        </FormControl>
                        <div className="text-xs text-muted-foreground">
                          Auto-set to current date and time when patient is added (Updates live)
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accession"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Accession Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter accession number"
                            data-testid="input-accession"
                            {...field}
                            value={field.value ?? ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="modality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modality</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-modality">
                              <SelectValue placeholder="Select modality" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CT">CT Scan</SelectItem>
                            <SelectItem value="MRI">MRI</SelectItem>
                            <SelectItem value="X-Ray">X-Ray</SelectItem>
                            <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                            <SelectItem value="PET">PET Scan</SelectItem>
                            <SelectItem value="Mammography">Mammography</SelectItem>
                            <SelectItem value="Nuclear">Nuclear Medicine</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="center"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medical Center</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter medical center/facility name"
                            data-testid="input-center"
                            {...field}
                            value={field.value ?? ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="refBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Referred By</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter referring doctor's name"
                            data-testid="input-ref-by"
                            {...field}
                            value={field.value ?? ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reportedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reported By</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter reporting doctor's name" 
                            data-testid="input-reported-by"
                            {...field}
                            value={field.value ?? ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isPrinted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Is Printed</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Mark if reports have been printed
                          </div>
                        </div>
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value ?? false}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="w-4 h-4"
                            data-testid="checkbox-is-printed"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-6">
                  <FormField
                    control={form.control}
                    name="studyDesc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Study Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the study details, findings, or observations"
                            rows={3}
                            data-testid="textarea-study-desc"
                            {...field}
                            value={field.value ?? ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* File Upload Section */}
            <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center text-lg">
                  <i className="fas fa-file-medical mr-3"></i>
                  Medical Files & Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors bg-purple-50 dark:bg-purple-900/20">
                  <div className="mb-4">
                    <i className="fas fa-cloud-upload-alt text-4xl text-purple-600"></i>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Upload Medical Files</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload scan images, reports, and other medical documents.<br/>
                    🏥 <strong>DICOM files supported</strong> - Upload .dcm, .dicom files for advanced medical imaging
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Supported formats: JPEG, PNG, PDF, <strong>DICOM (.dcm, .dicom)</strong>, Medical Images (Max 100MB per file)
                  </p>
                  
                  <ObjectUploader
                    maxNumberOfFiles={10}
                    maxFileSize={104857600} // 100MB limit
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadComplete}
                    buttonClassName="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
                  >
                    <i className="fas fa-upload mr-2"></i>
                    Choose Files
                  </ObjectUploader>
                </div>
                
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h5 className="text-sm font-medium text-foreground">Uploaded Files ({uploadedFiles.length}):</h5>
                    <div className="space-y-2">
                      {uploadedFiles.map((fileURL, index) => {
                        const originalFileName = fileNameMapping[fileURL] || `File ${index + 1}`;
                        const fileType = getFileTypeLabel(originalFileName);
                        const fileIcon = getFileIcon(originalFileName);
                        
                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{fileIcon}</span>
                              <div>
                                <p className="text-sm font-medium">{originalFileName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {fileType}
                                  {isDICOMFile(originalFileName) && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                      Medical Imaging
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                ✓ Uploaded
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Form Actions */}
            <div className="flex justify-center space-x-6 pt-8 border-t border-gray-200 dark:border-gray-700">
              <Button 
                type="button" 
                variant="outline"
                size="lg"
                onClick={() => setLocation("/patients")}
                data-testid="button-cancel"
                className="px-8 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 dark:text-gray-300"
              >
                <i className="fas fa-times mr-2"></i>
                Cancel
              </Button>
              <Button 
                type="submit"
                size="lg"
                disabled={createPatientMutation.isPending}
                data-testid="button-add-patient-submit"
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg"
              >
                {createPatientMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Adding Patient...
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus mr-2"></i>
                    Add Patient
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
    </LoadingOverlay>
  );
}
