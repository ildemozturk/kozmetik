import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { WishlistService } from '../../services/wishlist.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/product';

export interface OrderHistoryItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface UserOrder {
  id: string;
  date: string;
  status: string;
  totalAmount: number;
  items: OrderHistoryItem[];
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  isWishlistOpen: boolean = false;
  isUserMenuOpen: boolean = false;
  isOrdersModalOpen: boolean = false;
  userOrders: UserOrder[] = [];

  private wishlistSub!: Subscription;

  constructor(
    public wishlistService: WishlistService,
    public cartService: CartService,
    public authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
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

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get currentUser() {
    return this.authService.getUser();
  }

  toggleWishlistModal(): void {
    this.isWishlistOpen = !this.isWishlistOpen;
    if (this.isWishlistOpen) {
      this.isUserMenuOpen = false;
    }
    this.cdr.detectChanges();
  }

  removeItem(productId: number, event: Event): void {
    event.stopPropagation();
    this.wishlistService.removeFromWishlist(productId);
    this.cdr.detectChanges();
  }

  onProfileClick(): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
    } else {
      this.isUserMenuOpen = !this.isUserMenuOpen;
      if (this.isUserMenuOpen) {
        this.isWishlistOpen = false;
      }
      this.cdr.detectChanges();
    }
  }

  openOrdersModal(): void {
    this.isUserMenuOpen = false;
    this.loadUserOrders();
    this.isOrdersModalOpen = true;
    this.cdr.detectChanges();
  }

  closeOrdersModal(): void {
    this.isOrdersModalOpen = false;
    this.cdr.detectChanges();
  }

  loadUserOrders(): void {
    // localStorage'dan kullanıcının vermiş olduğu siparişleri çekiyoruz
    const savedOrders = localStorage.getItem('lumiere_orders');
    if (savedOrders) {
      this.userOrders = JSON.parse(savedOrders);
    } else {
      this.userOrders = [];
    }
  }

  logout(): void {
    this.isUserMenuOpen = false;
    this.authService.logout();
    this.cdr.detectChanges();
  }

  closeAllModals(): void {
    this.isWishlistOpen = false;
    this.isUserMenuOpen = false;
    this.cdr.detectChanges();
  }
}