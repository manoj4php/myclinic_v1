import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Send, 
  Edit, 
  Trash, 
  Calendar,
  User,
  ArrowLeft,
  Plus,
  Filter,
  Search,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface CommentsPageProps {
  patientId: string;
}

interface Comment {
  id: string;
  content: string;
  type: 'general' | 'medical' | 'administrative' | 'urgent';
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  isEdited: boolean;
}

export default function CommentsPage({ patientId }: CommentsPageProps) {
  const [, setLocation] = useLocation();
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<Comment['type']>('general');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [filterType, setFilterType] = useState<Comment['type'] | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
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

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ["/api/patients", patientId, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}/comments`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ content, type }: { content: string; type: Comment['type'] }) => {
      const response = await fetch(`/api/patients/${patientId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to add comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "comments"] });
      setNewComment('');
      setCommentType('general');
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  // Edit comment mutation
  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const response = await fetch(`/api/patients/${patientId}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to edit comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "comments"] });
      setEditingComment(null);
      setEditContent('');
      toast({
        title: "Success",
        description: "Comment updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update comment",
        variant: "destructive",
      });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetch(`/api/patients/${patientId}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "comments"] });
      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) {
      toast({
        title: "Empty comment",
        description: "Please enter a comment",
        variant: "destructive",
      });
      return;
    }

    addCommentMutation.mutate({
      content: newComment.trim(),
      type: commentType,
    });
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = () => {
    if (!editContent.trim()) {
      toast({
        title: "Empty comment",
        description: "Comment cannot be empty",
        variant: "destructive",
      });
      return;
    }

    editCommentMutation.mutate({
      commentId: editingComment!,
      content: editContent.trim(),
    });
  };

  const handleDeleteComment = (commentId: string) => {
    if (confirm('Are you sure you want to delete this comment?')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const getCommentTypeColor = (type: Comment['type']) => {
    switch (type) {
      case 'medical': return 'bg-blue-100 text-blue-800';
      case 'administrative': return 'bg-green-100 text-green-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCommentTypeIcon = (type: Comment['type']) => {
    switch (type) {
      case 'medical': return <User className="w-3 h-3" />;
      case 'administrative': return <Calendar className="w-3 h-3" />;
      case 'urgent': return <AlertCircle className="w-3 h-3" />;
      default: return <MessageSquare className="w-3 h-3" />;
    }
  };

  const filteredComments = comments.filter((comment: Comment) => {
    const matchesType = filterType === 'all' || comment.type === filterType;
    const matchesSearch = searchTerm === '' || 
      comment.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.author.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
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
              <h1 className="text-2xl font-bold text-gray-900">Patient Comments</h1>
              <p className="text-gray-600">
                Manage comments and notes for {patient?.name || 'Patient'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add New Comment */}
        <div className="lg:col-span-1">
          <Card className="shadow-lg sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add New Comment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Patient Info */}
              {patient && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-blue-800">
                    <User className="w-4 h-4" />
                    <span><strong>{patient.name}</strong></span>
                    <span>•</span>
                    <span>ID: {patient.id.slice(0, 8)}</span>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="comment-type">Comment Type</Label>
                <select
                  id="comment-type"
                  value={commentType}
                  onChange={(e) => setCommentType(e.target.value as Comment['type'])}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="general">General</option>
                  <option value="medical">Medical</option>
                  <option value="administrative">Administrative</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <Label htmlFor="new-comment">Comment</Label>
                <Textarea
                  id="new-comment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Enter your comment..."
                  className="mt-1"
                  rows={4}
                />
              </div>

              <Button 
                onClick={handleAddComment}
                disabled={addCommentMutation.isPending}
                className="w-full"
              >
                {addCommentMutation.isPending ? (
                  <>Adding...</>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Add Comment
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Comments List */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Comments ({filteredComments.length})
                </div>
              </CardTitle>
              
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as Comment['type'] | 'all')}
                    className="p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="general">General</option>
                    <option value="medical">Medical</option>
                    <option value="administrative">Administrative</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2 flex-1">
                  <Search className="w-4 h-4 text-gray-500" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search comments..."
                    className="flex-1"
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {filteredComments.length > 0 ? (
                <div className="space-y-4">
                  {filteredComments.map((comment: Comment) => (
                    <div key={comment.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={comment.author.avatar} />
                            <AvatarFallback>
                              {comment.author.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{comment.author.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {comment.author.role}
                              </Badge>
                              <Badge className={`text-xs ${getCommentTypeColor(comment.type)}`}>
                                <span className="flex items-center space-x-1">
                                  {getCommentTypeIcon(comment.type)}
                                  <span className="capitalize">{comment.type}</span>
                                </span>
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(comment.createdAt)}</span>
                              {comment.isEdited && <span>(edited)</span>}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditComment(comment)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {editingComment === comment.id ? (
                        <div className="space-y-3">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full"
                            rows={3}
                          />
                          <div className="flex space-x-2">
                            <Button size="sm" onClick={handleSaveEdit}>
                              Save
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setEditingComment(null);
                                setEditContent('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No comments found</p>
                  <p>
                    {searchTerm || filterType !== 'all'
                      ? 'Try adjusting your search or filter criteria'
                      : 'Be the first to add a comment for this patient'
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