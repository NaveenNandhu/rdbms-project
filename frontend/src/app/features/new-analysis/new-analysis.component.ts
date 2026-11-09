import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ProjectStateService } from '../../core/services/project-state.service';
import { ParsedTable } from '../../core/models/schema.models';

interface EditableTable {
  name: string;
  columns: Array<{
    name: string;
    dataType: string;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    isNullable: boolean;
    isUnique: boolean;
    defaultValue?: string;
    isUncertain?: boolean;
    confidence?: number;
  }>;
  primaryKey: string[];
  foreignKeys?: Array<{
    column: string;
    targetTable: string;
    targetColumn: string;
  }>;
}

@Component({
  selector: 'app-new-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="max-w-6xl mx-auto space-y-6 fade-in pb-12">
      <!-- Active Project Workspace Banner (When an active project exists) -->
      <div *ngIf="activeProject()" class="p-4 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white shadow-soft flex flex-wrap items-center justify-between gap-4 border border-blue-500/30">
        <div class="flex items-center gap-3.5">
          <div class="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
            <i class="fa-solid fa-database"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-bold uppercase tracking-wider text-blue-200">Active Project Workspace</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/25 text-white uppercase">{{ activeProject()?.dialect || sqlDialect }}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" [ngClass]="activeProject()?.status === 'ANALYZED' ? 'bg-emerald-500/30 text-emerald-100' : 'bg-amber-400/30 text-amber-100'">{{ activeProject()?.status || 'DRAFT' }}</span>
            </div>
            <h2 class="text-base font-extrabold tracking-tight mt-0.5">{{ activeProject()?.title }}</h2>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <a routerLink="/projects" class="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold text-white transition-all backdrop-blur-sm flex items-center gap-1.5 border border-white/20">
            <i class="fa-solid fa-list-check text-xs"></i>
            <span>Switch / All Projects</span>
          </a>
        </div>
      </div>

      <!-- Header -->
      <div class="flex items-center justify-between border-b border-surface-border dark:border-slate-800 pb-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-extrabold text-content-main dark:text-slate-100 tracking-tight">New Database Analysis</h1>
          <p class="text-xs text-content-muted dark:text-slate-400 mt-1">
            Analyze your own SQL code, import an ER diagram image, or build tables manually.
          </p>
        </div>

        <!-- Stepper Indicator (Hidden on mobile screens as requested) -->
        <div class="hidden md:flex items-center space-x-2 text-xs">
          <span
            class="px-3 py-1 rounded-full font-semibold transition-colors"
            [ngClass]="currentStep() === 'input' ? 'bg-primary text-white shadow-soft' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'"
          >
            1. Input Design
          </span>
          <span class="text-slate-300 dark:text-slate-700">───</span>
          <span
            class="px-3 py-1 rounded-full font-semibold transition-colors"
            [ngClass]="currentStep() === 'confirm' ? 'bg-primary text-white shadow-soft' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'"
          >
            2. Confirmation & Review
          </span>
        </div>
      </div>

      <!-- ================= STEP 1: INPUT METHODS ================= -->
      <div *ngIf="currentStep() === 'input'" class="space-y-6">
        <!-- Input Tabs -->
        <div class="flex border-b border-surface-border dark:border-slate-800 space-x-2 overflow-x-auto">
          <button
            (click)="switchTab('sql')"
            class="px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap"
            [ngClass]="activeTab === 'sql' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/40' : 'border-transparent text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-slate-200'"
          >
            <i class="fa-solid fa-code text-sm"></i>
            <span>1. SQL Code Input</span>
          </button>

          <button
            (click)="switchTab('diagram')"
            class="px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap"
            [ngClass]="activeTab === 'diagram' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/40' : 'border-transparent text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-slate-200'"
          >
            <i class="fa-solid fa-image text-sm"></i>
            <span>2. Upload ER Diagram</span>
          </button>

          <button
            (click)="switchTab('builder')"
            class="px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap"
            [ngClass]="activeTab === 'builder' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/40' : 'border-transparent text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-slate-200'"
          >
            <i class="fa-solid fa-table text-sm"></i>
            <span>3. Create Tables Manually</span>
          </button>
        </div>

        <!-- TAB 1: SQL CODE & NORMALIZATION TESTING -->
        <div *ngIf="activeTab === 'sql'" class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-surface-border dark:border-slate-800 shadow-soft space-y-4 transition-colors">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="font-bold text-sm text-content-main dark:text-slate-100 flex items-center gap-2">
                <i class="fa-solid fa-code text-primary"></i>
                <span>SQL Code Input & Normalization Testing</span>
              </h2>
              <p class="text-xs text-content-muted dark:text-slate-400">
                Write or paste CREATE TABLE statements, upload .sql files, and test 1NF, 2NF, 3NF normalization rules.
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2.5">
              <!-- Load Normalization Violation Sample -->
              <button
                type="button"
                (click)="loadNormalizationViolationSample()"
                class="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                title="Load a test schema with intentional 1NF, 2NF, and 3NF normalization flaws"
              >
                <i class="fa-solid fa-flask-vial text-blue-600 dark:text-blue-400"></i>
                <span>Load Normalization Test Sample</span>
              </button>

              <!-- Dialect Dropdown -->
              <div class="flex items-center gap-1.5 text-xs">
                <span class="text-content-muted dark:text-slate-400">Dialect:</span>
                <select [(ngModel)]="sqlDialect" class="border border-surface-border dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-800 text-content-main dark:text-slate-100">
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="sqlite">SQLite</option>
                </select>
              </div>

              <!-- Project Title input -->
              <input
                [(ngModel)]="projectTitle"
                placeholder="Project Name"
                class="px-3 py-1 text-xs border border-surface-border dark:border-slate-700 rounded-xl w-48 bg-surface-subtle dark:bg-slate-800 text-content-main dark:text-slate-100"
              />
            </div>
          </div>

          <!-- File upload drag & drop bar -->
          <div class="border border-dashed border-gray-300 dark:border-slate-700 rounded-2xl p-3 bg-surface-subtle/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center space-x-2 text-xs text-content-muted dark:text-slate-400">
              <i class="fa-solid fa-folder-open text-primary-500"></i>
              <span>Upload your .sql file:</span>
              <span *ngIf="uploadedSqlFileName()" class="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold font-mono text-[11px] flex items-center gap-1">
                <i class="fa-solid fa-check text-[10px]"></i>
                <span>{{ uploadedSqlFileName() }}</span>
              </span>
            </div>
            <input type="file" accept=".sql" (change)="onSqlFileUpload($event)" class="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 dark:file:bg-primary-950 file:text-primary-700 dark:file:text-primary-300 hover:file:bg-primary-100" />
          </div>

          <!-- Code Editor Textarea -->
          <div class="relative">
            <textarea
              [(ngModel)]="sqlCode"
              (ngModelChange)="onSqlCodeChange()"
              rows="13"
              class="w-full font-mono text-xs p-4 rounded-xl border border-surface-border dark:border-slate-700 bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="-- Paste or write your custom CREATE TABLE statements here...&#10;CREATE TABLE department (&#10;  dept_id INT PRIMARY KEY,&#10;  dept_name VARCHAR(100) NOT NULL&#10;);"
            ></textarea>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div class="text-xs text-content-muted dark:text-slate-400 flex items-center gap-1.5">
              <i class="fa-solid fa-table text-primary-500"></i>
              <span>Tables detected: <strong class="text-content-main dark:text-slate-100">{{ countTablesInSql() }}</strong></span>
            </div>

            <div class="flex flex-wrap items-center gap-2.5">
              <!-- Test SQL Validations Button -->
              <button
                type="button"
                (click)="testSqlValidation()"
                [disabled]="!sqlCode.trim() || isValidatingSql()"
                class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-soft transition-all flex items-center gap-2"
                title="Check syntax grammar, AST integrity, and 1NF/2NF/3NF normalization violations"
              >
                <i *ngIf="isValidatingSql()" class="fa-solid fa-spinner fa-spin text-xs"></i>
                <i *ngIf="!isValidatingSql()" class="fa-solid fa-vial-circle-check text-xs"></i>
                <span>{{ isValidatingSql() ? 'Validating...' : 'Test SQL Validations' }}</span>
              </button>

              <!-- Quick Direct Analysis / Normalization Test Button -->
              <button
                (click)="analyzeSqlDirectly()"
                [disabled]="!sqlCode.trim() || isProcessing()"
                class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-soft transition-all flex items-center gap-2"
                title="Immediately run full normalization and integrity analysis on your SQL"
              >
                <i *ngIf="isProcessing()" class="fa-solid fa-spinner fa-spin text-xs"></i>
                <i *ngIf="!isProcessing()" class="fa-solid fa-bolt text-xs"></i>
                <span>{{ isProcessing() ? 'Running Normalization...' : 'Run Normalization Test (1NF / 2NF / 3NF) →' }}</span>
              </button>

              <!-- Review in Step 2 -->
              <button
                (click)="processSqlInput()"
                [disabled]="!sqlCode.trim() || isProcessing()"
                class="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all flex items-center gap-1.5"
              >
                <span>Review Extracted Schema</span>
                <i class="fa-solid fa-arrow-right text-[10px]"></i>
              </button>
            </div>
          </div>

          <!-- INLINE DIAGNOSTICS & NORMALIZATION REPORT -->
          <div *ngIf="hasValidatedSql()" class="space-y-4 pt-3 border-t border-surface-border dark:border-slate-800 fade-in">
            <!-- Header bar of test results -->
            <div
              class="p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs"
              [ngClass]="validationErrors().length > 0 
                ? 'bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-200' 
                : (hasNormalizationFlaws() 
                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200' 
                  : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200')"
            >
              <div class="flex items-center gap-2.5">
                <i *ngIf="validationErrors().length > 0" class="fa-solid fa-triangle-exclamation text-base text-red-600"></i>
                <i *ngIf="validationErrors().length === 0 && hasNormalizationFlaws()" class="fa-solid fa-circle-exclamation text-base text-amber-600"></i>
                <i *ngIf="validationErrors().length === 0 && !hasNormalizationFlaws()" class="fa-solid fa-circle-check text-base text-emerald-600"></i>
                <div>
                  <div class="font-bold text-sm">
                    <span *ngIf="validationErrors().length > 0">SQL Syntax & Grammar Issues Found ({{ validationErrors().length }})</span>
                    <span *ngIf="validationErrors().length === 0 && hasNormalizationFlaws()">Valid SQL Syntax • Normalization Violations Detected ({{ getNormalizationFlawsCount() }})</span>
                    <span *ngIf="validationErrors().length === 0 && !hasNormalizationFlaws()">SQL Syntax & Constraints Validated Successfully</span>
                  </div>
                  <div class="text-[11px] opacity-90 mt-0.5">
                    {{ validatedTables().length }} table(s) parsed • Ready for normalization decomposition and database synthesis
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  (click)="analyzeSqlDirectly()"
                  [disabled]="isProcessing()"
                  class="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-soft transition-all flex items-center gap-2"
                >
                  <i *ngIf="isProcessing()" class="fa-solid fa-spinner fa-spin text-xs"></i>
                  <i *ngIf="!isProcessing()" class="fa-solid fa-diagram-project text-xs"></i>
                  <span>{{ isProcessing() ? 'Running...' : 'Run Normalization Lab (1NF/2NF/3NF) →' }}</span>
                </button>
              </div>
            </div>

            <!-- Syntax Errors List (if any) -->
            <div *ngIf="validationErrors().length > 0" class="p-4 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-2">
              <h4 class="font-bold text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <i class="fa-solid fa-bug"></i>
                <span>Syntax & Grammar Errors</span>
              </h4>
              <div class="space-y-1.5">
                <div *ngFor="let err of validationErrors()" class="text-xs text-red-600 dark:text-red-400 font-mono bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-red-100 dark:border-red-900/30 flex items-start gap-2">
                  <span *ngIf="err.line" class="font-bold text-red-500 whitespace-nowrap">Line {{ err.line }}:</span>
                  <span>{{ err.message }}</span>
                </div>
              </div>
            </div>

            <!-- Normalization Test Findings (1NF / 2NF / 3NF) -->
            <div *ngIf="normalizationResults().length > 0" class="space-y-3">
              <h4 class="font-bold text-xs text-content-main dark:text-slate-100 flex items-center gap-2">
                <i class="fa-solid fa-filter-circle-dollar text-primary"></i>
                <span>Relational Normalization Test Results (1NF / 2NF / 3NF / BCNF)</span>
              </h4>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div *ngFor="let norm of normalizationResults()" class="p-4 rounded-2xl border border-surface-border dark:border-slate-800 bg-surface-subtle/30 dark:bg-slate-800/30 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-xs text-content-main dark:text-slate-100 font-mono">{{ norm.tableName }}</span>
                    <span
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="norm.overallRank === 'BCNF' || norm.overallRank === '3NF' 
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' 
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'"
                    >
                      Highest Form: {{ norm.overallRank }}
                    </span>
                  </div>

                  <!-- 1NF, 2NF, 3NF Badges -->
                  <div class="grid grid-cols-3 gap-2 text-center text-xs">
                    <div class="p-2 rounded-xl border" [ngClass]="norm.oneNF?.status === 'PASS' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'">
                      <div class="font-bold text-[11px]">1NF</div>
                      <div class="text-[10px] font-semibold">{{ norm.oneNF?.status }}</div>
                    </div>
                    <div class="p-2 rounded-xl border" [ngClass]="norm.twoNF?.status === 'PASS' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'">
                      <div class="font-bold text-[11px]">2NF</div>
                      <div class="text-[10px] font-semibold">{{ norm.twoNF?.status }}</div>
                    </div>
                    <div class="p-2 rounded-xl border" [ngClass]="norm.threeNF?.status === 'PASS' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'">
                      <div class="font-bold text-[11px]">3NF</div>
                      <div class="text-[10px] font-semibold">{{ norm.threeNF?.status }}</div>
                    </div>
                  </div>

                  <!-- Issues details -->
                  <div *ngIf="getTableIssues(norm).length > 0" class="space-y-1.5 pt-1">
                    <div *ngFor="let iss of getTableIssues(norm)" class="text-[11px] p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/30 text-amber-900 dark:text-amber-200">
                      <span class="font-bold">[{{ iss.form }} {{ iss.title }}]:</span> {{ iss.explanation }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Detected Tables Inspector -->
            <div *ngIf="validatedTables().length > 0" class="p-4 rounded-2xl border border-surface-border dark:border-slate-800 bg-surface-subtle/20 dark:bg-slate-800/20 space-y-3">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-content-main dark:text-slate-100 flex items-center gap-1.5">
                  <i class="fa-solid fa-table text-primary"></i>
                  <span>Parsed Tables Inspector ({{ validatedTables().length }})</span>
                </span>
                <span class="text-content-muted dark:text-slate-400">Deterministic AST Extract</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div *ngFor="let tbl of validatedTables()" class="p-3 bg-white dark:bg-slate-900 rounded-xl border border-surface-border dark:border-slate-800 text-xs space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-content-main dark:text-slate-100 font-mono text-sm">{{ tbl.name }}</span>
                    <span class="text-[11px] text-content-muted dark:text-slate-400">{{ tbl.columns.length }} columns</span>
                  </div>

                  <div class="flex flex-wrap gap-1.5">
                    <span
                      *ngFor="let col of tbl.columns"
                      class="px-2 py-0.5 rounded-lg text-[10px] font-mono border"
                      [ngClass]="col.isPrimaryKey ? 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 font-bold' : (col.isForeignKey ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300')"
                    >
                      {{ col.name }} <span class="opacity-75 text-[9px]">({{ col.dataType }})</span>
                      <strong *ngIf="col.isPrimaryKey" class="ml-1 text-amber-600 dark:text-amber-400">PK</strong>
                      <strong *ngIf="col.isForeignKey" class="ml-1 text-blue-600 dark:text-blue-400">FK</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: ER DIAGRAM IMAGE (Powered by Gemini AI) -->
        <div *ngIf="activeTab === 'diagram'" class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-surface-border dark:border-slate-800 shadow-soft space-y-4 transition-colors">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="font-bold text-sm text-content-main dark:text-slate-100 flex items-center gap-2">
                <span>Upload Your ER Diagram Image</span>
                <span class="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-primary-700 dark:text-primary-300 font-bold uppercase">Gemini AI Vision</span>
              </h2>
              <p class="text-xs text-content-muted dark:text-slate-400 mt-0.5">Upload ER diagrams created in Figma, Canva, draw.io, or Lucidchart. Supported formats: PNG, JPG, JPEG, WEBP, PDF.</p>
            </div>
          </div>

          <div
            (dragover)="$event.preventDefault()"
            (drop)="onDiagramFileDrop($event)"
            (click)="diagramFileInput.click()"
            class="border-2 border-dashed border-blue-400/50 dark:border-blue-500/30 hover:border-blue-500 rounded-3xl p-8 text-center transition-all bg-blue-50/20 dark:bg-blue-950/15 hover:bg-blue-50/40 dark:hover:bg-blue-950/25 cursor-pointer group select-none"
          >
            <input
              #diagramFileInput
              type="file"
              accept="image/*,.pdf"
              (change)="onDiagramFileUpload($event, false)"
              class="hidden"
            />
            <div class="w-14 h-14 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
              <i class="fa-solid fa-cloud-arrow-up text-2xl"></i>
            </div>
            <div class="text-sm font-bold text-content-main dark:text-slate-100">
              Click to Browse or Drag & Drop ER Diagram
            </div>
            <div class="text-xs text-content-muted dark:text-slate-400 mt-1">
              Supports PNG, JPG, JPEG, WEBP or PDF up to 15MB
            </div>

            <div class="mt-4">
              <button
                type="button"
                (click)="$event.stopPropagation(); diagramFileInput.click()"
                class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/25 inline-flex items-center gap-2 transition-all transform active:scale-95"
              >
                <i class="fa-solid fa-folder-open text-xs"></i>
                <span>Choose Diagram Image</span>
              </button>
            </div>
          </div>

          <div *ngIf="selectedFileName()" class="p-4 bg-surface-subtle dark:bg-slate-800/60 rounded-2xl text-xs flex flex-wrap items-center justify-between gap-3 border border-surface-border dark:border-slate-700/60">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm flex-shrink-0">
                <i class="fa-solid fa-file-image"></i>
              </div>
              <div class="min-w-0">
                <div class="font-bold text-content-main dark:text-slate-100 truncate max-w-sm">
                  {{ selectedFileName() }}
                </div>
                <div class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <i class="fa-solid fa-circle-check text-[10px]"></i>
                  <span>Ready for Gemini AI Extraction</span>
                </div>
              </div>
            </div>

            <button
              (click)="submitUploadedImage(false)"
              [disabled]="isProcessing()"
              class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
            >
              <i *ngIf="isProcessing()" class="fa-solid fa-spinner fa-spin text-xs"></i>
              <span>{{ isProcessing() ? 'Running Gemini Vision...' : 'Extract Diagram Schema →' }}</span>
            </button>
          </div>
        </div>

        <!-- TAB 3: CREATE TABLES MANUALLY -->
        <div *ngIf="activeTab === 'builder'" class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-surface-border dark:border-slate-800 shadow-soft space-y-6 transition-colors">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="font-bold text-sm text-content-main dark:text-slate-100">Create Tables Manually</h2>
              <p class="text-xs text-content-muted dark:text-slate-400">Construct your own tables, define columns, assign primary & foreign keys.</p>
            </div>
            <div class="flex items-center space-x-2">
              <button
                *ngIf="editableTables.length > 0"
                (click)="clearBuilder()"
                class="px-3 py-1.5 rounded-xl border border-surface-border dark:border-slate-700 text-xs text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-slate-200 hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors"
              >
                Clear All
              </button>
              <button
                (click)="addTableToBuilder()"
                class="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <i class="fa-solid fa-plus text-xs"></i>
                <span>Add New Table</span>
              </button>
            </div>
          </div>

          <!-- Empty State when no tables created yet -->
          <div *ngIf="editableTables.length === 0" class="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-3xl p-10 text-center bg-surface-subtle/40 dark:bg-slate-800/30 space-y-3">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <i class="fa-solid fa-table text-2xl"></i>
            </div>
            <div class="text-sm font-bold text-content-main dark:text-slate-100">No Tables Created Yet</div>
            <p class="text-xs text-content-muted dark:text-slate-400 max-w-md mx-auto">
              Start building your database schema by clicking the button below. Define columns, data types, and primary keys.
            </p>
            <button
              (click)="addTableToBuilder()"
              class="mt-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs shadow-soft transition-all inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-plus text-xs"></i>
              <span>Create Your First Table</span>
            </button>
          </div>

          <!-- Tables List in Builder -->
          <div *ngIf="editableTables.length > 0" class="space-y-6">
            <div
              *ngFor="let t of editableTables; let tIdx = index"
              class="p-4 rounded-2xl border border-surface-border dark:border-slate-800 bg-surface-subtle/60 dark:bg-slate-800/40 space-y-3 transition-colors"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-content-muted dark:text-slate-400">Table {{ tIdx + 1 }}:</span>
                  <input
                    [(ngModel)]="t.name"
                    (ngModelChange)="onTableRenamed()"
                    class="font-bold text-sm text-content-main dark:text-slate-100 bg-white dark:bg-slate-800 border border-surface-border dark:border-slate-700 rounded-xl px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="table_name"
                  />
                </div>
                <div class="flex items-center gap-2">
                  <button
                    (click)="addColumnToTable(t)"
                    class="px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <i class="fa-solid fa-plus text-[10px]"></i>
                    <span>Add Column</span>
                  </button>
                  <button
                    (click)="removeTable(tIdx)"
                    class="px-2.5 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <i class="fa-solid fa-trash-can text-xs"></i>
                    <span>Delete Table</span>
                  </button>
                </div>
              </div>

              <!-- Columns Table -->
              <div class="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-surface-border dark:border-slate-800">
                <table class="w-full text-left text-xs">
                  <thead class="bg-surface-subtle dark:bg-slate-800/60 text-content-muted dark:text-slate-400 border-b border-surface-border dark:border-slate-800 font-medium">
                    <tr>
                      <th class="p-2.5">Column Name</th>
                      <th class="p-2.5">Data Type</th>
                      <th class="p-2.5 text-center">PK</th>
                      <th class="p-2.5 text-center">FK</th>
                      <th class="p-2.5 text-center">Nullable</th>
                      <th class="p-2.5 text-center">Unique</th>
                      <th class="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-border dark:divide-slate-800">
                    <tr *ngFor="let c of t.columns; let cIdx = index">
                      <td class="p-2.5">
                        <input [(ngModel)]="c.name" class="w-full px-2.5 py-1 border border-surface-border dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-content-main dark:text-slate-100" />
                      </td>
                      <td class="p-2.5">
                        <select [(ngModel)]="c.dataType" class="px-2.5 py-1 border border-surface-border dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-content-main dark:text-slate-100">
                          <option value="INT">INT</option>
                          <option value="BIGINT">BIGINT</option>
                          <option value="VARCHAR(100)">VARCHAR(100)</option>
                          <option value="VARCHAR(255)">VARCHAR(255)</option>
                          <option value="TEXT">TEXT</option>
                          <option value="DECIMAL(10,2)">DECIMAL(10,2)</option>
                          <option value="BOOLEAN">BOOLEAN</option>
                          <option value="DATE">DATE</option>
                          <option value="TIMESTAMP">TIMESTAMP</option>
                        </select>
                      </td>
                      <td class="p-2.5 text-center">
                        <input type="checkbox" [(ngModel)]="c.isPrimaryKey" class="accent-primary" />
                      </td>
                      <td class="p-2.5 text-center">
                        <input type="checkbox" [(ngModel)]="c.isForeignKey" class="accent-blue-600" />
                      </td>
                      <td class="p-2.5 text-center">
                        <input type="checkbox" [(ngModel)]="c.isNullable" />
                      </td>
                      <td class="p-2.5 text-center">
                        <input type="checkbox" [(ngModel)]="c.isUnique" />
                      </td>
                      <td class="p-2.5 text-right">
                        <button (click)="removeColumn(t, cIdx)" class="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors" title="Delete Column">
                          <i class="fa-solid fa-xmark text-sm"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Continue to Review Button: ONLY visible when builder is ready with tables -->
          <div *ngIf="isBuilderReady()" class="flex justify-end pt-2">
            <button
              (click)="currentStep.set('confirm')"
              class="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs shadow-soft transition-all flex items-center gap-2"
            >
              <span>Continue to Review Screen →</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ================= STEP 2: CONFIRMATION & REVIEW SCREEN ================= -->
      <div *ngIf="currentStep() === 'confirm'" class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-surface-border dark:border-slate-800 shadow-soft space-y-6 transition-colors">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border dark:border-slate-800 pb-4">
          <div>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-1">
              <i class="fa-solid fa-circle-check text-xs"></i>
              <span>Visual Schema Builder & Review</span>
            </div>
            <h2 class="text-xl font-bold text-content-main dark:text-slate-100">Review & Build Relational Schema</h2>
            <p class="text-xs text-content-muted dark:text-slate-400 mt-0.5">
              Verify tables, relationships, and constraints. Add or delete tables and relationships dynamically before final RDBMS validation.
            </p>
          </div>

          <button
            (click)="currentStep.set('input')"
            class="text-xs font-semibold text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-slate-200 px-3.5 py-1.5 border border-surface-border dark:border-slate-700 rounded-xl hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <i class="fa-solid fa-arrow-left text-xs"></i>
            <span>Back to Input</span>
          </button>
        </div>

        <!-- Uploaded ER Diagram Image Reference (if uploaded) -->
        <div *ngIf="uploadedDiagramUrl()" class="bg-surface-subtle/50 dark:bg-slate-900/60 rounded-2xl border border-surface-border dark:border-slate-800 p-4 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-content-main dark:text-slate-100 flex items-center gap-2">
                <i class="fa-solid fa-image text-blue-500"></i>
                <span>Uploaded ER Diagram Reference</span>
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold uppercase">Original Image</span>
              <span *ngIf="selectedFileName()" class="text-xs text-content-muted dark:text-slate-400">({{ selectedFileName() }})</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                (click)="isDiagramModalOpen.set(true)"
                class="px-2.5 py-1 text-xs font-semibold rounded-lg border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 text-content-main dark:text-slate-200 hover:bg-surface-hover dark:hover:bg-slate-700 flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <i class="fa-solid fa-expand text-xs"></i>
                <span>Enlarge Image</span>
              </button>
              <button
                (click)="showDiagramPreview.set(!showDiagramPreview())"
                class="px-2.5 py-1 text-xs font-semibold rounded-lg border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-slate-200 transition-colors"
              >
                {{ showDiagramPreview() ? 'Hide Image' : 'Show Image' }}
              </button>
            </div>
          </div>

          <!-- Image Display -->
          <div *ngIf="showDiagramPreview()" class="relative rounded-xl overflow-hidden border border-surface-border dark:border-slate-800 bg-white dark:bg-slate-950 p-3 flex items-center justify-center max-h-72 group">
            <img
              [src]="uploadedDiagramUrl()"
              alt="Uploaded ER Diagram"
              class="max-h-64 object-contain rounded-lg cursor-pointer hover:opacity-95 transition-all"
              (click)="isDiagramModalOpen.set(true)"
            />
            <div (click)="isDiagramModalOpen.set(true)" class="absolute bottom-3 right-3 bg-black/75 hover:bg-black text-white text-[11px] px-3 py-1.5 rounded-xl backdrop-blur-sm cursor-pointer shadow-lg flex items-center gap-1.5 transition-all">
              <i class="fa-solid fa-magnifying-glass-plus text-xs"></i>
              <span>Click to Enlarge</span>
            </div>
          </div>
        </div>

        <!-- Fullscreen Responsive Lightbox Modal for Diagram -->
        <div *ngIf="isDiagramModalOpen()" class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm">
          <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl max-h-[92vh] w-full flex flex-col overflow-hidden shadow-2xl border border-surface-border dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div class="flex items-center justify-between p-4 border-b border-surface-border dark:border-slate-800 bg-surface-subtle dark:bg-slate-800/50">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-image text-primary-500"></i>
                <span class="font-bold text-sm text-content-main dark:text-slate-100 truncate">Original ER Diagram: {{ selectedFileName() || 'Uploaded Image' }}</span>
              </div>
              <button (click)="isDiagramModalOpen.set(false)" class="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 font-bold transition-colors">
                <i class="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <div class="p-4 overflow-auto flex items-center justify-center bg-gray-50 dark:bg-slate-950 max-h-[80vh]">
              <img [src]="uploadedDiagramUrl()" alt="Diagram Full View" class="max-w-full max-h-[75vh] object-contain rounded shadow" />
            </div>
          </div>
        </div>

        <!-- Metric Badges Overview -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="p-3.5 bg-surface-subtle dark:bg-slate-800/50 rounded-2xl border border-surface-border dark:border-slate-800">
            <div class="text-[11px] text-content-muted dark:text-slate-400">Base Entities</div>
            <div class="text-lg font-bold text-blue-600 dark:text-blue-400">{{ editableTables.length }} Tables</div>
          </div>
          <div class="p-3.5 bg-surface-subtle dark:bg-slate-800/50 rounded-2xl border border-surface-border dark:border-slate-800">
            <div class="text-[11px] text-content-muted dark:text-slate-400">Relationships</div>
            <div class="text-lg font-bold text-blue-600 dark:text-blue-400">
              {{ extractedRelationships.length }}
              <span class="text-xs text-content-muted dark:text-slate-400 font-normal">(1:N, 1:1, M:N)</span>
            </div>
          </div>
          <div class="p-3.5 bg-surface-subtle dark:bg-slate-800/50 rounded-2xl border border-surface-border dark:border-slate-800">
            <div class="text-[11px] text-content-muted dark:text-slate-400">Total Constraints</div>
            <div class="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {{ getTotalConstraintCount() }}
              <span class="text-xs text-content-muted dark:text-slate-400 font-normal">({{ getTotalKeyCount() }} Keys)</span>
            </div>
          </div>
          <div class="p-3.5 bg-surface-subtle dark:bg-slate-800/50 rounded-2xl border border-surface-border dark:border-slate-800">
            <div class="text-[11px] text-content-muted dark:text-slate-400">AI Confidence</div>
            <div class="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              98%
              <span class="text-xs text-content-muted dark:text-slate-400 font-normal">Verified</span>
            </div>
          </div>
        </div>

        <!-- Architectural Intelligence Explanation Banner -->
        <div class="p-3.5 bg-gradient-to-r from-blue-50/70 to-blue-50/70 dark:from-blue-950/20 dark:to-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/30 text-xs text-content-main dark:text-slate-200 space-y-2">
          <div class="flex items-center gap-2 font-bold text-blue-950 dark:text-blue-300">
            <i class="fa-solid fa-circle-info text-primary-500"></i>
            <span>Intelligent ER-to-Relational Mapping Active</span>
          </div>
          <p class="text-content-muted dark:text-slate-400 leading-relaxed">
            {{ getDesignExplanation() }}
          </p>
        </div>

        <!-- ================= RELATIONSHIP MANAGER (Visual Builder) ================= -->
        <div class="border border-surface-border dark:border-slate-800 rounded-2xl p-5 bg-surface-subtle/40 dark:bg-slate-800/30 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="font-bold text-sm text-content-main dark:text-slate-100 flex items-center gap-2">
                <i class="fa-solid fa-link text-blue-500"></i>
                <span>Relationship Manager (1:1, 1:N, M:N)</span>
                <span class="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">{{ extractedRelationships.length }} Relationships</span>
              </h3>
              <p class="text-xs text-content-muted dark:text-slate-400 mt-0.5">
                Define and manage relations between entities. 1:N relationships automatically synchronize foreign keys into the child table.
              </p>
            </div>
            <button
              (click)="addNewRelationship()"
              class="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <i class="fa-solid fa-plus text-xs"></i>
              <span>Add New Relationship</span>
            </button>
          </div>

          <div *ngIf="extractedRelationships.length === 0" class="p-6 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 text-center text-xs text-content-muted dark:text-slate-400 bg-white dark:bg-slate-900">
            No relationships registered yet. Click "Add New Relationship" to connect your tables with foreign keys.
          </div>

          <!-- Relationships Grid List -->
          <div *ngIf="extractedRelationships.length > 0" class="space-y-3">
            <div
              *ngFor="let r of extractedRelationships; let rIdx = index"
              class="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-surface-border dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <!-- Relationship Name -->
              <div class="flex items-center gap-2">
                <span class="text-content-muted dark:text-slate-400 font-bold">Rel:</span>
                <input
                  [(ngModel)]="r.relationshipName"
                  placeholder="relationship_name"
                  class="px-2.5 py-1 border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs w-28 font-semibold text-blue-600 dark:text-blue-400"
                />
              </div>

              <!-- Cardinality -->
              <div class="flex items-center gap-2">
                <span class="text-content-muted dark:text-slate-400 font-medium">Type:</span>
                <select
                  [(ngModel)]="r.cardinality"
                  (ngModelChange)="syncRelationshipToTables(r)"
                  class="px-2.5 py-1 border border-surface-border dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 font-bold text-content-main dark:text-slate-100"
                >
                  <option value="1:N">1:N (One-to-Many)</option>
                  <option value="1:1">1:1 (One-to-One)</option>
                  <option value="M:N">M:N (Many-to-Many)</option>
                </select>
              </div>

              <!-- Child Table (holds FK) -->
              <div class="flex items-center gap-2">
                <span class="text-content-muted dark:text-slate-400 font-medium">Child Table (FK):</span>
                <select
                  [(ngModel)]="r.sourceTable"
                  (ngModelChange)="onRelChildChanged(r)"
                  class="px-2.5 py-1 border border-surface-border dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 font-medium text-content-main dark:text-slate-100"
                >
                  <option *ngFor="let t of editableTables" [value]="t.name">{{ t.name }}</option>
                </select>
                <input
                  [(ngModel)]="r.sourceColumn"
                  (ngModelChange)="syncRelationshipToTables(r)"
                  placeholder="fk_column"
                  class="px-2.5 py-1 border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs w-28 text-content-main dark:text-slate-100"
                  title="Foreign key column name in child table"
                />
              </div>

              <span class="text-primary font-bold">→</span>

              <!-- Parent Table (holds PK) -->
              <div class="flex items-center gap-2">
                <span class="text-content-muted dark:text-slate-400 font-medium">Parent Table (PK):</span>
                <select
                  [(ngModel)]="r.targetTable"
                  (ngModelChange)="onRelParentChanged(r)"
                  class="px-2.5 py-1 border border-surface-border dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 font-medium text-content-main dark:text-slate-100"
                >
                  <option *ngFor="let t of editableTables" [value]="t.name">{{ t.name }}</option>
                </select>
                <input
                  [(ngModel)]="r.targetColumn"
                  (ngModelChange)="syncRelationshipToTables(r)"
                  placeholder="pk_column"
                  class="px-2.5 py-1 border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs w-28 text-content-main dark:text-slate-100"
                  title="Primary key column name in parent table"
                />
              </div>

              <!-- Delete Relationship Button -->
              <button
                (click)="removeRelationship(rIdx)"
                class="px-2.5 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg font-bold text-xs transition-colors flex items-center gap-1"
                title="Delete Relationship"
              >
                <i class="fa-solid fa-trash-can text-xs"></i>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ================= VISUAL TABLE BUILDER IN STEP 2 ================= -->
        <div class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="font-bold text-sm text-content-main dark:text-slate-100 flex items-center gap-2">
                <i class="fa-solid fa-table-cells-large text-primary-500"></i>
                <span>Visual Table Builder</span>
                <span class="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-primary-700 dark:text-primary-300 text-[10px] font-bold">{{ editableTables.length }} Tables</span>
              </h3>
              <p class="text-xs text-content-muted dark:text-slate-400 mt-0.5">
                Add or remove tables and columns. Adjust column data types, primary keys, and foreign keys directly.
              </p>
            </div>
            <button
              (click)="addTableToBuilder()"
              class="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <i class="fa-solid fa-plus text-xs"></i>
              <span>Add New Table</span>
            </button>
          </div>

          <div *ngFor="let t of editableTables; let tIdx = index" class="border border-surface-border dark:border-slate-800 rounded-2xl p-4 bg-surface-subtle/30 dark:bg-slate-800/30 space-y-3 transition-colors">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-content-muted dark:text-slate-400">Table {{ tIdx + 1 }}:</span>
                <input
                  [(ngModel)]="t.name"
                  (ngModelChange)="onTableRenamed()"
                  class="font-bold text-sm text-content-main dark:text-slate-100 bg-white dark:bg-slate-800 border border-surface-border dark:border-slate-700 rounded-xl px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="table_name"
                />
                <span class="text-xs text-content-muted dark:text-slate-400 font-normal">({{ t.columns.length }} columns)</span>
              </div>
              <div class="flex items-center gap-3">
                <button
                  (click)="addColumnToTable(t)"
                  class="px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg transition-colors flex items-center gap-1"
                >
                  <i class="fa-solid fa-plus text-[10px]"></i>
                  <span>Add Column</span>
                </button>
                <button
                  (click)="removeTable(tIdx)"
                  *ngIf="editableTables.length > 1"
                  class="px-2.5 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg font-medium transition-colors flex items-center gap-1"
                >
                  <i class="fa-solid fa-trash-can text-xs"></i>
                  <span>Delete Table</span>
                </button>
              </div>
            </div>

            <!-- Table columns view & edit -->
            <div class="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-surface-border dark:border-slate-800">
              <table class="w-full text-left text-xs">
                <thead class="bg-surface-subtle dark:bg-slate-800/60 text-content-muted dark:text-slate-400 border-b border-surface-border dark:border-slate-800 font-medium">
                  <tr>
                    <th class="p-2.5">Column Name</th>
                    <th class="p-2.5">Data Type</th>
                    <th class="p-2.5 text-center" title="Primary Key">PK</th>
                    <th class="p-2.5 text-center" title="Foreign Key">FK</th>
                    <th class="p-2.5 text-center">Nullable</th>
                    <th class="p-2.5 text-center">Unique</th>
                    <th class="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-border dark:divide-slate-800">
                  <tr *ngFor="let c of t.columns; let cIdx = index" [class.bg-amber-50/50]="c.isUncertain" [class.dark:bg-amber-950/20]="c.isUncertain">
                    <td class="p-2.5">
                      <div class="flex items-center gap-1.5">
                        <input [(ngModel)]="c.name" class="px-2.5 py-1 border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 text-content-main dark:text-slate-100 rounded-lg text-xs w-44 font-medium" />
                        <span *ngIf="c.isUncertain" class="px-1.5 py-0.5 rounded text-[9px] bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold">Uncertain</span>
                      </div>
                    </td>
                    <td class="p-2.5">
                      <select [(ngModel)]="c.dataType" class="px-2.5 py-1 border border-surface-border dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-content-main dark:text-slate-100">
                        <option value="INT">INT</option>
                        <option value="BIGINT">BIGINT</option>
                        <option value="VARCHAR(50)">VARCHAR(50)</option>
                        <option value="VARCHAR(100)">VARCHAR(100)</option>
                        <option value="VARCHAR(255)">VARCHAR(255)</option>
                        <option value="TEXT">TEXT</option>
                        <option value="DECIMAL(10,2)">DECIMAL(10,2)</option>
                        <option value="BOOLEAN">BOOLEAN</option>
                        <option value="DATE">DATE</option>
                        <option value="TIMESTAMP">TIMESTAMP</option>
                      </select>
                    </td>
                    <td class="p-2.5 text-center">
                      <input
                        type="checkbox"
                        [(ngModel)]="c.isPrimaryKey"
                        (ngModelChange)="onPkToggled(t, c)"
                        class="accent-primary cursor-pointer"
                      />
                    </td>
                    <td class="p-2.5 text-center">
                      <input
                        type="checkbox"
                        [(ngModel)]="c.isForeignKey"
                        (ngModelChange)="onFkToggled(t, c)"
                        class="accent-blue-600 cursor-pointer"
                      />
                    </td>
                    <td class="p-2.5 text-center">
                      <input
                        type="checkbox"
                        [(ngModel)]="c.isNullable"
                        class="cursor-pointer"
                      />
                    </td>
                    <td class="p-2.5 text-center">
                      <input
                        type="checkbox"
                        [(ngModel)]="c.isUnique"
                        class="cursor-pointer"
                      />
                    </td>
                    <td class="p-2.5 text-right">
                      <button
                        (click)="removeColumn(t, cIdx)"
                        class="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                        title="Delete Column"
                      >
                        <i class="fa-solid fa-xmark text-sm"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Project Metadata before run -->
        <div class="pt-4 border-t border-surface-border dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="text-xs font-semibold text-content-main dark:text-slate-200">Project Name:</span>
            <input
              [(ngModel)]="projectTitle"
              class="px-3 py-1.5 rounded-xl border border-surface-border dark:border-slate-700 text-xs w-64 bg-white dark:bg-slate-800 text-content-main dark:text-slate-100"
              placeholder="My Custom Database"
            />
          </div>

          <button
            (click)="executeFinalAnalysis()"
            [disabled]="isProcessing()"
            class="px-8 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm shadow-soft transition-all transform active:scale-95 flex items-center gap-2"
          >
            <i *ngIf="isProcessing()" class="fa-solid fa-spinner fa-spin text-sm"></i>
            <i *ngIf="!isProcessing()" class="fa-solid fa-rocket text-sm"></i>
            <span *ngIf="isProcessing()">Running Complete RDBMS Validation...</span>
            <span *ngIf="!isProcessing()">Run Complete Database Analysis</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class NewAnalysisComponent implements OnInit {
  private api = inject(ApiService);
  public state = inject(ProjectStateService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  public activeProject = this.state.activeProject;
  public currentStep = signal<'input' | 'confirm'>('input');
  public activeTab: 'sql' | 'diagram' | 'builder' = 'sql';
  public isProcessing = signal<boolean>(false);
  public selectedFileName = signal<string | null>(null);
  public uploadedDiagramUrl = signal<string | null>(null);
  public showDiagramPreview = signal<boolean>(true);
  public isDiagramModalOpen = signal<boolean>(false);

  // SQL & Validation state
  public sqlCode: string = '';
  public sqlDialect: string = 'postgresql';
  public projectTitle: string = 'Custom Database Design';
  public uploadedSqlFileName = signal<string | null>(null);

  public isValidatingSql = signal<boolean>(false);
  public hasValidatedSql = signal<boolean>(false);
  public validationErrors = signal<Array<{ line?: number; message: string }>>([]);
  public validationWarnings = signal<Array<{ line?: number; message: string; severity?: string }>>([]);
  public validatedTables = signal<ParsedTable[]>([]);
  public normalizationResults = signal<any[]>([]);
  public validationSuccessMessage = signal<string | null>(null);

  public uploadedFile: File | null = null;
  public editableTables: EditableTable[] = [];
  public extractedMetrics: any = null;
  public extractedRelationships: any[] = [];

  public countRelationships(): number {
    return this.extractedRelationships.length;
  }

  public getTotalConstraintCount(): number {
    let count = 0;
    for (const t of this.editableTables) {
      count += t.primaryKey ? t.primaryKey.length : 0;
      count += t.foreignKeys ? t.foreignKeys.length : 0;
      for (const c of t.columns) {
        if (!c.isNullable) count++;
        if (c.isUnique) count++;
      }
    }
    return count;
  }

  public getDesignExplanation(): string {
    if (this.extractedMetrics?.designExplanation) {
      return this.extractedMetrics.designExplanation;
    }
    return `${this.editableTables.length} base entities recognized. In accordance with proper ER-to-Relational mapping rules, 1:N relationships (such as 'Teaches') are modeled via foreign keys inside child entities rather than creating redundant junction tables.`;
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'diagram') {
        this.activeTab = 'diagram';
      } else if (params['tab'] === 'builder') {
        this.activeTab = 'builder';
      } else {
        this.activeTab = 'sql';
      }
    });

    const currentProj = this.state.activeProject();
    if (currentProj) {
      this.projectTitle = currentProj.title || 'My Database Project';
      this.sqlDialect = currentProj.dialect || 'postgresql';
    } else {
      this.projectTitle = 'Custom Relational Database';
    }
    this.sqlCode = '';
    this.editableTables = [];
  }

  public switchTab(tab: 'sql' | 'diagram' | 'builder') {
    this.activeTab = tab;
  }

  public isBuilderReady(): boolean {
    if (this.editableTables.length === 0) return false;
    return this.editableTables.every(t =>
      t.name &&
      t.name.trim().length > 0 &&
      t.columns &&
      t.columns.length > 0 &&
      t.columns.every(c => c.name && c.name.trim().length > 0)
    );
  }

  public onSqlCodeChange() {
    if (!this.state.activeProject()) {
      const detectedName = this.detectMainTableName(this.sqlCode);
      if (detectedName) {
        this.projectTitle = `${detectedName.charAt(0).toUpperCase() + detectedName.slice(1).replace(/_/g, ' ')} Database`;
      }
    }
  }

  public countTablesInSql(): number {
    const matches = this.sqlCode.match(/CREATE\s+TABLE/gi);
    return matches ? matches.length : 0;
  }

  private detectMainTableName(sql: string): string | null {
    const match = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"'\w]+)/i);
    return match ? match[1].replace(/[`"']/g, '') : null;
  }

  public onSqlFileUpload(event: any) {
    const file = event.target?.files?.[0];
    if (file) {
      this.uploadedSqlFileName.set(file.name);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.sqlCode = e.target.result;
        if (!this.state.activeProject()) {
          this.projectTitle = file.name.replace(/\.sql$/i, '').replace(/[_-]/g, ' ');
        }
        this.testSqlValidation();
      };
      reader.readAsText(file);
    }
  }

  public loadNormalizationViolationSample() {
    this.sqlCode = `-- University Enrollment & Department Management Schema
-- Test Schema containing intentional 1NF, 2NF, and 3NF Normalization Violations

CREATE TABLE department (
    dept_id INT PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL,
    building VARCHAR(100)
);

CREATE TABLE student_course_registration (
    -- Composite Primary Key: (student_id, course_id)
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    
    -- [1NF Violation]: Multi-valued / non-atomic repeating attributes
    student_phone_numbers VARCHAR(100),
    hobbies VARCHAR(200),
    
    -- [2NF Violation]: Partial Key Dependencies
    -- (student_name & student_email depend ONLY on student_id, not course_id)
    student_name VARCHAR(150) NOT NULL,
    student_email VARCHAR(150),
    
    -- (course_title & course_credits depend ONLY on course_id, not student_id)
    course_title VARCHAR(150) NOT NULL,
    course_credits INT,
    
    -- [3NF Violation]: Transitive Functional Dependency
    -- (instructor_id -> instructor_name, instructor_office, dept_id)
    instructor_id INT,
    instructor_name VARCHAR(150),
    instructor_office VARCHAR(50),
    dept_id INT,
    dept_name VARCHAR(100),
    
    -- Valid Dependent Attribute on full composite key
    enrollment_date DATE,
    grade VARCHAR(5),
    
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (dept_id) REFERENCES department(dept_id)
);`;
    this.uploadedSqlFileName.set('normalization_test_sample.sql');
    if (!this.state.activeProject()) {
      this.projectTitle = 'University Enrollment Schema';
    }
    this.testSqlValidation();
  }

  public testSqlValidation() {
    if (!this.sqlCode.trim()) return;
    this.isValidatingSql.set(true);
    this.hasValidatedSql.set(false);
    this.validationErrors.set([]);
    this.validationWarnings.set([]);
    this.validatedTables.set([]);
    this.normalizationResults.set([]);
    this.validationSuccessMessage.set(null);

    this.api.previewSql(this.sqlCode, this.sqlDialect).subscribe({
      next: (res: any) => {
        this.isValidatingSql.set(false);
        this.hasValidatedSql.set(true);
        if (res.errors && res.errors.length > 0) {
          this.validationErrors.set(res.errors);
        }
        if (res.warnings && res.warnings.length > 0) {
          this.validationWarnings.set(res.warnings);
        }
        if (res.tables) {
          this.validatedTables.set(res.tables);
        }
        if (res.normalization) {
          this.normalizationResults.set(res.normalization);
        }
        if ((!res.errors || res.errors.length === 0) && (!res.warnings || res.warnings.length === 0)) {
          this.validationSuccessMessage.set('All SQL DDL statements adhere to valid grammar and pass relational checks.');
        }
      },
      error: (err: any) => {
        this.isValidatingSql.set(false);
        this.hasValidatedSql.set(true);
        this.validationErrors.set([{ message: err.error?.error || err.message || 'Syntax validation failed.' }]);
      }
    });
  }

  public hasNormalizationFlaws(): boolean {
    return this.normalizationResults().some(n => 
      n.oneNF?.status === 'FAIL' || n.twoNF?.status === 'FAIL' || n.threeNF?.status === 'FAIL'
    ) || this.validationWarnings().length > 0;
  }

  public getNormalizationFlawsCount(): number {
    let count = 0;
    for (const n of this.normalizationResults()) {
      if (n.oneNF?.status === 'FAIL') count += (n.oneNF.issues?.length || 1);
      if (n.twoNF?.status === 'FAIL') count += (n.twoNF.issues?.length || 1);
      if (n.threeNF?.status === 'FAIL') count += (n.threeNF.issues?.length || 1);
    }
    return Math.max(count, this.validationWarnings().length);
  }

  public getTableIssues(norm: any): Array<{ form: string; title: string; explanation: string }> {
    const list: Array<{ form: string; title: string; explanation: string }> = [];
    if (norm.oneNF?.issues) {
      for (const iss of norm.oneNF.issues) {
        list.push({ form: '1NF', title: iss.title, explanation: iss.explanation });
      }
    }
    if (norm.twoNF?.issues) {
      for (const iss of norm.twoNF.issues) {
        list.push({ form: '2NF', title: iss.title, explanation: iss.explanation });
      }
    }
    if (norm.threeNF?.issues) {
      for (const iss of norm.threeNF.issues) {
        list.push({ form: '3NF', title: iss.title, explanation: iss.explanation });
      }
    }
    return list;
  }

  public onDiagramFileUpload(event: any, isHandwritten: boolean) {
    const file = event.target?.files?.[0] || event.dataTransfer?.files?.[0];
    if (file) {
      this.uploadedFile = file;
      this.selectedFileName.set(file.name);
      this.projectTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

      // Read file immediately into data URL for direct visual reference preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.uploadedDiagramUrl.set(e.target.result);
      };
      reader.readAsDataURL(file);

      // Automatically extract diagram on file selection
      this.submitUploadedImage(isHandwritten);
    }
  }

  public onDiagramFileDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.onDiagramFileUpload({ target: { files: event.dataTransfer.files } }, false);
    }
  }

  public submitUploadedImage(isHandwritten: boolean) {
    this.isProcessing.set(true);
    const formData = new FormData();
    if (this.uploadedFile) {
      formData.append('diagram', this.uploadedFile);
    }
    formData.append('isHandwritten', String(isHandwritten));

    this.api.parseDiagram(formData).subscribe({
      next: (res: any) => {
        if (res.success && res.tables) {
          if (res.previewUrl && !this.uploadedDiagramUrl()) {
            this.uploadedDiagramUrl.set(res.previewUrl);
          }
          if (res.projectTitle) {
            this.projectTitle = res.projectTitle;
          }
          if (res.metrics) {
            this.extractedMetrics = res.metrics;
          }
          if (res.relationships) {
            this.extractedRelationships = res.relationships;
          }
          this.editableTables = res.tables.map((t: any) => ({
            name: t.name,
            primaryKey: t.primaryKey || [],
            foreignKeys: t.foreignKeys || [],
            columns: t.columns.map((c: any) => ({
              name: c.name,
              dataType: c.dataType || 'VARCHAR(255)',
              isPrimaryKey: !!c.isPrimaryKey,
              isForeignKey: !!c.isForeignKey,
              isNullable: c.isNullable ?? !c.isPrimaryKey,
              isUnique: !!c.isUnique || !!c.isPrimaryKey,
              defaultValue: c.defaultValue,
              isUncertain: c.isUncertain,
              confidence: c.confidence
            }))
          }));

          // Synchronize relationships with foreign keys on child tables
          for (const rel of this.extractedRelationships) {
            this.syncRelationshipToTables(rel);
          }

          this.currentStep.set('confirm');
        }
        this.isProcessing.set(false);
      },
      error: () => {
        this.isProcessing.set(false);
      }
    });
  }

  public processSqlInput() {
    this.processSqlInputInternal(true);
  }

  private processSqlInputInternal(goToConfirm: boolean) {
    if (!this.sqlCode.trim()) return;
    this.isProcessing.set(true);

    this.api.previewSql(this.sqlCode, this.sqlDialect).subscribe({
      next: (res: any) => {
        if (res.success && res.tables) {
          this.editableTables = res.tables.map((t: any) => ({
            name: t.name,
            primaryKey: t.primaryKey || [],
            foreignKeys: t.foreignKeys || [],
            columns: t.columns.map((c: any) => ({
              name: c.name,
              dataType: c.dataType,
              isPrimaryKey: c.isPrimaryKey,
              isForeignKey: c.isForeignKey,
              isNullable: c.isNullable,
              isUnique: c.isUnique,
              defaultValue: c.defaultValue
            }))
          }));

          if (goToConfirm) {
            this.currentStep.set('confirm');
          }
        }
        this.isProcessing.set(false);
      },
      error: () => {
        this.isProcessing.set(false);
      }
    });
  }

  /**
   * Fast Direct Analysis of User's SQL
   */
  public analyzeSqlDirectly() {
    if (!this.sqlCode.trim()) return;
    this.isProcessing.set(true);

    const active = this.state.activeProject();
    const title = this.projectTitle || active?.title || 'My SQL Database';
    const existingProjectId = active?.id;

    const runAnalysis = (projId?: string, projObj?: any) => {
      this.api.executeAnalysis({
        projectId: projId,
        projectTitle: title,
        sql: this.sqlCode,
        dialect: this.sqlDialect
      }).subscribe({
        next: (analysis) => {
          this.state.setAnalysis(analysis, projObj || active || undefined);
          this.isProcessing.set(false);
          this.router.navigate(['/normalization']);
        },
        error: (err: any) => {
          this.isProcessing.set(false);
          console.error('Analysis error:', err);
        }
      });
    };

    if (existingProjectId && !existingProjectId.startsWith('local_')) {
      runAnalysis(existingProjectId, active);
    } else {
      this.api.createProject({
        title,
        description: 'Imported via SQL Code Input',
        dialect: this.sqlDialect
      }).subscribe({
        next: (projRes: any) => {
          runAnalysis(projRes.project?.id, projRes.project);
        },
        error: () => {
          // Fallback without saving if offline
          runAnalysis(undefined, {
            id: 'local_proj',
            title,
            dialect: this.sqlDialect,
            status: 'ANALYZED'
          });
        }
      });
    }
  }

  public clearBuilder() {
    this.editableTables = [];
    this.addTableToBuilder();
  }

  public addTableToBuilder() {
    this.editableTables.push({
      name: `table_${this.editableTables.length + 1}`,
      primaryKey: ['id'],
      foreignKeys: [],
      columns: [
        { name: 'id', dataType: 'INT', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true },
        { name: 'name', dataType: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false }
      ]
    });
  }

  public onTableRenamed() {
    if (this.editableTables.length > 0 && this.editableTables[0].name) {
      this.projectTitle = `${this.editableTables[0].name.charAt(0).toUpperCase() + this.editableTables[0].name.slice(1)} Database`;
    }
  }

  public removeTable(idx: number) {
    const removedName = this.editableTables[idx]?.name;
    this.editableTables.splice(idx, 1);
    if (removedName) {
      this.extractedRelationships = this.extractedRelationships.filter(
        r => r.sourceTable?.toLowerCase() !== removedName.toLowerCase() &&
             r.targetTable?.toLowerCase() !== removedName.toLowerCase()
      );
    }
  }

  public addNewRelationship() {
    if (this.editableTables.length === 0) return;
    const parent = this.editableTables[0].name;
    const child = this.editableTables.length > 1 ? this.editableTables[1].name : this.editableTables[0].name;
    const parentPk = this.editableTables[0].primaryKey?.[0] || 'id';
    const fkCol = `${parent.toLowerCase()}_id`;

    const newRel = {
      relationshipName: `rel_${child}_${parent}`,
      cardinality: '1:N' as const,
      sourceTable: child,
      sourceColumn: fkCol,
      targetTable: parent,
      targetColumn: parentPk,
      confidence: 1.0,
      isUncertain: false
    };

    this.extractedRelationships.push(newRel);
    this.syncRelationshipToTables(newRel);
  }

  public removeRelationship(idx: number) {
    const rel = this.extractedRelationships[idx];
    if (rel) {
      const child = this.editableTables.find(t => t.name.toLowerCase() === rel.sourceTable?.toLowerCase());
      if (child && child.foreignKeys) {
        child.foreignKeys = child.foreignKeys.filter(f => f.column !== rel.sourceColumn);
      }
    }
    this.extractedRelationships.splice(idx, 1);
  }

  public syncRelationshipToTables(rel: any) {
    if (!rel || !rel.sourceTable || !rel.targetTable) return;
    const child = this.editableTables.find(t => t.name.toLowerCase() === rel.sourceTable.toLowerCase());
    const parent = this.editableTables.find(t => t.name.toLowerCase() === rel.targetTable.toLowerCase());

    if (child && parent) {
      const parentPk = (parent.primaryKey && parent.primaryKey[0]) ||
        parent.columns.find(c => c.isPrimaryKey)?.name || 'id';
      rel.targetColumn = rel.targetColumn || parentPk;

      let fkColName = rel.sourceColumn;
      if (!fkColName) {
        fkColName = `${parent.name.toLowerCase()}_id`;
        rel.sourceColumn = fkColName;
      }

      let col = child.columns.find(c => c.name.toLowerCase() === fkColName.toLowerCase());
      if (!col) {
        child.columns.push({
          name: fkColName,
          dataType: parent.columns.find(c => c.name === parentPk)?.dataType || 'INT',
          isPrimaryKey: false,
          isForeignKey: true,
          isNullable: true,
          isUnique: rel.cardinality === '1:1'
        });
      } else {
        col.isForeignKey = true;
        if (rel.cardinality === '1:1') col.isUnique = true;
      }

      if (!child.foreignKeys) child.foreignKeys = [];
      if (!child.foreignKeys.some(f => f.column.toLowerCase() === fkColName.toLowerCase())) {
        child.foreignKeys.push({
          column: fkColName,
          targetTable: parent.name,
          targetColumn: parentPk
        });
      }
    }
  }

  public onRelChildChanged(rel: any) {
    this.syncRelationshipToTables(rel);
  }

  public onRelParentChanged(rel: any) {
    const parent = this.editableTables.find(t => t.name.toLowerCase() === rel.targetTable?.toLowerCase());
    if (parent) {
      rel.targetColumn = (parent.primaryKey && parent.primaryKey[0]) || parent.columns[0]?.name || 'id';
      if (!rel.sourceColumn || rel.sourceColumn.endsWith('_id')) {
        rel.sourceColumn = `${parent.name.toLowerCase()}_id`;
      }
    }
    this.syncRelationshipToTables(rel);
  }

  public onPkToggled(table: EditableTable, col: any) {
    if (col.isPrimaryKey) {
      col.isForeignKey = false;
      col.isNullable = false;
      col.isUnique = true;
      if (!table.primaryKey.includes(col.name)) {
        table.primaryKey.push(col.name);
      }
    } else {
      table.primaryKey = table.primaryKey.filter(k => k !== col.name);
    }
  }

  public onFkToggled(table: EditableTable, col: any) {
    if (col.isForeignKey) {
      col.isPrimaryKey = false;
      table.primaryKey = table.primaryKey.filter(k => k !== col.name);
    }
  }

  public addColumnToTable(table: EditableTable) {
    table.columns.push({
      name: `col_${table.columns.length + 1}`,
      dataType: 'VARCHAR(255)',
      isPrimaryKey: false,
      isForeignKey: false,
      isNullable: true,
      isUnique: false
    });
  }

  public removeColumn(table: EditableTable, colIdx: number) {
    table.columns.splice(colIdx, 1);
  }

  public getTotalColumnCount(): number {
    return this.editableTables.reduce((acc, t) => acc + t.columns.length, 0);
  }

  public getTotalKeyCount(): number {
    return this.editableTables.reduce(
      (acc, t) => acc + t.columns.filter(c => c.isPrimaryKey || c.isForeignKey).length,
      0
    );
  }

  public getUncertainCount(): number {
    let count = 0;
    for (const t of this.editableTables) {
      for (const c of t.columns) {
        if (c.isUncertain) count++;
      }
    }
    return count;
  }

  public executeFinalAnalysis() {
    this.isProcessing.set(true);

    const active = this.state.activeProject();
    const title = this.projectTitle || active?.title || 'My Custom Database';
    const existingProjectId = active?.id;

    // Synchronize all relationships with foreign keys on editableTables before submitting
    for (const rel of this.extractedRelationships) {
      this.syncRelationshipToTables(rel);
    }

    const runAnalysis = (projId?: string, projObj?: any) => {
      const payload: any = {
        projectId: projId,
        projectTitle: title,
        dialect: this.sqlDialect
      };

      if (this.editableTables.length > 0) {
        payload.tables = this.editableTables;
        if (this.extractedRelationships.length > 0) {
          payload.relationships = this.extractedRelationships;
        }
      } else if (this.sqlCode.trim()) {
        payload.sql = this.sqlCode;
      }

      this.api.executeAnalysis(payload).subscribe({
        next: (analysis) => {
          this.state.setAnalysis(analysis, projObj || active || undefined);
          this.isProcessing.set(false);
          this.router.navigate(['/normalization']);
        },
        error: (err: any) => {
          this.isProcessing.set(false);
          console.error('Final analysis error:', err);
        }
      });
    };

    if (existingProjectId && !existingProjectId.startsWith('local_')) {
      runAnalysis(existingProjectId, active);
    } else {
      this.api.createProject({
        title,
        description: 'Imported via DB Insight AI Multi-Input Studio',
        dialect: this.sqlDialect
      }).subscribe({
        next: (projRes: any) => {
          runAnalysis(projRes.project?.id, projRes.project);
        },
        error: () => {
          runAnalysis(undefined, {
            id: 'local_proj',
            title,
            dialect: this.sqlDialect,
            status: 'ANALYZED'
          });
        }
      });
    }
  }
}
