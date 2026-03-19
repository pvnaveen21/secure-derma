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

export interface CheckoutSessionItem extends PaymentCartItemPayload {
  productName: string;
  thumbnail?: string;
  productWeight?: string;
  weightType?: string;
  qualityLabel?: string;
  unitPrice: number;
  originalPrice?: number;
  lineTotal: number;
}

export interface CheckoutSessionPayload {
  source: 'cart' | 'buy_now';
  items: CheckoutSessionItem[];
}

export interface PaymentCustomerPayload {
  name: string;
  email: string;
  contact: string;
  address: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
}

export type CheckoutCustomerErrors = Partial<Record<keyof PaymentCustomerPayload, string>>;

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
  private readonly checkoutCustomerStorageKey = 'secure_derma_checkout_customer';
  private readonly checkoutSessionStorageKey = 'secure_derma_checkout_session';

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

  loadCheckoutCustomer(): PaymentCustomerPayload {
    if (typeof window === 'undefined') {
      return this.getEmptyCheckoutCustomer();
    }

    try {
      const rawValue = localStorage.getItem(this.checkoutCustomerStorageKey);
      if (!rawValue) {
        return this.getEmptyCheckoutCustomer();
      }

      const parsedValue = JSON.parse(rawValue) as Partial<PaymentCustomerPayload>;
      return this.normalizeCheckoutCustomer(parsedValue);
    } catch {
      return this.getEmptyCheckoutCustomer();
    }
  }

  saveCheckoutCustomer(customer: Partial<PaymentCustomerPayload>): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(
      this.checkoutCustomerStorageKey,
      JSON.stringify(this.normalizeCheckoutCustomer(customer))
    );
  }

  getEmptyCheckoutCustomer(): PaymentCustomerPayload {
    return {
      name: '',
      email: '',
      contact: '',
      address: '',
      address_line_2: '',
      city: '',
      state: '',
      postal_code: '',
    };
  }

  normalizeCheckoutField(field: keyof PaymentCustomerPayload, value: unknown): string {
    const stringValue = String(value ?? '');

    switch (field) {
      case 'name':
      case 'city':
      case 'state':
        return stringValue.replace(/\s+/g, ' ').trimStart();
      case 'email':
        return stringValue.trim().toLowerCase();
      case 'contact':
        return stringValue.replace(/\D/g, '').slice(0, 10);
      case 'postal_code':
        return stringValue.replace(/\D/g, '').slice(0, 6);
      case 'address':
      case 'address_line_2':
        return stringValue.replace(/\s+/g, ' ').trimStart();
      default:
        return stringValue.trim();
    }
  }

  normalizeCheckoutCustomer(customer: Partial<PaymentCustomerPayload>): PaymentCustomerPayload {
    const baseCustomer = this.getEmptyCheckoutCustomer();

    return {
      name: this.normalizeCheckoutField('name', customer.name ?? baseCustomer.name).trim(),
      email: this.normalizeCheckoutField('email', customer.email ?? baseCustomer.email),
      contact: this.normalizeCheckoutField('contact', customer.contact ?? baseCustomer.contact),
      address: this.normalizeCheckoutField('address', customer.address ?? baseCustomer.address).trim(),
      address_line_2: this.normalizeCheckoutField('address_line_2', customer.address_line_2 ?? baseCustomer.address_line_2).trim(),
      city: this.normalizeCheckoutField('city', customer.city ?? baseCustomer.city).trim(),
      state: this.normalizeCheckoutField('state', customer.state ?? baseCustomer.state).trim(),
      postal_code: this.normalizeCheckoutField('postal_code', customer.postal_code ?? baseCustomer.postal_code),
    };
  }

  validateCheckoutCustomer(customer: Partial<PaymentCustomerPayload>): CheckoutCustomerErrors {
    const normalizedCustomer = this.normalizeCheckoutCustomer(customer);
    const errors: CheckoutCustomerErrors = {};

    if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(normalizedCustomer.name)) {
      errors.name = 'Enter the full name shown on the delivery address.';
    }

    if (normalizedCustomer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedCustomer.email)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!/^[6-9]\d{9}$/.test(normalizedCustomer.contact)) {
      errors.contact = 'Enter a valid 10-digit mobile number.';
    }

    if (normalizedCustomer.address.length < 10 || normalizedCustomer.address.length > 255) {
      errors.address = 'Enter a complete address with house number, street, or area.';
    }

    if (normalizedCustomer.address_line_2 && normalizedCustomer.address_line_2.length > 255) {
      errors.address_line_2 = 'Address line 2 is too long.';
    }

    if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(normalizedCustomer.city)) {
      errors.city = 'Enter a valid city name.';
    }

    if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(normalizedCustomer.state)) {
      errors.state = 'Enter a valid state name.';
    }

    if (!/^\d{6}$/.test(normalizedCustomer.postal_code)) {
      errors.postal_code = 'Enter a valid 6-digit postal code.';
    }

    return errors;
  }

  getRazorpayPrefill(customer: Partial<PaymentCustomerPayload>): Pick<PaymentCustomerPayload, 'name' | 'email' | 'contact'> {
    const normalizedCustomer = this.normalizeCheckoutCustomer(customer);

    return {
      name: normalizedCustomer.name,
      email: normalizedCustomer.email,
      contact: normalizedCustomer.contact,
    };
  }

  saveCheckoutSession(payload: CheckoutSessionPayload): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.checkoutSessionStorageKey, JSON.stringify(payload));
  }

  loadCheckoutSession(): CheckoutSessionPayload | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const rawValue = localStorage.getItem(this.checkoutSessionStorageKey);
      if (!rawValue) {
        return null;
      }

      const parsedValue = JSON.parse(rawValue) as CheckoutSessionPayload;
      if (!Array.isArray(parsedValue?.items) || !parsedValue.items.length) {
        return null;
      }

      return parsedValue;
    } catch {
      return null;
    }
  }

  clearCheckoutSession(): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.removeItem(this.checkoutSessionStorageKey);
  }
}
