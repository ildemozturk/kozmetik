export interface Stock {
  id: number;
  quantity: number;
  lastUpdated?: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  oldPrice?: number | null;
  imageUrl: string;
  description: string;
  sku?: string;
  isFavorite?: boolean;
  stock?: Stock | null;
  stockQuantity?: number; // Bunu ekleyin
  status?: 'Stokta Var' | 'Kritik' | 'Tükendi';
}

export interface ProductResponse {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  data: Product[];
}