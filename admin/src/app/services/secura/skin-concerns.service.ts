import { Injectable } from '@angular/core';
import { InterfaceService } from '../core/interface.service';
import { HttpClient } from '@angular/common/http';
import { catchError, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SkinConcernsService extends InterfaceService {

  constructor(http: HttpClient) {
    super("/auth", http)
  }

  getAllSkinConcerns() {
    return this.http.get(
      this.getApiUrl(`/skin-concerns/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  addSkinConcerns(payload: any) {
    return this.http.post(
      this.getApiUrl(`/skin-concerns/`), payload,
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  updateSkinConcerns(id: any, payload: any) {
    return this.http.put(
      this.getApiUrl(`/skin-concerns/${id}/`), payload,
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }
  deleteSkinConcerns(id: any) {
    return this.http.delete(
      this.getApiUrl(`/skin-concerns/${id}/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

}
