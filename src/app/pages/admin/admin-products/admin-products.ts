import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

export interface AdminProduct {
  id: number;
  name: string;
  category: string;
  sku: string;
  price: number;
  oldPrice?: number;
  stockQuantity: number;
  imageUrl: string;
  description?: string;
  status: 'Stokta Var' | 'Kritik' | 'Tükendi';
}

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.css'
})
export class AdminProducts implements OnInit {
  isLoading: boolean = false;
  adminFullName: string = 'Derin Aydın';
  adminRole: string = 'Yönetici';

  // Cache Alanı (RAM)
  private cachedProducts: AdminProduct[] = [];
  
  filteredProducts: AdminProduct[] = [];
  pagedProducts: AdminProduct[] = [];

  // Kategoriler (Cilt Bakımı ve tüm kategoriler eklendi)
  categories: string[] = ['Tümü', 'Cilt Bakımı', 'Serum', 'Krem', 'Temizleyici', 'Göz Bakımı', 'Güneş Koruması', 'Maske & Peeling'];
  formCategories: string[] = ['Cilt Bakımı', 'Serum', 'Krem', 'Temizleyici', 'Göz Bakımı', 'Güneş Koruması', 'Maske & Peeling'];
  selectedCategory: string = 'Tümü';
  selectedStockFilter: string = 'all';
  searchQuery: string = '';

  // Sayfalama
  currentPage: number = 1;
  pageSize: number = 8;
  totalPages: number = 1;

  // Yeni Ürün Modalı
  isAddProductModalOpen: boolean = false;
  isSavingNewProduct: boolean = false;
  newProduct = {
    name: '',
    category: 'Cilt Bakımı',
    price: 0,
    oldPrice: null as number | null,
    stockQuantity: 50,
    imageUrl: '',
    description: ''
  };

