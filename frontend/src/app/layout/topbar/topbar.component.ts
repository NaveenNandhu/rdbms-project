import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProjectStateService } from '../../core/services/project-state.service';
import { LayoutService } from '../../core/services/layout.service';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="h-16 bg-white dark:bg-slate-900 border-b border-surface-border dark:border-slate-800 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      <!-- Left: Mobile Menu Trigger + Breadcrumb -->
      <div class="flex items-center space-x-3">
        <!-- Mobile Drawer Hamburger -->
        <button
          (click)="layout.toggleMobileNav()"
          class="md:hidden p-2 rounded-xl text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-slate-100 hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors"
          title="Toggle Navigation Menu"
        >
          <i class="fa-solid fa-bars text-lg"></i>
        </button>

        <!-- Breadcrumb / Project title -->
        <div class="flex items-center text-xs text-content-muted dark:text-slate-400">
          <span class="hover:text-content-main dark:hover:text-slate-200 cursor-pointer font-medium flex items-center gap-1.5" routerLink="/dashboard">
            <img src="/app-logo.png" alt="DB Insight Logo" class="w-4 h-4 rounded object-contain inline-block" />
            <span>DB Insight</span>
          </span>
          <i class="fa-solid fa-chevron-right text-[10px] mx-2 text-slate-400 dark:text-slate-600"></i>
          <span class="font-semibold text-content-main dark:text-slate-200 truncate max-w-[140px] sm:max-w-[220px]">
            {{ state.activeProject()?.title || 'Interactive Session' }}
          </span>
        </div>

        <!-- Grade Score Pill (Hidden on mobile) -->
        <div
          *ngIf="state.activeAnalysis() as a"
          class="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
          [ngClass]="{
            'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800': a.recommendations.overallDesignScore >= 80,
            'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800': a.recommendations.overallDesignScore >= 60 && a.recommendations.overallDesignScore < 80,
            'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800': a.recommendations.overallDesignScore < 60
          }"
        >
          <span class="w-2 h-2 rounded-full" [ngClass]="{
            'bg-emerald-500': a.recommendations.overallDesignScore >= 80,
            'bg-amber-500': a.recommendations.overallDesignScore >= 60 && a.recommendations.overallDesignScore < 80,
            'bg-red-500': a.recommendations.overallDesignScore < 60
          }"></span>
          <span>Score: {{ a.recommendations.overallDesignScore }}/100</span>
          <span class="opacity-60">({{ a.overallSchemaRank }})</span>
        </div>
      </div>

      <!-- Right Controls: On mobile, ONLY profile icon; on desktop, standalone theme toggle + user actions -->
      <div class="flex items-center space-x-2 sm:space-x-3">
        <!-- Standalone Theme Mode Switcher (Visible on desktop only; on mobile accessed via profile menu) -->
        <div class="relative hidden md:block">
          <button
            (click)="toggleThemeMenu()"
            class="p-2 rounded-xl text-content-muted dark:text-slate-300 hover:text-content-main dark:hover:text-white hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors flex items-center justify-center w-9 h-9"
            [title]="'Theme: ' + theme.themeMode()"
          >
            <i *ngIf="theme.themeMode() === 'light'" class="fa-solid fa-sun text-amber-500 text-base"></i>
            <i *ngIf="theme.themeMode() === 'dark'" class="fa-solid fa-moon text-indigo-400 text-base"></i>
            <i *ngIf="theme.themeMode() === 'system'" class="fa-solid fa-desktop text-slate-500 dark:text-slate-400 text-base"></i>
          </button>

          <!-- Desktop Theme Dropdown Menu -->
          <div
            *ngIf="isThemeDropdownOpen()"
            (click)="isThemeDropdownOpen.set(false)"
            class="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
          >
            <div class="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-content-muted dark:text-slate-400">
              Theme Mode
            </div>
            <button
              (click)="selectTheme('light')"
              class="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-content-main dark:text-slate-200 hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors"
              [class.font-bold]="theme.themeMode() === 'light'"
            >
              <i class="fa-solid fa-sun text-amber-500 w-4"></i>
              <span>Light</span>
              <i *ngIf="theme.themeMode() === 'light'" class="fa-solid fa-check ml-auto text-primary text-xs"></i>
            </button>
            <button
              (click)="selectTheme('dark')"
              class="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-content-main dark:text-slate-200 hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors"
              [class.font-bold]="theme.themeMode() === 'dark'"
            >
              <i class="fa-solid fa-moon text-indigo-400 w-4"></i>
              <span>Dark</span>
              <i *ngIf="theme.themeMode() === 'dark'" class="fa-solid fa-check ml-auto text-primary text-xs"></i>
            </button>
            <button
              (click)="selectTheme('system')"
              class="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-content-main dark:text-slate-200 hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors"
              [class.font-bold]="theme.themeMode() === 'system'"
            >
              <i class="fa-solid fa-desktop text-slate-500 dark:text-slate-400 w-4"></i>
              <span>System (Auto)</span>
              <i *ngIf="theme.themeMode() === 'system'" class="fa-solid fa-check ml-auto text-primary text-xs"></i>
            </button>
          </div>
        </div>

        <!-- User / Session Management -->
        <div class="relative">
          <!-- When Logged In: Profile Icon (Mobile & Desktop) -->
          <ng-container *ngIf="auth.isAuthenticated(); else guestSection">
            <button
              (click)="toggleUserMenu()"
              class="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors"
              title="User Account & Preferences"
            >
              <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm ring-1 ring-primary/20">
                {{ (auth.currentUser()?.fullName || 'U').charAt(0) }}
              </div>
              <div class="hidden md:block text-left text-xs leading-tight">
                <div class="font-semibold text-content-main dark:text-slate-200 truncate max-w-[100px]">
                  {{ auth.currentUser()?.fullName || 'User' }}
                </div>
                <div class="text-[10px] text-content-muted dark:text-slate-400">
                  {{ auth.currentUser()?.role || 'Learner' }}
                </div>
              </div>
              <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 hidden md:inline"></i>
            </button>

            <!-- User Profile Dropdown (Contains Theme Switcher + Logout) -->
            <div
              *ngIf="isUserDropdownOpen()"
              (click)="isUserDropdownOpen.set(false)"
              class="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <!-- User Info -->
              <div class="px-4 py-3 border-b border-surface-border dark:border-slate-800">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {{ (auth.currentUser()?.fullName || 'U').charAt(0) }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="font-bold text-sm text-content-main dark:text-slate-100 truncate">
                      {{ auth.currentUser()?.fullName || 'Active Learner' }}
                    </div>
                    <div class="text-xs text-content-muted dark:text-slate-400 truncate">
                      {{ auth.currentUser()?.email || 'student@dbinsight.ai' }}
                    </div>
                  </div>
                </div>
                <div class="mt-2.5 flex items-center justify-between text-[11px]">
                  <span class="px-2 py-0.5 rounded-md bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-bold uppercase tracking-wider">
                    {{ auth.currentUser()?.role || 'STUDENT' }}
                  </span>
                  <span *ngIf="auth.sessionTime()" class="text-content-muted dark:text-slate-500 flex items-center gap-1 font-mono text-[10px]">
                    <i class="fa-regular fa-clock"></i>
                    {{ auth.sessionTime() }}
                  </span>
                </div>
              </div>

              <!-- Theme Selector in Profile Menu -->
              <div class="px-4 py-3 border-b border-surface-border dark:border-slate-800">
                <div class="text-[11px] font-bold uppercase tracking-wider text-content-muted dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <i class="fa-solid fa-palette text-primary text-xs"></i>
                  <span>Interface Theme</span>
                </div>
                <div class="grid grid-cols-3 gap-1.5 bg-surface-subtle dark:bg-slate-800/80 p-1 rounded-xl">
                  <button
                    (click)="selectTheme('light')"
                    class="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition-all font-medium"
                    [ngClass]="theme.themeMode() === 'light' ? 'bg-white dark:bg-slate-900 text-amber-500 font-bold shadow-sm' : 'text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-white'"
                  >
                    <i class="fa-solid fa-sun text-xs"></i>
                    <span>Light</span>
                  </button>
                  <button
                    (click)="selectTheme('dark')"
                    class="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition-all font-medium"
                    [ngClass]="theme.themeMode() === 'dark' ? 'bg-white dark:bg-slate-900 text-indigo-400 font-bold shadow-sm' : 'text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-white'"
                  >
                    <i class="fa-solid fa-moon text-xs"></i>
                    <span>Dark</span>
                  </button>
                  <button
                    (click)="selectTheme('system')"
                    class="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition-all font-medium"
                    [ngClass]="theme.themeMode() === 'system' ? 'bg-white dark:bg-slate-900 text-primary-500 font-bold shadow-sm' : 'text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-white'"
                  >
                    <i class="fa-solid fa-desktop text-xs"></i>
                    <span>Auto</span>
                  </button>
                </div>
              </div>

              <!-- Navigation Links -->
              <div class="py-1">
                <a
                  routerLink="/settings"
                  class="flex items-center gap-2.5 px-4 py-2 text-xs text-content-main dark:text-slate-200 hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors"
                >
                  <i class="fa-solid fa-gear text-slate-400 w-4"></i>
                  <span>Workspace Settings</span>
                </a>
                <a
                  routerLink="/projects"
                  class="flex items-center gap-2.5 px-4 py-2 text-xs text-content-main dark:text-slate-200 hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors"
                >
                  <i class="fa-solid fa-folder-open text-slate-400 w-4"></i>
                  <span>My Saved Schemas</span>
                </a>
              </div>

              <!-- Sign Out -->
              <div class="pt-1 border-t border-surface-border dark:border-slate-800">
                <button
                  (click)="auth.logout()"
                  class="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors font-semibold"
                >
                  <i class="fa-solid fa-right-from-bracket text-rose-500 w-4"></i>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </ng-container>

          <!-- When Logged Out / Guest: Mobile profile icon + Desktop Sign In button -->
          <ng-template #guestSection>
            <!-- Desktop Sign In Button -->
            <button
              (click)="auth.openAuthModal()"
              class="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-soft transition-all"
            >
              <i class="fa-solid fa-right-to-bracket text-xs"></i>
              <span>Sign In</span>
            </button>

            <!-- Mobile Only Profile Icon for Guests -->
            <button
              (click)="toggleGuestMenu()"
              class="md:hidden flex items-center justify-center w-8 h-8 rounded-xl bg-surface-subtle dark:bg-slate-800 text-content-main dark:text-slate-200 border border-surface-border dark:border-slate-700 hover:ring-2 hover:ring-primary transition-all"
              title="Guest Profile & Themes"
            >
              <i class="fa-solid fa-user text-xs"></i>
            </button>

            <!-- Guest Profile Dropdown (Mobile) -->
            <div
              *ngIf="isGuestDropdownOpen()"
              (click)="isGuestDropdownOpen.set(false)"
              class="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div class="px-4 py-3 border-b border-surface-border dark:border-slate-800">
                <div class="font-bold text-sm text-content-main dark:text-slate-100 flex items-center gap-2">
                  <i class="fa-solid fa-circle-user text-primary text-base"></i>
                  <span>Guest Session</span>
                </div>
                <div class="text-xs text-content-muted dark:text-slate-400 mt-0.5">
                  Sign in to save your schemas & track progress.
                </div>
              </div>

              <!-- Theme Selector for Guest -->
              <div class="px-4 py-3 border-b border-surface-border dark:border-slate-800">
                <div class="text-[11px] font-bold uppercase tracking-wider text-content-muted dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <i class="fa-solid fa-palette text-primary text-xs"></i>
                  <span>Interface Theme</span>
                </div>
                <div class="grid grid-cols-3 gap-1.5 bg-surface-subtle dark:bg-slate-800/80 p-1 rounded-xl">
                  <button
                    (click)="selectTheme('light')"
                    class="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition-all font-medium"
                    [ngClass]="theme.themeMode() === 'light' ? 'bg-white dark:bg-slate-900 text-amber-500 font-bold shadow-sm' : 'text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-white'"
                  >
                    <i class="fa-solid fa-sun text-xs"></i>
                    <span>Light</span>
                  </button>
                  <button
                    (click)="selectTheme('dark')"
                    class="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition-all font-medium"
                    [ngClass]="theme.themeMode() === 'dark' ? 'bg-white dark:bg-slate-900 text-indigo-400 font-bold shadow-sm' : 'text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-white'"
                  >
                    <i class="fa-solid fa-moon text-xs"></i>
                    <span>Dark</span>
                  </button>
                  <button
                    (click)="selectTheme('system')"
                    class="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition-all font-medium"
                    [ngClass]="theme.themeMode() === 'system' ? 'bg-white dark:bg-slate-900 text-primary-500 font-bold shadow-sm' : 'text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-white'"
                  >
                    <i class="fa-solid fa-desktop text-xs"></i>
                    <span>Auto</span>
                  </button>
                </div>
              </div>

              <!-- Guest Sign In Action -->
              <div class="p-3">
                <button
                  (click)="auth.openAuthModal(); isGuestDropdownOpen.set(false)"
                  class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-soft transition-all"
                >
                  <i class="fa-solid fa-right-to-bracket"></i>
                  <span>Sign In / Create Account</span>
                </button>
              </div>
            </div>
          </ng-template>
        </div>
      </div>
    </header>
  `
})
export class TopbarComponent {
  public auth = inject(AuthService);
  public state = inject(ProjectStateService);
  public layout = inject(LayoutService);
  public theme = inject(ThemeService);

  public isThemeDropdownOpen = signal<boolean>(false);
  public isUserDropdownOpen = signal<boolean>(false);
  public isGuestDropdownOpen = signal<boolean>(false);

  public toggleThemeMenu(): void {
    this.isThemeDropdownOpen.update(v => !v);
    if (this.isThemeDropdownOpen()) {
      this.isUserDropdownOpen.set(false);
      this.isGuestDropdownOpen.set(false);
    }
  }

  public toggleUserMenu(): void {
    this.isUserDropdownOpen.update(v => !v);
    if (this.isUserDropdownOpen()) {
      this.isThemeDropdownOpen.set(false);
      this.isGuestDropdownOpen.set(false);
    }
  }

  public toggleGuestMenu(): void {
    this.isGuestDropdownOpen.update(v => !v);
    if (this.isGuestDropdownOpen()) {
      this.isThemeDropdownOpen.set(false);
      this.isUserDropdownOpen.set(false);
    }
  }

  public selectTheme(mode: ThemeMode): void {
    this.theme.setTheme(mode);
    this.isThemeDropdownOpen.set(false);
  }
}
