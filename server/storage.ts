import { 
  type User, 
  type InsertUser, 
  type ArchitectureAnalysis,
  type InsertArchitectureAnalysis,
  type Deployment,
  type InsertDeployment,
  type GeneratedDocument,
  type InsertGeneratedDocument
} from "@shared/schema";
import { randomUUID } from "crypto";

// Storage interface with CRUD methods for all entities
export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Architecture Analysis methods
  getArchitectureAnalysis(id: string): Promise<ArchitectureAnalysis | undefined>;
  createArchitectureAnalysis(analysis: InsertArchitectureAnalysis): Promise<ArchitectureAnalysis>;
  updateArchitectureAnalysisStatus(id: string, status: string): Promise<void>;

  // Deployment methods
  getDeployment(id: string): Promise<Deployment | undefined>;
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  updateDeploymentStatus(id: string, status: string, progress?: number): Promise<void>;

  // Generated Document methods
  getGeneratedDocument(id: string): Promise<GeneratedDocument | undefined>;
  createGeneratedDocument(document: InsertGeneratedDocument): Promise<GeneratedDocument>;
  getDocumentsByAnalysis(analysisId: string): Promise<GeneratedDocument[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private architectureAnalyses: Map<string, ArchitectureAnalysis>;
  private deployments: Map<string, Deployment>;
  private generatedDocuments: Map<string, GeneratedDocument>;

  constructor() {
    this.users = new Map();
    this.architectureAnalyses = new Map();
    this.deployments = new Map();
    this.generatedDocuments = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Architecture Analysis methods
  async getArchitectureAnalysis(id: string): Promise<ArchitectureAnalysis | undefined> {
    return this.architectureAnalyses.get(id);
  }

  async createArchitectureAnalysis(insertAnalysis: InsertArchitectureAnalysis): Promise<ArchitectureAnalysis> {
    const id = randomUUID();
    const now = new Date();
    const analysis: ArchitectureAnalysis = { 
      ...insertAnalysis, 
      id,
      userId: null, // No auth for now
      createdAt: now,
      updatedAt: now
    };
    this.architectureAnalyses.set(id, analysis);
    return analysis;
  }

  async updateArchitectureAnalysisStatus(id: string, status: string): Promise<void> {
    const analysis = this.architectureAnalyses.get(id);
    if (analysis) {
      analysis.status = status;
      analysis.updatedAt = new Date();
      this.architectureAnalyses.set(id, analysis);
    }
  }

  // Deployment methods
  async getDeployment(id: string): Promise<Deployment | undefined> {
    return this.deployments.get(id);
  }

  async createDeployment(insertDeployment: InsertDeployment): Promise<Deployment> {
    const id = randomUUID();
    const now = new Date();
    const deployment: Deployment = { 
      ...insertDeployment, 
      id,
      status: "pending",
      progress: 0,
      deploymentLogs: null,
      createdAt: now,
      updatedAt: now
    };
    this.deployments.set(id, deployment);
    return deployment;
  }

  async updateDeploymentStatus(id: string, status: string, progress?: number): Promise<void> {
    const deployment = this.deployments.get(id);
    if (deployment) {
      deployment.status = status;
      if (progress !== undefined) {
        deployment.progress = progress;
      }
      deployment.updatedAt = new Date();
      this.deployments.set(id, deployment);
    }
  }

  // Generated Document methods
  async getGeneratedDocument(id: string): Promise<GeneratedDocument | undefined> {
    return this.generatedDocuments.get(id);
  }

  async createGeneratedDocument(insertDocument: InsertGeneratedDocument): Promise<GeneratedDocument> {
    const id = randomUUID();
    const document: GeneratedDocument = { 
      ...insertDocument, 
      id,
      createdAt: new Date()
    };
    this.generatedDocuments.set(id, document);
    return document;
  }

  async getDocumentsByAnalysis(analysisId: string): Promise<GeneratedDocument[]> {
    return Array.from(this.generatedDocuments.values()).filter(
      (doc) => doc.analysisId === analysisId
    );
  }
}

export const storage = new MemStorage();
