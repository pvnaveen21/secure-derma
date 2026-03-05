import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { AuthService } from '@app/services/auth/auth.service';
import { ACCESS_TOKEN, getToken, isTokenExpired, REFRESH_TOKEN, setToken, unsetToken } from '@app/core/token';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);

    // Skip adding auth header for token refresh and login requests
    if (req.url.includes('/auth/token/refresh/') || req.url.includes('/auth/login/') || req.url.includes('/auth/google/')) {
        return next(req);
    }

    const token = getToken(ACCESS_TOKEN);

    // If token exists but is expired, proactively refresh before making the request
    if (token && isTokenExpired(ACCESS_TOKEN) && !isRefreshing) {
        return handleTokenRefresh(req, next, authService);
    }

    // Clone the request with the auth header if token exists
    const authReq = token ? addTokenToRequest(req, token) : req;

    return next(authReq).pipe(
        catchError(error => {
            if (error instanceof HttpErrorResponse && error.status === 401) {
                // Token might have expired between check and request
                return handleTokenRefresh(req, next, authService);
            }
            return throwError(() => error);
        })
    );
};

function addTokenToRequest(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
    });
}

function handleTokenRefresh(req: HttpRequest<any>, next: HttpHandlerFn, authService: AuthService) {
    if (!isRefreshing) {
        isRefreshing = true;
        refreshTokenSubject.next(null);

        const refreshToken = getToken(REFRESH_TOKEN);

        if (!refreshToken || isTokenExpired(REFRESH_TOKEN)) {
            // Refresh token is also expired, force logout
            isRefreshing = false;
            unsetToken();
            authService.redirectToLogin();
            return throwError(() => new Error('Session expired. Please login again.'));
        }

        return authService.getUserData().pipe(
            switchMap((response: any) => {
                isRefreshing = false;

                if (response.access) {
                    setToken(response.access, ACCESS_TOKEN);
                }
                if (response.refresh) {
                    setToken(response.refresh, REFRESH_TOKEN);
                }

                refreshTokenSubject.next(response.access);

                // Retry the original request with new token
                return next(addTokenToRequest(req, response.access));
            }),
            catchError(err => {
                isRefreshing = false;
                unsetToken();
                authService.redirectToLogin();
                return throwError(() => err);
            })
        );
    } else {
        // Another request is already refreshing the token
        // Wait until the new token is available, then retry
        return refreshTokenSubject.pipe(
            filter(token => token !== null),
            take(1),
            switchMap(token => {
                return next(addTokenToRequest(req, token!));
            })
        );
    }
}