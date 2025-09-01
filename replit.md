# AWS Deploy App

## Overview

The AWS Deploy App is a full-stack web application designed to analyze architecture diagrams and deploy AWS infrastructure. Users upload architecture diagrams (images), and the system uses AI to identify AWS services, estimate costs, generate deployment configurations, and provide automated deployment capabilities. The application features a modern React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming support
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **File Upload**: Uppy with AWS S3 integration for direct-to-cloud uploads

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Storage**: Google Cloud Storage integration with custom ACL (Access Control List) system
- **File Processing**: Multer for multipart form data handling with file type validation

### Database Design
The schema includes four main entities:
- **Users**: Basic user management with username/password authentication
- **Architecture Analyses**: Stores uploaded diagrams and AI analysis results including identified services, cost estimates, and processing status
- **Deployments**: Tracks deployment configurations with AWS region settings, environment types, and deployment status with progress tracking
- **Generated Documents**: Manages various document types (pricing, solution, deployment, monitoring) linked to analyses

### AI Integration
- **Service**: OpenAI GPT-5 integration for architecture diagram analysis
- **Capabilities**: Automatically identifies AWS services, suggests instance types, estimates resource requirements, and provides architecture recommendations
- **Output**: Structured JSON responses with confidence scores and detailed service breakdowns

### Cost Analysis System
- **Pricing Engine**: Built-in AWS pricing calculator with region-specific rates
- **Services Covered**: EC2, RDS, S3, CloudFront, ALB, NAT Gateway, and EBS storage
- **Optimization**: Generates cost optimization recommendations based on identified services and usage patterns

### Document Generation
- **Engine**: jsPDF for programmatic PDF creation
- **Document Types**: Pricing analysis, solution architecture, deployment guides, and monitoring setups
- **Templates**: Branded document templates with headers, footers, and structured content sections

## External Dependencies

### Core Services
- **Neon Database**: Serverless PostgreSQL database hosting with connection pooling
- **OpenAI API**: GPT-5 model access for architecture diagram analysis and text generation
- **Google Cloud Storage**: Object storage with custom ACL implementation for secure file management
- **Replit Infrastructure**: Development environment with sidecar services for authentication and resource provisioning

### Third-Party Libraries
- **UI Framework**: Radix UI primitives for accessible component foundations
- **Styling**: Tailwind CSS with PostCSS for utility-first styling approach
- **Database**: Drizzle ORM with Zod for runtime type validation and schema management
- **File Upload**: Uppy ecosystem for robust file handling with progress tracking and error recovery
- **PDF Generation**: jsPDF for client-side document creation and export functionality
- **Authentication**: Session-based authentication with connect-pg-simple for PostgreSQL session storage

### Development Tools
- **Build System**: Vite with React plugin and TypeScript support
- **Type Safety**: TypeScript with strict mode enabled across frontend, backend, and shared modules
- **Code Quality**: ESLint integration with React and TypeScript rules
- **Development**: Hot module replacement and runtime error overlays for improved developer experience