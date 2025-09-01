import { ArchitectureAnalysisResult } from './openai';

// AWS pricing data (simplified - in production, use AWS Pricing API)
const AWS_PRICING = {
  'EC2': {
    't3.micro': { hourly: 0.0104, monthly: 7.5 },
    't3.small': { hourly: 0.0208, monthly: 15.0 },
    't3.medium': { hourly: 0.0416, monthly: 30.0 },
    't3.large': { hourly: 0.0832, monthly: 60.0 },
    't3.xlarge': { hourly: 0.1664, monthly: 120.0 },
    'm5.large': { hourly: 0.096, monthly: 69.12 },
    'm5.xlarge': { hourly: 0.192, monthly: 138.24 },
    'c5.large': { hourly: 0.085, monthly: 61.20 },
    'r5.large': { hourly: 0.126, monthly: 90.72 }
  },
  'RDS': {
    'db.t3.micro': { hourly: 0.017, monthly: 12.24 },
    'db.t3.small': { hourly: 0.034, monthly: 24.48 },
    'db.t3.medium': { hourly: 0.068, monthly: 48.96 },
    'db.m5.large': { hourly: 0.192, monthly: 138.24 },
    'db.r5.large': { hourly: 0.240, monthly: 172.80 }
  },
  'S3': {
    'standard': { per_gb: 0.023 }, // per GB/month
    'standard_ia': { per_gb: 0.0125 },
    'glacier': { per_gb: 0.004 }
  },
  'CloudFront': {
    'data_transfer': { per_gb: 0.085 }, // first 10TB per month
    'requests': { per_10k: 0.0075 }
  },
  'ALB': {
    'hourly': 0.0225,
    'monthly': 16.20,
    'lcu_hourly': 0.008 // Load Balancer Capacity Unit
  },
  'NAT_Gateway': {
    'hourly': 0.045,
    'monthly': 32.40,
    'data_processing_per_gb': 0.045
  },
  'EBS': {
    'gp3': { per_gb: 0.08 }, // per GB/month
    'gp2': { per_gb: 0.10 },
    'io1': { per_gb: 0.125 }
  }
};

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

