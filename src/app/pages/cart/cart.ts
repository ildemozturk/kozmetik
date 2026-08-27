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
        this.recalculateDiscount();
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
    this.recalculateDiscount();
  }

  decreaseQuantity(item: CartItem): void {
    this.cartService.updateQuantity(item.product.id, item.quantity - 1);
    this.recalculateDiscount();
  }

  removeItem(productId: number): void {
    this.cartService.removeFromCart(productId);
    this.recalculateDiscount();
  }

  clearCart(): void {
    this.cartService.clearCart();
    this.removeCoupon();
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

        // Min sepet tutarı kontrolü
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
        this.recalculateDiscount();
        this.toastService.success(`"${coupon.code}" kuponu başarıyla uygulandı!`);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isApplyingCoupon = false;
        this.toastService.error('Kupon doğrulanırken bir hata oluştu.');
      }
    });
  }

  removeCoupon(): void {
    this.appliedCoupon = null;
    this.discountAmount = 0;
    localStorage.removeItem('lumiere_applied_coupon');
    this.toastService.success('Kupon kaldırıldı.');
    this.cdr.detectChanges();
  }

  recalculateDiscount(): void {
    if (!this.appliedCoupon || this.cartService.cartItems().length === 0) {
      this.discountAmount = 0;
      return;
    }

    let eligibleSubtotal = this.cartService.subtotal();

    if (this.appliedCoupon.categoryScope && this.appliedCoupon.categoryScope !== 'Tümü') {
      eligibleSubtotal = this.cartService.cartItems()
        .filter(item => item.product?.category?.toLowerCase() === this.appliedCoupon?.categoryScope.toLowerCase())
        .reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

      if (eligibleSubtotal === 0) {
        this.removeCoupon();
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