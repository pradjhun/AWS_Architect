# AWS Application Pricing Document

## Monthly Cost Estimates (US East-1)

### Core Infrastructure
- **Amazon CloudFront**: $8.50/month (1TB data transfer)
- **AWS WAF**: $5.00/month (base) + $1.00/million requests
- **Application Load Balancer**: $16.20/month + $0.008/LCU-hour
- **Amazon ECS**: $0 (EC2 launch type)
- **EC2 Instances (2x t3.medium)**: $60.74/month
- **Auto Scaling Group**: $0 (no additional charges)

### Storage & Database
- **Amazon S3**: $23/month (1TB standard storage)
- **Amazon RDS**: $25.34/month (db.t3.micro)
- **Amazon ElastiCache**: $12.41/month (cache.t3.micro)

### Monitoring & Security
- **Amazon CloudWatch**: $3.50/month (basic monitoring)
- **AWS CloudTrail**: $2.00/month (management events)
- **Amazon SNS**: $0.50/month (1,000 notifications)
- **AWS IAM**: $0 (no additional charges)

### Data Transfer
- **Internet Gateway**: $0.09/GB out to internet
- **NAT Gateway**: $32.40/month + $0.045/GB processed

## Total Estimated Monthly Cost: $189-220

*Note: Costs vary based on actual usage, data transfer, and regional pricing. Use AWS Pricing Calculator for precise estimates.*

## Cost Optimization Recommendations
- Use Reserved Instances for predictable workloads (up to 75% savings)
- Implement S3 Intelligent Tiering for storage optimization
- Monitor CloudWatch metrics to right-size instances
- Use Spot Instances for non-critical workloads