  // Düzenleme Modalı
  isEditProductModalOpen: boolean = false;
  isUpdatingProduct: boolean = false;
  editProductForm = {
    id: 0,
    name: '',
    category: 'Cilt Bakımı',
    price: 0,
    oldPrice: null as number | null,
    stockQuantity: 0,
    imageUrl: '',
    description: ''
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
    this.fetchProducts();
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

  fetchProducts(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.http.get<any>(`${this.apiUrl}/Products/all`).subscribe({
      next: (res) => {
        const rawList: any[] = res.data || (Array.isArray(res) ? res : []);
        
        this.cachedProducts = rawList.map((p, index) => {
          // JSON çıktısındaki stockQuantity ve stock.quantity alanlarını tam garantiye alıyoruz
          const qty = Number(
            p.stockQuantity !== undefined ? p.stockQuantity :
            (p.stock?.quantity !== undefined ? p.stock.quantity : 0)
          );

          let status: 'Stokta Var' | 'Kritik' | 'Tükendi' = 'Stokta Var';
          if (qty <= 0) {
            status = 'Tükendi';
          } else if (qty <= 12) {
            status = 'Kritik';
          }

          return {
            id: p.id || (index + 1),
            name: p.name || 'İsimsiz Ürün',
            category: p.category || 'Genel',
            sku: p.sku || `LUM-PRD-${String(p.id).padStart(3, '0')}`,
            price: Number(p.price || 0),
            oldPrice: p.oldPrice ? Number(p.oldPrice) : undefined,
            stockQuantity: qty,
            imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400',
            description: p.description || '',
            status: status
          };
        });

        this.applyFiltersFromCache();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFiltersFromCache();
  }

  setCategory(cat: string): void {
    this.selectedCategory = cat;
    this.currentPage = 1;
    this.applyFiltersFromCache();
  }

  onStockFilterChange(): void {
    this.currentPage = 1;
    this.applyFiltersFromCache();
  }

  applyFiltersFromCache(): void {
    let list = [...this.cachedProducts];

    if (this.selectedCategory && this.selectedCategory !== 'Tümü') {
      list = list.filter(p => p.category.toLowerCase() === this.selectedCategory.toLowerCase());
    }

    if (this.selectedStockFilter === 'inStock') {
      list = list.filter(p => p.stockQuantity > 12);
    } else if (this.selectedStockFilter === 'critical') {
      list = list.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 12);
    } else if (this.selectedStockFilter === 'outOfStock') {
      list = list.filter(p => p.stockQuantity <= 0);
    }

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    this.filteredProducts = list;
    this.totalPages = Math.ceil(this.filteredProducts.length / this.pageSize) || 1;
    this.updatePagedProducts();
  }

  updatePagedProducts(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.pagedProducts = this.filteredProducts.slice(startIndex, startIndex + this.pageSize);
    this.cdr.detectChanges();
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.updatePagedProducts();
  }

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  trackByProductId(index: number, item: AdminProduct): number {
    return item.id;
  }

  trackByPageNumber(index: number, page: number): number {
    return page;
  }

  openAddProductModal(): void {
    this.newProduct = {
      name: '',
      category: 'Cilt Bakımı',
      price: 0,
      oldPrice: null,
      stockQuantity: 50,
      imageUrl: '',
      description: ''
    };
    this.isAddProductModalOpen = true;
    this.cdr.detectChanges();
  }

  closeAddProductModal(): void {
    this.isAddProductModalOpen = false;
    this.cdr.detectChanges();
  }

  saveNewProduct(): void {
    if (!this.newProduct.name.trim() || this.newProduct.price <= 0) {
      this.toastService.error('Lütfen ürün adını ve geçerli bir fiyat giriniz.');
      return;
    }

    this.isSavingNewProduct = true;
    const headers = this.getAuthHeaders();

    this.http.post<any>(`${this.apiUrl}/Products`, this.newProduct, { headers }).subscribe({
      next: () => {
        this.isSavingNewProduct = false;
        this.closeAddProductModal();
        this.toastService.success(`"${this.newProduct.name}" ürünü başarıyla eklendi.`);
        this.fetchProducts();
      },
      error: () => {
        this.isSavingNewProduct = false;
        this.toastService.error('Ürün eklenirken bir hata oluştu.');
      }
    });
  }

  openEditProductModal(product: AdminProduct): void {
    this.editProductForm = {
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      oldPrice: product.oldPrice ?? null,
      stockQuantity: product.stockQuantity,
      imageUrl: product.imageUrl,
      description: product.description || ''
    };
    this.isEditProductModalOpen = true;
    this.cdr.detectChanges();
  }

  closeEditProductModal(): void {
    this.isEditProductModalOpen = false;
    this.cdr.detectChanges();
  }

  saveUpdatedProduct(): void {
    if (!this.editProductForm.name.trim() || this.editProductForm.price <= 0) {
      this.toastService.error('Ürün adı ve fiyat alanları zorunludur.');
      return;
    }

    this.isUpdatingProduct = true;
    const headers = this.getAuthHeaders();

    this.http.put<any>(`${this.apiUrl}/Products/${this.editProductForm.id}`, this.editProductForm, { headers }).subscribe({
      next: () => {
        this.isUpdatingProduct = false;
        this.closeEditProductModal();
        this.toastService.success(`"${this.editProductForm.name}" başarıyla güncellendi.`);
        this.fetchProducts();
      },
      error: () => {
        this.isUpdatingProduct = false;
        this.toastService.error('Ürün güncellenirken hata oluştu.');
      }
    });
  }

  deleteProduct(productId: number, productName: string): void {
    if (!confirm(`"${productName}" adlı ürünü silmek istediğinize emin misiniz?`)) return;

    const headers = this.getAuthHeaders();
    this.http.delete(`${this.apiUrl}/Products/${productId}`, { headers }).subscribe({
      next: () => {
        this.toastService.success(`"${productName}" silindi.`);
        this.cachedProducts = this.cachedProducts.filter(p => p.id !== productId);
        this.applyFiltersFromCache();
      },
      error: () => {
        this.toastService.error('Ürün silinemedi.');
      }
    });
  }
}