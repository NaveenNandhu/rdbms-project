import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'new-analysis',
        canActivate: [authGuard],
        loadComponent: () => import('./features/new-analysis/new-analysis.component').then(m => m.NewAnalysisComponent)
      },
      {
        path: 'projects',
        canActivate: [authGuard],
        loadComponent: () => import('./features/projects/projects.component').then(m => m.ProjectsComponent)
      },
      {
        path: 'explorer',
        canActivate: [authGuard],
        loadComponent: () => import('./features/explorer/explorer.component').then(m => m.ExplorerComponent)
      },
      {
        path: 'visualizer',
        redirectTo: 'normalization'
      },
      {
        path: 'normalization',
        canActivate: [authGuard],
        loadComponent: () => import('./features/normalization/normalization.component').then(m => m.NormalizationComponent)
      },
      {
        path: 'integrity',
        redirectTo: 'normalization'
      },
      {
        path: 'sql-validator',
        canActivate: [authGuard],
        loadComponent: () => import('./features/sql-validator/sql-validator.component').then(m => m.SqlValidatorComponent)
      },
      {
        path: 'tutor',
        redirectTo: 'learning'
      },
      {
        path: 'learning',
        canActivate: [authGuard],
        loadComponent: () => import('./features/learning/learning.component').then(m => m.LearningComponent)
      },
      {
        path: 'reports',
        canActivate: [authGuard],
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'history',
        redirectTo: 'projects'
      },
      {
        path: 'settings',
        canActivate: [authGuard],
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
