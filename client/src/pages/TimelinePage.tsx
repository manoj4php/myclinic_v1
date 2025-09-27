import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Calendar,
  User,
  ArrowLeft,
  Activity,
  FileText,
  Upload,
  MessageSquare,
  AlertTriangle,
  Eye,
  Filter,
  Download
} from 'lucide-react';
import { useLocation } from 'wouter';

interface TimelinePageProps {
  patientId: string;
}

interface TimelineEvent {
  id: string;
  type: 'report' | 'document' | 'comment' | 'study' | 'appointment' | 'emergency';
  title: string;
  description: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    role: string;
  };
  metadata?: {
    fileCount?: number;
    fileSize?: number;
    commentType?: string;
    studyType?: string;
    status?: string;
  };
}

export default function TimelinePage({ patientId }: TimelinePageProps) {
  const [, setLocation] = useLocation();
  const [filterType, setFilterType] = useState<TimelineEvent['type'] | 'all'>('all');

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

  // Fetch timeline events
  const { data: timelineEvents = [] } = useQuery({
    queryKey: ["/api/patients", patientId, "timeline"],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}/timeline`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch timeline');
      return response.json();
    },
  });

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'report': return <FileText className="w-5 h-5 text-blue-600" />;
      case 'document': return <Upload className="w-5 h-5 text-green-600" />;
      case 'comment': return <MessageSquare className="w-5 h-5 text-purple-600" />;
      case 'study': return <Activity className="w-5 h-5 text-orange-600" />;
      case 'appointment': return <Calendar className="w-5 h-5 text-indigo-600" />;
      case 'emergency': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'report': return 'border-blue-200 bg-blue-50';
      case 'document': return 'border-green-200 bg-green-50';
      case 'comment': return 'border-purple-200 bg-purple-50';
      case 'study': return 'border-orange-200 bg-orange-50';
      case 'appointment': return 'border-indigo-200 bg-indigo-50';
      case 'emergency': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getTypeColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'report': return 'bg-blue-100 text-blue-800';
      case 'document': return 'bg-green-100 text-green-800';
      case 'comment': return 'bg-purple-100 text-purple-800';
      case 'study': return 'bg-orange-100 text-orange-800';
      case 'appointment': return 'bg-indigo-100 text-indigo-800';
      case 'emergency': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredEvents = timelineEvents.filter((event: TimelineEvent) => 
    filterType === 'all' || event.type === filterType
  );

  // Group events by date
  const groupedEvents = filteredEvents.reduce((groups: { [key: string]: TimelineEvent[] }, event: TimelineEvent) => {
    const date = new Date(event.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {});

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
              <h1 className="text-2xl font-bold text-gray-900">Patient Timeline</h1>
              <p className="text-gray-600">
                Complete activity timeline for {patient?.name || 'Patient'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Patient Info & Filters */}
        <div className="lg:col-span-1">
          <div className="space-y-4">
            {/* Patient Card */}
            {patient && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5" />
                    Patient Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-semibold text-lg">{patient.name}</p>
                    <p className="text-gray-600">ID: {patient.id.slice(0, 8)}</p>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p><strong>Age:</strong> {patient.age || 'N/A'}</p>
                    <p><strong>Gender:</strong> {patient.gender || 'N/A'}</p>
                    <p><strong>Phone:</strong> {patient.phone || 'N/A'}</p>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p><strong>Registered:</strong> {new Date(patient.createdAt).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filter Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="w-5 h-5" />
                  Filter Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { value: 'all', label: 'All Events', count: timelineEvents.length },
                    { value: 'report', label: 'Reports', count: timelineEvents.filter((e: TimelineEvent) => e.type === 'report').length },
                    { value: 'document', label: 'Documents', count: timelineEvents.filter((e: TimelineEvent) => e.type === 'document').length },
                    { value: 'comment', label: 'Comments', count: timelineEvents.filter((e: TimelineEvent) => e.type === 'comment').length },
                    { value: 'study', label: 'Studies', count: timelineEvents.filter((e: TimelineEvent) => e.type === 'study').length },
                    { value: 'appointment', label: 'Appointments', count: timelineEvents.filter((e: TimelineEvent) => e.type === 'appointment').length },
                    { value: 'emergency', label: 'Emergency', count: timelineEvents.filter((e: TimelineEvent) => e.type === 'emergency').length },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setFilterType(filter.value as any)}
                      className={`w-full text-left p-2 rounded-md transition-colors ${
                        filterType === filter.value
                          ? 'bg-blue-100 text-blue-800 font-medium'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{filter.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {filter.count}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Timeline */}
        <div className="lg:col-span-3">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Timeline ({filteredEvents.length} events)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(groupedEvents).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(groupedEvents)
                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                    .map(([date, events]) => (
                      <div key={date} className="relative">
                        {/* Date Header */}
                        <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 pb-3">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <h3 className="font-semibold text-gray-900">
                              {new Date(date).toLocaleDateString('en-US', { 
                                weekday: 'long',
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </h3>
                          </div>
                          <hr className="mt-2" />
                        </div>

                        {/* Events */}
                        <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                          {events
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .map((event, index) => {
                              const { time } = formatDate(event.createdAt);
                              return (
                                <div key={event.id} className="relative">
                                  {/* Timeline dot */}
                                  <div className="absolute -left-8 mt-2 w-4 h-4 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  </div>

                                  {/* Event card */}
                                  <div className={`border rounded-lg p-4 ${getEventColor(event.type)}`}>
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex items-center space-x-3">
                                        {getEventIcon(event.type)}
                                        <div>
                                          <h4 className="font-semibold">{event.title}</h4>
                                          <p className="text-sm text-gray-600">{event.description}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <Badge className={`${getTypeColor(event.type)} mb-1`}>
                                          {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                                        </Badge>
                                        <p className="text-xs text-gray-500">{time}</p>
                                      </div>
                                    </div>

                                    {/* Event metadata */}
                                    {event.metadata && (
                                      <div className="border-t pt-3 mt-3">
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                          {event.metadata.fileCount && (
                                            <span>Files: {event.metadata.fileCount}</span>
                                          )}
                                          {event.metadata.fileSize && (
                                            <span>Size: {formatFileSize(event.metadata.fileSize)}</span>
                                          )}
                                          {event.metadata.commentType && (
                                            <span>Type: {event.metadata.commentType}</span>
                                          )}
                                          {event.metadata.studyType && (
                                            <span>Study: {event.metadata.studyType}</span>
                                          )}
                                          {event.metadata.status && (
                                            <Badge variant="outline" className="text-xs">
                                              {event.metadata.status}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Author info */}
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <User className="w-4 h-4" />
                                        <span>{event.author.name}</span>
                                        <Badge variant="secondary" className="text-xs">
                                          {event.author.role}
                                        </Badge>
                                      </div>
                                      <div className="flex space-x-1">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                          <Eye className="w-4 h-4" />
                                        </Button>
                                        {(event.type === 'report' || event.type === 'document') && (
                                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <Download className="w-4 h-4" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No timeline events found</p>
                  <p>
                    {filterType !== 'all'
                      ? 'Try selecting a different filter or "All Events"'
                      : 'Timeline events will appear here as activities are recorded'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}