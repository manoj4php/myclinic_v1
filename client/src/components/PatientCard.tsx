import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PatientCardProps {
  patient: {
    id: string;
    name: string;
    email?: string;
    phone: string;
    address?: string;
    dateOfBirth: string;
    gender: string;
    specialty: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export default function PatientCard({ patient }: PatientCardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: patientFiles } = useQuery({
    queryKey: ["/api/patients", patient.id, "files"],
  });

  const deletePatientMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/patients/${patient.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Success",
        description: "Patient deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete patient",
        variant: "destructive",
      });
    },
  });

  const getAge = () => {
    const birthDate = new Date(patient.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const getInitials = () => {
    return patient.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSpecialtyColor = () => {
    const colors = {
      radiology: "bg-primary text-primary-foreground",
      pediatric: "bg-chart-1 text-white",
      gynac: "bg-chart-2 text-white", 
      medicines: "bg-chart-3 text-white",
      surgeon: "bg-chart-4 text-white",
    };
    return colors[patient.specialty as keyof typeof colors] || "bg-muted text-muted-foreground";
  };

  const handleViewPatient = () => {
    // This would navigate to patient details page
    console.log("View patient:", patient.id);
  };

  const handleEditPatient = () => {
    // This would open edit patient modal
    console.log("Edit patient:", patient.id);
  };

  const handleDeletePatient = () => {
    if (window.confirm(`Are you sure you want to delete ${patient.name}?`)) {
      deletePatientMutation.mutate();
    }
  };

  const handleCardClick = () => {
    setLocation(`/patients/${patient.id}`);
  };

  const handleViewFiles = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(`/patients/${patient.id}`);
  };

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer" 
      data-testid={`patient-card-${patient.id}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-foreground">
                {getInitials()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground" data-testid={`patient-name-${patient.id}`}>
                {patient.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {patient.gender}, {getAge()} years
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleViewPatient}
              data-testid={`button-view-patient-${patient.id}`}
            >
              <i className="fas fa-eye"></i>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleEditPatient}
              data-testid={`button-edit-patient-${patient.id}`}
            >
              <i className="fas fa-edit"></i>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleDeletePatient}
              className="text-muted-foreground hover:text-destructive"
              data-testid={`button-delete-patient-${patient.id}`}
            >
              <i className="fas fa-trash"></i>
            </Button>
          </div>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-sm">
            <i className="fas fa-phone text-muted-foreground"></i>
            <span className="text-foreground">{patient.phone}</span>
          </div>
          {patient.email && (
            <div className="flex items-center space-x-2 text-sm">
              <i className="fas fa-envelope text-muted-foreground"></i>
              <span className="text-foreground">{patient.email}</span>
            </div>
          )}
          {patient.address && (
            <div className="flex items-center space-x-2 text-sm">
              <i className="fas fa-map-marker-alt text-muted-foreground"></i>
              <span className="text-foreground">{patient.address}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${getSpecialtyColor()}`}>
            {patient.specialty}
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Last visit:</span>
            <span className="text-xs text-foreground">
              {new Date(patient.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        {/* Files indicator */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1">
              <i className="fas fa-paperclip text-muted-foreground"></i>
              <span className="text-muted-foreground">
                {Array.isArray(patientFiles) ? patientFiles.length : 0} files attached
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary hover:text-primary/80 text-xs"
              data-testid={`button-view-files-${patient.id}`}
              onClick={handleViewFiles}
            >
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
