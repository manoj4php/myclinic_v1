import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  FileText, 
  Edit, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Stethoscope,
  ClipboardList,
  History
} from "lucide-react";

interface EditPatientModalProps {
  patient: any;
  trigger: React.ReactNode;
}

export function EditPatientModal({ patient, trigger }: EditPatientModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDownloadTemplate = () => {
    // Create a download link for the Word template
    const link = document.createElement('a');
    link.href = '/sample-patient-edit.txt';
    link.download = `patient-edit-${patient.name.replace(/\s+/g, '-')}-template.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="w-5 h-5 text-blue-600" />
            <span>Edit Patient: {patient.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Patient Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Name:</span>
                  <span>{patient.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Age/DOB:</span>
                  <span>{getAge(patient.dateOfBirth)}Y ({new Date(patient.dateOfBirth).toLocaleDateString()})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Gender:</span>
                  <span className="capitalize">{patient.gender}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Stethoscope className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Specialty:</span>
                  <Badge className="capitalize">{patient.specialty}</Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Phone:</span>
                  <span>{patient.phone}</span>
                </div>
                {patient.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Email:</span>
                    <span>{patient.email}</span>
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                    <span className="font-medium">Address:</span>
                    <span className="text-sm">{patient.address}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Medical Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ClipboardList className="w-5 h-5" />
                <span>Medical Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {patient.chiefComplaint && (
                <div>
                  <span className="font-medium text-sm text-gray-700">Chief Complaint:</span>
                  <p className="mt-1 text-sm bg-gray-50 p-3 rounded-lg">{patient.chiefComplaint}</p>
                </div>
              )}
              {patient.medicalHistory && (
                <div>
                  <span className="font-medium text-sm text-gray-700">Medical History:</span>
                  <p className="mt-1 text-sm bg-gray-50 p-3 rounded-lg">{patient.medicalHistory}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Edit Template Section */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-700">
                <FileText className="w-5 h-5" />
                <span>Patient Edit Template</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Download the patient edit template to make changes to patient information offline. 
                This template contains all patient fields and can be filled out and submitted for updates.
              </p>
              
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={handleDownloadTemplate}
                  className="flex items-center space-x-2"
                  data-testid="button-download-template"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Edit Template</span>
                </Button>
                
                <Badge variant="outline" className="text-xs">
                  Template Format: TXT/DOC
                </Badge>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <History className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">Instructions:</p>
                    <ul className="mt-1 text-yellow-700 space-y-1">
                      <li>• Download the template file</li>
                      <li>• Fill out the required information</li>
                      <li>• Save and return the completed form</li>
                      <li>• Updates will be processed and applied to the patient record</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            <Button 
              onClick={handleDownloadTemplate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}