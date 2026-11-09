import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProjectStateService } from '../../core/services/project-state.service';
import { ParsedTable } from '../../core/models/schema.models';

@Component({
  selector: 'app-explorer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-6xl mx-auto space-y-6 fade-in pb-12">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border dark:border-slate-800 pb-4">
        <div>
          <h1 class="text-2xl font-extrabold text-content-main dark:text-slate-100 tracking-tight">Database Schema Explorer</h1>
          <p class="text-xs text-content-muted dark:text-slate-400 mt-1">
            Detailed relational dictionary, attribute domains, candidate keys, and foreign key references.
          </p>
        </div>

        <div *ngIf="state.activeAnalysis() as a" class="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-content-muted dark:text-slate-300">
          <i class="fa-solid fa-database text-primary-500 mr-1.5"></i>
          <span>{{ a.tables.length }} Tables Total</span>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!state.activeAnalysis() || state.activeAnalysis()?.tables?.length === 0" class="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-surface-border dark:border-slate-800 shadow-soft space-y-5">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center text-2xl">
          <i class="fa-solid fa-table-list"></i>
        </div>
        <div class="max-w-md mx-auto">
          <h3 class="font-bold text-base text-content-main dark:text-slate-100">No Active Database Schema</h3>
          <p class="text-xs text-content-muted dark:text-slate-400 mt-1.5 leading-relaxed">
            Your account currently has no active database analysis. You can create a new project and test your own SQL/ER diagram, or load our academic sample schema to explore tables and keys.
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

      <!-- Tables Grid / List -->
      <div *ngIf="state.activeAnalysis() as a" class="space-y-6">
        <div *ngFor="let table of a.tables" class="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border dark:border-slate-800 shadow-soft overflow-hidden transition-colors">
          <!-- Table Header Banner -->
          <div class="p-5 bg-gradient-to-r from-surface-subtle via-white to-surface-subtle dark:from-slate-800/50 dark:via-slate-900 dark:to-slate-800/50 border-b border-surface-border dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-sm shadow-sm">
                <i class="fa-solid fa-table text-base"></i>
              </div>
              <div>
                <h2 class="font-bold text-base text-content-main dark:text-slate-100">{{ table.name }}</h2>
                <div class="text-[11px] text-content-muted dark:text-slate-400 mt-0.5 flex items-center gap-2">
                  <span>{{ table.columns.length }} columns</span>
                  <span>•</span>
                  <span>PK: <strong class="text-primary-700 dark:text-primary-300 font-mono">{{ table.primaryKey.join(', ') || 'NONE' }}</strong></span>
                </div>
              </div>
            </div>

            <!-- Candidate Keys and Relationships Badge -->
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-xl text-xs font-mono bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
                <i class="fa-solid fa-key text-[10px] text-blue-500"></i>
                <span>Candidate Keys: [{{ formatCandidateKeys(table.candidateKeys) }}]</span>
              </span>
            </div>
          </div>

          <!-- Column Dictionary Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-surface-subtle dark:bg-slate-800/60 text-content-muted dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-surface-border dark:border-slate-800">
                <tr>
                  <th class="py-3 px-4">Column Name</th>
                  <th class="py-3 px-4">Data Type</th>
                  <th class="py-3 px-4 text-center">Primary Key</th>
                  <th class="py-3 px-4 text-center">Foreign Key</th>
                  <th class="py-3 px-4 text-center">Nullable</th>
                  <th class="py-3 px-4 text-center">Unique</th>
                  <th class="py-3 px-4">Default Value</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-border dark:divide-slate-800">
                <tr *ngFor="let col of table.columns" class="hover:bg-surface-hover/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td class="py-3 px-4 font-mono font-medium text-content-main dark:text-slate-200 flex items-center gap-2">
                    <i *ngIf="col.isPrimaryKey" class="fa-solid fa-key text-amber-500 text-xs" title="Primary Key"></i>
                    <i *ngIf="col.isForeignKey" class="fa-solid fa-link text-blue-500 text-xs" title="Foreign Key"></i>
                    <span>{{ col.name }}</span>
                  </td>
                  <td class="py-3 px-4 text-content-muted dark:text-slate-400 font-mono">{{ col.dataType }}</td>
                  <td class="py-3 px-4 text-center">
                    <span *ngIf="col.isPrimaryKey" class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-primary-700 dark:text-primary-300">YES</span>
                    <span *ngIf="!col.isPrimaryKey" class="text-slate-300 dark:text-slate-600">—</span>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <span *ngIf="col.isForeignKey" class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">YES</span>
                    <span *ngIf="!col.isForeignKey" class="text-slate-300 dark:text-slate-600">—</span>
                  </td>
                  <td class="py-3 px-4 text-center text-content-muted dark:text-slate-400">
                    {{ col.isNullable ? 'Yes' : 'No' }}
                  </td>
                  <td class="py-3 px-4 text-center">
                    <span *ngIf="col.isUnique" class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">YES</span>
                    <span *ngIf="!col.isUnique" class="text-slate-300 dark:text-slate-600">—</span>
                  </td>
                  <td class="py-3 px-4 text-content-muted dark:text-slate-400 font-mono">
                    {{ col.defaultValue || 'NULL' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Outbound Foreign Keys Footer -->
          <div *ngIf="table.foreignKeys && table.foreignKeys.length > 0" class="p-4 bg-surface-subtle dark:bg-slate-800/40 border-t border-surface-border dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
            <span class="font-bold text-content-main dark:text-slate-200 flex items-center gap-1.5">
              <i class="fa-solid fa-arrow-right-arrow-left text-primary-500"></i>
              <span>Referenced Tables:</span>
            </span>
            <div class="flex flex-wrap gap-2">
              <span *ngFor="let fk of table.foreignKeys" class="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-surface-border dark:border-slate-700 text-blue-600 dark:text-blue-400 font-mono">
                {{ fk.column }} ──> {{ fk.targetTable }}.{{ fk.targetColumn }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ExplorerComponent {
  public state = inject(ProjectStateService);

  public formatCandidateKeys(keys: string[][]): string {
    if (!keys || keys.length === 0) return 'None';
    return keys.map(k => `(${k.join(', ')})`).join(', ');
  }
}
