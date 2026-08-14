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

  private loadWishlist(): void {
    const saved = localStorage.getItem('wishlist');
    if (saved) {
      try {
        this.wishlist = JSON.parse(saved);
      } catch (e) {
        this.wishlist = [];
      }
    }
    this.wishlistSubject.next([...this.wishlist]);
  }

  private saveWishlist(): void {
    localStorage.setItem('wishlist', JSON.stringify(this.wishlist));
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
}