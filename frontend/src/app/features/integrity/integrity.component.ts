import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectStateService } from '../../core/services/project-state.service';

@Component({
  selector: 'app-integrity',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-6xl mx-auto space-y-6 fade-in pb-12">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-surface-border pb-4">
        <div>
          <h1 class="text-2xl font-extrabold text-content-main tracking-tight">Integrity Constraint Checker</h1>
          <p class="text-xs text-content-muted mt-1">
            Automated schema-level audit of Entity, Referential, Domain, and User-Defined integrity constraints.
          </p>
        </div>

        <div *ngIf="state.activeAnalysis() as a" class="flex items-center gap-2">
          <span class="text-xs font-semibold text-content-muted">Overall Integrity Score:</span>
          <span class="text-base font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {{ a.integrity.score }}%
          </span>
        </div>
      </div>

      <!-- Schema-level vs Data-level Notice Banner -->
      <div *ngIf="state.activeAnalysis() as a" class="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
        <span class="text-base">ℹ️</span>
        <div>
          <div class="font-bold">Schema-Level Validation Verified</div>
          <div class="mt-0.5 text-blue-800 leading-relaxed">{{ a.integrity.notice }}</div>
        </div>
      </div>

      <!-- 4 Category Score Cards -->
      <div *ngIf="state.activeAnalysis() as a" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-surface-border shadow-soft">
          <div class="text-[11px] font-bold text-content-muted uppercase">1. Entity Integrity</div>
          <div class="text-2xl font-extrabold text-content-main mt-1">{{ a.integrity.entityIntegrityScore }}%</div>
          <div class="text-[11px] text-content-muted mt-1">PK uniqueness & NOT NULL</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-surface-border shadow-soft">
          <div class="text-[11px] font-bold text-content-muted uppercase">2. Referential Integrity</div>
          <div class="text-2xl font-extrabold text-content-main mt-1">{{ a.integrity.referentialIntegrityScore }}%</div>
          <div class="text-[11px] text-content-muted mt-1">Foreign keys & target matching</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-surface-border shadow-soft">
          <div class="text-[11px] font-bold text-content-muted uppercase">3. Domain Integrity</div>
          <div class="text-2xl font-extrabold text-content-main mt-1">{{ a.integrity.domainIntegrityScore }}%</div>
          <div class="text-[11px] text-content-muted mt-1">Data types & nullability</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-surface-border shadow-soft">
          <div class="text-[11px] font-bold text-content-muted uppercase">4. User-Defined Integrity</div>
          <div class="text-2xl font-extrabold text-content-main mt-1">{{ a.integrity.userDefinedScore }}%</div>
          <div class="text-[11px] text-content-muted mt-1">CHECK constraints & domain rules</div>
        </div>
      </div>

      <!-- Issues List -->
      <div *ngIf="state.activeAnalysis() as a" class="space-y-4">
        <h2 class="font-bold text-sm text-content-main">Detailed Findings & Constraint Audits</h2>

        <div *ngIf="a.integrity.issues.length === 0" class="p-8 text-center bg-white rounded-2xl border border-surface-border shadow-soft">
          <div class="text-3xl mb-2">🎉</div>
          <div class="font-bold text-sm text-content-main">All Integrity Rules Satisfied!</div>
          <div class="text-xs text-content-muted mt-1">No missing primary keys, orphaned foreign keys, or incompatible data types detected.</div>
        </div>

        <div *ngFor="let issue of a.integrity.issues" class="bg-white p-5 rounded-2xl border border-surface-border shadow-soft space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span
                class="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                [ngClass]="{
                  'bg-red-100 text-red-700': issue.severity === 'CRITICAL',
                  'bg-rose-100 text-rose-700': issue.severity === 'HIGH',
                  'bg-amber-100 text-amber-700': issue.severity === 'MEDIUM',
                  'bg-blue-100 text-blue-700': issue.severity === 'LOW' || issue.severity === 'INFO'
                }"
              >
                {{ issue.severity }}
              </span>
              <span class="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                {{ issue.category }}
              </span>
              <span class="font-bold text-sm text-content-main">{{ issue.title }}</span>
            </div>

            <span class="text-[11px] text-content-muted">Table: <strong class="text-content-main">{{ issue.tableName }}</strong></span>
          </div>

          <p class="text-xs text-content-muted leading-relaxed">{{ issue.description }}</p>

          <div class="p-3 bg-surface-subtle rounded-xl text-xs space-y-1">
            <div><strong class="text-content-main">Why it matters:</strong> <span class="text-content-muted">{{ issue.whyItMatters }}</span></div>
            <div><strong class="text-emerald-700">Recommended fix:</strong> <span class="text-emerald-800 font-mono">{{ issue.recommendation }}</span></div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class IntegrityComponent {
  public state = inject(ProjectStateService);
}
