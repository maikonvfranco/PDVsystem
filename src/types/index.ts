import { Timestamp } from 'firebase/firestore';

export interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  category: string;
  unit: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  isWeightedPrice?: boolean;
  cartItemId: string;
}

export interface SaleItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
}

export interface SaleRecord {
  id?: string;
  total: number;
  paymentMethod: string;
  items: SaleItem[];
  createdAt: Timestamp;
  dateFormatted: string;
  timeFormatted: string;
  yearMonth: string;
  status: 'completed' | 'canceled';
}