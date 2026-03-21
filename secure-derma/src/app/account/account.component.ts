import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subscription } from 'rxjs';
import { PaymentCustomerPayload, PaymentService } from '../services/payment.service';
import { AuthService } from '../services/auth/auth.service';
import { Icons } from '../shared/icons';
import { User } from '../models/users';
import { AccountOrder, OrdersService } from '../services/orders.service';
import { CartService } from '../services/cart.service';
import { SeoService } from '../services/seo.service';
import { PincodeService } from '../services/pincode.service';

interface AccountSection {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  icon: LucideIconData;
}

interface ProfileForm {
  username: string;
  email: string;
  phone: string;
}

interface OrderTrackingStep {
  id: string;
  title: string;
  description: string;
  timestamp?: string | Date;
  state: 'completed' | 'current' | 'upcoming';
}

type ProfileFormErrors = Partial<Record<keyof ProfileForm, string>>;
type AddressFormErrors = Partial<Record<keyof PaymentCustomerPayload, string>>;

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss'
})
export class AccountComponent implements OnInit, OnDestroy {
  private readonly defaultSection = 'personal-details';
  private readonly mobileBreakpoint = 768;
  icons = Icons;
  user = new User();
  savedAddress: PaymentCustomerPayload;
  addressForm: PaymentCustomerPayload;
  addressErrors: AddressFormErrors = {};
  profileForm: ProfileForm = this.getEmptyProfileForm();
  profileErrors: ProfileFormErrors = {};
  isEditingProfile = false;
  isEditingAddress = false;
  isSavingProfile = false;
  isSavingAddress = false;
  isAddressLocationLoading = false;
  profileFeedback = '';
  addressFeedback = '';
  orders: AccountOrder[] = [];
  selectedOrder: AccountOrder | null = null;
  isOrdersLoading = false;
  isOrderDetailLoading = false;
  isReordering = false;
  ordersError = '';
  orderDetailError = '';
  activeOrderId: number | null = null;
  ordersPage = 1;
  readonly ordersPerPage = 6;
  private userSubscription?: Subscription;
  private routeSubscription?: Subscription;
  private lastResolvedAddressPostalCode = '';
  activeSection = this.defaultSection;
  isMobileView = false;
  showMobileSectionMenu = false;

  sections: AccountSection[] = [
    {
      id: 'personal-details',
      title: 'Personal Details',
      description: 'Review your name, email address, and mobile number linked to this account.',
      actionLabel: 'Manage details',
      icon: Icons.account.user,
    },
    {
      id: 'orders',
      title: 'Orders',
      description: 'Track recent purchases, payment status, and order support from one place.',
      actionLabel: 'View orders',
      icon: Icons.account.orders,
    },
    {
      id: 'addresses',
      title: 'Addresses',
      description: 'Keep your saved shipping address ready for faster checkout next time.',
      actionLabel: 'Review address',
      icon: Icons.account.address,
    },
    {
      id: 'contact-us',
      title: 'Contact Us',
      description: 'Reach Secure Derma support for product, order, or account-related help.',
      actionLabel: 'Get support',
      icon: Icons.account.contact,
    },
    {
      id: 'account-security',
      title: 'Account Security',
      description: 'Stay signed in securely and review your current login and protection details.',
      actionLabel: 'Review security',
      icon: Icons.account.security,
    }
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly paymentService: PaymentService,
    private readonly ordersService: OrdersService,
    private readonly cartService: CartService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly message: NzMessageService,
    private readonly seoService: SeoService,
    private readonly pincodeService: PincodeService,
  ) {
    this.savedAddress = this.paymentService.loadCheckoutCustomer();
    this.addressForm = this.paymentService.normalizeCheckoutCustomer(this.savedAddress);
  }

