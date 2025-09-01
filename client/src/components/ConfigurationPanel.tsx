import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CogIcon, ShieldCheckIcon, EyeIcon, EyeOffIcon } from "lucide-react";

interface ConfigurationPanelProps {
  disabled: boolean;
  onDeploymentCreate: (deployment: any) => void;
  analysisData: any;
}

export default function ConfigurationPanel({ 
  disabled, 
  onDeploymentCreate, 
  analysisData 
}: ConfigurationPanelProps) {
  const [awsAccessKey, setAwsAccessKey] = useState("");
  const [awsSecretKey, setAwsSecretKey] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [environment, setEnvironment] = useState("dev");
  const [terraformEnabled, setTerraformEnabled] = useState(true);
  const [cloudFormationEnabled, setCloudFormationEnabled] = useState(true);
  const [autoDeployEnabled, setAutoDeployEnabled] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  const { toast } = useToast();

  const deploymentMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await apiRequest('POST', '/api/deployments', config);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Deployment Configuration Created",
        description: autoDeployEnabled 
          ? "Deployment has started. Check the status below."
          : "Configuration saved. You can now generate documents.",
      });
      onDeploymentCreate(data);
    },
    onError: (error) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Failed to create deployment configuration",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!analysisData?.analysisId) {
      toast({
        title: "No Analysis Data",
        description: "Please complete the architecture analysis first",
        variant: "destructive",
      });
      return;
    }

    if (autoDeployEnabled && (!awsAccessKey || !awsSecretKey)) {
      toast({
        title: "Missing AWS Credentials",
        description: "AWS credentials are required for auto-deployment",
        variant: "destructive",
      });
      return;
    }

    deploymentMutation.mutate({
      analysisId: analysisData.analysisId,
      awsAccessKey,
      awsSecretKey,
      awsRegion,
      environment,
      terraformEnabled,
      cloudFormationEnabled,
      autoDeployEnabled,
      monitoringEnabled,
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          <CogIcon className="inline mr-2 h-5 w-5 text-primary" />
          Deployment Configuration
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* AWS Credentials */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="aws-access-key">AWS Access Key ID</Label>
              <div className="relative">
                <Input
                  id="aws-access-key"
                  type={showAccessKey ? "text" : "password"}
                  placeholder="AKIA..."
                  value={awsAccessKey}
                  onChange={(e) => setAwsAccessKey(e.target.value)}
                  disabled={disabled}
                  data-testid="input-aws-access-key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setShowAccessKey(!showAccessKey)}
                  data-testid="button-toggle-access-key"
                >
                  {showAccessKey ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="aws-secret-key">AWS Secret Access Key</Label>
              <div className="relative">
                <Input
                  id="aws-secret-key"
                  type={showSecretKey ? "text" : "password"}
                  placeholder="••••••••••••••••"
                  value={awsSecretKey}
                  onChange={(e) => setAwsSecretKey(e.target.value)}
                  disabled={disabled}
                  data-testid="input-aws-secret-key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  data-testid="button-toggle-secret-key"
                >
                  {showSecretKey ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="aws-region">AWS Region</Label>
              <Select value={awsRegion} onValueChange={setAwsRegion} disabled={disabled}>
                <SelectTrigger data-testid="select-aws-region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1">us-east-1 (N. Virginia)</SelectItem>
                  <SelectItem value="us-west-2">us-west-2 (Oregon)</SelectItem>
                  <SelectItem value="eu-west-1">eu-west-1 (Ireland)</SelectItem>
                  <SelectItem value="ap-southeast-1">ap-southeast-1 (Singapore)</SelectItem>
                  <SelectItem value="ap-northeast-1">ap-northeast-1 (Tokyo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-accent rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <ShieldCheckIcon className="h-5 w-5 text-primary mt-1" />
                <div className="text-sm">
                  <p className="font-medium">Secure Credential Handling</p>
                  <p className="text-muted-foreground">
                    Credentials are encrypted and never stored permanently.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Deployment Options */}
          <div className="space-y-4">
            <h4 className="font-medium">Deployment Options</h4>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terraform"
                  checked={terraformEnabled}
                  onCheckedChange={(checked) => setTerraformEnabled(checked as boolean)}
                  disabled={disabled}
                  data-testid="checkbox-terraform"
                />
                <Label htmlFor="terraform" className="text-sm">
                  Generate Infrastructure as Code (Terraform)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cloudformation"
                  checked={cloudFormationEnabled}
                  onCheckedChange={(checked) => setCloudFormationEnabled(checked as boolean)}
                  disabled={disabled}
                  data-testid="checkbox-cloudformation"
                />
                <Label htmlFor="cloudformation" className="text-sm">
                  Create CloudFormation templates
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-deploy"
                  checked={autoDeployEnabled}
                  onCheckedChange={(checked) => setAutoDeployEnabled(checked as boolean)}
                  disabled={disabled}
                  data-testid="checkbox-auto-deploy"
                />
                <Label htmlFor="auto-deploy" className="text-sm">
                  Auto-deploy after generation
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="monitoring"
                  checked={monitoringEnabled}
                  onCheckedChange={(checked) => setMonitoringEnabled(checked as boolean)}
                  disabled={disabled}
                  data-testid="checkbox-monitoring"
                />
                <Label htmlFor="monitoring" className="text-sm">
                  Enable monitoring & alerts
                </Label>
              </div>
            </div>
          </div>

          {/* Environment */}
          <div>
            <Label>Environment</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {['dev', 'staging', 'prod'].map((env) => (
                <Button
                  key={env}
                  type="button"
                  variant={environment === env ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEnvironment(env)}
                  disabled={disabled}
                  data-testid={`button-env-${env}`}
                >
                  {env.charAt(0).toUpperCase() + env.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={disabled || deploymentMutation.isPending}
            data-testid="button-configure-deployment"
          >
            {deploymentMutation.isPending ? (
              "Creating Configuration..."
            ) : disabled ? (
              "Upload Architecture First"
            ) : (
              "Configure Deployment"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
