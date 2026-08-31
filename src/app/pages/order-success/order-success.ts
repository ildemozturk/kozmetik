import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
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
      this.orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);

      // Backend callback'den gelen gerçek ödenen tutarı kullan.
      if (params['amount']) {
        const parsedAmount = Number(params['amount']);
        if (Number.isFinite(parsedAmount)) {
          this.totalAmount = parsedAmount;
        }
      }

      this.saveOrderAndClearCart();
    });
  }

  private saveOrderAndClearCart(): void {
    const currentCartItems = this.cartService.cartItems();

    if (!currentCartItems || currentCartItems.length === 0) {
      // Sepet daha önce temizlenmişse sadece kupon geçici kaydını temizle.
      localStorage.removeItem('lumiere_pending_coupon');
      localStorage.removeItem('lumiere_applied_coupon');
      return;
    }

    // Eğer backend'den amount gelmediyse mevcut sepet tutarını kullan.
    if (this.totalAmount <= 0) {
      this.totalAmount = this.cartService.grandTotal();
    }

    const newOrder = {
      id: this.orderNumber,
      date: new Date().toISOString(),
      status: 'Hazırlanıyor',
      totalAmount: this.totalAmount,
      items: currentCartItems.map(item => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        imageUrl: item.product.imageUrl
      }))
    };

    const existingOrders = JSON.parse(localStorage.getItem('lumiere_orders') || '[]');
    existingOrders.unshift(newOrder);
    localStorage.setItem('lumiere_orders', JSON.stringify(existingOrders));

    // Başarılı ödeme sonrası sepet temizle
    this.cartService.clearCart(false);

    // Ödeme sürecinde tuttuğumuz kupon bilgilerini temizle.
    localStorage.removeItem('lumiere_pending_coupon');
    localStorage.removeItem('lumiere_applied_coupon');
  }
}