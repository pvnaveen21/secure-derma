import { Injectable } from '@angular/core';
import { InterfaceService } from '../core/interface.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map } from 'rxjs';
import { ACCESS_TOKEN, getToken } from '@app/core/token';
@Injectable({
  providedIn: 'root'
})
export class BrandsService extends InterfaceService {

  constructor(http: HttpClient) {
    super("/auth", http)
  }


  getAllBrands() {
    return this.http.get(
      this.getApiUrl(`/brands/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  addBrands(payload: any) {
    const formData = new FormData();

    Object.keys(payload).forEach(key => {
      const value = payload[key];

      if (value === null || value === undefined) return;

      if (value instanceof File) {
        formData.append(key, value);
      }
      else if (typeof value === 'boolean') {
        formData.append(key, value ? 'true' : 'false');
      }
      else {
        formData.append(key, value);
      }
    });
    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'Authorization': `Bearer ${getToken(ACCESS_TOKEN)}`
    }

    return this.http.post(
      this.getApiUrl('/brands/'),
      formData,
      { headers }
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }


  updateBrands(id: any, payload: any) {
    const formData = new FormData();

    Object.keys(payload).forEach(key => {
      const value = payload[key];

      if (value === null || value === undefined) return;

      if (value instanceof File && key == 'brand_image') {
        formData.append(key, value);
      }
      else if (key != 'brand_image'){
        formData.append(key, value);
      }
    });
    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'Authorization': `Bearer ${getToken(ACCESS_TOKEN)}`
    };
    return this.http.put(
      this.getApiUrl(`/brands/${id}/`),
      formData,
      { headers }
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );

  }
  deleteBrand(id: any) {
    return this.http.delete(
      this.getApiUrl(`/brands/${id}/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

}
