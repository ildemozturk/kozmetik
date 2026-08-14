import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { Product } from '../../models/product';
import emailjs from '@emailjs/browser';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink, FormsModule],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css'
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  product: (Product & { isFavorite?: boolean }) | null = null;
  loading: boolean = true;

  // Modal & EmailJS Alanları
  showNotifyModal: boolean = false;
  notifyEmail: string = '';
  notifySuccess: boolean = false;
  isSendingEmail: boolean = false;

  private wishlistSub!: Subscription;

  // EmailJS Konfigürasyon Bilgileri
  private readonly EMAILJS_SERVICE_ID = 'service_c4y5jt6';
  private readonly EMAILJS_TEMPLATE_ID = 'template_wmaljyv';
  private readonly EMAILJS_PUBLIC_KEY = 'U2xFXa2IIjWE9bO77';

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    public cartService: CartService,
    public wishlistService: WishlistService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Favori panelinden veya başka bileşenden yapılan favori değişimlerini anlık dinliyoruz
    this.wishlistSub = this.wishlistService.wishlistSubject.subscribe(() => {
      this.syncFavoriteState();
      this.cdr.detectChanges();
    });

    this.route.paramMap.subscribe(params => {
      const productId = Number(params.get('id'));
      if (productId) {
        this.loadProductDetail(productId);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.wishlistSub) {
      this.wishlistSub.unsubscribe();
    }
  }

  loadProductDetail(id: number): void {
    this.loading = true;
    this.cdr.detectChanges();

    this.productService.getProductById(id).subscribe({
      next: (data) => {
        this.product = {
          ...data,
          isFavorite: this.wishlistService.isFavorite(data.id)
        };
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.product = null;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Favori durumunu WishlistService verisiyle anlık senkronize eden metod
  private syncFavoriteState(): void {
    if (this.product) {
      this.product.isFavorite = this.wishlistService.isFavorite(this.product.id);
    }
  }

  addToCart(product: Product = this.product!): void {
    if (product) {
      this.cartService.addToCart(product);
      this.cdr.detectChanges();
    }
  }

  decreaseCartQuantity(product: Product = this.product!): void {
    if (product) {
      const currentQty = this.cartService.getItemQuantity(product.id);
      this.cartService.updateQuantity(product.id, currentQty - 1);
      this.cdr.detectChanges();
    }
  }

  toggleFavorite(product: Product = this.product!): void {
    if (product) {
      this.wishlistService.toggleWishlist(product);
      this.syncFavoriteState();
      this.cdr.detectChanges();
    }
  }

  openNotifyModal(): void {
    this.notifyEmail = '';
    this.notifySuccess = false;
    this.isSendingEmail = false;
    this.showNotifyModal = true;
    this.cdr.detectChanges();
  }

  closeNotifyModal(): void {
    this.showNotifyModal = false;
    this.cdr.detectChanges();
  }

  submitNotifyForm(): void {
    if (!this.notifyEmail || !this.notifyEmail.includes('@') || !this.product) {
      return;
    }

    this.isSendingEmail = true;
    this.cdr.detectChanges();

    const templateParams = {
      to_email: this.notifyEmail,
      product_name: this.product.name
    };

    emailjs.send(
      this.EMAILJS_SERVICE_ID,
      this.EMAILJS_TEMPLATE_ID,
      templateParams,
      this.EMAILJS_PUBLIC_KEY
    ).then(() => {
      this.isSendingEmail = false;
      this.notifySuccess = true;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.closeNotifyModal();
      }, 2500);
    }).catch((error) => {
      console.error('E-posta gönderimi başarısız:', error);
      this.isSendingEmail = false;
      this.cdr.detectChanges();
    });
  }
}