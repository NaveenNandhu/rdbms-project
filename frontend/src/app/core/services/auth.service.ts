import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { ProjectStateService } from './project-state.service';
import { User } from '../models/schema.models';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);
  private projectState = inject(ProjectStateService);

  public currentUser = signal<User | null>(null);
  public token = signal<string | null>(localStorage.getItem('db_insight_token'));
  public isAuthenticated = signal<boolean>(!!localStorage.getItem('db_insight_token'));
  public isAuthModalOpen = signal<boolean>(false);
  public authModalMessage = signal<string | null>(null);
  public sessionTime = signal<string | null>(localStorage.getItem('db_insight_session_time'));

  constructor() {
    const savedUser = localStorage.getItem('db_insight_user');
    const isLoggedOut = localStorage.getItem('db_insight_logged_out') === 'true';

    if (savedUser && !isLoggedOut) {
      try {
        this.currentUser.set(JSON.parse(savedUser));
        this.isAuthenticated.set(true);
      } catch (e) {
        localStorage.removeItem('db_insight_user');
        this.isAuthenticated.set(false);
      }
    } else {
      // Production initial state: anonymous guest session
      this.isAuthenticated.set(false);
      this.currentUser.set(null);
    }
  }

  public openAuthModal(reason?: string): void {
    if (reason) {
      this.authModalMessage.set(reason);
    } else {
      this.authModalMessage.set(null);
    }
    this.isAuthModalOpen.set(true);
  }

  public closeAuthModal(): void {
    this.isAuthModalOpen.set(false);
    this.authModalMessage.set(null);
  }

  public login(email: string, password: string) {
    return this.api.login({ email, password }).pipe(
      tap((res: any) => {
        if (res.success && res.token) {
          this.setSession(res.user, res.token);
        }
      })
    );
  }

  public register(email: string, password: string, fullName: string, role: string = 'STUDENT') {
    return this.api.register({ email, password, fullName, role }).pipe(
      tap((res: any) => {
        if (res.success && res.token) {
          this.setSession(res.user, res.token);
        }
      })
    );
  }

  public logout() {
    localStorage.removeItem('db_insight_token');
    localStorage.removeItem('db_insight_user');
    localStorage.removeItem('db_insight_session_time');
    localStorage.setItem('db_insight_logged_out', 'true');
    this.token.set(null);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.sessionTime.set(null);
    this.projectState.resetWorkspace();
    this.router.navigate(['/dashboard']);
  }

  private setSession(user: User, token: string) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    localStorage.setItem('db_insight_token', token);
    localStorage.setItem('db_insight_user', JSON.stringify(user));
    localStorage.setItem('db_insight_session_time', timeStr);
    localStorage.removeItem('db_insight_logged_out');
    this.token.set(token);
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
    this.sessionTime.set(timeStr);

    this.projectState.resetWorkspace();
    this.projectState.loadUserProjects();
  }
}
