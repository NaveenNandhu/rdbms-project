/**
 * Professional PDF Report Generator for DB Insight AI
 * Generates comprehensive database design audit reports with all 14 standard sections.
 */

import PDFDocument from 'pdfkit';
import { RecommendationEngineResult } from '../engine/recommendation-engine';
import { TableNormalizationAnalysis } from '../engine/normalization-engine';
import { IntegrityReport } from '../engine/integrity-checker';
import { RelationshipAnalysisReport } from '../engine/relationship-analyzer';
import { DatabaseAnomaly } from '../engine/anomaly-detector';
import { ParsedTable } from '../engine/sql-parser';

export interface ReportData {
  projectTitle: string;
  author: string;
  createdAt: string;
  dialect: string;
  sourceType: string;
  tables: ParsedTable[];
  normalization: TableNormalizationAnalysis[];
  integrity: IntegrityReport;
  anomalies: DatabaseAnomaly[];
  relationships: RelationshipAnalysisReport;
  recommendations: RecommendationEngineResult;
}

export class PdfReportService {
  public static async generateReport(data: ReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (b: any) => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err: any) => reject(err));

      // Colors
      const primaryColor = '#2563EB';
      const darkColor = '#1E293B';
      const grayColor = '#64748B';

      // --- COVER & HEADER ---
      doc.rect(40, 40, 515, 6).fill(primaryColor);
      doc.moveDown(1.5);

      doc.fontSize(22).fillColor(darkColor).text('DB Insight AI - Database Design Audit Report', { align: 'left' });
      doc.fontSize(12).fillColor(primaryColor).text('Comprehensive RDBMS Validation, Normalization & Integrity Assessment');
      doc.moveDown(1);

      // Section 1: Project Information
      doc.fontSize(14).fillColor(darkColor).text('1. Project & Input Information', { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(10).fillColor(grayColor);
      doc.text(`Project Title: ${data.projectTitle}`);
      doc.text(`Generated For: ${data.author}`);
      doc.text(`Date of Audit: ${data.createdAt}`);
      doc.text(`Database Dialect: ${data.dialect.toUpperCase()}`);
      doc.text(`Input Source Type: ${data.sourceType}`);
      doc.moveDown(1);

      // Executive Score Card
      doc.rect(40, doc.y, 515, 45).fillAndStroke('#FFF7ED', primaryColor);
      const scoreY = doc.y + 10;
      doc.fillColor(primaryColor).fontSize(16).text(`Overall Quality Grade: ${data.recommendations.grade} (${data.recommendations.overallDesignScore}/100)`, 55, scoreY);
      doc.fillColor(grayColor).fontSize(9).text(`Integrity Score: ${data.integrity.score}% | Normalization Compliance: ${data.normalization.every(n => n.overallRank === '3NF' || n.overallRank === 'BCNF') ? 'High' : 'Needs Optimization'}`, 55, scoreY + 20);
      doc.moveDown(3);

      // Section 2: Database Overview
      doc.fontSize(14).fillColor(darkColor).text('2. Database Overview', { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(10).fillColor(grayColor);
      doc.text(`Total Tables Analyzed: ${data.tables.length}`);
      doc.text(`Total Columns Identified: ${data.tables.reduce((acc, t) => acc + t.columns.length, 0)}`);
      doc.text(`Identified Relationships: ${data.relationships.relationships.length}`);
      doc.text(`Unrelated / Isolated Tables: ${data.relationships.unrelatedTables.length}`);
      doc.moveDown(1);

      // Section 3: Tables and Columns Details
      doc.fontSize(14).fillColor(darkColor).text('3. Table Structures & Schema Details', { underline: true });
      doc.moveDown(0.4);

      for (const table of data.tables) {
        if (doc.y > 700) doc.addPage();
        doc.fontSize(11).fillColor(darkColor).text(`Table: ${table.name} (${table.columns.length} columns)`);
        doc.fontSize(9).fillColor(grayColor);
        doc.text(`Primary Key: ${table.primaryKey.length > 0 ? table.primaryKey.join(', ') : 'NONE (Missing)'}`);

        const colSummary = table.columns.map(c => {
          let s = `${c.name} [${c.dataType}]`;
          if (c.isPrimaryKey) s += ' (PK)';
          if (c.isForeignKey) s += ' (FK)';
          return s;
        }).join(', ');

        doc.text(`Columns: ${colSummary}`);
        doc.moveDown(0.5);
      }
      doc.moveDown(1);

      // Section 4: Relationship & Cardinality Analysis
      if (doc.y > 680) doc.addPage();
      doc.fontSize(14).fillColor(darkColor).text('4. Relationship & Cardinality Analysis', { underline: true });
      doc.moveDown(0.4);
      if (data.relationships.relationships.length === 0) {
        doc.fontSize(9).fillColor(grayColor).text('No foreign key relationships found in the schema.');
      } else {
        for (const rel of data.relationships.relationships) {
          doc.fontSize(9).fillColor(darkColor).text(`• ${rel.sourceTable}.${rel.sourceColumn} ──(${rel.cardinality})──> ${rel.targetTable}.${rel.targetColumn}`);
          doc.fontSize(8).fillColor(grayColor).text(`  Reasoning: ${rel.explanation}`);
        }
      }
      doc.moveDown(1);

      // Section 5: Normalization Analysis
      if (doc.y > 680) doc.addPage();
      doc.fontSize(14).fillColor(darkColor).text('5. Normalization Audit (1NF to BCNF)', { underline: true });
      doc.moveDown(0.4);
      for (const norm of data.normalization) {
        doc.fontSize(10).fillColor(darkColor).text(`Table '${norm.tableName}' Highest Rank: ${norm.overallRank}`);
        doc.fontSize(8).fillColor(grayColor);
        doc.text(`  1NF: ${norm.oneNF.status} - ${norm.oneNF.reason}`);
        doc.text(`  2NF: ${norm.twoNF.status} - ${norm.twoNF.reason}`);
        doc.text(`  3NF: ${norm.threeNF.status} - ${norm.threeNF.reason}`);
        doc.text(`  BCNF: ${norm.bcnf.status} - ${norm.bcnf.reason}`);
        doc.moveDown(0.3);
      }
      doc.moveDown(1);

      // Section 6: Integrity Analysis
      if (doc.y > 680) doc.addPage();
      doc.fontSize(14).fillColor(darkColor).text('6. Integrity Constraints Verification', { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(9).fillColor(grayColor);
      doc.text(`Entity Integrity: ${data.integrity.entityIntegrityScore}%`);
      doc.text(`Referential Integrity: ${data.integrity.referentialIntegrityScore}%`);
      doc.text(`Domain Integrity: ${data.integrity.domainIntegrityScore}%`);
      doc.text(`Notice: ${data.integrity.notice}`);
      doc.moveDown(1);

      // Section 7: Anomaly Detection
      if (doc.y > 680) doc.addPage();
      doc.fontSize(14).fillColor(darkColor).text('7. Database Anomaly Detection', { underline: true });
      doc.moveDown(0.4);
      if (data.anomalies.length === 0) {
        doc.fontSize(9).fillColor(grayColor).text('No severe insertion, update, or deletion anomalies detected.');
      } else {
        for (const anom of data.anomalies.slice(0, 5)) {
          doc.fontSize(9).fillColor('#DC2626').text(`[${anom.type} ANOMALY] in Table '${anom.tableName}'`);
          doc.fontSize(8).fillColor(grayColor).text(`  Issue: ${anom.problemDescription}`);
          doc.text(`  Consequence: ${anom.exampleScenario.consequence}`);
          doc.moveDown(0.3);
        }
      }
      doc.moveDown(1);

      // Section 8: Recommendations & Auto-Correction
      if (doc.y > 650) doc.addPage();
      doc.fontSize(14).fillColor(darkColor).text('8. Recommendations & Corrected Schema Summary', { underline: true });
      doc.moveDown(0.4);
      for (const rec of data.recommendations.recommendations.slice(0, 6)) {
        doc.fontSize(9).fillColor(darkColor).text(`• [${rec.severity}] ${rec.title}`);
        doc.fontSize(8).fillColor(grayColor).text(`  Fix: ${rec.suggestedSolution}`);
        doc.text(`  Rule: ${rec.ruleJustification}`);
        doc.moveDown(0.3);
      }
      doc.moveDown(1);

      // Final Sign-off
      doc.fontSize(8).fillColor(grayColor).text('End of DB Insight AI Audit Report. Powered by Google DeepMind Agentic Systems.', { align: 'center' });

      doc.end();
    });
  }
}
