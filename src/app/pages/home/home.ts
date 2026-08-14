import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, CurrencyPipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { WishlistService } from '../../services/wishlist.service';
import { CartService } from '../../services/cart.service';
import { Product } from '../../models/product';

interface Slide {
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('bestSellersContainer') bestSellersContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('discountContainer') discountContainer!: ElementRef<HTMLDivElement>;

  bestSellers: (Product & { isFavorite?: boolean })[] = [];
  discountedProducts: (Product & { isFavorite?: boolean })[] = [];

  activeSlide: number = 0;
  totalSlides: number = 4;
  carouselTimer: any;
  private wishlistSub!: Subscription;

  slides: Slide[] = [
    {
      subtitle: 'Yeni Koleksiyon',
      title: 'Işıltını Doğallıktan Al',
      description: 'Cildine hak ettiği bakımı sağlayan %100 doğal içerikli nemlendirici ve serumlarda indirim fırsatları.',
      imageUrl: 'https://e-fillers.com/storage/uploads/blogs/5-signs-its-time-for-a-skincare-update-when-to-consider-aesthetic-treatments/1725549249841_rendered-photo-beautiful-model-applying-skin-care-products-flat-illustration.webp'
    },
    {
      subtitle: 'Özel Seri',
      title: 'Yenileyici Gece Bakımı',
      description: 'Uyku boyunca cildini besleyen ve tazeleyen hyalüronik asit kompleksi ile güne canlı başla.',
      imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSstZizzmwtidEyk8kIn3dknjCxDz_9BNXYMngwV6xa4MJ2jBphRhB1WsVI&s=10'
    },
    {
      subtitle: 'Sezon Favorileri',
      title: 'Doğal Işıltı & Makyaj',
      description: 'Hafif dokulu fondötenler ve ipeksi allıklarla doğal güzelliğini ön plana çıkar.',
      imageUrl: 'https://images.unsplash.com/photo-1676570092589-a6c09ecbb373?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bWFrZXVwJTIwcHJvZHVjdHMlMjBwaW5rJTIwYmFja2dyb3VuZHxlbnwwfHwwfHx8MA%3D%3D'
    },
    {
      subtitle: 'Sınırlı Stok',
      title: 'Yüz Serumları',
      description: 'Leke karşıtı ve ton eşitleyici konsantre formül ile cildinde anında aydınlık etki.',
      imageUrl: 'https://witcdn.procsin.com/Data/Blog/54.jpg'
    }
  ];

  constructor(
    private productService: ProductService,
    public wishlistService: WishlistService,
    public cartService: CartService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    // Favori servisindeki yayınları anlık dinliyoruz
    this.wishlistSub = this.wishlistService.wishlistSubject.subscribe(() => {
      this.syncFavoriteStates();
      this.cdr.detectChanges();
    });

    this.loadFeaturedProducts();
    this.startAutoSlide();
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
    if (this.wishlistSub) {
      this.wishlistSub.unsubscribe();
    }
  }

  startAutoSlide(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.carouselTimer = setInterval(() => {
        this.nextSlide();
      }, 5000);
    }
  }

  stopAutoSlide(): void {
    if (this.carouselTimer) {
      clearInterval(this.carouselTimer);
    }
  }

  nextSlide(): void {
    this.activeSlide = (this.activeSlide + 1) % this.totalSlides;
    this.cdr.detectChanges();
  }

  setSlide(index: number): void {
    this.activeSlide = index;
    this.stopAutoSlide();
    this.startAutoSlide();
  }

  loadFeaturedProducts(): void {
    // 1. GERÇEK BEST SELLERS ENDPOINT'İNİ ÇAĞIRIYORUZ:
    this.productService.getBestSellers(8).subscribe({
      next: (data: Product[]) => {
        this.bestSellers = [...data];
        this.syncFavoriteStates();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Best sellers yüklenirken hata oluştu:', err);
      }
    });

    // 2. İNDİRİMLİ ÜRÜNLER İÇİN NORMAL ÜRÜNLERİ ÇAĞIRIYORUZ:
    this.productService.getProducts('', 1, 30).subscribe(res => {
      const allProducts: Product[] = res.data;
      this.discountedProducts = allProducts.filter((p: Product) => this.isDiscounted(p));
      this.syncFavoriteStates();
      this.cdr.detectChanges();
    });
  }

  saveScrollPosition(): void {
    sessionStorage.setItem('home_scroll_y', window.scrollY.toString());
  }

  private syncFavoriteStates(): void {
    if (this.bestSellers && this.bestSellers.length > 0) {
      this.bestSellers = this.bestSellers.map((p: Product) => ({
        ...p,
        isFavorite: this.wishlistService.isFavorite(p.id)
      }));
    }

    if (this.discountedProducts && this.discountedProducts.length > 0) {
      this.discountedProducts = this.discountedProducts.map((p: Product) => ({
        ...p,
        isFavorite: this.wishlistService.isFavorite(p.id)
      }));
    }
  }

  getOldPrice(product: Product): number | null {
    const val = product.oldPrice;
    return val ? Number(val) : null;
  }

  isDiscounted(product: Product): boolean {
    const oldP = this.getOldPrice(product);
    const currentP = Number(product.price);
    return !!(oldP && oldP > currentP);
  }

  scroll(containerType: 'bestSellers' | 'discount', direction: 'left' | 'right'): void {
    const targetContainer = containerType === 'bestSellers' ? this.bestSellersContainer : this.discountContainer;
    if (targetContainer) {
      const scrollAmount = 280;
      targetContainer.nativeElement.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }

  toggleFavorite(product: Product & { isFavorite?: boolean }, event: Event): void {
    event.stopPropagation();
    this.wishlistService.toggleWishlist(product);
  }

  addToCart(product: Product, event: Event): void {
    event.stopPropagation();
    this.cartService.addToCart(product);
  }

  decreaseCartQuantity(product: Product, event: Event): void {
    event.stopPropagation();
    const currentQty = this.cartService.getItemQuantity(product.id);
    this.cartService.updateQuantity(product.id, currentQty - 1);
  }
}