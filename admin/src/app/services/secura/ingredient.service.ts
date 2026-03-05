import { Injectable } from '@angular/core';
import { InterfaceService } from '../core/interface.service';
import { HttpClient } from '@angular/common/http';
import { catchError, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IngredientService extends InterfaceService {

  constructor(http: HttpClient) {
    super("/auth", http)
  }

  getAllIngredient() {
    return this.http.get(
      this.getApiUrl(`/ingredient/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  addIngredient(payload: any) {
    return this.http.post(
      this.getApiUrl(`/ingredient/`), payload,
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  updateIngredient(id: any, payload: any) {
    return this.http.put(
      this.getApiUrl(`/ingredient/${id}/`), payload,
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }
  deleteIngredient(id: any) {
    return this.http.delete(
      this.getApiUrl(`/ingredient/${id}/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

}
