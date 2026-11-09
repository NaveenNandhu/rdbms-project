import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ProjectStateService } from '../../core/services/project-state.service';

@Component({
  selector: 'app-sql-validator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-6xl mx-auto space-y-6 fade-in pb-12">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border dark:border-slate-800 pb-4">
        <div>
          <h1 class="text-2xl font-extrabold text-content-main dark:text-slate-100 tracking-tight">SQL Validator</h1>
          <p class="text-xs text-content-muted dark:text-slate-400 mt-1">
            Deterministic AST parsing, syntax validation, constraint verification, and relational audit.
          </p>
        </div>

        <!-- Security Guard Badge -->
        <span class="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
          <i class="fa-solid fa-shield-halved text-emerald-600 dark:text-emerald-400"></i>
          <span>Isolated AST Sandbox</span>
        </span>
      </div>

      <!-- Actions Bar: Clean & focused with just Clear and Validate -->
      <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-surface-border dark:border-slate-800 shadow-soft flex flex-wrap items-center justify-between gap-3 transition-colors">
        <div class="text-xs text-content-muted dark:text-slate-400 font-medium">
          Paste or write CREATE TABLE and ALTER TABLE statements, then click Validate SQL.
        </div>

        <div class="flex items-center gap-3">
          <button
            (click)="clearSql()"
            class="px-4 py-2 rounded-xl border border-surface-border dark:border-slate-700 bg-surface-subtle dark:bg-slate-800 hover:bg-surface-hover dark:hover:bg-slate-700 text-content-muted dark:text-slate-400 text-xs font-medium transition-colors"
          >
            Clear
          </button>
          <button
            (click)="validateSql()"
            [disabled]="isValidating() || !sqlInput.trim()"
            class="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-bold shadow-soft flex items-center gap-2 transition-all transform active:scale-95"
          >
            <i *ngIf="isValidating()" class="fa-solid fa-spinner fa-spin text-xs"></i>
            <i *ngIf="!isValidating()" class="fa-solid fa-bolt text-xs"></i>
            <span>{{ isValidating() ? 'Validating SQL...' : 'Validate SQL' }}</span>
          </button>
        </div>
      </div>

      <!-- Editor & Findings 2-Column Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Left: SQL Editor -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border dark:border-slate-800 shadow-soft p-5 space-y-3 transition-colors">
          <div class="flex items-center justify-between">
            <span class="font-bold text-xs text-content-main dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-code text-primary-500"></i>
              <span>SQL DDL Input</span>
            </span>
            <div class="flex items-center space-x-2">
              <span class="text-[11px] text-content-muted dark:text-slate-400 font-mono">Lines: {{ getLineCount() }}</span>
            </div>
          </div>

          <textarea
            [(ngModel)]="sqlInput"
            rows="19"
            class="w-full font-mono text-xs p-4 rounded-xl border border-surface-border dark:border-slate-700 bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="-- Paste or write your CREATE TABLE statements here...&#10;CREATE TABLE department (&#10;  dept_id INT PRIMARY KEY,&#10;  dept_name VARCHAR(100) NOT NULL&#10;);"
          ></textarea>
        </div>

        <!-- Right: Validation Findings -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border dark:border-slate-800 shadow-soft p-5 space-y-4 flex flex-col justify-between transition-colors">
          <div class="space-y-3 overflow-y-auto max-h-[480px] custom-scrollbar">
            <div class="flex items-center justify-between pb-2 border-b border-surface-border dark:border-slate-800">
              <span class="font-bold text-xs text-content-main dark:text-slate-200 uppercase tracking-wider">Diagnostic Findings</span>
              <span
                *ngIf="hasValidated()"
                class="text-xs px-2.5 py-0.5 rounded-full font-bold"
                [ngClass]="validationErrors().length > 0 ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' : (validationWarnings().length > 0 ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300')"
              >
                {{ validationErrors().length }} Errors / {{ validationWarnings().length }} Warnings
              </span>
            </div>

            <!-- Initial unvalidated state -->
            <div *ngIf="!hasValidated()" class="p-10 text-center text-xs text-content-muted dark:text-slate-400 space-y-2">
              <div class="text-3xl text-slate-300 dark:text-slate-700">
                <i class="fa-solid fa-code-compare"></i>
              </div>
              <div class="font-bold text-content-main dark:text-slate-200">Awaiting SQL Validation</div>
              <p class="max-w-xs mx-auto">
                Paste your DDL statements on the left and click <span class="font-semibold text-primary">"Validate SQL"</span> to check syntax, constraints, and relational normalization.
              </p>
            </div>

            <!-- Validating Spinner State -->
            <div *ngIf="isValidating()" class="p-10 text-center text-xs text-content-muted dark:text-slate-400 space-y-3">
              <div class="text-3xl text-primary animate-spin">
                <i class="fa-solid fa-circle-notch"></i>
              </div>
              <div class="font-bold text-content-main dark:text-slate-200">Validating SQL Grammar & Semantics...</div>
              <p>Running isolated AST parser and relational integrity verifier.</p>
            </div>

            <!-- Syntax Errors -->
            <div *ngIf="hasValidated() && !isValidating() && validationErrors().length > 0" class="space-y-2">
              <div *ngFor="let err of validationErrors()" class="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-xs space-y-1">
                <div class="font-bold text-red-800 dark:text-red-300 flex items-center justify-between">
                  <span class="flex items-center gap-1.5">
                    <i class="fa-solid fa-circle-xmark text-red-600"></i>
                    <span>Syntax Error</span>
                  </span>
                  <span *ngIf="err.line" class="font-mono text-[10px] bg-red-200 dark:bg-red-900/60 text-red-900 dark:text-red-200 px-1.5 py-0.5 rounded">Line {{ err.line }}</span>
                </div>
                <div class="text-red-700 dark:text-red-300">{{ err.message }}</div>
              </div>
            </div>

            <!-- Warnings (Constraint & Normalization) -->
            <div *ngIf="hasValidated() && !isValidating() && validationWarnings().length > 0" class="space-y-2">
              <div *ngFor="let warn of validationWarnings()" class="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs space-y-1">
                <div class="font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span class="flex items-center gap-1.5">
                    <i class="fa-solid fa-triangle-exclamation text-amber-600"></i>
                    <span>Warning ({{ warn.severity || 'HIGH' }})</span>
                  </span>
                  <span *ngIf="warn.line" class="font-mono text-[10px] bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded">Line {{ warn.line }}</span>
                </div>
                <div class="text-amber-800 dark:text-amber-200">{{ warn.message }}</div>
              </div>
            </div>

            <!-- Validated Tables Breakdown -->
            <div *ngIf="hasValidated() && !isValidating() && validatedTables().length > 0" class="space-y-2 pt-2 border-t border-surface-border dark:border-slate-800">
              <div class="text-[11px] font-bold text-content-main dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <i class="fa-solid fa-table-list text-primary"></i>
                <span>Verified Tables ({{ validatedTables().length }})</span>
              </div>
              <div class="grid grid-cols-1 gap-2">
                <div *ngFor="let t of validatedTables()" class="p-2.5 bg-surface-subtle dark:bg-slate-800/60 rounded-xl border border-surface-border dark:border-slate-700/60 text-xs flex items-center justify-between">
                  <div>
                    <span class="font-bold text-content-main dark:text-slate-100 font-mono">{{ t.name }}</span>
                    <span class="text-[11px] text-content-muted dark:text-slate-400 ml-2">({{ t.columns.length }} columns)</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span *ngIf="t.primaryKey && t.primaryKey.length > 0" class="px-2 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold font-mono">
                      PK: {{ t.primaryKey.join(', ') }}
                    </span>
                    <span *ngIf="!t.primaryKey || t.primaryKey.length === 0" class="px-2 py-0.5 rounded text-[10px] bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-semibold">
                      No PK
                    </span>
                    <span *ngIf="t.foreignKeys && t.foreignKeys.length > 0" class="px-2 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold font-mono">
                      {{ t.foreignKeys.length }} FK
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Clean state (0 errors & 0 warnings) -->
            <div *ngIf="hasValidated() && !isValidating() && validationErrors().length === 0 && validationWarnings().length === 0" class="p-6 text-center text-xs text-content-muted dark:text-slate-400">
              <div class="text-3xl mb-2 text-emerald-500">
                <i class="fa-solid fa-circle-check"></i>
              </div>
              <div class="font-bold text-content-main dark:text-slate-100 text-sm">No Syntax or Semantic Errors Found!</div>
              <div class="mt-1">All CREATE TABLE statements adhere to valid SQL grammar and relational constraints.</div>
            </div>
          </div>

          <!-- Auto-Corrected SQL Box (if any) -->
          <div *ngIf="correctedSql()" class="pt-3 border-t border-surface-border dark:border-slate-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
                <span>Auto-Generated Corrected SQL:</span>
              </span>
              <button
                (click)="applyCorrectedSql()"
                class="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <i class="fa-solid fa-arrow-turn-down text-[10px]"></i>
                <span>Copy to Editor</span>
              </button>
            </div>
            <pre class="bg-gray-900 dark:bg-slate-950 text-emerald-300 p-3 rounded-xl text-[11px] max-h-36 overflow-y-auto font-mono custom-scrollbar"><code>{{ correctedSql() }}</code></pre>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SqlValidatorComponent implements OnInit {
  private api = inject(ApiService);
  public state = inject(ProjectStateService);

  public sqlInput: string = '';
  public dialect: string = 'postgresql';
  public isValidating = signal<boolean>(false);
  public hasValidated = signal<boolean>(false);
  public validationErrors = signal<any[]>([]);
  public validationWarnings = signal<any[]>([]);
  public validatedTables = signal<any[]>([]);
  public validatedRelationships = signal<any[]>([]);
  public correctedSql = signal<string>('');

  ngOnInit(): void {
    const analysis = this.state.activeAnalysis();
    if (analysis && analysis.tables && analysis.tables.length > 0) {
      this.correctedSql.set(analysis.recommendations?.correctedFullSql || '');
      this.sqlInput = this.formatTablesToSql(analysis.tables);
    } else {
      this.sqlInput = '';
    }

    if (this.sqlInput.trim()) {
      this.validateSql();
    }
  }

  public getLineCount(): number {
    if (!this.sqlInput) return 0;
    return this.sqlInput.split('\n').length;
  }

  public clearSql() {
    this.sqlInput = '';
    this.hasValidated.set(false);
    this.validationErrors.set([]);
    this.validationWarnings.set([]);
    this.validatedTables.set([]);
    this.validatedRelationships.set([]);
  }

  public validateSql() {
    if (!this.sqlInput.trim()) {
      this.hasValidated.set(false);
      this.validationErrors.set([]);
      this.validationWarnings.set([]);
      this.validatedTables.set([]);
      this.validatedRelationships.set([]);
      return;
    }

    this.isValidating.set(true);
    this.api.previewSql(this.sqlInput, this.dialect).subscribe({
      next: (res: any) => {
        this.validationErrors.set(res.errors || []);
        this.validationWarnings.set(res.warnings || []);
        this.validatedTables.set(res.tables || []);
        this.validatedRelationships.set(res.relationships || []);
        this.hasValidated.set(true);
        this.isValidating.set(false);
      },
      error: (err: any) => {
        this.validationErrors.set([{
          line: undefined,
          message: err?.error?.error || 'Validation request failed.'
        }]);
        this.hasValidated.set(true);
        this.isValidating.set(false);
      }
    });
  }

  public applyCorrectedSql() {
    if (this.correctedSql()) {
      this.sqlInput = this.correctedSql();
      this.validateSql();
    }
  }

  private formatTablesToSql(tables: any[]): string {
    return tables.map(t => {
      const colDefs = t.columns.map((c: any) => {
        const pk = c.isPrimaryKey ? ' PRIMARY KEY' : '';
        const notNull = (!c.isNullable && !c.isPrimaryKey) ? ' NOT NULL' : '';
        const unique = (c.isUnique && !c.isPrimaryKey) ? ' UNIQUE' : '';
        return `  ${c.name} ${c.dataType}${pk}${unique}${notNull}`;
      });

      const fkDefs = (t.foreignKeys || []).map((fk: any) => {
        return `  FOREIGN KEY (${fk.column}) REFERENCES ${fk.targetTable}(${fk.targetColumn})`;
      });

      const allDefs = [...colDefs, ...fkDefs].join(',\n');
      return `CREATE TABLE ${t.name} (\n${allDefs}\n);`;
    }).join('\n\n');
  }
}
