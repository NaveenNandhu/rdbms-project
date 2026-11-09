import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ProjectStateService } from '../../core/services/project-state.service';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto space-y-6 fade-in pb-12">
      <!-- Header -->
      <div class="border-b border-surface-border dark:border-slate-800 pb-4">
        <h1 class="text-2xl font-extrabold text-content-main dark:text-slate-100 tracking-tight">Platform Settings & Preferences</h1>
        <p class="text-xs text-content-muted dark:text-slate-400 mt-1">
          Customize display theme, AI engine connectivity, and account profile.
        </p>
      </div>

      <!-- Theme & Appearance Preference Card -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl border border-surface-border dark:border-slate-800 shadow-soft p-6 space-y-4 transition-colors">
        <div class="flex items-center justify-between pb-3 border-b border-surface-border dark:border-slate-800">
          <div>
            <h2 class="text-sm font-bold text-content-main dark:text-slate-100 flex items-center gap-2">
              <i class="fa-solid fa-palette text-primary-500"></i>
              <span>Interface Theme</span>
            </h2>
            <p class="text-xs text-content-muted dark:text-slate-400">Choose between light, dark, or automatic system preference.</p>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 capitalize">
            {{ theme.themeMode() }} Mode
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            (click)="theme.setTheme('light')"
            class="p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all text-xs font-semibold"
            [ngClass]="theme.themeMode() === 'light' ? 'border-primary ring-2 ring-primary/20 bg-blue-50/40 text-primary-700' : 'border-surface-border dark:border-slate-800 bg-surface-subtle dark:bg-slate-800/50 text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-slate-200'"
          >
            <i class="fa-solid fa-sun text-2xl text-amber-500"></i>
            <span>Light Theme</span>
            <span class="text-[10px] text-slate-400 font-normal">Clean modern light theme</span>
          </button>

          <button
            (click)="theme.setTheme('dark')"
            class="p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all text-xs font-semibold"
            [ngClass]="theme.themeMode() === 'dark' ? 'border-primary ring-2 ring-primary/20 bg-slate-800 text-primary-400' : 'border-surface-border dark:border-slate-800 bg-surface-subtle dark:bg-slate-800/50 text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-slate-200'"
          >
            <i class="fa-solid fa-moon text-2xl text-indigo-400"></i>
            <span>Dark Theme</span>
            <span class="text-[10px] text-slate-400 font-normal">Comfortable slate dark</span>
          </button>

          <button
            (click)="theme.setTheme('system')"
            class="p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all text-xs font-semibold"
            [ngClass]="theme.themeMode() === 'system' ? 'border-primary ring-2 ring-primary/20 bg-blue-50/40 dark:bg-slate-800 text-primary-700 dark:text-primary-300' : 'border-surface-border dark:border-slate-800 bg-surface-subtle dark:bg-slate-800/50 text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-slate-200'"
          >
            <i class="fa-solid fa-desktop text-2xl text-slate-500"></i>
            <span>System Default</span>
            <span class="text-[10px] text-slate-400 font-normal">Syncs with OS mode</span>
          </button>
        </div>
      </div>

      <!-- AI Provider Configuration -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl border border-surface-border dark:border-slate-800 shadow-soft p-6 space-y-4 transition-colors">
        <div class="flex items-center justify-between pb-3 border-b border-surface-border dark:border-slate-800">
          <div>
            <h2 class="text-sm font-bold text-content-main dark:text-slate-100 flex items-center gap-2">
              <i class="fa-solid fa-wand-magic-sparkles text-primary-500"></i>
              <span>AI Engine Provider</span>
            </h2>
            <p class="text-xs text-content-muted dark:text-slate-400">Configure external LLM connectivity or use the built-in offline educational tutor.</p>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">Active</span>
        </div>

        <div class="space-y-4 text-xs">
          <div>
            <label class="font-semibold text-content-main dark:text-slate-200 block mb-1">Select AI Provider:</label>
            <select [(ngModel)]="selectedProvider" class="w-full sm:w-80 px-3 py-2 border border-surface-border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-content-main dark:text-slate-100 font-medium">
              <option value="builtin">Built-in Context-Aware Educational Engine (Offline Default)</option>
              <option value="gemini">Google Gemini 1.5 Flash (Vision & Tutor)</option>
              <option value="openai">OpenAI GPT-4o Mini (Vision & Tutor)</option>
            </select>
          </div>

          <!-- Optional Browser-Level Key Configuration -->
          <div *ngIf="selectedProvider === 'gemini'" class="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/30 space-y-2">
            <label class="font-semibold text-content-main dark:text-slate-200 block">Google Gemini API Key (Optional):</label>
            <div class="flex flex-wrap sm:flex-nowrap gap-2">
              <input
                type="password"
                [(ngModel)]="geminiApiKey"
                placeholder="AIzaSy..."
                class="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-surface-border dark:border-slate-700 text-content-main dark:text-slate-100 rounded-xl text-xs"
              />
              <button
                (click)="saveGeminiKey()"
                class="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-all flex items-center gap-1.5"
              >
                <i *ngIf="geminiSaved" class="fa-solid fa-check text-xs"></i>
                <span>{{ geminiSaved ? 'Saved' : 'Save Key' }}</span>
              </button>
            </div>
            <p class="text-[11px] text-content-muted dark:text-slate-400">
              Keys can also be configured securely on the server via <code>GEMINI_API_KEY</code> in <code>backend/.env</code>.
            </p>
          </div>

          <div *ngIf="selectedProvider === 'openai'" class="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/30 space-y-2">
            <label class="font-semibold text-content-main dark:text-slate-200 block">OpenAI API Key (Optional):</label>
            <div class="flex flex-wrap sm:flex-nowrap gap-2">
              <input
                type="password"
                [(ngModel)]="openAiApiKey"
                placeholder="sk-..."
                class="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-surface-border dark:border-slate-700 text-content-main dark:text-slate-100 rounded-xl text-xs"
              />
              <button
                (click)="saveOpenAiKey()"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center gap-1.5"
              >
                <i *ngIf="openAiSaved" class="fa-solid fa-check text-xs"></i>
                <span>{{ openAiSaved ? 'Saved' : 'Save Key' }}</span>
              </button>
            </div>
            <p class="text-[11px] text-content-muted dark:text-slate-400">
              Keys can also be configured securely on the server via <code>OPENAI_API_KEY</code> in <code>backend/.env</code>.
            </p>
          </div>

          <div *ngIf="selectedProvider === 'builtin'" class="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
            <strong>Active Mode:</strong> Built-in deterministic database analyzer & offline rule engine. Includes 1NF–BCNF normalization engine and SQL validation without requiring external internet API keys.
          </div>
        </div>
      </div>

      <!-- Backend API Connectivity Card -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl border border-surface-border dark:border-slate-800 shadow-soft p-6 space-y-4 transition-colors">
        <div class="flex items-center justify-between pb-3 border-b border-surface-border dark:border-slate-800">
          <div>
            <h2 class="text-sm font-bold text-content-main dark:text-slate-100 flex items-center gap-2">
              <i class="fa-solid fa-server text-primary-500"></i>
              <span>Backend API Server Endpoint</span>
            </h2>
            <p class="text-xs text-content-muted dark:text-slate-400">Specify your deployed backend URL (e.g. Render Web Service) or leave blank for local/auto-proxy.</p>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
            {{ apiEndpoint ? 'Custom' : 'Auto' }}
          </span>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="font-semibold text-content-main dark:text-slate-200 block mb-1">API Base URL:</label>
            <div class="flex flex-wrap sm:flex-nowrap gap-2">
              <input
                type="text"
                [(ngModel)]="apiEndpoint"
                placeholder="https://your-backend.onrender.com/api"
                class="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-surface-border dark:border-slate-700 text-content-main dark:text-slate-100 rounded-xl text-xs font-mono"
              />
              <button
                (click)="saveApiEndpoint()"
                class="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-all flex items-center gap-1.5"
              >
                <i *ngIf="apiSaved" class="fa-solid fa-check text-xs"></i>
                <span>{{ apiSaved ? 'Saved' : 'Save Endpoint' }}</span>
              </button>
            </div>
            <p class="text-[11px] text-content-muted dark:text-slate-400 mt-1">
              Active endpoint: <code class="font-bold text-blue-600 dark:text-blue-400">{{ api.baseUrl }}</code>
            </p>
          </div>
        </div>
      </div>

      <!-- Profile Information -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl border border-surface-border dark:border-slate-800 shadow-soft p-6 space-y-4 transition-colors">
        <div class="flex items-center justify-between pb-3 border-b border-surface-border dark:border-slate-800">
          <h2 class="text-sm font-bold text-content-main dark:text-slate-100 flex items-center gap-2">
            <i class="fa-solid fa-user text-primary-500"></i>
            <span>User Account Profile</span>
          </h2>

          <button
            *ngIf="auth.isAuthenticated()"
            (click)="auth.logout()"
            class="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <i class="fa-solid fa-right-from-bracket text-xs"></i>
            <span>Log Out</span>
          </button>
          <button
            *ngIf="!auth.isAuthenticated()"
            (click)="auth.openAuthModal()"
            class="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-soft flex items-center gap-1.5 transition-all"
          >
            <i class="fa-solid fa-right-to-bracket text-xs"></i>
            <span>Sign In</span>
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="text-content-muted dark:text-slate-400 block mb-1">Full Name:</label>
              <input
                [value]="auth.currentUser()?.fullName || 'Guest / Unauthenticated'"
                readonly
                class="w-full px-3 py-2 bg-surface-subtle dark:bg-slate-800 border border-surface-border dark:border-slate-700 text-content-main dark:text-slate-100 rounded-xl font-medium"
              />
            </div>
            <div>
              <label class="text-content-muted dark:text-slate-400 block mb-1">Email Address:</label>
              <input
                [value]="auth.currentUser()?.email || 'N/A'"
                readonly
                class="w-full px-3 py-2 bg-surface-subtle dark:bg-slate-800 border border-surface-border dark:border-slate-700 text-content-main dark:text-slate-100 rounded-xl font-medium"
              />
            </div>
          </div>

          <div *ngIf="auth.sessionTime()" class="text-[11px] text-content-muted dark:text-slate-500 pt-2 flex items-center gap-1.5">
            <i class="fa-regular fa-clock"></i>
            <span>Current session started at: {{ auth.sessionTime() }}</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SettingsComponent {
  public auth = inject(AuthService);
  public state = inject(ProjectStateService);
  public theme = inject(ThemeService);
  public api = inject(ApiService);
  public selectedProvider: string = localStorage.getItem('db_insight_ai_provider') || 'builtin';

  public geminiApiKey: string = localStorage.getItem('db_insight_gemini_key') || '';
  public openAiApiKey: string = localStorage.getItem('db_insight_openai_key') || '';
  public geminiSaved: boolean = false;
  public openAiSaved: boolean = false;

  public apiEndpoint: string = localStorage.getItem('db_insight_api_url') || '';
  public apiSaved: boolean = false;

  public saveApiEndpoint() {
    if (this.apiEndpoint.trim()) {
      localStorage.setItem('db_insight_api_url', this.apiEndpoint.trim());
    } else {
      localStorage.removeItem('db_insight_api_url');
    }
    this.apiSaved = true;
    setTimeout(() => (this.apiSaved = false), 2500);
  }

  public saveGeminiKey() {
    if (this.geminiApiKey.trim()) {
      localStorage.setItem('db_insight_gemini_key', this.geminiApiKey.trim());
      localStorage.setItem('db_insight_ai_provider', 'gemini');
    } else {
      localStorage.removeItem('db_insight_gemini_key');
    }
    this.geminiSaved = true;
    setTimeout(() => (this.geminiSaved = false), 2500);
  }

  public saveOpenAiKey() {
    if (this.openAiApiKey.trim()) {
      localStorage.setItem('db_insight_openai_key', this.openAiApiKey.trim());
      localStorage.setItem('db_insight_ai_provider', 'openai');
    } else {
      localStorage.removeItem('db_insight_openai_key');
    }
    this.openAiSaved = true;
    setTimeout(() => (this.openAiSaved = false), 2500);
  }
}
