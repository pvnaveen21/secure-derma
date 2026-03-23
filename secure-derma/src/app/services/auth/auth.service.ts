import { Injectable } from '@angular/core';
import { InterfaceService } from '@app/services/core/interface.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, map, catchError, timer, takeUntil, take, tap, throwError } from 'rxjs';
import {
  ACCESS_TOKEN,
  getToken,
  getTokenExpiration,
  REFRESH_TOKEN,
  setToken,
  unsetToken
} from '@app/core/token';
import { User } from '@app/models/users';
import { CartService } from '../cart.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService extends InterfaceService {

  redirectUrl: string | null = null;
  user!: User;
  private stopTimer = new Subject();
  private userSource = new BehaviorSubject<User>(new User());
  user$: Observable<User> = this.userSource.asObservable();
  private userPermissionsSource = new BehaviorSubject<Array<string>>([]);
  userPermissions$: Observable<Array<string>> = this.userPermissionsSource.asObservable();
  userPermissions: Array<any> = [];

  constructor(
    http: HttpClient,
    private router: Router,
    private cartService: CartService,
  ) {
    super("/auth", http);
  }

  googleLogin(payload: any): Promise<any> {
    return new Promise((resolve, reject) => {

      this.http.post(
        this.getApiUrl('/auth/google/'),
        payload,
        this.getHttpOptions("json")
      ).subscribe({

        next: (response: any) => {
          // Save tokens
          setToken(response.access, ACCESS_TOKEN);
          setToken(response.refresh, REFRESH_TOKEN);

          this.cartService.syncGuestCartToServer()
            .then(() => this.getUserDetails())
            .then(user => resolve(user))
            .catch(error => reject(error));
        },

        error: (error) => {
          reject(error.error);
        }

      });

    });
  }

  loadAppData(): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      if (getToken(REFRESH_TOKEN)) {
        this.getUserData().subscribe({
          next: (response: any) => {
            if (response['access']) {
              setToken(response['access'], ACCESS_TOKEN);
            }
            if (response['refresh']) {
              setToken(response['refresh'], REFRESH_TOKEN);
            }

            this.cartService.syncGuestCartToServer()
              .then(() => this.getUserDetails(false, false))
              .then(user => resolve(user))
              .catch(error => reject(error));
          },
          error: (error: any) => {
            if (getToken(ACCESS_TOKEN)) {
              this.getUserDetails(true, false)
                .then(user => resolve(user))
                .catch(() => resolve(error));
              return;
            }

            this.setUser();
            resolve(error);
          }
        })
      } else if (getToken(ACCESS_TOKEN)) {
        this.getUserDetails(true, false)
          .then(user => resolve(user))
          .catch(error => resolve(error));
      } else {
        this.setUser();
        resolve('');
      }
    });
  }

  login(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http.post(this.getApiUrl('/auth/login/'), data, this.getHttpOptions("json")).subscribe({
        next: (response: any) => {
          setToken(response.access, ACCESS_TOKEN);
          setToken(response.refresh, REFRESH_TOKEN);
          this.cartService.syncGuestCartToServer()
            .then(() => this.getUserDetails())
            .then(user => resolve(user))
            .catch(error => reject(error));
        },
        error: (error) => {
          reject(error.error);
        }
      });
    })
  }

  sendOtp(payload: { phone?: string; email?: string; }): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http.post(
        this.getApiUrl('/auth/sendotp/'),
        payload,
        this.getHttpOptions('json', { auth: false })
      ).subscribe({
        next: (response: any) => resolve(response),
        error: (error) => reject(error.error),
      });
    });
  }

  verifyOtp(payload: { phone?: string; email?: string; otp: string; }): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http.post(
        this.getApiUrl('/auth/otp-verify/'),
        payload,
        this.getHttpOptions('json', { auth: false })
      ).subscribe({
        next: (response: any) => {
          setToken(response.access, ACCESS_TOKEN);
          setToken(response.refresh, REFRESH_TOKEN);
          this.cartService.syncGuestCartToServer()
            .then(() => this.getUserDetails())
            .then(user => resolve(user))
            .catch(error => reject(error));
        },
        error: (error) => {
          reject(error.error);
        }
      });
    });
  }

  changePassword(data: any) {
    return this.http
      .post(this.getApiUrl('/users/user/change-password/'), data, this.getHttpOptions('json', { auth: true }))
      .pipe(
        map(response => response),
        catchError(this.handleError)
      );
  }

  setUser(details?: any): void {
    if (!(details instanceof Object)) details = {};

    this.userPermissionsSource.next(details?.permissions || []);
    this.userPermissions = details?.permissions || [];
    this.userSource.next(new User(details));
    this.user = new User(details);
    if (details && details.permissions) {
      // delete details.permissions;
    }
  }

  getUserDetails(dontRefresh = false, navigateAfterLoad = true): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http.get(this.getApiUrl(`/users/user/me/`), this.getHttpOptions()).subscribe({
        next: (user: any) => {
          this.setUser(user);
          if (!dontRefresh) {
            this.stopTimer.next(true);
            this.refreshTokenTimer();
          }
          if (navigateAfterLoad && this.redirectUrl) {
            const redirectUrl = this.redirectUrl;
            this.redirectUrl = null;
            this.router.navigateByUrl(redirectUrl);
          } else if (navigateAfterLoad) {
            this.router.navigate(['/']);
          }
          resolve(user);
        },
        error: (error) => {
          reject(error.error);
        }
      });
    })
  }

  getUserData(): Observable<any> {
    const refreshToken = getToken(REFRESH_TOKEN);
    if (!refreshToken) {
      return throwError(() => new Error('Refresh token is missing.'));
    }

    return this.http
      .post(this.getApiUrl('/auth/token/refresh/'), { refresh: refreshToken }, this.getHttpOptions('json', { auth: false }))
      .pipe(
        map(response => response),
        catchError((error) => {
          if (error instanceof HttpErrorResponse && (error.status === 400 || error.status === 401)) {
            unsetToken();
            this.stopTimer.next(true);
            this.setUser();
          }

          return this.handleError(error);
        })
      );
  }

  updateProfile(data: { username: string; email: string; phone: string; }): Observable<any> {
    return this.http.patch(
      this.getApiUrl('/users/user/me/'),
      data,
      this.getHttpOptions('json')
    ).pipe(
      tap((user: any) => this.setUser(user)),
      map((response) => response),
      catchError(this.handleError)
    );
  }

  refreshTokenTimer() {
    const now = new Date().valueOf();
    const exp = getTokenExpiration(ACCESS_TOKEN) as Date;
    if (!exp) {
      return;
    }

    const delay = Math.max(exp.valueOf() - now, 0);

    const time = timer(Math.max(delay - (60 * 1000), 0));

    time.pipe(takeUntil(this.stopTimer)).subscribe(() => {
      this.getUserData().subscribe({
        next: (response: any) => {
          if (response?.access) {
            setToken(response.access, ACCESS_TOKEN);
          }
          if (response?.refresh) {
            setToken(response.refresh, REFRESH_TOKEN);
          }
          this.stopTimer.next(false);
          timer(100).pipe(take(1)).subscribe({
            next: () => {
              this.stopTimer.next(true);
              this.refreshTokenTimer();
            }
          });
          this.getUserDetails(true, false).then(user => user).catch(error => error);
        },
        error: () => {
          this.stopTimer.next(true);
        }
      });
    });
  }


  logout() {
    return this.http
      .post(this.getApiUrl('/auth/logout/'), { 'refresh': getToken(REFRESH_TOKEN) }, this.getHttpOptions('json')).subscribe({
        next: () => {
          unsetToken();
          void this.cartService.hydrateCart();
          this.router.navigate(['/account/login']).then(res => res).catch(error => {
          });
        },
        error: () => {
          unsetToken();
          void this.cartService.hydrateCart();
          this.router.navigate(['/account/login']).then(res => res).catch(error => {
          });
        }
      })
  }

  twoFALogin(data: { code: string; user_id: number; }): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http.post(this.getApiUrl('/auth/twoFA/'), data, this.getHttpOptions('json', {
        auth: false,
        allowCredentials: true
      })).subscribe({
        next: (response: any) => {
          setToken(response.token, ACCESS_TOKEN);
          this.cartService.syncGuestCartToServer()
            .then(() => this.getUserDetails())
            .then(user => resolve(user))
            .catch(error => reject(error));
        },
        error: (error) => {
          reject(error.error);
        }
      })
    })
  }

  isLoggedIn() {
    return !!getToken(ACCESS_TOKEN) || !!getToken(REFRESH_TOKEN);
  }

  redirectToLogin() {
    this.router.navigate(['/account/login']).then(() => {
    });
  }

  redirectToHome() {
    if (this.redirectUrl) {
      // Decode before redirecting to prevent encoding issues
      const decodedUrl = decodeURIComponent(this.redirectUrl);
      this.router.navigateByUrl(decodedUrl).then(res => res);
      this.redirectUrl = null;
    } else {
      this.router.navigate(['/']).then(() => {
      });
    }
  }

  public requestEnable2FA(): Observable<any> {
    return this.http.get(this.getApiUrl('/auth/enable2fa/'), this.getHttpOptions()).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  public enable2FA(data: any): Observable<any> {
    return this.http.post(this.getApiUrl('/auth/enable2fa/'), data, this.getHttpOptions()).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  public checkUser() {
    this.getUserDetails().then().catch();
  }

  public permitted(roles: Array<string>, userTypes?: Array<string> | null) {
    // Checking for user type permission
    // if (userTypes && (!(userTypes instanceof Array) || (userTypes.indexOf(this.user.user_type) < 0))) {
    //     return false;
    // }

    if (!(this.user)) return false;
    else {
      return intersect(this.userPermissions, roles).length == roles.length;
    }


    function intersect(a: any, b: any) {
      let t;
      if (b.length > a.length) t = b, b = a, a = t; // indexOf to loop over shorter
      return a.filter((e: any) => b.indexOf(e) > -1).filter((e: any, i: any, c: any) => c.indexOf(e) === i);// extra step to remove duplicates
    }
  }

  updateCurrentPassword(data: any): Observable<any> {
    return this.http.post(this.getApiUrl('/auth/change-password/'), data, this.getHttpOptions()).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

}
