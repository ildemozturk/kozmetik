import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CartService, CartItem } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';

export interface AppliedCoupon {
  code: string;
  title: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  categoryScope: string;
  minOrderAmount: number;
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class CartComponent implements OnInit {
  couponInput: string = '';
  isApplyingCoupon: boolean = false;
  appliedCoupon: AppliedCoupon | null = null;
  discountAmount: number = 0;

  private apiUrl = 'http://localhost:5246/api';

  constructor(
    public cartService: CartService,
    private http: HttpClient,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const savedCoupon = localStorage.getItem('lumiere_applied_coupon');
    if (savedCoupon) {
      try {
        this.appliedCoupon = JSON.parse(savedCoupon);
        this.recalculateDiscount(false);
      } catch {
        this.appliedCoupon = null;
      }
    }
  }

  get finalGrandTotal(): number {
    const total = this.cartService.subtotal() - this.discountAmount + this.cartService.shippingFee();
    return total > 0 ? total : 0;
  }

  increaseQuantity(item: CartItem): void {
    this.cartService.updateQuantity(item.product.id, item.quantity + 1);
    this.recalculateDiscount(false);
  }

  decreaseQuantity(item: CartItem): void {
    this.cartService.updateQuantity(item.product.id, item.quantity - 1);
    this.recalculateDiscount(false);
  }

  removeItem(productId: number): void {
    const item = this.cartService.cartItems().find(i => i.product.id === productId);
    const productName = item?.product?.name || 'Ürün';

    this.cartService.removeFromCart(productId);
    this.toastService.success(`${productName} sepetten çıkarıldı.`);

    // Sepetteki ürün değişince kupon geçerliliğini sessizce kontrol et
    this.recalculateDiscount(true);
  }

  clearCart(): void {
    this.cartService.clearCart();
    
    // Kupon varsa sessizce temizle
    if (this.appliedCoupon) {
      this.appliedCoupon = null;
      this.discountAmount = 0;
      localStorage.removeItem('lumiere_applied_coupon');
    }

    this.toastService.success('Sepetiniz başarıyla temizlendi.');
    this.cdr.detectChanges();
  }

  applyCoupon(): void {
    const code = this.couponInput.trim().toUpperCase();
    if (!code) {
      this.toastService.error('Lütfen bir kupon kodu giriniz.');
      return;
    }

    if (this.cartService.cartItems().length === 0) {
      this.toastService.error('Sepetiniz boşken kupon uygulayamazsınız.');
      return;
    }

    this.isApplyingCoupon = true;

    this.http.get<any[]>(`${this.apiUrl}/Campaigns`).subscribe({
      next: (coupons) => {
        this.isApplyingCoupon = false;
        const coupon = coupons.find(c => c.code.toUpperCase() === code && c.isActive);

        if (!coupon) {
          this.toastService.error('Geçersiz veya süresi dolmuş kupon kodu.');
          return;
        }

        // Minimum sepet tutarı kontrolü
        if (coupon.minOrderAmount > 0 && this.cartService.subtotal() < coupon.minOrderAmount) {
          this.toastService.error(`Bu kupon en az ₺${coupon.minOrderAmount} tutarındaki sepetlerde geçerlidir.`);
          return;
        }

        // Kategori kısıtı kontrolü
        if (coupon.categoryScope && coupon.categoryScope !== 'Tümü') {
          const hasEligibleProduct = this.cartService.cartItems().some(
            item => item.product?.category?.toLowerCase() === coupon.categoryScope.toLowerCase()
          );

          if (!hasEligibleProduct) {
            this.toastService.error(`Bu kupon sadece "${coupon.categoryScope}" kategorisindeki ürünlerde geçerlidir.`);
            return;
          }
        }

        this.appliedCoupon = {
          code: coupon.code,
          title: coupon.title,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          categoryScope: coupon.categoryScope,
          minOrderAmount: coupon.minOrderAmount
        };

        localStorage.setItem('lumiere_applied_coupon', JSON.stringify(this.appliedCoupon));
        this.couponInput = '';
        this.recalculateDiscount(false);
        this.toastService.success(`"${coupon.code}" kuponu başarıyla uygulandı!`);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isApplyingCoupon = false;
        this.toastService.error('Kupon doğrulanırken bir hata oluştu.');
      }
    });
  }

  // Kullanıcı butona basarak kuponu kaldırdığında çağrılır
  removeCoupon(showToast: boolean = true): void {
    if (this.appliedCoupon) {
      this.appliedCoupon = null;
      this.discountAmount = 0;
      localStorage.removeItem('lumiere_applied_coupon');
      if (showToast) {
        this.toastService.success('Kupon kaldırıldı.');
      }
      this.cdr.detectChanges();
    }
  }

  recalculateDiscount(notifyIfInvalid: boolean = false): void {
    if (!this.appliedCoupon) {
      this.discountAmount = 0;
      return;
    }

    // Sepette ürün kalmadıysa kuponu temizle
    if (this.cartService.cartItems().length === 0) {
      this.removeCoupon(false);
      return;
    }

    // Minimum sepet tutarı artık karşılanmıyorsa
    if (this.appliedCoupon.minOrderAmount > 0 && this.cartService.subtotal() < this.appliedCoupon.minOrderAmount) {
      if (notifyIfInvalid) {
        this.toastService.error(`Sepet tutarı ₺${this.appliedCoupon.minOrderAmount} altına düştüğü için "${this.appliedCoupon.code}" kuponu iptal edildi.`);
      }
      this.removeCoupon(false);
      return;
    }

    let eligibleSubtotal = this.cartService.subtotal();

    // Özel kategori kontrolü
    if (this.appliedCoupon.categoryScope && this.appliedCoupon.categoryScope !== 'Tümü') {
      eligibleSubtotal = this.cartService.cartItems()
        .filter(item => item.product?.category?.toLowerCase() === this.appliedCoupon?.categoryScope.toLowerCase())
        .reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

      // Kategoriye ait ürün sepetten çıkarıldıysa kupon iptal edilir
      if (eligibleSubtotal === 0) {
        if (notifyIfInvalid) {
          this.toastService.error(`"${this.appliedCoupon.categoryScope}" kategorisindeki ürün sepetten çıkarıldığı için "${this.appliedCoupon.code}" kuponu iptal edildi.`);
        }
        this.removeCoupon(false);
        return;
      }
    }

    if (this.appliedCoupon.discountType === 'PERCENTAGE') {
      this.discountAmount = (eligibleSubtotal * this.appliedCoupon.discountValue) / 100;
    } else {
      this.discountAmount = Math.min(this.appliedCoupon.discountValue, eligibleSubtotal);
    }

    this.cdr.detectChanges();
  }
}