import { HttpClient } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { catchError, map } from 'rxjs';
import { InterfaceService } from './core/interface.service';
@Injectable({
  providedIn: 'root'
})
export class ProductService extends InterfaceService {


  constructor(
    http: HttpClient,
    injector: Injector,
  ) {
    super('', http);
  }



  getProducetDetail(value: any) {
    return this.http.get(
      this.getApiUrl(`/products/${value}`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

}