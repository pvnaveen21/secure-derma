import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map } from 'rxjs';
import { InterfaceService } from '../core/interface.service';

export type OrderAnalyticsGrouping = 'day' | 'month';

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

  getOrderAnalytics(grouping: OrderAnalyticsGrouping = 'day', periods?: number, anchorMonth?: string) {
    return this.http.get(
      this.getApiUrl('/orders/analytics/', {
        grouping,
        ...(periods ? { periods } : {}),
        ...(anchorMonth ? { anchor_month: anchorMonth } : {})
      }),
      this.getHttpOptions()
    ).pipe(
      map((res) => res),
      catchError(this.handleError)
    );
  }

  getOrders(limit = 10, offset = 0, status = '', searchText = '', paidOn = '') {
    return this.http.get(
      this.getApiUrl('/orders/', {
        limit,
        offset,
        ...(status ? { status } : {}),
        ...(searchText ? { searchText } : {}),
        ...(paidOn ? { paid_on: paidOn } : {})
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
