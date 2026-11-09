import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ProjectStateService } from '../../core/services/project-state.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-7xl mx-auto space-y-6 md:space-y-8 fade-in">
      <!-- Welcome Hero Banner -->
      <div class="bg-gradient-to-r from-white via-blue-50/50 to-white dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900 rounded-3xl p-6 md:p-8 border border-surface-border dark:border-slate-800 shadow-soft relative overflow-hidden transition-colors">
        <div class="max-w-2xl relative z-10">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-800 dark:text-primary-300 text-xs font-semibold mb-4">
            <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
            <span>Intelligent RDBMS Analysis & Learning Engine</span>
          </div>
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-extrabold text-content-main dark:text-slate-100 tracking-tight leading-tight">
            Understand Your Database.<br/>
            <span class="text-primary-600 dark:text-primary-400">Improve Your Design.</span>
          </h1>
          <p class="text-content-muted dark:text-slate-400 mt-3 text-sm md:text-base leading-relaxed">
            Analyze, validate and improve your database structure with intelligent RDBMS assistance. Designed for college students, software engineers, and database learners.
          </p>
          <div class="mt-6 flex flex-wrap gap-3">
            <button
              (click)="onStartNewAnalysis()"
              class="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs sm:text-sm shadow-soft transition-all transform active:scale-95 flex items-center gap-2"
            >
              <i class="fa-solid fa-circle-plus text-sm"></i>
              <span>Start New Analysis</span>
              <i *ngIf="!auth.isAuthenticated()" class="fa-solid fa-lock text-xs opacity-75 ml-1"></i>
            </button>

            <button
              (click)="onExploreLearning()"
              class="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-surface-hover dark:hover:bg-slate-700 text-content-main dark:text-slate-200 border border-surface-border dark:border-slate-700 font-medium text-xs sm:text-sm transition-all flex items-center gap-2"
            >
              <i class="fa-solid fa-graduation-cap text-sm text-primary-500"></i>
              <span>Explore Learning Center</span>
              <i *ngIf="!auth.isAuthenticated()" class="fa-solid fa-lock text-xs text-slate-400 ml-1"></i>
            </button>
          </div>
        </div>

        <!-- Decorative background icon -->
        <div class="absolute -right-6 -bottom-6 w-56 h-56 md:w-80 md:h-80 opacity-5 pointer-events-none flex items-center justify-center text-primary-600 dark:text-primary-400">
          <i class="fa-solid fa-database text-9xl"></i>
        </div>
      </div>

      <!-- Unauthenticated Guest Gate Banner -->
      <div
        *ngIf="!auth.isAuthenticated()"
        class="p-6 rounded-3xl bg-blue-50/70 dark:bg-blue-950/30 border-2 border-dashed border-blue-300 dark:border-blue-800/80 flex flex-wrap items-center justify-between gap-4 transition-all"
      >
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-md flex-shrink-0">
            <i class="fa-solid fa-lock"></i>
          </div>
          <div>
            <div class="font-bold text-sm text-content-main dark:text-slate-100 flex items-center gap-2">
              <span>Sign In Required to Access Platform Features</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 uppercase font-semibold">Protected</span>
            </div>
            <p class="text-xs text-content-muted dark:text-slate-400 mt-0.5">
              Please sign in or create an account to analyze relational schemas, inspect normal forms, run SQL AST validation, and access learning modules.
            </p>
          </div>
        </div>

        <button
          (click)="auth.openAuthModal('Sign in or register to unlock all database features.')"
          class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all transform active:scale-95"
        >
          <i class="fa-solid fa-right-to-bracket text-xs"></i>
          <span>Sign In / Create Account</span>
        </button>
      </div>

      <!-- 3 Unified Input Cards -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base sm:text-lg font-bold text-content-main dark:text-slate-100 flex items-center gap-2">
            <span>Import Your Database Design</span>
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal">Input options</span>
          </h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Card 1: SQL Code -->
          <div
            (click)="navigateToInput('sql')"
            class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-surface-border dark:border-slate-800 hover-card cursor-pointer group transition-all"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-code text-xl"></i>
              </div>
              <span *ngIf="!auth.isAuthenticated()" class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1 bg-surface-subtle dark:bg-slate-800 px-2 py-1 rounded-lg">
                <i class="fa-solid fa-lock text-[9px]"></i>
                <span>Sign in</span>
              </span>
            </div>
            <h3 class="font-bold text-sm text-content-main dark:text-slate-100 group-hover:text-primary transition-colors">1. Upload SQL Code</h3>
            <p class="text-xs text-content-muted dark:text-slate-400 mt-1.5 leading-relaxed">
              Upload .sql DDL scripts or paste CREATE TABLE statements with full dialect support.
            </p>
          </div>

          <!-- Card 2: ER Diagram Image -->
          <div
            (click)="navigateToInput('diagram')"
            class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-surface-border dark:border-slate-800 hover-card cursor-pointer group transition-all"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-image text-xl"></i>
              </div>
              <span *ngIf="!auth.isAuthenticated()" class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1 bg-surface-subtle dark:bg-slate-800 px-2 py-1 rounded-lg">
                <i class="fa-solid fa-lock text-[9px]"></i>
                <span>Sign in</span>
              </span>
            </div>
            <h3 class="font-bold text-sm text-content-main dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">2. Upload ER Diagram</h3>
            <p class="text-xs text-content-muted dark:text-slate-400 mt-1.5 leading-relaxed">
              Upload ER diagram images from Figma, draw.io, or Canva via Gemini AI Vision.
            </p>
          </div>

          <!-- Card 3: Manual Table Builder -->
          <div
            (click)="navigateToInput('builder')"
            class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-surface-border dark:border-slate-800 hover-card cursor-pointer group transition-all sm:col-span-2 lg:col-span-1"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-table text-xl"></i>
              </div>
              <span *ngIf="!auth.isAuthenticated()" class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1 bg-surface-subtle dark:bg-slate-800 px-2 py-1 rounded-lg">
                <i class="fa-solid fa-lock text-[9px]"></i>
                <span>Sign in</span>
              </span>
            </div>
            <h3 class="font-bold text-sm text-content-main dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">3. Create Tables Manually</h3>
            <p class="text-xs text-content-muted dark:text-slate-400 mt-1.5 leading-relaxed">
              Build relational tables, define columns, assign keys, and configure cardinality interactively.
            </p>
          </div>
        </div>
      </div>

      <!-- 4 Overview Metric Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-surface-border dark:border-slate-800 shadow-soft flex items-center justify-between transition-colors">
          <div>
            <div class="text-[11px] sm:text-xs font-medium text-content-muted dark:text-slate-400 uppercase tracking-wider">Total Projects</div>
            <div class="text-xl sm:text-2xl font-bold text-content-main dark:text-slate-100 mt-1">{{ stats().totalProjects }}</div>
            <div class="text-[10px] sm:text-[11px] text-content-muted dark:text-slate-400 mt-0.5">Active database designs</div>
          </div>
          <div class="w-10 h-10 rounded-xl bg-blue-100/60 dark:bg-blue-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
            <i class="fa-solid fa-folder-open text-base"></i>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-surface-border dark:border-slate-800 shadow-soft flex items-center justify-between transition-colors">
          <div>
            <div class="text-[11px] sm:text-xs font-medium text-content-muted dark:text-slate-400 uppercase tracking-wider">Tables Analyzed</div>
            <div class="text-xl sm:text-2xl font-bold text-content-main dark:text-slate-100 mt-1">{{ stats().totalTablesAnalyzed }}</div>
            <div class="text-[10px] sm:text-[11px] text-content-muted dark:text-slate-400 mt-0.5">Relational schemas</div>
          </div>
          <div class="w-10 h-10 rounded-xl bg-blue-100/60 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <i class="fa-solid fa-table-columns text-base"></i>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-surface-border dark:border-slate-800 shadow-soft flex items-center justify-between transition-colors">
          <div>
            <div class="text-[11px] sm:text-xs font-medium text-content-muted dark:text-slate-400 uppercase tracking-wider">Issues Identified</div>
            <div class="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{{ stats().totalIssuesFound }}</div>
            <div class="text-[10px] sm:text-[11px] text-content-muted dark:text-slate-400 mt-0.5">Norm & integrity findings</div>
          </div>
          <div class="w-10 h-10 rounded-xl bg-amber-100/60 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <i class="fa-solid fa-triangle-exclamation text-base"></i>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-surface-border dark:border-slate-800 shadow-soft flex items-center justify-between transition-colors">
          <div>
            <div class="text-[11px] sm:text-xs font-medium text-content-muted dark:text-slate-400 uppercase tracking-wider">Reports Generated</div>
            <div class="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{{ stats().reportsGenerated }}</div>
            <div class="text-[10px] sm:text-[11px] text-content-muted dark:text-slate-400 mt-0.5">Audit summaries exported</div>
          </div>
          <div class="w-10 h-10 rounded-xl bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <i class="fa-solid fa-file-invoice text-base"></i>
          </div>
        </div>
      </div>

      <!-- Authenticated Quality & Curriculum Layout -->
      <div *ngIf="auth.isAuthenticated(); else guestFeatureShowcase" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Current Quality Overview (2 Cols) -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-surface-border dark:border-slate-800 shadow-soft space-y-4 transition-colors">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="font-bold text-base text-content-main dark:text-slate-100">Active Project Quality Audit</h2>
              <p class="text-xs text-content-muted dark:text-slate-400">{{ state.activeProject()?.title || 'University Academic & Enrollment System' }}</p>
            </div>
            <button
              routerLink="/normalization"
              class="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-1.5"
            >
              <span>Inspect Normalization</span>
              <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
          </div>

          <div *ngIf="state.activeAnalysis() as a" class="space-y-4">
            <div class="p-4 rounded-2xl bg-surface-subtle dark:bg-slate-800/60 border border-surface-border dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <div class="text-xs text-content-muted dark:text-slate-400">Overall Normal Form Compliance</div>
                <div class="text-lg sm:text-xl font-bold text-content-main dark:text-slate-100 mt-0.5">
                  {{ a.overallSchemaRank }} (Score: {{ a.recommendations.overallDesignScore }}/100)
                </div>
              </div>
              <div class="text-right">
                <span class="px-2.5 py-1 rounded-xl text-xs font-bold" [ngClass]="{
                  'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300': a.recommendations.grade.startsWith('A'),
                  'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300': a.recommendations.grade === 'B' || a.recommendations.grade === 'C',
                  'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300': a.recommendations.grade === 'D' || a.recommendations.grade === 'F'
                }">Grade {{ a.recommendations.grade }}</span>
              </div>
            </div>

            <!-- Issues Summary list -->
            <div class="space-y-2">
              <div class="text-xs font-semibold text-content-muted dark:text-slate-400 uppercase tracking-wider">Key Audit Recommendations</div>
              <div
                *ngFor="let rec of a.recommendations.recommendations.slice(0, 3)"
                class="p-3.5 rounded-xl border border-surface-border dark:border-slate-800 flex items-start justify-between gap-3 bg-white dark:bg-slate-900/60 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
              >
                <div class="flex items-start gap-2.5 min-w-0">
                  <span
                    class="px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 uppercase flex-shrink-0"
                    [ngClass]="{
                      'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300': rec.severity === 'CRITICAL',
                      'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300': rec.severity === 'HIGH',
                      'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300': rec.severity === 'MEDIUM',
                      'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300': rec.severity === 'LOW' || rec.severity === 'INFO'
                    }"
                  >
                    {{ rec.severity }}
                  </span>
                  <div class="min-w-0">
                    <div class="text-xs font-semibold text-content-main dark:text-slate-200 truncate">{{ rec.title }}</div>
                    <div class="text-[11px] text-content-muted dark:text-slate-400 mt-0.5 line-clamp-1">{{ rec.suggestedSolution }}</div>
                  </div>
                </div>
                <button
                  routerLink="/normalization"
                  class="text-[11px] font-semibold text-primary hover:underline flex-shrink-0 ml-2"
                >
                  Inspect
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Learning Recommendations (1 Col) -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-surface-border dark:border-slate-800 shadow-soft flex flex-col justify-between transition-colors">
          <div>
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-bold text-base text-content-main dark:text-slate-100">Curriculum Center</h2>
              <span class="text-xs bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full font-semibold">Study</span>
            </div>
            <p class="text-xs text-content-muted dark:text-slate-400 leading-relaxed">
              Based on the detected normalization findings in your current database, strengthen your understanding:
            </p>

            <div class="mt-4 space-y-2.5">
              <div class="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors" routerLink="/normalization">
                <div class="text-xs font-bold text-content-main dark:text-slate-200 flex items-center gap-2">
                  <i class="fa-solid fa-diagram-project text-primary-600 dark:text-primary-400 text-xs"></i>
                  <span>Eliminating Partial Key Dependencies (2NF)</span>
                </div>
                <div class="text-[11px] text-content-muted dark:text-slate-400 mt-1">
                  Learn why composite keys cause update anomalies.
                </div>
              </div>

              <div class="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors" routerLink="/learning">
                <div class="text-xs font-bold text-content-main dark:text-slate-200 flex items-center gap-2">
                  <i class="fa-solid fa-book-open text-blue-600 dark:text-blue-400 text-xs"></i>
                  <span>Interactive SQL & Normalization Lessons</span>
                </div>
                <div class="text-[11px] text-content-muted dark:text-slate-400 mt-1">
                  Step-by-step guides and quizzes in Learning Center.
                </div>
              </div>
            </div>
          </div>

          <div class="pt-4 border-t border-surface-border dark:border-slate-800 mt-4">
            <button
              routerLink="/learning"
              class="w-full py-2.5 rounded-xl bg-surface-subtle dark:bg-slate-800 hover:bg-surface-hover dark:hover:bg-slate-700 text-content-main dark:text-slate-200 font-semibold text-xs border border-surface-border dark:border-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <i class="fa-solid fa-graduation-cap text-xs"></i>
              <span>Explore Learning Center</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Guest Feature Showcase (Shown when not signed in) -->
      <ng-template #guestFeatureShowcase>
        <div class="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 shadow-soft text-center space-y-5 transition-colors">
          <div class="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center text-2xl shadow-inner">
            <i class="fa-solid fa-shield-halved"></i>
          </div>
          <div class="max-w-xl mx-auto space-y-2">
            <h3 class="font-extrabold text-lg sm:text-xl text-content-main dark:text-slate-100">
              Unlock Intelligent Database Optimization
            </h3>
            <p class="text-xs sm:text-sm text-content-muted dark:text-slate-400 leading-relaxed">
              Sign in to run automated 1NF–BCNF normalization audits, visualize ER diagrams, detect transitive functional dependencies, and generate certified engineering audit reports.
            </p>
          </div>
          <div>
            <button
              (click)="auth.openAuthModal('Sign in or register to unlock all database analysis features.')"
              class="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 inline-flex items-center gap-2 transition-all transform active:scale-95"
            >
              <i class="fa-solid fa-right-to-bracket text-sm"></i>
              <span>Sign In to Unlock Platform Features</span>
            </button>
          </div>
        </div>
      </ng-template>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  public state = inject(ProjectStateService);
  public auth = inject(AuthService);
  private router = inject(Router);

  public stats = signal({
    totalProjects: 0,
    totalTablesAnalyzed: 0,
    totalIssuesFound: 0,
    reportsGenerated: 0
  });

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.loadDashboardStats();
    }
  }

  public loadDashboardStats() {
    this.api.getDashboardOverview().subscribe({
      next: (res: any) => {
        if (res.success && res.stats) {
          this.stats.set(res.stats);
        }
      },
      error: () => {}
    });
  }

  public onStartNewAnalysis() {
    if (!this.auth.isAuthenticated()) {
      this.auth.openAuthModal('Please sign in or create an account to start database analysis.');
      return;
    }
    this.router.navigate(['/new-analysis']);
  }

  public onExploreLearning() {
    if (!this.auth.isAuthenticated()) {
      this.auth.openAuthModal('Please sign in or create an account to access the Learning Center.');
      return;
    }
    this.router.navigate(['/learning']);
  }

  public navigateToInput(mode: string) {
    if (!this.auth.isAuthenticated()) {
      this.auth.openAuthModal('Please sign in or create an account to import database designs.');
      return;
    }
    this.router.navigate(['/new-analysis'], { queryParams: { tab: mode } });
  }
}
