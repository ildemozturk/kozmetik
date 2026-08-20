import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product } from '../models/product';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private wishlist: Product[] = [];
  wishlistSubject = new BehaviorSubject<Product[]>([]);

  constructor() {
    this.loadWishlist();
  }

  private getStorageKey(): string {
    const userStr = localStorage.getItem('cosmetic_user') || localStorage.getItem('user') || localStorage.getItem('lumiere_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.email) {
          return `lumiere_wishlist_${user.email.trim().toLowerCase()}`;
        }
      } catch (e) {}
    }
    return 'lumiere_wishlist_guest';
  }

  loadWishlist(): void {
    const key = this.getStorageKey();
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        this.wishlist = JSON.parse(saved);
      } catch (e) {
        this.wishlist = [];
      }
    } else {
      this.wishlist = [];
    }
    this.wishlistSubject.next([...this.wishlist]);
  }

  private saveWishlist(): void {
    const key = this.getStorageKey();
    if (this.wishlist.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(this.wishlist));
    }
    this.wishlistSubject.next([...this.wishlist]);
  }

  getWishlist(): Product[] {
    return this.wishlist;
  }

  getCount(): number {
    return this.wishlist.length;
  }

  isFavorite(productId: number): boolean {
    return this.wishlist.some(item => item.id === productId);
  }

  toggleWishlist(product: Product): void {
    const index = this.wishlist.findIndex(item => item.id === product.id);
    if (index > -1) {
      this.wishlist.splice(index, 1);
    } else {
      this.wishlist.push(product);
    }
    this.saveWishlist();
  }

  removeFromWishlist(productId: number): void {
    this.wishlist = this.wishlist.filter(item => item.id !== productId);
    this.saveWishlist();
  }

  // Çıkış yapıldığında sadece ekrandaki favori state'ini temizler
  resetWishlistStateOnLogout(): void {
    this.wishlist = [];
    this.wishlistSubject.next([]);
  }
}