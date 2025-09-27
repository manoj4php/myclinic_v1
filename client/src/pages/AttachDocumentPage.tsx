import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  File, 
  Image, 
  X, 
  Download, 
  Eye,
  Calendar,
  User,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface AttachDocumentPageProps {
  patientId: string;
}

export default function AttachDocumentPage({ patientId }: AttachDocumentPageProps) {
  const [, setLocation] = useLocation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentNotes, setDocumentNotes] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  // Fetch patient details
  const { data: patient } = useQuery({
    queryKey: ["/api/patients", patientId],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch patient');
      return response.json();
    },
  });

  // Fetch existing documents
  const { data: documents } = useQuery({
    queryKey: ["/api/patients", patientId, "documents"],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}/files?type=document`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ files, title, notes }: { files: File[]; title: string; notes: string }) => {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`files`, file);
      });
      formData.append('type', 'document');
      formData.append('title', title);
      formData.append('notes', notes);
      
      const response = await fetch(`/api/patients/${patientId}/files`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to upload documents');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Success",
        description: `${selectedFiles.length} document(s) uploaded successfully`,
      });
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload documents",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedFiles([]);
    setDocumentTitle('');
    setDocumentNotes('');
  };

  const handleFileSelect = (files: FileList) => {
    const newFiles = Array.from(files);
    setSelectedFiles(prev => [...prev, ...newFiles]);
    
    if (!documentTitle && newFiles.length === 1) {
      setDocumentTitle(newFiles[0].name.replace(/\.[^/.]+$/, ""));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleSubmit = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!documentTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the documents",
        variant: "destructive",
      });
      return;
    }

    uploadDocumentMutation.mutate({
      files: selectedFiles,
      title: documentTitle,
      notes: documentNotes,
    });
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension || '')) {
      return <Image className="w-6 h-6 text-blue-600" />;
    }
    return <File className="w-6 h-6 text-gray-600" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50/50 to-white min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setLocation('/patients')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Patients</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attach Documents</h1>
              <p className="text-gray-600">
                Upload supporting documents for {patient?.name || 'Patient'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload New Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Patient Info */}
            {patient && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center space-x-4 text-sm text-blue-800">
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span><strong>{patient.name}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>ID: {patient.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(patient.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-xl font-medium mb-2">Upload Documents</p>
              <p className="text-gray-500 mb-4">
                Drag and drop your files here, or click to browse
              </p>
              <p className="text-sm text-gray-400 mb-4">
                Supports all file types (Images, PDFs, Documents, etc.)
              </p>
              <Input
                type="file"
                multiple
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                className="hidden"
                id="file-upload"
              />
              <Button variant="outline" asChild>
                <label htmlFor="file-upload" className="cursor-pointer">
                  Browse Files
                </label>
              </Button>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({selectedFiles.length})</Label>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center space-x-2">
                        {getFileIcon(file.name)}
                        <div>
                          <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Document Details */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="document-title">Document Title *</Label>
                <Input
                  id="document-title"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="Enter document title..."
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="document-notes">Notes (Optional)</Label>
                <Textarea
                  id="document-notes"
                  value={documentNotes}
                  onChange={(e) => setDocumentNotes(e.target.value)}
                  placeholder="Add any additional notes about these documents..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-4">
              <Button 
                onClick={handleSubmit}
                disabled={uploadDocumentMutation.isPending || selectedFiles.length === 0}
                className="flex-1"
              >
                {uploadDocumentMutation.isPending ? "Uploading..." : `Upload ${selectedFiles.length} Document(s)`}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Existing Documents */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Existing Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documents && documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(doc.fileName)}
                      <div>
                        <p className="font-medium">{doc.title || doc.fileName}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>{formatFileSize(doc.fileSize || 0)}</span>
                          <span>•</span>
                          <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No documents uploaded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}