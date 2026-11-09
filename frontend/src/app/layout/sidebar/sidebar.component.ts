import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProjectStateService } from '../../core/services/project-state.service';
import { LayoutService } from '../../core/services/layout.service';

interface NavItem {
  label: string;
  route: string;
  faIcon: string;
  badge?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Mobile Backdrop Overlay -->
    <div
      *ngIf="layout.isMobileNavOpen()"
      (click)="layout.closeMobileNav()"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
    ></div>

    <!-- Sidebar Container -->
    <aside
      class="fixed md:static inset-y-0 left-0 z-50 h-screen bg-white dark:bg-slate-900 border-r border-surface-border dark:border-slate-800 flex flex-col transition-all duration-300 select-none shadow-xl md:shadow-none md:translate-x-0"
      [class.w-64]="!isCollapsed()"
      [class.w-20]="isCollapsed()"
      [class.max-md:translate-x-0]="layout.isMobileNavOpen()"
      [class.max-md:-translate-x-full]="!layout.isMobileNavOpen()"
    >
      <!-- Logo & App Header -->
      <div class="h-16 flex items-center border-b border-surface-border dark:border-slate-800" [ngClass]="isCollapsed() ? 'justify-center px-2' : 'justify-between px-4'">
        <div
          class="flex items-center space-x-3 overflow-hidden cursor-pointer"
          routerLink="/dashboard"
          (click)="layout.closeMobileNav()"
          [title]="isCollapsed() ? 'DB Insight AI' : ''"
        >
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-soft font-bold text-lg flex-shrink-0">
            <i class="fa-solid fa-database text-lg"></i>
          </div>
          <div *ngIf="!isCollapsed()" class="truncate">
            <div class="font-bold text-base tracking-tight text-content-main dark:text-slate-100 flex items-center gap-1.5">
              <span>DB Insight</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold uppercase tracking-wider">AI</span>
            </div>
            <div class="text-[11px] text-content-muted dark:text-slate-400 leading-tight">Educational Studio</div>
          </div>
        </div>

        <!-- Desktop Collapse Button -->
        <button
          *ngIf="!isCollapsed()"
          (click)="toggleCollapse()"
          class="hidden md:flex p-1.5 rounded-lg text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-slate-100 hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors"
          title="Collapse sidebar"
        >
          <i class="fa-solid fa-chevron-left text-sm"></i>
        </button>

        <!-- Mobile Close Button -->
        <button
          (click)="layout.closeMobileNav()"
          class="md:hidden p-2 rounded-lg text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-slate-100 hover:bg-surface-hover dark:hover:bg-slate-800 transition-colors"
          title="Close sidebar"
        >
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <!-- Quick Expand Pill when collapsed -->
      <button
        *ngIf="isCollapsed()"
        (click)="toggleCollapse()"
        class="hidden md:flex items-center justify-center py-2 text-content-muted dark:text-slate-400 hover:text-content-main dark:hover:text-white hover:bg-surface-hover dark:hover:bg-slate-800 border-b border-surface-border dark:border-slate-800 transition-colors"
        title="Expand sidebar"
      >
        <i class="fa-solid fa-chevron-right text-xs"></i>
      </button>

