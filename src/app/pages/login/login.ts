import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { UserLoginDto } from '../../models/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  loginData: UserLoginDto = {
    email: '',
    password: ''
  };

  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('lumiere_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u.role === 'Admin') {
          this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
        }
      } catch {}
    }
  }

  onSubmit(): void {
    if (!this.loginData.email || !this.loginData.password) {
      this.toastService.error('Lütfen e-posta ve şifrenizi eksiksiz giriniz.');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.loginData).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.toastService.success(`Hoş geldiniz, ${res.fullName}!`);
        
        // Admin kontrolü (sadece res.role üzerinden)
        if (res.role === 'Admin') {
          this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
        } else {
          this.router.navigate(['/'], { replaceUrl: true });
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.message || 'Giriş başarısız. E-posta veya şifre hatalı!';
        this.errorMessage = msg;
        this.toastService.error(msg);
        this.cdr.detectChanges();
      }
    });
  }
}