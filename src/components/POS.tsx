import React, { useState, useMemo } from 'react';
import { Product, CartItem, Transaction } from '../types';
import { Search, ShoppingCart, User, Plus, Minus, Trash2, AlertCircle, TrendingUp, CheckCircle, Percent, Printer, FileText, X, Clock, History, Calendar } from 'lucide-react';
import { translations } from '../translations';

interface POSProps {
  products: Product[];
  onAddTransaction: (
    customerName: string,
    items: CartItem[],
    notes: string,
    isDelivery?: boolean,
    deliveryDriver?: string,
    deliveryFee?: number,
    deliveryAddress?: string
  ) => Transaction;
  onPrintTransaction: (tx: Transaction, received: number) => void;
  lang: 'ar' | 'en';
  theme: 'light' | 'dark' | 'eye-care';
}

interface HeldOrder {
  id: string;
  customerName: string;
  cart: CartItem[];
  notes: string;
  heldAt: string;
  isDelivery?: boolean;
  deliveryDriver?: string;
  deliveryFee?: number;
  deliveryAddress?: string;
  isPaid?: boolean;
}

export default function POS({ products, onAddTransaction, onPrintTransaction, lang, theme }: POSProps) {
  const t = translations[lang];

  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');

  // Delivery states
  const [isDelivery, setIsDelivery] = useState(false);
  const [deliveryDriver, setDeliveryDriver] = useState(lang === 'ar' ? 'عام' : 'General');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isPaid, setIsPaid] = useState(false);

  // Interactive printable invoice receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastCompletedTx, setLastCompletedTx] = useState<Transaction | null>(null);
  const [lastReceivedAmount, setLastReceivedAmount] = useState<number>(0);

  // Suspended/Held Orders state
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() => {
    const saved = localStorage.getItem('accounting_held_orders');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHeldOrdersModal, setShowHeldOrdersModal] = useState(false);
  const [showHoldSuccessToast, setShowHoldSuccessToast] = useState(false);

  // Check if inside an iframe to show print environment recommendations
  const isInIframe = useMemo(() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }, []);

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery, products]);

  // Add product to cart
  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      // Check stock limit
      if (updated[existingIndex].quantity >= product.quantityInStock) {
        setErrorMessage(
          lang === 'ar'
            ? `الكمية غير كافية. المتوفر لـ "${product.name}" هو ${product.quantityInStock} فقط.`
            : `Insufficient stock. Available for "${product.name}" is ${product.quantityInStock} only.`
        );
        setTimeout(() => setErrorMessage(''), 4000);
        return;
      }
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      if (product.quantityInStock <= 0) {
        setErrorMessage(
          lang === 'ar'
            ? `هذا المنتج (${product.name}) غير متوفر في المخزون حالياً.`
            : `This product (${product.name}) is currently out of stock.`
        );
        setTimeout(() => setErrorMessage(''), 4000);
        return;
      }
      setCart([...cart, { product, quantity: 1, customSellingPrice: product.sellingPrice }]);
    }
    setSearchQuery('');
  };

  // Update quantity of an item in cart
  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    const item = cart[index];
    if (newQty > item.product.quantityInStock) {
      setErrorMessage(
        lang === 'ar'
          ? `لا توجد كمية كافية في المخزون. المتاح لـ "${item.product.name}" هو ${item.product.quantityInStock} فقط.`
          : `Not enough quantity in stock. Available for "${item.product.name}" is ${item.product.quantityInStock} only.`
      );
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }
    const updated = [...cart];
    updated[index].quantity = newQty;
    setCart(updated);
  };

  // Update selling price dynamically for a client
  const updateSellingPrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    const updated = [...cart];
    updated[index].customSellingPrice = newPrice;
    setCart(updated);
  };

  // Remove item from cart
  const removeFromCart = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  // Calculate live calculations for the cart
  const totals = useMemo(() => {
    let totalSale = 0;
    let totalCost = 0;
    
    cart.forEach((item) => {
      totalSale += item.customSellingPrice * item.quantity;
      totalCost += item.product.costPrice * item.quantity;
    });

    const totalProfit = totalSale - totalCost;
    const profitMargin = totalSale > 0 ? (totalProfit / totalSale) * 100 : 0;

    return {
      totalSale,
      totalCost,
      totalProfit,
      profitMargin,
    };
  }, [cart]);

  // Handle Checkout
  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setErrorMessage(
        lang === 'ar'
          ? 'الرجاء إضافة منتج واحد على الأقل للسلة.'
          : 'Please add at least one product to the cart.'
      );
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }

    const clientName = customerName.trim() || (lang === 'ar' ? 'زبون عام' : 'General Customer');
    const fee = isDelivery && deliveryFee ? parseFloat(deliveryFee) : 0;
    const newTx = onAddTransaction(
      clientName,
      cart,
      notes,
      isDelivery,
      isDelivery ? deliveryDriver : undefined,
      isDelivery ? fee : undefined,
      isDelivery ? deliveryAddress : undefined
    );
    
    // Save context for immediate post-sale receipt & print popup
    setLastCompletedTx(newTx);
    setLastReceivedAmount(receivedAmount ? parseFloat(receivedAmount) : 0);
    setShowReceiptModal(true);
    
    // Clear State
    setCart([]);
    setCustomerName('');
    setNotes('');
    setSearchQuery('');
    setErrorMessage('');
    setReceivedAmount('');
    setIsDelivery(false);
    setDeliveryDriver(lang === 'ar' ? 'عام' : 'General');
    setDeliveryFee('');
    setDeliveryAddress('');
    setIsPaid(false);
    
    // Show feedback
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3500);
  };

  // Suspend (Hold) the current cart
  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    
    const clientName = customerName.trim() || (lang === 'ar' ? `طلب معلّق` : `Suspended Order`);
    
    // Add Delivery info to the notes comment so it explicitly says it is delivery there too
    let finalNotes = notes.trim();
    if (isDelivery) {
      const deliverySuffix = lang === 'ar' 
        ? `[🚚 طلب دليفري - المندوب: ${deliveryDriver}${deliveryFee ? ` - التكلفة: ${deliveryFee} ل.س` : ''}${deliveryAddress ? ` - العنوان: ${deliveryAddress}` : ''}]`
        : `[🚚 Delivery Order - Driver: ${deliveryDriver}${deliveryFee ? ` - Fee: ${deliveryFee}` : ''}${deliveryAddress ? ` - Address: ${deliveryAddress}` : ''}]`;
      finalNotes = finalNotes ? `${finalNotes} | ${deliverySuffix}` : deliverySuffix;
    }

    const newHeld: HeldOrder = {
      id: `held-${Date.now()}`,
      customerName: clientName,
      cart: [...cart],
      notes: finalNotes,
      heldAt: new Date().toISOString(),
      isDelivery: isDelivery,
      deliveryDriver: isDelivery ? deliveryDriver : undefined,
      deliveryFee: isDelivery && deliveryFee ? parseFloat(deliveryFee) || 0 : undefined,
      deliveryAddress: isDelivery ? deliveryAddress : undefined,
      isPaid: isPaid,
    };
    
    const updated = [newHeld, ...heldOrders];
    setHeldOrders(updated);
    localStorage.setItem('accounting_held_orders', JSON.stringify(updated));
    
    // Reset state
    setCart([]);
    setCustomerName('');
    setNotes('');
    setReceivedAmount('');
    setErrorMessage('');
    setIsDelivery(false);
    setDeliveryDriver(lang === 'ar' ? 'عام' : 'General');
    setDeliveryFee('');
    setDeliveryAddress('');
    setIsPaid(false);
    
    // Show success toast
    setShowHoldSuccessToast(true);
    setTimeout(() => setShowHoldSuccessToast(false), 3500);
  };

  // Restore a held order back into the active cart
  const handleRetrieveOrder = (held: HeldOrder) => {
    // Merge or append products to existing cart items
    const newCart = [...cart];
    held.cart.forEach((heldItem) => {
      const matchIdx = newCart.findIndex((item) => item.product.id === heldItem.product.id);
      if (matchIdx > -1) {
        newCart[matchIdx].quantity += heldItem.quantity;
      } else {
        newCart.push(heldItem);
      }
    });
    setCart(newCart);
    
    // Restore customer metadata if not generic placeholder
    if (held.customerName !== (lang === 'ar' ? 'طلب معلّق' : 'Suspended Order')) {
      setCustomerName(held.customerName);
    }
    
    // Extract original notes if they contain our auto-generated suffix
    let originalNotes = held.notes || '';
    const suffixRegexAr = /\s*\|\s*\[🚚 طلب دليفري - .*\]$/;
    const suffixRegexEn = /\s*\|\s*\[🚚 Delivery Order - .*\]$/;
    const pureSuffixRegexAr = /^\[🚚 طلب دليفري - .*\]$/;
    const pureSuffixRegexEn = /^\[🚚 Delivery Order - .*\]$/;
    
    originalNotes = originalNotes.replace(suffixRegexAr, '').replace(suffixRegexEn, '');
    if (pureSuffixRegexAr.test(originalNotes) || pureSuffixRegexEn.test(originalNotes)) {
      originalNotes = '';
    }
    setNotes(originalNotes);
    
    // Restore delivery & payment status
    setIsPaid(held.isPaid || false);
    setIsDelivery(held.isDelivery || false);
    if (held.isDelivery) {
      if (held.deliveryDriver) setDeliveryDriver(held.deliveryDriver);
      if (held.deliveryFee !== undefined) setDeliveryFee(held.deliveryFee.toString());
      if (held.deliveryAddress) setDeliveryAddress(held.deliveryAddress);
    } else {
      setDeliveryDriver(lang === 'ar' ? 'عام' : 'General');
      setDeliveryFee('');
      setDeliveryAddress('');
    }

    // Remove from held list
    const updated = heldOrders.filter((o) => o.id !== held.id);
    setHeldOrders(updated);
    localStorage.setItem('accounting_held_orders', JSON.stringify(updated));
    
    setShowHeldOrdersModal(false);
  };

  // Cancel / Delete a held order from the suspended list
  const handleDeleteHeldOrder = (id: string) => {
    const updated = heldOrders.filter((o) => o.id !== id);
    setHeldOrders(updated);
    localStorage.setItem('accounting_held_orders', JSON.stringify(updated));
  };

  // Theme styling configurations
  const cardBgClass = 
    theme === 'dark' 
      ? 'bg-zinc-900 border-zinc-800' 
      : theme === 'eye-care' 
      ? 'bg-[#f7eedc] border-[#dfca9e]' 
      : 'bg-white border-slate-100';

  const textPrimaryClass = 
    theme === 'dark' 
      ? 'text-zinc-100' 
      : theme === 'eye-care' 
      ? 'text-[#433422]' 
      : 'text-slate-800';

  const textSecondaryClass = 
    theme === 'dark' 
      ? 'text-zinc-400' 
      : theme === 'eye-care' 
      ? 'text-[#786144]' 
      : 'text-slate-400';

  const textTertiaryClass = 
    theme === 'dark' 
      ? 'text-zinc-500' 
      : theme === 'eye-care' 
      ? 'text-[#90795e]' 
      : 'text-slate-500';

  const borderClass = 
    theme === 'dark' 
      ? 'border-zinc-800' 
      : theme === 'eye-care' 
      ? 'border-[#dfca9e]' 
      : 'border-slate-100';

  const inputClass = 
    theme === 'dark' 
      ? 'bg-zinc-800 text-zinc-100 border-zinc-700 focus:border-indigo-400 focus:bg-zinc-850' 
      : theme === 'eye-care' 
      ? 'bg-[#faf5ea] text-[#433422] border-[#dfca9e] focus:border-[#433422]' 
      : 'bg-slate-50 text-slate-800 border-slate-200 focus:border-indigo-500 focus:bg-white';

  const wrapperBgClass = 
    theme === 'dark' 
      ? 'bg-zinc-900/40' 
      : theme === 'eye-care' 
      ? 'bg-[#fcf8f2]/30' 
      : 'bg-slate-50/50';

  const totalsBgClass = 
    theme === 'dark' 
      ? 'bg-zinc-950/80' 
      : theme === 'eye-care' 
      ? 'bg-[#f0deb9]' 
      : 'bg-slate-50';

  const feeNumber = isDelivery && deliveryFee ? parseFloat(deliveryFee) || 0 : 0;
  const grandTotal = totals.totalSale + feeNumber;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in relative">
      
      {/* Success Banner notification */}
      {showSuccessToast && (
        <div className="fixed top-6 left-6 z-50 bg-emerald-600 text-white rounded-2xl p-4 shadow-xl flex items-center gap-3 border border-emerald-500 animate-bounce">
          <CheckCircle className="w-6 h-6 text-emerald-100" />
          <div>
            <h4 className="font-bold">{lang === 'ar' ? 'تم تسجيل البيع بنجاح!' : 'Sale Completed!'}</h4>
            <p className="text-xs text-emerald-100 mt-0.5">{t.posToastSuccess}</p>
          </div>
        </div>
      )}

      {/* Hold Order Success Banner notification */}
      {showHoldSuccessToast && (
        <div className="fixed top-6 left-6 z-50 bg-amber-600 text-white rounded-2xl p-4 shadow-xl flex items-center gap-3 border border-amber-500 animate-bounce animate-duration-150">
          <Clock className="w-6 h-6 text-amber-100 animate-pulse" />
          <div>
            <h4 className="font-bold">{lang === 'ar' ? 'تم تعليق الطلب الحالي!' : 'Order Suspended!'}</h4>
            <p className="text-xs text-amber-100 mt-0.5">
              {lang === 'ar' ? 'تم حفظ محتويات السلة وتفريغها للزبون التالي.' : 'Cart contents saved and cleared for the next customer.'}
            </p>
          </div>
        </div>
      )}

      {/* POS Left Column: Search & Quick Inventory Grid (7 Cols) */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Instant Search Card */}
        <div className={`rounded-2xl p-6 border shadow-sm ${cardBgClass}`}>
          <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${textPrimaryClass}`}>
            <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {lang === 'ar' ? 'البحث السريع عن منتج لإضافته' : 'Instant Product Search'}
          </h3>
          
          <div className="relative">
            <input
              type="text"
              placeholder={t.posSearchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none transition ${inputClass} ${
                lang === 'ar' ? 'pr-11 pl-4' : 'pl-11 pr-4'
              }`}
              id="product_search_input"
            />
            <Search className={`w-5 h-5 text-slate-400 absolute top-4 ${lang === 'ar' ? 'right-4' : 'left-4'}`} />
          </div>

          {/* Search Results suggestions */}
          {searchQuery && (
            <div className={`mt-3 border rounded-xl shadow-lg max-h-72 overflow-y-auto divide-y z-10 relative ${
              theme === 'dark' ? 'bg-zinc-900 border-zinc-800 divide-zinc-800' : theme === 'eye-care' ? 'bg-[#f7eedc] border-[#dfca9e] divide-[#dfca9e]' : 'bg-white border-slate-100 divide-slate-50'
            }`}>
              {filteredProducts.length === 0 ? (
                <div className={`p-4 text-center text-sm ${textSecondaryClass}`}>
                  {lang === 'ar' ? `لم يتم العثور على منتجات تطابق "${searchQuery}"` : `No products found matching "${searchQuery}"`}
                </div>
              ) : (
                filteredProducts.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => addToCart(prod)}
                    type="button"
                    className={`w-full p-4 transition flex items-center justify-between group ${
                      lang === 'ar' ? 'text-right' : 'text-left'
                    } ${
                      theme === 'dark' ? 'hover:bg-zinc-800' : theme === 'eye-care' ? 'hover:bg-[#f3e5ca]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <h4 className={`font-bold transition text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 ${textPrimaryClass}`}>{prod.name}</h4>
                      <div className="flex gap-4 mt-1 text-xs text-slate-400 dark:text-zinc-400">
                        <span>{t.posSaleShort}: <strong className={textSecondaryClass}>{prod.sellingPrice} {t.currency}</strong></span>
                      </div>
                    </div>
                    <span className="bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition">
                      <Plus className="w-4 h-4" />
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Quick Click Inventory Grid */}
        <div className={`rounded-2xl p-6 border shadow-sm ${cardBgClass}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-md font-bold ${textPrimaryClass}`}>{lang === 'ar' ? 'قائمة المنتجات السريعة' : 'Quick Products Catalogue'}</h3>
            <span className={`text-xs ${textSecondaryClass}`}>{lang === 'ar' ? 'انقر على المنتج لإضافته فوراً للسلة' : 'Tap on a product to add to cart'}</span>
          </div>

          {products.length === 0 ? (
            <div className={`text-center py-12 ${textSecondaryClass}`}>
              <p className="text-sm">{lang === 'ar' ? 'لم تقم بإضافة أي منتجات في المخزن بعد.' : 'No products stored in inventory yet.'}</p>
              <p className="text-xs mt-1">{lang === 'ar' ? 'يرجى الذهاب لتبويب "إدارة المنتجات" لإضافة عناصر أولاً.' : 'Please go to the Inventory tab to register items first.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {products.map((prod) => {
                const isLow = prod.quantityInStock <= 5;
                const isOut = prod.quantityInStock <= 0;
                
                return (
                  <button
                    key={prod.id}
                    onClick={() => addToCart(prod)}
                    disabled={isOut}
                    type="button"
                    className={`p-3 rounded-xl border transition flex flex-col justify-between h-28 relative overflow-hidden group ${
                      lang === 'ar' ? 'text-right' : 'text-left'
                    } ${
                      isOut 
                        ? theme === 'dark' 
                          ? 'bg-zinc-950 border-zinc-900 opacity-40 cursor-not-allowed' 
                          : theme === 'eye-care' 
                          ? 'bg-[#fcf8f2] border-[#e6d0a7] opacity-40 cursor-not-allowed' 
                          : 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                        : isLow 
                          ? theme === 'dark' 
                            ? 'bg-zinc-900 border-amber-900/80 hover:border-amber-500 shadow-sm' 
                            : theme === 'eye-care' 
                            ? 'bg-[#faf2e4] border-amber-400 hover:border-amber-600 shadow-sm' 
                            : 'bg-white border-amber-100 hover:border-amber-300 shadow-sm'
                          : theme === 'dark' 
                            ? 'bg-zinc-900 border-zinc-800 hover:border-indigo-500 hover:shadow-md' 
                            : theme === 'eye-care' 
                            ? 'bg-[#faf2e4] border-[#ebdcc3] hover:border-amber-950 hover:shadow-md' 
                            : 'bg-white border-slate-100 hover:border-indigo-300 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className={`text-[10px] truncate mb-1 ${textSecondaryClass}`}>{prod.category || t.dashGeneralCat}</div>
                      <h4 className={`font-bold text-xs sm:text-sm truncate line-clamp-2 w-full ${textPrimaryClass}`}>{prod.name}</h4>
                    </div>
                    <div className="flex justify-between items-end w-full gap-1">
                      <div className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">{prod.sellingPrice} <span className="text-[10px]">{t.currency}</span></div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* POS Right Column: Checkout Cart & Customer info (5 Cols) */}
      <div className="lg:col-span-5 space-y-6">
        
        <form onSubmit={handleCheckout} className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col h-full ${cardBgClass}`}>
          
          {/* Header */}
          <div className="bg-slate-800 dark:bg-zinc-950 text-white p-5 flex justify-between items-center border-b dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-md">{t.posActiveCart}</h3>
            </div>
            <div className="flex items-center gap-2">
              {heldOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHeldOrdersModal(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? `المعلّقة (${heldOrders.length})` : `Held (${heldOrders.length})`}</span>
                </button>
              )}
              <span className="bg-slate-700 dark:bg-zinc-800 text-slate-200 text-xs font-bold px-3 py-1 rounded-full">
                {cart.reduce((acc, c) => acc + c.quantity, 0)} {lang === 'ar' ? 'قطع' : 'pcs'}
              </span>
            </div>
          </div>

          {/* Cart Contents */}
          <div className={`p-5 flex-grow overflow-y-auto max-h-[380px] min-h-[220px] divide-y ${
            theme === 'dark' ? 'divide-zinc-800' : theme === 'eye-care' ? 'divide-[#dfca9e]' : 'divide-slate-100'
          }`}>
            {errorMessage && (
              <div className="mb-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl p-3.5 flex items-start gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {cart.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-12 h-full ${textSecondaryClass}`}>
                <ShoppingCart className="w-12 h-12 text-slate-200 dark:text-zinc-800 mb-3" />
                <p className="text-sm font-semibold">{lang === 'ar' ? 'السلة فارغة حالياً' : 'Cart is Empty'}</p>
                <p className="text-xs text-center mt-1 max-w-xs">{t.posCartEmpty}</p>
              </div>
            ) : (
              cart.map((item, idx) => {
                const itemCostTotal = item.product.costPrice * item.quantity;
                const itemSaleTotal = item.customSellingPrice * item.quantity;
                const itemProfit = itemSaleTotal - itemCostTotal;
                
                return (
                  <div key={item.product.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-grow">
                        <h4 className={`font-bold text-sm ${textPrimaryClass}`}>{item.product.name}</h4>
                        
                        {/* Live profitability indicator (Confidential cost for merchant) */}
                        <div className="flex gap-2.5 mt-1 text-[10px] flex-wrap">
                          <span className="bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 px-1.5 py-0.5 rounded">{t.posCostPrice} {item.product.costPrice} {t.currency}</span>
                          <span className={`px-1.5 py-0.5 rounded font-bold ${itemProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'}`}>
                            {t.posExpectedProfit} {itemProfit.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { maximumFractionDigits: 1 })} {t.currency}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className={`flex items-center justify-between mt-3.5 p-2 rounded-xl ${wrapperBgClass}`}>
                      {/* Quantity Adjustment */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, item.quantity - 1)}
                          className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className={`w-8 text-center text-sm font-bold ${textPrimaryClass}`}>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, item.quantity + 1)}
                          className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Selling Price Adjustment */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 dark:text-zinc-400">{lang === 'ar' ? 'سعر الحبة:' : 'Unit Price:'}</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.customSellingPrice}
                          onChange={(e) => updateSellingPrice(idx, parseFloat(e.target.value) || 0)}
                          className={`w-16 text-center text-xs font-bold rounded px-1 py-1 focus:outline-none focus:border-indigo-500 ${
                            theme === 'dark' ? 'bg-zinc-800 text-white border-zinc-700' : theme === 'eye-care' ? 'bg-[#faf5ea] text-[#433422] border-[#dfca9e]' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                          title="تعديل سعر البيع لهذا الزبون"
                        />
                        <span className={`text-xs ${textSecondaryClass}`}>{t.currency}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Customer Metadata Input */}
          <div className={`p-5 border-t space-y-3.5 ${totalsBgClass} ${
            theme === 'dark' ? 'border-zinc-800' : theme === 'eye-care' ? 'border-[#dfca9e]' : 'border-slate-100'
          }`}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-bold mb-1.5 flex items-center gap-1 ${textSecondaryClass}`}>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {t.posCustomerName}
                </label>
                <input
                  type="text"
                  placeholder={t.posCustomerNamePlaceholder}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={`w-full text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-slate-400 ${
                    theme === 'dark' ? 'bg-zinc-800 text-white border-zinc-700' : theme === 'eye-care' ? 'bg-[#faf5ea] text-[#433422] border-[#dfca9e]' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                  id="customer_name_input"
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${textSecondaryClass}`}>
                  {t.posNotes}
                </label>
                <input
                  type="text"
                  placeholder={t.posNotesPlaceholder}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-slate-400 ${
                    theme === 'dark' ? 'bg-zinc-800 text-white border-zinc-700' : theme === 'eye-care' ? 'bg-[#faf5ea] text-[#433422] border-[#dfca9e]' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                  id="invoice_notes_input"
                />
              </div>
            </div>

            {/* Order Type / Delivery Selector */}
            <div className="pt-2 border-t border-dashed border-slate-300/40">
              <label className={`block text-xs font-bold mb-2 ${textSecondaryClass}`}>
                {lang === 'ar' ? '🚚 طريقة استلام الطلب:' : '🚚 Order Delivery Mode:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsDelivery(false)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
                    !isDelivery
                      ? 'bg-indigo-600 text-white shadow-md'
                      : theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400 border border-zinc-750 hover:bg-zinc-750'
                      : theme === 'eye-care'
                      ? 'bg-[#eedcb8] text-[#8e7a63] border border-[#e3d3b4] hover:bg-[#ebdcc3]'
                      : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <span>{lang === 'ar' ? '🛒 في الصالة / تيك أواي' : '🛒 In-Store / Takeaway'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDelivery(true)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
                    isDelivery
                      ? 'bg-indigo-600 text-white shadow-md'
                      : theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400 border border-zinc-750 hover:bg-zinc-750'
                      : theme === 'eye-care'
                      ? 'bg-[#eedcb8] text-[#8e7a63] border border-[#e3d3b4] hover:bg-[#ebdcc3]'
                      : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <span>{lang === 'ar' ? '🛵 توصيل منزلي (دليفري)' : '🛵 Home Delivery'}</span>
                </button>
              </div>
            </div>

            {/* Interactive Delivery Fields */}
            {isDelivery && (
              <div className="space-y-3 pt-3 border-t border-dashed border-slate-300/40 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[11px] font-bold mb-1.5 ${textSecondaryClass}`}>
                      {lang === 'ar' ? '🛵 مندوب التوصيل:' : '🛵 Delivery Representative:'}
                    </label>
                    <input
                      type="text"
                      placeholder={lang === 'ar' ? 'اكتب اسم المندوب...' : 'Type driver name...'}
                      value={deliveryDriver}
                      onChange={(e) => setDeliveryDriver(e.target.value)}
                      className={`w-full text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-slate-400 ${
                        theme === 'dark' ? 'bg-zinc-800 text-white border-zinc-700' : theme === 'eye-care' ? 'bg-[#faf5ea] text-[#433422] border-[#dfca9e]' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-bold mb-1.5 ${textSecondaryClass}`}>
                      {lang === 'ar' ? '💵 تكلفة التوصيل (لـ .س):' : '💵 Delivery Fee:'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder={lang === 'ar' ? 'مثال: 5000' : 'e.g. 5000'}
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      className={`w-full text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-slate-400 ${
                        theme === 'dark' ? 'bg-zinc-800 text-white border-zinc-700' : theme === 'eye-care' ? 'bg-[#faf5ea] text-[#433422] border-[#dfca9e]' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-bold mb-1.5 ${textSecondaryClass}`}>
                    {lang === 'ar' ? '📍 عنوان وهاتف التوصيل المرتجع:' : '📍 Delivery Address & Phone:'}
                  </label>
                  <input
                    type="text"
                    placeholder={lang === 'ar' ? 'مثال: المزة، حارة الورد، هاتف: 093354...' : 'e.g. Damascus, Tel: 093354...'}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className={`w-full text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-slate-400 ${
                      theme === 'dark' ? 'bg-zinc-800 text-white border-zinc-700' : theme === 'eye-care' ? 'bg-[#faf5ea] text-[#433422] border-[#dfca9e]' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Payment Status Selector */}
            <div className="pt-2.5 border-t border-dashed border-slate-300/40">
              <label className={`block text-xs font-bold mb-2 flex items-center gap-1 ${textSecondaryClass}`}>
                <span>💳 {lang === 'ar' ? 'حالة دفع الحساب للطلب الحالي:' : 'Order Payment Status:'}</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaid(false)}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
                    !isPaid
                      ? 'bg-rose-600 text-white shadow-sm hover:bg-rose-700'
                      : theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400 border border-zinc-750 hover:bg-zinc-750 hover:text-zinc-200'
                      : theme === 'eye-care'
                      ? 'bg-[#eedcb8]/40 text-[#8e7a63] border border-[#e3d3b4] hover:bg-[#eedcb8]'
                      : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 hover:text-slate-800'
                  }`}
                >
                  <span>❌ {lang === 'ar' ? 'غير مدفوع / ذمم' : 'Unpaid / Debt'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaid(true)}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
                    isPaid
                      ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                      : theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400 border border-zinc-750 hover:bg-zinc-750 hover:text-zinc-200'
                      : theme === 'eye-care'
                      ? 'bg-[#eedcb8]/40 text-[#8e7a63] border border-[#e3d3b4] hover:bg-[#eedcb8]'
                      : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 hover:text-slate-800'
                  }`}
                >
                  <span>✅ {lang === 'ar' ? 'مدفوع / خالص' : 'Paid'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Checkout Calculations Table */}
          <div className={`p-5 border-t space-y-2.5 ${totalsBgClass} ${
            theme === 'dark' ? 'border-zinc-800' : theme === 'eye-care' ? 'border-[#dfca9e]' : 'border-slate-100'
          }`}>
            <div className={`flex justify-between text-xs ${textSecondaryClass}`}>
              <span>{isDelivery ? (lang === 'ar' ? 'المجموع الفرعي (المنتجات):' : 'Products Subtotal:') : t.posTotalAmount}</span>
              <span className={`font-semibold ${textPrimaryClass}`}>{totals.totalSale.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { maximumFractionDigits: 1 })} {t.currency}</span>
            </div>

            {isDelivery && (
              <div className={`flex justify-between text-xs text-indigo-600 dark:text-indigo-400 font-bold`}>
                <span>{lang === 'ar' ? '🛵 تكلفة التوصيل:' : '🛵 Delivery Fee:'}</span>
                <span>{feeNumber.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { maximumFractionDigits: 1 })} {t.currency}</span>
              </div>
            )}

            {isDelivery && (
              <div className={`flex justify-between text-sm font-black border-t border-dashed pt-1.5 ${textPrimaryClass}`}>
                <span>{lang === 'ar' ? '📊 الإجمالي الكلي للطلب:' : '📊 Grand Total:'}</span>
                <span className="text-indigo-600 dark:text-indigo-400">{grandTotal.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { maximumFractionDigits: 1 })} {t.currency}</span>
              </div>
            )}

            <div className={`flex justify-between text-xs ${textTertiaryClass}`}>
              <span>{t.posTotalCost}</span>
              <span>{totals.totalCost.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { maximumFractionDigits: 1 })} {t.currency}</span>
            </div>
            
            {/* Live Profit & Loss accounting display */}
            <div className={`flex justify-between items-center pt-2 border-t ${
              theme === 'dark' ? 'border-zinc-800' : theme === 'eye-care' ? 'border-[#dfca9e]' : 'border-slate-200/80'
            }`}>
              <span className={`text-sm font-bold ${textPrimaryClass}`}>{t.posNetProfit}</span>
              <div className="text-right">
                <span className={`text-md font-extrabold ${totals.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {totals.totalProfit >= 0 ? '+' : ''}
                  {totals.totalProfit.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { maximumFractionDigits: 1 })} {t.currency}
                </span>
                {totals.totalSale > 0 && (
                  <div className={`text-[9px] font-medium ${textTertiaryClass}`}>{t.posProfitRate} {totals.profitMargin.toFixed(0)}%</div>
                )}
              </div>
            </div>



            {/* Cash Calculator / Change Return */}
            {totals.totalSale > 0 && (
              <div className={`mt-3 pt-3 border-t border-dashed ${
                theme === 'dark' ? 'border-zinc-800' : theme === 'eye-care' ? 'border-[#dfca9e]' : 'border-slate-200'
              } space-y-2`}>
                <div className="flex justify-between items-center gap-2 flex-wrap">
                  <label htmlFor="received_amount_input" className={`text-xs font-bold ${textSecondaryClass}`}>
                    {lang === 'ar' ? 'المبلغ المستلم (من الزبون):' : 'Received Amount (from customer):'}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      id="received_amount_input"
                      placeholder={lang === 'ar' ? 'مثال: 80000' : 'e.g. 80000'}
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      className={`w-32 text-center text-xs font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 border ${
                        theme === 'dark' ? 'bg-zinc-800 text-white border-zinc-700' : theme === 'eye-care' ? 'bg-[#faf5ea] text-[#433422] border-[#dfca9e]' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                    <span className={`text-[10px] mx-1 font-bold ${textSecondaryClass}`}>{t.currency}</span>
                  </div>
                </div>

                {parseFloat(receivedAmount) > 0 && (
                  <div className={`flex justify-between items-center p-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                    parseFloat(receivedAmount) >= grandTotal
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40'
                  }`}>
                    <span>
                      {parseFloat(receivedAmount) >= grandTotal
                        ? (lang === 'ar' ? 'المبلغ المتبقي للإرجاع للزبون:' : 'Change to return to customer:')
                        : (lang === 'ar' ? 'المتبقي لإكمال الحساب (عجز):' : 'Remaining to pay:')}
                    </span>
                    <span className="text-sm font-extrabold">
                      {Math.abs(parseFloat(receivedAmount) - grandTotal).toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { maximumFractionDigits: 1 })} {t.currency}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Checkout button */}
          <div className={`p-5 border-t flex flex-col gap-2.5 ${
            theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : theme === 'eye-care' ? 'bg-[#f7eedc] border-[#dfca9e]' : 'bg-white border-slate-100'
          }`}>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleHoldOrder}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center justify-center gap-1.5 transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                {lang === 'ar' ? 'تعليق وتأجيل الطلب الحالي' : 'Hold / Suspend Current Order'}
              </button>
            )}

            <button
              type="submit"
              disabled={cart.length === 0}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
                cart.length === 0
                  ? 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 dark:shadow-none hover:shadow-lg'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              {t.posCheckoutBtn}
            </button>
          </div>

        </form>

      </div>

      {/* 4. Interactive Post-Checkout Receipt Preview Modal */}
      {showReceiptModal && lastCompletedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div 
            className={`w-full max-w-md overflow-hidden rounded-2xl shadow-2xl flex flex-col max-h-[92vh] border transition-all duration-300 ${
              theme === 'dark' 
                ? 'bg-zinc-900 border-zinc-800 text-zinc-100' 
                : theme === 'eye-care' 
                ? 'bg-[#fcf8f2] border-[#e6d0a7] text-[#433422]' 
                : 'bg-white border-slate-100 text-slate-800'
            }`}
          >
            {/* Modal Header */}
            <div className={`p-5 text-center border-b flex flex-col items-center gap-2 ${
              theme === 'dark' ? 'border-zinc-800 bg-zinc-900/50' : theme === 'eye-care' ? 'border-[#dfca9e] bg-[#f5ebd6]' : 'border-slate-100 bg-slate-50/50'
            }`}>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 rounded-full text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-8 h-8 animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-extrabold">
                  {lang === 'ar' ? 'تمت عملية البيع بنجاح!' : 'Checkout Completed Successfully!'}
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-zinc-400 mt-1">
                  {lang === 'ar' 
                    ? 'تم تسجيل الفاتورة وتعديل المخازن وتجهيز أمر الطباعة.' 
                    : 'Invoice recorded, stock deducted and print commands initialized.'}
                </p>
              </div>
            </div>

            {/* Live Receipt Scrollable Preview */}
            <div className="p-5 flex-1 overflow-y-auto bg-slate-100/50 dark:bg-zinc-950/30">
              <span className="block text-[11px] font-bold mb-2 text-slate-500 dark:text-zinc-400">
                {lang === 'ar' ? 'معاينة الفاتورة الحرارية (80mm):' : 'Thermal Receipt Preview (80mm):'}
              </span>
              
              {/* Paper Slip */}
              <div className="bg-white text-black p-4 rounded-xl shadow-sm border border-slate-200 text-xs text-right leading-relaxed select-none font-sans" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <div className="text-center space-y-1 mb-3">
                  <h4 className="text-sm font-extrabold text-black">
                    {lang === 'ar' ? 'نظام المحاسب الذكي' : 'Smart Accountant'}
                  </h4>
                  <p className="text-[9px] text-zinc-500">
                    {lang === 'ar' ? 'سند مبيعات مبسط' : 'Simplified Sales Receipt'}
                  </p>
                  
                  <div className="bg-zinc-100 p-2 rounded-lg text-center my-2 border border-zinc-200">
                    <span className="text-[10px] font-bold block text-zinc-600">
                      {lang === 'ar' ? 'رقم الطلب اليومي' : 'Daily Order Number'}
                    </span>
                    <span className="text-xl font-black text-black">
                      #{lastCompletedTx.orderNumber}
                    </span>
                  </div>

                  <div className="border-b border-dashed border-zinc-400 my-1"></div>
                </div>

                <div className="space-y-1 text-[9px] text-zinc-700">
                  <div className="flex justify-between">
                    <span>{lang === 'ar' ? 'رقم الفاتورة:' : 'Invoice No:'}</span>
                    <span className="font-mono font-bold text-black">{lastCompletedTx.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{lang === 'ar' ? 'التاريخ والوقت:' : 'Date & Time:'}</span>
                    <span className="font-mono text-black">
                      {new Date(lastCompletedTx.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')} {' '}
                      {new Date(lastCompletedTx.date).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{lang === 'ar' ? 'العميل:' : 'Customer:'}</span>
                    <span className="text-black font-semibold">{lastCompletedTx.customerName}</span>
                  </div>
                  {lastCompletedTx.notes && (
                    <div className="flex justify-between">
                      <span>{lang === 'ar' ? 'ملاحظات:' : 'Notes:'}</span>
                      <span className="text-black">{lastCompletedTx.notes}</span>
                    </div>
                  )}
                  {lastCompletedTx.isDelivery && (
                    <>
                      <div className="flex justify-between text-indigo-700 font-bold border-t border-dashed border-zinc-200 pt-1 mt-1">
                        <span>{lang === 'ar' ? 'نوع الطلب:' : 'Order Type:'}</span>
                        <span>{lang === 'ar' ? '🛵 توصيل منزلي' : '🛵 Delivery'}</span>
                      </div>
                      {lastCompletedTx.deliveryDriver && (
                        <div className="flex justify-between">
                          <span>{lang === 'ar' ? 'اسم مندوب الدليفري:' : 'Driver:'}</span>
                          <span className="text-black font-extrabold">{lastCompletedTx.deliveryDriver}</span>
                        </div>
                      )}
                      {lastCompletedTx.deliveryAddress && (
                        <div className="flex justify-between">
                          <span>{lang === 'ar' ? 'العنوان / الهاتف:' : 'Address / Tel:'}</span>
                          <span className="text-black font-bold break-all max-w-[180px]">{lastCompletedTx.deliveryAddress}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="border-b border-dashed border-zinc-400 my-2"></div>

                {/* Table */}
                <table className="w-full text-[9px] border-collapse text-zinc-800">
                  <thead>
                    <tr className="border-b border-dashed border-zinc-400 text-black font-bold">
                      <th className="pb-1 text-right">{lang === 'ar' ? 'السلعة' : 'Item'}</th>
                      <th className="pb-1 text-center">{lang === 'ar' ? 'الكمية' : 'Qty'}</th>
                      <th className="pb-1 text-left">{lang === 'ar' ? 'السعر' : 'Price'}</th>
                      <th className="pb-1 text-left">{lang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastCompletedTx.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-dashed border-zinc-100">
                        <td className="py-1 text-right text-black font-medium">{item.productName}</td>
                        <td className="py-1 text-center font-mono">{item.quantity}</td>
                        <td className="py-1 text-left font-mono">{item.sellingPrice.toLocaleString()}</td>
                        <td className="py-1 text-left font-mono text-black font-bold">{(item.sellingPrice * item.quantity).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-b border-dashed border-zinc-400 my-2"></div>

                <div className="space-y-0.5 text-[9px]">
                  {lastCompletedTx.isDelivery && (
                    <div className="flex justify-between text-zinc-600">
                      <span>{lang === 'ar' ? 'إجمالي المنتجات:' : 'Products Subtotal:'}</span>
                      <span className="font-mono">{lastCompletedTx.totalAmount.toLocaleString()} {t.currency}</span>
                    </div>
                  )}
                  {lastCompletedTx.isDelivery && lastCompletedTx.deliveryFee !== undefined && (
                    <div className="flex justify-between text-indigo-700 font-semibold">
                      <span>{lang === 'ar' ? 'رسوم التوصيل:' : 'Delivery Fee:'}</span>
                      <span className="font-mono">{(lastCompletedTx.deliveryFee || 0).toLocaleString()} {t.currency}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-black text-xs border-t border-dashed border-zinc-200 pt-1 mt-1">
                    <span>{lang === 'ar' ? 'الإجمالي النهائي للطلب:' : 'Grand Total:'}</span>
                    <span className="font-mono">{(lastCompletedTx.totalAmount + (lastCompletedTx.isDelivery && lastCompletedTx.deliveryFee ? lastCompletedTx.deliveryFee : 0)).toLocaleString()} {t.currency}</span>
                  </div>
                  {lastReceivedAmount > 0 && (
                    <>
                      <div className="flex justify-between text-zinc-600">
                        <span>{lang === 'ar' ? 'المبلغ المستلم:' : 'Amount Paid:'}</span>
                        <span className="font-mono">{lastReceivedAmount.toLocaleString()} {t.currency}</span>
                      </div>
                      <div className="flex justify-between text-zinc-700 font-bold">
                        <span>
                          {lastReceivedAmount >= (lastCompletedTx.totalAmount + (lastCompletedTx.isDelivery && lastCompletedTx.deliveryFee ? lastCompletedTx.deliveryFee : 0))
                            ? (lang === 'ar' ? 'الباقي للمرتجع:' : 'Change Due:')
                            : (lang === 'ar' ? 'المتبقي كعجز:' : 'Remaining:')}
                        </span>
                        <span className="font-mono text-black">
                          {Math.abs(lastReceivedAmount - (lastCompletedTx.totalAmount + (lastCompletedTx.isDelivery && lastCompletedTx.deliveryFee ? lastCompletedTx.deliveryFee : 0))).toLocaleString()} {t.currency}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className={`p-5 border-t flex flex-col gap-3 ${
              theme === 'dark' ? 'border-zinc-800 bg-zinc-900/40' : theme === 'eye-care' ? 'border-[#dfca9e] bg-[#f5ebd6]/40' : 'border-slate-100 bg-slate-50/40'
            }`}>


              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setLastCompletedTx(null);
                  setLastReceivedAmount(0);
                }}
                type="button"
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] transition duration-150 cursor-pointer"
              >
                <span>{lang === 'ar' ? 'بدء عملية بيع جديدة' : 'Start New Sale'}</span>
              </button>

              <button
                onClick={() => onPrintTransaction(lastCompletedTx, lastReceivedAmount)}
                type="button"
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm border transition flex items-center justify-center gap-2 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-zinc-850 hover:bg-zinc-800 border-zinc-750 text-zinc-300'
                    : theme === 'eye-care'
                    ? 'bg-[#faf2e4] hover:bg-[#ebdcc3] border-[#dfca9e] text-[#433422]'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Printer className="w-5 h-5" />
                {lang === 'ar' ? 'طباعة الفاتورة الحرارية' : 'Print Thermal Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Suspended/Held Orders Modal list */}
      {showHeldOrdersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div 
            className={`w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl flex flex-col max-h-[85vh] border transition-all duration-300 ${
              theme === 'dark' 
                ? 'bg-zinc-900 border-zinc-800 text-zinc-100' 
                : theme === 'eye-care' 
                ? 'bg-[#fcf8f2] border-[#e6d0a7] text-[#433422]' 
                : 'bg-white border-slate-100 text-slate-800'
            }`}
          >
            {/* Modal Header */}
            <div className={`p-5 border-b flex justify-between items-center ${
              theme === 'dark' ? 'border-zinc-800 bg-zinc-950/25' : theme === 'eye-care' ? 'border-[#dfca9e] bg-[#f5ebd6]' : 'border-slate-100 bg-slate-50'
            }`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold">
                  {lang === 'ar' ? 'قائمة الطلبات المعلّقة (المؤجلة)' : 'Suspended / Held Orders'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowHeldOrdersModal(false)}
                className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Held Orders */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
              {heldOrders.length === 0 ? (
                <div className={`text-center py-12 flex flex-col items-center justify-center ${textSecondaryClass}`}>
                  <History className="w-12 h-12 text-slate-200 dark:text-zinc-800 mb-3" />
                  <p className="text-sm font-semibold">{lang === 'ar' ? 'لا توجد طلبات معلّقة حالياً' : 'No suspended orders'}</p>
                </div>
              ) : (
                heldOrders.map((held) => {
                  const itemsCount = held.cart.reduce((sum, item) => sum + item.quantity, 0);
                  const totalSum = held.cart.reduce((sum, item) => sum + (item.customSellingPrice * item.quantity), 0);
                  const formattedTime = new Date(held.heldAt).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });
                  const formattedDate = new Date(held.heldAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                    month: 'short',
                    day: 'numeric'
                  });

                  const feeValue = held.isDelivery && held.deliveryFee ? held.deliveryFee : 0;
                  const totalFinal = totalSum + feeValue;

                  return (
                    <div 
                      key={held.id}
                      className={`p-4 rounded-xl border flex flex-col gap-3 transition hover:scale-[1.01] ${
                        theme === 'dark' 
                          ? 'bg-zinc-850/60 border-zinc-800 hover:bg-zinc-800' 
                          : theme === 'eye-care' 
                          ? 'bg-[#faf2e4] border-[#dfca9e] hover:bg-[#ebdcc3]/50' 
                          : 'bg-slate-50 border-slate-200/60 hover:bg-slate-100/50'
                      }`}
                    >
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <h4 className={`font-bold text-sm ${textPrimaryClass}`}>{held.customerName}</h4>
                          <span className={`text-[10px] mt-1 block ${textSecondaryClass}`}>
                            <Clock className="w-3 h-3 inline-block mx-0.5" />
                            {formattedDate} - {formattedTime}
                          </span>
                          
                          {/* Status badges row */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {held.isDelivery ? (
                              <span className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                🛵 {lang === 'ar' ? 'دليفري' : 'Delivery'}
                              </span>
                            ) : (
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                theme === 'dark' ? 'bg-zinc-800 text-zinc-400 border-zinc-750' : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                🏠 {lang === 'ar' ? 'في الصالة' : 'In-Store'}
                              </span>
                            )}
                            
                            {held.isPaid ? (
                              <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                💵 {lang === 'ar' ? 'خالص (مدفوع)' : 'Paid'}
                              </span>
                            ) : (
                              <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                💳 {lang === 'ar' ? 'غير مدفوع' : 'Unpaid'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={lang === 'ar' ? 'text-left' : 'text-right'}>
                          <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400 block">
                            {totalFinal.toLocaleString()} {t.currency}
                          </span>
                          <span className={`text-[10px] block mt-0.5 ${textSecondaryClass}`}>
                            {itemsCount} {lang === 'ar' ? 'قطع' : 'pcs'}
                            {held.isDelivery && held.deliveryFee ? (lang === 'ar' ? ` (+${held.deliveryFee} توصيل)` : ` (+${held.deliveryFee} delivery)`) : ''}
                          </span>
                        </div>
                      </div>

                      {/* Display items list inside */}
                      <div className={`p-2.5 rounded-lg text-xs space-y-1 ${
                        theme === 'dark' ? 'bg-zinc-900/60' : theme === 'eye-care' ? 'bg-[#faf5ea]/50' : 'bg-white'
                      }`}>
                        {held.cart.map((c, index) => (
                          <div key={index} className="flex justify-between items-center text-[11px]">
                            <span className={textPrimaryClass}>{c.product.name}</span>
                            <span className="font-mono text-slate-400">×{c.quantity}</span>
                          </div>
                        ))}
                        {held.notes && (
                          <div className="pt-1.5 border-t border-dashed border-slate-200 dark:border-zinc-800 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            {lang === 'ar' ? 'ملاحظة: ' : 'Note: '}{held.notes}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteHeldOrder(held.id)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                        >
                          {lang === 'ar' ? 'إلغاء وحذف' : 'Delete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRetrieveOrder(held)}
                          className="px-4 py-1.5 rounded-lg text-[11px] font-extrabold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition hover:scale-[1.02] cursor-pointer"
                        >
                          {lang === 'ar' ? 'استعادة الطلب' : 'Retrieve Order'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
