import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, map } from 'rxjs';
import { ACCESS_TOKEN, getToken } from '@app/core/token';
import { GetApiUrl } from './core/config';

export interface CartItem {
  productId: number;
  productName: string;
  thumbnail: string;
  productWeight?: string;
  weightType?: string;
  qualityLabel?: string;
  price: number;
  originalPrice?: number;
  discountPrice?: number;
  detailId?: number;
  quantity: number;
  availableStockCount?: number;
  lineTotal?: number;
}

export interface AddToCartResult {
  status: 'added' | 'updated' | 'limit_reached' | 'missing_details';
  quantity?: number;
}

interface CartApiResponse {
  items: CartItem[];
  count: number;
  total_quantity: number;
  subtotal: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly CART_KEY = 'my_ecommerce_cart';
  private readonly cartItems = new BehaviorSubject<CartItem[]>(this.getCartFromStorage());
  cart$ = this.cartItems.asObservable();

  constructor(private http: HttpClient) {
    void this.hydrateCart();
  }

  get totalQuantity(): number {
    return this.cartItems.value.reduce((sum, item) => sum + item.quantity, 0);
  }

  async hydrateCart(): Promise<void> {
    if (!this.isAuthenticated()) {
      this.cartItems.next(this.getCartFromStorage());
      return;
    }

    const response = await firstValueFrom(
      this.http.get<CartApiResponse>(GetApiUrl('/cart/'), this.getHttpOptions()).pipe(
        map((res) => res)
      )
    );
    this.cartItems.next(this.normalizeCartItems(response.items || []));
  }

  async syncGuestCartToServer(): Promise<void> {
    if (!this.isAuthenticated()) {
      this.cartItems.next(this.getCartFromStorage());
      return;
    }

    const guestItems = this.getCartFromStorage();
    if (!guestItems.length) {
      await this.hydrateCart();
      return;
    }

    const response = await firstValueFrom(
      this.http.post<CartApiResponse>(
        GetApiUrl('/cart/sync/'),
        {
          items: guestItems
            .filter((item) => item.detailId)
            .map((item) => ({
              detailId: item.detailId,
              quantity: item.quantity
            }))
        },
        this.getHttpOptions()
      )
    );

    this.cartItems.next(this.normalizeCartItems(response.items || []));
    if (this.canUseStorage()) {
      localStorage.removeItem(this.CART_KEY);
    }
  }

  async addToCart(product: any, quantity = 1): Promise<AddToCartResult> {
    const selectedDetail = product.details?.[0];
    if (!selectedDetail || quantity < 1) {
      return { status: 'missing_details' };
    }

    if (!this.isAuthenticated()) {
      return this.addGuestItem(product, selectedDetail, quantity);
    }

    try {
      const response = await firstValueFrom(
        this.http.post<CartApiResponse>(
          GetApiUrl('/cart/items/'),
          {
            detailId: selectedDetail.id,
            quantity
          },
          this.getHttpOptions()
        )
      );

      const nextItems = this.normalizeCartItems(response.items || []);
      this.cartItems.next(nextItems);
      const updatedItem = nextItems.find((item) => item.detailId === selectedDetail.id);
      return {
        status: updatedItem?.quantity && updatedItem.quantity > quantity ? 'updated' : 'added',
        quantity: updatedItem?.quantity || quantity
      };
    } catch (error: any) {
      if (error?.status === 400 || error?.status === 409) {
        const cappedResult = await this.capExistingServerItemQuantity(selectedDetail.id, quantity);
        return cappedResult ?? { status: 'limit_reached' };
      }
      throw error;
    }
  }

  async addItemByDetail(detailId: number, quantity = 1): Promise<AddToCartResult> {
    if (!detailId || quantity < 1) {
      return { status: 'missing_details' };
    }

    if (!this.isAuthenticated()) {
      return { status: 'missing_details' };
    }

    try {
      const response = await firstValueFrom(
        this.http.post<CartApiResponse>(
          GetApiUrl('/cart/items/'),
          {
            detailId,
            quantity
          },
          this.getHttpOptions()
        )
      );

      const nextItems = this.normalizeCartItems(response.items || []);
      this.cartItems.next(nextItems);
      const updatedItem = nextItems.find((item) => item.detailId === detailId);
      return {
        status: updatedItem?.quantity && updatedItem.quantity > quantity ? 'updated' : 'added',
        quantity: updatedItem?.quantity || quantity
      };
    } catch (error: any) {
      if (error?.status === 400 || error?.status === 409) {
        const cappedResult = await this.capExistingServerItemQuantity(detailId, quantity);
        return cappedResult ?? { status: 'limit_reached' };
      }
      throw error;
    }
  }

  private async capExistingServerItemQuantity(detailId: number, quantity: number): Promise<AddToCartResult | null> {
    const existingItem = this.cartItems.value.find((item) => item.detailId === detailId);
    if (!existingItem) {
      return null;
    }

    if (existingItem.quantity >= 10) {
      return { status: 'limit_reached', quantity: existingItem.quantity };
    }

    const cappedQuantity = Math.min(existingItem.quantity + quantity, 10);
    const response = await firstValueFrom(
      this.http.patch<CartApiResponse>(
        GetApiUrl('/cart/items/' + detailId + '/'),
        { quantity: cappedQuantity },
        this.getHttpOptions()
      )
    );

    this.cartItems.next(this.normalizeCartItems(response.items || []));
    return { status: 'updated', quantity: cappedQuantity };
  }

