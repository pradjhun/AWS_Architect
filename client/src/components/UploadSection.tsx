import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CloudUploadIcon, FolderOpenIcon, XIcon, SearchIcon, ImageIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UploadSectionProps {
  onAnalysisComplete: (data: any) => void;
  currentStep: number;
}

export default function UploadSection({ onAnalysisComplete, currentStep }: UploadSectionProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  const analysisMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('diagram', file);
      formData.append('region', 'us-east-1');
      
      const response = await apiRequest('POST', '/api/analyze-architecture', formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Analysis Complete",
        description: `Identified ${data.services?.length || 0} AWS services with ${(data.confidence * 100).toFixed(1)}% confidence`,
      });
      onAnalysisComplete(data);
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze architecture diagram",
        variant: "destructive",
      });
    }
  });

  const handleFileUpload = useCallback((file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPEG, PNG, or SVG file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
  }, [toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const removeFile = useCallback(() => {
    setUploadedFile(null);
  }, []);

  const startAnalysis = useCallback(() => {
    if (uploadedFile) {
      analysisMutation.mutate(uploadedFile);
    }
  }, [uploadedFile, analysisMutation]);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Upload AWS Architecture Diagram</h2>
          <p className="text-muted-foreground">
            Upload your AWS architecture diagram to automatically identify services and generate deployment documents.
          </p>
        </div>

        {!uploadedFile ? (
          <div
            className={`upload-dropzone rounded-lg p-8 text-center mb-6 cursor-pointer ${
              dragOver ? 'dragover' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
            data-testid="upload-dropzone"
          >
            <div className="flex flex-col items-center">
              <div className="bg-accent p-4 rounded-full mb-4">
                <CloudUploadIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Drop your architecture diagram here</h3>
              <p className="text-muted-foreground mb-4">or click to browse files</p>
              <Button type="button" data-testid="button-choose-file">
                <FolderOpenIcon className="mr-2 h-4 w-4" />
                Choose File
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Supports PNG, JPG, SVG up to 10MB
              </p>
            </div>
            <input
              id="file-input"
              type="file"
              accept=".png,.jpg,.jpeg,.svg"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-file"
            />
          </div>
        ) : (
          <div className="bg-accent rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-primary text-primary-foreground p-2 rounded">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium" data-testid="text-filename">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-filesize">
                    {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                className="text-destructive hover:text-destructive/80"
                data-testid="button-remove-file"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        <div className="border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            <SearchIcon className="inline mr-2 h-5 w-5 text-primary" />
            AI Analysis Results
          </h3>

          {!analysisMutation.data && !analysisMutation.isPending && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Upload an architecture diagram to begin analysis</p>
              {uploadedFile && (
                <Button 
                  onClick={startAnalysis}
                  disabled={analysisMutation.isPending}
                  data-testid="button-analyze"
                >
                  <SearchIcon className="mr-2 h-4 w-4" />
                  Analyze Architecture
                </Button>
              )}
            </div>
          )}

          {analysisMutation.isPending && (
            <div className="text-center py-8">
              <div className="animate-pulse">
                <div className="bg-muted h-4 rounded mb-2"></div>
                <div className="bg-muted h-4 rounded w-3/4 mx-auto mb-2"></div>
                <div className="bg-muted h-4 rounded w-1/2 mx-auto"></div>
              </div>
              <p className="text-muted-foreground mt-4">Analyzing architecture diagram...</p>
            </div>
          )}

          {analysisMutation.data && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-accent rounded-lg p-4">
                <h4 className="font-medium mb-2">Identified Services</h4>
                <div className="space-y-2 text-sm">
                  {analysisMutation.data.services?.map((service: any, index: number) => (
                    <div key={index} className="flex items-center space-x-2" data-testid={`service-${index}`}>
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>{service.name} ({service.count} {service.count === 1 ? 'instance' : 'instances'})</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-accent rounded-lg p-4">
                <h4 className="font-medium mb-2">Estimated Monthly Cost</h4>
                <div className="text-2xl font-bold text-primary mb-2" data-testid="text-monthly-cost">
                  ${analysisMutation.data.costBreakdown?.total?.toFixed(2) || '0.00'}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Compute:</span>
                    <span data-testid="text-compute-cost">
                      ${analysisMutation.data.costBreakdown?.compute?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage:</span>
                    <span data-testid="text-storage-cost">
                      ${analysisMutation.data.costBreakdown?.storage?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Network:</span>
                    <span data-testid="text-network-cost">
                      ${analysisMutation.data.costBreakdown?.network?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {analysisMutation.data && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-700" data-testid="status-analysis-complete">
                  Analysis Complete
                </span>
              </div>
              <Button data-testid="button-proceed-configuration">
                Proceed to Configuration
                <i className="fas fa-arrow-right ml-2"></i>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
