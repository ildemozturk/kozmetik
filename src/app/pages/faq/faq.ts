import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faq.html',
  styleUrls: ['./faq.css']
})
export class Faq {
  // Hangi sorunun açık olduğunu tutan değişken (Varsayılan olarak ilk soru açık: 0)
  openIndex: number | null = 0;

  // Akordiyon kartlarını açıp kapatan metod
  toggleFaq(index: number): void {
    if (this.openIndex === index) {
      this.openIndex = null; // Zaten açıksa kapat
    } else {
      this.openIndex = index; // Tıklananı aç
    }
  }
}