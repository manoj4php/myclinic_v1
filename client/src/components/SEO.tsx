import { useEffect } from 'react';
import { defaultSEOConfig, SEOConfig } from '@/lib/seo-config';
import { useAuth } from '@/hooks/useAuth';

interface SEOProps extends Partial<SEOConfig> {
  path?: string;
}

export function SEO({
  title,
  description,
  canonicalUrl,
  ogImage,
  ogTitle,
  ogDescription,
  ogUrl,
  twitterCard,
  twitterCreator,
  twitterSite,
  twitterImage,
  noIndex,
  path
}: SEOProps) {
  const finalConfig: SEOConfig = {
    ...defaultSEOConfig,
    title: title || defaultSEOConfig.title,
    description: description || defaultSEOConfig.description,
    canonicalUrl: canonicalUrl || path ? `${window.location.origin}${path}` : undefined,
    ogImage: ogImage || defaultSEOConfig.ogImage,
    ogTitle: ogTitle || title || defaultSEOConfig.title,
    ogDescription: ogDescription || description || defaultSEOConfig.description,
    ogUrl: ogUrl || canonicalUrl || path ? `${window.location.origin}${path}` : undefined,
    twitterCard: twitterCard || defaultSEOConfig.twitterCard,
    twitterCreator: twitterCreator || defaultSEOConfig.twitterCreator,
    twitterSite: twitterSite || defaultSEOConfig.twitterSite,
    twitterImage: twitterImage || ogImage || defaultSEOConfig.ogImage,
    noIndex: noIndex || false,
  };

  useEffect(() => {
    // Update document title
    document.title = finalConfig.title;

    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', finalConfig.description);

    // Update canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink && finalConfig.canonicalUrl) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    if (canonicalLink && finalConfig.canonicalUrl) {
      canonicalLink.setAttribute('href', finalConfig.canonicalUrl);
    }

    // Update Open Graph tags
    const ogTags = {
      'og:title': finalConfig.ogTitle,
      'og:description': finalConfig.ogDescription,
      'og:image': finalConfig.ogImage,
      'og:url': finalConfig.ogUrl,
    };

    Object.entries(ogTags).forEach(([property, content]) => {
      if (content) {
        let metaTag = document.querySelector(`meta[property="${property}"]`);
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('property', property);
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', content);
      }
    });

    // Update Twitter Card tags
    const twitterTags = {
      'twitter:card': finalConfig.twitterCard,
      'twitter:creator': finalConfig.twitterCreator,
      'twitter:site': finalConfig.twitterSite,
      'twitter:image': finalConfig.twitterImage,
    };

    Object.entries(twitterTags).forEach(([name, content]) => {
      if (content) {
        let metaTag = document.querySelector(`meta[name="${name}"]`);
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('name', name);
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', content);
      }
    });

    // Update robots meta tag
    let robotsTag = document.querySelector('meta[name="robots"]');
    if (!robotsTag) {
      robotsTag = document.createElement('meta');
      robotsTag.setAttribute('name', 'robots');
      document.head.appendChild(robotsTag);
    }
    robotsTag.setAttribute('content', finalConfig.noIndex ? 'noindex,nofollow' : 'index,follow');

    // Cleanup function
    return () => {
      // Optional: Remove meta tags when component unmounts
      // Usually not needed as they will be updated by the next page
    };
  }, [finalConfig]);

  return null;
}