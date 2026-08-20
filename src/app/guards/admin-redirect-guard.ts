import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const noAdminOnStoreGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // AuthService'deki currentUser veya localStorage üzerinden kontrol
  let user: any = null;
  const userStr = localStorage.getItem('lumiere_user') || localStorage.getItem('user');
  
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch {
      user = null;
    }
  } else if ((authService as any).currentUser) {
    const cu = (authService as any).currentUser;
    user = typeof cu === 'function' ? cu() : cu;
  }

  // Kullanıcı admin ise mağaza sayfalarını engelleyip dashboard'a yönlendir
  if (user && (user.role === 'Admin' || user.isAdmin === true)) {
    router.navigate(['/admin/dashboard'], { replaceUrl: true });
    return false;
  }

  return true;
};