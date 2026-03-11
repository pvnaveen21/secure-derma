import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '@app/services/auth/auth.service';
import { catchError, map, of } from 'rxjs';
import { ACCESS_TOKEN, REFRESH_TOKEN, setToken, unsetToken } from '@app/core/token';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    if (authService.hasValidRefreshToken()) {
      return authService.getUserData().pipe(
        map((response: any) => {
          if (response?.access) {
            setToken(response.access, ACCESS_TOKEN);
          }
          if (response?.refresh) {
            setToken(response.refresh, REFRESH_TOKEN);
          }
          return true;
        }),
        catchError(() => {
          unsetToken();
          authService.redirectUrl = state.url;
          authService.redirectToLogin();
          return of(false);
        })
      );
    }

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
