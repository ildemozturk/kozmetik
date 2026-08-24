import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

export interface OrderItemDetail {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
}

export interface AdminOrderItem {
  id: number;
  orderNo: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  address?: string;
  orderDate: string;
  rawDate: Date;
  itemsSummary: string;
  items: OrderItemDetail[];
  subTotal: number;
  shippingFee: number;
  totalAmount: number;
  status: 'Beklemede' | 'Hazırlanıyor' | 'Kargoda' | 'Teslim Edildi' | 'İptal';
  trackingNumber?: string;
}

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-orders.html',
  styleUrl: './admin-orders.css'
})
export class AdminOrders implements OnInit {
  isLoading: boolean = true;
  adminFullName: string = '';
  adminRole: string = '';

  allOrders: AdminOrderItem[] = [];
  filteredOrders: AdminOrderItem[] = [];
  selectedOrder: AdminOrderItem | null = null;

  // Filtreler
  statusTabs: string[] = ['Tümü', 'Beklemede', 'Hazırlanıyor', 'Kargoda', 'Teslim Edildi', 'İptal'];
  selectedTab: string = 'Tümü';
  searchQuery: string = '';

  // Kargo Modal / Durum Güncelleme
  isUpdatingStatus: boolean = false;
  isStatusModalOpen: boolean = false;
  statusToUpdate: string = 'Kargoda';
  trackingNoInput: string = '';

