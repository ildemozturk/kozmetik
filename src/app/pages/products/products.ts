import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
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
    this.productService.getCategories().subscribe(res => {
      this.categories = res;
      this.cdr.detectChanges();
    });
  }

  loadProducts(): void {
    // Backend'e tüm filtre parametrelerini geçiyoruz (Filtreleme SQL düzeyinde yapılıyor)
    this.productService.getProducts(
      this.selectedCategory, 
      this.currentPage, 
      this.pageSize, 
      this.selectedSort, 
      this.selectedStockFilter
    ).subscribe(res => {
      const fetched = res.data;

      this.products = fetched.map(p => ({
        ...p,
        isFavorite: this.wishlistService.isFavorite(p.id)
      }));

      this.totalPages = res.totalPages;
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
    this.wishlistService.toggleWishlist(product);
    product.isFavorite = this.wishlistService.isFavorite(product.id);
    this.cdr.detectChanges();
  }

  addToCart(product: Product, event: Event): void {
    event.stopPropagation();
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