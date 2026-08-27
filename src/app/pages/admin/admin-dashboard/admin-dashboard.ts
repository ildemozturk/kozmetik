import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
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
  status: 'Tükendi' | 'Kritik' | 'Uyarı';
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
  dayName: string;
  fullDate: string;
  amountText: string;
  rawAmount: number;
  heightPercent: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  isLoading: boolean = true;

  adminFullName: string = '';
  adminRole: string = '';

  summary: DashboardSummary = {
    totalSales: 0,
    totalOrdersCount: 0,
    activeCustomerCount: 0,
    inStockVarietyCount: 0
  };

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
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
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

  logout(): void {
    this.authService.logout();
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
    this.cdr.detectChanges();
    const headers = this.getAuthHeaders();

    // 1. Tüm Ürünleri Çek
    this.http.get<any>(`${this.apiUrl}/Products/all`, { headers }).subscribe({
      next: (prodRes) => {
        const products = this.extractList(prodRes);
        this.fetchOrdersAndRender(products, headers);
      },
      error: () => {
        this.http.get<any>(`${this.apiUrl}/Products`, { headers }).subscribe({
          next: (prodRes) => {
            const products = this.extractList(prodRes);
            this.fetchOrdersAndRender(products, headers);
          },
          error: () => {
            this.fetchOrdersAndRender([], headers);
          }
        });
      }
    });
  }

  private fetchOrdersAndRender(products: any[], headers: HttpHeaders): void {
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
        this.ngZone.run(() => {
          this.calculateAndRender(products, orders, registeredUsersCount);
        });
      },
      error: () => {
        this.rawOrdersList = [];
        this.ngZone.run(() => {
          this.calculateAndRender(products, [], 0);
        });
      }
    });
  }

  setDaysRange(days: 7 | 14): void {
    if (this.chartDaysRange === days) return;
    this.chartDaysRange = days;
    this.generateDailyChart(this.rawOrdersList, days);
    this.cdr.detectChanges();
  }

  private getProductStock(p: any): number {
    if (!p) return 0;
    if (p.stock !== undefined && p.stock !== null) {
      if (typeof p.stock === 'number') return p.stock;
      if (typeof p.stock.quantity === 'number') return p.stock.quantity;
      if (!isNaN(Number(p.stock.quantity))) return Number(p.stock.quantity);
    }
    if (p.stockQuantity !== undefined && p.stockQuantity !== null && !isNaN(Number(p.stockQuantity))) {
      return Number(p.stockQuantity);
    }
    if (p.quantity !== undefined && p.quantity !== null && !isNaN(Number(p.quantity))) {
      return Number(p.quantity);
    }
    return 0;
  }

  private extractList(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.products)) return res.products;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res.$values)) return res.$values;
    return [];
  }

  private calculateAndRender(products: any[], orders: any[], registeredUsersCount: number): void {
    // 1. Stoktaki Ürün Çeşidi
    const inStock = products.filter(p => this.getProductStock(p) > 0);
    this.summary.inStockVarietyCount = inStock.length;

    // 2. Kritik Stok Listesi
    this.criticalStocks = products
      .map(p => {
        const qty = this.getProductStock(p);
        let statusText: 'Tükendi' | 'Kritik' | 'Uyarı' = 'Uyarı';
        if (qty === 0) statusText = 'Tükendi';
        else if (qty <= 5) statusText = 'Kritik';

        const categoryName = typeof p.category === 'string'
          ? p.category
          : (p.category?.name || p.categoryName || 'Cilt Bakımı');

        return {
          id: p.id,
          name: p.name,
          category: categoryName,
          stockQuantity: qty,
          status: statusText
        };
      })
      .filter(p => p.stockQuantity <= 10)
      .sort((a, b) => a.stockQuantity - b.stockQuantity)
      .slice(0, 5);

    // 3. Toplam Satış ve Siparişler
    let totalSalesSum = 0;
    orders.forEach(o => {
      const amount = Number(o.totalAmount ?? o.totalPrice ?? o.total ?? 0);
      totalSalesSum += amount;
    });

    this.summary.totalSales = totalSalesSum;
    this.summary.totalOrdersCount = orders.length;
    this.summary.activeCustomerCount = registeredUsersCount;

    // 4. Son Siparişler Tablosu
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

    // 5. Günlük Grafik
    this.generateDailyChart(orders, this.chartDaysRange);

    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private generateDailyChart(orders: any[], daysCount: number): void {
    const dayNamesShort = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const now = new Date();

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

    orders.forEach((o, idx) => {
      const amount = Number(o.totalAmount ?? o.totalPrice ?? o.total ?? 0);
      let orderDateKey = '';

      if (o.createdDate) {
        const d = new Date(o.createdDate);
        if (!isNaN(d.getTime())) {
          orderDateKey = formatDateKey(d);
        }
      }

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