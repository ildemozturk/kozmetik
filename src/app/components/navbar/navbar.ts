import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { WishlistService } from '../../services/wishlist.service';
import { CartService } from '../../services/cart.service';
import { Product } from '../../models/product';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  isWishlistOpen: boolean = false;
  private wishlistSub!: Subscription;

  constructor(
    public wishlistService: WishlistService,
    public cartService: CartService,
    private cdr: ChangeDetectorRef // ChangeDetectorRef eklendi
  ) {}

  ngOnInit(): void {
    // Favorilerde her değişiklik olduğunda Navbar'ı anında yenilemeye zorluyoruz
    this.wishlistSub = this.wishlistService.wishlistSubject.subscribe(() => {
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.wishlistSub) {
      this.wishlistSub.unsubscribe();
    }
  }

  get wishlistCount(): number {
    return this.wishlistService.getCount();
  }

  get wishlistItems(): Product[] {
    return this.wishlistService.getWishlist();
  }

  get cartCount(): number {
    return this.cartService.totalItems();
  }

  toggleWishlistModal(): void {
    this.isWishlistOpen = !this.isWishlistOpen;
    this.cdr.detectChanges();
  }

  removeItem(productId: number, event: Event): void {
    event.stopPropagation();
    this.wishlistService.removeFromWishlist(productId);
    this.cdr.detectChanges();
  }

  onSearchClick(): void {}
  onProfileClick(): void {}
}