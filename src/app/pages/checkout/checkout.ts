import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CartService } from '../../services/cart.service';

interface City {
  plateCode: number;
  name: string;
  discritCount: number;
  discrits: string[];
}

export interface AppliedCoupon {
  code: string;
  title: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  categoryScope: string;
  minOrderAmount: number;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class CheckoutComponent implements OnInit {
  checkoutForm!: FormGroup;
  isProcessing: boolean = false;

  // ============================================================
  // KUPON / İNDİRİM
  // ============================================================
  appliedCoupon: AppliedCoupon | null = null;
  discountAmount: number = 0;

  // ============================================================
  // BAŞARI DURUMU
  // ============================================================
  isOrderSuccess: boolean = false;
  orderNumber: string = '';
  orderDate: Date = new Date();
  token: string = '';

  // ============================================================
  // ŞEHİR / İLÇE
  // ============================================================
  cities: City[] = [];
  districts: string[] = [];
  isCityDropdownOpen: boolean = false;
  isDistrictDropdownOpen: boolean = false;

  // ============================================================
  // TOAST
  // ============================================================
  toastMessage: string = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;

  // ============================================================
  // API
  // ============================================================
  private apiUrl = 'http://localhost:5246/api';

  constructor(
    public cartService: CartService,
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  // ============================================================
  // INIT
  // ============================================================
  ngOnInit(): void {
    this.initForms();
    this.setupFormatters();
    this.loadCitiesFromApi();
    this.loadCouponAndCalculateDiscount();
    this.checkPaymentStatus();
  }

  // ============================================================
  // KUPON YÜKLE
  // ============================================================
  loadCouponAndCalculateDiscount(): void {
    const savedCoupon = localStorage.getItem('lumiere_applied_coupon');

    if (savedCoupon) {
      try {
        this.appliedCoupon = JSON.parse(savedCoupon);
        this.calculateDiscount();
      } catch {
        this.appliedCoupon = null;
        this.discountAmount = 0;
      }
    } else {
      this.appliedCoupon = null;
      this.discountAmount = 0;
    }
  }

  // ============================================================
  // KUPON İNDİRİM HESAPLA
  // ============================================================
  calculateDiscount(): void {
    if (!this.appliedCoupon || this.cartService.cartItems().length === 0) {
      this.discountAmount = 0;
      return;
    }

    let eligibleSubtotal = this.cartService.subtotal();

    // Kategoriye özel kupon
    if (this.appliedCoupon.categoryScope && this.appliedCoupon.categoryScope !== 'Tümü') {
      const category = this.appliedCoupon.categoryScope.toLowerCase();

      eligibleSubtotal = this.cartService
        .cartItems()
        .filter(item => item.product?.category?.toLowerCase() === category)
        .reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    }

    // Yüzde indirim
    if (this.appliedCoupon.discountType === 'PERCENTAGE') {
      this.discountAmount = (eligibleSubtotal * this.appliedCoupon.discountValue) / 100;
    } else {
      // Sabit indirim
      this.discountAmount = Math.min(this.appliedCoupon.discountValue, eligibleSubtotal);
    }

    // Para değerini iki haneye sabitle
    this.discountAmount = Math.round((this.discountAmount + Number.EPSILON) * 100) / 100;
    this.cdr.detectChanges();
  }

  // ============================================================
  // ÖDENECEK SON TUTAR
  // Ara toplam - kupon + kargo
  // ============================================================
  get finalPayableAmount(): number {
    const total = this.cartService.subtotal() - this.discountAmount + this.cartService.shippingFee();
    return Math.max(0, Math.round((total + Number.EPSILON) * 100) / 100);
  }

  // ============================================================
  // ÖDEME DÖNÜŞ DURUMU
  // ============================================================
  private checkPaymentStatus(): void {
    this.route.queryParams.subscribe(params => {
      if (params['status'] === 'success') {
        this.isOrderSuccess = true;
        this.token = params['token'] || '';
        this.orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);

        this.saveOrderToHistory();
        this.cartService.clearCart(false);

        localStorage.removeItem('lumiere_applied_coupon');
        localStorage.removeItem('lumiere_pending_coupon');

        this.cdr.detectChanges();
      } else if (params['status'] === 'error') {
        localStorage.removeItem('lumiere_pending_coupon');
        this.showToast('Ödeme işlemi başarısız oldu veya iptal edildi.', 'error');
      }
    });
  }

  // ============================================================
  // LOCAL ORDER HISTORY
  // ============================================================
  private saveOrderToHistory(): void {
    const items = this.cartService
      .cartItems()
      .map(item => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        imageUrl: item.product.imageUrl
      }));

    if (items.length === 0) {
      return;
    }

    const newOrder = {
      id: this.orderNumber || 'ORD-' + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toISOString(),
      status: 'Hazırlanıyor',
      totalAmount: this.finalPayableAmount,
      items
    };

