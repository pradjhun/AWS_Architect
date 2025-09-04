#!/usr/bin/env python3
import boto3
import json
import sys
import os
from typing import List, Dict, Any

class AWSPricingService:
    def __init__(self):
        # AWS Pricing API is only available in us-east-1
        self.client = boto3.client(
            'pricing', 
            region_name='us-east-1',
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
        )
    
    def get_services(self) -> List[Dict[str, Any]]:
        """Get all available AWS services for pricing"""
        try:
            response = self.client.describe_services()
            return response.get('Services', [])
        except Exception as e:
            return {'error': str(e)}
    
    def get_service_attributes(self, service_code: str) -> List[Dict[str, Any]]:
        """Get all attributes for a specific service"""
        try:
            response = self.client.describe_services(ServiceCode=service_code)
            if response.get('Services'):
                return response['Services'][0].get('AttributeNames', [])
            return []
        except Exception as e:
            return {'error': str(e)}
    
    def get_attribute_values(self, service_code: str, attribute_name: str) -> List[str]:
        """Get all possible values for a specific attribute"""
        try:
            response = self.client.get_attribute_values(
                ServiceCode=service_code,
                AttributeName=attribute_name
            )
            values = []
            for item in response.get('AttributeValues', []):
                values.append(item.get('Value', ''))
            return values
        except Exception as e:
            return {'error': str(e)}
    
    def get_products(self, service_code: str, filters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Get products with specified filters"""
        try:
            response = self.client.get_products(
                ServiceCode=service_code,
                Filters=filters
            )
            
            products = []
            for price_list in response.get('PriceList', []):
                # Parse the JSON string to get actual product data
                product_data = json.loads(price_list)
                products.append(product_data)
            
            return products
        except Exception as e:
            return {'error': str(e)}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Missing command'}))
        return
    
    command = sys.argv[1]
    pricing_service = AWSPricingService()
    
    try:
        if command == 'get_services':
            result = pricing_service.get_services()
        elif command == 'get_service_attributes':
            if len(sys.argv) < 3:
                result = {'error': 'Missing service_code'}
            else:
                service_code = sys.argv[2]
                result = pricing_service.get_service_attributes(service_code)
        elif command == 'get_attribute_values':
            if len(sys.argv) < 4:
                result = {'error': 'Missing service_code or attribute_name'}
            else:
                service_code = sys.argv[2]
                attribute_name = sys.argv[3]
                result = pricing_service.get_attribute_values(service_code, attribute_name)
        elif command == 'get_products':
            if len(sys.argv) < 5:
                result = {'error': 'Missing service_code, field, or value'}
            else:
                service_code = sys.argv[2]
                field = sys.argv[3]
                value = sys.argv[4]
                filters = [
                    {
                        'Type': 'TERM_MATCH',
                        'Field': field,
                        'Value': value
                    }
                ]
                result = pricing_service.get_products(service_code, filters)
        else:
            result = {'error': 'Unknown command'}
        
        print(json.dumps(result, indent=2))
    
    except Exception as e:
        print(json.dumps({'error': str(e)}))

if __name__ == '__main__':
    main()