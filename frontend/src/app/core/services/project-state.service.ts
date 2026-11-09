import { Injectable, signal, inject } from '@angular/core';
import { ApiService } from './api.service';
import { AnalysisPayload, Project } from '../models/schema.models';

@Injectable({
  providedIn: 'root'
})
export class ProjectStateService {
  private api = inject(ApiService);

  // Active Project & Analysis state
  public activeProject = signal<Project | null>(null);
  public activeAnalysis = signal<AnalysisPayload | null>(null);
  public isAnalyzing = signal<boolean>(false);

  // Learning Mode: Locked to Beginner mode
  public learningMode = signal<'BEGINNER'>('BEGINNER');

  // Selected table/relationship context for Explorer
  public selectedTableName = signal<string | null>(null);
  public selectedRelationshipId = signal<string | null>(null);

  constructor() {
    const hasToken = !!localStorage.getItem('db_insight_token') && localStorage.getItem('db_insight_logged_out') !== 'true';
    if (hasToken) {
      this.loadUserProjects();
    }
  }

  public resetWorkspace() {
    this.activeProject.set(null);
    this.activeAnalysis.set(null);
    this.selectedTableName.set(null);
    this.selectedRelationshipId.set(null);
  }

  public loadUserProjects() {
    this.api.listProjects().subscribe({
      next: (res: any) => {
        if (res.success && res.projects && res.projects.length > 0) {
          const latestProj = res.projects[0];
          this.activeProject.set(latestProj);

          this.api.getProject(latestProj.id).subscribe({
            next: (pRes: any) => {
              const schema = pRes.project?.databaseSchemas?.[0];
              if (schema && schema.tables && schema.tables.length > 0) {
                const reconstructedTables = schema.tables.map((t: any) => ({
                  name: t.name,
                  columns: t.columns.map((c: any) => ({
                    name: c.name,
                    dataType: c.dataType,
                    isPrimaryKey: !!c.isPrimaryKey,
                    isForeignKey: !!c.isForeignKey,
                    isNullable: c.isNullable ?? !c.isPrimaryKey,
                    isUnique: !!c.isUnique
                  })),
                  primaryKey: t.columns.filter((c: any) => c.isPrimaryKey).map((c: any) => c.name),
                  candidateKeys: [t.columns.filter((c: any) => c.isPrimaryKey).map((c: any) => c.name)],
                  foreignKeys: schema.relationships?.filter((r: any) => r.sourceTable === t.name).map((r: any) => ({
                    column: r.sourceColumn,
                    targetTable: r.targetTable,
                    targetColumn: r.targetColumn
                  })) || []
                }));

                this.api.executeAnalysis({
                  projectId: latestProj.id,
                  projectTitle: latestProj.title,
                  tables: reconstructedTables,
                  dialect: latestProj.dialect || 'postgresql'
                }).subscribe({
                  next: (analysis) => {
                    this.setAnalysis(analysis, latestProj);
                  },
                  error: () => {}
                });
              }
            },
            error: () => {}
          });
        } else {
          this.resetWorkspace();
        }
      },
      error: () => {
        this.resetWorkspace();
      }
    });
  }

  public setLearningMode(mode?: any) {
    this.learningMode.set('BEGINNER');
    localStorage.setItem('db_insight_mode', 'BEGINNER');
  }

  public toggleLearningMode() {
    this.setLearningMode('BEGINNER');
  }

  public setAnalysis(analysis: AnalysisPayload, project?: Project) {
    this.activeAnalysis.set(analysis);
    const existing = this.activeProject();
    const tableCount = analysis.tables ? analysis.tables.length : 0;
    const latestRank = analysis.overallSchemaRank || 'BCNF';
    const latestScore = analysis.recommendations?.overallDesignScore ?? 80;

    if (project) {
      this.activeProject.set({
        ...project,
        tableCount: project.tableCount ?? tableCount,
        latestRank: project.latestRank ?? latestRank,
        latestScore: project.latestScore ?? latestScore
      });
    } else {
      this.activeProject.set({
        id: existing?.id || 'active_session',
        title: existing?.title || 'Active Database Design',
        dialect: existing?.dialect || 'postgresql',
        status: 'ANALYZED',
        tableCount,
        latestRank,
        latestScore
      });
    }

    if (analysis.tables && analysis.tables.length > 0) {
      this.selectedTableName.set(analysis.tables[0].name);
    }
  }

  public loadInitialWorkspaceSchema() {
    const defaultSql = `
CREATE TABLE department (
  dept_id INT PRIMARY KEY,
  dept_name VARCHAR(100) NOT NULL,
  building VARCHAR(100)
);

CREATE TABLE student_enrollment (
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  student_name VARCHAR(150) NOT NULL,
  student_phone_1 VARCHAR(20),
  student_phone_2 VARCHAR(20),
  course_name VARCHAR(150),
  instructor_name VARCHAR(150),
  dept_id INT,
  dept_name VARCHAR(100),
  grade VARCHAR(5),
  PRIMARY KEY (student_id, course_id),
  FOREIGN KEY (dept_id) REFERENCES department(dept_id)
);
`;

    this.isAnalyzing.set(true);
    this.api.executeAnalysis({
      sql: defaultSql,
      dialect: 'postgresql'
    }).subscribe({
      next: (result) => {
        this.activeAnalysis.set(result);
        this.activeProject.set({
          id: 'proj_academic_enrollment',
          title: 'University Academic & Enrollment System',
          description: 'Production relational schema for schema auditing, normalization analysis, and relational integrity testing.',
          dialect: 'postgresql',
          status: 'ANALYZED',
          tableCount: result.tables.length,
          latestScore: result.recommendations.overallDesignScore,
          latestRank: result.overallSchemaRank
        });
        if (result.tables.length > 0) {
          this.selectedTableName.set(result.tables[0].name);
        }
        this.isAnalyzing.set(false);
      },
      error: () => {
        this.isAnalyzing.set(false);
      }
    });
  }
}
