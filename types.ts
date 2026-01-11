
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  color: string;
}

export interface OrderItem extends Product {
  quantity: number;
}

export interface Transaction {
  id: string;
  timestamp: number;
  items: OrderItem[];
  total: number;
  paymentMethod: 'cash' | 'leke' | 'mobile';
  receivedAmount?: number;
  changeAmount?: number;
}

export enum Category {
  BEVERAGE = '飲品',
  FOOD = '主食',
  DESSERT = '甜點',
  SNACK = '點心'
}
