import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { WishlistService } from '../../services/wishlist.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/product';

export interface UserOrderProduct {
  productId: number;
  productName: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
}

export interface UserOrder {
  id: number;
  orderNo: string;
  totalAmount: number;
  createdDate?: string;
  status: string;
  items: UserOrderProduct[];
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
  isLoadingOrders: boolean = false;

  userOrders: UserOrder[] = [];

  private apiUrl = 'http://localhost:5246/api';
  private wishlistSub!: Subscription;

  constructor(
    public wishlistService: WishlistService,
    public cartService: CartService,
    public authService: AuthService,
    private http: HttpClient,
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
      this.isOrdersModalOpen = false;
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
        this.isOrdersModalOpen = false;
      }
      this.cdr.detectChanges();
    }
  }

  openOrdersModal(): void {
    this.isUserMenuOpen = false;
    this.isWishlistOpen = false;
    this.isOrdersModalOpen = true;
    this.loadUserOrders();
    this.cdr.detectChanges();
  }

  closeOrdersModal(): void {
    this.isOrdersModalOpen = false;
    this.cdr.detectChanges();
  }

  loadUserOrders(): void {
    const user = this.currentUser;
    const email = user?.email;

    if (!email) {
      this.userOrders = [];
      return;
    }

    this.isLoadingOrders = true;
    const token = localStorage.getItem('token') || localStorage.getItem('jwt') || localStorage.getItem('lumiere_token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    this.http.get<any>(`${this.apiUrl}/Orders/my-orders?email=${encodeURIComponent(email)}`, { headers }).subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          this.userOrders = res;
        } else if (res && Array.isArray(res.data)) {
          this.userOrders = res.data;
        } else {
          this.userOrders = [];
        }
        this.isLoadingOrders = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingOrders = false;
        this.userOrders = [];
        this.cdr.detectChanges();
      }
    });
  }

  logout(): void {
    this.isUserMenuOpen = false;
    this.isOrdersModalOpen = false;
    this.authService.logout();
    this.cdr.detectChanges();
  }
}