import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Info, 
  Calendar,
  User,
  Activity,
  FileText,
  Image,
  Download,
  Eye,
  Clock,
  MapPin,
  Stethoscope,
  Heart,
  Brain,
  Zap,
  Camera,
  X
} from 'lucide-react';

interface StudyInfoDialogProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  patient?: any;
}

interface StudyInfo {
  id: string;
  studyInstanceUID: string;
  studyDate: string;
  studyTime: string;
  studyDescription: string;
  modalitiesInStudy: string[];
  numberOfSeries: number;
  numberOfInstances: number;
  referringPhysician: string;
  studyStatus: 'completed' | 'in-progress' | 'cancelled' | 'scheduled';
  accessionNumber: string;
  institutionName: string;
  stationName: string;
  bodyPartExamined: string;
  studyPriority: 'routine' | 'urgent' | 'stat';
  patientPosition: string;
  series: StudySeries[];
  findings?: string;
  impression?: string;
  recommendations?: string;
}

interface StudySeries {
  id: string;
  seriesInstanceUID: string;
  seriesNumber: number;
  seriesDescription: string;
  modality: string;
  numberOfInstances: number;
  seriesDate: string;
  seriesTime: string;
  bodyPartExamined: string;
  protocolName: string;
  instances: StudyInstance[];
}

interface StudyInstance {
  id: string;
  sopInstanceUID: string;
  instanceNumber: number;
  imageType: string;
  acquisitionDate: string;
  acquisitionTime: string;
  sliceThickness?: number;
  sliceLocation?: number;
  imagePosition?: string;
  imageOrientation?: string;
  pixelSpacing?: string;
  windowCenter?: number;
  windowWidth?: number;
  thumbnailUrl?: string;
}

