import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

export interface CampaignCoupon {
  id: number;
  code: string;
  title: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  categoryScope: string;
  minOrderAmount: number;
  usageLimit: number;
  usedCount: number;
  expiryDate: string;
  isActive: boolean;
}

@Component({
  selector: 'app-admin-campaigns',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-campaigns.html',
  styleUrl: './admin-campaigns.css'
})
export class AdminCampaigns implements OnInit {
  isLoading: boolean = false;
  adminFullName: string = 'Derin Aydın';
  adminRole: string = 'Yönetici';

  coupons: CampaignCoupon[] = [];
  filteredCoupons: CampaignCoupon[] = [];
  searchQuery: string = '';
  selectedCategoryFilter: string = 'Tümü';

  categories: string[] = [
    'Tümü',
    'Cilt Bakımı',
    'Serum',
    'Krem',
    'Temizleyici',
    'Göz Bakımı',
    'Güneş Koruması',
    'Maske & Peeling'
  ];

  isModalOpen: boolean = false;
  isSaving: boolean = false;
  isEditing: boolean = false;

  couponForm: CampaignCoupon = {
    id: 0,
    code: '',
    title: '',
    discountType: 'PERCENTAGE',
    discountValue: 15,
    categoryScope: 'Tümü',
    minOrderAmount: 0,
    usageLimit: 100,
    usedCount: 0,
    expiryDate: '2026-09-30',
    isActive: true
  };

  private apiUrl = 'http://localhost:5246/api';

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAdminProfile();
    this.fetchCoupons();
  }

  loadAdminProfile(): void {
    const userStr = localStorage.getItem('lumiere_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.adminFullName = user.fullName || user.name || 'Derin Aydın';
        this.adminRole = user.role || 'Yönetici';
      } catch {
        this.adminFullName = 'Derin Aydın';
        this.adminRole = 'Yönetici';
      }
    }
  }

  logout(): void {
    this.authService.logout();
    this.toastService.success('Başarıyla çıkış yapıldı.');
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('jwt') || localStorage.getItem('lumiere_token');
    let headers = new HttpHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  fetchCoupons(): void {
    this.isLoading = true;
    const headers = this.getAuthHeaders();

    this.http.get<any[]>(`${this.apiUrl}/Campaigns`, { headers }).subscribe({
      next: (res) => {
        this.coupons = Array.isArray(res) ? res : [];
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.coupons = []; // 👈 Mock yerine doğrudan boş dizi
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters(): void {
    let list = this.coupons;

    if (this.selectedCategoryFilter !== 'Tümü') {
      list = list.filter(c => c.categoryScope.toLowerCase() === this.selectedCategoryFilter.toLowerCase());
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(c =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.categoryScope.toLowerCase().includes(q)
      );
    }

    this.filteredCoupons = list;
    this.cdr.detectChanges();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  setCategoryFilter(cat: string): void {
    this.selectedCategoryFilter = cat;
    this.applyFilters();
  }

  toggleStatus(coupon: CampaignCoupon, event: Event): void {
    event.stopPropagation();
    coupon.isActive = !coupon.isActive;
    const headers = this.getAuthHeaders();

    this.http.put(`${this.apiUrl}/Campaigns/${coupon.id}/toggle-status`, { isActive: coupon.isActive }, { headers }).subscribe({
      next: () => {
        this.toastService.success(`"${coupon.code}" durumu güncellendi.`);
      },
      error: () => {
        this.toastService.success(`"${coupon.code}" durumu güncellendi.`);
      }
    });
  }

  copyCode(code: string, event: Event): void {
    event.stopPropagation();
    navigator.clipboard.writeText(code);
    this.toastService.success(`"${code}" panoya kopyalandı!`);
  }

  openAddModal(): void {
    this.isEditing = false;
    this.couponForm = {
      id: 0,
      code: '',
      title: '',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      categoryScope: 'Tümü',
      minOrderAmount: 0,
      usageLimit: 100,
      usedCount: 0,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true
    };
    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  openEditModal(c: CampaignCoupon, event: Event): void {
    event.stopPropagation();
    this.isEditing = true;
    this.couponForm = { ...c };
    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.cdr.detectChanges();
  }

  saveCoupon(): void {
    if (!this.couponForm.code.trim() || !this.couponForm.title.trim() || !this.couponForm.discountValue) {
      this.toastService.error('Lütfen zorunlu alanları eksiksiz doldurunuz.');
      return;
    }

    this.couponForm.code = this.couponForm.code.trim().toUpperCase();
    this.isSaving = true;
    const headers = this.getAuthHeaders();

    if (this.isEditing && this.couponForm.id > 0) {
      this.http.put(`${this.apiUrl}/Campaigns/${this.couponForm.id}`, this.couponForm, { headers }).subscribe({
        next: () => {
          this.fetchCoupons();
          this.isSaving = false;
          this.closeModal();
          this.toastService.success('Kupon başarıyla güncellendi.');
        },
        error: () => {
          this.isSaving = false;
          this.toastService.error('Kupon güncellenirken hata oluştu.');
        }
      });
    } else {
      this.http.post<CampaignCoupon>(`${this.apiUrl}/Campaigns`, this.couponForm, { headers }).subscribe({
        next: () => {
          this.fetchCoupons();
          this.isSaving = false;
          this.closeModal();
          this.toastService.success('Yeni indirim kuponu oluşturuldu.');
        },
        error: () => {
          this.isSaving = false;
          this.toastService.error('Kupon kaydedilirken hata oluştu.');
        }
      });
    }
  }

  deleteCoupon(c: CampaignCoupon, event: Event): void {
    event.stopPropagation();
    if (!confirm(`"${c.code}" kodlu kuponu silmek istediğinize emin misiniz?`)) return;

    const headers = this.getAuthHeaders();
    this.http.delete(`${this.apiUrl}/Campaigns/${c.id}`, { headers }).subscribe({
      next: () => {
        this.coupons = this.coupons.filter(item => item.id !== c.id);
        this.applyFilters();
        this.toastService.success('Kupon silindi.');
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastService.error('Kupon silinemedi.');
      }
    });
  }
}