import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  DollarSignIcon, 
  FileTextIcon, 
  RocketIcon, 
  BarChart3Icon, 
  DownloadIcon, 
  EyeIcon 
} from "lucide-react";

interface DocumentGenerationProps {
  analysisData: any;
}

export default function DocumentGeneration({ analysisData }: DocumentGenerationProps) {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([
    'pricing', 'solution', 'deployment', 'monitoring'
  ]);
  const { toast } = useToast();

  const generateDocumentsMutation = useMutation({
    mutationFn: async (documentTypes: string[]) => {
      const response = await apiRequest('POST', '/api/generate-documents', {
        analysisId: analysisData.analysisId,
        documentTypes
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Documents Generated",
        description: "All selected documents have been generated successfully",
      });
      documentsQuery.refetch();
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate documents",
        variant: "destructive",
      });
    }
  });

  const documentsQuery = useQuery({
    queryKey: ['/api/analysis', analysisData?.analysisId, 'documents'],
    enabled: !!analysisData?.analysisId,
  });

  const handleGenerateDocuments = () => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document type to generate",
        variant: "destructive",
      });
      return;
    }
    generateDocumentsMutation.mutate(selectedDocuments);
  };

  const handleDownloadAll = () => {
    // Download all generated documents
    documentsQuery.data?.forEach((doc: any) => {
      if (doc.status === 'generated') {
        window.open(`/api/documents/${doc.id}/download`, '_blank');
      }
    });
  };

  const documentTypes = [
    {
      id: 'pricing',
      name: 'Pricing Document',
      description: 'Detailed cost breakdown and optimization recommendations',
      icon: DollarSignIcon,
      color: 'green',
      stats: {
        'Monthly Cost': `$${analysisData?.costBreakdown?.total?.toFixed(2) || '0.00'}`,
        'Annual Savings': `$${((analysisData?.costBreakdown?.total || 0) * 12 * 0.2).toFixed(2)}`
      }
    },
    {
      id: 'solution',
      name: 'Solution Architecture',
      description: 'Comprehensive architecture documentation with best practices',
      icon: FileTextIcon,
      color: 'blue',
      stats: {
        'High Availability Design': '✓',
        'Security Best Practices': '✓'
      }
    },
    {
      id: 'deployment',
      name: 'Deployment Guide',
      description: 'Step-by-step deployment instructions and automation scripts',
      icon: RocketIcon,
      color: 'purple',
      stats: {
        'Terraform Scripts': '✓',
        'CloudFormation Templates': '✓'
      }
    },
    {
      id: 'monitoring',
      name: 'Monitoring Setup',
      description: 'CloudWatch dashboards and alerting configuration',
      icon: BarChart3Icon,
      color: 'orange',
      stats: {
        'Performance Metrics': '✓',
        'Alert Policies': '✓'
      }
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800',
      orange: 'bg-orange-100 text-orange-800'
    };
    return colorMap[color as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
  };

  const getDocumentStatus = (docType: string) => {
    return documentsQuery.data?.find((doc: any) => doc.documentType === docType);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Generated Documents</h2>
            <p className="text-muted-foreground">
              Professional documents generated from your architecture analysis
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleGenerateDocuments}
              disabled={generateDocumentsMutation.isPending}
              data-testid="button-generate-documents"
            >
              {generateDocumentsMutation.isPending ? "Generating..." : "Generate Documents"}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadAll}
              disabled={!documentsQuery.data?.some((doc: any) => doc.status === 'generated')}
              data-testid="button-download-all"
            >
              <DownloadIcon className="mr-2 h-4 w-4" />
              Download All
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {documentTypes.map((docType) => {
            const IconComponent = docType.icon;
            const status = getDocumentStatus(docType.id);
            
            return (
              <div
                key={docType.id}
                className="document-preview rounded-lg border border-border p-4 hover:shadow-lg transition-shadow"
                data-testid={`document-card-${docType.id}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${getColorClasses(docType.color)}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="text-xs text-muted-foreground">PDF</div>
                </div>

                <h3 className="font-semibold mb-2">{docType.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{docType.description}</p>

                <div className="space-y-2 text-xs mb-4">
                  {Object.entries(docType.stats).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span>{key}:</span>
                      <span className={value === '✓' ? 'text-green-600' : 'font-medium'}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                {status?.status === 'generated' ? (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(`/api/documents/${status.id}/download`, '_blank')}
                      data-testid={`button-download-${docType.id}`}
                    >
                      <DownloadIcon className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                ) : status?.status === 'failed' ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    disabled
                  >
                    Generation Failed
                  </Button>
                ) : generateDocumentsMutation.isPending ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled
                  >
                    Generating...
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    data-testid={`button-preview-${docType.id}`}
                  >
                    <EyeIcon className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
