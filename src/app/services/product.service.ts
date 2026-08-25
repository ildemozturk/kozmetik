import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, map } from 'rxjs/operators';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  imageUrl: string;
  category: string;
  sku?: string;
  stockQuantity: number;
  status: 'Stokta Var' | 'Kritik' | 'Tükendi';
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'http://localhost:5246/api/Products';

  private cachedProducts: Product[] | null = null;
  private productsSubject = new BehaviorSubject<Product[]>([]);
  public products$ = this.productsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // 1. Kategorileri Getirme (Önbellekli)
  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`);
  }

  // 2. Tüm Ürünleri Getirme (Önbellekli)
  getAllProducts(forceRefresh: boolean = false): Observable<Product[]> {
    if (this.cachedProducts && !forceRefresh) {
      return of(this.cachedProducts);
    }

    return this.http.get<any>(this.apiUrl).pipe(
      map(res => {
        const list: any[] = res.data || res.products || (Array.isArray(res) ? res : []);
        return list.map((p: any): Product => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: Number(p.price),
          oldPrice: p.oldPrice ? Number(p.oldPrice) : undefined,
          imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400',
          category: p.category || 'Genel',
          sku: p.sku || `LUM-${p.id}`,
          stockQuantity: p.stockQuantity ?? (p.stock?.quantity ?? 0),
          status: (p.stockQuantity ?? (p.stock?.quantity ?? 0)) === 0 ? 'Tükendi' : ((p.stockQuantity ?? (p.stock?.quantity ?? 0)) <= 12 ? 'Kritik' : 'Stokta Var')
        }));
      }),
      tap(products => {
        this.cachedProducts = products;
        this.productsSubject.next(products);
      })
    );
  }

  // 3. Sayfalamalı / Filtreli Ürün Listesi
  getProducts(category?: string, page: number = 1, pageSize: number = 10, sort: string = 'default', stockFilter: string = 'all'): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString())
      .set('sort', sort)
      .set('stockFilter', stockFilter);

    if (category && category !== 'Tümü' && category !== 'all') {
      params = params.set('category', category);
    }

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => {
        if (res && res.data && Array.isArray(res.data)) {
          res.data = res.data.map((p: any): Product => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            price: Number(p.price),
            oldPrice: p.oldPrice ? Number(p.oldPrice) : undefined,
            imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400',
            category: p.category || 'Genel',
            sku: p.sku || `LUM-${p.id}`,
            stockQuantity: p.stockQuantity ?? (p.stock?.quantity ?? 0),
            status: (p.stockQuantity ?? (p.stock?.quantity ?? 0)) === 0 ? 'Tükendi' : ((p.stockQuantity ?? (p.stock?.quantity ?? 0)) <= 12 ? 'Kritik' : 'Stokta Var')
          }));
        }
        return res;
      })
    );
  }

  // 4. Çok Satanlar
  getBestSellers(count: number = 4): Observable<Product[]> {
    return this.http.get<any[]>(`${this.apiUrl}/bestsellers?count=${count}`).pipe(
      map(list => list.map((p: any): Product => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: Number(p.price),
        oldPrice: p.oldPrice ? Number(p.oldPrice) : undefined,
        imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400',
        category: p.category || 'Genel',
        sku: p.sku || `LUM-${p.id}`,
        stockQuantity: p.stockQuantity ?? (p.stock?.quantity ?? 0),
        status: (p.stockQuantity ?? (p.stock?.quantity ?? 0)) === 0 ? 'Tükendi' : ((p.stockQuantity ?? (p.stock?.quantity ?? 0)) <= 12 ? 'Kritik' : 'Stokta Var')
      })))
    );
  }

  // 5. Tekil Ürün Detayı
  getProductById(id: number): Observable<Product> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((p: any): Product => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: Number(p.price),
        oldPrice: p.oldPrice ? Number(p.oldPrice) : undefined,
        imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400',
        category: p.category || 'Genel',
        sku: p.sku || `LUM-${p.id}`,
        stockQuantity: p.stockQuantity ?? (p.stock?.quantity ?? 0),
        status: (p.stockQuantity ?? (p.stock?.quantity ?? 0)) === 0 ? 'Tükendi' : ((p.stockQuantity ?? (p.stock?.quantity ?? 0)) <= 12 ? 'Kritik' : 'Stokta Var')
      }))
    );
  }

  // 6. Gelince Haber Ver (Stok Bildirimi)
  subscribeStockNotification(productId: number, email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${productId}/notify`, { email });
  }

  // 7. Cache Üzerinden Arama ve Filtreleme
  searchAndFilter(query: string, category: string = 'Tümü', stockFilter: string = 'all'): Observable<Product[]> {
    return this.getAllProducts().pipe(
      map(products => {
        return products.filter(p => {
          const matchesQuery = !query.trim() || 
            p.name.toLowerCase().includes(query.toLowerCase().trim()) ||
            (p.sku && p.sku.toLowerCase().includes(query.toLowerCase().trim()));

          const matchesCategory = category === 'Tümü' || p.category.toLowerCase() === category.toLowerCase();

          let matchesStock = true;
          if (stockFilter === 'inStock') matchesStock = p.stockQuantity > 12;
          else if (stockFilter === 'critical') matchesStock = p.stockQuantity > 0 && p.stockQuantity <= 12;
          else if (stockFilter === 'outOfStock') matchesStock = p.stockQuantity === 0;

          return matchesQuery && matchesCategory && matchesStock;
        });
      })
    );
  }

  // 8. Cache Temizleme
  invalidateCache(): void {
    this.cachedProducts = null;
  }
}