export interface Product {
  id: string;
  name: string;
  costPrice: number; // سعر التكلفة
  sellingPrice: number; // سعر البيع
  quantityInStock: number; // المخزون الحالي
  category?: string; // التصنيف
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  customSellingPrice: number; // سعر البيع الفعلي لهذه العملية (قابل للتعديل)
}

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number; // سعر التكلفة وقت البيع (للحفاظ على دقة الحسابات التاريخية)
  sellingPrice: number; // سعر البيع وقت البيع
}

export interface Transaction {
  id: string;
  orderNumber: number; // الرقم التسلسلي اليومي للطلب
  customerName: string; // اسم الزبون
  items: TransactionItem[];
  totalAmount: number; // إجمالي قيمة البيع
  totalCost: number; // إجمالي التكلفة
  totalProfit: number; // صافي الربح
  date: string; // تاريخ العملية
  notes?: string; // ملاحظات إضافية
  isDelivery?: boolean; // هل الطلب دليفري/توصيل؟
  deliveryDriver?: string; // اسم مندوب التوصيل
  deliveryFee?: number; // رسوم التوصيل
  deliveryStatus?: 'pending' | 'shipping' | 'delivered'; // حالة التوصيل
  deliveryAddress?: string; // عنوان وهاتف التوصيل
}

export interface DailyReport {
  date: string;
  sales: number;
  cost: number;
  profit: number;
  count: number;
}

export interface Expense {
  id: string;
  name: string; // اسم المادة المشتراة مثل طحين، زعتر، كرتون فواتير
  amount: number; // التكلفة الكلية المدفوعة
  date: string; // التاريخ والوقت
  notes?: string;
}

export interface HeldOrder {
  id: string;
  customerName: string;
  cart: CartItem[];
  notes?: string;
  heldAt: string;
  isDelivery?: boolean;
  deliveryDriver?: string;
  deliveryFee?: number;
  deliveryAddress?: string;
  isPaid?: boolean; // هل تم دفع الحساب مسبقاً؟
  amountPaid?: number; // المبلغ المدفوع مسبقاً
}

export interface Requirement {
  id: string;
  name: string;
  quantity: number;
  estimatedCost?: number;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  status: 'to_buy' | 'purchased';
  createdAt: string;
}

