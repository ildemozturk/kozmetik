import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar';
import { FooterComponent } from './components/footer/footer';
import { ToastComponent } from './components/toasts/toast'; // Eğer toast.component.ts ise
import { CartService } from './services/cart.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    NavbarComponent, 
    FooterComponent, 
    ToastComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  constructor(
    public router: Router,
    public cartService: CartService
  ) {}

  get isAdminRoute(): boolean {
    return this.router.url.startsWith('/admin');
  }
}