import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SettingsIcon, RefreshCwIcon } from "lucide-react";

interface Service {
  name: string;
  type: string;
  count: number;
  instance_type?: string;
  customConfig?: Record<string, string | number>;
}

interface SizingAdjustmentProps {
  services: Service[];
  analysisId: string;
  onSizingUpdate: (updatedData: any) => void;
}

const EC2_INSTANCE_TYPES = [
  't3.nano', 't3.micro', 't3.small', 't3.medium', 't3.large', 't3.xlarge', 't3.2xlarge',
  'm5.large', 'm5.xlarge', 'm5.2xlarge', 'm5.4xlarge', 'm5.8xlarge', 'm5.12xlarge',
  'c5.large', 'c5.xlarge', 'c5.2xlarge', 'c5.4xlarge', 'c5.9xlarge', 'c5.18xlarge',
  'r5.large', 'r5.xlarge', 'r5.2xlarge', 'r5.4xlarge', 'r5.8xlarge', 'r5.12xlarge'
];

const RDS_INSTANCE_TYPES = [
  'db.t3.micro', 'db.t3.small', 'db.t3.medium', 'db.t3.large', 'db.t3.xlarge', 'db.t3.2xlarge',
  'db.m5.large', 'db.m5.xlarge', 'db.m5.2xlarge', 'db.m5.4xlarge', 'db.m5.8xlarge',
  'db.r5.large', 'db.r5.xlarge', 'db.r5.2xlarge', 'db.r5.4xlarge', 'db.r5.8xlarge'
];

