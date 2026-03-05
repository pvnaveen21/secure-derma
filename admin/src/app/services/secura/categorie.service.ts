import { Injectable } from '@angular/core';
import { InterfaceService } from '../core/interface.service';
import { HttpClient } from '@angular/common/http';
import { catchError, map } from 'rxjs';
import { ACCESS_TOKEN, getToken } from '@app/core/token';
@Injectable({
  providedIn: 'root'
})
export class CategorieService extends InterfaceService {

  constructor(http: HttpClient) {
    super("/auth", http);
  }

  getAllCategories() {
    return this.http.get(
      this.getApiUrl(`/categories/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  addCategories(payload: any) {
    const formData = this.toFormData(payload);

    return this.http.post(
      this.getApiUrl(`/categories/`),
      formData,
      this.getFormDataOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  updateCategories(id: any, payload: any) {
    const formData = this.toFormData(payload);

    return this.http.put(
      this.getApiUrl(`/categories/${id}/`),
      formData,
      this.getFormDataOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  deleteCategories(id: any) {
    return this.http.delete(
      this.getApiUrl(`/categories/${id}/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  private toFormData(payload: any): FormData {
    const formData = new FormData();

    Object.keys(payload).forEach(key => {
      if (payload[key] !== null && payload[key] !== undefined) {
        if (key == 'image' && payload[key] instanceof File) {
          formData.append(key, payload[key])
        }
        else if (key != 'image') {
          formData.append(key, payload[key])
        }
      }
    });

    return formData;
  }

  private getFormDataOptions() {
    return {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Authorization': `Bearer ${getToken(ACCESS_TOKEN)}`
      }
    };
  }
}
