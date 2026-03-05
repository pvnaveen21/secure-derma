import { Injectable } from '@angular/core';
import { InterfaceService } from '../core/interface.service';
import { HttpClient } from '@angular/common/http';
import { catchError, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductTypeService extends InterfaceService {

  constructor(http: HttpClient) {
    super("/auth", http)
  }

  getAllProductType() {
    return this.http.get(
      this.getApiUrl(`/product-types/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }


  addProductType(payload: any) {
    return this.saveProductType('POST', payload);
  }

  updateProductType(id: any, payload: any) {
    return this.saveProductType('PUT', payload, id);
  }

  private saveProductType(
    method: 'POST' | 'PUT',
    payload: any,
    id?: any
  ) {
    const formData = this.buildFormData(payload);

    const url = id
      ? this.getApiUrl(`/product-types/${id}/`)
      : this.getApiUrl(`/product-types/`);

    const request$ =
      method === 'POST'
        ? this.http.post(url, formData)
        : this.http.put(url, formData);

    return request$.pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  private buildFormData(payload: any): FormData {
    const formData = new FormData();

    Object.keys(payload).forEach(key => {
      const value = payload[key];

      if (value === null || value === undefined) return;

      // File handling
      if (value instanceof File) {
        formData.append(key, value);
      }
      // Boolean handling
      else if (typeof value === 'boolean') {
        formData.append(key, String(value));
      }
      // Normal values      
      else if (key != 'image'){
        formData.append(key, value);
      }
      console.log(value);

    });

    return formData;
  }



  deleteProductType(id: any) {
    return this.http.delete(
      this.getApiUrl(`/product-types/${id}/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }
  

}
