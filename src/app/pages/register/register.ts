import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserRegisterDto } from '../../models/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register implements OnInit {
  registerData: UserRegisterDto = {
    fullName: '',
    email: '',
    password: '',
    role: 'User'
  };

  errorMessage: string = '';
  isLoading: boolean = false;
  returnUrl: string = '/';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  onSubmit(): void {
    if (!this.registerData.fullName || !this.registerData.email || !this.registerData.password) {
      this.errorMessage = 'Lütfen tüm alanları doldurun.';
      return;
    }

    if (this.registerData.password.length < 6) {
      this.errorMessage = 'Şifreniz en az 6 karakter olmalıdır.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.register(this.registerData).subscribe({
      next: (res) => {
        this.isLoading = false;
        
        if (this.returnUrl && this.returnUrl !== '/') {
          this.router.navigateByUrl(this.returnUrl);
        } else if (res.role === 'Admin') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Kayıt işlemi başarısız oldu.';
      }
    });
  }
}