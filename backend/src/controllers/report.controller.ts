import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../services/prisma.service';
import { PdfReportService, ReportData } from '../services/pdf-report.service';

export class ReportController {
  public static async exportPdf(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        projectTitle = 'Database Audit',
        dialect = 'postgresql',
        sourceType = 'SQL Upload',
        tables = [],
        normalization = [],
        integrity = { score: 100, entityIntegrityScore: 100, referentialIntegrityScore: 100, domainIntegrityScore: 100, issues: [], notice: '' },
        anomalies = [],
        relationships = { relationships: [], unrelatedTables: [], missingForeignKeySuggestions: [] },
        recommendations = { overallDesignScore: 90, grade: 'A', recommendations: [], correctedFullSql: '', changeSummary: [] }
      } = req.body;

      const reportData: ReportData = {
        projectTitle,
        author: req.user?.email || 'DB Insight Student',
        createdAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        dialect,
        sourceType,
        tables,
        normalization,
        integrity,
        anomalies,
        relationships,
        recommendations
      };

      const pdfBuffer = await PdfReportService.generateReport(reportData);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="DB_Insight_AI_Audit_${Date.now()}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public static async downloadCorrectedSql(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { correctedSql, projectName = 'corrected_database' } = req.body;
      if (!correctedSql) {
        res.status(400).json({ error: 'Corrected SQL is required' });
        return;
      }

      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${projectName.replace(/\s+/g, '_')}_corrected.sql"`);
      res.send(correctedSql);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