  async removeItem(itemKey: number): Promise<void> {
    const currentItem = this.cartItems.value.find((item) => (item.detailId ?? item.productId) === itemKey);
    if (!currentItem?.detailId) {
      this.removeGuestItem(itemKey);
      return;
    }

    if (!this.isAuthenticated()) {
      this.removeGuestItem(itemKey);
      return;
    }

    const response = await firstValueFrom(
      this.http.delete<CartApiResponse>(
        GetApiUrl(`/cart/items/${currentItem.detailId}/`),
        this.getHttpOptions()
      )
    );
    this.cartItems.next(this.normalizeCartItems(response.items || []));
  }

  async updateQuantity(itemKey: number, change: number): Promise<void> {
    const currentItem = this.cartItems.value.find((item) => (item.detailId ?? item.productId) === itemKey);
    if (!currentItem) {
      return;
    }

    if (!this.isAuthenticated() || !currentItem.detailId) {
      this.updateGuestItemQuantity(itemKey, change);
      return;
    }

    const newQty = currentItem.quantity + change;
    if (newQty < 1 || newQty > 10) {
      return;
    }

    const response = await firstValueFrom(
      this.http.patch<CartApiResponse>(
        GetApiUrl(`/cart/items/${currentItem.detailId}/`),
        { quantity: newQty },
        this.getHttpOptions()
      )
    );
    this.cartItems.next(this.normalizeCartItems(response.items || []));
  }

  async clearCart(): Promise<void> {
    if (!this.isAuthenticated()) {
      this.cartItems.next([]);
      if (this.canUseStorage()) {
        localStorage.removeItem(this.CART_KEY);
      }
      return;
    }

    const response = await firstValueFrom(
      this.http.delete<CartApiResponse>(GetApiUrl('/cart/'), this.getHttpOptions())
    );
    this.cartItems.next(response.items || []);
    if (this.canUseStorage()) {
      localStorage.removeItem(this.CART_KEY);
    }
  }

  private addGuestItem(product: any, selectedDetail: any, quantity = 1): AddToCartResult {
    const currentCart = [...this.cartItems.value];
    const existingItem = currentCart.find((item) => (item.detailId ?? item.productId) === selectedDetail.id);

    if (existingItem) {
      if (existingItem.quantity >= 10) {
        return { status: 'limit_reached', quantity: existingItem.quantity };
      }
      existingItem.quantity = Math.min(existingItem.quantity + quantity, 10);
    } else {
      currentCart.push({
        productId: product.id,
        productName: product.product_name,
        thumbnail: this.resolveCartImageUrl(product.thumbnail_image),
        productWeight: selectedDetail.product_weight,
        weightType: selectedDetail.weight_type,
        qualityLabel: [selectedDetail.product_weight, selectedDetail.weight_type].filter(Boolean).join(' '),
        price: selectedDetail.selling_price,
        originalPrice: selectedDetail.original_price,
        discountPrice: selectedDetail.discount_price,
        detailId: selectedDetail.id,
        quantity: Math.min(quantity, 10)
      });
    }

    this.cartItems.next(currentCart);
    this.saveGuestCart();

    return {
      status: existingItem ? 'updated' : 'added',
      quantity: existingItem ? existingItem.quantity : Math.min(quantity, 10)
    };
  }

  private updateGuestItemQuantity(itemKey: number, change: number): void {
    const items = this.cartItems.value.map((item) => {
      if ((item.detailId ?? item.productId) !== itemKey) {
        return item;
      }

      const newQty = item.quantity + change;
      if (newQty < 1 || newQty > 10) {
        return item;
      }

      return { ...item, quantity: newQty };
    });

    this.cartItems.next(items);
    this.saveGuestCart();
  }

  private removeGuestItem(itemKey: number): void {
    const updated = this.cartItems.value.filter((item) => (item.detailId ?? item.productId) !== itemKey);
    this.cartItems.next(updated);
    this.saveGuestCart();
  }

  private getCartFromStorage(): CartItem[] {
    if (!this.canUseStorage()) {
      return [];
    }

    const data = localStorage.getItem(this.CART_KEY);
    if (!data) {
      return [];
    }

    try {
      return this.normalizeCartItems(JSON.parse(data) as CartItem[]);
    } catch {
      return [];
    }
  }

  private normalizeCartItems(items: CartItem[]): CartItem[] {
    return items.map((item) => ({
      ...item,
      thumbnail: this.resolveCartImageUrl(item.thumbnail)
    }));
  }

  private resolveCartImageUrl(rawUrl: string | undefined | null): string {
    const value = String(rawUrl || '').trim();
    if (!value) {
      return '';
    }

    try {
      return new URL(value).toString();
    } catch {}

    const apiUrl = new URL(GetApiUrl('/'));
    const apiOrigin = apiUrl.origin;

    if (value.startsWith('/media/') || value.startsWith('media/')) {
      const normalizedPath = value.startsWith('/') ? value : `/${value}`;
      return new URL(normalizedPath, apiOrigin).toString();
    }

    if (value.startsWith('/assets/') || value.startsWith('assets/')) {
      if (typeof window !== 'undefined' && window.location?.origin) {
        return new URL(value.startsWith('/') ? value : `/${value}`, window.location.origin).toString();
      }
      return value.startsWith('/') ? value : `/${value}`;
    }

    return new URL(value.startsWith('/') ? value : `/${value}`, apiOrigin).toString();
  }

  private saveGuestCart(): void {
    if (!this.canUseStorage()) {
      return;
    }

    localStorage.setItem(this.CART_KEY, JSON.stringify(this.cartItems.value));
    this.cartItems.next([...this.cartItems.value]);
  }

  private isAuthenticated(): boolean {
    return this.canUseStorage() && !!getToken(ACCESS_TOKEN);
  }

  private getHttpOptions(): { headers: HttpHeaders } {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    const accessToken = getToken(ACCESS_TOKEN);
    if (accessToken) {
      headers = headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return { headers };
  }

  private canUseStorage(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }
}
