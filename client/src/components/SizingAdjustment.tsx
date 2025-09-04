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
          {adjustedServices.map((service, index) => (
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

                {/* Instance Count */}
                <div>
                  <Label htmlFor={`service-count-${index}`}>Count</Label>
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

                {/* Instance Type (if applicable) */}
                {(service.type.toLowerCase().includes('ec2') || 
                  service.type.toLowerCase().includes('rds') || 
                  service.type.toLowerCase().includes('compute') ||
                  service.type.toLowerCase().includes('database')) && (
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
            </div>
          ))}
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