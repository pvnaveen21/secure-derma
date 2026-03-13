import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map } from 'rxjs';
import { InterfaceService } from '../core/interface.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService extends InterfaceService {

  constructor(http: HttpClient) {
    super('/orders', http);
  }

  getOrderSummary() {
    return this.http.get(
      this.getApiUrl('/orders/summary/'),
      this.getHttpOptions()
    ).pipe(
      map((res) => res),
      catchError(this.handleError)
    );
  }

  getOrders(limit = 10, offset = 0, status = '', searchText = '') {
    return this.http.get(
      this.getApiUrl('/orders/', {
        limit,
        offset,
        ...(status ? { status } : {}),
        ...(searchText ? { searchText } : {})
      }),
      this.getHttpOptions()
    ).pipe(
      map((res) => res),
      catchError(this.handleError)
    );
  }

  getOrderDetail(id: number) {
    return this.http.get(
      this.getApiUrl(`/orders/${id}/`),
      this.getHttpOptions()
    ).pipe(
      map((res) => res),
      catchError(this.handleError)
    );
  }
}
