import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { AuthModalComponent } from '../../shared/components/auth-modal/auth-modal.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent, AuthModalComponent],
  template: `
    <div class="flex h-screen w-screen overflow-hidden bg-surface-subtle dark:bg-slate-950 transition-colors">
      <!-- Responsive Collapsible / Off-canvas Sidebar -->
      <app-sidebar></app-sidebar>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <!-- Topbar -->
        <app-topbar></app-topbar>

        <!-- Dynamic Page Router Outlet -->
        <main class="flex-1 overflow-y-auto p-4 md:p-6 relative custom-scrollbar">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- Global Auth Modal for real-time Login / Register / Guest Switching -->
      <app-auth-modal></app-auth-modal>
    </div>
  `
})
export class MainLayoutComponent {}
