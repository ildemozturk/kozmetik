import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product, ProductResponse } from '../models/product';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'https://localhost:7276/api/products';

  constructor(private http: HttpClient) { }

  // 1. Kategorileri Getirir
  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`);
  }

  // 2. Ürünleri Filtre, Sıralama, Stok ve Sayfalama ile Getirir
  getProducts(
    category?: string, 
    page: number = 1, 
    pageSize: number = 12, 
    sort: string = 'default', 
    stock: string = 'all'
  ): Observable<ProductResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString())
      .set('sort', sort)
      .set('stock', stock);

    if (category) {
      params = params.set('category', category);
    }

    return this.http.get<ProductResponse>(this.apiUrl, { params });
  }

  // 3. En Çok Satan Ürünleri Getirir
  getBestSellers(count: number = 8): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/best-sellers?count=${count}`);
  }

  // 4. ID'ye Göre Tek Bir Ürünün Detayını Getirir
  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }
}