import { jsPDF } from 'jspdf';
import { CostBreakdown } from './awsPricing';
import { ArchitectureAnalysisResult } from './bedrock';

export class DocumentGenerator {
  private addHeader(doc: jsPDF, title: string) {
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, 30);
    
    doc.setDrawColor(59, 130, 246); // Blue color
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 150, 25);
  }

  private addFooter(doc: jsPDF, pageNumber: number) {
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`AWS Deploy App - Page ${pageNumber}`, 20, pageHeight - 10);
    doc.text('Confidential - Internal Use Only', 150, pageHeight - 10);
  }

  generatePricingDocument(
    analysisResult: ArchitectureAnalysisResult,
    costBreakdown: CostBreakdown,
    region: string
  ): Buffer {
    const doc = new jsPDF();
    
    this.addHeader(doc, 'AWS Architecture Pricing Analysis');
    this.addFooter(doc, 1);

    // Executive Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', 20, 50);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Monthly Cost: $${costBreakdown.total.toFixed(2)}`, 20, 65);
    doc.text(`Annual Cost: $${(costBreakdown.total * 12).toFixed(2)}`, 20, 75);
    doc.text(`Deployment Region: ${region}`, 20, 85);
    
    // Cost Breakdown
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Cost Breakdown by Category', 20, 105);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    let yPos = 120;
    
    const categories = [
      { name: 'Compute Services', cost: costBreakdown.compute },
      { name: 'Storage Services', cost: costBreakdown.storage },
      { name: 'Network Services', cost: costBreakdown.network },
      { name: 'Database Services', cost: costBreakdown.database }
    ];
    
    categories.forEach(category => {
      if (category.cost > 0) {
        doc.text(`${category.name}: $${category.cost.toFixed(2)}`, 30, yPos);
        yPos += 10;
      }
    });

    // Detailed Service Costs
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Service Costs', 20, yPos + 15);
    
    yPos += 30;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    costBreakdown.details.forEach(detail => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 30;
        this.addFooter(doc, 2);
      }
      
      doc.text(`${detail.service}: ${detail.resource}`, 30, yPos);
      doc.text(`$${detail.total_cost.toFixed(2)}/month`, 150, yPos);
      yPos += 10;
    });

    // Recommendations
    if (yPos > 200) {
      doc.addPage();
      yPos = 30;
      this.addFooter(doc, 3);
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Cost Optimization Recommendations', 20, yPos + 15);
    
    yPos += 30;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    analysisResult.recommendations.forEach((rec, index) => {
      if (yPos > 260) {
        doc.addPage();
        yPos = 30;
      }
      doc.text(`${index + 1}. ${rec}`, 30, yPos);
      yPos += 15;
    });

    return Buffer.from(doc.output('arraybuffer'));
  }

  generateSolutionDocument(analysisResult: ArchitectureAnalysisResult): Buffer {
    const doc = new jsPDF();
    
    this.addHeader(doc, 'AWS Solution Architecture Document');
    this.addFooter(doc, 1);

    // Architecture Overview
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Architecture Overview', 20, 50);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Confidence Level: ${(analysisResult.confidence * 100).toFixed(1)}%`, 20, 65);
    doc.text(`Analysis Date: ${new Date().toLocaleDateString()}`, 20, 75);

    // Identified Services
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Identified AWS Services', 20, 95);
    
    let yPos = 110;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    analysisResult.services.forEach(service => {
      doc.text(`• ${service.name} (${service.type})`, 30, yPos);
      doc.text(`Count: ${service.count}`, 40, yPos + 8);
      if (service.instance_type) {
        doc.text(`Type: ${service.instance_type}`, 40, yPos + 16);
        yPos += 24;
      } else {
        yPos += 16;
      }
    });

    // Architecture Patterns
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Architecture Patterns', 20, yPos + 15);
    
    yPos += 30;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    analysisResult.architecture_patterns.forEach(pattern => {
      doc.text(`• ${pattern}`, 30, yPos);
      yPos += 10;
    });

    // Best Practices
    if (yPos > 200) {
      doc.addPage();
      yPos = 30;
      this.addFooter(doc, 2);
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommendations & Best Practices', 20, yPos + 15);
    
    yPos += 30;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    analysisResult.recommendations.forEach(rec => {
      if (yPos > 260) {
        doc.addPage();
        yPos = 30;
      }
      doc.text(`• ${rec}`, 30, yPos);
      yPos += 15;
    });

    return Buffer.from(doc.output('arraybuffer'));
  }

  generateDeploymentDocument(analysisResult: ArchitectureAnalysisResult, region: string): Buffer {
    const doc = new jsPDF();
    
    this.addHeader(doc, 'AWS Deployment Guide');
    this.addFooter(doc, 1);

    // Prerequisites
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Prerequisites', 20, 50);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    let yPos = 65;
    
    const prerequisites = [
      'AWS CLI configured with appropriate permissions',
      'Terraform v1.0+ installed (if using Terraform)',
      'Valid AWS credentials with EC2, VPC, and IAM permissions',
      'SSH key pair for EC2 instance access'
    ];
    
    prerequisites.forEach(prereq => {
      doc.text(`• ${prereq}`, 30, yPos);
      yPos += 10;
    });

    // Deployment Steps
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Deployment Steps', 20, yPos + 15);
    
    yPos += 30;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const steps = [
      'Create VPC and networking components',
      'Set up security groups and NACLs',
      'Deploy compute resources (EC2 instances)',
      'Configure load balancers',
      'Set up database instances',
      'Configure monitoring and alerting',
      'Perform deployment verification'
    ];
    
    steps.forEach((step, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 30;
        this.addFooter(doc, 2);
      }
      doc.text(`${index + 1}. ${step}`, 30, yPos);
      yPos += 12;
    });

    // Post-Deployment
    if (yPos > 200) {
      doc.addPage();
      yPos = 30;
      this.addFooter(doc, 3);
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Post-Deployment Verification', 20, yPos + 15);
    
    yPos += 30;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const verificationSteps = [
      'Verify all services are running and healthy',
      'Test application endpoints and load balancer',
      'Confirm database connectivity',
      'Validate security group configurations',
      'Check CloudWatch metrics and alarms'
    ];
    
    verificationSteps.forEach((step, index) => {
      doc.text(`${index + 1}. ${step}`, 30, yPos);
      yPos += 12;
    });

    return Buffer.from(doc.output('arraybuffer'));
  }

  generateMonitoringDocument(analysisResult: ArchitectureAnalysisResult): Buffer {
    const doc = new jsPDF();
    
    this.addHeader(doc, 'AWS Monitoring & Alerting Setup');
    this.addFooter(doc, 1);

    // Overview
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Monitoring Overview', 20, 50);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('This document outlines the monitoring setup for your AWS infrastructure.', 20, 65);
    doc.text('All metrics and alarms are configured through AWS CloudWatch.', 20, 75);

    // Key Metrics
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Metrics to Monitor', 20, 95);
    
    let yPos = 110;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const metrics = [
      'EC2: CPU Utilization, Memory Usage, Disk I/O',
      'RDS: CPU Utilization, Database Connections, Read/Write Latency',
      'ALB: Request Count, Target Response Time, HTTP Error Rates',
      'S3: Storage Usage, Request Metrics, Error Rates',
      'CloudFront: Cache Hit Ratio, Origin Latency, Error Rates'
    ];
    
    metrics.forEach(metric => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 30;
        this.addFooter(doc, 2);
      }
      doc.text(`• ${metric}`, 30, yPos);
      yPos += 12;
    });

    // Alert Thresholds
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommended Alert Thresholds', 20, yPos + 15);
    
    yPos += 30;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const thresholds = [
      'CPU Utilization > 80% for 5 minutes',
      'Memory Usage > 85% for 5 minutes',
      'HTTP 5xx errors > 5% of total requests',
      'Database CPU > 75% for 10 minutes',
      'Disk space usage > 90%'
    ];
    
    thresholds.forEach(threshold => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 30;
      }
      doc.text(`• ${threshold}`, 30, yPos);
      yPos += 10;
    });

    return Buffer.from(doc.output('arraybuffer'));
  }
}

export const documentGenerator = new DocumentGenerator();
