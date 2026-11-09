import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../services/prisma.service';

export class ProjectController {
  /**
   * Get Dashboard statistics and recent projects for the current user.
   */
  public static async getDashboardOverview(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const totalProjects = await prisma.project.count({ where: { userId } });
      const recentProjects = await prisma.project.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 6,
        include: {
          databaseSchemas: {
            take: 1,
            include: {
              tables: true,
              analysisSessions: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                include: { issues: true }
              }
            }
          }
        }
      });

      // Calculate totals
      let totalTablesAnalyzed = 0;
      let totalIssuesFound = 0;

      for (const p of recentProjects) {
        for (const s of p.databaseSchemas) {
          totalTablesAnalyzed += s.tables.length;
          for (const a of s.analysisSessions) {
            totalIssuesFound += a.issues.length;
          }
        }
      }

      const reportsGenerated = await prisma.report.count({ where: { userId } });

      res.json({
        success: true,
        stats: {
          totalProjects,
          totalTablesAnalyzed,
          totalIssuesFound,
          reportsGenerated
        },
        recentProjects: recentProjects.map(p => ({
          id: p.id,
          title: p.title,
          description: p.description,
          dialect: p.dialect,
          status: p.status,
          updatedAt: p.updatedAt,
          tableCount: p.databaseSchemas[0]?.tables?.length || 0,
          latestScore: p.databaseSchemas[0]?.analysisSessions[0]?.score ?? null,
          latestRank: p.databaseSchemas[0]?.analysisSessions[0]?.normalFormRank ?? null
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public static async listProjects(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projects = await prisma.project.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          databaseSchemas: {
            take: 1,
            include: {
              tables: true,
              analysisSessions: {
                take: 1,
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        }
      });

      res.json({
        success: true,
        projects: projects.map(p => ({
          id: p.id,
          title: p.title,
          description: p.description,
          dialect: p.dialect,
          status: p.status,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          tableCount: p.databaseSchemas[0]?.tables?.length || 0,
          latestRank: p.databaseSchemas[0]?.analysisSessions[0]?.normalFormRank || 'UNANALYZED',
          latestScore: p.databaseSchemas[0]?.analysisSessions[0]?.score || null
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public static async createProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { title, description, dialect = 'postgresql' } = req.body;
      if (!title) {
        res.status(400).json({ error: 'Project title is required' });
        return;
      }

      const project = await prisma.project.create({
        data: {
          userId,
          title,
          description,
          dialect
        }
      });

      res.status(201).json({ success: true, project });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public static async getProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const project = await prisma.project.findFirst({
        where: { id, userId },
        include: {
          databaseSchemas: {
            orderBy: { createdAt: 'desc' },
            include: {
              tables: {
                include: {
                  columns: true,
                  constraints: true
                }
              },
              relationships: true,
              functionalDependencies: true,
              analysisSessions: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                include: {
                  issues: true,
                  recommendations: true
                }
              }
            }
          },
          uploadedFiles: true
        }
      });

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      res.json({ success: true, project });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public static async deleteProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      await prisma.project.deleteMany({
        where: { id, userId }
      });

      res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
