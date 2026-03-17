import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable } from 'rxjs';
import { InterfaceService } from './core/interface.service';

export interface AccountOrderItem {
  id: number;
  product_id: number;
  product_detail_id: number;
  product_name: string;
  product_slug: string;
  thumbnail: string;
  product_weight?: string;
  weight_type?: string;
  quality_label?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  original_price: number;
}

export interface AccountOrder {
  id: number;
  order_number: string;
  status: string;
  amount_rupees: number;
  original_total_rupees?: number;
  subtotal_rupees?: number;
  shipping_rupees?: number;
  currency: string;
  created_at: string;
  updated_at: string;
  payment_status?: string;
  payment_id?: string;
  paid_at?: string;
  item_count: number;
  savings_rupees: number;
  customer_name?: string;
  customer_address?: string;
  customer_address_line_2?: string;
  customer_city?: string;
  customer_state?: string;
  customer_postal_code?: string;
  shipping_name?: string;
  shipping_address?: string;
  shipping_landmark?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_pincode?: string;
  shipping_provider?: string;
  shipping: {
    name: string;
    address: string;
    landmark: string;
    city: string;
    state: string;
    pincode: string;
  };
  items: AccountOrderItem[];
}

@Injectable({
  providedIn: 'root'
})
export class OrdersService extends InterfaceService {
  constructor(http: HttpClient) {
    super('', http);
  }

  getOrders(): Observable<{ count: number; results: AccountOrder[] }> {
    return this.http.get<{ count: number; results: AccountOrder[] }>(
      this.getApiUrl('/orders/'),
      this.getHttpOptions()
    ).pipe(
      map((res) => res),
      catchError(this.handleError)
    );
  }

  getOrderDetail(orderId: number): Observable<AccountOrder> {
    return this.http.get<AccountOrder>(
      this.getApiUrl(`/orders/${orderId}/`),
      this.getHttpOptions()
    ).pipe(
      map((res) => res),
      catchError(this.handleError)
    );
  }
}
