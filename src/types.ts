export interface Product {
  id: string;
  name: string;
  type: string; // Моносорт, Бленд, Оборудование, Подписка, Сопутствующие товары
  description: string;
  roast: string; // Светлая, Средняя, Темная, и т.д.
  acidity: number; // 1-5
  sweetness: number; // 1-5
  body: number; // Плотность 1-5
  flavorNotes: string[]; // Ноты вкуса
  methods: string[]; // Способы заваривания
  price: number;
  image: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedProducts?: Product[];
}

export interface LogEntry {
  timestamp: string;
  query: string;
  foundInTable: 'Да' | 'Нет';
  usedAI: string;
  answer: string;
}

export interface CartItem {
  id: string; // unique cart item id (e.g. productId + grind + weight)
  product: Product;
  quantity: number;
  grind: string; // Помол
  weight: string; // Вес: 250г, 1кг и т.д.
  frequency?: string; // Для подписки: Раз в 2 недели, Раз в 3 недели, Раз в 4 недели
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'paid';
  timestamp: string;
  deliveryMethod: string;
  paymentMethod: string;
}
