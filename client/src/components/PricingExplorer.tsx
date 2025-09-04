import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DollarSignIcon, SearchIcon, LoaderIcon, ChevronDownIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Service {
  ServiceCode: string;
  AttributeNames: string[];
}

interface PricingProduct {
  product: {
    productFamily: string;
    sku: string;
    attributes: Record<string, string>;
  };
  terms: {
    OnDemand?: Record<string, any>;
    Reserved?: Record<string, any>;
  };
}

export default function PricingExplorer() {
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedAttribute, setSelectedAttribute] = useState<string>("");
  const [selectedValue, setSelectedValue] = useState<string>("");
  const [pricingResults, setPricingResults] = useState<PricingProduct[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  // Get all AWS services
  const servicesQuery = useQuery({
    queryKey: ['/api/pricing/services'],
    enabled: true
  });

  // Get attributes for selected service
  const attributesQuery = useQuery({
    queryKey: ['/api/pricing/services', selectedService, 'attributes'],
    enabled: !!selectedService
  });

  // Get values for selected attribute
  const valuesQuery = useQuery({
    queryKey: ['/api/pricing/services', selectedService, 'attributes', selectedAttribute, 'values'],
    enabled: !!selectedService && !!selectedAttribute
  });

  // Get products mutation
  const productsMutation = useMutation({
    mutationFn: async ({ serviceCode, field, value }: { serviceCode: string; field: string; value: string }) => {
      const response = await apiRequest('POST', '/api/pricing/products', { serviceCode, field, value });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      } else {
        setPricingResults(data);
        toast({
          title: "Pricing Data Retrieved",
          description: `Found ${data.length} pricing records`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to Get Pricing",
        description: error.message || "Failed to retrieve pricing data",
        variant: "destructive",
      });
    }
  });

  const handleServiceChange = (serviceCode: string) => {
    setSelectedService(serviceCode);
    setSelectedAttribute("");
    setSelectedValue("");
    setPricingResults([]);
  };

  const handleAttributeChange = (attribute: string) => {
    setSelectedAttribute(attribute);
    setSelectedValue("");
    setPricingResults([]);
  };

  const handleValueChange = (value: string) => {
    setSelectedValue(value);
    setPricingResults([]);
  };

  const handleGetPricing = () => {
    if (selectedService && selectedAttribute && selectedValue) {
      productsMutation.mutate({
        serviceCode: selectedService,
        field: selectedAttribute,
        value: selectedValue
      });
    }
  };

  const toggleProductExpansion = (index: number) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedProducts(newExpanded);
  };

  const formatPrice = (terms: any) => {
    if (!terms) return "No pricing available";
    
    const onDemand = terms.OnDemand;
    if (onDemand) {
      const termKey = Object.keys(onDemand)[0];
      const priceDimensions = onDemand[termKey]?.priceDimensions;
      if (priceDimensions) {
        const priceKey = Object.keys(priceDimensions)[0];
        const pricePerUnit = priceDimensions[priceKey]?.pricePerUnit;
        if (pricePerUnit && pricePerUnit.USD) {
          return `$${pricePerUnit.USD} USD per ${priceDimensions[priceKey]?.unit}`;
        }
      }
    }
    
    return "Price not available";
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSignIcon className="h-5 w-5 text-primary" />
          <span>AWS Pricing Explorer</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Explore real-time AWS pricing data using the official AWS Pricing API.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Service Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">1. Select AWS Service</label>
          <Select value={selectedService} onValueChange={handleServiceChange}>
            <SelectTrigger data-testid="select-service">
              <SelectValue placeholder="Choose an AWS service..." />
            </SelectTrigger>
            <SelectContent>
              {servicesQuery.data?.map((service: Service) => (
                <SelectItem key={service.ServiceCode} value={service.ServiceCode}>
                  {service.ServiceCode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {servicesQuery.isLoading && (
            <p className="text-sm text-muted-foreground mt-1">Loading services...</p>
          )}
        </div>

        {/* Attribute Selection */}
        {selectedService && (
          <div>
            <label className="block text-sm font-medium mb-2">2. Select Pricing Attribute</label>
            <Select value={selectedAttribute} onValueChange={handleAttributeChange}>
              <SelectTrigger data-testid="select-attribute">
                <SelectValue placeholder="Choose an attribute..." />
              </SelectTrigger>
              <SelectContent>
                {attributesQuery.data?.map((attribute: string) => (
                  <SelectItem key={attribute} value={attribute}>
                    {attribute}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {attributesQuery.isLoading && (
              <p className="text-sm text-muted-foreground mt-1">Loading attributes...</p>
            )}
          </div>
        )}

        {/* Value Selection */}
        {selectedService && selectedAttribute && (
          <div>
            <label className="block text-sm font-medium mb-2">3. Select Attribute Value</label>
            <Select value={selectedValue} onValueChange={handleValueChange}>
              <SelectTrigger data-testid="select-value">
                <SelectValue placeholder="Choose a value..." />
              </SelectTrigger>
              <SelectContent>
                {valuesQuery.data?.slice(0, 50).map((value: string, index: number) => (
                  <SelectItem key={index} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {valuesQuery.isLoading && (
              <p className="text-sm text-muted-foreground mt-1">Loading values...</p>
            )}
            {valuesQuery.data && valuesQuery.data.length > 50 && (
              <p className="text-sm text-muted-foreground mt-1">
                Showing first 50 values of {valuesQuery.data.length} total
              </p>
            )}
          </div>
        )}

        {/* Get Pricing Button */}
        {selectedService && selectedAttribute && selectedValue && (
          <div>
            <Button 
              onClick={handleGetPricing}
              disabled={productsMutation.isPending}
              className="w-full"
              data-testid="button-get-pricing"
            >
              {productsMutation.isPending ? (
                <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <SearchIcon className="mr-2 h-4 w-4" />
              )}
              Get Pricing Data
            </Button>
          </div>
        )}

        {/* Pricing Results */}
        {pricingResults.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Pricing Records ({pricingResults.length} found)</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pricingResults.map((product, index) => (
                <Collapsible key={index}>
                  <CollapsibleTrigger 
                    className="w-full"
                    onClick={() => toggleProductExpansion(index)}
                  >
                    <div className="border border-border rounded-lg p-4 hover:bg-accent cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <p className="font-medium">{product.product.productFamily}</p>
                          <p className="text-sm text-muted-foreground">SKU: {product.product.sku}</p>
                          <p className="text-sm text-primary font-medium">
                            {formatPrice(product.terms)}
                          </p>
                        </div>
                        <ChevronDownIcon 
                          className={`h-4 w-4 transition-transform ${
                            expandedProducts.has(index) ? 'rotate-180' : ''
                          }`} 
                        />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-l-2 border-primary ml-4 pl-4 mt-2">
                      <div className="bg-muted rounded p-3">
                        <h4 className="font-medium mb-2">Product Attributes:</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(product.product.attributes).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span> {value}
                            </div>
                          ))}
                        </div>
                        
                        {product.terms && (
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">Pricing Terms:</h4>
                            <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                              {JSON.stringify(product.terms, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        )}

        {productsMutation.isPending && (
          <div className="text-center py-8">
            <LoaderIcon className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Fetching pricing data from AWS...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}