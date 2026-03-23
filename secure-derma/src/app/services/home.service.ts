import { Injectable, Injector } from '@angular/core';
import { InterfaceService } from './core/interface.service';
import { HttpClient } from '@angular/common/http';
import { catchError, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HomeService extends InterfaceService {


  constructor(
    http: HttpClient,
    injector: Injector,
  ) {
    super('', http);
  }



  getTopBrandsList() {
    return this.http.get(
      this.getApiUrl(`/top-brands/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  getHomeCategoryList() {
    return this.http.get(
      this.getApiUrl(`/product-types/home/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  getBannerImages() {
    return this.http.get(
      this.getApiUrl(`/images/landing-page/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }
  getTrendingProductList() {
    return this.http.get(
      this.getApiUrl(`/products/trending/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  getImageByType(type:any) {
    return this.http.get(
      this.getApiUrl(`/images/?type=${type}`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  getProductsByConcern(concern: string, limit = 12) {
    return this.http.get(
      this.getApiUrl(`/concern-products/?concern=${encodeURIComponent(concern)}&limit=${limit}`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  buildRoutine(payload: { skin_type: string; concern: string; budget: string }) {
    return this.http.post(
      this.getApiUrl(`/routine-builder/`),
      payload,
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  subscribeToNewsletter(payload: { email: string }) {
    return this.http.post(
      this.getApiUrl(`/newsletter-subscriptions/`),
      payload,
      this.getHttpOptions('json', { auth: false })
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }
}