      <!-- Navigation Links -->
      <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
        <a
          *ngFor="let item of navItems"
          [routerLink]="item.route"
          (click)="onNavItemClick(item, $event)"
          routerLinkActive="sidebar-active-tab"
          [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
          class="group flex items-center rounded-xl text-sm text-content-muted dark:text-slate-300 hover:text-content-main dark:hover:text-white hover:bg-surface-hover dark:hover:bg-slate-800/70 transition-all relative font-medium"
          [ngClass]="isCollapsed() ? 'justify-center p-2.5 w-10 h-10 mx-auto' : 'px-3.5 py-2.5'"
          [title]="isCollapsed() ? (item.label + (!auth.isAuthenticated() && item.route !== '/dashboard' ? ' (Sign in required)' : '')) : ''"
        >
          <!-- Font Awesome Icon -->
          <div class="w-6 h-6 flex-shrink-0 flex items-center justify-center group-hover:text-blue-500 transition-colors" [class.mr-3]="!isCollapsed()">
            <i [class]="item.faIcon + ' text-base'"></i>
          </div>

          <span *ngIf="!isCollapsed()" class="truncate text-[13px] flex-1">
            {{ item.label }}
          </span>

          <!-- Lock Icon when Guest -->
          <i
            *ngIf="!isCollapsed() && !auth.isAuthenticated() && item.route !== '/dashboard'"
            class="fa-solid fa-lock text-[10px] text-slate-400 dark:text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity"
            title="Sign in required"
          ></i>

          <span
            *ngIf="!isCollapsed() && item.badge && (auth.isAuthenticated() || item.route === '/dashboard')"
            class="nav-badge text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40"
          >
            {{ item.badge }}
          </span>
        </a>
      </nav>

      <!-- Bottom User Profile Section -->
      <div class="p-3 border-t border-surface-border dark:border-slate-800 bg-surface-subtle/50 dark:bg-slate-900/50">
        <!-- Logged In State -->
        <div *ngIf="auth.isAuthenticated(); else guestState" class="flex items-center justify-between" [class.flex-col]="isCollapsed()">
          <div class="flex items-center space-x-2.5 overflow-hidden">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-sm">
              {{ (auth.currentUser()?.fullName || 'U').charAt(0) }}
            </div>
            <div *ngIf="!isCollapsed()" class="truncate text-left">
              <div class="text-xs font-semibold text-content-main dark:text-slate-100 truncate">
                {{ auth.currentUser()?.fullName || 'Active User' }}
              </div>
              <div class="text-[10px] text-content-muted dark:text-slate-400 flex items-center gap-1.5">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="truncate">{{ auth.currentUser()?.role || 'Learner' }}</span>
                <span *ngIf="auth.sessionTime()" class="text-[9px] text-slate-400">· {{ auth.sessionTime() }}</span>
              </div>
            </div>
          </div>

          <button
            *ngIf="!isCollapsed()"
            (click)="auth.logout()"
            title="Sign Out"
            class="p-2 text-content-muted dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <i class="fa-solid fa-right-from-bracket text-sm"></i>
          </button>
        </div>

        <!-- Guest / Logged Out State -->
        <ng-template #guestState>
          <div class="text-center" [class.p-1]="isCollapsed()">
            <button
              *ngIf="!isCollapsed()"
              (click)="auth.openAuthModal()"
              class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-soft transition-all"
            >
              <i class="fa-solid fa-right-to-bracket text-xs"></i>
              <span>Sign In / Join</span>
            </button>
            <button
              *ngIf="isCollapsed()"
              (click)="auth.openAuthModal()"
              title="Sign In"
              class="w-9 h-9 mx-auto rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 shadow-sm transition-all"
            >
              <i class="fa-solid fa-right-to-bracket text-xs"></i>
            </button>
          </div>
        </ng-template>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  public auth = inject(AuthService);
  public state = inject(ProjectStateService);
  public layout = inject(LayoutService);
  public isCollapsed = signal<boolean>(false);

  public toggleCollapse() {
    this.isCollapsed.update(v => !v);
  }

  public onNavItemClick(item: NavItem, event: Event) {
    this.layout.closeMobileNav();
    if (!this.auth.isAuthenticated() && item.route !== '/dashboard') {
      event.preventDefault();
      this.auth.openAuthModal(`Please sign in or create an account to access ${item.label}.`);
    }
  }

  public navItems: NavItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      faIcon: 'fa-solid fa-gauge-high'
    },
    {
      label: 'New Analysis',
      route: '/new-analysis',
      faIcon: 'fa-solid fa-circle-plus',
      badge: 'Start'
    },
    {
      label: 'My Projects',
      route: '/projects',
      faIcon: 'fa-solid fa-folder-open'
    },
    {
      label: 'Database Explorer',
      route: '/explorer',
      faIcon: 'fa-solid fa-database'
    },
    {
      label: 'Normalization',
      route: '/normalization',
      faIcon: 'fa-solid fa-diagram-project'
    },
    {
      label: 'SQL Validator',
      route: '/sql-validator',
      faIcon: 'fa-solid fa-code'
    },
    {
      label: 'Learning Center',
      route: '/learning',
      faIcon: 'fa-solid fa-graduation-cap'
    },
    {
      label: 'Reports',
      route: '/reports',
      faIcon: 'fa-solid fa-file-invoice'
    },
    {
      label: 'Settings',
      route: '/settings',
      faIcon: 'fa-solid fa-gear'
    }
  ];
}
