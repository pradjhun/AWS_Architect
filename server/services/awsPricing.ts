import { ArchitectureAnalysisResult } from './bedrock';

// AWS pricing data (simplified - in production, use AWS Pricing API)
const AWS_PRICING = {
  'EC2': {
    't3.micro': { hourly: 0.0104, monthly: 7.50 },
    't3.small': { hourly: 0.0208, monthly: 15.18 },
    't3.medium': { hourly: 0.0416, monthly: 30.37 },
    't3.large': { hourly: 0.0832, monthly: 60.74 },
    't3.xlarge': { hourly: 0.1664, monthly: 121.49 },
    'm5.large': { hourly: 0.096, monthly: 70.08 },
    'm5.xlarge': { hourly: 0.192, monthly: 140.16 },
    'c5.large': { hourly: 0.085, monthly: 62.05 },
    'r5.large': { hourly: 0.126, monthly: 91.98 }
  },
  'RDS': {
    'db.t3.micro': { hourly: 0.017, monthly: 12.41 },
    'db.t3.small': { hourly: 0.034, monthly: 24.82 },
    'db.t3.medium': { hourly: 0.068, monthly: 49.64 },
    'db.m5.large': { hourly: 0.192, monthly: 140.16 },
    'db.r5.large': { hourly: 0.240, monthly: 175.20 }
  },
  'S3': {
    'standard': { per_gb: 0.023 }, // per GB/month
    'standard_ia': { per_gb: 0.0125 },
    'glacier': { per_gb: 0.004 }
  },
  'CloudFront': {
    'monthly_base': 0,
    'data_transfer_per_gb': 0.085, // first 10TB per month
    'requests_per_10k': 0.0075
  },
  'ALB': {
    'hourly': 0.0225,
    'monthly': 16.20,
    'lcu_hourly': 0.008 // Load Balancer Capacity Unit
  },
  'WAF': {
    'monthly_base': 5.00,
    'per_million_requests': 1.00
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
  },
  'CloudWatch': {
    'basic_monitoring': 3.50,
    'detailed_monitoring_per_metric': 0.30
  },
  'CloudTrail': {
    'management_events': 2.00,
    'data_events_per_100k': 0.10
  },
  'SNS': {
    'per_1000_notifications': 0.50
  },
  'ElastiCache': {
    'cache.t3.micro': { hourly: 0.017, monthly: 12.41 },
    'cache.t3.small': { hourly: 0.034, monthly: 24.82 }
  },
  'ECS': {
    'fargate_per_vcpu_hour': 0.04048,
    'fargate_per_gb_hour': 0.004445,
    'ec2_launch_type': 0 // No additional charges when using EC2
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
        const cfCost = bandwidth * AWS_PRICING.CloudFront.data_transfer_per_gb + AWS_PRICING.CloudFront.monthly_base;
        costs.network += cfCost;
        costs.details.push({
          service: 'CloudFront',
          resource: `${bandwidth} GB Data Transfer`,
          quantity: bandwidth,
          unit_cost: AWS_PRICING.CloudFront.data_transfer_per_gb,
          total_cost: cfCost
        });
        break;

      case 'WAF':
      case 'AWS WAF':
        const wafCost = AWS_PRICING.WAF.monthly_base + AWS_PRICING.WAF.per_million_requests;
        costs.network += wafCost;
        costs.details.push({
          service: 'AWS WAF',
          resource: 'Base + 1M requests',
          quantity: 1,
          unit_cost: wafCost,
          total_cost: wafCost
        });
        break;

      case 'ECS':
      case 'ELASTIC CONTAINER SERVICE':
        // Assuming EC2 launch type (no additional charges)
        const ecsCost = AWS_PRICING.ECS.ec2_launch_type;
        costs.compute += ecsCost;
        costs.details.push({
          service: 'Amazon ECS',
          resource: 'EC2 launch type',
          quantity: service.count,
          unit_cost: 0,
          total_cost: ecsCost
        });
        break;

      case 'ELASTICACHE':
        const cacheInstanceType = service.instance_type || 'cache.t3.micro';
        const cacheCost = (AWS_PRICING.ElastiCache[cacheInstanceType as keyof typeof AWS_PRICING.ElastiCache]?.monthly || 12.41) * service.count;
        costs.database += cacheCost;
        costs.details.push({
          service: 'Amazon ElastiCache',
          resource: `${service.count}x ${cacheInstanceType}`,
          quantity: service.count,
          unit_cost: AWS_PRICING.ElastiCache[cacheInstanceType as keyof typeof AWS_PRICING.ElastiCache]?.monthly || 12.41,
          total_cost: cacheCost
        });
        break;

      case 'CLOUDWATCH':
        const cwCost = AWS_PRICING.CloudWatch.basic_monitoring;
        costs.network += cwCost;
        costs.details.push({
          service: 'Amazon CloudWatch',
          resource: 'Basic monitoring',
          quantity: 1,
          unit_cost: cwCost,
          total_cost: cwCost
        });
        break;

      case 'CLOUDTRAIL':
        const ctCost = AWS_PRICING.CloudTrail.management_events;
        costs.network += ctCost;
        costs.details.push({
          service: 'AWS CloudTrail',
          resource: 'Management events',
          quantity: 1,
          unit_cost: ctCost,
          total_cost: ctCost
        });
        break;

      case 'SNS':
      case 'SIMPLE NOTIFICATION SERVICE':
        const snsCost = AWS_PRICING.SNS.per_1000_notifications;
        costs.network += snsCost;
        costs.details.push({
          service: 'Amazon SNS',
          resource: '1,000 notifications',
          quantity: 1,
          unit_cost: snsCost,
          total_cost: snsCost
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
