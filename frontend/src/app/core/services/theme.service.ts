import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  public themeMode = signal<ThemeMode>('system');
  public isDark = signal<boolean>(false);

  private mediaQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  constructor() {
    let savedMode: ThemeMode = 'system';
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('db_insight_theme') as ThemeMode | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        savedMode = stored;
      }
    }

    this.themeMode.set(savedMode);
    this.applyTheme(savedMode);

    if (this.mediaQuery) {
      this.mediaQuery.addEventListener('change', (e) => {
        if (this.themeMode() === 'system') {
          this.updateDocumentClass(e.matches);
        }
      });
    }
  }

  public setTheme(mode: ThemeMode): void {
    this.themeMode.set(mode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('db_insight_theme', mode);
    }
    this.applyTheme(mode);
  }

  public toggleTheme(): void {
    if (this.isDark()) {
      this.setTheme('light');
    } else {
      this.setTheme('dark');
    }
  }

  private applyTheme(mode: ThemeMode): void {
    let dark = false;
    if (mode === 'dark') {
      dark = true;
    } else if (mode === 'light') {
      dark = false;
    } else {
      dark = this.mediaQuery ? this.mediaQuery.matches : false;
    }
    this.updateDocumentClass(dark);
  }

  private updateDocumentClass(dark: boolean): void {
    this.isDark.set(dark);
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (dark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    }
  }
}
