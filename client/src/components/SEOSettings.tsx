import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { defaultSEOConfig, type SEOConfig } from '@/lib/seo-config';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

const PAGE_PATHS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/patient-management', label: 'Patient Management' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/settings', label: 'Settings' },
  { path: '/notifications', label: 'Notifications' },
  { path: '/reports', label: 'Reports' }
];

export function SEOSettings() {
  const [selectedPath, setSelectedPath] = useState(PAGE_PATHS[0].path);
  const [formState, setFormState] = useState<SEOConfig>(defaultSEOConfig);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentConfig } = useQuery({
    queryKey: ['/api/seo-config', selectedPath],
    enabled: !!selectedPath,
    onSuccess: (data) => {
      setFormState(data || defaultSEOConfig);
    }
  });

  const handleInputChange = (key: keyof SEOConfig, value: any) => {
    setFormState(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiRequest('PUT', `/api/seo-config${selectedPath}`, formState);

      // Invalidate both the individual config and the list of all configs
      await queryClient.invalidateQueries({ queryKey: ['/api/seo-config', selectedPath] });
      await queryClient.invalidateQueries({ queryKey: ['/api/seo-configs'] });

      toast({
        title: 'Success',
        description: 'SEO configuration saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save SEO configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const config = currentConfig || defaultSEOConfig;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium">SEO Settings</h2>
          <p className="text-sm text-muted-foreground">
            Manage search engine optimization settings for each page
          </p>
        </div>
        <Select value={selectedPath} onValueChange={setSelectedPath}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select a page" />
          </SelectTrigger>
          <SelectContent>
            {PAGE_PATHS.map(({ path, label }) => (
              <SelectItem key={path} value={path}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList>
                <TabsTrigger value="basic">Basic SEO</TabsTrigger>
                <TabsTrigger value="social">Social Media</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Page Title</Label>
                  <Input
                    id="title"
                    value={formState.title || ''}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter page title"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended length: 50-60 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Meta Description</Label>
                  <Textarea
                    id="description"
                    value={formState.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter meta description"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended length: 150-160 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="canonicalUrl">Canonical URL</Label>
                  <Input
                    id="canonicalUrl"
                    value={formState.canonicalUrl || ''}
                    onChange={(e) => handleInputChange('canonicalUrl', e.target.value)}
                    placeholder="Enter canonical URL"
                  />
                </div>
              </TabsContent>

              <TabsContent value="social" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Open Graph</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ogTitle">OG Title</Label>
                      <Input
                        id="ogTitle"
                        value={formState.ogTitle || ''}
                        onChange={(e) => handleInputChange('ogTitle', e.target.value)}
                        placeholder="Enter Open Graph title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ogDescription">OG Description</Label>
                      <Textarea
                        id="ogDescription"
                        value={formState.ogDescription || ''}
                        onChange={(e) => handleInputChange('ogDescription', e.target.value)}
                        placeholder="Enter Open Graph description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ogImage">OG Image URL</Label>
                      <Input
                        id="ogImage"
                        value={formState.ogImage || ''}
                        onChange={(e) => handleInputChange('ogImage', e.target.value)}
                        placeholder="Enter Open Graph image URL"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Twitter Card</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="twitterCard">Card Type</Label>
                      <Select 
                        value={formState.twitterCard || ''}
                        onValueChange={(value) => handleInputChange('twitterCard', value)}
                      >
                        <SelectTrigger id="twitterCard">
                          <SelectValue placeholder="Select card type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="summary">Summary</SelectItem>
                          <SelectItem value="summary_large_image">Summary Large Image</SelectItem>
                          <SelectItem value="app">App</SelectItem>
                          <SelectItem value="player">Player</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitterCreator">Twitter Creator</Label>
                      <Input
                        id="twitterCreator"
                        value={formState.twitterCreator || ''}
                        onChange={(e) => handleInputChange('twitterCreator', e.target.value)}
                        placeholder="Enter Twitter creator handle"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitterSite">Twitter Site</Label>
                      <Input
                        id="twitterSite"
                        value={formState.twitterSite || ''}
                        onChange={(e) => handleInputChange('twitterSite', e.target.value)}
                        placeholder="Enter Twitter site handle"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="noIndex"
                    checked={formState.noIndex || false}
                    onCheckedChange={(checked) => handleInputChange('noIndex', checked)}
                  />
                  <Label htmlFor="noIndex">Prevent search engine indexing</Label>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-6 border-t">
              <Button 
                type="submit"
                disabled={isSaving}
                className="w-[200px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}