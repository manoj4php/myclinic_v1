# Clinic Portal

## Overview

A healthcare management system built as a full-stack web application for managing clinic operations. The system provides role-based access control for super admins, admins, and doctors/users to manage patients, medical records, file uploads, notifications, and analytics. Features include patient registration, medical file management with cloud storage, email notifications, reporting capabilities, and comprehensive analytics dashboard.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React + TypeScript**: Modern single-page application with type safety
- **Vite**: Fast development server and build tool optimized for React
- **Wouter**: Lightweight client-side routing library for navigation
- **TanStack Query**: Server state management with caching, background updates, and optimistic updates
- **Shadcn/ui + Radix**: Comprehensive component library built on Radix primitives for accessibility
- **Tailwind CSS**: Utility-first styling with CSS variables for theming
- **React Hook Form + Zod**: Form handling with runtime validation and type inference

The frontend follows a component-based architecture with clear separation between UI components, business logic hooks, and data fetching. The application uses a sidebar navigation layout with role-based route access controls.

### Backend Architecture
- **Express.js**: RESTful API server with middleware-based request processing
- **TypeScript**: End-to-end type safety with shared schema definitions
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Session-based Authentication**: Secure user sessions stored in PostgreSQL
- **Object Storage Service**: File upload handling with ACL-based access control
- **Email Service**: SendGrid integration for automated notifications

The backend implements a clean separation of concerns with dedicated modules for database operations, authentication, file storage, and email services. API routes are organized by feature with consistent error handling and logging.

### Data Storage Solutions
- **PostgreSQL**: Primary database using Neon serverless PostgreSQL
- **Drizzle Schema**: Centralized schema definitions shared between frontend and backend
- **Session Storage**: PostgreSQL-based session management for authentication
- **File Storage**: Google Cloud Storage integration for medical files and documents
- **Data Archival**: Configurable patient data archival system for compliance

Database design includes comprehensive audit trails with created_at, updated_at, created_by, updated_by, and ip_address fields on all tables. Patient data includes archival capabilities for regulatory compliance.

### Authentication and Authorization
- **Replit Auth**: OAuth-based authentication using OpenID Connect
- **Role-based Access**: Three-tier permission system (super_admin, admin, user)
- **Session Management**: Secure session handling with PostgreSQL storage
- **Route Guards**: Frontend route protection based on user roles and permissions
- **API Authorization**: Middleware-based request authorization for backend endpoints

### External Dependencies
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Google Cloud Storage**: Object storage for medical files with ACL management
- **Gmail SMTP**: Email service using Gmail SMTP with nodemailer for patient notifications and system alerts
- **Replit Auth**: Authentication provider with OpenID Connect integration
- **Uppy**: File upload library with dashboard UI and AWS S3 compatibility

The system integrates tightly with Replit's infrastructure for authentication and deployment, while using external services for specialized functionality like email delivery and file storage.