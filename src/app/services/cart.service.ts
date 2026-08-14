import { Injectable, signal, computed, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Product } from '../models/product';

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  cartItems = signal<CartItem[]>([]);
  
  toastMessage = signal<string | null>(null);
  toastTimeout: any;

  // KARGO VE TUTAR HESAPLAMALARI
  readonly FREE_SHIPPING_THRESHOLD = 500;
  readonly STANDARD_SHIPPING_FEE = 69.90;

  totalItems = computed(() => {
    return this.cartItems().reduce((total, item) => total + item.quantity, 0);
  });

  subtotal = computed(() => {
    return this.cartItems().reduce((total, item) => {
      const price = Number(item.product.price) || 0;
      return total + (price * item.quantity);
    }, 0);
  });

  shippingFee = computed(() => {
    const total = this.subtotal();
    if (total === 0 || total >= this.FREE_SHIPPING_THRESHOLD) {
      return 0;
    }
    return this.STANDARD_SHIPPING_FEE;
  });

  grandTotal = computed(() => {
    return this.subtotal() + this.shippingFee();
  });

  amountLeftForFreeShipping = computed(() => {
    const total = this.subtotal();
    if (total >= this.FREE_SHIPPING_THRESHOLD) {
      return 0;
    }
    return this.FREE_SHIPPING_THRESHOLD - total;
  });

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('cart');
      if (saved) {
        try {
          this.cartItems.set(JSON.parse(saved));
        } catch (e) {
          console.error('Cart parse error', e);
        }
      }
    }
  }

  private saveCart(items: CartItem[]): void {
    this.cartItems.set(items);
    if (isPlatformBrowser(this.platformId)) {
      if (items.length === 0) {
        localStorage.removeItem('cart');
      } else {
        localStorage.setItem('cart', JSON.stringify(items));
      }
    }
  }

  getItemQuantity(productId: number): number {
    const item = this.cartItems().find(i => i.product.id === productId);
    return item ? item.quantity : 0;
  }

  showToast(message: string): void {
    this.toastMessage.set(message);
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }

  addToCart(product: Product): void {
    const current = [...this.cartItems()];
    const index = current.findIndex(item => item.product.id === product.id);

    if (index > -1) {
      current[index].quantity += 1;
    } else {
      current.push({ product, quantity: 1 });
    }

    this.saveCart(current);
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }

    const updated = this.cartItems().map(item => {
      if (item.product.id === productId) {
        return { ...item, quantity };
      }
      return item;
    });

    this.saveCart(updated);
  }

  removeFromCart(productId: number): void {
    const filtered = this.cartItems().filter(item => item.product.id !== productId);
    this.saveCart(filtered);
    this.showToast('Ürün sepetten çıkarıldı.');
  }

  // SEPETİ SIFIRLAMA
  clearCart(showNotification: boolean = true): void {
    this.saveCart([]);
    if (showNotification) {
      this.showToast('Sepetinizdeki tüm ürünler temizlendi.');
    }
  }
}