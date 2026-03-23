import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '@app/services/auth/auth.service';
import { ACCESS_TOKEN, getToken, isTokenExpired, REFRESH_TOKEN, setToken } from '@app/core/token';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  if (shouldSkipAuth(req)) {
    return next(req);
  }

  const accessToken = getToken(ACCESS_TOKEN);
  const refreshToken = getToken(REFRESH_TOKEN);

  if (accessToken && isTokenExpired(ACCESS_TOKEN)) {
    if (!refreshToken) {
      return next(removeToken(req));
    }

    return refreshAndRetry(req, next, authService);
  }

  const authReq = accessToken ? addToken(req, accessToken) : req;

  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && getToken(REFRESH_TOKEN)) {
        return refreshAndRetry(req, next, authService);
      }

      return throwError(() => error);
    })
  );
};

function shouldSkipAuth(req: HttpRequest<unknown>): boolean {
  return req.url.includes('/auth/login/')
    || req.url.includes('/auth/google/')
    || req.url.includes('/auth/sendotp/')
    || req.url.includes('/auth/otp-verify/')
    || req.url.includes('/auth/token/refresh/')
    || req.url.includes('/auth/logout/');
}

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

function removeToken(req: HttpRequest<unknown>): HttpRequest<unknown> {
  return req.clone({
    headers: req.headers.delete('Authorization')
  });
}

function refreshAndRetry(req: HttpRequest<unknown>, next: HttpHandlerFn, authService: AuthService) {
  const refreshToken = getToken(REFRESH_TOKEN);

  if (!refreshToken) {
    return next(req);
  }

  if (isRefreshing) {
    return refreshTokenSubject.pipe(
      filter((token): token is string => !!token),
      take(1),
      switchMap((token) => next(addToken(req, token)))
    );
  }

  isRefreshing = true;
  refreshTokenSubject.next(null);

  return authService.getUserData().pipe(
    switchMap((response: any) => {
      isRefreshing = false;

      if (response?.access) {
        setToken(response.access, ACCESS_TOKEN);
        refreshTokenSubject.next(response.access);
      }

      if (response?.refresh) {
        setToken(response.refresh, REFRESH_TOKEN);
      }

      const latestAccessToken = response?.access || getToken(ACCESS_TOKEN);
      return next(latestAccessToken ? addToken(req, latestAccessToken) : req);
    }),
    catchError((error) => {
      isRefreshing = false;
      refreshTokenSubject.next(null);
      return throwError(() => error);
    })
  );
}
