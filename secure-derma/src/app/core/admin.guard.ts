import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '@app/services/auth/auth.service';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AdminGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) { }

    canActivate(): boolean {
        if (this.authService.isLoggedIn()) {
            const user = this.authService?.user;

            if (user.user_type == 1) {
                return true;
            }
            else {
                this.router.navigate(['/share']);
                return false
            }

        } else {
            this.router.navigate(['/']);
            return false;
        }
    }
}