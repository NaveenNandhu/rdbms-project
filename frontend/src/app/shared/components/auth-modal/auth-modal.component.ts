import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      *ngIf="auth.isAuthModalOpen()"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs fade-in"
      (click)="onBackdropClick($event)"
    >
      <div
        class="bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[92vh]"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="px-6 pt-6 pb-4 border-b border-surface-border dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-primary flex items-center justify-center text-lg">
              <i class="fa-solid fa-shield-halved"></i>
            </div>
            <div>
              <h2 class="text-base font-bold text-content-main dark:text-slate-100">User Authentication</h2>
              <p class="text-xs text-content-muted dark:text-slate-400">Secure real-time session management</p>
            </div>
          </div>
          <button
            (click)="auth.closeAuthModal()"
            class="w-8 h-8 rounded-lg text-content-muted hover:text-content-main hover:bg-surface-hover dark:hover:bg-slate-800 flex items-center justify-center transition-colors text-sm"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Mode Tabs -->
        <div class="flex border-b border-surface-border dark:border-slate-800 px-6 pt-2 bg-surface-subtle/50 dark:bg-slate-950/40">
          <button
            (click)="activeTab.set('login')"
            class="py-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 flex-1 justify-center"
            [ngClass]="activeTab() === 'login' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-content-muted hover:text-content-main dark:hover:text-slate-200'"
          >
            <i class="fa-solid fa-right-to-bracket text-xs"></i>
            <span>Sign In</span>
          </button>

          <button
            (click)="activeTab.set('register')"
            class="py-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 flex-1 justify-center"
            [ngClass]="activeTab() === 'register' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-content-muted hover:text-content-main dark:hover:text-slate-200'"
          >
            <i class="fa-solid fa-user-plus text-xs"></i>
            <span>Create Account</span>
          </button>
        </div>

        <!-- Content Area -->
        <div class="p-6 overflow-y-auto space-y-4">
          <!-- Context / Prompt Banner -->
          <div *ngIf="auth.authModalMessage()" class="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2.5">
            <i class="fa-solid fa-lock text-primary text-sm flex-shrink-0"></i>
            <span class="font-medium">{{ auth.authModalMessage() }}</span>
          </div>

          <!-- Error Banner -->
          <div *ngIf="errorMessage()" class="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <i class="fa-solid fa-circle-exclamation flex-shrink-0 text-red-500"></i>
            <span>{{ errorMessage() }}</span>
          </div>

          <!-- Success Banner -->
          <div *ngIf="successMessage()" class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <i class="fa-solid fa-circle-check flex-shrink-0 text-emerald-500"></i>
            <span>{{ successMessage() }}</span>
          </div>

          <!-- TAB 1: LOGIN -->
          <div *ngIf="activeTab() === 'login'" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-content-muted dark:text-slate-300 mb-1.5">Email Address</label>
              <div class="relative">
                <i class="fa-solid fa-envelope absolute left-3 top-3 text-content-muted text-xs"></i>
                <input
                  type="email"
                  [(ngModel)]="loginEmail"
                  placeholder="name@example.com"
                  class="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 text-content-main dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-content-muted dark:text-slate-300 mb-1.5">Password</label>
              <div class="relative">
                <i class="fa-solid fa-lock absolute left-3 top-3 text-content-muted text-xs"></i>
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="loginPassword"
                  placeholder="••••••••"
                  class="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 text-content-main dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  (keyup.enter)="submitLogin()"
                />
                <button
                  type="button"
                  (click)="showPassword.set(!showPassword())"
                  class="absolute right-3 top-2.5 text-content-muted hover:text-content-main dark:hover:text-slate-200 text-xs"
                >
                  <i class="fa-solid" [ngClass]="showPassword() ? 'fa-eye-slash' : 'fa-eye'"></i>
                </button>
              </div>
            </div>

            <button
              (click)="submitLogin()"
              [disabled]="isLoading() || !loginEmail || !loginPassword"
              class="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold text-xs shadow-soft transition-all flex items-center justify-center gap-2 mt-2"
            >
              <i *ngIf="isLoading()" class="fa-solid fa-circle-notch fa-spin"></i>
              <i *ngIf="!isLoading()" class="fa-solid fa-arrow-right-to-bracket"></i>
              <span>{{ isLoading() ? 'Signing In...' : 'Sign In' }}</span>
            </button>

            <div class="text-center pt-2 text-xs text-content-muted dark:text-slate-400">
              Don't have an account?
              <button
                type="button"
                (click)="activeTab.set('register')"
                class="text-blue-600 dark:text-blue-400 font-semibold hover:underline ml-1"
              >
                Create one now
              </button>
            </div>
          </div>

          <!-- TAB 2: REGISTER -->
          <div *ngIf="activeTab() === 'register'" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-content-muted dark:text-slate-300 mb-1.5">Full Name</label>
              <div class="relative">
                <i class="fa-solid fa-user absolute left-3 top-3 text-content-muted text-xs"></i>
                <input
                  type="text"
                  [(ngModel)]="registerName"
                  placeholder="e.g. Jane Doe"
                  class="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 text-content-main dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-content-muted dark:text-slate-300 mb-1.5">Email Address</label>
              <div class="relative">
                <i class="fa-solid fa-envelope absolute left-3 top-3 text-content-muted text-xs"></i>
                <input
                  type="email"
                  [(ngModel)]="registerEmail"
                  placeholder="name@example.com"
                  class="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 text-content-main dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-content-muted dark:text-slate-300 mb-1.5">Password</label>
              <div class="relative">
                <i class="fa-solid fa-lock absolute left-3 top-3 text-content-muted text-xs"></i>
                <input
                  type="password"
                  [(ngModel)]="registerPassword"
                  placeholder="Minimum 6 characters"
                  class="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 text-content-main dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <button
              (click)="submitRegister()"
              [disabled]="isLoading() || !registerEmail || !registerPassword || !registerName"
              class="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold text-xs shadow-soft transition-all flex items-center justify-center gap-2 mt-2"
            >
              <i *ngIf="isLoading()" class="fa-solid fa-circle-notch fa-spin"></i>
              <i *ngIf="!isLoading()" class="fa-solid fa-user-plus"></i>
              <span>{{ isLoading() ? 'Creating Account...' : 'Create Account' }}</span>
            </button>

            <div class="text-center pt-2 text-xs text-content-muted dark:text-slate-400">
              Already have an account?
              <button
                type="button"
                (click)="activeTab.set('login')"
                class="text-blue-600 dark:text-blue-400 font-semibold hover:underline ml-1"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 bg-surface-subtle dark:bg-slate-950/60 border-t border-surface-border dark:border-slate-800 text-[11px] text-content-muted dark:text-slate-400 text-center flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-lock text-[10px] text-emerald-500"></i>
          <span>Secure 256-bit JWT Session Authentication</span>
        </div>
      </div>
    </div>
  `
})
export class AuthModalComponent {
  public auth = inject(AuthService);

  public activeTab = signal<'login' | 'register'>('login');
  public isLoading = signal<boolean>(false);
  public showPassword = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);
  public successMessage = signal<string | null>(null);

  public loginEmail = '';
  public loginPassword = '';

  public registerName = '';
  public registerEmail = '';
  public registerPassword = '';

  public onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.auth.closeAuthModal();
    }
  }

  public submitLogin() {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isLoading.set(true);

    this.auth.login(this.loginEmail.trim(), this.loginPassword).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.successMessage.set('Signed in successfully!');
        setTimeout(() => {
          this.auth.closeAuthModal();
          this.loginPassword = '';
          this.successMessage.set(null);
        }, 500);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Invalid email or password.');
      }
    });
  }

  public submitRegister() {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isLoading.set(true);

    this.auth.register(this.registerEmail.trim(), this.registerPassword, this.registerName.trim()).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.successMessage.set('Account created and signed in!');
        setTimeout(() => {
          this.auth.closeAuthModal();
          this.registerPassword = '';
          this.successMessage.set(null);
        }, 500);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Registration failed. Please check inputs.');
      }
    });
  }
}
