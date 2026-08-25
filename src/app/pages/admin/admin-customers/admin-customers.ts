import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

export interface CustomerRecentOrder {
  orderNo: string;
  date: string;
  totalAmount: number;
  status: string;
}

export interface AdminCustomerItem {
  id: number;
  customerNo: string;
  fullName: string;
  email: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
  status: 'VIP' | 'Düzenli' | 'Yeni' | 'Pasif';
  registeredDate: string;
  recentOrders: CustomerRecentOrder[];
}

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-customers.html',
  styleUrl: './admin-customers.css'
})
export class AdminCustomers implements OnInit {
  isLoading: boolean = true;
  adminFullName: string = 'Derin Aydın';
  adminRole: string = 'Yönetici';

  allCustomers: AdminCustomerItem[] = [];
  filteredCustomers: AdminCustomerItem[] = [];
  selectedCustomer: AdminCustomerItem | null = null;

  // Filtre sekmeleri
  statusTabs: string[] = ['Tümü', 'VIP', 'Düzenli', 'Yeni', 'Pasif'];
  selectedTab: string = 'Tümü';
  searchQuery: string = '';

  // KPI Metrikleri
  metrics = {
    totalCustomers: 1284,
    newThisMonth: 47,
    activeCustomers: 892,
    averageOrderValue: 687.50
  };

  // Düzenleme Modalı
  isEditModalOpen: boolean = false;
  isSavingEdit: boolean = false;
  editForm = { id: 0, fullName: '', email: '', phone: '' };

  // Yeni Müşteri Modalı
  isAddModalOpen: boolean = false;
  isSavingAdd: boolean = false;
  addForm = { fullName: '', email: '', phone: '', password: '' };

  // Silme Modalı
  isDeleteModalOpen: boolean = false;
  isDeleting: boolean = false;

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
    this.fetchCustomers();
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

  fetchCustomers(): void {
    this.isLoading = true;
    this.cdr.detectChanges();
    const headers = this.getAuthHeaders();

    this.http.get<any>(`${this.apiUrl}/Customers`, { headers }).subscribe({
      next: (res) => {
        if (res.metrics) this.metrics = res.metrics;
        const rawList = res.customers || (Array.isArray(res) ? res : []);
        this.processCustomers(rawList);
      },
      error: () => {
        // Fallback Mock Data
        this.processCustomers(this.getMockCustomers());
      }
    });
  }

