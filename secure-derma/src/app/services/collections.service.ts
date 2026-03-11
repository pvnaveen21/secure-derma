import { Injectable, Injector } from '@angular/core';
import { InterfaceService } from './core/interface.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CollectionsService extends InterfaceService {


  constructor(
    http: HttpClient,
    injector: Injector,
  ) {
    super('', http);
  }

  getBanner(type: any) {
    return this.http.get(
      this.getApiUrl(`/collection-banner/?bannerType=${type}`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  getProductsList(type: any, filters?: any, pagination?: { limit?: number; offset?: number }): Observable<any> {
    let params = new HttpParams();

    // Add the main filter type
    params = params.set('filter', type);

    // Add additional filter parameters
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.append(key, filters[key]);
        }
      });
    }

    if (pagination?.limit) {
      params = params.set('limit', String(pagination.limit));
    }
    if (pagination?.offset !== undefined) {
      params = params.set('offset', String(pagination.offset));
    }

    // The final URL will be like: /filter-products/?filter=hair&hair_concern=dandruff,hair-fall
    return this.http.get(
      this.getApiUrl(`/filter-products/`),
      { ...this.getHttpOptions(), params }
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }
  getProducetSideMenu() {
    return this.http.get(
      this.getApiUrl(`/products-side-menu-filter/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }
}
