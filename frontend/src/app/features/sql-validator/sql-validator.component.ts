import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
          <h1 class="text-2xl font-extrabold text-content-main dark:text-slate-100 tracking-tight">SQL Validator & Semantic Auditor</h1>
          <p class="text-xs text-content-muted dark:text-slate-400 mt-1">
            Deterministic AST parsing, dialect syntax checks, constraint validation, and auto-generated corrected SQL.
          </p>
        </div>

        <!-- Security Guard Badge -->
        <span class="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
          <i class="fa-solid fa-shield-halved text-emerald-600 dark:text-emerald-400"></i>
          <span>Isolated AST Sandbox</span>
        </span>
      </div>

      <!-- Dialect Selector & Actions Bar -->
      <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-surface-border dark:border-slate-800 shadow-soft flex flex-wrap items-center justify-between gap-3 transition-colors">
        <div class="flex items-center space-x-3 text-xs">
          <span class="font-semibold text-content-muted dark:text-slate-400 uppercase tracking-wider">Target Dialect:</span>
          <select [(ngModel)]="dialect" class="border border-surface-border dark:border-slate-700 rounded-xl px-3 py-1.5 font-medium bg-surface-subtle dark:bg-slate-800 text-content-main dark:text-slate-100">
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="sqlite">SQLite</option>
          </select>
        </div>

        <!-- Preset Toolbar -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            *ngIf="state.activeAnalysis()"
            (click)="loadActiveProjectSql()"
            class="px-3 py-1.5 rounded-xl border border-primary/40 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/60 text-primary-700 dark:text-primary-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <i class="fa-solid fa-file-code text-xs"></i>
            <span>Load Active Schema</span>
          </button>
          <button
            (click)="loadSample('hospital')"
            class="px-3 py-1.5 rounded-xl border border-surface-border dark:border-slate-700 bg-surface-subtle dark:bg-slate-800 hover:bg-surface-hover dark:hover:bg-slate-700 text-content-main dark:text-slate-200 text-xs font-medium transition-colors"
          >
            Hospital Sample
          </button>
          <button
            (click)="loadSample('ecommerce')"
            class="px-3 py-1.5 rounded-xl border border-surface-border dark:border-slate-700 bg-surface-subtle dark:bg-slate-800 hover:bg-surface-hover dark:hover:bg-slate-700 text-content-main dark:text-slate-200 text-xs font-medium transition-colors"
          >
            E-Commerce Sample
          </button>
          <button
            (click)="loadSample('invalid')"
            class="px-3 py-1.5 rounded-xl border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 hover:bg-red-100/70 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <i class="fa-solid fa-bug text-xs"></i>
            <span>Broken SQL Sample</span>
          </button>
          <button
            (click)="clearSql()"
            class="px-3 py-1.5 rounded-xl border border-surface-border dark:border-slate-700 bg-surface-subtle dark:bg-slate-800 hover:bg-surface-hover dark:hover:bg-slate-700 text-content-muted dark:text-slate-400 text-xs font-medium transition-colors"
          >
            Clear
          </button>
          <button
            (click)="validateSql()"
            [disabled]="isValidating()"
            class="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-soft flex items-center gap-1.5 transition-all transform active:scale-95"
          >
            <i class="fa-solid fa-bolt text-xs"></i>
            <span>Validate SQL Syntax</span>
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
            rows="18"
            class="w-full font-mono text-xs p-4 rounded-xl border border-surface-border dark:border-slate-700 bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="-- Paste or write your DDL statements here..."
          ></textarea>
        </div>

        <!-- Right: Validation Findings & Warnings -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border dark:border-slate-800 shadow-soft p-5 space-y-4 flex flex-col justify-between transition-colors">
          <div class="space-y-3 overflow-y-auto max-h-[460px] custom-scrollbar">
            <div class="flex items-center justify-between pb-2 border-b border-surface-border dark:border-slate-800">
              <span class="font-bold text-xs text-content-main dark:text-slate-200 uppercase tracking-wider">Diagnostic Findings</span>
              <span class="text-xs px-2.5 py-0.5 rounded-full font-bold" [ngClass]="validationErrors().length > 0 ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'">
                {{ validationErrors().length }} Errors / {{ validationWarnings().length }} Warnings
              </span>
            </div>

            <!-- Syntax Errors -->
            <div *ngIf="validationErrors().length > 0" class="space-y-2">
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

            <!-- Warnings -->
            <div *ngIf="validationWarnings().length > 0" class="space-y-2">
              <div *ngFor="let warn of validationWarnings()" class="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs space-y-1">
                <div class="font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span class="flex items-center gap-1.5">
                    <i class="fa-solid fa-triangle-exclamation text-amber-600"></i>
                    <span>Constraint Warning ({{ warn.severity }})</span>
                  </span>
                  <span *ngIf="warn.line" class="font-mono text-[10px] bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded">Line {{ warn.line }}</span>
                </div>
                <div class="text-amber-700 dark:text-amber-300">{{ warn.message }}</div>
              </div>
            </div>

            <!-- Clean state -->
            <div *ngIf="validationErrors().length === 0 && validationWarnings().length === 0" class="p-8 text-center text-xs text-content-muted dark:text-slate-400">
              <div class="text-3xl mb-2 text-emerald-500">
                <i class="fa-solid fa-circle-check"></i>
              </div>
              <div class="font-bold text-content-main dark:text-slate-100">No Syntax or Semantic Errors Found!</div>
              <div class="mt-1">All CREATE TABLE statements adhere to valid {{ dialect | uppercase }} grammar.</div>

              <!-- Bridge to Relational Normalization Engine -->
              <div *ngIf="sqlInput.trim()" class="mt-5 pt-4 border-t border-surface-border dark:border-slate-800 space-y-2">
                <p class="text-[11px] text-content-muted dark:text-slate-400">
                  Ready to test for relational design violations (1NF repeating groups, 2NF partial dependencies, 3NF transitive dependencies)?
                </p>
                <button
                  (click)="sendToNormalization()"
                  [disabled]="isAnalyzing()"
                  class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-soft transition-all inline-flex items-center gap-2"
                >
                  <i *ngIf="isAnalyzing()" class="fa-solid fa-spinner fa-spin text-xs"></i>
                  <i *ngIf="!isAnalyzing()" class="fa-solid fa-brain text-xs"></i>
                  <span>{{ isAnalyzing() ? 'Running Normalization Engine...' : 'Run Normalization Analysis (1NF / 2NF / 3NF) →' }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Auto-Corrected SQL Box -->
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
  private router = inject(Router);
  public state = inject(ProjectStateService);

  public sqlInput: string = '';
  public dialect: string = 'postgresql';
  public isValidating = signal<boolean>(false);
  public isAnalyzing = signal<boolean>(false);
  public validationErrors = signal<any[]>([]);
  public validationWarnings = signal<any[]>([]);
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

  public loadActiveProjectSql() {
    const analysis = this.state.activeAnalysis();
    if (analysis && analysis.tables && analysis.tables.length > 0) {
      this.sqlInput = this.formatTablesToSql(analysis.tables);
      this.correctedSql.set(analysis.recommendations?.correctedFullSql || '');
      this.validateSql();
    }
  }

  public clearSql() {
    this.sqlInput = '';
    this.validationErrors.set([]);
    this.validationWarnings.set([]);
  }

  public loadSample(type: 'hospital' | 'ecommerce' | 'invalid') {
    if (type === 'hospital') {
      this.sqlInput = `CREATE TABLE patients (
  patient_id INT PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  date_of_birth DATE NOT NULL,
  contact_number VARCHAR(20)
);

CREATE TABLE doctors (
  doctor_id INT PRIMARY KEY,
  doctor_name VARCHAR(100) NOT NULL,
  specialization VARCHAR(100) NOT NULL
);

CREATE TABLE appointments (
  appointment_id INT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  appointment_date TIMESTAMP NOT NULL,
  diagnosis TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id)
);`;
    } else if (type === 'ecommerce') {
      this.sqlInput = `CREATE TABLE customers (
  customer_id INT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE orders (
  order_id INT PRIMARY KEY,
  customer_id INT NOT NULL,
  order_date TIMESTAMP NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE order_items (
  item_id INT PRIMARY KEY,
  order_id INT NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  quantity INT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
);`;
    } else if (type === 'invalid') {
      this.sqlInput = `-- Schema with intentional syntax and DDL constraint errors for testing
CREATE TABLE students (
  student_id INT PRIMARY KEY,
  student_code VARCHAR(20) PRIMARY KEY, -- Multiple PRIMARY KEYs
  first_name VARCHAR(50)
  last_name VARCHAR(50) NOT NULL,       -- Missing comma delimiter
  first_name VARCHAR(100),              -- Duplicate column 'first_name'
  dept_id INT REFERENCES unknown_departments(dept_id), -- Non-existent referenced table
  notes CUSTOM_BAD_TYPE                 -- Non-standard SQL data type
);

CREATE TABLE broken_enrollment (        -- Missing closing parenthesis
  enrollment_id INT PRIMARY KEY,
  student_id INT NOT NULL;
`;
    }
    this.validateSql();
  }

  public sendToNormalization() {
    if (!this.sqlInput.trim()) return;
    this.isAnalyzing.set(true);
    this.api.executeAnalysis({
      projectTitle: 'SQL Analysis',
      sql: this.sqlInput,
      dialect: this.dialect
    }).subscribe({
      next: (res: any) => {
        this.isAnalyzing.set(false);
        this.state.setAnalysis(res);
        this.router.navigate(['/normalization']);
      },
      error: (err: any) => {
        this.isAnalyzing.set(false);
        alert(err?.error?.error || 'Failed to analyze normalization. Ensure schema is syntactically valid.');
      }
    });
  }

  public validateSql() {
    if (!this.sqlInput.trim()) {
      this.validationErrors.set([]);
      this.validationWarnings.set([]);
      return;
    }

    this.isValidating.set(true);
    this.api.previewSql(this.sqlInput, this.dialect).subscribe({
      next: (res: any) => {
        this.validationErrors.set(res.errors || []);
        this.validationWarnings.set(res.warnings || []);
        this.isValidating.set(false);
      },
      error: () => {
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
