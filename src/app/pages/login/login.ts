import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  returnUrl: string = '/';

  constructor(
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
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
        
        if (this.returnUrl && this.returnUrl !== '/') {
          this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
        } else if (res.role === 'Admin') {
          // Admin girişi yapıldığı anda doğrudan Dashboard açılır
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