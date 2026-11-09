import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  public isMobileNavOpen = signal<boolean>(false);

  public toggleMobileNav(): void {
    this.isMobileNavOpen.update(v => !v);
  }

  public closeMobileNav(): void {
    this.isMobileNavOpen.set(false);
  }

  public openMobileNav(): void {
    this.isMobileNavOpen.set(true);
  }
}
