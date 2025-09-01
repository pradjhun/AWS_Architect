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

  private convertMarkdownToPDF(content: string, title: string): Buffer {
    const doc = new jsPDF();
    this.addHeader(doc, title);
    this.addFooter(doc, 1);

    // Convert markdown content to PDF
    const lines = content.split('\n');
    let yPos = 50;
    let pageNumber = 1;
    
    for (const line of lines) {
      if (yPos > 270) {
        doc.addPage();
        pageNumber++;
        this.addFooter(doc, pageNumber);
        yPos = 30;
      }
      
      if (line.startsWith('# ')) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(line.substring(2), 20, yPos);
        yPos += 15;
      } else if (line.startsWith('## ')) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(line.substring(3), 20, yPos);
        yPos += 12;
      } else if (line.startsWith('### ')) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(line.substring(4), 20, yPos);
        yPos += 10;
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const text = line.substring(2);
        const splitText = doc.splitTextToSize(text, 170);
        doc.text(splitText, 25, yPos);
        yPos += splitText.length * 5 + 3;
      } else if (line.includes('**') && line.includes(':')) {
        // Handle bold service names with costs
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const parts = line.split('**');
        if (parts.length >= 3) {
          doc.text(parts[1] + ':', 25, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(parts[2], 100, yPos);
        }
        yPos += 8;
      } else if (line.trim() && !line.startsWith('*') && !line.startsWith('`')) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const splitText = doc.splitTextToSize(line, 170);
        doc.text(splitText, 20, yPos);
        yPos += splitText.length * 5 + 3;
      } else if (line.trim() === '') {
        yPos += 5; // Add space for empty lines
      }
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  async generatePricingDocument(
    analysisResult: ArchitectureAnalysisResult,
    costBreakdown: CostBreakdown,
    region: string
  ): Promise<Buffer> {
    // Generate comprehensive content using Claude
    const { generateDocumentContent } = await import('./bedrock');
    const detailedContent = await generateDocumentContent(analysisResult, costBreakdown, 'pricing');
    
    return this.convertMarkdownToPDF(detailedContent, 'AWS Architecture Pricing Analysis');
  }

  async generateSolutionDocument(analysisResult: ArchitectureAnalysisResult): Promise<Buffer> {
    // Generate comprehensive content using Claude
    const { generateDocumentContent } = await import('./bedrock');
    const detailedContent = await generateDocumentContent(analysisResult, {}, 'solution');
    
    return this.convertMarkdownToPDF(detailedContent, 'AWS Solution Architecture Document');
  }

  async generateDeploymentDocument(
    analysisResult: ArchitectureAnalysisResult,
    region: string
  ): Promise<Buffer> {
    // Generate comprehensive content using Claude
    const { generateDocumentContent } = await import('./bedrock');
    const detailedContent = await generateDocumentContent(analysisResult, { region }, 'deployment');
    
    return this.convertMarkdownToPDF(detailedContent, 'AWS Deployment Guide');
  }

  async generateMonitoringDocument(analysisResult: ArchitectureAnalysisResult): Promise<Buffer> {
    // Generate comprehensive content using Claude
    const { generateDocumentContent } = await import('./bedrock');
    const detailedContent = await generateDocumentContent(analysisResult, {}, 'monitoring');
    
    return this.convertMarkdownToPDF(detailedContent, 'AWS Monitoring Setup Guide');
  }
}

export const documentGenerator = new DocumentGenerator();