export function calculateAWSCosts(analysisResult: ArchitectureAnalysisResult, region: string = 'us-east-1'): CostBreakdown {
  const costs = {
    compute: 0,
    storage: 0,
    network: 0,
    database: 0,
    total: 0,
    details: [] as any[]
  };

  for (const service of analysisResult.services) {
    switch (service.name.toUpperCase()) {
      case 'EC2':
        const instanceType = service.instance_type || 't3.medium';
        const ec2Cost = (AWS_PRICING.EC2[instanceType as keyof typeof AWS_PRICING.EC2]?.monthly || 30) * service.count;
        costs.compute += ec2Cost;
        costs.details.push({
          service: 'EC2',
          resource: `${service.count}x ${instanceType}`,
          quantity: service.count,
          unit_cost: AWS_PRICING.EC2[instanceType as keyof typeof AWS_PRICING.EC2]?.monthly || 30,
          total_cost: ec2Cost
        });

        // Add EBS storage if specified
        if (service.storage_size) {
          const ebsCost = service.storage_size * service.count * AWS_PRICING.EBS.gp3.per_gb;
          costs.storage += ebsCost;
          costs.details.push({
            service: 'EBS',
            resource: `${service.storage_size * service.count} GB gp3`,
            quantity: service.storage_size * service.count,
            unit_cost: AWS_PRICING.EBS.gp3.per_gb,
            total_cost: ebsCost
          });
        }
        break;

      case 'RDS':
        const dbInstanceType = service.instance_type || 'db.t3.medium';
        const rdsCost = (AWS_PRICING.RDS[dbInstanceType as keyof typeof AWS_PRICING.RDS]?.monthly || 50) * service.count;
        costs.database += rdsCost;
        costs.details.push({
          service: 'RDS',
          resource: `${service.count}x ${dbInstanceType}`,
          quantity: service.count,
          unit_cost: AWS_PRICING.RDS[dbInstanceType as keyof typeof AWS_PRICING.RDS]?.monthly || 50,
          total_cost: rdsCost
        });
        break;

      case 'S3':
        const s3StorageSize = service.storage_size || 100; // Default 100GB
        const s3Cost = s3StorageSize * AWS_PRICING.S3.standard.per_gb;
        costs.storage += s3Cost;
        costs.details.push({
          service: 'S3',
          resource: `${s3StorageSize} GB Standard`,
          quantity: s3StorageSize,
          unit_cost: AWS_PRICING.S3.standard.per_gb,
          total_cost: s3Cost
        });
        break;

      case 'ALB':
      case 'APPLICATION LOAD BALANCER':
        const albCost = AWS_PRICING.ALB.monthly * service.count;
        const lcuCost = AWS_PRICING.ALB.lcu_hourly * 24 * 30 * 2; // Estimate 2 LCUs
        const totalAlbCost = albCost + lcuCost;
        costs.network += totalAlbCost;
        costs.details.push({
          service: 'ALB',
          resource: `${service.count}x Load Balancer + LCUs`,
          quantity: service.count,
          unit_cost: AWS_PRICING.ALB.monthly + (lcuCost / service.count),
          total_cost: totalAlbCost
        });
        break;

      case 'CLOUDFRONT':
        const bandwidth = service.bandwidth || 1000; // Default 1TB/month
        const cfCost = bandwidth * AWS_PRICING.CloudFront.data_transfer.per_gb;
        costs.network += cfCost;
        costs.details.push({
          service: 'CloudFront',
          resource: `${bandwidth} GB Data Transfer`,
          quantity: bandwidth,
          unit_cost: AWS_PRICING.CloudFront.data_transfer.per_gb,
          total_cost: cfCost
        });
        break;

      case 'NAT GATEWAY':
        const natCost = AWS_PRICING.NAT_Gateway.monthly * service.count;
        const dataProcessing = (service.bandwidth || 500) * AWS_PRICING.NAT_Gateway.data_processing_per_gb;
        const totalNatCost = natCost + dataProcessing;
        costs.network += totalNatCost;
        costs.details.push({
          service: 'NAT Gateway',
          resource: `${service.count}x NAT Gateway + Data Processing`,
          quantity: service.count,
          unit_cost: AWS_PRICING.NAT_Gateway.monthly + (dataProcessing / service.count),
          total_cost: totalNatCost
        });
        break;

      default:
        // Generic service cost estimation
        const genericCost = service.count * 25; // $25 per service as fallback
        costs.compute += genericCost;
        costs.details.push({
          service: service.name,
          resource: `${service.count}x ${service.name}`,
          quantity: service.count,
          unit_cost: 25,
          total_cost: genericCost
        });
    }
  }

  costs.total = costs.compute + costs.storage + costs.network + costs.database;

  return costs;
}

export function calculateAnnualSavings(monthlyCost: number): number {
  // Estimate 20% savings with Reserved Instances and optimizations
  const annualCost = monthlyCost * 12;
  const potentialSavings = annualCost * 0.20;
  return potentialSavings;
}

export function generateCostOptimizationRecommendations(costBreakdown: CostBreakdown): string[] {
  const recommendations: string[] = [];

  if (costBreakdown.compute > costBreakdown.total * 0.6) {
    recommendations.push("Consider Reserved Instances for compute resources to save up to 75%");
    recommendations.push("Implement Auto Scaling to optimize instance usage during low traffic periods");
  }

  if (costBreakdown.storage > costBreakdown.total * 0.3) {
    recommendations.push("Use S3 Intelligent Tiering to automatically optimize storage costs");
    recommendations.push("Consider S3 Glacier for long-term archival storage");
  }

  if (costBreakdown.network > costBreakdown.total * 0.25) {
    recommendations.push("Optimize data transfer by using CloudFront CDN more effectively");
    recommendations.push("Consider AWS Direct Connect for high-volume data transfer");
  }

  if (costBreakdown.total > 500) {
    recommendations.push("Enable AWS Cost Explorer and set up billing alerts");
    recommendations.push("Consider AWS Savings Plans for additional discounts");
  }

  return recommendations;
}
