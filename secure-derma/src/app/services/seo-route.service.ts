import { Injectable } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SeoConfig, SeoService } from './seo.service';

@Injectable({
  providedIn: 'root'
})
export class SeoRouteService {
  private initialized = false;

  constructor(
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly seoService: SeoService
  ) {}

  init(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.seoService.setSiteStructuredData();
    this.applyRouteSeo();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.applyRouteSeo());
  }

  private applyRouteSeo(): void {
    const route = this.getDeepestRoute(this.activatedRoute);
    const seo = route.snapshot.data['seo'] as SeoConfig | undefined;

    if (!seo) {
      return;
    }

    this.seoService.updateSeo(seo);
  }

  private getDeepestRoute(route: ActivatedRoute): ActivatedRoute {
    let currentRoute = route;

    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    return currentRoute;
  }
}
