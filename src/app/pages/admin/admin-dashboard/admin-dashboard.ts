import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

export interface DashboardSummary {
  totalSales: number;
  todayOrdersCount: number;
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
  orderNo: string;
  customerName: string;
  itemsSummary: string;
  totalAmount: number;
  status: 'Teslim Edildi' | 'Kargoda' | 'Hazırlanıyor';
}

export interface MonthlyChartData {
  month: string;
  amountText: string;
  heightPercent: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  isSidebarCollapsed: boolean = false;
  isLoading: boolean = false;
  isProfileMenuOpen: boolean = false;

  // Giriş Yapan Admin Bilgileri
  adminFullName: string = 'Yönetici';
  adminRole: string = 'Yönetici';

  // KPI Metrikleri
  summary: DashboardSummary = {
    totalSales: 48750,
    todayOrdersCount: 24,
    activeCustomerCount: 1284,
    inStockVarietyCount: 0
  };

  chartPeriod: 'monthly' | 'weekly' = 'monthly';
  monthlySales: MonthlyChartData[] = [
    { month: 'Oca', amountText: '₺32k', heightPercent: 65 },
    { month: 'Şub', amountText: '₺28k', heightPercent: 55 },
    { month: 'Mar', amountText: '₺41k', heightPercent: 82 },
    { month: 'Nis', amountText: '₺38k', heightPercent: 76 },
    { month: 'May', amountText: '₺48k', heightPercent: 96 },
    { month: 'Haz', amountText: '₺45k', heightPercent: 90 }
  ];

  criticalStocks: CriticalStockItem[] = [];

  recentOrders: RecentOrder[] = [
    { orderNo: '#1024', customerName: 'Aylin Yılmaz', itemsSummary: '1x Nemlendirici Krem, 1x Tonik', totalAmount: 840, status: 'Teslim Edildi' },
    { orderNo: '#1023', customerName: 'Melis Şen', itemsSummary: '2x C Vitamini Serumu, 1x Maske', totalAmount: 1150, status: 'Kargoda' },
    { orderNo: '#1022', customerName: 'Canan Demir', itemsSummary: '1x Mat Ruj, 1x Allık Duo', totalAmount: 590, status: 'Hazırlanıyor' },
    { orderNo: '#1021', customerName: 'Ebru Kaya', itemsSummary: '1x Saç Bakım Yağı', totalAmount: 420, status: 'Teslim Edildi' }
  ];

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCurrentAdminData();
    this.fetchDashboardData();
  }

  // Giriş yapan kullanıcının veritabanı / login session verilerini oku
  loadCurrentAdminData(): void {
    const userStr = localStorage.getItem('lumiere_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.adminFullName = user.fullName || user.name || 'İldem Aydın';
        this.adminRole = user.role === 'Admin' ? 'Yönetici' : (user.role || 'Yönetici');
      } catch {
        this.adminFullName = 'İldem Aydın';
      }
    }
  }

  get adminFirstName(): string {
    return this.adminFullName.split(' ')[0] || 'Yönetici';
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

  fetchDashboardData(): void {
    this.isLoading = true;

    this.http.get<any>('http://localhost:5246/api/Products').subscribe({
      next: (res) => {
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (res && Array.isArray(res.data)) list = res.data;
        else if (res && Array.isArray(res.items)) list = res.items;
        else if (res && Array.isArray(res.$values)) list = res.$values;

        this.summary.inStockVarietyCount = list.filter(p => (p.stock?.quantity ?? p.stockQuantity ?? 10) > 0).length;

        this.criticalStocks = list
          .map(p => ({
            id: p.id,
            name: p.name,
            category: p.category?.name || p.categoryName || 'Cilt Bakımı',
            stockQuantity: p.stock?.quantity ?? p.stockQuantity ?? 10,
            status: ((p.stock?.quantity ?? p.stockQuantity ?? 10) <= 8 ? 'Kritik' : 'Uyarı') as 'Kritik' | 'Uyarı'
          }))
          .sort((a, b) => a.stockQuantity - b.stockQuantity)
          .slice(0, 3);

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.summary.inStockVarietyCount = 156;
        this.criticalStocks = [
          { id: 1, name: 'C Vitamini Serumu', category: 'Cilt Bakımı', stockQuantity: 12, status: 'Kritik' },
          { id: 2, name: 'Nemlendirici Dudak Balmı', category: 'Makyaj', stockQuantity: 8, status: 'Kritik' },
          { id: 3, name: 'Gül Suyu Esanslı Tonik', category: 'Cilt Bakımı', stockQuantity: 15, status: 'Uyarı' }
        ];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
}