# 🌸 Lumière Cosmetics — Full-Stack E-Commerce & Management Platform

[![Angular](https://img.shields.io/badge/Angular-17+-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![.NET Core](https://img.shields.io/badge/.NET%20Core-8.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![Entity Framework Core](https://img.shields.io/badge/EF%20Core-ORM-blue?style=for-the-badge&logo=nuget&logoColor=white)](https://learn.microsoft.com/ef/core/)
[![SQL Server](https://img.shields.io/badge/SQL%20Server-Database-CC292B?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)](https://www.microsoft.com/sql-server)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![iyzico](https://img.shields.io/badge/iyzico-Payment%20Gateway-2C3E50?style=for-the-badge)](https://iyzico.com/)

Lumière Cosmetics; modern web teknolojileri, temiz mimari prensipleri ve kurumsal e-ticaret akışları göz önünde bulundurularak geliştirilmiş uçtan uca full-stack bir e-ticaret ve yönetim platformudur. 

Kullanıcı dostu vitrin arayüzünün yanı sıra stok takibi, sipariş operasyonları, dinamik indirim/kupon yönetimi ve satış grafiklerini içeren gelişmiş bir **Admin Yönetim Konsolu** barındırır.

---

## 🌟 Temel Özellikler

### 🛍️ Vitrin (Storefront) Deneyimi
- **Reaktif Sepet & Favori Yönetimi:** Modern **Angular Signals** altyapısıyla UI seviyesinde anlık reaktivite. Çoklu kullanıcı çakışmasını engellemek amacıyla e-posta bazlı dinamik `localStorage` anahtarları (`cart_user@mail.com`).
- **Dinamik Katalog & Filtreleme:** Kategori, arama ve fiyat sıralamaları **URL Query Strings** ile senkronize çalışır. Backend katmanında **LINQ (Deferred Execution)** ile optimize SQL sorgularına dönüştürülür.
- **Akıllı Vitrin Modülleri:** Gerçek veritabanı sipariş verilerine dayalı `GroupBy` ve `Sum` algoritmalarıyla çalışan dinamik **"Çok Satanlar"** alanı ve otomatik indirim tespit sistemi (`OldPrice > Price`).
- **iyzico Checkout Entegrasyonu:** Sandbox ödeme formu entegrasyonu. Sepet seviyesindeki indirim ve kargo bedellerinden kaynaklanabilecek kuruş yuvarlama farklarını (`fractional mismatch`) dengeleyen dinamik sepet paylaştırma algoritması.
- **EmailJS Stok Bildirimi:** Stoğu tükenen ürünler için kullanıcıların "Gelince Haber Ver" talebi bırakabilmesi ve stok yenilendiğinde asenkron bildirim gönderimi.

### 📊 Yönetim Paneli (Admin Console)
- **Katmanlı Güvenlik (Chained Guards):** Kimlik doğrulama (`AuthGuard`) ve rol bazlı yetkilendirme (`AdminGuard`) ile çift aşamalı rota koruması.
- **Analitik Dashboard:** **Chart.js** entegrasyonuyla satış trendleri, toplam ciro, sipariş hacmi ve kritik stok uyarıları (`Stock < 10`).
- **Kapsamlı CRUD Yönetimi:** Ürünler, stoklar, sipariş durum güncellemeleri ve müşteri profillerinin uçtan uca yönetimi.
- **Kupon & Kampanya Motoru:** Sepet tutarına veya kategorilere göre geçerli indirim kuponları tanımlama, kullanım limiti dolduğunda otomatik pasife alma mekanizması.

---

## 🛠️ Teknoloji Yığını

| Alan | Teknolojiler |
| :--- | :--- |
| **Frontend** | Angular 17+, TypeScript, Tailwind CSS, SCSS, RxJS, Angular Signals, Reactive Forms |
| **Backend** | ASP.NET Core Web API (.NET 8), Entity Framework Core, LINQ |
| **Veritabanı** | Microsoft SQL Server (MSSQL) |
| **Kimlik & Güvenlik** | JWT (JSON Web Tokens), Salt + PBKDF2/SHA-256 Hashing, Angular Route Guards |
| **Harici Servisler** | iyzico Payment API (Sandbox), EmailJS SDK, Chart.js |

---

## 🔒 Güvenlik & Mimari Yaklaşım

- **Ayrık Katman Mimarisi:** İstemci tarafı (Angular) doğrudan veritabanına bağlanmaz; tüm işlemler RESTful API arkasında iş kuralları (Business Logic) ve yetki denetimlerinden geçirilerek yürütülür.
- **Salt + Hash:** Kullanıcı parolaları plain-text olarak tutulmaz. Kayıt anında üretilen benzersiz `salt` değeriyle hash'lenir ve doğrulanır.
- **Durumsuz (Stateless) Oturum:** Oturum yönetimi için JWT standartları kullanılmıştır. Token içerisinde parola gibi hassas veriler barındırılmaz; kimlik ve rol iddiaları (claims) taşınır.
- **Stok Bütünlüğü:** Stok düşüm işlemi, ödeme adımı başladığında değil; iyzico callback doğrulaması başarılı (`SUCCESS`) olduğunda transaction güvencesiyle veritabanına yansıtılır.

---

## 🚀 Kurulum & Çalıştırma

### 1. Gereksinimler
- Node.js (v18+) & Angular CLI (`npm i -g @angular/cli`)
- .NET 8 SDK
- Microsoft SQL Server & SSMS

### 2. Backend Kurulumu
```bash
# Backend dizinine gidin
cd CosmeticApi

# appsettings.json içerisindeki DefaultConnection connection string'ini kendi SQL Server adresinize göre güncelleyin.

# Migration'ları veritabanına uygulayın
dotnet ef database update

# Projeyi ayağa kaldırın
dotnet run
