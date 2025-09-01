import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeArchitectureDiagram, generateDocumentContent } from "./services/bedrock";
import { calculateAWSCosts, generateCostOptimizationRecommendations } from "./services/awsPricing";
import { documentGenerator } from "./services/documentGenerator";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and SVG are allowed.'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // File upload and analysis endpoint
  app.post("/api/analyze-architecture", upload.single('diagram'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Convert uploaded file to base64
      const filePath = req.file.path;
      const fileBuffer = fs.readFileSync(filePath);
      const base64Image = fileBuffer.toString('base64');

      // Analyze the architecture diagram
      const analysisResult = await analyzeArchitectureDiagram(base64Image);
      
      // Calculate costs
      const region = req.body.region || 'us-east-1';
      const costBreakdown = calculateAWSCosts(analysisResult, region);
      
      // Generate cost optimization recommendations
      const costRecommendations = generateCostOptimizationRecommendations(costBreakdown);
      
      // Store analysis in database
      const analysis = await storage.createArchitectureAnalysis({
        imagePath: req.file.filename,
        analysisResult: analysisResult,
        identifiedServices: analysisResult.services,
        estimatedCost: costBreakdown,
        status: "completed"
      });

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      res.json({
        analysisId: analysis.id,
        services: analysisResult.services,
        costBreakdown,
        recommendations: [...analysisResult.recommendations, ...costRecommendations],
        confidence: analysisResult.confidence
      });

    } catch (error) {
      console.error("Error analyzing architecture:", error);
      
      // Clean up file on error
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error("Error cleaning up file:", cleanupError);
        }
      }
      
      res.status(500).json({ 
        error: "Failed to analyze architecture diagram",
        details: (error as Error).message 
      });
    }
  });

  // Get analysis by ID
  app.get("/api/analysis/:id", async (req, res) => {
    try {
      const analysis = await storage.getArchitectureAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ error: "Failed to fetch analysis" });
    }
  });

  // Create deployment configuration
  app.post("/api/deployments", async (req, res) => {
    try {
      const {
        analysisId,
        awsAccessKey,
        awsSecretKey,
        awsRegion,
        environment,
        terraformEnabled,
        cloudFormationEnabled,
        autoDeployEnabled,
        monitoringEnabled
      } = req.body;

      if (!analysisId || !awsRegion) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Verify AWS credentials (basic validation)
      if (autoDeployEnabled && (!awsAccessKey || !awsSecretKey)) {
        return res.status(400).json({ error: "AWS credentials required for auto-deployment" });
      }

      const deployment = await storage.createDeployment({
        analysisId,
        awsRegion,
        environment: environment || 'dev',
        terraformEnabled: terraformEnabled ? 1 : 0,
        cloudFormationEnabled: cloudFormationEnabled ? 1 : 0,
        autoDeployEnabled: autoDeployEnabled ? 1 : 0,
        monitoringEnabled: monitoringEnabled ? 1 : 0
      });

      // If auto-deploy is enabled, start the deployment process
      if (autoDeployEnabled) {
        // TODO: Implement actual AWS deployment using AWS SDK
        // For now, we'll simulate the deployment process
        setTimeout(async () => {
          try {
            await storage.updateDeploymentStatus(deployment.id, "in_progress", 25);
            setTimeout(async () => {
              await storage.updateDeploymentStatus(deployment.id, "in_progress", 65);
              setTimeout(async () => {
                await storage.updateDeploymentStatus(deployment.id, "completed", 100);
              }, 3000);
            }, 2000);
          } catch (error) {
            console.error("Error updating deployment status:", error);
          }
        }, 1000);
      }

      res.json(deployment);
    } catch (error) {
      console.error("Error creating deployment:", error);
      res.status(500).json({ error: "Failed to create deployment" });
    }
  });

  // Get deployment status
  app.get("/api/deployments/:id", async (req, res) => {
    try {
      const deployment = await storage.getDeployment(req.params.id);
      if (!deployment) {
        return res.status(404).json({ error: "Deployment not found" });
      }
      res.json(deployment);
    } catch (error) {
      console.error("Error fetching deployment:", error);
      res.status(500).json({ error: "Failed to fetch deployment" });
    }
  });

  // Generate documents
  app.post("/api/generate-documents", async (req, res) => {
    try {
      const { analysisId, documentTypes } = req.body;

      if (!analysisId || !documentTypes || !Array.isArray(documentTypes)) {
        return res.status(400).json({ error: "Invalid request parameters" });
      }

      const analysis = await storage.getArchitectureAnalysis(analysisId);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      const documents = [];

      for (let i = 0; i < documentTypes.length; i++) {
        const docType = documentTypes[i];
        
        try {
          // Add delay between API calls to avoid rate limiting
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
          }
          
          let documentBuffer: Buffer;
          
          switch (docType) {
            case 'pricing':
              documentBuffer = await documentGenerator.generatePricingDocument(
                analysis.analysisResult as any,
                analysis.estimatedCost as any,
                'us-east-1'
              );
              break;
            case 'solution':
              documentBuffer = await documentGenerator.generateSolutionDocument(
                analysis.analysisResult as any
              );
              break;
            case 'deployment':
              documentBuffer = await documentGenerator.generateDeploymentDocument(
                analysis.analysisResult as any,
                'us-east-1'
              );
              break;
            case 'monitoring':
              documentBuffer = await documentGenerator.generateMonitoringDocument(
                analysis.analysisResult as any
              );
              break;
            default:
              continue;
          }

          // Save document to filesystem (in production, use object storage)
          const fileName = `${docType}_${analysisId}_${Date.now()}.pdf`;
          const filePath = path.join('generated_docs', fileName);
          
          // Ensure directory exists
          if (!fs.existsSync('generated_docs')) {
            fs.mkdirSync('generated_docs');
          }
          
          fs.writeFileSync(filePath, documentBuffer);

          const document = await storage.createGeneratedDocument({
            analysisId,
            documentType: docType,
            filePath: fileName,
            status: "generated"
          });

          documents.push(document);
        } catch (error) {
          console.error(`Error generating ${docType} document:`, error);
          
          // Check if it's a rate limit error and provide better error handling
          const errorMessage = (error as Error).message;
          const status = errorMessage.includes('Too many requests') || errorMessage.includes('ThrottlingException') 
            ? "rate_limited" 
            : "failed";
          
          await storage.createGeneratedDocument({
            analysisId,
            documentType: docType,
            filePath: "",
            status
          });
        }
      }

      res.json({ documents });
    } catch (error) {
      console.error("Error generating documents:", error);
      res.status(500).json({ error: "Failed to generate documents" });
    }
  });

  // Download generated document
  app.get("/api/documents/:id/download", async (req, res) => {
    try {
      const document = await storage.getGeneratedDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const filePath = path.join('generated_docs', document.filePath);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Document file not found" });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${document.documentType}_document.pdf"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ error: "Failed to download document" });
    }
  });

  // Get documents for analysis
  app.get("/api/analysis/:analysisId/documents", async (req, res) => {
    try {
      const documents = await storage.getDocumentsByAnalysis(req.params.analysisId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
