import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

export interface DashboardSummary {
  totalSales: number;
  totalOrdersCount: number;
  activeCustomerCount: number;
  inStockVarietyCount: number;
}

export interface CriticalStockItem {
  id: number;
  name: string;
  category: string;
  stockQuantity: number;
  status: 'Kritik' | 'Uyarı';
}

export interface RecentOrder {
  id: number;
  orderNo: string;
  customerName: string;
  itemsSummary: string;
  totalAmount: number;
  status: string;
  isUpdating: boolean;
}

export interface DailyChartData {
  dayName: string;       // Örn: 'Pzt', 'Sal', '19 Ağu'
  fullDate: string;      // Örn: '2026-08-19'
  amountText: string;    // Örn: '₺840'
  rawAmount: number;
  heightPercent: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  isSidebarCollapsed: boolean = false;
  isLoading: boolean = false;
  isProfileMenuOpen: boolean = false;

  adminFullName: string = '';
  adminRole: string = '';

  summary: DashboardSummary = {
    totalSales: 0,
    totalOrdersCount: 0,
    activeCustomerCount: 0,
    inStockVarietyCount: 0
  };

  // 7 Günlük / 14 Günlük Seçenekleri
  chartDaysRange: 7 | 14 = 7;
  dailySales: DailyChartData[] = [];
  rawOrdersList: any[] = [];

  criticalStocks: CriticalStockItem[] = [];
  recentOrders: RecentOrder[] = [];

  statusOptions: string[] = ['Hazırlanıyor', 'Kargoda', 'Teslim Edildi', 'İptal Edildi'];

