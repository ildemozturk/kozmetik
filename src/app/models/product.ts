export interface Stock {
  id: number;
  quantity: number;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  oldPrice?: number | null;
  imageUrl: string;
  description: string;
  isFavorite?: boolean;
  stock?: Stock | null; // Obje olarak tanımladık
}

export interface ProductResponse {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  data: Product[];
}