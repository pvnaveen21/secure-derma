// src/app/services/cart.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CartItem {
  productId: number;
  productName: string;
  thumbnail: string;
  price: number;           // selling_price
  originalPrice?: number;  // original_price
  discountPrice?: number;  // discount_price from API
  detailId?: number;       // if you support variants (weight/combo)
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly CART_KEY = 'my_ecommerce_cart';
  private cartItems = new BehaviorSubject<CartItem[]>(this.getCartFromStorage());
  cart$ = this.cartItems.asObservable();

  // Total quantity (for badge in header)
  get totalQuantity(): number {
    return this.cartItems.value.reduce((sum, item) => sum + item.quantity, 0);
  }

  private getCartFromStorage(): CartItem[] {
    const data = localStorage.getItem(this.CART_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveCart(): void {
    localStorage.setItem(this.CART_KEY, JSON.stringify(this.cartItems.value));
    this.cartItems.next([...this.cartItems.value]); // trigger update
  }

  addToCart(product: any): void {   // 'any' → replace with your product interface later
    const currentCart = [...this.cartItems.value];

    // For simplicity — using first detail (most common case)
    // → Improve later: show variant selector (dropdown) in card/modal
    const selectedDetail = product.details?.[0];

    if (!selectedDetail) {
      console.warn('Product has no price details');
      return;
    }

    const existingItem: any = currentCart.find(
      item => item.productId === product.id
      // && item.detailId === selectedDetail.id   ← uncomment if variants supported
    );
    console.log(existingItem);

    if (existingItem) {
      if (existingItem.quantity >= 10) {
        return
      }
      else {
        existingItem.quantity += 1;
      }
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
    this.saveCart();

    // Optional: nice feedback
    // this.nzMessageService.success(`${product.product_name} added to cart!`);
  }

  // Bonus methods you will need later
  removeItem(productId: number): void {
    const updated = this.cartItems.value.filter(i => i.productId !== productId);
    this.cartItems.next(updated);
    this.saveCart();
  }

  updateQuantity(productId: number, change: number): void {
    const items = this.cartItems.value.map(item => {
      if (item.productId === productId) {
        const newQty = item.quantity + change;

        // limit quantity between 1 and 10
        if (newQty < 1 || newQty > 10) {
          return item; // keep old item
        }

        return { ...item, quantity: newQty };
      }
      return item;
    });

    this.cartItems.next(items);
    this.saveCart();
  }

  clearCart(): void {
    this.cartItems.next([]);
    localStorage.removeItem(this.CART_KEY);
  }
}
