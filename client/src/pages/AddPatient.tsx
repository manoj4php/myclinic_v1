import { useState } from "react";
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
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const patientData = {
        ...data,
        dateOfBirth: new Date(data.dateOfBirth),
      };
      const response = await apiRequest("POST", "/api/patients", patientData);
      return response.json();
    },
    onSuccess: async (patient) => {
      // Upload files if any
      for (const fileURL of uploadedFiles) {
        const fileName = fileURL.split('/').pop() || 'upload';
        await apiRequest("PUT", "/api/patient-files", {
          patientId: patient.id,
          fileName,
          fileURL,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
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
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    console.log("Upload URL received:", data.uploadURL);
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

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createPatientMutation.mutate(data);
  };

  return (
    <LoadingOverlay 
      isLoading={createPatientMutation.isPending}
      message="Creating patient..."
    >
      <div className="p-6" data-testid="add-patient-view">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Add New Patient</h2>
            <p className="text-muted-foreground">Enter patient information and upload medical files</p>
          </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-patient-doctor">
                              <SelectValue placeholder="Select Doctor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No Doctor Assigned</SelectItem>
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
            <Card>
              <CardHeader>
                <CardTitle>Medical History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
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
            
            {/* File Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle>Medical Files & Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <div className="mb-4">
                    <i className="fas fa-cloud-upload-alt text-4xl text-muted-foreground"></i>
                  </div>
                  <h4 className="text-lg font-medium text-foreground mb-2">Upload Medical Files</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload scan images, reports, and other medical documents
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Supported formats: JPEG, PNG, PDF, DICOM (Max 10MB per file)
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
                    <h5 className="text-sm font-medium text-foreground">Uploaded Files:</h5>
                    <div className="space-y-1">
                      {uploadedFiles.map((fileURL, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          <i className="fas fa-file mr-2"></i>
                          File {index + 1} uploaded successfully
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setLocation("/patients")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createPatientMutation.isPending}
                data-testid="button-add-patient-submit"
              >
                {createPatientMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Adding Patient...
                  </>
                ) : (
                  "Add Patient"
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
