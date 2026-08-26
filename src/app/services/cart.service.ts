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
      this.loadUserCart();
    }
  }

  // Giriş yapan kullanıcının mailine göre dinamik anahtar üretir
  private getStorageKey(): string {
    if (!isPlatformBrowser(this.platformId)) return 'lumiere_cart_guest';
    const userStr = localStorage.getItem('cosmetic_user') || localStorage.getItem('user') || localStorage.getItem('lumiere_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.email) {
          return `lumiere_cart_${user.email.trim().toLowerCase()}`;
        }
      } catch (e) {}
    }
    return 'lumiere_cart_guest';
  }

  // Kullanıcının kayıtlı sepetini yükle
  loadUserCart(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const key = this.getStorageKey();
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        this.cartItems.set(JSON.parse(saved));
      } catch (e) {
        this.cartItems.set([]);
      }
    } else {
      this.cartItems.set([]);
    }
  }

  // Login olunca misafir sepetini kullanıcının sepetiyle birleştirir
  mergeGuestCartOnLogin(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const guestKey = 'lumiere_cart_guest';
    const guestCartStr = localStorage.getItem(guestKey);

    if (!guestCartStr) {
      this.loadUserCart();
      return;
    }

    try {
      const guestItems: CartItem[] = JSON.parse(guestCartStr);
      const userKey = this.getStorageKey();
      const userCartStr = localStorage.getItem(userKey);
      let userItems: CartItem[] = userCartStr ? JSON.parse(userCartStr) : [];

      guestItems.forEach(guestItem => {
        const existing = userItems.find(i => i.product.id === guestItem.product.id);
        if (existing) {
          existing.quantity += guestItem.quantity;
        } else {
          userItems.push(guestItem);
        }
      });

      // Kullanıcının sepetine kaydet ve misafir sepetini sil
      localStorage.setItem(userKey, JSON.stringify(userItems));
      localStorage.removeItem(guestKey);

      this.cartItems.set(userItems);
    } catch (e) {
      this.loadUserCart();
    }
  }

  private saveCart(items: CartItem[]): void {
    this.cartItems.set(items);
    if (isPlatformBrowser(this.platformId)) {
      const key = this.getStorageKey();
      if (items.length === 0) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(items));
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

  clearCart(showNotification: boolean = false): void {
    this.saveCart([]);
    if (showNotification) {
      this.showToast('Sepetinizdeki tüm ürünler temizlendi.');
    }
  }

  clearCartAfterOrder(): void {
    this.clearCart(false);
  }

  resetCartStateOnLogout(): void {
    this.cartItems.set([]);
  }
}