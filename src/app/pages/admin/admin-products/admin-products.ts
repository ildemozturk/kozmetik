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
  oldPrice?: number | null;
  imageUrl: string;
  description?: string;
  status: 'Stokta Var' | 'Kritik' | 'Tükendi';
}

export interface ProductFormModel {
  id?: number;
  name: string;
  category: string;
  price: number | null;
  oldPrice: number | null;
  stockQuantity: number | null;
  imageUrl: string;
  description: string;
}

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.css'
})
export class AdminProducts implements OnInit {
  isLoading: boolean = true;

  adminFullName: string = '';
  adminRole: string = '';

  allProducts: AdminProductItem[] = [];
  filteredProducts: AdminProductItem[] = [];
  pagedProducts: AdminProductItem[] = [];

  searchQuery: string = '';
  categories: string[] = ['Tümü', 'Cilt Bakımı', 'Makyaj', 'Parfüm', 'Saç Bakımı'];
  formCategories: string[] = ['Cilt Bakımı', 'Makyaj', 'Parfüm', 'Saç Bakımı'];
  selectedCategory: string = 'Tümü';
  selectedStockFilter: string = 'all';

  currentPage: number = 1;
  pageSize: number = 6;
  totalPages: number = 1;

  isAddProductModalOpen: boolean = false;
  isSavingNewProduct: boolean = false;
  newProduct: ProductFormModel = {
    name: '',
    category: 'Cilt Bakımı',
    price: null,
    oldPrice: null,
    stockQuantity: null,
    imageUrl: '',
    description: ''
  };

  isEditProductModalOpen: boolean = false;
  isUpdatingProduct: boolean = false;
  editProductForm: ProductFormModel = {
    id: 0,
    name: '',
    category: 'Cilt Bakımı',
    price: null,
    oldPrice: null,
    stockQuantity: null,
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

  logout(): void {
    this.authService.logout();
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
    if (!p) return 0;
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
    this.cdr.detectChanges();
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
        oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
        imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400',
        description: p.description || '',
        status: status
      };
    }).sort((a, b) => a.id - b.id);

    this.applyFilters();
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  setCategory(cat: string): void {
    if (this.selectedCategory === cat) return;
    this.selectedCategory = cat;
    this.currentPage = 1;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  onStockFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  applyFilters(): void {
    let list = this.allProducts;

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      list = list.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.sku.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }

    if (this.selectedCategory !== 'Tümü') {
      list = list.filter(p => p.category.toLowerCase().includes(this.selectedCategory.toLowerCase()));
    }

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
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagedProducts();
      this.cdr.detectChanges();
    }
  }

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  trackByProductId(index: number, product: AdminProductItem): number {
    return product.id;
  }

  trackByPageNumber(index: number, page: number): number {
    return page;
  }

  openAddProductModal(): void {
    this.newProduct = {
      name: '',
      category: 'Cilt Bakımı',
      price: null,
      oldPrice: null,
      stockQuantity: null,
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
    if (!this.newProduct.name.trim() || !this.newProduct.price || this.newProduct.stockQuantity === null) {
      this.toastService.error('Lütfen zorunlu alanları doldurunuz.');
      return;
    }

    this.isSavingNewProduct = true;
    this.cdr.detectChanges();
    const headers = this.getAuthHeaders();

    const payload = {
      name: this.newProduct.name.trim(),
      category: this.newProduct.category,
      price: Number(this.newProduct.price),
      oldPrice: this.newProduct.oldPrice ? Number(this.newProduct.oldPrice) : null,
      stockQuantity: Number(this.newProduct.stockQuantity),
      imageUrl: this.newProduct.imageUrl.trim() || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400',
      description: this.newProduct.description.trim() || `${this.newProduct.name} - Lumière Özel Bakım`
    };

    this.http.post<any>(`${this.apiUrl}/Products`, payload, { headers }).subscribe({
      next: () => {
        this.toastService.success('Yeni ürün başarıyla eklendi!');
        this.isSavingNewProduct = false;
        this.closeAddProductModal();
        this.fetchProducts();
      },
      error: (err) => {
        this.isSavingNewProduct = false;
        const msg = err.error?.message || 'Ürün eklenirken hata oluştu.';
        this.toastService.error(msg);
        this.cdr.detectChanges();
      }
    });
  }

  openEditProductModal(product: AdminProductItem): void {
    this.editProductForm = {
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      oldPrice: product.oldPrice || null,
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
    if (!this.editProductForm.name.trim() || !this.editProductForm.price || this.editProductForm.stockQuantity === null) {
      this.toastService.error('Lütfen gerekli alanları eksiksiz doldurunuz.');
      return;
    }

    this.isUpdatingProduct = true;
    this.cdr.detectChanges();
    const headers = this.getAuthHeaders();
    const productId = this.editProductForm.id;

    const payload = {
      name: this.editProductForm.name.trim(),
      category: this.editProductForm.category,
      price: Number(this.editProductForm.price),
      oldPrice: this.editProductForm.oldPrice ? Number(this.editProductForm.oldPrice) : null,
      stockQuantity: Number(this.editProductForm.stockQuantity),
      imageUrl: this.editProductForm.imageUrl.trim() || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400',
      description: this.editProductForm.description.trim()
    };

    this.http.put<any>(`${this.apiUrl}/Products/${productId}`, payload, { headers }).subscribe({
      next: () => {
        const targetIndex = this.allProducts.findIndex(p => p.id === productId);
        if (targetIndex !== -1) {
          const qty = Number(payload.stockQuantity);
          let status: 'Stokta Var' | 'Kritik' | 'Tükendi' = 'Stokta Var';
          if (qty === 0) status = 'Tükendi';
          else if (qty <= 12) status = 'Kritik';

          this.allProducts[targetIndex] = {
            ...this.allProducts[targetIndex],
            name: payload.name,
            category: payload.category,
            price: payload.price,
            oldPrice: payload.oldPrice,
            stockQuantity: qty,
            imageUrl: payload.imageUrl,
            description: payload.description,
            status: status
          };
        }

        this.toastService.success(`${payload.name} güncellendi.`);
        this.isUpdatingProduct = false;
        this.closeEditProductModal();
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: () => {
        this.isUpdatingProduct = false;
        this.toastService.error('Ürün güncellenirken hata oluştu.');
        this.cdr.detectChanges();
      }
    });
  }

  deleteProduct(productId: number, productName: string): void {
    if (!confirm(`"${productName}" ürününü silmek istediğinize emin misiniz?`)) return;

    const headers = this.getAuthHeaders();
    this.http.delete(`${this.apiUrl}/Products/${productId}`, { headers }).subscribe({
      next: () => {
        this.toastService.success(`"${productName}" başarıyla silindi.`);
        this.allProducts = this.allProducts.filter(p => p.id !== productId);
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastService.error('Ürün silinirken bir hata oluştu.');
        this.cdr.detectChanges();
      }
    });
  }
}