import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectStateService } from '../../core/services/project-state.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-6xl mx-auto space-y-6 fade-in pb-12">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border dark:border-slate-800 pb-4">
        <div>
          <h1 class="text-2xl font-extrabold text-content-main dark:text-slate-100 tracking-tight">Executive Database Audit Report</h1>
          <p class="text-xs text-content-muted dark:text-slate-400 mt-1">
            Complete 14-section formal engineering audit report with exportable PDF and corrected SQL.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            (click)="downloadPdf()"
            [disabled]="isGeneratingPdf()"
            class="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-soft flex items-center gap-2 transition-all transform active:scale-95"
          >
            <i class="fa-solid fa-file-pdf text-sm"></i>
            <span>{{ isGeneratingPdf() ? 'Generating PDF...' : 'Download PDF Report' }}</span>
          </button>

          <button
            (click)="downloadSql()"
            class="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-surface-hover dark:hover:bg-slate-700 text-content-main dark:text-slate-200 border border-surface-border dark:border-slate-700 text-xs font-semibold shadow-soft flex items-center gap-2 transition-colors"
          >
            <i class="fa-solid fa-file-arrow-down text-sm text-primary-500"></i>
            <span>Download Corrected SQL</span>
          </button>

          <button
            (click)="printReport()"
            class="p-2.5 rounded-xl border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-surface-hover dark:hover:bg-slate-700 text-content-muted dark:text-slate-300 transition-colors"
            title="Print Report"
          >
            <i class="fa-solid fa-print text-sm"></i>
          </button>
        </div>
      </div>

      <!-- Report Document Preview Box -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl border border-surface-border dark:border-slate-800 shadow-soft p-6 sm:p-8 space-y-8 transition-colors" id="printable-report">
        <!-- Title & Executive Score Card -->
        <div class="border-b border-surface-border dark:border-slate-800 pb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div class="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">Formal Database Quality Audit</div>
            <h2 class="text-xl sm:text-2xl font-extrabold text-content-main dark:text-slate-100 mt-1">{{ state.activeProject()?.title || 'Custom Database Architecture' }}</h2>
            <div class="text-xs text-content-muted dark:text-slate-400 mt-1">Audit Date: {{ todayDate }} | Dialect: {{ state.activeProject()?.dialect || 'PostgreSQL' | uppercase }}</div>
          </div>

          <div *ngIf="state.activeAnalysis() as a" class="text-right">
            <div class="text-3xl font-black text-primary-600 dark:text-primary-400">{{ a.recommendations.grade }}</div>
            <div class="text-xs font-bold text-content-main dark:text-slate-200">Score: {{ a.recommendations.overallDesignScore }}/100</div>
            <div class="text-[11px] text-content-muted dark:text-slate-400">Rank: {{ a.overallSchemaRank }}</div>
          </div>
        </div>

        <!-- Section 1: Entity Inventory -->
        <div *ngIf="state.activeAnalysis() as a" class="space-y-4">
          <h3 class="font-bold text-sm text-content-main dark:text-slate-200 uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <i class="fa-solid fa-table-cells text-primary-500"></i>
            <span>1. Relational Entity Inventory</span>
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div *ngFor="let t of a.tables" class="p-4 rounded-2xl bg-surface-subtle dark:bg-slate-800/50 border border-surface-border dark:border-slate-700/60 space-y-2">
              <div class="font-bold text-xs text-content-main dark:text-slate-100 flex items-center justify-between">
                <span>{{ t.name }}</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-surface-border dark:border-slate-700 text-primary-700 dark:text-primary-300">
                  PK: {{ t.primaryKey.join(', ') || 'NONE' }}
                </span>
              </div>
              <div class="text-[11px] text-content-muted dark:text-slate-400">
                Columns: {{ t.columns.map(colToString).join(', ') }}
              </div>
            </div>
          </div>
        </div>

        <!-- Section 2: Normalization Findings -->
        <div *ngIf="state.activeAnalysis() as a" class="space-y-3">
          <h3 class="font-bold text-sm text-content-main dark:text-slate-200 uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <i class="fa-solid fa-diagram-project text-primary-500"></i>
            <span>2. Normalization Analysis (1NF to BCNF)</span>
          </h3>
          <div class="space-y-2 text-xs">
            <div *ngFor="let n of a.normalization" class="p-3.5 rounded-xl border border-surface-border dark:border-slate-800 bg-white dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span class="font-bold text-content-main dark:text-slate-100">{{ n.tableName }}</span>
                <span class="text-content-muted dark:text-slate-400 ml-2">1NF: {{ n.oneNF.status }} | 2NF: {{ n.twoNF.status }} | 3NF: {{ n.threeNF.status }} | BCNF: {{ n.bcnf.status }}</span>
              </div>
              <span class="font-bold text-primary-600 dark:text-primary-400">{{ n.overallRank }}</span>
            </div>
          </div>
        </div>

        <!-- Section 3: Integrity Findings -->
        <div *ngIf="state.activeAnalysis() as a" class="space-y-3">
          <h3 class="font-bold text-sm text-content-main dark:text-slate-200 uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <i class="fa-solid fa-shield-halved text-primary-500"></i>
            <span>3. Integrity Constraint Violations</span>
          </h3>
          <div class="space-y-2 text-xs">
            <div *ngFor="let issue of a.integrity.issues" class="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-1">
              <div class="font-bold text-content-main dark:text-slate-200 flex items-center justify-between">
                <span>[{{ issue.category }}] {{ issue.title }}</span>
                <span class="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400">{{ issue.severity }}</span>
              </div>
              <div class="text-content-muted dark:text-slate-400">{{ issue.description }}</div>
            </div>
          </div>
        </div>

        <!-- Section 4: Recommendations & Corrected DDL -->
        <div *ngIf="state.activeAnalysis() as a" class="space-y-3">
          <h3 class="font-bold text-sm text-content-main dark:text-slate-200 uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <i class="fa-solid fa-code text-primary-500"></i>
            <span>4. Auto-Generated Corrected SQL Architecture</span>
          </h3>
          <pre class="bg-gray-900 dark:bg-slate-950 text-emerald-300 p-4 rounded-2xl text-xs font-mono overflow-x-auto max-h-72 custom-scrollbar"><code>{{ a.recommendations.correctedFullSql }}</code></pre>
        </div>
      </div>
    </div>
  `
})
export class ReportsComponent {
  public state = inject(ProjectStateService);
  private api = inject(ApiService);

  public isGeneratingPdf = signal<boolean>(false);
  public todayDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  public colToString(col: any): string {
    return `${col.name} (${col.dataType})`;
  }

  public downloadPdf() {
    const analysis = this.state.activeAnalysis();
    if (!analysis) return;

    this.isGeneratingPdf.set(true);

    const payload = {
      projectTitle: this.state.activeProject()?.title || 'Database Audit',
      dialect: this.state.activeProject()?.dialect || 'postgresql',
      sourceType: 'DB Insight Multi-Input',
      tables: analysis.tables,
      normalization: analysis.normalization,
      integrity: analysis.integrity,
      anomalies: analysis.anomalies,
      relationships: analysis.relationships,
      recommendations: analysis.recommendations
    };

    this.api.exportPdf(payload).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DB_Insight_AI_Audit_${Date.now()}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.isGeneratingPdf.set(false);
      },
      error: () => {
        this.isGeneratingPdf.set(false);
      }
    });
  }

  public downloadSql() {
    const analysis = this.state.activeAnalysis();
    if (!analysis) return;

    this.api.downloadSql(
      analysis.recommendations.correctedFullSql,
      this.state.activeProject()?.title || 'database'
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `corrected_schema_${Date.now()}.sql`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    });
  }

  public printReport() {
    window.print();
  }
}