  ngOnInit(): void {
    this.syncMobileView();

    if (!this.authService.isLoggedIn()) {
      this.authService.redirectUrl = '/account';
      void this.router.navigate(['/account/login']);
      return;
    }

    this.userSubscription = this.authService.user$.subscribe((user) => {
      this.user = user ?? new User();
      if (!this.isEditingProfile) {
        this.profileForm = this.createProfileForm(this.user);
      }
    });

    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const orderIdParam = params.get('orderId');
      const explicitSection = params.get('section');
      const section = orderIdParam ? 'orders' : (explicitSection || this.defaultSection);
      this.activeSection = this.isValidSection(section) ? section : this.defaultSection;
      this.activeOrderId = orderIdParam ? Number(orderIdParam) : null;
      this.showMobileSectionMenu = this.isMobileView && !this.activeOrderId && !explicitSection;
      this.resetInlineEditState();

      if (this.activeSection === 'orders') {
        if (!this.orders.length && !this.isOrdersLoading) {
          this.loadOrders();
        }
        if (this.activeOrderId) {
          this.loadOrderDetail(this.activeOrderId);
        } else {
          this.orderDetailError = '';
          this.isOrderDetailLoading = false;
        }
      }

      this.updateSeo();
    });

  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();

  }

  get fullName(): string {
    return this.user.username?.trim() || 'Secure Derma Customer';
  }

  get primaryEmail(): string {
    return this.user.email || 'Add your email';
  }

  get primaryPhone(): string {
    return this.user.mobile ? String(this.user.mobile) : 'Add your mobile number';
  }

  get canEditEmail(): boolean {
    return !this.user.is_google_login;
  }

  get verificationBadges(): string[] {
    const badges = ['Account verified'];
    if (this.user.email) {
      badges.push(this.user.is_google_login ? 'Google verified email' : 'Verified email');
    }
    if (this.user.mobile) {
      badges.push('Verified mobile');
    }
    return badges;
  }

  get formattedAddress(): string[] {
    const addressParts = this.getAddressParts(this.savedAddress);

    if (addressParts.length) {
      return addressParts;
    }

    return this.selectedOrderAddressLines;
  }

  get hasValidAddressPostalCode(): boolean {
    return /^\d{6}$/.test(this.addressForm.postal_code || '');
  }

  get isAddressPostalCodeVerified(): boolean {
    return this.hasValidAddressPostalCode && this.addressForm.postal_code === this.lastResolvedAddressPostalCode;
  }

  get isAddressLocationEditable(): boolean {
    return this.isEditingAddress && this.isAddressPostalCodeVerified;
  }

  get totalOrders(): number {
    return this.orders.length;
  }

  get totalOrderPages(): number {
    return Math.max(1, Math.ceil(this.totalOrders / this.ordersPerPage));
  }

  get paginatedOrders(): AccountOrder[] {
    const start = (this.ordersPage - 1) * this.ordersPerPage;
    return this.orders.slice(start, start + this.ordersPerPage);
  }

  get ordersRangeStart(): number {
    if (!this.totalOrders) {
      return 0;
    }

    return (this.ordersPage - 1) * this.ordersPerPage + 1;
  }

  get ordersRangeEnd(): number {
    return Math.min(this.ordersPage * this.ordersPerPage, this.totalOrders);
  }

  get totalOrderSpend(): number {
    return this.orders.reduce((sum, order) => sum + order.amount_rupees, 0);
  }

  get activeSectionConfig(): AccountSection | undefined {
    return this.sections.find((section) => section.id === this.activeSection);
  }

  get activeSectionIndex(): number {
    return this.sections.findIndex((section) => section.id === this.activeSection);
  }

  get previousSection(): AccountSection | null {
    return this.activeSectionIndex > 0 ? this.sections[this.activeSectionIndex - 1] : null;
  }

  get nextSection(): AccountSection | null {
    return this.activeSectionIndex >= 0 && this.activeSectionIndex < this.sections.length - 1
      ? this.sections[this.activeSectionIndex + 1]
      : null;
  }

  get totalOrderSavings(): number {
    return this.orders.reduce((sum, order) => sum + (order.savings_rupees || 0), 0);
  }

  get isOrderDetailView(): boolean {
    return this.activeSection === 'orders' && this.activeOrderId !== null;
  }

  get displayAddressName(): string {
    const orderShipping = this.getSelectedOrderShipping();
    return this.savedAddress.name || orderShipping.name || this.fullName;
  }

  get selectedOrderAddressLines(): string[] {
    const orderShipping = this.getSelectedOrderShipping();
    const addressParts = this.getAddressParts({
      address: orderShipping.address,
      address_line_2: orderShipping.landmark,
      city: orderShipping.city,
      state: orderShipping.state,
      postal_code: orderShipping.pincode,
    });

    return addressParts.length ? addressParts : ['No saved address yet. Complete checkout once to save delivery details here.'];
  }

  get selectedOrderAddressSummary(): string {
    return this.selectedOrderAddressLines.join(', ');
  }

  get shipmentProviderLabel(): string {
    return this.selectedOrder?.shipping_provider || 'Secure Derma Logistics';
  }

  get shipmentTrackingId(): string {
    return this.selectedOrder?.order_number || 'Not available';
  }

  get estimatedDeliveryDate(): Date | null {
    if (!this.selectedOrder) {
      return null;
    }

    const baseDate = this.selectedOrder.paid_at || this.selectedOrder.created_at;
    if (!baseDate) {
      return null;
    }

    return this.addDays(baseDate, 4);
  }

  get shipmentStatusLabel(): string {
    return 'Preparing Shipment';
  }

  get shipmentTrackingSteps(): OrderTrackingStep[] {
    if (!this.selectedOrder) {
      return [];
    }

    const orderPlacedAt = this.selectedOrder.created_at;
    const paymentConfirmedAt = this.selectedOrder.paid_at || this.selectedOrder.updated_at || this.selectedOrder.created_at;
    const packedAt = this.addHours(paymentConfirmedAt, 4);
    const shippedEta = this.addDays(paymentConfirmedAt, 1);
    const outForDeliveryEta = this.addDays(paymentConfirmedAt, 3);
    const deliveredEta = this.addDays(paymentConfirmedAt, 4);

    return [
      {
        id: 'placed',
        title: 'Order placed',
        description: 'Your order was created successfully.',
        timestamp: orderPlacedAt,
        state: 'completed',
      },
      {
        id: 'payment',
        title: 'Payment confirmed',
        description: 'Payment was verified and the order is locked for processing.',
        timestamp: paymentConfirmedAt,
        state: 'completed',
      },
      {
        id: 'packed',
        title: 'Preparing shipment',
        description: 'The warehouse is packing your items and assigning them to a courier.',
        timestamp: packedAt,
        state: 'current',
      },
      {
        id: 'shipped',
        title: 'Shipped',
        description: 'The package will move to the courier network after handoff.',
        timestamp: shippedEta,
        state: 'upcoming',
      },
      {
        id: 'out-for-delivery',
        title: 'Out for delivery',
        description: 'The courier will attempt delivery at your address.',
        timestamp: outForDeliveryEta,
        state: 'upcoming',
      },
      {
        id: 'delivered',
        title: 'Delivered',
        description: 'Delivery completes once the parcel reaches you.',
        timestamp: deliveredEta,
        state: 'upcoming',
      },
    ];
  }

  get selectedOrderPrimaryItem(): AccountOrder['items'][number] | null {
    return this.selectedOrder?.items?.[0] || null;
  }

  get selectedOrderAdditionalItemCount(): number {
    return Math.max((this.selectedOrder?.items?.length || 0) - 1, 0);
  }

  onProfileInput(field: keyof ProfileForm, value: string): void {
    this.profileFeedback = '';

    if (field === 'username') {
      this.profileForm.username = value.replace(/\s+/g, ' ').trimStart();
    } else if (field === 'email') {
      this.profileForm.email = value.trim().toLowerCase();
    } else {
      this.profileForm.phone = value.replace(/\D/g, '').slice(0, 10);
    }

    if (this.profileErrors[field]) {
      this.profileErrors[field] = '';
    }
  }

  onProfileBlur(field: keyof ProfileForm): void {
    this.profileForm = {
      username: this.profileForm.username.replace(/\s+/g, ' ').trim(),
      email: this.profileForm.email.trim().toLowerCase(),
      phone: this.profileForm.phone.replace(/\D/g, '').slice(0, 10)
    };
    this.profileErrors = {
      ...this.profileErrors,
      [field]: this.validateProfileForm()[field]
    };
  }

  private resetInlineEditState(): void {
    this.isEditingProfile = false;
    this.isSavingProfile = false;
    this.profileFeedback = '';
    this.profileErrors = {};
    this.profileForm = this.createProfileForm(this.user);

    this.isEditingAddress = false;
    this.isSavingAddress = false;
    this.isAddressLocationLoading = false;
    this.addressFeedback = '';
    this.addressErrors = {};
    this.addressForm = this.paymentService.normalizeCheckoutCustomer(this.savedAddress);
    this.lastResolvedAddressPostalCode = this.addressForm.postal_code || '';
  }

  startProfileEdit(): void {
    this.isEditingProfile = true;
    this.profileFeedback = '';
    this.profileErrors = {};
    this.profileForm = this.createProfileForm(this.user);
  }

  cancelProfileEdit(): void {
    this.isEditingProfile = false;
    this.profileFeedback = '';
    this.profileErrors = {};
    this.profileForm = this.createProfileForm(this.user);
  }

  startAddressEdit(): void {
    this.isEditingAddress = true;
    this.isSavingAddress = false;
    this.isAddressLocationLoading = false;
    this.addressFeedback = '';
    this.addressErrors = {};
    this.addressForm = this.paymentService.normalizeCheckoutCustomer(this.savedAddress);
    this.lastResolvedAddressPostalCode = '';
  }

  cancelAddressEdit(): void {
    this.isEditingAddress = false;
    this.isSavingAddress = false;
    this.isAddressLocationLoading = false;
    this.addressFeedback = '';
    this.addressErrors = {};
    this.addressForm = this.paymentService.normalizeCheckoutCustomer(this.savedAddress);
    this.lastResolvedAddressPostalCode = this.addressForm.postal_code || '';
  }

  onAddressInput(field: keyof PaymentCustomerPayload, value: string): void {
    this.addressFeedback = '';
    this.addressForm = {
      ...this.addressForm,
      [field]: this.paymentService.normalizeCheckoutField(field, value)
    };

    if (field === 'postal_code') {
      if (!this.hasValidAddressPostalCode) {
        this.lastResolvedAddressPostalCode = '';
        this.isAddressLocationLoading = false;
        this.addressForm = {
          ...this.addressForm,
          city: '',
          state: ''
        };
        this.addressErrors = {
          ...this.addressErrors,
          city: undefined,
          state: undefined
        };
      } else if (this.addressForm.postal_code !== this.lastResolvedAddressPostalCode) {
        this.lastResolvedAddressPostalCode = '';
        this.lookupAddressLocationByPostalCode(this.addressForm.postal_code);
      }
    }

    if (this.addressErrors[field]) {
      this.addressErrors = {
        ...this.addressErrors,
        [field]: this.paymentService.validateCheckoutCustomer(this.addressForm)[field]
      };
    }
  }

  onAddressBlur(field: keyof PaymentCustomerPayload): void {
    this.addressForm = this.paymentService.normalizeCheckoutCustomer(this.addressForm);
    this.addressErrors = {
      ...this.addressErrors,
      [field]: this.paymentService.validateCheckoutCustomer(this.addressForm)[field]
    };

    if (field === 'postal_code' && this.hasValidAddressPostalCode && !this.isAddressPostalCodeVerified) {
      this.lookupAddressLocationByPostalCode(this.addressForm.postal_code);
    }
  }

  private lookupAddressLocationByPostalCode(postalCode: string): void {
    if (!this.isEditingAddress || !/^\d{6}$/.test(postalCode) || this.isAddressLocationLoading) {
      return;
    }

    this.isAddressLocationLoading = true;

    this.pincodeService.checkServiceability(postalCode).subscribe({
      next: (response) => {
        this.isAddressLocationLoading = false;

        if (!response.serviceable) {
          this.lastResolvedAddressPostalCode = '';
          this.addressForm = {
            ...this.addressForm,
            city: '',
            state: ''
          };
          this.addressErrors = {
            ...this.addressErrors,
            postal_code: response.suggested_pincodes?.length
              ? `Pincode not found in the official India directory. Did you mean ${response.suggested_pincodes[0].pincode}?`
              : 'Delivery is not available for this pincode yet.',
            city: undefined,
            state: undefined
          };
          return;
        }

        this.lastResolvedAddressPostalCode = postalCode;
        this.addressForm = this.paymentService.normalizeCheckoutCustomer({
          ...this.addressForm,
          postal_code: postalCode,
          city: response.city || this.addressForm.city,
          state: response.state || this.addressForm.state
        });
        this.addressErrors = {
          ...this.addressErrors,
          postal_code: undefined,
          city: undefined,
          state: undefined
        };
      },
      error: (error) => {
        this.isAddressLocationLoading = false;
        this.lastResolvedAddressPostalCode = '';
        this.addressForm = {
          ...this.addressForm,
          city: '',
          state: ''
        };
        this.addressErrors = {
          ...this.addressErrors,
          postal_code: typeof error === 'string' ? error : error?.detail || 'Unable to validate this postal code right now.',
          city: undefined,
          state: undefined
        };
      }
    });
  }

  saveProfile(): void {
    this.profileFeedback = '';
    this.profileErrors = this.validateProfileForm();
    if (Object.keys(this.profileErrors).length) {
      return;
    }

    this.isSavingProfile = true;
    this.authService.updateProfile({
      username: this.profileForm.username.trim(),
      email: this.profileForm.email.trim().toLowerCase(),
      phone: this.profileForm.phone,
    }).subscribe({
      next: () => {
        this.isSavingProfile = false;
        this.isEditingProfile = false;
        this.profileFeedback = 'Profile details updated successfully.';
      },
      error: (error) => {
        this.isSavingProfile = false;
        this.profileFeedback = typeof error === 'string' ? error : 'Unable to update profile right now.';
      }
    });
  }

  saveAddress(): void {
    this.addressFeedback = '';
    this.addressForm = this.paymentService.normalizeCheckoutCustomer(this.addressForm);
    this.addressErrors = this.paymentService.validateCheckoutCustomer(this.addressForm);

    if (!this.isAddressPostalCodeVerified) {
      this.addressErrors = {
        ...this.addressErrors,
        postal_code: 'Enter a real postal code and wait for City and State to load.'
      };
    }

    if (Object.keys(this.addressErrors).length) {
      return;
    }

    this.isSavingAddress = true;
    this.paymentService.saveCheckoutCustomer(this.addressForm);
    this.savedAddress = this.paymentService.loadCheckoutCustomer();
    this.addressForm = this.paymentService.normalizeCheckoutCustomer(this.savedAddress);
    this.isSavingAddress = false;
    this.isEditingAddress = false;
    this.addressFeedback = 'Address details updated successfully.';
  }

  openSection(sectionId: string): void {
    if (!this.isValidSection(sectionId)) {
      return;
    }

    this.activeOrderId = null;
    this.showMobileSectionMenu = false;
    void this.router.navigate(['/account', sectionId]);
  }

  openMobileSectionMenu(): void {
    if (!this.isMobileView || this.isOrderDetailView) {
      return;
    }

    this.activeOrderId = null;
    this.showMobileSectionMenu = true;
    this.scrollToTop();
    void this.router.navigate(['/account']);
  }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  logout(): void {
    this.authService.logout();
  }

  loadOrders(): void {
    this.isOrdersLoading = true;
    this.ordersError = '';

    this.ordersService.getOrders().subscribe({
      next: (response) => {
        this.orders = response.results || [];
        this.ordersPage = 1;
        if (!this.activeOrderId) {
          this.selectedOrder = this.orders[0] || null;
        }
        this.isOrdersLoading = false;
      },
      error: (error) => {
        this.ordersError = typeof error === 'string' ? error : 'Unable to load orders right now.';
        this.isOrdersLoading = false;
      }
    });
  }

  selectOrder(order: AccountOrder): void {
    this.selectedOrder = order;
  }

  goToPreviousOrdersPage(): void {
    if (this.ordersPage <= 1) {
      return;
    }

    this.ordersPage -= 1;
  }

  goToNextOrdersPage(): void {
    if (this.ordersPage >= this.totalOrderPages) {
      return;
    }

    this.ordersPage += 1;
  }

  openOrderDetail(orderId: number): void {
    void this.router.navigate(['/account/orders', orderId]);
  }

  backToOrders(): void {
    this.activeOrderId = null;
    this.orderDetailError = '';
    this.isOrderDetailLoading = false;
    void this.router.navigate(['/account/orders']);
  }

  downloadInvoice(): void {
    if (typeof window === 'undefined' || !this.selectedOrder) {
      return;
    }

    window.print();
  }

  getOrderStatusLabel(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (value) => value.toUpperCase());
  }

  getOrderPrimaryItem(order: AccountOrder): AccountOrder['items'][number] | null {
    return order.items?.[0] || null;
  }

  getAdditionalItemCount(order: AccountOrder): number {
    return Math.max((order.items?.length || 0) - 1, 0);
  }

  getOrderEta(order: AccountOrder): Date | null {
    const baseDate = order.paid_at || order.created_at;
    return baseDate ? this.addDays(baseDate, 4) : null;
  }

  getOrderMarketplaceStatus(order: AccountOrder): string {
    const eta = this.getOrderEta(order);
    if (!eta) {
      return 'Order confirmed';
    }

    return `Arriving by ${eta.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  }

  getOrderDestination(order: AccountOrder): string {
    const city = order.shipping?.city || order.shipping_city || order.customer_city;
    const state = order.shipping?.state || order.shipping_state || order.customer_state;
    return [city, state].filter(Boolean).join(', ') || 'Delivery details available';
  }

  openOrderProduct(orderItem: AccountOrder['items'][number]): void {
    void this.router.navigate(['/products', orderItem.product_slug], {
      queryParams: { variant: orderItem.product_detail_id }
    });
  }

  async startShopping(): Promise<void> {
    if (!this.selectedOrder?.items?.length || this.isReordering) {
      return;
    }

    this.isReordering = true;

    let addedCount = 0;
    let updatedCount = 0;
    let limitedCount = 0;

    try {
      for (const item of this.selectedOrder.items) {
        const result = await this.cartService.addItemByDetail(item.product_detail_id, item.quantity);

        switch (result.status) {
          case 'added':
            addedCount += 1;
            break;
          case 'updated':
            updatedCount += 1;
            break;
          case 'limit_reached':
            limitedCount += 1;
            break;
          default:
            break;
        }
      }

      if (addedCount || updatedCount) {
        const parts: string[] = [];
        if (addedCount) {
          parts.push(`${addedCount} item${addedCount > 1 ? 's' : ''} added`);
        }
        if (updatedCount) {
          parts.push(`${updatedCount} item${updatedCount > 1 ? 's were' : ' was'} already in your cart`);
        }
        if (limitedCount) {
          parts.push(`${limitedCount} item${limitedCount > 1 ? 's' : ''} hit the quantity limit`);
        }
        this.message.success(parts.join('. ') + '.');
        return;
      }

      if (limitedCount) {
        this.message.info('These items are already at the maximum quantity in your cart.');
        return;
      }

      this.message.error('Unable to add this order to your cart right now.');
    } catch {
      this.message.error('Unable to add this order to your cart right now.');
    } finally {
      this.isReordering = false;
    }
  }

  private loadOrderDetail(orderId: number): void {
    this.isOrderDetailLoading = true;
    this.orderDetailError = '';

    this.ordersService.getOrderDetail(orderId).subscribe({
      next: (order) => {
        this.selectedOrder = order;
        this.isOrderDetailLoading = false;
        this.updateSeo();
      },
      error: (error) => {
        this.orderDetailError = typeof error === 'string' ? error : 'Unable to load this order right now.';
        this.isOrderDetailLoading = false;
        this.updateSeo();
      }
    });
  }

  private isValidSection(sectionId: string): boolean {
    return this.sections.some((section) => section.id === sectionId);
  }

  private getAddressParts(address: Partial<PaymentCustomerPayload>): string[] {
    return [
      address.address,
      address.address_line_2,
      address.city,
      address.state,
      address.postal_code,
    ].filter((value): value is string => Boolean(value));
  }

  private getSelectedOrderShipping(): {
    name: string;
    address: string;
    landmark: string;
    city: string;
    state: string;
    pincode: string;
  } {
    return {
      name: this.selectedOrder?.shipping?.name || this.selectedOrder?.shipping_name || this.selectedOrder?.customer_name || '',
      address: this.selectedOrder?.shipping?.address || this.selectedOrder?.shipping_address || this.selectedOrder?.customer_address || '',
      landmark: this.selectedOrder?.shipping?.landmark || this.selectedOrder?.shipping_landmark || this.selectedOrder?.customer_address_line_2 || '',
      city: this.selectedOrder?.shipping?.city || this.selectedOrder?.shipping_city || this.selectedOrder?.customer_city || '',
      state: this.selectedOrder?.shipping?.state || this.selectedOrder?.shipping_state || this.selectedOrder?.customer_state || '',
      pincode: this.selectedOrder?.shipping?.pincode || this.selectedOrder?.shipping_pincode || this.selectedOrder?.customer_postal_code || '',
    };
  }

  private addDays(dateValue: string, days: number): Date {
    const date = new Date(dateValue);
    date.setDate(date.getDate() + days);
    return date;
  }

  private addHours(dateValue: string, hours: number): string {
    const date = new Date(dateValue);
    date.setHours(date.getHours() + hours);
    return date.toISOString();
  }

  private syncMobileView(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.isMobileView = window.innerWidth <= this.mobileBreakpoint;
    if (!this.isMobileView) {
      this.showMobileSectionMenu = false;
    }
  }

  private updateSeo(): void {
    const section = this.sections.find((item) => item.id === this.activeSection);
    const title = this.activeOrderId
      ? `Order ${this.selectedOrder?.order_number || this.activeOrderId}`
      : section?.title || 'My Account';
    const description = this.activeOrderId
      ? 'Track your Secure Derma order status, delivery details, and purchased items.'
      : section?.description || 'Manage your Secure Derma account details, addresses, and orders.';

    this.seoService.updateSeo({
      title,
      description,
      canonicalPath: this.activeOrderId ? `/account/orders/${this.activeOrderId}` : `/account/${this.activeSection}`,
      robots: 'noindex,nofollow',
      type: 'website'
    });
  }

  private getEmptyProfileForm(): ProfileForm {
    return {
      username: '',
      email: '',
      phone: '',
    };
  }

  private createProfileForm(user: User): ProfileForm {
    return {
      username: user.username?.trim() || '',
      email: user.email?.trim().toLowerCase() || '',
      phone: user.mobile ? String(user.mobile).replace(/\D/g, '').slice(0, 10) : '',
    };
  }

  private validateProfileForm(): ProfileFormErrors {
    const errors: ProfileFormErrors = {};
    const username = this.profileForm.username.trim();
    const email = this.profileForm.email.trim().toLowerCase();
    const phone = this.profileForm.phone;

    if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(username)) {
      errors.username = 'Enter a valid full name.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      errors.phone = 'Enter a valid 10-digit mobile number.';
    }

    if (!this.canEditEmail && email !== (this.user.email || '').trim().toLowerCase()) {
      errors.email = 'Email cannot be changed for Google login accounts.';
    }

    return errors;
  }
}
