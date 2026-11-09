import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ProjectStateService } from '../../core/services/project-state.service';
import { Project } from '../../core/models/schema.models';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-6xl mx-auto space-y-6 fade-in pb-12">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border dark:border-slate-800 pb-4">
        <div>
          <h1 class="text-2xl font-extrabold text-content-main dark:text-slate-100 tracking-tight">My Database Projects</h1>
          <p class="text-xs text-content-muted dark:text-slate-400 mt-1">
            Manage your analyzed database architectures, version history, and audit sessions.
          </p>
        </div>

        <button
          (click)="showCreateModal.set(true)"
          class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all transform active:scale-95"
        >
          <i class="fa-solid fa-plus text-xs"></i>
          <span>Create New Project</span>
        </button>
      </div>

      <!-- Empty State -->
      <div *ngIf="projects.length === 0" class="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-surface-border dark:border-slate-800 shadow-soft space-y-4">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl">
          <i class="fa-solid fa-folder-open"></i>
        </div>
        <div>
          <h3 class="font-bold text-base text-content-main dark:text-slate-100">No Projects Found</h3>
          <p class="text-xs text-content-muted dark:text-slate-400 mt-1">Create a new database project or run an analysis to save your schemas.</p>
        </div>
        <button
          (click)="showCreateModal.set(true)"
          class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 inline-flex items-center gap-2"
        >
          <i class="fa-solid fa-plus text-xs"></i>
          <span>Create First Project</span>
        </button>
      </div>

      <!-- Project Cards Grid -->
      <div *ngIf="projects.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          *ngFor="let proj of projects"
          class="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border dark:border-slate-800 shadow-soft p-5 space-y-4 hover-card flex flex-col justify-between transition-colors"
        >
          <div class="space-y-2">
            <div class="flex items-start justify-between">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-950/60 text-primary-700 dark:text-primary-300">
                {{ proj.dialect }}
              </span>

              <span
                class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                [ngClass]="proj.status === 'ANALYZED' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
              >
                {{ proj.status }}
              </span>
            </div>

            <h3 class="font-bold text-sm text-content-main dark:text-slate-100 line-clamp-1">{{ proj.title }}</h3>
            <p class="text-xs text-content-muted dark:text-slate-400 line-clamp-2 leading-relaxed">
              {{ proj.description || 'No description provided.' }}
            </p>
          </div>

          <div class="pt-3 border-t border-surface-border dark:border-slate-800 flex items-center justify-between text-xs">
            <div class="text-content-muted dark:text-slate-400 flex items-center gap-2">
              <i class="fa-solid fa-table-cells text-slate-400"></i>
              <span>{{ proj.tableCount || 0 }} tables</span>
              <span *ngIf="proj.latestScore" class="font-bold text-primary-600 dark:text-primary-400">· {{ proj.latestScore }}%</span>
            </div>

            <div class="flex items-center space-x-2">
              <button
                (click)="loadProject(proj)"
                class="px-3 py-1.5 rounded-xl bg-surface-subtle dark:bg-slate-800 hover:bg-surface-hover dark:hover:bg-slate-700 text-content-main dark:text-slate-200 font-semibold text-xs border border-surface-border dark:border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <span>Open</span>
                <i class="fa-solid fa-arrow-right text-[10px]"></i>
              </button>
              <button
                (click)="deleteProject(proj.id)"
                class="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Delete Project"
              >
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Create Project (Root-level overlay, covers entire screen) -->
    <div
      *ngIf="showCreateModal()"
      class="fixed inset-0 bg-black/75 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-surface-border dark:border-slate-800 space-y-4">
        <div class="flex items-center justify-between border-b border-surface-border dark:border-slate-800 pb-3">
          <h3 class="font-bold text-sm text-content-main dark:text-slate-100 flex items-center gap-2">
            <i class="fa-solid fa-folder-plus text-blue-500 text-base"></i>
            <span>Create New Project</span>
          </h3>
          <button (click)="showCreateModal.set(false)" class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors">
            <i class="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <div class="space-y-3.5 text-xs">
          <div>
            <label class="font-semibold text-content-main dark:text-slate-200 block mb-1">Project Title:</label>
            <input
              [(ngModel)]="newTitle"
              placeholder="e.g. Healthcare Clinical DB"
              class="w-full px-3.5 py-2.5 border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 text-content-main dark:text-slate-100 rounded-xl"
            />
          </div>

          <div>
            <label class="font-semibold text-content-main dark:text-slate-200 block mb-1">Description:</label>
            <textarea
              [(ngModel)]="newDesc"
              rows="3"
              placeholder="Brief project summary..."
              class="w-full px-3.5 py-2.5 border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 text-content-main dark:text-slate-100 rounded-xl"
            ></textarea>
          </div>

          <div>
            <label class="font-semibold text-content-main dark:text-slate-200 block mb-1">Database Dialect:</label>
            <select
              [(ngModel)]="newDialect"
              class="w-full px-3.5 py-2.5 border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 text-content-main dark:text-slate-100 rounded-xl"
            >
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="sqlite">SQLite</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end gap-2.5 pt-3 border-t border-surface-border dark:border-slate-800">
          <button
            (click)="showCreateModal.set(false)"
            class="px-4 py-2 rounded-xl border border-surface-border dark:border-slate-700 text-xs font-semibold text-content-muted dark:text-slate-400 hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            (click)="createProject()"
            class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/25 transition-all"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  `
})
export class ProjectsComponent implements OnInit {
  private api = inject(ApiService);
  private state = inject(ProjectStateService);
  private router = inject(Router);

  public projects: Project[] = [];
  public showCreateModal = signal<boolean>(false);

  public newTitle: string = '';
  public newDesc: string = '';
  public newDialect: string = 'postgresql';

  ngOnInit(): void {
    this.loadProjects();
  }

  public loadProjects() {
    this.api.listProjects().subscribe({
      next: (res) => {
        if (res.success && res.projects) {
          this.projects = res.projects;
        }
      }
    });
  }

  public createProject() {
    if (!this.newTitle.trim()) return;

    this.api.createProject({
      title: this.newTitle,
      description: this.newDesc,
      dialect: this.newDialect
    }).subscribe({
      next: () => {
        this.showCreateModal.set(false);
        this.newTitle = '';
        this.newDesc = '';
        this.loadProjects();
      }
    });
  }

  public deleteProject(id: string) {
    if (confirm('Are you sure you want to delete this project?')) {
      this.api.deleteProject(id).subscribe({
        next: () => {
          this.loadProjects();
        }
      });
    }
  }

  public loadProject(proj: Project) {
    this.api.getProject(proj.id).subscribe({
      next: (res: any) => {
        if (res.success && res.project) {
          const p = res.project;
          const schema = p.databaseSchemas?.[0];
          if (schema && schema.tables && schema.tables.length > 0) {
            this.api.executeAnalysis({
              projectId: p.id,
              projectTitle: p.title,
              tables: schema.tables,
              dialect: p.dialect || 'postgresql'
            }).subscribe({
              next: (analysis) => {
                this.state.setAnalysis(analysis, p);
                this.router.navigate(['/normalization']);
              },
              error: () => {
                this.state.activeProject.set(p);
                this.router.navigate(['/normalization']);
              }
            });
          } else {
            this.state.activeProject.set(p);
            this.router.navigate(['/new-analysis']);
          }
        } else {
          this.state.activeProject.set(proj);
          this.router.navigate(['/normalization']);
        }
      },
      error: () => {
        this.state.activeProject.set(proj);
        this.router.navigate(['/normalization']);
      }
    });
  }
}
