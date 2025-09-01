import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { 
  CheckCircleIcon, 
  LoaderIcon, 
  ClockIcon, 
  StopCircleIcon,
  XCircleIcon 
} from "lucide-react";

interface DeploymentStatusProps {
  deploymentData: any;
}

export default function DeploymentStatus({ deploymentData }: DeploymentStatusProps) {
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([
    '[14:32:15] Starting deployment to us-east-1...',
    '[14:32:16] Creating VPC vpc-0a1b2c3d4e5f6...',
    '[14:32:45] VPC created successfully',
    '[14:32:46] Creating subnets...',
    '[14:33:12] Public subnet subnet-1a2b3c4d created',
    '[14:33:15] Private subnet subnet-5e6f7g8h created',
    '[14:33:18] Creating security groups...',
    '[14:33:32] Security group sg-web created',
    '[14:33:35] Launching EC2 instances...',
  ]);

  const deploymentQuery = useQuery({
    queryKey: ['/api/deployments', deploymentData?.id],
    enabled: !!deploymentData?.id,
    refetchInterval: 2000, // Poll every 2 seconds
  });

  const deployment = deploymentQuery.data || deploymentData;

  useEffect(() => {
    // Simulate adding new logs during deployment
    if (deployment?.status === 'in_progress') {
      const interval = setInterval(() => {
        const newLogMessages = [
          `[${new Date().toLocaleTimeString()}] Instance i-${Math.random().toString(36).substr(2, 9)} launching...`,
          `[${new Date().toLocaleTimeString()}] Database instance creating...`,
          `[${new Date().toLocaleTimeString()}] Load balancer configuration in progress...`,
          `[${new Date().toLocaleTimeString()}] Setting up monitoring dashboards...`,
        ];
        
        setDeploymentLogs(prev => [
          ...prev,
          newLogMessages[Math.floor(Math.random() * newLogMessages.length)]
        ]);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [deployment?.status]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <LoaderIcon className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-700';
      case 'in_progress':
        return 'text-yellow-700';
      case 'failed':
        return 'text-red-700';
      default:
        return 'text-muted-foreground';
    }
  };

  const resourceSteps = [
    { 
      name: 'VPC & Networking', 
      status: deployment?.progress >= 25 ? 'completed' : 'pending' 
    },
    { 
      name: 'EC2 Instances', 
      status: deployment?.progress >= 50 ? 'completed' : deployment?.progress >= 25 ? 'in_progress' : 'pending',
      detail: deployment?.progress >= 25 && deployment?.progress < 50 ? '2/3 Created' : null
    },
    { 
      name: 'RDS Database', 
      status: deployment?.progress >= 75 ? 'completed' : deployment?.progress >= 50 ? 'in_progress' : 'pending' 
    },
    { 
      name: 'Load Balancer', 
      status: deployment?.progress >= 100 ? 'completed' : deployment?.progress >= 75 ? 'in_progress' : 'pending' 
    },
  ];

  const estimatedTimeRemaining = deployment?.progress ? 
    Math.max(0, Math.round((100 - deployment.progress) * 0.1)) : 10;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Deployment Status</h2>
            <p className="text-muted-foreground">
              Real-time deployment progress and resource creation
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {getStatusIcon(deployment?.status || 'pending')}
              <span 
                className={`text-sm ${getStatusColor(deployment?.status || 'pending')}`}
                data-testid="status-deployment"
              >
                {getStatusText(deployment?.status || 'pending')}
              </span>
            </div>
            {deployment?.status === 'in_progress' && (
              <Button 
                variant="destructive" 
                size="sm"
                data-testid="button-stop-deployment"
              >
                <StopCircleIcon className="mr-2 h-4 w-4" />
                Stop Deployment
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-4">Resource Creation Progress</h3>
            <div className="space-y-4">
              {resourceSteps.map((step, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(step.status)}
                    <span 
                      className="text-sm"
                      data-testid={`resource-${step.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {step.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {step.detail || (step.status === 'completed' ? 'Completed' : 
                                   step.status === 'in_progress' ? 'In Progress' : 'Pending')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Deployment Logs</h3>
            <div 
              className="bg-muted rounded-lg p-4 h-48 overflow-y-auto font-mono text-xs custom-scrollbar"
              data-testid="deployment-logs"
            >
              <div className="space-y-1 text-muted-foreground">
                {deploymentLogs.map((log, index) => (
                  <div 
                    key={index}
                    className={index >= deploymentLogs.length - 2 ? 'text-yellow-600' : ''}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-accent rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-medium mb-1">Overall Progress</h4>
              <p className="text-sm text-muted-foreground">
                {deployment?.status === 'completed' ? 'Deployment completed successfully!' :
                 deployment?.status === 'failed' ? 'Deployment failed. Check logs for details.' :
                 `Estimated completion: ${estimatedTimeRemaining} minutes remaining`}
              </p>
            </div>
            <div className="text-right">
              <div 
                className="text-2xl font-bold text-primary"
                data-testid="text-progress-percentage"
              >
                {deployment?.progress || 0}%
              </div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>
          <Progress 
            value={deployment?.progress || 0} 
            className="h-2"
            data-testid="progress-deployment"
          />
        </div>
      </CardContent>
    </Card>
  );
}
