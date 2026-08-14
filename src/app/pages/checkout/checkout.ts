import { Component, OnInit } from '@angular/core';
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
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.setupFormatters();
    this.loadCitiesFromApi();
    this.checkPaymentStatus();
  }

  // URL'den Ödeme Durumunu Kontrol Etme & Sepeti Temizleme
  private checkPaymentStatus(): void {
    this.route.queryParams.subscribe(params => {
      if (params['status'] === 'success') {
        this.isOrderSuccess = true;
        this.token = params['token'] || '';
        this.orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
        
        // Ödeme başarılı olduğu an sepeti bildirim tetiklemeden temizliyoruz
        this.cartService.clearCart(false);
      } else if (params['status'] === 'error') {
        this.showToast('Ödeme işlemi başarısız oldu veya iptal edildi.', 'error');
      }
    });
  }

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
    const apiUrl = 'https://mertmtn.github.io/CityDistrictJSONAPI/all-city-district.json';
    this.http.get<any>(apiUrl).subscribe({
      next: (res) => {
        if (res && res.city && Array.isArray(res.city)) {
          this.cities = res.city;
        }
      },
      error: (err) => {
        console.error('İl/İlçe API Yükleme Hatası:', err);
      }
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

    const orderPayload = {
      customerName: this.checkoutForm.value.fullName,
      email: this.checkoutForm.value.email,
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

    this.http.post<any>('https://localhost:7276/api/orders/initiate-payment', orderPayload).subscribe({
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
        
      },
      error: (err) => {
        this.isProcessing = false;
        console.error('Ödeme başlatma hatası detayı:', err.error);
        const errorMsg = err.error?.message || 'Ödeme formu başlatılamadı.';
        this.showToast(errorMsg, 'error');
      }
    });
  }
}