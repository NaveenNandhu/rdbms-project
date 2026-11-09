import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProjectStateService } from '../../core/services/project-state.service';
import { ApiService } from '../../core/services/api.service';
import { TableNormalizationAnalysis } from '../../core/models/schema.models';

@Component({
  selector: 'app-normalization',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="max-w-6xl mx-auto space-y-6 fade-in pb-12">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border dark:border-slate-800 pb-4">
        <div>
          <h1 class="text-2xl font-extrabold text-content-main dark:text-slate-100 tracking-tight">Database Normalization Analyzer</h1>
          <p class="text-xs text-content-muted dark:text-slate-400 mt-1">
            Step-by-step rigorous mathematical audit from 1NF to BCNF with student functional dependency input.
          </p>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!state.activeAnalysis() || state.activeAnalysis()?.tables?.length === 0" class="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-surface-border dark:border-slate-800 shadow-soft space-y-5">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center text-2xl">
          <i class="fa-solid fa-filter-circle-dollar"></i>
        </div>
        <div class="max-w-md mx-auto">
          <h3 class="font-bold text-base text-content-main dark:text-slate-100">No Active Schema Analyzed Yet</h3>
          <p class="text-xs text-content-muted dark:text-slate-400 mt-1.5 leading-relaxed">
            Your account currently has no active database analysis. You can start a new project to test your SQL DDL or load our academic sample schema to test 1NF, 2NF, 3NF, and BCNF normalization.
          </p>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a
            routerLink="/new-analysis"
            class="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs shadow-soft transition-all flex items-center gap-2"
          >
            <i class="fa-solid fa-plus text-xs"></i>
            <span>Create Project & Test SQL</span>
          </a>

          <button
            (click)="state.loadInitialWorkspaceSchema()"
            class="px-4 py-2.5 rounded-xl border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 text-content-main dark:text-slate-200 text-xs font-semibold hover:bg-surface-hover dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <i class="fa-solid fa-flask text-xs text-blue-500"></i>
            <span>Load Academic Sample Demo</span>
          </button>
        </div>
      </div>

      <!-- Main Normalization Content (When Schema is Active) -->
      <div *ngIf="state.activeAnalysis() && state.activeAnalysis()!.tables.length > 0" class="space-y-6">
        <!-- Table Selector Dropdown & Add Custom FD Trigger -->
        <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-surface-border dark:border-slate-800 shadow-soft flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div class="flex items-center space-x-3">
          <span class="text-xs font-semibold text-content-muted dark:text-slate-400 uppercase tracking-wider">Select Table:</span>
          <select
            [(ngModel)]="selectedTableName"
            (change)="onTableChange()"
            class="px-3 py-1.5 rounded-xl border border-surface-border dark:border-slate-700 font-semibold text-xs text-content-main dark:text-slate-200 bg-surface-subtle dark:bg-slate-800 transition-colors"
          >
            <option *ngFor="let t of state.activeAnalysis()?.tables" [value]="t.name">
              {{ t.name }} ({{ t.columns.length }} cols)
            </option>
          </select>
        </div>

        <!-- Add Functional Dependency Button -->
        <button
          (click)="showFdModal.set(true)"
          class="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-soft flex items-center gap-2 transition-all transform active:scale-95"
        >
          <i class="fa-solid fa-plus text-xs"></i>
          <span>Add Custom Functional Dependency (X → Y)</span>
        </button>
      </div>

      <!-- Functional Dependencies Display Bar -->
      <div *ngIf="currentTableNorm() as ctn" class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-surface-border dark:border-slate-800 shadow-soft space-y-3 transition-colors">
        <div class="flex items-center justify-between">
          <div class="text-xs font-bold text-content-main dark:text-slate-200 uppercase tracking-wider">Candidate Keys & Verified Dependencies</div>
          <span class="text-[11px] text-content-muted dark:text-slate-400">Determines 2NF, 3NF & BCNF proofs</span>
        </div>

        <div class="flex flex-wrap gap-2 pt-1">
          <!-- Candidate Keys badge -->
          <div class="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-semibold flex items-center gap-1.5">
            <i class="fa-solid fa-key text-[10px] text-emerald-600"></i>
            <span>Candidate Keys: [{{ formatCandidateKeys(ctn.candidateKeys) }}]</span>
          </div>

          <!-- Dependencies tags -->
          <div
            *ngFor="let fd of ctn.functionalDependencies"
            class="px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-2 transition-colors"
            [ngClass]="fd.isKey ? 'bg-gray-50 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300' : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300'"
          >
            <span>{{ fd.lhs.join(', ') }} → {{ fd.rhs.join(', ') }}</span>
            <span class="text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold" [ngClass]="fd.source === 'user' ? 'bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300'">
              {{ fd.source }}
            </span>
          </div>
        </div>
      </div>

      <!-- Step-by-Step 1NF, 2NF, 3NF, BCNF Normal Form Cards -->
      <div *ngIf="currentTableNorm() as ctn" class="space-y-4">
        <!-- 1NF Card -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-surface-border dark:border-slate-800 shadow-soft space-y-3 transition-colors">
          <div class="flex items-center justify-between pb-3 border-b border-surface-border dark:border-slate-800">
            <div class="flex items-center gap-3">
              <span class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm" [ngClass]="ctn.oneNF.status === 'PASS' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'">
                1NF
              </span>
              <div>
                <h3 class="font-bold text-sm text-content-main dark:text-slate-100">First Normal Form (1NF): Atomic Values</h3>
                <p class="text-xs text-content-muted dark:text-slate-400">Checks for atomic columns, repeating numbered column patterns, and primary key presence.</p>
              </div>
            </div>

            <span class="px-3 py-1 rounded-full text-xs font-bold" [ngClass]="ctn.oneNF.status === 'PASS' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'">
              {{ ctn.oneNF.status }}
            </span>
          </div>

          <p class="text-xs text-content-muted dark:text-slate-400 leading-relaxed">
            <span class="font-semibold text-content-main dark:text-slate-200">Audit Verdict:</span> {{ ctn.oneNF.reason }}
          </p>

          <!-- Issues & Decomposition -->
          <div *ngIf="ctn.oneNF.issues.length > 0" class="space-y-3 pt-2">
            <div *ngFor="let issue of ctn.oneNF.issues" class="p-4 rounded-xl bg-red-50/40 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-2">
              <div class="font-bold text-xs text-red-800 dark:text-red-300">{{ issue.title }}</div>
              <div class="text-xs text-gray-700 dark:text-slate-300">{{ issue.explanation }}</div>
              <div class="text-[11px] text-content-muted dark:text-slate-400"><strong>Why it matters:</strong> {{ issue.whyItMatters }}</div>

              <div *ngIf="issue.suggestedDecomposition.correctedSql" class="mt-2 p-3 bg-gray-900 dark:bg-slate-950 rounded-xl text-emerald-400 font-mono text-[11px] overflow-x-auto">
                <pre><code>{{ issue.suggestedDecomposition.correctedSql }}</code></pre>
              </div>
            </div>
          </div>
        </div>

        <!-- 2NF Card -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-surface-border dark:border-slate-800 shadow-soft space-y-3 transition-colors">
          <div class="flex items-center justify-between pb-3 border-b border-surface-border dark:border-slate-800">
            <div class="flex items-center gap-3">
              <span class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm" [ngClass]="ctn.twoNF.status === 'PASS' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : ctn.twoNF.status === 'NEEDS_CONFIRMATION' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'">
                2NF
              </span>
              <div>
                <h3 class="font-bold text-sm text-content-main dark:text-slate-100">Second Normal Form (2NF): Full Functional Dependency</h3>
                <p class="text-xs text-content-muted dark:text-slate-400">Verifies that non-prime attributes depend on the entire candidate key, eliminating partial dependencies.</p>
              </div>
            </div>

            <span class="px-3 py-1 rounded-full text-xs font-bold" [ngClass]="ctn.twoNF.status === 'PASS' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : ctn.twoNF.status === 'NEEDS_CONFIRMATION' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'">
              {{ ctn.twoNF.status }}
            </span>
          </div>

          <p class="text-xs text-content-muted dark:text-slate-400 leading-relaxed">
            <span class="font-semibold text-content-main dark:text-slate-200">Audit Verdict:</span> {{ ctn.twoNF.reason }}
          </p>

          <div *ngIf="ctn.twoNF.issues.length > 0" class="space-y-3 pt-2">
            <div *ngFor="let issue of ctn.twoNF.issues" class="p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2">
              <div class="font-bold text-xs text-blue-800 dark:text-blue-300">{{ issue.title }}</div>
              <div class="text-xs text-gray-700 dark:text-slate-300">{{ issue.explanation }}</div>
              <div class="text-[11px] text-content-muted dark:text-slate-400"><strong>Why it matters:</strong> {{ issue.whyItMatters }}</div>

              <div *ngIf="issue.suggestedDecomposition.correctedSql" class="mt-2 p-3 bg-gray-900 dark:bg-slate-950 rounded-xl text-emerald-400 font-mono text-[11px] overflow-x-auto">
                <pre><code>{{ issue.suggestedDecomposition.correctedSql }}</code></pre>
              </div>
            </div>
          </div>
        </div>

        <!-- 3NF Card -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-surface-border dark:border-slate-800 shadow-soft space-y-3 transition-colors">
          <div class="flex items-center justify-between pb-3 border-b border-surface-border dark:border-slate-800">
            <div class="flex items-center gap-3">
              <span class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm" [ngClass]="ctn.threeNF.status === 'PASS' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'">
                3NF
              </span>
              <div>
                <h3 class="font-bold text-sm text-content-main dark:text-slate-100">Third Normal Form (3NF): Elimination of Transitive Dependencies</h3>
                <p class="text-xs text-content-muted dark:text-slate-400">Guarantees that non-key attributes depend only directly on the candidate key.</p>
              </div>
            </div>

            <span class="px-3 py-1 rounded-full text-xs font-bold" [ngClass]="ctn.threeNF.status === 'PASS' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'">
              {{ ctn.threeNF.status }}
            </span>
          </div>

          <p class="text-xs text-content-muted dark:text-slate-400 leading-relaxed">
            <span class="font-semibold text-content-main dark:text-slate-200">Audit Verdict:</span> {{ ctn.threeNF.reason }}
          </p>

          <div *ngIf="ctn.threeNF.issues.length > 0" class="space-y-3 pt-2">
            <div *ngFor="let issue of ctn.threeNF.issues" class="p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2">
              <div class="font-bold text-xs text-blue-800 dark:text-blue-300">{{ issue.title }}</div>
              <div class="text-xs text-gray-700 dark:text-slate-300">{{ issue.explanation }}</div>
              <div class="text-[11px] text-content-muted dark:text-slate-400"><strong>Why it matters:</strong> {{ issue.whyItMatters }}</div>

              <div *ngIf="issue.suggestedDecomposition.correctedSql" class="mt-2 p-3 bg-gray-900 dark:bg-slate-950 rounded-xl text-emerald-400 font-mono text-[11px] overflow-x-auto">
                <pre><code>{{ issue.suggestedDecomposition.correctedSql }}</code></pre>
              </div>
            </div>
          </div>
        </div>

        <!-- BCNF Card -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-surface-border dark:border-slate-800 shadow-soft space-y-3 transition-colors">
          <div class="flex items-center justify-between pb-3 border-b border-surface-border dark:border-slate-800">
            <div class="flex items-center gap-3">
              <span class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm" [ngClass]="ctn.bcnf.status === 'PASS' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'">
                BCNF
              </span>
              <div>
                <h3 class="font-bold text-sm text-content-main dark:text-slate-100">Boyce-Codd Normal Form (BCNF)</h3>
                <p class="text-xs text-content-muted dark:text-slate-400">Strict requirement: for every non-trivial dependency X → Y, X must be a superkey.</p>
              </div>
            </div>

            <span class="px-3 py-1 rounded-full text-xs font-bold" [ngClass]="ctn.bcnf.status === 'PASS' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'">
              {{ ctn.bcnf.status }}
            </span>
          </div>

          <p class="text-xs text-content-muted dark:text-slate-400 leading-relaxed">
            <span class="font-semibold text-content-main dark:text-slate-200">Audit Verdict:</span> {{ ctn.bcnf.reason }}
          </p>
        </div>
      </div>
      </div>

      <!-- Add FD Modal Dialog (Responsive) -->
      <div *ngIf="showFdModal()" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-surface-border dark:border-slate-800 space-y-4">
          <div class="flex items-center justify-between border-b border-surface-border dark:border-slate-800 pb-3">
            <h3 class="font-bold text-sm text-content-main dark:text-slate-100 flex items-center gap-2">
              <i class="fa-solid fa-plus text-primary-500 text-xs"></i>
              <span>Add Functional Dependency (FD)</span>
            </h3>
            <button (click)="showFdModal.set(false)" class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>

          <p class="text-xs text-content-muted dark:text-slate-400">
            Specify attributes where Determinant (LHS) uniquely dictates Dependent (RHS).
          </p>

          <div class="space-y-3 text-xs">
            <div>
              <label class="font-semibold text-content-main dark:text-slate-200 block mb-1">Determinant (LHS - X):</label>
              <input
                [(ngModel)]="newFdLhs"
                placeholder="e.g. course_id"
                class="w-full px-3 py-2 border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 text-content-main dark:text-slate-100 rounded-xl"
              />
            </div>

            <div>
              <label class="font-semibold text-content-main dark:text-slate-200 block mb-1">Dependent (RHS - Y):</label>
              <input
                [(ngModel)]="newFdRhs"
                placeholder="e.g. course_name, instructor_name"
                class="w-full px-3 py-2 border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 text-content-main dark:text-slate-100 rounded-xl"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-surface-border dark:border-slate-800">
            <button
              (click)="showFdModal.set(false)"
              class="px-3.5 py-1.5 rounded-xl border border-surface-border dark:border-slate-700 text-xs text-content-muted dark:text-slate-400 hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              (click)="submitFd()"
              class="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs shadow-soft transition-all"
            >
              Save & Re-Analyze
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class NormalizationComponent {
  public state = inject(ProjectStateService);
  private api = inject(ApiService);

  public selectedTableName: string = '';
  public showFdModal = signal<boolean>(false);
  public newFdLhs: string = '';
  public newFdRhs: string = '';

  constructor() {
    const analysis = this.state.activeAnalysis();
    if (analysis && analysis.tables.length > 0) {
      this.selectedTableName = analysis.tables[0].name;
    }
  }

  public currentTableNorm(): TableNormalizationAnalysis | undefined {
    const analysis = this.state.activeAnalysis();
    if (!analysis || analysis.normalization.length === 0) return undefined;

    let found = analysis.normalization.find(
      n => n.tableName.toLowerCase() === this.selectedTableName.toLowerCase()
    );

    if (!found) {
      found = analysis.normalization[0];
      this.selectedTableName = found.tableName;
      this.state.selectedTableName.set(found.tableName);
    }
    return found;
  }

  public onTableChange() {
    this.state.selectedTableName.set(this.selectedTableName);
  }

  public formatCandidateKeys(keys: string[][]): string {
    return keys.map(k => `(${k.join(', ')})`).join(', ');
  }

  public submitFd() {
    if (!this.newFdLhs.trim() || !this.newFdRhs.trim()) return;

    const lhs = this.newFdLhs.split(',').map(s => s.trim()).filter(Boolean);
    const rhs = this.newFdRhs.split(',').map(s => s.trim()).filter(Boolean);

    // Call API and re-execute
    const analysis = this.state.activeAnalysis();
    if (!analysis) return;

    this.api.executeAnalysis({
      tables: analysis.tables,
      userFds: [
        {
          tableName: this.selectedTableName,
          determinants: lhs,
          dependents: rhs
        }
      ]
    }).subscribe({
      next: (updated) => {
        this.state.activeAnalysis.set(updated);
        this.showFdModal.set(false);
        this.newFdLhs = '';
        this.newFdRhs = '';
      }
    });
  }
}
