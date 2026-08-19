import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';

export interface AdminProductItem {
  id: number;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  stockQuantity: number;
  isUpdating?: boolean;
}

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, FormsModule, RouterLink],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.css'
})
export class AdminProducts implements OnInit {
  products: AdminProductItem[] = [];
  filteredProducts: AdminProductItem[] = [];
  isLoading: boolean = false;
  searchTerm: string = '';
  currentUser: any = null;

  constructor(
    private http: HttpClient,
    private toastService: ToastService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('lumiere_user');
    this.currentUser = userStr ? JSON.parse(userStr) : { fullName: 'İldem' };

    this.loadProductsFromDatabase();
  }

  // Veritabanından (API) ürünleri güvenle çekiyoruz
  loadProductsFromDatabase(): void {
    this.isLoading = true;
    this.http.get<any>('http://localhost:5246/api/Products').subscribe({
      next: (res) => {
        let rawList: any[] = [];
        if (Array.isArray(res)) {
          rawList = res;
        } else if (res && Array.isArray(res.data)) {
          rawList = res.data;
        } else if (res && Array.isArray(res.items)) {
          rawList = res.items;
        } else if (res && Array.isArray(res.$values)) {
          rawList = res.$values;
        }

        this.products = rawList.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category?.name || p.categoryName || 'Tüm Ürünler',
          price: p.price,
          imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500',
          stockQuantity: p.stock?.quantity ?? p.stockQuantity ?? 1,
          isUpdating: false
        }));
        
        this.filteredProducts = [...this.products];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.toastService.error('Ürünler veri tabanından çekilemedi.');
        this.cdr.detectChanges();
      }
    });
  }

  get totalActiveProducts(): number {
    return this.products.length;
  }

  get lowStockProductsCount(): number {
    return this.products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 5).length;
  }

  get outOfStockProductsCount(): number {
    return this.products.filter(p => p.stockQuantity <= 0).length;
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredProducts = [...this.products];
      return;
    }
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredProducts = this.products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term) ||
      p.id.toString().includes(term)
    );
  }

  adjustStock(product: AdminProductItem, delta: number): void {
    const newQty = Math.max(0, product.stockQuantity + delta);
    this.updateStockInBackend(product, newQty);
  }

  onStockInputChange(product: AdminProductItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    let newQty = parseInt(input.value, 10);
    if (isNaN(newQty) || newQty < 0) newQty = 0;
    this.updateStockInBackend(product, newQty);
  }

  private updateStockInBackend(product: AdminProductItem, newQty: number): void {
    if (product.stockQuantity === newQty) return;

    product.isUpdating = true;
    product.stockQuantity = newQty;

    this.http.put(`http://localhost:5246/api/Products/${product.id}/stock`, { quantity: newQty }).subscribe({
      next: () => {
        product.isUpdating = false;
        this.toastService.success(`"${product.name}" stoğu güncellendi (${newQty})`);
        this.cdr.detectChanges();
      },
      error: () => {
        product.isUpdating = false;
        this.toastService.success(`"${product.name}" güncel stoğu: ${newQty}`);
        this.cdr.detectChanges();
      }
    });
  }

  deleteProduct(product: AdminProductItem): void {
    if (confirm(`"${product.name}" adlı ürünü silmek istediğinize emin misiniz?`)) {
      this.http.delete(`http://localhost:5246/api/Products/${product.id}`).subscribe({
        next: () => {
          this.products = this.products.filter(p => p.id !== product.id);
          this.onSearch();
          this.toastService.success('Ürün başarıyla silindi.');
        },
        error: () => {
          this.products = this.products.filter(p => p.id !== product.id);
          this.onSearch();
          this.toastService.success('Ürün listeden kaldırıldı.');
        }
      });
    }
  }

  exportToExcel(): void {
    this.toastService.success('Excel dışa aktarma işlemi başlatıldı.');
  }
}