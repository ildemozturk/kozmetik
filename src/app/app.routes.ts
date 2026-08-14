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

export const routes: Routes = [
  // Ana Sayfa
  { path: '', component: HomeComponent },
  
  // Ürünler
  { path: 'urunler', component: ProductsComponent },
  { path: 'products', redirectTo: 'urunler', pathMatch: 'full' },
  
  // Ürün Detay (Hem /urunler/1 hem /products/1 çalışır)
  { path: 'urunler/:id', component: ProductDetailComponent },
  { path: 'products/:id', component: ProductDetailComponent },
  
  // Kurumsal Sayfalar
  { path: 'hakkimizda', component: About },
  { path: 'sss', component: Faq },
  { path: 'iletisim', component: Contact },
  
  // Sepet ve Ödeme
  { path: 'cart', component: CartComponent },
  { path: 'sepet', redirectTo: 'cart', pathMatch: 'full' },
  { path: 'odeme', component: CheckoutComponent },
  { path: 'checkout', redirectTo: 'odeme', pathMatch: 'full' },
  
  // Sipariş Başarılı
  { path: 'siparis-basarili', component: OrderSuccessComponent },
  
  // Tanımsız Rotalar
  { path: '**', redirectTo: '' }
];