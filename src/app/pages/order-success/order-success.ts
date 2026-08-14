import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-success.html',
  styleUrl: './order-success.css'
})
export class OrderSuccessComponent implements OnInit {
  orderNumber: string = '';
  orderDate: Date = new Date();
  token: string = '';

  constructor(
    private route: ActivatedRoute,
    private cartService: CartService // CartService enjekte edildi
  ) {}

  ngOnInit(): void {
    // URL'den Iyzico token'ını okuyoruz
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
    });

    // Dinamik Sipariş Numarası Üretimi (Örn: ORD-849201)
    this.orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);

    // Sipariş başarıyla alındığı an sepeti temizliyoruz (Sessiz mod: toast çıkarmadan)
    this.cartService.clearCart(false);
  }
}