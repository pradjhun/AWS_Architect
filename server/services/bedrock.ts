import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_DEFAULT_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface ArchitectureAnalysisResult {
  services: Array<{
    name: string;
    type: string;
    count: number;
    instance_type?: string;
    storage_size?: number;
    bandwidth?: number;
  }>;
  architecture_patterns: string[];
  recommendations: string[];
  confidence: number;
}

export async function analyzeArchitectureDiagram(base64Image: string): Promise<ArchitectureAnalysisResult> {
  try {
    const prompt = `You are an AWS architecture expert. Analyze the uploaded architecture diagram and identify AWS services, their configurations, and provide recommendations.

    Respond with JSON in this exact format:
    {
      "services": [
        {
          "name": "EC2",
          "type": "compute",
          "count": 3,
          "instance_type": "t3.medium",
          "storage_size": 20
        }
      ],
      "architecture_patterns": ["Load Balanced Web Tier", "Database Tier"],
      "recommendations": ["Consider using Auto Scaling Groups", "Implement Multi-AZ deployment"],
      "confidence": 0.95
    }

    For each service, include:
    - name: AWS service name (EC2, RDS, S3, etc.)
    - type: category (compute, storage, database, network, etc.)
    - count: number of instances/resources
    - instance_type: for EC2, RDS (if visible)
    - storage_size: in GB (if applicable)
    - bandwidth: expected GB/month (if applicable)

    Only identify services that are clearly visible in the diagram. Be conservative with estimates.

    Analyze this AWS architecture diagram and identify all services, their configurations, and provide optimization recommendations.`;

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }
        ]
      }),
      contentType: "application/json",
      accept: "application/json"
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const content = responseBody.content[0].text;
    
    // Extract JSON from the response content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    // Validate the response structure
    if (!result.services || !Array.isArray(result.services)) {
      throw new Error("Invalid analysis result: missing services array");
    }

    return {
      services: result.services,
      architecture_patterns: result.architecture_patterns || [],
      recommendations: result.recommendations || [],
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5))
    };

  } catch (error) {
    console.error("Error analyzing architecture diagram:", error);
    throw new Error("Failed to analyze architecture diagram: " + (error as Error).message);
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateDocumentContent(
  analysisResult: ArchitectureAnalysisResult,
  costBreakdown: any,
  documentType: 'pricing' | 'solution' | 'deployment' | 'monitoring',
  retryCount = 0
): Promise<string> {
  const maxRetries = 3;
  const baseDelay = 2000; // 2 seconds
  
  try {
    const prompts = {
      pricing: `Generate a comprehensive AWS pricing document based on the identified services and cost breakdown. Include:
        - Executive summary with total costs
        - Detailed cost breakdown by service
        - Monthly vs annual pricing
        - Cost optimization recommendations
        - Reserved instance savings opportunities
        Format as professional markdown.`,
      
      solution: `Generate a solution architecture document based on the analysis. Include:
        - Architecture overview and design principles
        - Service descriptions and justifications
        - High availability and disaster recovery considerations
        - Security best practices
        - Scalability considerations
        Format as professional markdown.`,
      
      deployment: `Generate a deployment guide based on the architecture. Include:
        - Pre-deployment checklist
        - Step-by-step deployment instructions
        - Terraform/CloudFormation code snippets
        - Post-deployment verification steps
        - Troubleshooting guide
        Format as professional markdown.`,
      
      monitoring: `Generate a monitoring and alerting setup guide. Include:
        - CloudWatch dashboard configuration
        - Key metrics to monitor for each service
        - Alert thresholds and escalation procedures
        - Performance optimization recommendations
        - Cost monitoring setup
        Format as professional markdown.`
    };

    const prompt = `You are an AWS solutions architect creating professional documentation. Generate comprehensive, production-ready content that follows AWS best practices.

    ${prompts[documentType]}

    Architecture Analysis:
    Services: ${JSON.stringify(analysisResult.services, null, 2)}
    Patterns: ${analysisResult.architecture_patterns.join(', ')}
    Recommendations: ${analysisResult.recommendations.join(', ')}
    
    Cost Breakdown: ${JSON.stringify(costBreakdown, null, 2)}`;

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      }),
      contentType: "application/json",
      accept: "application/json"
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.content[0].text || "";

  } catch (error) {
    console.error(`Error generating ${documentType} document (attempt ${retryCount + 1}):`, error);
    
    // Check if it's a throttling error and we haven't exceeded max retries
    const errorMessage = (error as Error).message;
    const isThrottlingError = errorMessage.includes('ThrottlingException') || 
                             errorMessage.includes('Too many requests') ||
                             errorMessage.includes('429');
    
    if (isThrottlingError && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
      console.log(`Throttling detected, waiting ${delay}ms before retry ${retryCount + 1}/${maxRetries}`);
      await sleep(delay);
      return generateDocumentContent(analysisResult, costBreakdown, documentType, retryCount + 1);
    }
    
    throw new Error(`Failed to generate ${documentType} document: ` + (error as Error).message);
  }
}
