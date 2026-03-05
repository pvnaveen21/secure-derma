import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '@app/services/auth/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    authService.redirectUrl = state.url;
    authService.redirectToLogin();
    return false;
  }

  if (Object.keys(route.data).indexOf('regex') >= 0) {
    const params = route.params;
    for (const param of Object.keys(params)) {
      if (Object.keys(route.data['regex']).indexOf(param) >= 0) {
        const exp = new RegExp(`^${route.data['regex'][param]}$`, 'g');
        if (!exp.test(params[param])) {
          router.navigate(['/error/not-found']);
          return false;
        }
      }
    }
  }

  return true; 
};