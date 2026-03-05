import { Injectable } from '@angular/core';
import { InterfaceService } from '../core/interface.service';
import { HttpClient } from '@angular/common/http';
import { catchError, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HairConcernsService extends InterfaceService {

  constructor(http: HttpClient) {
    super("/auth", http)
  }
  getAllHairConcerns() {
    return this.http.get(
      this.getApiUrl(`/hair-concerns/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }


  addHairConcerns(payload: any) {
    return this.http.post(
      this.getApiUrl(`/hair-concerns/`), payload,
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  updateHairConcerns(id: any, payload: any) {
    return this.http.put(
      this.getApiUrl(`/hair-concerns/${id}/`), payload,
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }
  deleteHairConcerns(id: any) {
    return this.http.delete(
      this.getApiUrl(`/hair-concerns/${id}/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

}
