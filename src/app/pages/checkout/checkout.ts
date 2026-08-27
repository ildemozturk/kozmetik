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

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class CheckoutComponent implements OnInit {
  checkoutForm!: FormGroup;
  isProcessing: boolean = false;

  // Başarı Ekranı Durum Yönetimi
  isOrderSuccess: boolean = false;
  orderNumber: string = '';
  orderDate: Date = new Date();
  token: string = '';

  cities: City[] = [];
  districts: string[] = [];

  isCityDropdownOpen: boolean = false;
  isDistrictDropdownOpen: boolean = false;

  toastMessage: string = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;

  constructor(
    public cartService: CartService,
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.setupFormatters();
    this.loadCitiesFromApi();
    this.checkPaymentStatus();
  }

  // URL'den Ödeme Durumunu Kontrol Etme & Siparişi Geçmişe Kaydetme
  private checkPaymentStatus(): void {
    this.route.queryParams.subscribe(params => {
      if (params['status'] === 'success') {
        this.isOrderSuccess = true;
        this.token = params['token'] || '';
        this.orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
        
        // Siparişi Navbar'daki Siparişlerim kısmında görünmesi için localStorage'a kaydediyoruz
        this.saveOrderToHistory();

        // Sepeti temizliyoruz
        this.cartService.clearCart(false);
        this.cdr.detectChanges();
      } else if (params['status'] === 'error') {
        this.showToast('Ödeme işlemi başarısız oldu veya iptal edildi.', 'error');
      }
    });
  }

  private saveOrderToHistory(): void {
    const items = this.cartService.cartItems().map(item => ({
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      imageUrl: item.product.imageUrl
    }));

    if (items.length === 0) return;

    const newOrder = {
      id: this.orderNumber || 'ORD-' + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toISOString(),
      status: 'Beklemede',
      totalAmount: this.cartService.grandTotal(),
      items: items
    };

    const existingOrders = JSON.parse(localStorage.getItem('lumiere_orders') || '[]');
    existingOrders.unshift(newOrder);
    localStorage.getItem('lumiere_orders'); // güvenli tutma
  }

  private initForms(): void {
    // E-posta alanı artık tamamen serbest, kullanıcı ne isterse onu yazabilir
    this.checkoutForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]], 
      phone: ['', [Validators.required, Validators.maxLength(11)]],
      city: ['', Validators.required],
      district: [{ value: '', disabled: true }, Validators.required],
      address: ['', Validators.required]
    });
  }

  private setupFormatters(): void {
    this.checkoutForm.get('phone')?.valueChanges.subscribe(val => {
      if (!val) return;
      const digitsOnly = val.replace(/\D/g, '').slice(0, 11);
      if (val !== digitsOnly) {
        this.checkoutForm.get('phone')?.setValue(digitsOnly, { emitEvent: false });
      }
    });
  }

  loadCitiesFromApi(): void {
    fetch('https://mertmtn.github.io/CityDistrictJSONAPI/all-city-district.json')
      .then(res => res.json())
      .then((res: any) => {
        if (res && res.city && Array.isArray(res.city)) {
          this.cities = res.city;
          this.cdr.detectChanges();
        }
      })
      .catch((err) => {
        console.error('İl/İlçe API Yükleme Hatası:', err);
      });
  }

  selectCity(city: City): void {
    this.checkoutForm.patchValue({ city: city.name, district: '' });
    this.isCityDropdownOpen = false;

    if (city.discrits && city.discrits.length > 0) {
      this.districts = city.discrits;
      this.checkoutForm.get('district')?.enable();
    } else {
      this.districts = [];
      this.checkoutForm.get('district')?.disable();
    }
  }

  selectDistrict(district: string): void {
    this.checkoutForm.patchValue({ district: district });
    this.isDistrictDropdownOpen = false;
  }

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

 processPayment(): void {
    if (this.checkoutForm.invalid) {
      this.showToast('Lütfen teslimat ve adres bilgilerini eksiksiz doldurunuz.', 'error');
      return;
    }

    this.isProcessing = true;

    // [Timeline Log - 2026.06] Security & Consistency Fix: Always force the authenticated user's email for the order, preventing cross-account mapping errors.
    let loggedInEmail = '';
    const userStr = localStorage.getItem('lumiere_user') || localStorage.getItem('user') || localStorage.getItem('cosmetic_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.email) loggedInEmail = user.email.trim().toLowerCase();
      } catch {}
    }

    const orderPayload = {
      customerName: this.checkoutForm.value.fullName,
      email: loggedInEmail || this.checkoutForm.value.email, // 👈 Oturumdaki mail yoksa formdakini alır, varsa kesinlikle oturumdakini kullanır
      phone: this.checkoutForm.value.phone,
      city: this.checkoutForm.value.city,
      district: this.checkoutForm.value.district,
      address: `${this.checkoutForm.value.city} / ${this.checkoutForm.value.district} - ${this.checkoutForm.value.address}`,
      totalAmount: this.cartService.grandTotal(),
      orderItems: this.cartService.cartItems().map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.price
      }))
    };

    this.http.post<any>('http://localhost:5246/api/orders/initiate-payment', orderPayload).subscribe({
      // ... (Geri kalan kısımlar aynı kalacak)
      next: (res) => {
        this.isProcessing = false;

        const container = document.getElementById('iyzipay-checkout-form');
        if (container) {
          container.innerHTML = res.checkoutFormContent;

          const scriptElements = container.getElementsByTagName('script');
          Array.from(scriptElements).forEach((oldScript) => {
            const newScript = document.createElement('script');
            newScript.type = 'text/javascript';
            if (oldScript.src) {
              newScript.src = oldScript.src;
            } else {
              newScript.innerHTML = oldScript.innerHTML;
            }
            document.body.appendChild(newScript);
          });
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isProcessing = false;
        console.error('Ödeme başlatma hatası detayı:', err.error);
        const errorMsg = err.error?.message || 'Ödeme formu başlatılamadı.';
        this.showToast(errorMsg, 'error');
        this.cdr.detectChanges();
      }
    });
  }
}