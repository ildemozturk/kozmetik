import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

export interface CouponItem {
  id: number;
  code: string;
  title: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'Percentage' | 'FixedAmount';
  discountValue: number;
  categoryScope: string;
  minOrderAmount: number;
  usedCount: number;
  usageLimit: number;
  expiryDate?: string;
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
  isLoading: boolean = true;
  adminFullName: string = 'Derin Aydın';
  adminRole: string = 'Yönetici';

  coupons: CouponItem[] = [];
  filteredCoupons: CouponItem[] = [];

  searchQuery: string = '';
  selectedCategoryFilter: string = 'Tümü';
  categories: string[] = ['Tümü', 'Tüm Ürünler', 'Cilt Bakımı', 'Makyaj', 'Parfüm', 'Saç Bakımı'];

  isModalOpen: boolean = false;
  isEditing: boolean = false;
  isSaving: boolean = false;

  couponForm: CouponItem = {
    id: 0,
    code: '',
    title: '',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    categoryScope: 'Tüm Ürünler',
    minOrderAmount: 0,
    usageLimit: 100,
    usedCount: 0,
    expiryDate: '',
    isActive: true
  };

  private apiUrl = 'http://localhost:5246/api/Campaigns';

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAdminProfile();
    this.fetchCampaigns();
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

  fetchCampaigns(): void {
    this.isLoading = true;
    this.cdr.detectChanges();
    const headers = this.getAuthHeaders();

    this.http.get<any>(this.apiUrl, { headers }).subscribe({
      next: (res) => {
        const rawList: any[] = Array.isArray(res) ? res : (res?.data || res?.campaigns || []);

        this.coupons = rawList.map((c: any): CouponItem => {
          const uLimit = Number(c.usageLimit ?? c.UsageLimit ?? 0);
          const uCount = Number(c.usedCount ?? c.UsedCount ?? 0);
          const activeStatus = c.isActive !== undefined ? Boolean(c.isActive) : (c.IsActive !== undefined ? Boolean(c.IsActive) : true);

          let dType: 'PERCENTAGE' | 'FIXED' = 'PERCENTAGE';
          const incomingType = (c.discountType || c.DiscountType || '').toString().toUpperCase();
          if (incomingType.includes('FIXED')) {
            dType = 'FIXED';
          }

          return {
            id: Number(c.id ?? c.Id ?? 0),
            code: c.code || c.Code || '',
            title: c.title || c.Title || '',
            discountType: dType,
            discountValue: Number(c.discountValue ?? c.DiscountValue ?? 0),
            categoryScope: c.categoryScope || c.CategoryScope || 'Tüm Ürünler',
            minOrderAmount: Number(c.minOrderAmount ?? c.MinOrderAmount ?? 0),
            usedCount: uCount,
            usageLimit: uLimit,
            expiryDate: c.expiryDate || c.ExpiryDate || '',
            isActive: activeStatus
          };
        });

        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Kupon API Hatası:', err);
        this.isLoading = false;
        this.coupons = [];
        this.filteredCoupons = [];
        this.toastService.error('Kuponlar veritabanından alınamadı.');
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters(): void {
    let list = this.coupons;

    if (this.selectedCategoryFilter && this.selectedCategoryFilter !== 'Tümü') {
      const selectedLower = this.selectedCategoryFilter.toLowerCase().trim();
      list = list.filter(c => {
        const scopeLower = (c.categoryScope || '').toLowerCase().trim();
        return scopeLower === selectedLower || scopeLower === 'tüm ürünler' || scopeLower === 'tümü';
      });
    }

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(c => 
        (c.code && c.code.toLowerCase().includes(q)) || 
        (c.title && c.title.toLowerCase().includes(q))
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

  toggleStatus(item: CouponItem, event: Event): void {
    event.stopPropagation();

    const limit = Number(item.usageLimit);
    const count = Number(item.usedCount);

    // Yalnızca limit pozitifse ve kullanım limiti doldurulmuşsa aktif etmeyi engelle
    if (!item.isActive && limit > 0 && count >= limit) {
      this.toastService.error(`"${item.code}" kuponunun kullanım limiti dolduğu için aktif edilemez.`);
      item.isActive = false;
      this.cdr.detectChanges();
      return;
    }

    const newStatus = !item.isActive;
    const headers = this.getAuthHeaders();

    this.http.put(`${this.apiUrl}/${item.id}/toggle-status`, { isActive: newStatus }, { headers }).subscribe({
      next: (res: any) => {
        item.isActive = res.isActive !== undefined ? res.isActive : newStatus;
        this.toastService.success(`Kupon durumu ${item.isActive ? 'Aktif' : 'Pasif'} olarak güncellendi.`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err.error?.message || 'Durum güncellenirken hata oluştu.';
        this.toastService.error(msg);
        this.cdr.detectChanges();
      }
    });
  }

  copyCode(code: string, event: Event): void {
    event.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.toastService.success(`"${code}" kopyalandı.`);
      });
    }
  }

  openAddModal(): void {
    this.isEditing = false;
    this.couponForm = {
      id: 0,
      code: '',
      title: '',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      categoryScope: 'Tüm Ürünler',
      minOrderAmount: 0,
      usageLimit: 100,
      usedCount: 0,
      expiryDate: '',
      isActive: true
    };
    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  openEditModal(item: CouponItem, event?: Event): void {
    if (event) event.stopPropagation();
    this.isEditing = true;
    this.couponForm = { ...item };
    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.cdr.detectChanges();
  }

  saveCoupon(): void {
    if (!this.couponForm.code.trim() || !this.couponForm.title.trim()) {
      this.toastService.error('Kupon kodu ve başlık alanları zorunludur.');
      return;
    }

    this.isSaving = true;
    const headers = this.getAuthHeaders();

    const payload = {
      ...this.couponForm,
      code: this.couponForm.code.trim().toUpperCase(),
      discountType: this.couponForm.discountType === 'FIXED' ? 'FixedAmount' : 'Percentage'
    };

    if (this.isEditing) {
      this.http.put(`${this.apiUrl}/${this.couponForm.id}`, payload, { headers }).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.toastService.success('Kupon başarıyla güncellendi.');
          this.fetchCampaigns();
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.error(err.error?.message || 'Kupon güncellenirken hata oluştu.');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.http.post(this.apiUrl, payload, { headers }).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.toastService.success('Yeni kupon başarıyla oluşturuldu.');
          this.fetchCampaigns();
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.error(err.error?.message || 'Kupon oluşturulurken hata oluştu.');
          this.cdr.detectChanges();
        }
      });
    }
  }

  deleteCoupon(item: CouponItem, event?: Event): void {
    if (event) event.stopPropagation();
    if (!confirm(`"${item.code}" kodlu kuponu silmek istediğinize emin misiniz?`)) return;

    const headers = this.getAuthHeaders();

    this.http.delete(`${this.apiUrl}/${item.id}`, { headers }).subscribe({
      next: () => {
        this.toastService.success(`"${item.code}" kuponu başarıyla silindi.`);
        this.fetchCampaigns();
      },
      error: () => {
        this.toastService.error('Kupon silinirken hata oluştu.');
        this.cdr.detectChanges();
      }
    });
  }
}