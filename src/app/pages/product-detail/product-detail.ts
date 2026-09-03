import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
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

  // =========================================================
  // EMAILJS - STOK BİLDİRİM TALEBİ ONAY MAILİ
  // =========================================================
  private readonly EMAILJS_SERVICE_ID = 'service_c4y5jt6';
  private readonly EMAILJS_TEMPLATE_ID = 'template_wmaljyv';
  private readonly EMAILJS_PUBLIC_KEY = 'U2xFXa2IIjWE9bO77';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    public cartService: CartService,
    public wishlistService: WishlistService,
    private authService: AuthService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {

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

  // =========================================================
  // ÜRÜN DETAYINI GETİR
  // =========================================================
  loadProductDetail(id: number): void {

    this.loading = true;
    this.cdr.detectChanges();

    this.productService.getProductById(id).subscribe({

      next: (data: any) => {

        let qty = 0;

        if (
          data.stockQuantity !== undefined &&
          data.stockQuantity !== null
        ) {

          qty = Number(data.stockQuantity);

        } else if (
          data.stock?.quantity !== undefined &&
          data.stock?.quantity !== null
        ) {

          qty = Number(data.stock.quantity);

        } else if (typeof data.stock === 'number') {

          qty = Number(data.stock);

        } else if (
          data.quantity !== undefined &&
          data.quantity !== null
        ) {

          qty = Number(data.quantity);

        }

        this.product = {

          ...data,

          id: data.id,
          name: data.name,
          price: Number(data.price),

          oldPrice: data.oldPrice
            ? Number(data.oldPrice)
            : undefined,

          stockQuantity: qty,

          stock: {
            id: data.stock?.id || data.id,
            quantity: qty,
            lastUpdated:
              data.stock?.lastUpdated ||
              new Date().toISOString()
          },

          isFavorite:
            this.wishlistService.isFavorite(data.id)

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

  // =========================================================
  // GÜNCEL STOK
  // =========================================================
  get currentProductStock(): number {

    if (!this.product) {
      return 0;
    }

    return this.product.stockQuantity !== undefined
      ? this.product.stockQuantity
      : (this.product.stock?.quantity ?? 0);

  }

  // =========================================================
  // FAVORİ DURUMUNU SENKRONİZE ET
  // =========================================================
  private syncFavoriteState(): void {

    if (this.product) {

      this.product.isFavorite =
        this.wishlistService.isFavorite(this.product.id);

    }

  }

  // =========================================================
  // SEPETE EKLE
  // =========================================================
  addToCart(product: Product = this.product!): void {

    if (!product || this.currentProductStock <= 0) {
      return;
    }

    // Üye girişi kontrolü
    if (!this.authService.isLoggedIn()) {

      this.toastService.error(
        'Sepete ürün eklemek ve satın almak için lütfen giriş yapınız.'
      );

      this.router.navigate(['/login']);

      return;
    }

    this.cartService.addToCart(product);

    this.cdr.detectChanges();

  }

  // =========================================================
  // SEPET ADET AZALT
  // =========================================================
  decreaseCartQuantity(product: Product = this.product!): void {

    if (!product) {
      return;
    }

    // Üye girişi kontrolü
    if (!this.authService.isLoggedIn()) {

      this.toastService.error(
        'Lütfen önce giriş yapınız.'
      );

      this.router.navigate(['/login']);

      return;
    }

    const currentQty =
      this.cartService.getItemQuantity(product.id);

    this.cartService.updateQuantity(
      product.id,
      currentQty - 1
    );

    this.cdr.detectChanges();

  }

  // =========================================================
  // FAVORİYE EKLE / ÇIKAR
  // =========================================================
  toggleFavorite(product: Product = this.product!): void {

    if (!product) {
      return;
    }

    // Üye girişi kontrolü
    if (!this.authService.isLoggedIn()) {

      this.toastService.error(
        'Ürünü favorilere eklemek için lütfen giriş yapınız.'
      );

      this.router.navigate(['/login']);

      return;
    }

    this.wishlistService.toggleWishlist(product);

    this.syncFavoriteState();

    this.cdr.detectChanges();

  }

  // =========================================================
  // STOK GELİNCE HABER VER MODALI
  // =========================================================
  openNotifyModal(): void {

    this.notifyEmail = '';
    this.notifySuccess = false;
    this.isSendingEmail = false;

    this.showNotifyModal = true;

    this.cdr.detectChanges();

  }

  // =========================================================
  // MODALI KAPAT
  // =========================================================
  closeNotifyModal(): void {

    this.showNotifyModal = false;

    this.cdr.detectChanges();

  }

  // =========================================================
  // STOK BİLDİRİM TALEBİ
  // =========================================================
  submitNotifyForm(): void {

    if (
      !this.notifyEmail ||
      !this.notifyEmail.includes('@') ||
      !this.product
    ) {

      return;
    }

    this.isSendingEmail = true;
    this.cdr.detectChanges();

    const email = this.notifyEmail.trim();
    const product = this.product;

    // =======================================================
    // 1. ADIM
    // Bildirim talebini BACKEND'e kaydet
    // =======================================================
    this.productService
      .subscribeStockNotification(product.id, email)
      .subscribe({

        next: (response: any) => {

          console.log(
            'Stok bildirim talebi backend tarafından kaydedildi:',
            response
          );

          // =================================================
          // 2. ADIM
          // Kullanıcıya "Talep Alındı" maili gönder
          // template_wmaljyv
          // =================================================
          const templateParams = {

            to_email: email,

            product_name: product.name

          };

          emailjs.send(

            this.EMAILJS_SERVICE_ID,

            this.EMAILJS_TEMPLATE_ID,

            templateParams,

            this.EMAILJS_PUBLIC_KEY

          ).then(() => {

            console.log(
              'Stok bildirim talebi onay maili gönderildi.'
            );

            this.isSendingEmail = false;

            this.notifySuccess = true;

            this.cdr.detectChanges();

            setTimeout(() => {

              this.closeNotifyModal();

            }, 2500);

          }).catch((error) => {

            console.error(
              'Talep onay e-postası gönderilemedi:',
              error
            );

            // Backend kaydı başarılı olduğu için
            // kullanıcıya işlemin tamamlandığını gösteriyoruz.
            this.isSendingEmail = false;

            this.notifySuccess = true;

            this.cdr.detectChanges();

            setTimeout(() => {

              this.closeNotifyModal();

            }, 2500);

          });

        },

        error: (error) => {

          console.error(
            'Stok bildirim talebi backend tarafında kaydedilemedi:',
            error
          );

          this.isSendingEmail = false;

          this.cdr.detectChanges();

        }

      });

  }

}