export default function SizingAdjustment({ services, analysisId, onSizingUpdate }: SizingAdjustmentProps) {
  const [adjustedServices, setAdjustedServices] = useState<Service[]>(services);
  const { toast } = useToast();

  const recalculateMutation = useMutation({
    mutationFn: async (updatedServices: Service[]) => {
      const response = await apiRequest('POST', '/api/recalculate-costs', {
        analysisId,
        services: updatedServices
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Costs Recalculated",
        description: `Updated cost estimate: $${data.costBreakdown.total.toFixed(2)}/month`,
      });
      onSizingUpdate(data);
    },
    onError: (error) => {
      toast({
        title: "Recalculation Failed",
        description: error.message || "Failed to recalculate costs",
        variant: "destructive",
      });
    }
  });

  const handleServiceUpdate = (index: number, field: keyof Service, value: string | number) => {
    const updated = [...adjustedServices];
    if (field === 'count') {
      updated[index] = { ...updated[index], [field]: parseInt(value as string) || 1 };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setAdjustedServices(updated);
  };

  const getInstanceTypeOptions = (serviceType: string) => {
    if (serviceType.toLowerCase().includes('ec2') || serviceType.toLowerCase().includes('compute')) {
      return EC2_INSTANCE_TYPES;
    } else if (serviceType.toLowerCase().includes('rds') || serviceType.toLowerCase().includes('database')) {
      return RDS_INSTANCE_TYPES;
    }
    return [];
  };

  const getServiceConfiguration = (service: Service) => {
    const serviceName = service.name.toLowerCase();
    const serviceType = service.type.toLowerCase();
    
    // Comprehensive AWS service configuration mapping - 40+ services
    
    // === COMPUTE SERVICES ===
    
    // EC2 - Elastic Compute Cloud
    if (serviceName.includes('ec2') || serviceName.includes('elastic compute') || serviceType.includes('compute') || serviceType.includes('server')) {
      return {
        showCount: true,
        showInstanceType: true,
        countLabel: 'EC2 Instances',
        customFields: [
          { name: 'os', label: 'Operating System', type: 'select', options: ['Linux', 'Windows', 'RHEL', 'SUSE'] },
          { name: 'tenancy', label: 'Tenancy', type: 'select', options: ['Shared', 'Dedicated'] },
          { name: 'storage', label: 'EBS Storage (GB)', type: 'number', placeholder: '100' }
        ],
        description: 'EC2 pricing includes instance hours, storage, and data transfer.'
      };
    }
    
    // Lambda - Serverless Functions
    else if (serviceName.includes('lambda') || serviceType.includes('function')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Serverless Functions',
        customFields: [
          { name: 'invocations', label: 'Invocations per Month', type: 'number', placeholder: '1000000' },
          { name: 'memory', label: 'Memory (MB)', type: 'select', options: ['128', '256', '512', '1024', '2048', '3008'] },
          { name: 'duration', label: 'Avg Duration (ms)', type: 'number', placeholder: '200' }
        ],
        description: 'Lambda pricing is based on invocations, memory allocation, and execution time.'
      };
    }
    
    // ECS - Elastic Container Service
    else if (serviceName.includes('ecs') || serviceName.includes('elastic container') || serviceType.includes('container')) {
      return {
        showCount: true,
        showInstanceType: true,
        countLabel: 'Container Instances',
        customFields: [
          { name: 'launchType', label: 'Launch Type', type: 'select', options: ['EC2', 'Fargate'] },
          { name: 'cpu', label: 'vCPU Units', type: 'number', placeholder: '256' },
          { name: 'memory', label: 'Memory (MB)', type: 'number', placeholder: '512' }
        ],
        description: 'ECS pricing depends on launch type - EC2 instances or Fargate serverless containers.'
      };
    }
    
    // EKS - Elastic Kubernetes Service
    else if (serviceName.includes('eks') || serviceName.includes('kubernetes')) {
      return {
        showCount: true,
        showInstanceType: false,
        countLabel: 'EKS Clusters',
        customFields: [
          { name: 'nodeGroups', label: 'Worker Node Groups', type: 'number', placeholder: '2' },
          { name: 'nodeInstanceType', label: 'Node Instance Type', type: 'select', options: ['t3.medium', 'm5.large', 'm5.xlarge', 'c5.large'] },
          { name: 'nodesPerGroup', label: 'Nodes per Group', type: 'number', placeholder: '3' }
        ],
        description: 'EKS charges per cluster hour plus EC2 instances for worker nodes.'
      };
    }
    
    // Batch
    else if (serviceName.includes('batch')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Batch Service',
        customFields: [
          { name: 'jobsPerMonth', label: 'Jobs per Month', type: 'number', placeholder: '10000' },
          { name: 'computeType', label: 'Compute Type', type: 'select', options: ['EC2', 'Fargate', 'EC2 Spot'] },
          { name: 'avgJobDuration', label: 'Avg Job Duration (minutes)', type: 'number', placeholder: '15' }
        ],
        description: 'AWS Batch charges for underlying compute resources used by batch jobs.'
      };
    }
    
    // === STORAGE SERVICES ===
    
    // S3 - Simple Storage Service
    else if (serviceName.includes('s3') || serviceName.includes('simple storage') || serviceType.includes('storage')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Storage Service',
        customFields: [
          { name: 'storageGB', label: 'Storage (GB)', type: 'number', placeholder: '1000' },
          { name: 'storageClass', label: 'Storage Class', type: 'select', options: ['Standard', 'Intelligent-Tiering', 'Standard-IA', 'Glacier Instant', 'Glacier Flexible', 'Deep Archive'] },
          { name: 'requests', label: 'Requests per Month', type: 'number', placeholder: '100000' }
        ],
        description: 'S3 pricing is based on storage volume, requests, and data transfer.'
      };
    }
    
    // EBS - Elastic Block Store
    else if (serviceName.includes('ebs') || serviceName.includes('elastic block')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Block Storage',
        customFields: [
          { name: 'volumeSize', label: 'Volume Size (GB)', type: 'number', placeholder: '100' },
          { name: 'volumeType', label: 'Volume Type', type: 'select', options: ['gp3', 'gp2', 'io2', 'io1', 'st1', 'sc1'] },
          { name: 'iops', label: 'Provisioned IOPS', type: 'number', placeholder: '3000' }
        ],
        description: 'EBS charges for provisioned storage, IOPS, and throughput.'
      };
    }
    
    // EFS - Elastic File System
    else if (serviceName.includes('efs') || serviceName.includes('elastic file')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'File System',
        customFields: [
          { name: 'storageGB', label: 'Storage (GB)', type: 'number', placeholder: '500' },
          { name: 'storageClass', label: 'Storage Class', type: 'select', options: ['Standard', 'Infrequent Access'] },
          { name: 'throughputMode', label: 'Throughput Mode', type: 'select', options: ['Bursting', 'Provisioned'] }
        ],
        description: 'EFS pricing is based on storage used and throughput mode.'
      };
    }
    
    // FSx
    else if (serviceName.includes('fsx')) {
      return {
        showCount: true,
        showInstanceType: false,
        countLabel: 'FSx File Systems',
        customFields: [
          { name: 'fileSystemType', label: 'File System Type', type: 'select', options: ['Lustre', 'Windows File Server', 'NetApp ONTAP', 'OpenZFS'] },
          { name: 'storageCapacity', label: 'Storage Capacity (GB)', type: 'number', placeholder: '1200' },
          { name: 'throughputCapacity', label: 'Throughput (MB/s)', type: 'number', placeholder: '250' }
        ],
        description: 'FSx pricing depends on file system type, storage capacity, and throughput.'
      };
    }
    
    // === DATABASE SERVICES ===
    
    // RDS - Relational Database Service
    else if (serviceName.includes('rds') || serviceName.includes('relational database') || serviceType.includes('database')) {
      return {
        showCount: true,
        showInstanceType: true,
        countLabel: 'Database Instances',
        customFields: [
          { name: 'engine', label: 'Database Engine', type: 'select', options: ['MySQL', 'PostgreSQL', 'Oracle', 'SQL Server', 'MariaDB', 'Aurora MySQL', 'Aurora PostgreSQL'] },
          { name: 'storage', label: 'Storage (GB)', type: 'number', placeholder: '100' },
          { name: 'multiAZ', label: 'Multi-AZ', type: 'select', options: ['Yes', 'No'] }
        ],
        description: 'RDS pricing includes instance costs, storage, and backup storage.'
      };
    }
    
    // DynamoDB
    else if (serviceName.includes('dynamodb')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'NoSQL Database',
        customFields: [
          { name: 'readCapacity', label: 'Read Capacity Units', type: 'number', placeholder: '25' },
          { name: 'writeCapacity', label: 'Write Capacity Units', type: 'number', placeholder: '25' },
          { name: 'storageGB', label: 'Storage (GB)', type: 'number', placeholder: '25' },
          { name: 'billingMode', label: 'Billing Mode', type: 'select', options: ['On-Demand', 'Provisioned'] }
        ],
        description: 'DynamoDB pricing is based on throughput capacity and storage consumption.'
      };
    }
    
    // ElastiCache
    else if (serviceName.includes('elasticache') || serviceType.includes('cache')) {
      return {
        showCount: true,
        showInstanceType: true,
        countLabel: 'Cache Nodes',
        customFields: [
          { name: 'engine', label: 'Cache Engine', type: 'select', options: ['Redis', 'Memcached'] },
          { name: 'nodeType', label: 'Node Type', type: 'select', options: ['cache.t3.micro', 'cache.t3.small', 'cache.m6g.large', 'cache.r6g.large'] },
          { name: 'replicationGroups', label: 'Replication Groups', type: 'number', placeholder: '1' }
        ],
        description: 'ElastiCache pricing is based on cache node hours and data transfer.'
      };
    }
    
    // DocumentDB
    else if (serviceName.includes('documentdb')) {
      return {
        showCount: true,
        showInstanceType: true,
        countLabel: 'DocumentDB Instances',
        customFields: [
          { name: 'storage', label: 'Storage (GB)', type: 'number', placeholder: '10' },
          { name: 'backupRetention', label: 'Backup Retention (days)', type: 'number', placeholder: '7' },
          { name: 'ioRequests', label: 'I/O Requests per Month', type: 'number', placeholder: '1000000' }
        ],
        description: 'DocumentDB charges for instances, storage, I/O operations, and backup storage.'
      };
    }
    
    // Redshift
    else if (serviceName.includes('redshift')) {
      return {
        showCount: true,
        showInstanceType: true,
        countLabel: 'Redshift Nodes',
        customFields: [
          { name: 'nodeType', label: 'Node Type', type: 'select', options: ['dc2.large', 'dc2.8xlarge', 'ds2.xlarge', 'ds2.8xlarge', 'ra3.xlplus', 'ra3.4xlarge'] },
          { name: 'backupStorage', label: 'Backup Storage (GB)', type: 'number', placeholder: '100' },
          { name: 'spectrumQueries', label: 'Spectrum Queries', type: 'number', placeholder: '1000' }
        ],
        description: 'Redshift pricing includes node hours, backup storage, and Spectrum queries.'
      };
    }
    
    // === NETWORKING SERVICES ===
    
    // VPC - Virtual Private Cloud
    else if (serviceName.includes('vpc') || serviceName.includes('virtual private cloud')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'VPC Configuration',
        customFields: [
          { name: 'natGateways', label: 'NAT Gateways', type: 'number', placeholder: '2' },
          { name: 'dataProcessing', label: 'NAT Gateway Data (GB/month)', type: 'number', placeholder: '1000' },
          { name: 'vpcEndpoints', label: 'VPC Endpoints', type: 'number', placeholder: '5' }
        ],
        description: 'VPC charges for NAT Gateways, data processing, and VPC endpoints.'
      };
    }
    
    // CloudFront - Content Delivery Network
    else if (serviceName.includes('cloudfront') || serviceType.includes('cdn')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'CDN Service',
        customFields: [
          { name: 'dataTransferGB', label: 'Data Transfer (GB/month)', type: 'number', placeholder: '1000' },
          { name: 'requests', label: 'Requests (millions/month)', type: 'number', placeholder: '10' },
          { name: 'priceClass', label: 'Price Class', type: 'select', options: ['All Locations', 'North America & Europe', 'North America Only'] }
        ],
        description: 'CloudFront pricing is based on data transfer and requests, not distributions.'
      };
    }
    
    // Route 53 - DNS Service
    else if (serviceName.includes('route 53') || serviceName.includes('route53') || serviceType.includes('dns')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'DNS Service',
        customFields: [
          { name: 'hostedZones', label: 'Hosted Zones', type: 'number', placeholder: '5' },
          { name: 'dnsQueries', label: 'DNS Queries per Month', type: 'number', placeholder: '1000000' },
          { name: 'healthChecks', label: 'Health Checks', type: 'number', placeholder: '10' }
        ],
        description: 'Route 53 charges for hosted zones, DNS queries, and health checks.'
      };
    }
    
    // Load Balancers
    else if (serviceType.includes('network') || serviceType.includes('load balancer') || serviceName.includes('load balancer') || serviceName.includes('alb') || serviceName.includes('nlb')) {
      return {
        showCount: true,
        showInstanceType: false,
        countLabel: 'Load Balancers',
        customFields: [
          { name: 'lbType', label: 'Load Balancer Type', type: 'select', options: ['Application Load Balancer', 'Network Load Balancer', 'Gateway Load Balancer', 'Classic Load Balancer'] },
          { name: 'dataProcessed', label: 'Data Processed (GB/month)', type: 'number', placeholder: '1000' },
          { name: 'newConnections', label: 'New Connections per Second', type: 'number', placeholder: '25' }
        ],
        description: 'Load balancer pricing includes fixed hourly cost plus data processing charges.'
      };
    }
    
    // API Gateway
    else if (serviceName.includes('api gateway') || serviceType.includes('api')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'API Service',
        customFields: [
          { name: 'apiCalls', label: 'API Calls per Month', type: 'number', placeholder: '1000000' },
          { name: 'apiType', label: 'API Type', type: 'select', options: ['REST API', 'HTTP API', 'WebSocket API'] },
          { name: 'caching', label: 'Caching', type: 'select', options: ['None', '0.5GB', '1.6GB', '6.1GB', '13.5GB'] }
        ],
        description: 'API Gateway pricing is based on API calls and optional caching.'
      };
    }
    
    // Direct Connect
    else if (serviceName.includes('direct connect')) {
      return {
        showCount: true,
        showInstanceType: false,
        countLabel: 'Direct Connect Ports',
        customFields: [
          { name: 'portSpeed', label: 'Port Speed', type: 'select', options: ['50Mbps', '100Mbps', '200Mbps', '300Mbps', '400Mbps', '500Mbps', '1Gbps', '2Gbps', '5Gbps', '10Gbps'] },
          { name: 'dataTransfer', label: 'Data Transfer (GB/month)', type: 'number', placeholder: '1000' },
          { name: 'virtualInterfaces', label: 'Virtual Interfaces', type: 'number', placeholder: '1' }
        ],
        description: 'Direct Connect charges for port hours, data transfer, and virtual interfaces.'
      };
    }
    
    // === MESSAGING & APPLICATION INTEGRATION ===
    
    // SES - Simple Email Service
    else if (serviceName.includes('simple email service') || serviceName.includes('ses') || serviceType.includes('email') || serviceType.includes('application integration')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Email Service',
        customFields: [
          { name: 'emailsPerMonth', label: 'Emails per Month', type: 'number', placeholder: '10000' },
          { name: 'attachmentSize', label: 'Avg Attachment Size (KB)', type: 'number', placeholder: '100' },
          { name: 'dedicatedIPs', label: 'Dedicated IPs', type: 'number', placeholder: '0' }
        ],
        description: 'SES pricing is based on emails sent and received, not instance count.'
      };
    }
    
    // SNS - Simple Notification Service
    else if (serviceName.includes('simple notification service') || serviceName.includes('sns') || serviceType.includes('notification')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Notification Service',
        customFields: [
          { name: 'notifications', label: 'Notifications per Month', type: 'number', placeholder: '100000' },
          { name: 'sms', label: 'SMS Messages per Month', type: 'number', placeholder: '1000' },
          { name: 'email', label: 'Email Notifications per Month', type: 'number', placeholder: '10000' },
          { name: 'mobileNotifications', label: 'Mobile Push Notifications', type: 'number', placeholder: '50000' }
        ],
        description: 'SNS pricing is based on number of notifications and delivery type.'
      };
    }
    
    // SQS - Simple Queue Service
    else if (serviceName.includes('simple queue service') || serviceName.includes('sqs') || serviceType.includes('queue')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Queue Service',
        customFields: [
          { name: 'requests', label: 'Requests per Month', type: 'number', placeholder: '1000000' },
          { name: 'queueType', label: 'Queue Type', type: 'select', options: ['Standard', 'FIFO'] },
          { name: 'messageSize', label: 'Avg Message Size (KB)', type: 'number', placeholder: '64' }
        ],
        description: 'SQS pricing is based on number of requests, not queue count.'
      };
    }
    
    // EventBridge
    else if (serviceName.includes('eventbridge') || serviceName.includes('event bridge')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Event Service',
        customFields: [
          { name: 'events', label: 'Events per Month', type: 'number', placeholder: '1000000' },
          { name: 'customBuses', label: 'Custom Event Buses', type: 'number', placeholder: '5' },
          { name: 'rules', label: 'Event Rules', type: 'number', placeholder: '50' }
        ],
        description: 'EventBridge charges per published event and custom event buses.'
      };
    }
    
    // Step Functions
    else if (serviceName.includes('step functions')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Workflow Service',
        customFields: [
          { name: 'stateTransitions', label: 'State Transitions per Month', type: 'number', placeholder: '100000' },
          { name: 'workflowType', label: 'Workflow Type', type: 'select', options: ['Standard', 'Express'] },
          { name: 'avgExecutionTime', label: 'Avg Execution Time (seconds)', type: 'number', placeholder: '60' }
        ],
        description: 'Step Functions charges for state transitions and workflow execution time.'
      };
    }
    
    // === ANALYTICS & BIG DATA ===
    
    // Kinesis Data Streams
    else if (serviceName.includes('kinesis data streams') || serviceName.includes('kinesis streams')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Streaming Service',
        customFields: [
          { name: 'shards', label: 'Number of Shards', type: 'number', placeholder: '10' },
          { name: 'putRecords', label: 'PUT Records per Month', type: 'number', placeholder: '1000000' },
          { name: 'extendedRetention', label: 'Extended Retention (days)', type: 'number', placeholder: '7' }
        ],
        description: 'Kinesis Data Streams charges for shard hours and PUT/GET requests.'
      };
    }
    
    // Kinesis Data Firehose
    else if (serviceName.includes('kinesis data firehose') || serviceName.includes('kinesis firehose')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Data Delivery Service',
        customFields: [
          { name: 'dataIngested', label: 'Data Ingested (GB/month)', type: 'number', placeholder: '100' },
          { name: 'dataFormat', label: 'Data Format Conversion', type: 'select', options: ['None', 'Apache Parquet', 'Apache ORC'] },
          { name: 'compressionEnabled', label: 'Compression', type: 'select', options: ['Yes', 'No'] }
        ],
        description: 'Kinesis Data Firehose charges for data ingestion and format conversion.'
      };
    }
    
    // EMR - Elastic MapReduce
    else if (serviceName.includes('emr') || serviceName.includes('elastic mapreduce')) {
      return {
        showCount: true,
        showInstanceType: true,
        countLabel: 'EMR Instances',
        customFields: [
          { name: 'clusterType', label: 'Cluster Type', type: 'select', options: ['Transient', 'Persistent'] },
          { name: 'applications', label: 'Applications', type: 'select', options: ['Spark', 'Hadoop', 'Hive', 'Presto', 'HBase'] },
          { name: 'spotInstances', label: 'Use Spot Instances', type: 'select', options: ['Yes', 'No'] }
        ],
        description: 'EMR charges per instance hour plus EC2 instance costs.'
      };
    }
    
    // Athena
    else if (serviceName.includes('athena')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Query Service',
        customFields: [
          { name: 'dataScanned', label: 'Data Scanned (GB/month)', type: 'number', placeholder: '100' },
          { name: 'queryType', label: 'Query Type', type: 'select', options: ['Standard', 'Federated'] },
          { name: 'compressionRatio', label: 'Data Compression Ratio', type: 'select', options: ['No Compression', '2:1', '5:1', '10:1'] }
        ],
        description: 'Athena charges per GB of data scanned by queries.'
      };
    }
    
    // Glue
    else if (serviceName.includes('glue')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'ETL Service',
        customFields: [
          { name: 'dpuHours', label: 'DPU Hours per Month', type: 'number', placeholder: '100' },
          { name: 'crawlerRuns', label: 'Crawler Runs per Month', type: 'number', placeholder: '50' },
          { name: 'dataCatalogRequests', label: 'Data Catalog Requests', type: 'number', placeholder: '100000' }
        ],
        description: 'AWS Glue charges for DPU hours, crawler runtime, and Data Catalog requests.'
      };
    }
    
    // === MACHINE LEARNING ===
    
    // SageMaker
    else if (serviceName.includes('sagemaker')) {
      return {
        showCount: true,
        showInstanceType: true,
        countLabel: 'ML Instances',
        customFields: [
          { name: 'notebookHours', label: 'Notebook Instance Hours', type: 'number', placeholder: '100' },
          { name: 'trainingHours', label: 'Training Instance Hours', type: 'number', placeholder: '50' },
          { name: 'endpointHours', label: 'Endpoint Instance Hours', type: 'number', placeholder: '720' },
          { name: 'storageGB', label: 'ML Storage (GB)', type: 'number', placeholder: '100' }
        ],
        description: 'SageMaker charges for notebook, training, and endpoint instance hours plus storage.'
      };
    }
    
    // Comprehend
    else if (serviceName.includes('comprehend')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'NLP Service',
        customFields: [
          { name: 'textUnits', label: 'Text Units per Month', type: 'number', placeholder: '10000' },
          { name: 'documentClassification', label: 'Document Classification Requests', type: 'number', placeholder: '1000' },
          { name: 'entityExtraction', label: 'Entity Extraction Requests', type: 'number', placeholder: '5000' }
        ],
        description: 'Comprehend charges per text unit processed and analysis requests.'
      };
    }
    
    // Rekognition
    else if (serviceName.includes('rekognition')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Image/Video Analysis',
        customFields: [
          { name: 'imagesProcessed', label: 'Images Processed per Month', type: 'number', placeholder: '1000' },
          { name: 'videoMinutes', label: 'Video Minutes per Month', type: 'number', placeholder: '100' },
          { name: 'faceComparison', label: 'Face Comparison Requests', type: 'number', placeholder: '500' }
        ],
        description: 'Rekognition charges per image processed and video analysis minutes.'
      };
    }
    
    // === SECURITY & IDENTITY ===
    
    // IAM - Identity and Access Management
    else if (serviceName.includes('iam') || serviceName.includes('identity and access')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Identity Service',
        customFields: [
          { name: 'accessAnalyzerFindings', label: 'Access Analyzer Findings', type: 'number', placeholder: '1000' },
          { name: 'policySimulations', label: 'Policy Simulations', type: 'number', placeholder: '100' },
          { name: 'crossAccountRequests', label: 'Cross-Account Requests', type: 'number', placeholder: '10000' }
        ],
        description: 'IAM core features are free; charges apply for additional services like Access Analyzer.'
      };
    }
    
    // Cognito
    else if (serviceName.includes('cognito')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'User Authentication',
        customFields: [
          { name: 'monthlyActiveUsers', label: 'Monthly Active Users', type: 'number', placeholder: '10000' },
          { name: 'federatedIdentities', label: 'Federated Identity Requests', type: 'number', placeholder: '50000' },
          { name: 'smsMessages', label: 'SMS Messages for MFA', type: 'number', placeholder: '1000' }
        ],
        description: 'Cognito charges for monthly active users and SMS messages for MFA.'
      };
    }
    
    // KMS - Key Management Service
    else if (serviceName.includes('kms') || serviceName.includes('key management')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Key Management',
        customFields: [
          { name: 'customerManagedKeys', label: 'Customer Managed Keys', type: 'number', placeholder: '10' },
          { name: 'keyRequests', label: 'Key Usage Requests per Month', type: 'number', placeholder: '100000' },
          { name: 'keyRotation', label: 'Automatic Key Rotation', type: 'select', options: ['Enabled', 'Disabled'] }
        ],
        description: 'KMS charges per customer managed key per month plus API requests.'
      };
    }
    
    // Secrets Manager
    else if (serviceName.includes('secrets manager')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Secrets Management',
        customFields: [
          { name: 'secrets', label: 'Number of Secrets', type: 'number', placeholder: '50' },
          { name: 'apiCalls', label: 'API Calls per Month', type: 'number', placeholder: '10000' },
          { name: 'rotation', label: 'Automatic Rotation', type: 'select', options: ['Enabled', 'Disabled'] }
        ],
        description: 'Secrets Manager charges per secret per month and per API call.'
      };
    }
    
    // === MONITORING & MANAGEMENT ===
    
    // CloudWatch
    else if (serviceName.includes('cloudwatch')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Monitoring Service',
        customFields: [
          { name: 'customMetrics', label: 'Custom Metrics', type: 'number', placeholder: '100' },
          { name: 'logDataIngested', label: 'Log Data Ingested (GB)', type: 'number', placeholder: '10' },
          { name: 'alarms', label: 'CloudWatch Alarms', type: 'number', placeholder: '25' },
          { name: 'dashboards', label: 'Custom Dashboards', type: 'number', placeholder: '5' }
        ],
        description: 'CloudWatch charges for custom metrics, log ingestion, alarms, and dashboards.'
      };
    }
    
    // CloudTrail
    else if (serviceName.includes('cloudtrail')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Audit Service',
        customFields: [
          { name: 'dataEvents', label: 'Data Events per Month', type: 'number', placeholder: '100000' },
          { name: 'insightEvents', label: 'CloudTrail Insights Events', type: 'number', placeholder: '1000' },
          { name: 'trails', label: 'Additional Trails', type: 'number', placeholder: '2' }
        ],
        description: 'CloudTrail first trail is free; charges apply for data events and additional trails.'
      };
    }
    
    // Config
    else if (serviceName.includes('config') && !serviceName.includes('configuration')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Configuration Management',
        customFields: [
          { name: 'configItems', label: 'Configuration Items Recorded', type: 'number', placeholder: '10000' },
          { name: 'configRules', label: 'Config Rule Evaluations', type: 'number', placeholder: '50000' },
          { name: 'remediations', label: 'Remediation Actions', type: 'number', placeholder: '100' }
        ],
        description: 'AWS Config charges for configuration items recorded and rule evaluations.'
      };
    }
    
    // === ADDITIONAL SERVICES ===
    
    // WorkSpaces
    else if (serviceName.includes('workspaces')) {
      return {
        showCount: true,
        showInstanceType: false,
        countLabel: 'Virtual Desktops',
        customFields: [
          { name: 'bundleType', label: 'WorkSpaces Bundle', type: 'select', options: ['Value', 'Standard', 'Performance', 'Power', 'PowerPro', 'Graphics', 'GraphicsPro'] },
          { name: 'billingMode', label: 'Billing Mode', type: 'select', options: ['Monthly', 'Hourly'] },
          { name: 'rootVolume', label: 'Root Volume (GB)', type: 'number', placeholder: '80' }
        ],
        description: 'WorkSpaces charges per desktop per month or per hour of usage.'
      };
    }
    
    // AppStream 2.0
    else if (serviceName.includes('appstream')) {
      return {
        showCount: true,
        showInstanceType: true,
        countLabel: 'Streaming Instances',
        customFields: [
          { name: 'streamingHours', label: 'User Streaming Hours per Month', type: 'number', placeholder: '1000' },
          { name: 'fleetType', label: 'Fleet Type', type: 'select', options: ['Always-On', 'On-Demand'] },
          { name: 'storageGB', label: 'User Storage (GB)', type: 'number', placeholder: '10' }
        ],
        description: 'AppStream 2.0 charges for instance hours and user storage.'
      };
    }
    
    // Backup
    else if (serviceName.includes('backup') && !serviceName.includes('database')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Backup Service',
        customFields: [
          { name: 'backupStorage', label: 'Backup Storage (GB)', type: 'number', placeholder: '500' },
          { name: 'restoreRequests', label: 'Restore Requests per Month', type: 'number', placeholder: '10' },
          { name: 'crossRegionCopy', label: 'Cross-Region Copy (GB)', type: 'number', placeholder: '100' }
        ],
        description: 'AWS Backup charges for backup storage, restore requests, and cross-region transfers.'
      };
    }
    
    // Default for unrecognized services
    return {
      showCount: false,
      showInstanceType: false,
      countLabel: 'Managed Service',
      customFields: [
        { name: 'usageMetric', label: 'Primary Usage Metric', type: 'text', placeholder: 'e.g., requests, GB, hours' },
        { name: 'monthlyUsage', label: 'Monthly Usage', type: 'number', placeholder: '1000' }
      ],
      description: 'This is a managed AWS service with usage-based pricing. Configure the primary usage metrics.'
    };
  };

  const hasChanges = JSON.stringify(services) !== JSON.stringify(adjustedServices);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <span>Sizing Adjustment</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Adjust instance types and counts to optimize your architecture and costs.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {adjustedServices.map((service, index) => {
            const config = getServiceConfiguration(service);
            return (
              <div key={index} className="border border-border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  {/* Service Name (Read-only) */}
                  <div>
                    <Label htmlFor={`service-name-${index}`}>Service</Label>
                    <Input
                      id={`service-name-${index}`}
                      value={service.name}
                      disabled
                      className="bg-muted"
                      data-testid={`input-service-name-${index}`}
                    />
                  </div>

                  {/* Count/Configuration field */}
                  {config.showCount ? (
                    <div>
                      <Label htmlFor={`service-count-${index}`}>{config.countLabel}</Label>
                      <Input
                        id={`service-count-${index}`}
                        type="number"
                        min="1"
                        max="100"
                        value={service.count}
                        onChange={(e) => handleServiceUpdate(index, 'count', e.target.value)}
                        data-testid={`input-service-count-${index}`}
                      />
                    </div>
                  ) : (
                    <div>
                      <Label>Configuration</Label>
                      <Input
                        value="Managed Service"
                        disabled
                        className="bg-muted text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Pricing based on usage, not instance count
                      </p>
                    </div>
                  )}

                  {/* Instance Type (if applicable) */}
                  {config.showInstanceType && (
                    <div>
                      <Label htmlFor={`service-type-${index}`}>Instance Type</Label>
                      <Select 
                        value={service.instance_type || ''} 
                        onValueChange={(value) => handleServiceUpdate(index, 'instance_type', value)}
                      >
                        <SelectTrigger data-testid={`select-instance-type-${index}`}>
                          <SelectValue placeholder="Select instance type" />
                        </SelectTrigger>
                        <SelectContent>
                          {getInstanceTypeOptions(service.type).map((instanceType) => (
                            <SelectItem key={instanceType} value={instanceType}>
                              {instanceType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Service Type (Read-only) */}
                  <div>
                    <Label htmlFor={`service-type-display-${index}`}>Type</Label>
                    <Input
                      id={`service-type-display-${index}`}
                      value={service.type}
                      disabled
                      className="bg-muted"
                      data-testid={`input-service-type-${index}`}
                    />
                  </div>
                </div>

                {/* Service-specific custom fields */}
                {config.customFields && config.customFields.length > 0 && (
                  <div className="mt-4 p-4 bg-accent rounded-lg">
                    <h4 className="text-sm font-medium mb-3">{config.countLabel} Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {config.customFields.map((field, fieldIndex) => (
                        <div key={field.name}>
                          <Label htmlFor={`${field.name}-${index}`}>{field.label}</Label>
                          {field.type === 'select' ? (
                            <Select 
                              value={String(service.customConfig?.[field.name] || '')}
                              onValueChange={(value) => {
                                const updated = [...adjustedServices];
                                updated[index] = {
                                  ...updated[index],
                                  customConfig: {
                                    ...updated[index].customConfig,
                                    [field.name]: value
                                  }
                                };
                                setAdjustedServices(updated);
                              }}
                            >
                              <SelectTrigger data-testid={`select-${field.name}-${index}`}>
                                <SelectValue placeholder={`Select ${field.label}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options?.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id={`${field.name}-${index}`}
                              type={field.type}
                              placeholder={field.placeholder}
                              value={String(service.customConfig?.[field.name] || '')}
                              onChange={(e) => {
                                const updated = [...adjustedServices];
                                updated[index] = {
                                  ...updated[index],
                                  customConfig: {
                                    ...updated[index].customConfig,
                                    [field.name]: e.target.value
                                  }
                                };
                                setAdjustedServices(updated);
                              }}
                              data-testid={`input-${field.name}-${index}`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    {config.description && (
                      <p className="text-sm text-muted-foreground mt-3">
                        <strong>{service.name}:</strong> {config.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {hasChanges && (
          <div className="mt-6 p-4 bg-accent rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Changes Detected</p>
                <p className="text-sm text-muted-foreground">
                  Recalculate costs to see the impact of your sizing adjustments.
                </p>
              </div>
              <Button 
                onClick={() => recalculateMutation.mutate(adjustedServices)}
                disabled={recalculateMutation.isPending}
                data-testid="button-recalculate-costs"
              >
                {recalculateMutation.isPending ? (
                  <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCwIcon className="mr-2 h-4 w-4" />
                )}
                Recalculate Costs
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}