export interface SEOConfig {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterCreator?: string;
  twitterSite?: string;
  twitterImage?: string;
  noIndex?: boolean;
}

export const defaultSEOConfig: SEOConfig = {
  title: 'ClinicConnect - Medical Records & Study Management System',
  description: 'Secure medical records and study management system for healthcare providers. Manage patient data, DICOM files, and medical reports efficiently.',
  twitterCard: 'summary_large_image',
  twitterSite: '@clinicconnect',
  ogImage: '/og-image.jpg', // Default Open Graph image
};

// Path-specific SEO configurations
export const pathConfigs: Record<string, SEOConfig> = {
  '/': {
    ...defaultSEOConfig,
    title: 'ClinicConnect - Home',
    description: 'Welcome to ClinicConnect - Your comprehensive medical records management solution',
  },
  '/patients': {
    ...defaultSEOConfig,
    title: 'Patient Management - ClinicConnect',
    description: 'Manage patient records, medical files, and study data efficiently',
  },
  '/analytics': {
    ...defaultSEOConfig,
    title: 'Analytics Dashboard - ClinicConnect',
    description: 'Medical practice analytics and insights',
  },
};