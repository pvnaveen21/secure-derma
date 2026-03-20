import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';
import { CartService } from '../services/cart.service';
import {
  CheckoutCustomerErrors,
  CheckoutSessionItem,
  CheckoutSessionPayload,
  PaymentCustomerPayload,
  PaymentService
} from '../services/payment.service';
import { PincodeService } from '../services/pincode.service';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'app-checkout',
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzDividerModule,
    NzInputModule,
    RouterLink,
  ],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent {
  checkoutCustomer: PaymentCustomerPayload;
  checkoutErrors: CheckoutCustomerErrors = {};
  currentStep = 1;
  validatingDetails = false;
  paymentLoading = false;
  checkoutSession: CheckoutSessionPayload | null = null;
  private postalCodeLookupRequestId = 0;
  private lastResolvedPostalCode = '';

  constructor(
    private paymentService: PaymentService,
    private cartService: CartService,
    private authService: AuthService,
    private pincodeService: PincodeService,
    private router: Router,
    private message: NzMessageService,
    private seoService: SeoService,
  ) {
    this.checkoutCustomer = this.paymentService.loadCheckoutCustomer();
  }

  ngOnInit(): void {
    this.seoService.updateSeo({
      title: 'Checkout',
      description: 'Complete your Secure Derma purchase with secure delivery and payment details.',
      canonicalPath: '/checkout',
      robots: 'noindex,nofollow',
      type: 'website'
    });
    window.scrollTo({ top: 0, behavior: 'auto' });

    if (!this.authService.isLoggedIn()) {
      this.authService.redirectUrl = this.router.url;
      this.router.navigate(['/account/login']);
      return;
    }

    this.checkoutCustomer = this.paymentService.loadCheckoutCustomer();
    this.checkoutSession = this.paymentService.loadCheckoutSession();

    if (!this.checkoutSession?.items?.length) {
      this.message.warning('No checkout items found.');
      this.router.navigate(['/']);
    }
  }

  get items(): CheckoutSessionItem[] {
    return this.checkoutSession?.items || [];
  }

  get subtotal(): number {
    return this.items.reduce((sum, item) => sum + item.lineTotal, 0);
  }

  get totalSavings(): number {
    return this.items.reduce((sum, item) => {
      const originalPrice = item.originalPrice ?? item.unitPrice;
      if (!originalPrice || originalPrice <= item.unitPrice) {
        return sum;
      }

      return sum + ((originalPrice - item.unitPrice) * item.quantity);
    }, 0);
  }

  getItemSavings(item: CheckoutSessionItem): number {
    const originalPrice = item.originalPrice ?? item.unitPrice;
    if (!originalPrice || originalPrice <= item.unitPrice) {
      return 0;
    }

    return (originalPrice - item.unitPrice) * item.quantity;
  }

  getDiscountPercent(item: CheckoutSessionItem): number {
    const originalPrice = item.originalPrice ?? item.unitPrice;
    if (!originalPrice || originalPrice <= item.unitPrice) {
      return 0;
    }

    return Math.round(((originalPrice - item.unitPrice) / originalPrice) * 100);
  }

  get totalItems(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  get isCartCheckout(): boolean {
    return this.checkoutSession?.source === 'cart';
  }

  onCheckoutFieldChange(field: keyof PaymentCustomerPayload, value: string): void {
    this.checkoutCustomer = {
      ...this.checkoutCustomer,
      [field]: this.paymentService.normalizeCheckoutField(field, value)
    };

    if (this.checkoutErrors[field]) {
      const latestErrors = this.paymentService.validateCheckoutCustomer(this.checkoutCustomer);
      this.checkoutErrors = {
        ...this.checkoutErrors,
        [field]: latestErrors[field]
      };
    }

    this.paymentService.saveCheckoutCustomer(this.checkoutCustomer);

    if (field === 'postal_code') {
      void this.autoPopulateLocationFromPostalCode();
    }
  }

  onCheckoutFieldBlur(field: keyof PaymentCustomerPayload): void {
    this.checkoutCustomer = this.paymentService.normalizeCheckoutCustomer(this.checkoutCustomer);
    this.checkoutErrors = {
      ...this.checkoutErrors,
      [field]: this.paymentService.validateCheckoutCustomer(this.checkoutCustomer)[field]
    };
    this.paymentService.saveCheckoutCustomer(this.checkoutCustomer);

    if (field === 'postal_code') {
      void this.autoPopulateLocationFromPostalCode();
    }
  }

  private async autoPopulateLocationFromPostalCode(): Promise<void> {
    const postalCode = this.checkoutCustomer.postal_code;
    if (!/^\d{6}$/.test(postalCode)) {
      return;
    }

    if (postalCode === this.lastResolvedPostalCode) {
      return;
    }

    const requestId = ++this.postalCodeLookupRequestId;

    try {
      const response = await firstValueFrom(
        this.pincodeService.checkServiceability(postalCode)
      );

      if (requestId !== this.postalCodeLookupRequestId) {
        return;
      }

      this.checkoutCustomer = {
        ...this.checkoutCustomer,
        city: response.city || response.location_name || '',
        state: response.state || '',
        postal_code: response.pincode || postalCode,
      };
      this.checkoutErrors = {
        ...this.checkoutErrors,
        city: undefined,
        state: undefined,
        postal_code: undefined,
      };
      this.paymentService.saveCheckoutCustomer(this.checkoutCustomer);
      this.lastResolvedPostalCode = this.checkoutCustomer.postal_code;
    } catch {
      if (requestId !== this.postalCodeLookupRequestId) {
        return;
      }

      this.lastResolvedPostalCode = '';
    }
  }

  async continueToPayment(): Promise<void> {
    if (!this.checkoutSession?.items?.length || this.validatingDetails) {
      return;
    }

    this.validatingDetails = true;
    this.checkoutCustomer = this.paymentService.normalizeCheckoutCustomer(this.checkoutCustomer);
    this.checkoutErrors = this.paymentService.validateCheckoutCustomer(this.checkoutCustomer);
    this.paymentService.saveCheckoutCustomer(this.checkoutCustomer);

    if (Object.keys(this.checkoutErrors).length) {
      this.validatingDetails = false;
      this.message.error('Enter valid delivery and contact details before continuing.');
      return;
    }

    try {
      const response = await firstValueFrom(
        this.pincodeService.checkServiceability(this.checkoutCustomer.postal_code)
      );

      if (!response.serviceable) {
        this.message.error('Delivery is not available for this postal code yet.');
        this.validatingDetails = false;
        return;
      }

      this.checkoutCustomer = {
        ...this.checkoutCustomer,
        city: this.checkoutCustomer.city || response.city || response.location_name || '',
        state: this.checkoutCustomer.state || response.state || '',
        postal_code: response.pincode,
      };
      this.paymentService.saveCheckoutCustomer(this.checkoutCustomer);
      this.currentStep = 2;
    } catch (error: any) {
      const message = typeof error === 'string'
        ? error
        : error?.detail || 'Unable to validate this postal code right now.';
      this.message.error(message);
    } finally {
      this.validatingDetails = false;
    }
  }

  backToDetails(): void {
    this.currentStep = 1;
  }

  async updateItemQuantity(item: CheckoutSessionItem, delta: number): Promise<void> {
    if (!this.checkoutSession) {
      return;
    }

    const nextQuantity = item.quantity + delta;
    if (nextQuantity < 1 || nextQuantity > 10) {
      return;
    }

    try {
      if (this.isCartCheckout) {
        await this.cartService.updateQuantity(item.detailId ?? item.productId, delta);
      }

      this.checkoutSession = {
        ...this.checkoutSession,
        items: this.checkoutSession.items.map((entry) =>
          entry.detailId === item.detailId
            ? {
              ...entry,
              quantity: nextQuantity,
              lineTotal: entry.unitPrice * nextQuantity,
            }
            : entry
        )
      };
      this.paymentService.saveCheckoutSession(this.checkoutSession);
    } catch {
      this.message.error('Unable to update quantity right now.');
    }
  }

  async removeItem(item: CheckoutSessionItem): Promise<void> {
    if (!this.checkoutSession) {
      return;
    }

    try {
      if (this.isCartCheckout) {
        await this.cartService.removeItem(item.detailId ?? item.productId);
      }

      this.checkoutSession = {
        ...this.checkoutSession,
        items: this.checkoutSession.items.filter((entry) => entry.detailId !== item.detailId)
      };

      if (!this.checkoutSession.items.length) {
        this.paymentService.clearCheckoutSession();
        this.message.info('Your checkout is now empty.');
        this.router.navigate(['/']);
        return;
      }

      this.paymentService.saveCheckoutSession(this.checkoutSession);
    } catch {
      this.message.error('Unable to remove this item right now.');
    }
  }

  async payNow(): Promise<void> {
    if (!this.checkoutSession?.items?.length || this.paymentLoading) {
      return;
    }

    this.paymentLoading = true;

    try {
      await this.paymentService.loadRazorpayScript();

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK is unavailable.');
      }

      const order = await firstValueFrom(
        this.paymentService.createRazorpayOrder(
          this.items.map((item) => ({
            productId: item.productId,
            detailId: item.detailId,
            quantity: item.quantity,
          })),
          this.checkoutCustomer
        )
      );

      const razorpay = new window.Razorpay({
        key: order.key_id,
        amount: order.amount_paise,
        currency: order.currency,
        name: 'Secure Derma',
        description: `Order for ${this.totalItems} item(s)`,
        order_id: order.order_id,
        prefill: this.paymentService.getRazorpayPrefill(this.checkoutCustomer),
        theme: {
          color: '#1a5944'
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await firstValueFrom(this.paymentService.verifyRazorpayPayment(response));
            if (this.checkoutSession?.source === 'cart') {
              await this.cartService.clearCart();
            }
            this.paymentService.clearCheckoutSession();
            this.message.success('Payment completed successfully.');
            this.router.navigate(['/account/orders']);
          } catch (error) {
            console.error('Payment verification failed:', error);
            this.message.error('Payment received, but verification failed. Please contact support.');
          } finally {
            this.paymentLoading = false;
          }
        },
        modal: {
          ondismiss: () => {
            this.paymentLoading = false;
          }
        }
      });

      razorpay.on('payment.failed', () => {
        this.paymentLoading = false;
        this.message.error('Payment failed. Please try again.');
      });

      razorpay.open();
    } catch (error) {
      console.error('Checkout failed:', error);
      this.paymentLoading = false;
      const errorMessage =
        typeof error === 'string'
          ? error
          : (error as any)?.detail || 'Unable to start payment right now.';
      this.message.error(errorMessage);
    }
  }
}
