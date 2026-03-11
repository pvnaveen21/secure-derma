import { HttpClient } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { catchError, map } from 'rxjs';
import { InterfaceService } from './core/interface.service';

@Injectable({
  providedIn: 'root'
})
export class HeaderService extends InterfaceService {


  constructor(
    http: HttpClient,
    injector: Injector,
  ) {
    super('', http);
  }

  getBrandsList() {
    return this.http.get(
      this.getApiUrl(`/brands/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  searchBrands(searchText: any) {
    return this.http.get(
      this.getApiUrl(`/brands/?searchText=${searchText}`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
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


  getHairBannerList() {
    return this.http.get(
      this.getApiUrl(`/hair-banner/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }
  getSupplementBannerList() {
    return this.http.get(
      this.getApiUrl(`/supplement-banner/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }
  getSkinBannerList() {
    return this.http.get(
      this.getApiUrl(`/skin-banner/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }
}