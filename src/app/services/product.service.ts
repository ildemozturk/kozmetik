import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../models/product';

export interface PagedResponse<T> {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  data: T[];
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'http://localhost:5246/api/Products';
  constructor(private http: HttpClient) {}

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`);
  }

  getProducts(category: string = '', page: number = 1, pageSize: number = 12, sort: string = 'default', stock: string = 'all'): Observable<PagedResponse<Product>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString())
      .set('sort', sort)
      .set('stock', stock);

    if (category) {
      params = params.set('category', category);
    }

    return this.http.get<PagedResponse<Product>>(this.apiUrl, { params });
  }

  getBestSellers(count: number = 8): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/best-sellers?count=${count}`);
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  // GELİNCE HABER VER ABONELİK İSTEĞİ
  subscribeStockNotification(productId: number, email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/${productId}/subscribe-notification`,
      { email }
    );
  }
}