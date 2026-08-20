import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { CartService } from './cart.service';
import { WishlistService } from './wishlist.service';

export interface UserRegisterDto {
  fullName: string;
  email: string;
  password: string;
  role?: string;
}

export interface UserLoginDto {
  email: string;
  password: string;
}

export interface AuthResponseDto {
  token: string;
  fullName: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5246/api/Auth';
  private readonly TOKEN_KEY = 'cosmetic_token';
  private readonly USER_KEY = 'cosmetic_user';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cartService: CartService,
    private wishlistService: WishlistService
  ) {}

  register(model: UserRegisterDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/register`, model).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  login(model: UserLoginDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/login`, model).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  logout(): void {
    // 1. Auth & Token Verilerini Temizle
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem('jwt');
    localStorage.removeItem('lumiere_token');
    localStorage.removeItem('user');
    localStorage.removeItem('lumiere_user');

    // 2. Sepet ve Favori State'lerini ve LocalStorage Kayıtlarını Sıfırla
    this.cartService.clearCart(false);
    this.wishlistService.clearWishlist();

    // 3. Varsa Önbellek Siparişleri Temizle
    localStorage.removeItem('lumiere_orders');

    // 4. Giriş Ekranına Yönlendir
    this.router.navigate(['/login']);
  }

  private handleAuthResponse(response: AuthResponseDto): void {
    if (response && response.token) {
      localStorage.setItem(this.TOKEN_KEY, response.token);
      localStorage.setItem(this.USER_KEY, JSON.stringify({
        fullName: response.fullName,
        email: response.email,
        role: response.role
      }));
      // Geriye dönük uyumluluk için genel anahtarları da besle
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify({
        fullName: response.fullName,
        email: response.email,
        role: response.role
      }));
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY) || localStorage.getItem('token') || localStorage.getItem('jwt');
  }

  getUser(): { fullName: string; email: string; role: string } | null {
    const userStr = localStorage.getItem(this.USER_KEY) || localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'Admin';
  }
}