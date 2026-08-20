import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  registerData = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: ''
  };

  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private http: HttpClient,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  onSubmit(): void {
    if (!this.registerData.fullName || !this.registerData.email || !this.registerData.password) {
      this.toastService.error('Lütfen tüm zorunlu alanları doldurunuz.');
      return;
    }

    if (this.registerData.confirmPassword && this.registerData.password !== this.registerData.confirmPassword) {
      this.toastService.error('Şifreler birbiriyle eşleşmiyor.');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Backend'in bekleyebileceği tüm alan formatlarını kapsayan DTO payload'u
    const names = this.registerData.fullName.trim().split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || firstName;

    const payload = {
      fullName: this.registerData.fullName.trim(),
      name: this.registerData.fullName.trim(),
      firstName: firstName,
      lastName: lastName,
      email: this.registerData.email.trim(),
      password: this.registerData.password,
      role: 'Customer',
      phoneNumber: this.registerData.phoneNumber || ''
    };

    this.http.post<any>('http://localhost:5246/api/Auth/register', payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.success('Kayıt başarılı! Giriş yapabilirsiniz.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading = false;
        
        // 400 Bad Request içindeki asıl hata detayını yakala
        let backendMessage = 'Kayıt işlemi başarısız oldu.';
        if (err.error) {
          if (typeof err.error === 'string') {
            backendMessage = err.error;
          } else if (err.error.message) {
            backendMessage = err.error.message;
          } else if (err.error.errors) {
            // ASP.NET ModelState validation hataları
            const errorKeys = Object.keys(err.error.errors);
            if (errorKeys.length > 0) {
              backendMessage = err.error.errors[errorKeys[0]][0];
            }
          }
        }

        this.errorMessage = backendMessage;
        this.toastService.error(backendMessage);
        this.cdr.detectChanges();
      }
    });
  }
}