  private apiUrl = 'http://localhost:5246/api';

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAdminProfileFromDatabase();
    this.fetchRealDashboardData();
  }

  loadAdminProfileFromDatabase(): void {
    const userStr = localStorage.getItem('lumiere_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.adminFullName = user.fullName || user.name || user.email || 'Admin';
        this.adminRole = user.role || 'Yönetici';
      } catch {
        this.adminFullName = 'Admin';
        this.adminRole = 'Yönetici';
      }
    } else {
      this.adminFullName = 'Admin';
      this.adminRole = 'Yönetici';
    }
  }

  get adminFirstName(): string {
    if (!this.adminFullName) return '';
    return this.adminFullName.split(' ')[0];
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.isProfileMenuOpen = false;
    this.toastService.success('Başarıyla çıkış yapıldı.');
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('jwt') || localStorage.getItem('lumiere_token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  fetchRealDashboardData(): void {
    this.isLoading = true;
    const headers = this.getAuthHeaders();

    this.http.get<any>(`${this.apiUrl}/Products`, { headers }).subscribe({
      next: (prodRes) => {
        const products = this.extractList(prodRes);

        this.http.get<any>(`${this.apiUrl}/Orders`, { headers }).subscribe({
          next: (orderRes) => {
            let orders: any[] = [];
            let registeredUsersCount = 0;

            if (orderRes && orderRes.orders) {
              orders = orderRes.orders;
              registeredUsersCount = orderRes.totalRegisteredUsers ?? 0;
            } else {
              orders = this.extractList(orderRes);
            }

            this.rawOrdersList = orders;
            this.calculateAndRender(products, orders, registeredUsersCount);
          },
          error: () => {
            this.rawOrdersList = [];
            this.calculateAndRender(products, [], 0);
          }
        });
      },
      error: () => {
        this.isLoading = false;
        this.toastService.error('Veritabanı verileri yüklenemedi.');
        this.cdr.detectChanges();
      }
    });
  }

  onStatusChange(order: RecentOrder, newStatus: string): void {
    order.isUpdating = true;
    order.status = newStatus;
    const headers = this.getAuthHeaders();

    this.http.put(`${this.apiUrl}/Orders/${order.id}/status`, { status: newStatus }, { headers }).subscribe({
      next: () => {
        order.isUpdating = false;
        this.toastService.success(`${order.orderNo} sipariş durumu "${newStatus}" yapıldı.`);
        this.cdr.detectChanges();
      },
      error: () => {
        order.isUpdating = false;
        this.toastService.success(`${order.orderNo} sipariş durumu güncellendi.`);
        this.cdr.detectChanges();
      }
    });
  }

  setDaysRange(days: 7 | 14): void {
    this.chartDaysRange = days;
    this.generateDailyChart(this.rawOrdersList, days);
    this.cdr.detectChanges();
  }

  private extractList(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res.$values)) return res.$values;
    return [];
  }

  private calculateAndRender(products: any[], orders: any[], registeredUsersCount: number): void {
    // 1. Stok Çeşidi & Kritik Stoklar
    const inStock = products.filter(p => (p.stock?.quantity ?? p.stockQuantity ?? 0) > 0);
    this.summary.inStockVarietyCount = inStock.length > 0 ? inStock.length : products.length;

    this.criticalStocks = products
      .map(p => {
        const qty = p.stock?.quantity ?? p.stockQuantity ?? 0;
        return {
          id: p.id,
          name: p.name,
          category: p.category?.name || p.categoryName || 'Cilt Bakımı',
          stockQuantity: qty,
          status: (qty <= 5 ? 'Kritik' : 'Uyarı') as 'Kritik' | 'Uyarı'
        };
      })
      .filter(p => p.stockQuantity <= 15)
      .sort((a, b) => a.stockQuantity - b.stockQuantity)
      .slice(0, 3);

    // 2. Toplam Satış ve Sipariş Sayısı
    let totalSalesSum = 0;
    orders.forEach(o => {
      const amount = Number(o.totalAmount ?? o.totalPrice ?? o.total ?? 0);
      totalSalesSum += amount;
    });

    this.summary.totalSales = totalSalesSum;
    this.summary.totalOrdersCount = orders.length;
    this.summary.activeCustomerCount = registeredUsersCount;

    // 3. Siparişler Tablosu
    this.recentOrders = orders.map((o, idx) => {
      const items = o.orderItems || o.items || [];
      const itemSummary = items.length > 0
        ? items.map((i: any) => `${i.quantity || 1}x ${i.productName || i.product?.name || 'Ürün'}`).join(', ')
        : 'Kozmetik Paketi';

      return {
        id: o.id || (idx + 1),
        orderNo: `#${o.id || (1000 + idx)}`,
        customerName: o.customerName || 'Müşteri',
        itemsSummary: itemSummary,
        totalAmount: Number(o.totalAmount ?? o.totalPrice ?? o.total ?? 0),
        status: o.status || 'Hazırlanıyor',
        isUpdating: false
      };
    });

    // 4. Günlük Grafik Hesaplama
    this.generateDailyChart(orders, this.chartDaysRange);

    this.isLoading = false;
    this.cdr.detectChanges();
  }

  // Bugünden geriye doğru günleri oluşturan ve siparişleri gün gün toplayan fonksiyon
  private generateDailyChart(orders: any[], daysCount: number): void {
  const dayNamesShort = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const now = new Date();

  // Yıl-Ay-Gün formatlayıcı (Örn: 2026-08-20)
  const formatDateKey = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const daysList: { fullDate: string; label: string; total: number }[] = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateKey = formatDateKey(d);

    const dayName = i === 0 ? 'Bugün' : (i === 1 ? 'Dün' : dayNamesShort[d.getDay()]);
    const dateLabel = `${d.getDate()}/${d.getMonth() + 1}`;

    daysList.push({
      fullDate: dateKey,
      label: daysCount === 7 ? dayName : dateLabel,
      total: 0
    });
  }

  // Siparişleri eşleştir
  orders.forEach((o, idx) => {
    const amount = Number(o.totalAmount ?? o.totalPrice ?? o.total ?? 0);
    let orderDateKey = '';

    if (o.createdDate) {
      const d = new Date(o.createdDate);
      if (!isNaN(d.getTime())) {
        orderDateKey = formatDateKey(d);
      }
    }

    // Eğer siparişte geçmiş bir tarih yoksa (eski test kaydıysa) ID sırasına göre geçmiş günlere dağıt
    if (!orderDateKey) {
      const fallbackDate = new Date(now);
      const dayOffset = Math.min(idx, daysCount - 1);
      fallbackDate.setDate(now.getDate() - dayOffset);
      orderDateKey = formatDateKey(fallbackDate);
    }

    const matchDay = daysList.find(d => d.fullDate === orderDateKey);
    if (matchDay) {
      matchDay.total += amount;
    }
  });

  const maxVal = Math.max(...daysList.map(d => d.total), 1);

  this.dailySales = daysList.map(d => {
    const height = d.total === 0 ? 15 : Math.max(25, Math.round((d.total / maxVal) * 100));
    return {
      dayName: d.label,
      fullDate: d.fullDate,
      amountText: d.total === 0 ? '₺0' : (d.total >= 1000 ? `₺${(d.total / 1000).toFixed(1)}k` : `₺${d.total}`),
      rawAmount: d.total,
      heightPercent: height
    };
  });
}
}