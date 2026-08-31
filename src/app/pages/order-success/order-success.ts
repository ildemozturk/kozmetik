import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-success.html',
  styleUrls: ['./order-success.css']
})
export class OrderSuccessComponent implements OnInit {
  token: string = '';
  orderNumber: string = '';
  orderDate: Date = new Date();
  totalAmount: number = 0;

  constructor(
    private route: ActivatedRoute,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      
      // Sipariş tutarını al ve sepeti temizle
      this.totalAmount = this.cartService.grandTotal();
      this.cartService.clearCart(false);
      
      // Geçici kupon bilgilerini temizle
      localStorage.removeItem('lumiere_applied_coupon');
      localStorage.removeItem('lumiere_pending_coupon');
      
      // NOT: Siparişler artık sunucuda Iyzico callback ile doğrudan SQL Orders tablosuna yazılmaktadır.
      // Sahte/tekrar eden localStorage.lumiere_orders kaydı kaldırılmıştır.
    });
  }
}