import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.html',
  styleUrls: ['./about.css']
})
export class About {
  // Varsayılan olarak ilk resim gelir
  activeImageIndex: number = 0;

  
  galleryImages = [
    {
      url: 'https://lorganic.com.au/cdn/shop/articles/discover-what-is-in-100-natural-makeup-safe-clean-and-skin-loving-ingredients-1792349.jpg?v=1754985962&width=1100',
      title: 'Doğal İçerik',
      subtitle: '%100 Saf & Bitkisel'
    },
    {
      url: 'https://plus.unsplash.com/premium_photo-1702598537492-7c7d5dc93d8a?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8ZGVybWF0b2xvamlrJTIwdGVzdHxlbnwwfHwwfHx8MA%3D%3D',
      title: 'Dermatolojik Test',
      subtitle: 'Klinik Onaylı Formüller'
    },
    {
      url: 'https://plus.unsplash.com/premium_photo-1681987448179-4a93b7975018?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Z2VyaSUyMGQlQzMlQjZuJUMzJUJDJUM1JTlGdCVDMyVCQ3IlQzMlQkNsZWJpbGlyfGVufDB8fDB8fHww',
      title: 'Sürdürülebilirlik',
      subtitle: 'Geri Dönüştürülebilir Ambalaj'
    },
    {
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVYKnfilf-4JQDkj1jBoSgoKzFP1dw3wOH4gP2B5x-iw&s=10',
      title: 'Cruelty-Free',
      subtitle: 'Hayvanlar Üzerinde Test Edilmez'
    }
  ];

  // Tıklanan resmi aktif yapan metod
  setActive(index: number): void {
    this.activeImageIndex = index;
  }
}