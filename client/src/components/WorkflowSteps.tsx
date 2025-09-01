interface WorkflowStepsProps {
  currentStep: number;
}

export default function WorkflowSteps({ currentStep }: WorkflowStepsProps) {
  const steps = [
    { number: 1, title: "Upload Architecture", active: currentStep >= 1 },
    { number: 2, title: "Configure Deployment", active: currentStep >= 2 },
    { number: 3, title: "Generate & Deploy", active: currentStep >= 3 }
  ];

  return (
    <div className="flex items-center justify-center space-x-8">
      {steps.map((step, index) => (
        <div 
          key={step.number}
          className={`step-indicator flex items-center ${step.active ? 'active' : ''}`}
        >
          <div 
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              step.active 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}
            data-testid={`step-indicator-${step.number}`}
          >
            {step.number}
          </div>
          <span 
            className={`ml-3 text-sm font-medium ${
              step.active ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {step.title}
          </span>
        </div>
      ))}
    </div>
  );
}
