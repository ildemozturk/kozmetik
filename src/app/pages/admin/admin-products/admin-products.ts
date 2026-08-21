import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

export interface AdminProductItem {
  id: number;
  name: string;
  category: string;
  sku: string;
  stockQuantity: number;
  price: number;
  imageUrl: string;
  status: 'Stokta Var' | 'Kritik' | 'Tükendi';
}

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.css'
})
export class AdminProducts implements OnInit {
  isSidebarCollapsed: boolean = false;
  isLoading: boolean = false;
  isProfileMenuOpen: boolean = false;

  adminFullName: string = '';
  adminRole: string = '';

  allProducts: AdminProductItem[] = [];
  filteredProducts: AdminProductItem[] = [];
  pagedProducts: AdminProductItem[] = [];

  // Filtreler & Arama
  searchQuery: string = '';
  categories: string[] = ['Tümü', 'Cilt Bakımı', 'Makyaj', 'Parfüm', 'Saç Bakımı'];
  selectedCategory: string = 'Tümü';
  selectedStockFilter: string = 'all';

  // Sayfalama (Pagination)
  currentPage: number = 1;
  pageSize: number = 6;
  totalPages: number = 1;

  // Stok Düzenleme Modalı
  isEditStockModalOpen: boolean = false;
  selectedProductForEdit: AdminProductItem | null = null;
  newStockQuantity: number = 0;
  isSavingStock: boolean = false;

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
    this.fetchProducts();
  }

  loadAdminProfile(): void {
    const userStr = localStorage.getItem('lumiere_user') || localStorage.getItem('user') || localStorage.getItem('cosmetic_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.adminFullName = user.fullName || user.name || 'Admin';
        this.adminRole = user.role || 'Yönetici';
      } catch {
        this.adminFullName = 'Admin';
        this.adminRole = 'Yönetici';
      }
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
    const token = localStorage.getItem('token') || localStorage.getItem('jwt') || localStorage.getItem('cosmetic_token') || localStorage.getItem('lumiere_token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private extractStock(p: any): number {
    if (p.stock !== undefined && p.stock !== null) {
      if (typeof p.stock === 'number') return p.stock;
      if (typeof p.stock.quantity === 'number') return p.stock.quantity;
      if (!isNaN(Number(p.stock.quantity))) return Number(p.stock.quantity);
    }
    if (p.stockQuantity !== undefined && p.stockQuantity !== null) return Number(p.stockQuantity);
    if (p.quantity !== undefined && p.quantity !== null) return Number(p.quantity);
    return 0;
  }

  private generateSku(category: string, id: number): string {
    const catCode = category ? category.substring(0, 2).toUpperCase() : 'SK';
    return `LM-${catCode}-${String(id).padStart(3, '0')}`;
  }

  fetchProducts(): void {
    this.isLoading = true;
    const headers = this.getAuthHeaders();

    this.http.get<any>(`${this.apiUrl}/Products/all`, { headers }).subscribe({
      next: (res) => {
        const rawList = res.products || res.data || res.items || (Array.isArray(res) ? res : []);
        this.processProducts(rawList);
      },
      error: () => {
        this.http.get<any>(`${this.apiUrl}/Products`, { headers }).subscribe({
          next: (res) => {
            const rawList = res.products || res.data || res.items || (Array.isArray(res) ? res : []);
            this.processProducts(rawList);
          },
          error: () => {
            this.isLoading = false;
            this.toastService.error('Ürünler yüklenemedi.');
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  private processProducts(list: any[]): void {
    this.allProducts = list.map(p => {
      const qty = this.extractStock(p);
      let status: 'Stokta Var' | 'Kritik' | 'Tükendi' = 'Stokta Var';

      if (qty === 0) status = 'Tükendi';
      else if (qty <= 12) status = 'Kritik';

      return {
        id: p.id,
        name: p.name,
        category: p.category?.name || p.category || 'Cilt Bakımı',
        sku: this.generateSku(p.category?.name || p.category, p.id),
        stockQuantity: qty,
        price: Number(p.price || 0),
        imageUrl: p.imageUrl || 'assets/images/default-product.png',
        status: status
      };
    });

    this.applyFilters();
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  setCategory(cat: string): void {
    this.selectedCategory = cat;
    this.currentPage = 1;
    this.applyFilters();
  }

  onStockFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters(): void {
    let list = [...this.allProducts];

    // 1. Arama Filtresi
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      list = list.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.sku.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }

    // 2. Kategori Filtresi
    if (this.selectedCategory !== 'Tümü') {
      list = list.filter(p => p.category.toLowerCase().includes(this.selectedCategory.toLowerCase()));
    }

    // 3. Stok Durumu Filtresi
    if (this.selectedStockFilter === 'inStock') {
      list = list.filter(p => p.stockQuantity > 12);
    } else if (this.selectedStockFilter === 'critical') {
      list = list.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 12);
    } else if (this.selectedStockFilter === 'outOfStock') {
      list = list.filter(p => p.stockQuantity === 0);
    }

    this.filteredProducts = list;
    this.totalPages = Math.ceil(this.filteredProducts.length / this.pageSize) || 1;
    this.updatePagedProducts();
  }

  updatePagedProducts(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedProducts = this.filteredProducts.slice(start, end);
    this.cdr.detectChanges();
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagedProducts();
    }
  }

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  openEditStockModal(product: AdminProductItem): void {
    this.selectedProductForEdit = product;
    this.newStockQuantity = product.stockQuantity;
    this.isEditStockModalOpen = true;
  }

  closeEditStockModal(): void {
    this.isEditStockModalOpen = false;
    this.selectedProductForEdit = null;
  }

  saveStock(): void {
    if (!this.selectedProductForEdit) return;

    this.isSavingStock = true;
    const headers = this.getAuthHeaders();
    const productId = this.selectedProductForEdit.id;

    this.http.put(`${this.apiUrl}/Products/${productId}/update-stock`, { newQuantity: this.newStockQuantity }, { headers }).subscribe({
      next: () => {
        this.selectedProductForEdit!.stockQuantity = this.newStockQuantity;
        if (this.newStockQuantity === 0) this.selectedProductForEdit!.status = 'Tükendi';
        else if (this.newStockQuantity <= 12) this.selectedProductForEdit!.status = 'Kritik';
        else this.selectedProductForEdit!.status = 'Stokta Var';

        this.toastService.success(`${this.selectedProductForEdit!.name} stoğu ${this.newStockQuantity} adet olarak güncellendi.`);
        this.isSavingStock = false;
        this.closeEditStockModal();
        this.applyFilters();
      },
      error: () => {
        this.isSavingStock = false;
        this.toastService.error('Stok güncellenemedi.');
      }
    });
  }
}