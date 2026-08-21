import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { ProductsComponent } from './pages/products/products';
import { About } from './pages/about/about';
import { Contact } from './pages/contact/contact';
import { Faq } from './pages/faq/faq';
import { CartComponent } from './pages/cart/cart';
import { CheckoutComponent } from './pages/checkout/checkout';
import { OrderSuccessComponent } from './pages/order-success/order-success';
import { ProductDetailComponent } from './pages/product-detail/product-detail';

// Auth & Admin
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { AdminDashboard } from './pages/admin/admin-dashboard/admin-dashboard';
import { AdminProducts } from './pages/admin/admin-products/admin-products';

// Guards
import { authGuard } from './guards/auth-guard';
import { adminGuard } from './guards/admin-guard';
import { noAdminOnStoreGuard } from './guards/admin-redirect-guard';

export const routes: Routes = [
  // Mağaza Rotaları
  { path: '', component: HomeComponent, canActivate: [noAdminOnStoreGuard] },
  { path: 'urunler', component: ProductsComponent, canActivate: [noAdminOnStoreGuard] },
  { path: 'products', redirectTo: 'urunler', pathMatch: 'full' },
  { path: 'urunler/:id', component: ProductDetailComponent, canActivate: [noAdminOnStoreGuard] },
  { path: 'products/:id', component: ProductDetailComponent, canActivate: [noAdminOnStoreGuard] },
  { path: 'hakkimizda', component: About, canActivate: [noAdminOnStoreGuard] },
  { path: 'sss', component: Faq, canActivate: [noAdminOnStoreGuard] },
  { path: 'iletisim', component: Contact, canActivate: [noAdminOnStoreGuard] },
  { path: 'cart', component: CartComponent, canActivate: [noAdminOnStoreGuard] },
  { path: 'sepet', redirectTo: 'cart', pathMatch: 'full' },
  { path: 'odeme', component: CheckoutComponent, canActivate: [authGuard, noAdminOnStoreGuard] },
  { path: 'checkout', redirectTo: 'odeme', pathMatch: 'full' },
  { path: 'siparis-basarili', component: OrderSuccessComponent, canActivate: [noAdminOnStoreGuard] },

  // Auth Rotaları
  { path: 'login', component: Login },
  { path: 'giris', redirectTo: 'login', pathMatch: 'full' },
  { path: 'register', component: Register },
  { path: 'kayit', redirectTo: 'register', pathMatch: 'full' },

  // Admin Paneli Rotaları
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboard },
      { path: 'products', component: AdminProducts },
      { path: 'stok', redirectTo: 'products', pathMatch: 'full' }
    ]
  },

  // Tanımsız Rotalar
  { path: '**', redirectTo: '' }
];