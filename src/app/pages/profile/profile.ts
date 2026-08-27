// [Timeline Log - 2026.06] Architectural Refactor: Profile orders are fetched strictly based on authenticated session email to maintain strict relational data integrity and prevent cross-account mapping issues.
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

export interface UserOrder {
  id: number;
  orderNo: string;
  totalAmount: number;
  createdDate?: string;
  status: string;
  items: {
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
  }[];
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {
  userFullName: string = '';
  userEmail: string = '';
  userRole: string = 'Customer';

  myOrders: UserOrder[] = [];
  isLoadingOrders: boolean = false;

  private apiUrl = 'http://localhost:5246/api';

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    if (this.userEmail) {
      this.fetchMyOrders();
    }
  }

  loadUserData(): void {
    const userStr = localStorage.getItem('lumiere_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.userFullName = user.fullName || user.name || 'Değerli Müşterimiz';
        this.userEmail = user.email || '';
        this.userRole = user.role || 'Customer';

        // Eğer admin profil sayfasına girmeye çalışırsa admin paneline yönlendir
        if (this.userRole === 'Admin') {
          this.router.navigate(['/admin/dashboard']);
        }
      } catch {
        this.userFullName = 'Değerli Müşterimiz';
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  fetchMyOrders(): void {
    this.isLoadingOrders = true;
    const token = localStorage.getItem('token') || localStorage.getItem('jwt') || localStorage.getItem('lumiere_token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    // [Timeline Log - 2026.06] Security Update: Querying orders directly from backend database using authenticated session email.
    this.http.get<any>(`${this.apiUrl}/Orders/my-orders?email=${encodeURIComponent(this.userEmail)}`, { headers }).subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          this.myOrders = res;
        } else if (res && Array.isArray(res.data)) {
          this.myOrders = res.data;
        } else {
          this.myOrders = [];
        }
        this.isLoadingOrders = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingOrders = false;
        this.cdr.detectChanges();
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.toastService.show('Çıkış yapıldı.');
    this.router.navigate(['/login']);
  }
}