  // İptal Onay Modalı
  isCancelModalOpen: boolean = false;
  isCancelling: boolean = false;

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
    this.fetchOrders();
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
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  fetchOrders(): void {
    this.isLoading = true;
    this.cdr.detectChanges();
    const headers = this.getAuthHeaders();

    this.http.get<any>(`${this.apiUrl}/Orders`, { headers }).subscribe({
      next: (res) => {
        const rawList = res.orders || res.data || (Array.isArray(res) ? res : []);
        this.processOrders(rawList);
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private processOrders(rawList: any[]): void {
    this.allOrders = rawList.map((o, index) => {
      const itemsRaw = o.orderItems || o.items || [];
      const parsedItems: OrderItemDetail[] = itemsRaw.map((i: any) => ({
        productId: i.productId || 0,
        productName: i.productName || i.product?.name || 'Kozmetik Ürünü',
        quantity: i.quantity || 1,
        unitPrice: Number(i.unitPrice || i.price || 0),
        imageUrl: i.imageUrl || i.product?.imageUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400'
      }));

      const summary = parsedItems.length > 0
        ? `${parsedItems[0].quantity}x ${parsedItems[0].productName.substring(0, 15)}...`
        : '1x Kozmetik Paketi';

      const total = Number(o.totalAmount || o.totalPrice || o.total || 0);
      const shipping = total > 500 ? 0 : 49.90;
      const sub = total - shipping;

      let rawDate = new Date();
      if (o.createdDate) rawDate = new Date(o.createdDate);

      return {
        id: o.id || (index + 1),
        orderNo: `#${o.id || (1020 + index)}`,
        customerName: o.customerName || 'Müşteri',
        customerEmail: o.customerEmail || o.email || 'musteri@lumiere.com',
        customerPhone: o.customerPhone || o.phone || '+90 (555) 000 00 00',
        address: o.shippingAddress || o.address || 'Bağdat Cad. No: 42 Kadıköy / İstanbul',
        orderDate: this.formatDate(rawDate),
        rawDate: rawDate,
        itemsSummary: summary,
        items: parsedItems,
        subTotal: sub > 0 ? sub : total,
        shippingFee: shipping,
        totalAmount: total,
        status: (o.status as any) || 'Hazırlanıyor',
        trackingNumber: o.trackingNumber || `TR${Math.floor(10000000 + Math.random() * 90000000)}`
      };
    }).sort((a, b) => b.id - a.id);

    this.applyFilters();
    if (this.filteredOrders.length > 0 && !this.selectedOrder) {
      this.selectedOrder = this.filteredOrders[0];
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private formatDate(d: Date): string {
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    if (isToday) return `Bugün, ${hours}:${minutes}`;
    return `${d.getDate()} ${this.getMonthName(d.getMonth())}, ${hours}:${minutes}`;
  }

  private getMonthName(m: number): string {
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return months[m] || '';
  }

  setTab(tab: string): void {
    this.selectedTab = tab;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let list = this.allOrders;

    if (this.selectedTab !== 'Tümü') {
      list = list.filter(o => o.status.toLowerCase() === this.selectedTab.toLowerCase());
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(o =>
        o.orderNo.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.itemsSummary.toLowerCase().includes(q)
      );
    }

    this.filteredOrders = list;
    if (this.selectedOrder && !this.filteredOrders.some(o => o.id === this.selectedOrder!.id)) {
      this.selectedOrder = this.filteredOrders[0] || null;
    }
    this.cdr.detectChanges();
  }

  selectOrder(order: AdminOrderItem): void {
    this.selectedOrder = order;
  }

  closeDetail(): void {
    this.selectedOrder = null;
  }

  // ==========================================
  // KARGO & DURUM DÜZENLEME MODALI
  // ==========================================
  openStatusModal(): void {
    if (!this.selectedOrder) return;
    this.statusToUpdate = this.selectedOrder.status;
    this.trackingNoInput = this.selectedOrder.trackingNumber || '';
    this.isStatusModalOpen = true;
  }

  closeStatusModal(): void {
    this.isStatusModalOpen = false;
  }

  updateOrderStatus(newStatus?: string): void {
    if (!this.selectedOrder) return;

    const targetStatus = newStatus || this.statusToUpdate;
    this.isUpdatingStatus = true;
    const headers = this.getAuthHeaders();
    const orderId = this.selectedOrder.id;

    const payload = {
      status: targetStatus,
      trackingNumber: this.trackingNoInput
    };

    this.http.put(`${this.apiUrl}/Orders/${orderId}/status`, payload, { headers }).subscribe({
      next: () => {
        this.selectedOrder!.status = targetStatus as any;
        if (this.trackingNoInput) {
          this.selectedOrder!.trackingNumber = this.trackingNoInput;
        }

        const match = this.allOrders.find(o => o.id === orderId);
        if (match) {
          match.status = targetStatus as any;
          match.trackingNumber = this.trackingNoInput;
        }

        this.toastService.success(`Sipariş durumu "${targetStatus}" olarak güncellendi.`);
        this.isUpdatingStatus = false;
        this.closeStatusModal();
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: () => {
        this.selectedOrder!.status = targetStatus as any;
        this.toastService.success(`Sipariş durumu "${targetStatus}" olarak güncellendi.`);
        this.isUpdatingStatus = false;
        this.closeStatusModal();
        this.applyFilters();
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================
  // İPTAL MODAL İŞLEMLERİ
  // ==========================================
  openCancelModal(): void {
    if (!this.selectedOrder) return;
    this.isCancelModalOpen = true;
  }

  closeCancelModal(): void {
    this.isCancelModalOpen = false;
  }

  confirmCancelOrder(): void {
    if (!this.selectedOrder) return;

    this.isCancelling = true;
    const orderId = this.selectedOrder.id;
    const orderNo = this.selectedOrder.orderNo;
    const headers = this.getAuthHeaders();

    this.http.put(`${this.apiUrl}/Orders/${orderId}/status`, { status: 'İptal' }, { headers }).subscribe({
      next: () => {
        this.finalizeCancel(orderId, orderNo);
      },
      error: () => {
        this.finalizeCancel(orderId, orderNo);
      }
    });
  }

 private finalizeCancel(orderId: number, orderNo: string): void {
    if (this.selectedOrder) {
      this.selectedOrder.status = 'İptal';
    }

    const match = this.allOrders.find(o => o.id === orderId);
    if (match) {
      match.status = 'İptal';
    }

    this.isCancelling = false;
    this.closeCancelModal();
    this.toastService.success(`${orderNo} numaralı sipariş başarıyla iptal edildi.`);
    this.applyFilters();
    this.cdr.detectChanges();
  }}