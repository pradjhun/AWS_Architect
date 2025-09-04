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
    
    // Comprehensive AWS service configuration mapping
    
    // Email Services
    if (serviceName.includes('simple email service') || serviceName.includes('ses') || 
        serviceType.includes('email') || serviceType.includes('application integration')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Email Service',
        customFields: [
          { name: 'emailsPerMonth', label: 'Emails per Month', type: 'number', placeholder: '10000' },
          { name: 'attachmentSize', label: 'Avg Attachment Size (KB)', type: 'number', placeholder: '100' }
        ],
        description: 'SES pricing is based on emails sent and received, not instance count.'
      };
    }
    
    // Content Delivery Network
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
    
    // Storage Services
    else if (serviceName.includes('s3') || serviceType.includes('storage')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Storage Service',
        customFields: [
          { name: 'storageGB', label: 'Storage (GB)', type: 'number', placeholder: '1000' },
          { name: 'storageClass', label: 'Storage Class', type: 'select', options: ['Standard', 'Intelligent-Tiering', 'Standard-IA', 'Glacier', 'Deep Archive'] },
          { name: 'requests', label: 'Requests per Month', type: 'number', placeholder: '100000' }
        ],
        description: 'S3 pricing is based on storage volume, requests, and data transfer.'
      };
    }
    
    // Lambda Functions
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
    
    // Database Services
    else if (serviceName.includes('rds') || serviceName.includes('database') || serviceType.includes('database')) {
      return {
        showCount: true,
        showInstanceType: true,
        countLabel: 'Database Instances',
        customFields: [
          { name: 'engine', label: 'Database Engine', type: 'select', options: ['MySQL', 'PostgreSQL', 'Oracle', 'SQL Server', 'MariaDB'] },
          { name: 'storage', label: 'Storage (GB)', type: 'number', placeholder: '100' },
          { name: 'multiAZ', label: 'Multi-AZ', type: 'select', options: ['Yes', 'No'] }
        ],
        description: 'RDS pricing includes instance costs, storage, and backup storage.'
      };
    }
    
    // SNS - Simple Notification Service
    else if (serviceName.includes('simple notification service') || serviceName.includes('sns') || 
             serviceType.includes('notification')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Notification Service',
        customFields: [
          { name: 'notifications', label: 'Notifications per Month', type: 'number', placeholder: '100000' },
          { name: 'sms', label: 'SMS Messages per Month', type: 'number', placeholder: '1000' },
          { name: 'email', label: 'Email Notifications per Month', type: 'number', placeholder: '10000' }
        ],
        description: 'SNS pricing is based on number of notifications and delivery type.'
      };
    }
    
    // SQS - Simple Queue Service
    else if (serviceName.includes('simple queue service') || serviceName.includes('sqs') || 
             serviceType.includes('queue')) {
      return {
        showCount: false,
        showInstanceType: false,
        countLabel: 'Queue Service',
        customFields: [
          { name: 'requests', label: 'Requests per Month', type: 'number', placeholder: '1000000' },
          { name: 'queueType', label: 'Queue Type', type: 'select', options: ['Standard', 'FIFO'] }
        ],
        description: 'SQS pricing is based on number of requests, not queue count.'
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
          { name: 'caching', label: 'Caching', type: 'select', options: ['None', '0.5GB', '1.6GB', '6.1GB', '13.5GB'] }
        ],
        description: 'API Gateway pricing is based on API calls and optional caching.'
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
          { name: 'nodeType', label: 'Node Type', type: 'select', options: ['cache.t3.micro', 'cache.t3.small', 'cache.m5.large', 'cache.r5.large'] }
        ],
        description: 'ElastiCache pricing is based on cache node hours and data transfer.'
      };
    }
    
    // Load Balancers
    else if (serviceType.includes('network') || serviceType.includes('load balancer') || 
             serviceName.includes('load balancer')) {
      return {
        showCount: true,
        showInstanceType: false,
        countLabel: 'Load Balancers',
        customFields: [
          { name: 'lbType', label: 'Load Balancer Type', type: 'select', options: ['Application Load Balancer', 'Network Load Balancer', 'Classic Load Balancer'] },
          { name: 'dataProcessed', label: 'Data Processed (GB/month)', type: 'number', placeholder: '1000' }
        ],
        description: 'Load balancer pricing includes fixed hourly cost plus data processing charges.'
      };
    }
    
    // EC2 Compute Instances
    else if (serviceName.includes('ec2') || serviceType.includes('compute') || serviceType.includes('server')) {
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
                              value={service.customConfig?.[field.name] || ''}
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
                              value={service.customConfig?.[field.name] || ''}
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