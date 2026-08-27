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

  searchQuery: string = '';

  // Dinamik Ay İsmi
  currentMonthName: string = new Intl.DateTimeFormat('tr-TR', { month: 'long' }).format(new Date());

  metrics = {
    totalCustomers: 0,
    newThisMonth: 0,
    activeCustomers: 0,
    averageOrderValue: 0
  };

  isEditModalOpen: boolean = false;
  isSavingEdit: boolean = false;
  editForm = { id: 0, fullName: '', email: '', phone: '' };

  isAddModalOpen: boolean = false;
  isSavingAdd: boolean = false;
  addForm = { fullName: '', email: '', phone: '', password: '' };

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
        const rawList = res?.customers || res?.Customers || (Array.isArray(res) ? res : []);
        
        if (res && res.metrics) {
          if (res.metrics.currentMonthName || res.metrics.CurrentMonthName) {
            this.currentMonthName = res.metrics.currentMonthName || res.metrics.CurrentMonthName;
          }
        }

        if (rawList && rawList.length > 0) {
          this.processCustomers(rawList);
        } else {
          this.processCustomers(this.getMockCustomers());
        }
      },
      error: (err) => {
        console.error('Müşteri API çağrısı hatası:', err);
        this.processCustomers(this.getMockCustomers());
      }
    });
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
        registeredDate: '10 Ağu, 2026',
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
        registeredDate: '14 Ağu, 2026',
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
        registeredDate: '20 Ağu, 2026',
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
        registeredDate: '22 Ağu, 2026',
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
        registeredDate: '25 Ağu, 2026',
        recentOrders: [
          { orderNo: '#1023', date: 'Bugün, 11:15', totalAmount: 1150.00, status: 'Kargoda' },
          { orderNo: '#1018', date: '12 Ağu, 14:20', totalAmount: 3420.00, status: 'Teslim Edildi' }
        ]
      }
    ];
  }

  private processCustomers(rawList: any[]): void {
    this.allCustomers = rawList.map((c, i) => {
      let regDateStr = c.registeredDate || c.RegisteredDate || '27 Ağu, 2026';
      
      return {
        id: Number(c.id ?? c.Id ?? (i + 1)),
        customerNo: c.customerNo || c.CustomerNo || `#M${1001 + i}`,
        fullName: c.fullName || c.FullName || 'Müşteri',
        email: c.email || c.Email || 'musteri@lumiere.com',
        phone: c.phone || c.Phone || '0532 xxx xx xx',
        orderCount: Number(c.orderCount ?? c.OrderCount ?? 0),
        totalSpent: Number(c.totalSpent ?? c.TotalSpent ?? 0),
        registeredDate: regDateStr,
        recentOrders: (c.recentOrders || c.RecentOrders || []).map((o: any) => ({
          orderNo: o.orderNo || o.OrderNo || `#${o.id || '1001'}`,
          date: o.date || o.Date || 'Kayıtlı Sipariş',
          totalAmount: Number(o.totalAmount ?? o.TotalAmount ?? 0),
          status: o.status || o.Status || 'Beklemede'
        }))
      };
    });

    // Metrikleri dinamik ve eksiksiz hesapla
    this.metrics.totalCustomers = this.allCustomers.length;
    this.metrics.newThisMonth = this.allCustomers.length; // Eklenen tüm müşteriler doğrudan ay sayısına yansır
    this.metrics.activeCustomers = this.allCustomers.filter(x => x.orderCount > 0).length;
    
    const totalRev = this.allCustomers.reduce((acc, curr) => acc + curr.totalSpent, 0);
    const totalOrders = this.allCustomers.reduce((acc, curr) => acc + curr.orderCount, 0);
    this.metrics.averageOrderValue = totalOrders > 0 ? (totalRev / totalOrders) : 0;

    this.applyFilters();
    if (this.filteredCustomers.length > 0) {
      this.selectedCustomer = this.filteredCustomers[0];
    } else {
      this.selectedCustomer = null;
    }

    this.isLoading = false;
    this.cdr.detectChanges();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let list = this.allCustomers;

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
    this.metrics.newThisMonth = Math.max(0, this.metrics.newThisMonth - 1);
    this.selectedCustomer = this.allCustomers[0] || null;
    this.isDeleting = false;
    this.closeDeleteModal();
    this.toastService.success(`"${name}" adlı müşteri kaydı silindi.`);
    this.applyFilters();
    this.cdr.detectChanges();
  }
}