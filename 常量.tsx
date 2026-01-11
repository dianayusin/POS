
import { Product, Category } from './types.ts';

export const INITIAL_PRODUCTS: Product[] = [
  { 
    id: 'b1', 
    name: '美式咖啡', 
    price: 65, 
    category: Category.BEVERAGE, 
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=200', 
    color: 'bg-amber-100' 
  },
  { 
    id: 'b2', 
    name: '拿鐵咖啡', 
    price: 95, 
    category: Category.BEVERAGE, 
    image: 'https://images.unsplash.com/photo-1541167760496-1628856ab752?auto=format&fit=crop&q=80&w=200', 
    color: 'bg-amber-100' 
  },
  { id: 'blank1', name: '', price: 0, category: Category.BEVERAGE, image: '', color: 'bg-slate-50' },
  { id: 'blank2', name: '', price: 0, category: Category.BEVERAGE, image: '', color: 'bg-slate-50' },
  { id: 'blank3', name: '', price: 0, category: Category.BEVERAGE, image: '', color: 'bg-slate-50' },
  { id: 'blank4', name: '', price: 0, category: Category.BEVERAGE, image: '', color: 'bg-slate-50' },
  { id: 'blank5', name: '', price: 0, category: Category.BEVERAGE, image: '', color: 'bg-slate-50' },
  { id: 'blank6', name: '', price: 0, category: Category.BEVERAGE, image: '', color: 'bg-slate-50' },
  { id: 'blank7', name: '', price: 0, category: Category.BEVERAGE, image: '', color: 'bg-slate-50' },
  { id: 'blank8', name: '', price: 0, category: Category.BEVERAGE, image: '', color: 'bg-slate-50' },
];