    const existingOrders = JSON.parse(localStorage.getItem('lumiere_orders') || '[]');
    existingOrders.unshift(newOrder);
    localStorage.setItem('lumiere_orders', JSON.stringify(existingOrders));
  }

  // ============================================================
  // FORM
  // ============================================================
  private initForms(): void {
    this.checkoutForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.maxLength(11)]],
      city: ['', Validators.required],
      district: [{ value: '', disabled: true }, Validators.required],
      address: ['', Validators.required]
    });
  }

  // ============================================================
  // TELEFON FORMATLAMA
  // ============================================================
  private setupFormatters(): void {
    this.checkoutForm.get('phone')?.valueChanges.subscribe(val => {
      if (!val) {
        return;
      }

      const digitsOnly = val.replace(/\D/g, '').slice(0, 11);

      if (val !== digitsOnly) {
        this.checkoutForm.get('phone')?.setValue(digitsOnly, { emitEvent: false });
      }
    });
  }

  // ============================================================
  // ŞEHİRLER
  // ============================================================
  loadCitiesFromApi(): void {
    fetch('https://mertmtn.github.io/CityDistrictJSONAPI/all-city-district.json')
      .then(res => res.json())
      .then((res: any) => {
        if (res && res.city && Array.isArray(res.city)) {
          this.cities = res.city;
          this.cdr.detectChanges();
        }
      })
      .catch(err => {
        console.error('İl/İlçe API Yükleme Hatası:', err);
      });
  }

  // ============================================================
  // ŞEHİR SEÇ
  // ============================================================
  selectCity(city: City): void {
    this.checkoutForm.patchValue({
      city: city.name,
      district: ''
    });

    this.isCityDropdownOpen = false;

    if (city.discrits && city.discrits.length > 0) {
      this.districts = city.discrits;
      this.checkoutForm.get('district')?.enable();
    } else {
      this.districts = [];
      this.checkoutForm.get('district')?.disable();
    }
  }

  // ============================================================
  // İLÇE SEÇ
  // ============================================================
  selectDistrict(district: string): void {
    this.checkoutForm.patchValue({ district });
    this.isDistrictDropdownOpen = false;
  }

  // ============================================================
  // TOAST
  // ============================================================
  showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;

    const toastEl = document.getElementById('orderToast');
    if (toastEl) {
      toastEl.classList.add('show');
    }

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.toastTimeout = setTimeout(() => {
      this.hideToast();
    }, 5000);
  }

  hideToast(): void {
    const toastEl = document.getElementById('orderToast');
    if (toastEl) {
      toastEl.classList.remove('show');
    }
  }

  // ============================================================
  // ÖDEME
  // ============================================================
  processPayment(): void {
    if (this.checkoutForm.invalid) {
      this.showToast('Lütfen teslimat ve adres bilgilerini eksiksiz doldurunuz.', 'error');
      return;
    }

    if (this.cartService.cartItems().length === 0) {
      this.showToast('Sepetinizde ödeme yapılacak ürün bulunmuyor.', 'error');
      return;
    }

    if (this.finalPayableAmount <= 0) {
      this.showToast('Ödenecek tutar geçersiz.', 'error');
      return;
    }

    this.isProcessing = true;

    if (this.appliedCoupon && this.appliedCoupon.code) {
      localStorage.setItem('lumiere_pending_coupon', this.appliedCoupon.code);
    }

    let loggedInEmail = '';
    const userStr = localStorage.getItem('lumiere_user') ||
      localStorage.getItem('user') ||
      localStorage.getItem('cosmetic_user');

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.email) {
          loggedInEmail = user.email.trim().toLowerCase();
        }
      } catch {
        // Sessizce devam et
      }
    }

    const city = this.checkoutForm.value.city;
    const district = this.checkoutForm.value.district;
    const rawAddress = this.checkoutForm.value.address;
    const fullAddress = `${rawAddress}`;

    const orderPayload = {
      customerName: this.checkoutForm.value.fullName,
      email: loggedInEmail || this.checkoutForm.value.email,
      phone: this.checkoutForm.value.phone,
      city,
      district,
      address: fullAddress,
      totalAmount: this.finalPayableAmount,
      couponCode: this.appliedCoupon?.code || '',
      orderItems: this.cartService.cartItems().map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.price
      }))
    };

    console.log('IYZICO ÖDEME PAYLOAD:', orderPayload);
    console.log('Ara toplam:', this.cartService.subtotal());
    console.log('Kupon indirimi:', this.discountAmount);
    console.log('Kargo:', this.cartService.shippingFee());
    console.log('IYZICO TOTAL:', this.finalPayableAmount);

    this.http.post<any>(`${this.apiUrl}/orders/initiate-payment`, orderPayload).subscribe({
      next: (res) => {
        this.isProcessing = false;
        console.log('IYZICO INITIALIZE RESPONSE:', res);

        const container = document.getElementById('iyzipay-checkout-form');
        if (!container) {
          this.showToast('Ödeme formu alanı bulunamadı.', 'error');
          return;
        }

        container.innerHTML = '';
        container.innerHTML = res.checkoutFormContent;

        const scriptElements = container.getElementsByTagName('script');
        Array.from(scriptElements).forEach(oldScript => {
          const newScript = document.createElement('script');
          newScript.type = 'text/javascript';

          if (oldScript.src) {
            newScript.src = oldScript.src;
          } else {
            newScript.text = oldScript.text || oldScript.innerHTML;
          }

          document.body.appendChild(newScript);
        });

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isProcessing = false;
        console.error('ÖDEME BAŞLATMA HATASI:', err);
        console.error('ÖDEME BAŞLATMA HATA BODY:', err.error);

        const errorMsg = err.error?.errorMessage ||
          err.error?.Message ||
          err.error?.message ||
          'Ödeme formu başlatılamadı.';

        this.showToast(errorMsg, 'error');
        this.cdr.detectChanges();
      }
    });
  }
}