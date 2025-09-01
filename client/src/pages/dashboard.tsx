import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CloudIcon } from "lucide-react";
import WorkflowSteps from "@/components/WorkflowSteps";
import UploadSection from "@/components/UploadSection";
import ConfigurationPanel from "@/components/ConfigurationPanel";
import DocumentGeneration from "@/components/DocumentGeneration";
import DeploymentStatus from "@/components/DeploymentStatus";

export default function Dashboard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [deploymentData, setDeploymentData] = useState<any>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                <CloudIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AWS Deploy App</h1>
                <p className="text-sm text-muted-foreground">Architecture to Deployment</p>
              </div>
            </div>
            <nav className="flex items-center space-x-6">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Documentation
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Support
              </a>
              <Button>
                <i className="fas fa-user mr-2"></i>Account
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Workflow Steps */}
        <div className="mb-8">
          <WorkflowSteps currentStep={currentStep} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-2">
            <UploadSection 
              onAnalysisComplete={(data) => {
                setAnalysisData(data);
                setCurrentStep(2);
              }}
              currentStep={currentStep}
            />
          </div>

          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <ConfigurationPanel 
              disabled={!analysisData}
              onDeploymentCreate={(deployment) => {
                setDeploymentData(deployment);
                setCurrentStep(3);
              }}
              analysisData={analysisData}
            />
          </div>
        </div>

        {/* Document Generation */}
        {analysisData && (
          <div className="mt-8">
            <DocumentGeneration analysisData={analysisData} />
          </div>
        )}

        {/* Deployment Status */}
        {deploymentData && (
          <div className="mt-8">
            <DeploymentStatus deploymentData={deploymentData} />
          </div>
        )}
      </main>
    </div>
  );
}
