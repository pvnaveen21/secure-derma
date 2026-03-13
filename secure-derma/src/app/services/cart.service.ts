import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, map } from 'rxjs';
import { ACCESS_TOKEN, getToken, isTokenExpired } from '@app/core/token';
import { GetApiUrl } from './core/config';

export interface CartItem {
  productId: number;
  productName: string;
  thumbnail: string;
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
    this.cartItems.next(response.items || []);
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

    this.cartItems.next(response.items || []);
    if (this.canUseStorage()) {
      localStorage.removeItem(this.CART_KEY);
    }
  }

  async addToCart(product: any): Promise<AddToCartResult> {
    const selectedDetail = product.details?.[0];
    if (!selectedDetail) {
      return { status: 'missing_details' };
    }

    if (!this.isAuthenticated()) {
      return this.addGuestItem(product, selectedDetail);
    }

    try {
      const response = await firstValueFrom(
        this.http.post<CartApiResponse>(
          GetApiUrl('/cart/items/'),
          {
            detailId: selectedDetail.id,
            quantity: 1
          },
          this.getHttpOptions()
        )
      );

      this.cartItems.next(response.items || []);
      const updatedItem = (response.items || []).find((item) => item.detailId === selectedDetail.id);
      return {
        status: updatedItem?.quantity && updatedItem.quantity > 1 ? 'updated' : 'added',
        quantity: updatedItem?.quantity || 1
      };
    } catch (error: any) {
      if (error?.status === 400 || error?.status === 409) {
        return { status: 'limit_reached' };
      }
      throw error;
    }
  }

  async removeItem(productId: number): Promise<void> {
    const currentItem = this.cartItems.value.find((item) => item.productId === productId);
    if (!currentItem?.detailId) {
      this.removeGuestItem(productId);
      return;
    }

    if (!this.isAuthenticated()) {
      this.removeGuestItem(productId);
      return;
    }

    const response = await firstValueFrom(
      this.http.delete<CartApiResponse>(
        GetApiUrl(`/cart/items/${currentItem.detailId}/`),
        this.getHttpOptions()
      )
    );
    this.cartItems.next(response.items || []);
  }

  async updateQuantity(productId: number, change: number): Promise<void> {
    const currentItem = this.cartItems.value.find((item) => item.productId === productId);
    if (!currentItem) {
      return;
    }

    if (!this.isAuthenticated() || !currentItem.detailId) {
      this.updateGuestItemQuantity(productId, change);
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
    this.cartItems.next(response.items || []);
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

  private addGuestItem(product: any, selectedDetail: any): AddToCartResult {
    const currentCart = [...this.cartItems.value];
    const existingItem = currentCart.find((item) => item.productId === product.id);

    if (existingItem) {
      if (existingItem.quantity >= 10) {
        return { status: 'limit_reached', quantity: existingItem.quantity };
      }
      existingItem.quantity += 1;
    } else {
      currentCart.push({
        productId: product.id,
        productName: product.product_name,
        thumbnail: product.thumbnail_image,
        price: selectedDetail.selling_price,
        originalPrice: selectedDetail.original_price,
        discountPrice: selectedDetail.discount_price,
        detailId: selectedDetail.id,
        quantity: 1
      });
    }

    this.cartItems.next(currentCart);
    this.saveGuestCart();

    return {
      status: existingItem ? 'updated' : 'added',
      quantity: existingItem ? existingItem.quantity : 1
    };
  }

  private updateGuestItemQuantity(productId: number, change: number): void {
    const items = this.cartItems.value.map((item) => {
      if (item.productId !== productId) {
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

  private removeGuestItem(productId: number): void {
    const updated = this.cartItems.value.filter((item) => item.productId !== productId);
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
      return JSON.parse(data) as CartItem[];
    } catch {
      return [];
    }
  }

  private saveGuestCart(): void {
    if (!this.canUseStorage()) {
      return;
    }

    localStorage.setItem(this.CART_KEY, JSON.stringify(this.cartItems.value));
    this.cartItems.next([...this.cartItems.value]);
  }

  private isAuthenticated(): boolean {
    return this.canUseStorage() && !!getToken(ACCESS_TOKEN) && !isTokenExpired(ACCESS_TOKEN);
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
