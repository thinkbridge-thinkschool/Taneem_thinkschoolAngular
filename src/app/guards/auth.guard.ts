import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

// Functional guard — redirects to /login if not logged in
export const authGuard: CanActivateFn = (route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  // Save the intended URL so login can redirect back after success
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};
