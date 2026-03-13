import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { catchError, map, Observable } from 'rxjs';
import { InterfaceService } from './core/interface.service';

export interface PaymentCartItemPayload {
  productId: number;
  detailId?: number;
  quantity: number;
}

export interface PaymentCustomerPayload {
  name?: string;
  email?: string;
  contact?: string;
}

export interface RazorpayOrderResponse {
  key_id: string;
  amount: number;
  amount_paise: number;
  currency: string;
  order_id: string;
  receipt: string;
  cart_summary: Array<{
    product_id: number;
    detail_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}

export interface RazorpayVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: (response: unknown) => void) => void;
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService extends InterfaceService {
  private readonly razorpayScriptId = 'razorpay-checkout-script';

  constructor(
    http: HttpClient,
    @Inject(DOCUMENT) private document: Document
  ) {
    super('', http);
  }

  createRazorpayOrder(items: PaymentCartItemPayload[], customer?: PaymentCustomerPayload): Observable<RazorpayOrderResponse> {
    return this.http.post<RazorpayOrderResponse>(
      this.getApiUrl('/payments/create-order/'),
      { items, customer },
      this.getHttpOptions()
    ).pipe(
      map((res) => res),
      catchError(this.handleError)
    );
  }

  verifyRazorpayPayment(payload: RazorpayVerifyPayload): Observable<{ verified: boolean }> {
    return this.http.post<{ verified: boolean }>(
      this.getApiUrl('/payments/verify/'),
      payload,
      this.getHttpOptions()
    ).pipe(
      map((res) => res),
      catchError(this.handleError)
    );
  }

  loadRazorpayScript(): Promise<void> {
    if (typeof window !== 'undefined' && window.Razorpay) {
      return Promise.resolve();
    }

    const existingScript = this.document.getElementById(this.razorpayScriptId) as HTMLScriptElement | null;
    if (existingScript?.dataset['loaded'] === 'true') {
      return Promise.resolve();
    }

    if (existingScript) {
      return new Promise((resolve, reject) => {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Razorpay SDK.')), { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = this.document.createElement('script');
      script.id = this.razorpayScriptId;
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        script.dataset['loaded'] = 'true';
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Razorpay SDK.'));
      this.document.body.appendChild(script);
    });
  }
}
