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

// Yeni Sayfalar (Component export isimleri: Login, Register, AdminDashboard, AdminProducts)
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { AdminDashboard } from './pages/admin/admin-dashboard/admin-dashboard';
import { AdminProducts } from './pages/admin/admin-products/admin-products';
import { authGuard } from './guards/auth-guard';
import { adminGuard } from './guards/admin-guard';

export const routes: Routes = [
  // Ana Sayfa
  { path: '', component: HomeComponent },

  // Kimlik Doğrulama
  { path: 'login', component: Login },
  { path: 'giris', redirectTo: 'login', pathMatch: 'full' },
  { path: 'register', component: Register },
  { path: 'kayit', redirectTo: 'register', pathMatch: 'full' },

  // Ürünler & Detay
  { path: 'urunler', component: ProductsComponent },
  { path: 'products', redirectTo: 'urunler', pathMatch: 'full' },
  { path: 'urunler/:id', component: ProductDetailComponent },
  { path: 'products/:id', component: ProductDetailComponent },

  // Kurumsal Sayfalar
  { path: 'hakkimizda', component: About },
  { path: 'sss', component: Faq },
  { path: 'iletisim', component: Contact },

  // Sepet & Ödeme
  { path: 'cart', component: CartComponent },
  { path: 'sepet', redirectTo: 'cart', pathMatch: 'full' },
  { path: 'odeme', component: CheckoutComponent },
  { path: 'checkout', redirectTo: 'odeme', pathMatch: 'full' },

  // Sipariş Başarılı
  { path: 'siparis-basarili', component: OrderSuccessComponent },

  // Admin Paneli
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboard },
      { path: 'products', component: AdminProducts }
    ]
  },

  // Tanımsız Rotalar
  { path: '**', redirectTo: '' }
];