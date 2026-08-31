import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Product } from '../../models/product';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, RouterLink],
  templateUrl: './products.html',
  styleUrl: './products.css'
})
export class ProductsComponent implements OnInit, OnDestroy {
  products: (Product & { isFavorite?: boolean })[] = [];
  categories: string[] = [];
  
  selectedCategory: string = '';
  selectedSort: string = 'default';
  selectedStockFilter: string = 'all';

  currentPage: number = 1;
  pageSize: number = 12;
  totalPages: number = 1;
  pagesArray: number[] = [];

  activeSlide: number = 0;
  autoSlideTimer: any;

  private wishlistSub!: Subscription;

  constructor(
    private productService: ProductService,
    public cartService: CartService,
    public wishlistService: WishlistService,
    private authService: AuthService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.startAutoSlide();

    this.wishlistSub = this.wishlistService.wishlistSubject.subscribe(() => {
      this.syncFavoriteStates();
      this.cdr.detectChanges();
    });

    this.route.queryParams.subscribe(params => {
      this.currentPage = params['page'] ? Number(params['page']) : 1;
      this.selectedCategory = params['category'] || '';
      this.selectedSort = params['sort'] || 'default';
      this.selectedStockFilter = params['stock'] || 'all';

      this.loadProducts();
    });
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
    if (this.wishlistSub) {
      this.wishlistSub.unsubscribe();
    }
  }

  loadCategories(): void {
    this.productService.getCategories().subscribe((res: string[]) => {
      this.categories = res;
      this.cdr.detectChanges();
    });
  }

  loadProducts(): void {
    this.productService.getProducts(
      this.selectedCategory, 
      this.currentPage, 
      this.pageSize, 
      this.selectedSort, 
      this.selectedStockFilter
    ).subscribe((res: any) => {
      const fetched: any[] = res.data || (Array.isArray(res) ? res : []);

      this.products = fetched.map((p: any) => {
        const qty = Number(
          p.stockQuantity !== undefined ? p.stockQuantity :
          (p.stock?.quantity !== undefined ? p.stock.quantity : 0)
        );

        return {
          id: p.id,
          name: p.name,
          price: Number(p.price),
          oldPrice: p.oldPrice ? Number(p.oldPrice) : undefined,
          imageUrl: p.imageUrl,
          category: p.category,
          description: p.description || '',
          stockQuantity: qty,
          stock: {
            id: p.stock?.id || p.id,
            quantity: qty,
            lastUpdated: p.stock?.lastUpdated || new Date().toISOString()
          },
          status: qty <= 0 ? 'Tükendi' : (qty <= 12 ? 'Kritik' : 'Stokta Var'),
          isFavorite: this.wishlistService.isFavorite(p.id)
        } as (Product & { isFavorite?: boolean });
      });

      this.totalPages = res.totalPages || 1;
      this.pagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
      this.cdr.detectChanges();

      const savedY = sessionStorage.getItem('products_scroll_y');
      if (savedY) {
        setTimeout(() => {
          window.scrollTo(0, Number(savedY));
          sessionStorage.removeItem('products_scroll_y');
        }, 50);
      }
    });
  }

  syncFavoriteStates(): void {
    if (this.products && this.products.length > 0) {
      this.products.forEach(p => {
        p.isFavorite = this.wishlistService.isFavorite(p.id);
      });
    }
  }

  saveScrollPosition(): void {
    sessionStorage.setItem('products_scroll_y', window.scrollY.toString());
  }

  updateQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: this.currentPage > 1 ? this.currentPage : null,
        category: this.selectedCategory || null,
        sort: this.selectedSort !== 'default' ? this.selectedSort : null,
        stock: this.selectedStockFilter !== 'all' ? this.selectedStockFilter : null
      },
      queryParamsHandling: 'merge'
    });
  }

  selectCategory(cat: string): void {
    this.selectedCategory = cat;
    this.currentPage = 1;
    this.updateQueryParams();
  }

  onSortChange(): void {
    this.currentPage = 1;
    this.updateQueryParams();
  }

  onStockFilterChange(): void {
    this.currentPage = 1;
    this.updateQueryParams();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateQueryParams();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getOldPrice(product: Product): number | null {
    return product.oldPrice ? Number(product.oldPrice) : null;
  }

  isDiscounted(product: Product): boolean {
    const oldP = this.getOldPrice(product);
    return !!(oldP && oldP > Number(product.price));
  }

  toggleFavorite(product: Product & { isFavorite?: boolean }, event: Event): void {
    event.stopPropagation();

    // Üye girişi kontrolü
    if (!this.authService.isLoggedIn()) {
      this.toastService.error('Ürünü favorilere eklemek için lütfen giriş yapınız.');
      this.router.navigate(['/login']);
      return;
    }

    this.wishlistService.toggleWishlist(product);
    product.isFavorite = this.wishlistService.isFavorite(product.id);
    this.cdr.detectChanges();
  }

  addToCart(product: Product, event: Event): void {
    event.stopPropagation();
    const currentStock = (product.stockQuantity ?? product.stock?.quantity ?? 0);
    if (currentStock <= 0) return;
    this.cartService.addToCart(product);
    this.cdr.detectChanges();
  }

  decreaseCartQuantity(product: Product, event: Event): void {
    event.stopPropagation();
    const currentQty = this.cartService.getItemQuantity(product.id);
    this.cartService.updateQuantity(product.id, currentQty - 1);
    this.cdr.detectChanges();
  }

  startAutoSlide(): void {
    this.autoSlideTimer = setInterval(() => {
      this.activeSlide = (this.activeSlide + 1) % 4;
      this.cdr.detectChanges();
    }, 4000);
  }

  stopAutoSlide(): void {
    if (this.autoSlideTimer) {
      clearInterval(this.autoSlideTimer);
    }
  }

  setSlide(index: number): void {
    this.activeSlide = index;
    this.cdr.detectChanges();
  }
}