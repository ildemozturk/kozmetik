import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Yalnızca kendi backend API'mize giden isteklere token ekle (Dış API'leri hariç tut)
  const isApiUrl = req.url.startsWith('http://localhost:5246') || req.url.startsWith('/api');

  if (token && isApiUrl) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};