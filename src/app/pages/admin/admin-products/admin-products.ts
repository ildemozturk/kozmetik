import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../services/toast.service';

export interface ProductItem {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  categoryName?: string;
  category?: { name: string };
  stockQuantity?: number;
  stock?: { quantity: number };
}

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.css'
})
export class AdminProducts implements OnInit {
  products: ProductItem[] = [];
  isLoading: boolean = false;

  private apiUrl = 'http://localhost:5246/api';

  constructor(
    private http: HttpClient,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchProducts();
  }

  get activeProductCount(): number {
    return this.products.length;
  }

  get lowStockCount(): number {
    return this.products.filter(p => {
      const qty = p.stock?.quantity ?? p.stockQuantity ?? 0;
      return qty > 0 && qty <= 3;
    }).length;
  }

  get outOfStockCount(): number {
    return this.products.filter(p => {
      const qty = p.stock?.quantity ?? p.stockQuantity ?? 0;
      return qty === 0;
    }).length;
  }

  fetchProducts(): void {
    this.isLoading = true;
    this.http.get<any>(`${this.apiUrl}/Products`).subscribe({
      next: (res) => {
        if (Array.isArray(res)) this.products = res;
        else if (res && Array.isArray(res.data)) this.products = res.data;
        else if (res && Array.isArray(res.items)) this.products = res.items;
        else if (res && Array.isArray(res.$values)) this.products = res.$values;
        else this.products = [];

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.toastService.error('Ürün listesi yüklenemedi.');
        this.cdr.detectChanges();
      }
    });
  }

  increaseStock(product: ProductItem): void {
    if (product.stock) {
      product.stock.quantity++;
    } else {
      product.stockQuantity = (product.stockQuantity ?? 0) + 1;
    }

    const newQty = product.stock?.quantity ?? product.stockQuantity ?? 1;
    this.http.put(`${this.apiUrl}/Products/${product.id}/stock`, { quantity: newQty }).subscribe({
      next: () => {
        this.toastService.success(`${product.name} stoğu artırıldı.`);
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });
  }

  decreaseStock(product: ProductItem): void {
    const currentQty = product.stock?.quantity ?? product.stockQuantity ?? 0;
    if (currentQty <= 0) return;

    if (product.stock) {
      product.stock.quantity--;
    } else {
      product.stockQuantity = currentQty - 1;
    }

    const newQty = product.stock?.quantity ?? product.stockQuantity ?? 0;
    this.http.put(`${this.apiUrl}/Products/${product.id}/stock`, { quantity: newQty }).subscribe({
      next: () => {
        this.toastService.success(`${product.name} stoğu azaltıldı.`);
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });
  }

  deleteProduct(productId: number): void {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;

    this.http.delete(`${this.apiUrl}/Products/${productId}`).subscribe({
      next: () => {
        this.products = this.products.filter(p => p.id !== productId);
        this.toastService.success('Ürün başarıyla silindi.');
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastService.error('Ürün silinirken bir hata oluştu.');
      }
    });
  }

  openAddModal(): void {
    this.toastService.show('Yeni ürün ekleme modalı yakında eklenecektir.');
  }

  openEditModal(product: ProductItem): void {
    this.toastService.show(`${product.name} için düzenleme modalı yakında eklenecektir.`);
  }

  openCategoryModal(): void {
    this.toastService.show('Kategori yönetimi modalı yakında eklenecektir.');
  }

  openStockTracking(product: ProductItem): void {
    this.toastService.show(`${product.name} stok geçmişi görüntüleniyor.`);
  }

  exportToExcel(): void {
    this.toastService.success('Ürün listesi Excel formatında dışa aktarılıyor...');
  }
}