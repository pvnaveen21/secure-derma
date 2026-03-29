import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { VisitTrackingService } from './visit-tracking.service';

@Injectable({
  providedIn: 'root'
})
export class VisitRouteService {
  private initialized = false;
  private lastTrackedPath = '';

  constructor(
    private readonly router: Router,
    private readonly visitTrackingService: VisitTrackingService
  ) {}

  init(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.visitTrackingService.init();
    this.trackCurrentPath(this.router.url);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navigationEvent = event as NavigationEnd;
        this.trackCurrentPath(navigationEvent.urlAfterRedirects);
      });
  }

  private trackCurrentPath(path: string): void {
    const normalizedPath = this.normalizePath(path);

    if (!normalizedPath || normalizedPath === this.lastTrackedPath) {
      return;
    }

    this.lastTrackedPath = normalizedPath;
    this.visitTrackingService.trackPageView(normalizedPath).subscribe();
  }

  private normalizePath(path: string): string {
    return path.split('?')[0].split('#')[0];
  }
}
