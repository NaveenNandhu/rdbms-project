import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // Not signed in: prompt user to sign in to use this feature
  auth.openAuthModal('Please sign in or create an account to access this feature.');
  return router.createUrlTree(['/dashboard']);
};
