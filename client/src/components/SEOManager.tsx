import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SEOConfig, defaultSEOConfig } from '@/lib/seo-config';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { useToast } from '@/hooks/use-toast';

interface SEOManagerProps {
  path?: string;
  currentConfig?: Partial<SEOConfig>;
  onSave?: (config: SEOConfig) => void;
}

export function SEOManager({ path, currentConfig, onSave }: SEOManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<SEOConfig>({
    ...defaultSEOConfig,
    ...currentConfig,
  });

  // Check if user is super admin
  if (!user || user.role !== 'super_admin') {
    return null;
  }

  const handleSave = () => {
    if (onSave) {
      onSave(config);
      toast({
        title: 'SEO Configuration Saved',
        description: 'The SEO settings have been successfully updated.',
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>SEO Management {path && `for ${path}`}</CardTitle>
        <CardDescription>Configure SEO settings for this page</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Page Title</Label>
          <Input
            id="title"
            value={config.title}
            onChange={(e) => setConfig({ ...config, title: e.target.value })}
            placeholder="Enter page title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Meta Description</Label>
          <Textarea
            id="description"
            value={config.description}
            onChange={(e) => setConfig({ ...config, description: e.target.value })}
            placeholder="Enter meta description"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="canonicalUrl">Canonical URL</Label>
          <Input
            id="canonicalUrl"
            value={config.canonicalUrl}
            onChange={(e) => setConfig({ ...config, canonicalUrl: e.target.value })}
            placeholder="Enter canonical URL"
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Open Graph Settings</h3>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="ogTitle">OG Title</Label>
              <Input
                id="ogTitle"
                value={config.ogTitle}
                onChange={(e) => setConfig({ ...config, ogTitle: e.target.value })}
                placeholder="Enter Open Graph title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ogDescription">OG Description</Label>
              <Textarea
                id="ogDescription"
                value={config.ogDescription}
                onChange={(e) => setConfig({ ...config, ogDescription: e.target.value })}
                placeholder="Enter Open Graph description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ogImage">OG Image URL</Label>
              <Input
                id="ogImage"
                value={config.ogImage}
                onChange={(e) => setConfig({ ...config, ogImage: e.target.value })}
                placeholder="Enter Open Graph image URL"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Twitter Card Settings</h3>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="twitterCard">Card Type</Label>
              <Select
                value={config.twitterCard}
                onValueChange={(value) => setConfig({ ...config, twitterCard: value })}
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
                value={config.twitterCreator}
                onChange={(e) => setConfig({ ...config, twitterCreator: e.target.value })}
                placeholder="Enter Twitter creator handle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitterSite">Twitter Site</Label>
              <Input
                id="twitterSite"
                value={config.twitterSite}
                onChange={(e) => setConfig({ ...config, twitterSite: e.target.value })}
                placeholder="Enter Twitter site handle"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="noIndex"
            checked={config.noIndex}
            onCheckedChange={(checked) => setConfig({ ...config, noIndex: checked })}
          />
          <Label htmlFor="noIndex">Prevent search engine indexing</Label>
        </div>

        <Button onClick={handleSave} className="w-full">
          Save SEO Configuration
        </Button>
      </CardContent>
    </Card>
  );
}