export default function StudyInfoDialog({ open, onClose, patientId, patient }: StudyInfoDialogProps) {
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);

  // Create study data from patient information
  const studies = patient ? [{
    id: '1',
    studyInstanceUID: `1.2.840.113619.2.5.${Date.now()}`,
    studyDate: patient.studyDate ? new Date(patient.studyDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    studyTime: patient.studyTime || new Date().toTimeString().split(' ')[0],
    studyDescription: patient.studyDesc || 'Medical Study',
    modalitiesInStudy: patient.modality ? [patient.modality] : ['CT'],
    numberOfSeries: 1,
    numberOfInstances: 150,
    referringPhysician: patient.refBy || 'Dr. Unknown',
    studyStatus: patient.reportStatus === 'completed' ? 'completed' as const : 
                 patient.reportStatus === 'reviewed' ? 'completed' as const : 
                 'in-progress' as const,
    accessionNumber: patient.accession || 'ACC' + Date.now().toString().slice(-8),
    institutionName: patient.center || 'Medical Center',
    stationName: `${patient.modality || 'CT'}01`,
    bodyPartExamined: patient.chiefComplaint?.split(' ')[0]?.toUpperCase() || 'CHEST',
    studyPriority: patient.emergency ? 'urgent' as const : 'routine' as const,
    patientPosition: 'HFS',
    findings: `Study of ${patient.chiefComplaint || 'patient condition'} shows ${patient.reportStatus === 'completed' ? 'completed examination' : 'ongoing evaluation'}.`,
    impression: `${patient.studyDesc || 'Medical study'} - ${patient.reportStatus === 'completed' ? 'Normal findings' : 'Pending review'}.`,
    recommendations: patient.reportStatus === 'completed' ? 'Follow-up as clinically indicated.' : 'Awaiting radiologist review.',
    series: [{
      id: '1',
      seriesInstanceUID: `1.2.840.113619.2.5.${Date.now()}.1`,
      seriesNumber: 1,
      seriesDescription: `${patient.modality || 'CT'} Series`,
      modality: patient.modality || 'CT',
      numberOfInstances: 150,
      seriesDate: patient.studyDate ? new Date(patient.studyDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      seriesTime: patient.studyTime || new Date().toTimeString().split(' ')[0],
      bodyPartExamined: patient.chiefComplaint?.split(' ')[0]?.toUpperCase() || 'CHEST',
      protocolName: `${patient.modality || 'CT'} Protocol`,
      instances: Array.from({ length: 10 }, (_, i) => ({
        id: `inst_${i + 1}`,
        sopInstanceUID: `1.2.840.113619.2.5.${Date.now()}.1.${i + 1}`,
        instanceNumber: i + 1,
        imageType: 'ORIGINAL\\PRIMARY',
        acquisitionDate: patient.studyDate ? new Date(patient.studyDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        acquisitionTime: patient.studyTime || new Date().toTimeString().split(' ')[0],
        sliceThickness: 1.25,
        sliceLocation: i * 1.25,
        thumbnailUrl: undefined
      }))
    }]
  }] : [];

  const isLoading = false;

  const getModalityIcon = (modality: string) => {
    switch (modality.toUpperCase()) {
      case 'CT': return <Brain className="w-4 h-4 text-blue-600" />;
      case 'MR': case 'MRI': return <Brain className="w-4 h-4 text-purple-600" />;
      case 'XR': case 'CR': case 'DX': return <Activity className="w-4 h-4 text-green-600" />;
      case 'US': return <Heart className="w-4 h-4 text-red-600" />;
      case 'NM': return <Zap className="w-4 h-4 text-yellow-600" />;
      case 'PT': return <Activity className="w-4 h-4 text-orange-600" />;
      case 'RF': return <Camera className="w-4 h-4 text-indigo-600" />;
      default: return <Image className="w-4 h-4 text-gray-600" />;
    }
  };

  const getModalityColor = (modality: string) => {
    switch (modality.toUpperCase()) {
      case 'CT': return 'bg-blue-100 text-blue-800';
      case 'MR': case 'MRI': return 'bg-purple-100 text-purple-800';
      case 'XR': case 'CR': case 'DX': return 'bg-green-100 text-green-800';
      case 'US': return 'bg-red-100 text-red-800';
      case 'NM': return 'bg-yellow-100 text-yellow-800';
      case 'PT': return 'bg-orange-100 text-orange-800';
      case 'RF': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: StudyInfo['studyStatus']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: StudyInfo['studyPriority']) => {
    switch (priority) {
      case 'stat': return 'bg-red-100 text-red-800';
      case 'urgent': return 'bg-orange-100 text-orange-800';
      case 'routine': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (date: string, time?: string) => {
    const dateObj = new Date(date + (time ? `T${time}` : ''));
    return {
      date: dateObj.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: dateObj.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-3 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Info className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white">
                Imaging Study Information
              </DialogTitle>
              <DialogDescription className="text-xs text-blue-100 mt-1">
                {patient?.name || 'Patient'} - Diagnostic Imaging Details
              </DialogDescription>
            </div>
          </div>
          
          {/* Patient Info Bar */}
          {patient && (
            <div className="mt-3 p-2 bg-white/95 rounded border border-blue-200">
              <div className="flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1">
                  <User className="w-3 h-3 text-blue-600" />
                  <span className="font-semibold text-gray-800">{patient.name}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-gray-500">ID:</span>
                  <span className="font-mono">{patient.id.slice(0, 8)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-gray-500" />
                  <span>{patient.age || 'N/A'}y</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-gray-500">{patient.gender || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-gray-500">Studies:</span>
                  <Badge variant="secondary" className="text-xs px-1 py-0">{studies.length}</Badge>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-gray-500">Specialty:</span>
                  <span className="capitalize">{patient.specialty || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 p-4 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Loading studies...</span>
            </div>
          ) : studies.length > 0 ? (
            <div className="space-y-4">
              {studies.map((study: StudyInfo) => {
                const studyDateTime = formatDateTime(study.studyDate, study.studyTime);
                
                return (
                  <Card key={study.id} className="shadow-md border border-blue-200">
                    <CardHeader className="pb-2 pt-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Stethoscope className="w-4 h-4 text-blue-600" />
                            {study.studyDescription}
                          </CardTitle>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={`${getStatusColor(study.studyStatus)} text-xs px-2 py-0`}>
                              {study.studyStatus.charAt(0).toUpperCase() + study.studyStatus.slice(1)}
                            </Badge>
                            <Badge className={`${getPriorityColor(study.studyPriority)} text-xs px-2 py-0`}>
                              {study.studyPriority.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span className="font-medium">{studyDateTime.date}</span>
                          </div>
                          <div className="flex items-center space-x-1 mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{studyDateTime.time}</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-2">
                      <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 h-8">
                          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                          <TabsTrigger value="series" className="text-xs">Series ({study.numberOfSeries})</TabsTrigger>
                          <TabsTrigger value="images" className="text-xs">Images ({study.numberOfInstances})</TabsTrigger>
                          <TabsTrigger value="report" className="text-xs">Report</TabsTrigger>
                        </TabsList>

                        {/* Overview Tab */}
                        <TabsContent value="overview" className="space-y-3 mt-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Card className="bg-gray-50">
                              <CardHeader className="pb-2 pt-3">
                                <CardTitle className="text-sm flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  Study Details
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-1 text-xs pt-0">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Study UID:</span>
                                  <span className="font-mono text-xs">{study.studyInstanceUID.slice(-12)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Accession #:</span>
                                  <span className="font-medium">{study.accessionNumber || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Body Part:</span>
                                  <span className="font-medium">{study.bodyPartExamined || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Position:</span>
                                  <span>{study.patientPosition || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Physician:</span>
                                  <span className="font-medium">{study.referringPhysician || 'N/A'}</span>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="bg-gray-50">
                              <CardHeader className="pb-2 pt-3">
                                <CardTitle className="text-sm flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  Institution
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-1 text-xs pt-0">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Institution:</span>
                                  <span className="font-medium">{study.institutionName || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Station:</span>
                                  <span>{study.stationName || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Series:</span>
                                  <span className="font-medium">{study.numberOfSeries}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Images:</span>
                                  <span className="font-medium">{study.numberOfInstances}</span>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="bg-blue-50">
                              <CardHeader className="pb-2 pt-3">
                                <CardTitle className="text-sm flex items-center gap-1">
                                  <Camera className="w-3 h-3" />
                                  Modalities
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="flex flex-wrap gap-1">
                                  {study.modalitiesInStudy.map((modality) => (
                                    <Badge 
                                      key={modality} 
                                      className={`${getModalityColor(modality)} flex items-center space-x-1 text-xs px-2 py-1`}
                                    >
                                      {getModalityIcon(modality)}
                                      <span>{modality}</span>
                                    </Badge>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </TabsContent>

                        {/* Series Tab */}
                        <TabsContent value="series" className="space-y-3 mt-3">
                          {study.series && study.series.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {study.series.map((series) => {
                                const seriesDateTime = formatDateTime(series.seriesDate, series.seriesTime);
                                return (
                                  <Card key={series.id} className="hover:shadow-sm transition-shadow border border-blue-200">
                                    <CardHeader className="pb-1 pt-2">
                                      <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm flex items-center gap-1">
                                          {getModalityIcon(series.modality)}
                                          Series {series.seriesNumber}
                                        </CardTitle>
                                        <Badge className={`${getModalityColor(series.modality)} text-xs px-1 py-0`}>
                                          {series.modality}
                                        </Badge>
                                      </div>
                                    </CardHeader>
                                    <CardContent className="pt-1">
                                      <div className="space-y-1 text-xs">
                                        <p className="font-medium text-gray-900 text-sm">{series.seriesDescription}</p>
                                        <div className="text-gray-600 space-y-0.5">
                                          <p><span className="font-medium">Protocol:</span> {series.protocolName || 'N/A'}</p>
                                          <p><span className="font-medium">Body Part:</span> {series.bodyPartExamined}</p>
                                          <p><span className="font-medium">Images:</span> {series.numberOfInstances}</p>
                                          <p><span className="font-medium">Date:</span> {seriesDateTime.date}</p>
                                          <p><span className="font-medium">Time:</span> {seriesDateTime.time}</p>
                                        </div>
                                        <div className="flex space-x-1 pt-1">
                                          <Button size="sm" variant="outline" className="flex-1 h-6 text-xs">
                                            <Eye className="w-3 h-3 mr-1" />
                                            View
                                          </Button>
                                          <Button size="sm" variant="outline" className="flex-1 h-6 text-xs">
                                            <Download className="w-3 h-3 mr-1" />
                                            Export
                                          </Button>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500">
                              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No series information available</p>
                            </div>
                          )}
                        </TabsContent>

                        {/* Images Tab */}
                        <TabsContent value="images" className="space-y-3 mt-3">
                          <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-2">
                            {study.series?.flatMap(series => 
                              series.instances?.slice(0, 16) || []
                            ).map((instance) => (
                              <Card key={instance.id} className="aspect-square hover:shadow-sm transition-shadow cursor-pointer">
                                <CardContent className="p-1 h-full flex flex-col">
                                  <div className="flex-1 bg-gray-100 rounded flex items-center justify-center">
                                    {instance.thumbnailUrl ? (
                                      <img 
                                        src={instance.thumbnailUrl} 
                                        alt={`Instance ${instance.instanceNumber}`}
                                        className="max-w-full max-h-full object-contain"
                                      />
                                    ) : (
                                      <Image className="w-4 h-4 text-gray-400" />
                                    )}
                                  </div>
                                  <div className="mt-0.5 text-xs text-center text-gray-600">
                                    #{instance.instanceNumber}
                                  </div>
                                </CardContent>
                              </Card>
                            )) || []}
                          </div>
                          
                          {study.numberOfInstances > 16 && (
                            <div className="text-center">
                              <Button variant="outline">
                                Load More Images ({study.numberOfInstances - 16} remaining)
                              </Button>
                            </div>
                          )}
                        </TabsContent>

                        {/* Report Tab */}
                        <TabsContent value="report" className="space-y-2 mt-3">
                          <div className="space-y-2">
                            {study.findings && (
                              <Card className="bg-green-50">
                                <CardHeader className="pb-1 pt-2">
                                  <CardTitle className="text-sm flex items-center gap-1">
                                    <Eye className="w-3 h-3 text-green-600" />
                                    Findings
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-1">
                                  <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {study.findings}
                                  </p>
                                </CardContent>
                              </Card>
                            )}
                            
                            {study.impression && (
                              <Card className="bg-blue-50">
                                <CardHeader className="pb-1 pt-2">
                                  <CardTitle className="text-sm flex items-center gap-1">
                                    <Brain className="w-3 h-3 text-blue-600" />
                                    Impression
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-1">
                                  <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-medium">
                                    {study.impression}
                                  </p>
                                </CardContent>
                              </Card>
                            )}
                            
                            {study.recommendations && (
                              <Card className="bg-yellow-50">
                                <CardHeader className="pb-1 pt-2">
                                  <CardTitle className="text-sm flex items-center gap-1">
                                    <FileText className="w-3 h-3 text-yellow-600" />
                                    Recommendations
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-1">
                                  <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {study.recommendations}
                                  </p>
                                </CardContent>
                              </Card>
                            )}
                            
                            {!study.findings && !study.impression && !study.recommendations && (
                              <div className="text-center py-4 text-gray-500">
                                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm font-medium">No Report Available</p>
                                <p className="text-xs">Report will be available once the study is completed and reviewed.</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Stethoscope className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <h3 className="text-base font-medium text-gray-900 mb-2">No Studies Available</h3>
              <p className="text-sm text-gray-600">
                {patient ? 'Study information will be populated once imaging is completed.' : 'Patient data is not available.'}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}