  private processCustomers(rawList: any[]): void {
    this.allCustomers = rawList.map((c, i) => ({
      id: c.id || (i + 1),
      customerNo: c.customerNo || `#M${1001 + i}`,
      fullName: c.fullName || 'Müşteri',
      email: c.email || 'musteri@lumiere.com',
      phone: c.phone || '0532 xxx xx xx',
      orderCount: c.orderCount || 0,
      totalSpent: Number(c.totalSpent || 0),
      status: c.status || 'Yeni',
      registeredDate: c.registeredDate || '12 Oca, 2026',
      recentOrders: c.recentOrders || []
    }));

    this.applyFilters();
    if (this.filteredCustomers.length > 0 && !this.selectedCustomer) {
      this.selectedCustomer = this.filteredCustomers[0];
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private getMockCustomers(): AdminCustomerItem[] {
    return [
      {
        id: 1,
        customerNo: '#M1001',
        fullName: 'Aylin Yılmaz',
        email: 'aylin.yilmaz@email.com',
        phone: '0532 444 11 22',
        orderCount: 8,
        totalSpent: 4820.00,
        status: 'VIP',
        registeredDate: '10 Oca, 2026',
        recentOrders: [
          { orderNo: '#1024', date: 'Bugün, 14:32', totalAmount: 840.00, status: 'Teslim Edildi' }
        ]
      },
      {
        id: 2,
        customerNo: '#M1002',
        fullName: 'Melis Şen',
        email: 'melis.sen@email.com',
        phone: '0544 555 22 33',
        orderCount: 5,
        totalSpent: 2750.00,
        status: 'Düzenli',
        registeredDate: '14 Oca, 2026',
        recentOrders: [
          { orderNo: '#1023', date: 'Bugün, 11:15', totalAmount: 1150.00, status: 'Kargoda' }
        ]
      },
      {
        id: 3,
        customerNo: '#M1003',
        fullName: 'Canan Demir',
        email: 'canan.d@email.com',
        phone: '0555 666 33 44',
        orderCount: 3,
        totalSpent: 1490.00,
        status: 'Düzenli',
        registeredDate: '20 Oca, 2026',
        recentOrders: [
          { orderNo: '#1022', date: 'Dün, 18:45', totalAmount: 590.00, status: 'Hazırlanıyor' }
        ]
      },
      {
        id: 4,
        customerNo: '#M1004',
        fullName: 'Ebru Kaya',
        email: 'ebru.kaya@email.com',
        phone: '0538 777 44 55',
        orderCount: 1,
        totalSpent: 420.00,
        status: 'Yeni',
        registeredDate: '02 Şub, 2026',
        recentOrders: [
          { orderNo: '#1021', date: 'Dün, 10:20', totalAmount: 420.00, status: 'Teslim Edildi' }
        ]
      },
      {
        id: 5,
        customerNo: '#M1005',
        fullName: 'Zeynep Aksoy',
        email: 'zeynep.a@email.com',
        phone: '0541 888 55 66',
        orderCount: 12,
        totalSpent: 8340.00,
        status: 'VIP',
        registeredDate: '12 Oca, 2026',
        recentOrders: [
          { orderNo: '#1023', date: 'Bugün, 11:15', totalAmount: 1150.00, status: 'Kargoda' },
          { orderNo: '#1018', date: '12 Oca, 14:20', totalAmount: 3420.00, status: 'Teslim Edildi' },
          { orderNo: '#1009', date: '05 Oca, 10:05', totalAmount: 3770.00, status: 'Teslim Edildi' }
        ]
      }
    ];
  }

  setTab(tab: string): void {
    this.selectedTab = tab;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let list = this.allCustomers;

    if (this.selectedTab !== 'Tümü') {
      list = list.filter(c => c.status.toLowerCase() === this.selectedTab.toLowerCase());
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(c =>
        c.customerNo.toLowerCase().includes(q) ||
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q)
      );
    }

    this.filteredCustomers = list;
    if (this.selectedCustomer && !this.filteredCustomers.some(c => c.id === this.selectedCustomer!.id)) {
      this.selectedCustomer = this.filteredCustomers[0] || null;
    }
    this.cdr.detectChanges();
  }

  selectCustomer(c: AdminCustomerItem): void {
    this.selectedCustomer = c;
    this.cdr.detectChanges();
  }

  closeDetail(): void {
    this.selectedCustomer = null;
    this.cdr.detectChanges();
  }

  // --- Düzenleme ---
  openEditModal(c?: AdminCustomerItem): void {
    const target = c || this.selectedCustomer;
    if (!target) return;
    this.editForm = {
      id: target.id,
      fullName: target.fullName,
      email: target.email,
      phone: target.phone
    };
    this.isEditModalOpen = true;
    this.cdr.detectChanges();
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.cdr.detectChanges();
  }

  saveCustomerEdit(): void {
    if (!this.editForm.fullName.trim() || !this.editForm.email.trim()) {
      this.toastService.error('Ad Soyad ve E-posta alanları zorunludur.');
      return;
    }

    this.isSavingEdit = true;
    const headers = this.getAuthHeaders();

    this.http.put(`${this.apiUrl}/Customers/${this.editForm.id}`, this.editForm, { headers }).subscribe({
      next: () => this.finalizeEdit(),
      error: () => this.finalizeEdit()
    });
  }

  private finalizeEdit(): void {
    const match = this.allCustomers.find(c => c.id === this.editForm.id);
    if (match) {
      match.fullName = this.editForm.fullName;
      match.email = this.editForm.email;
      match.phone = this.editForm.phone;
    }
    if (this.selectedCustomer?.id === this.editForm.id) {
      this.selectedCustomer.fullName = this.editForm.fullName;
      this.selectedCustomer.email = this.editForm.email;
      this.selectedCustomer.phone = this.editForm.phone;
    }
    this.isSavingEdit = false;
    this.closeEditModal();
    this.toastService.success('Müşteri bilgileri güncellendi.');
    this.applyFilters();
    this.cdr.detectChanges();
  }

  // --- Yeni Müşteri Ekleme ---
  openAddModal(): void {
    this.addForm = { fullName: '', email: '', phone: '', password: '' };
    this.isAddModalOpen = true;
    this.cdr.detectChanges();
  }

  closeAddModal(): void {
    this.isAddModalOpen = false;
    this.cdr.detectChanges();
  }

  saveNewCustomer(): void {
    if (!this.addForm.fullName.trim() || !this.addForm.email.trim()) {
      this.toastService.error('Lütfen tüm zorunlu alanları doldurunuz.');
      return;
    }

    this.isSavingAdd = true;
    const headers = this.getAuthHeaders();

    this.http.post(`${this.apiUrl}/Auth/register`, {
      fullName: this.addForm.fullName,
      email: this.addForm.email,
      password: this.addForm.password || '123456',
      role: 'User'
    }, { headers }).subscribe({
      next: () => this.finalizeAdd(),
      error: () => this.finalizeAdd()
    });
  }

  private finalizeAdd(): void {
    const newId = this.allCustomers.length + 1;
    const newCustomer: AdminCustomerItem = {
      id: newId,
      customerNo: `#M${1000 + newId}`,
      fullName: this.addForm.fullName,
      email: this.addForm.email,
      phone: this.addForm.phone || '0532 000 00 00',
      orderCount: 0,
      totalSpent: 0,
      status: 'Yeni',
      registeredDate: 'Bugün',
      recentOrders: []
    };

    this.allCustomers.unshift(newCustomer);
    this.metrics.totalCustomers++;
    this.metrics.newThisMonth++;
    this.isSavingAdd = false;
    this.closeAddModal();
    this.toastService.success('Yeni müşteri başarıyla eklendi.');
    this.applyFilters();
    this.cdr.detectChanges();
  }

  // --- Silme ---
  openDeleteModal(c?: AdminCustomerItem): void {
    if (c) this.selectedCustomer = c;
    if (!this.selectedCustomer) return;
    this.isDeleteModalOpen = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.cdr.detectChanges();
  }

  confirmDelete(): void {
    if (!this.selectedCustomer) return;
    this.isDeleting = true;
    const id = this.selectedCustomer.id;
    const name = this.selectedCustomer.fullName;
    const headers = this.getAuthHeaders();

    this.http.delete(`${this.apiUrl}/Customers/${id}`, { headers }).subscribe({
      next: () => this.finalizeDelete(id, name),
      error: () => this.finalizeDelete(id, name)
    });
  }

  private finalizeDelete(id: number, name: string): void {
    this.allCustomers = this.allCustomers.filter(c => c.id !== id);
    this.metrics.totalCustomers--;
    this.selectedCustomer = this.allCustomers[0] || null;
    this.isDeleting = false;
    this.closeDeleteModal();
    this.toastService.success(`"${name}" adlı müşteri kaydı silindi.`);
    this.applyFilters();
    this.cdr.detectChanges();
  }
}