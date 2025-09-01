import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const architectureAnalyses = pgTable("architecture_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  imagePath: text("image_path").notNull(),
  analysisResult: jsonb("analysis_result"),
  identifiedServices: jsonb("identified_services"),
  estimatedCost: jsonb("estimated_cost"),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deployments = pgTable("deployments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  analysisId: varchar("analysis_id").references(() => architectureAnalyses.id),
  awsRegion: text("aws_region").notNull(),
  environment: text("environment").notNull(), // dev, staging, prod
  terraformEnabled: integer("terraform_enabled").default(0), // 0 = false, 1 = true
  cloudFormationEnabled: integer("cloudformation_enabled").default(0),
  autoDeployEnabled: integer("auto_deploy_enabled").default(0),
  monitoringEnabled: integer("monitoring_enabled").default(0),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, failed
  progress: integer("progress").default(0), // 0-100
  deploymentLogs: jsonb("deployment_logs"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const generatedDocuments = pgTable("generated_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  analysisId: varchar("analysis_id").references(() => architectureAnalyses.id),
  documentType: text("document_type").notNull(), // pricing, solution, deployment, monitoring
  filePath: text("file_path").notNull(),
  status: text("status").notNull().default("pending"), // pending, generated, failed
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertArchitectureAnalysisSchema = createInsertSchema(architectureAnalyses).pick({
  imagePath: true,
  analysisResult: true,
  identifiedServices: true,
  estimatedCost: true,
  status: true,
});

export const insertDeploymentSchema = createInsertSchema(deployments).pick({
  analysisId: true,
  awsRegion: true,
  environment: true,
  terraformEnabled: true,
  cloudFormationEnabled: true,
  autoDeployEnabled: true,
  monitoringEnabled: true,
});

export const insertGeneratedDocumentSchema = createInsertSchema(generatedDocuments).pick({
  analysisId: true,
  documentType: true,
  filePath: true,
  status: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertArchitectureAnalysis = z.infer<typeof insertArchitectureAnalysisSchema>;
export type ArchitectureAnalysis = typeof architectureAnalyses.$inferSelect;
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deployments.$inferSelect;
export type InsertGeneratedDocument = z.infer<typeof insertGeneratedDocumentSchema>;
export type GeneratedDocument = typeof generatedDocuments.$inferSelect;

// Additional types for API responses
export interface IdentifiedService {
  name: string;
  type: string;
  count: number;
  estimatedCost: number;
  instance_type?: string;
  storage_size?: number;
  bandwidth?: number;
}

export interface CostBreakdown {
  compute: number;
  storage: number;
  network: number;
  database: number;
  total: number;
  details: {
    service: string;
    resource: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
  }[];
}

export interface AnalysisResult {
  services: IdentifiedService[];
  costBreakdown: CostBreakdown;
  recommendations: string[];
  confidence: number;
  architecture_patterns?: string[];
}

export interface DeploymentProgress {
  step: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message: string;
  timestamp: string;
}
