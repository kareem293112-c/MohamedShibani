import React, { useState, useMemo } from 'react';
import { Transaction, TransactionItem, Product } from '../types';
import { Calendar, User, Search, Trash2, ChevronDown, ChevronUp, FileText, CheckCircle, TrendingUp, DollarSign, PackageOpen, Undo2, Printer, Edit2, X } from 'lucide-react';
import { translations } from '../translations';

interface TransactionHistoryProps {
  transactions: Transaction[];
  products: Product[];
  onDeleteTransaction: (id: string) => void;
  onPrintTransaction: (tx: Transaction, received: number) => void;
  onEditTransaction?: (originalTx: Transaction, updatedTx: Transaction) => void;
  lang: 'ar' | 'en';
  theme: 'light' | 'dark' | 'eye-care';
}

export default function TransactionHistory({ transactions, products, onDeleteTransaction, onPrintTransaction, onEditTransaction, lang, theme }: TransactionHistoryProps) {
  const t = translations[lang];

  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  // States for Editing Transaction
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<TransactionItem[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  const handleStartEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditCustomerName(tx.customerName);
    setEditNotes(tx.notes || '');
    setEditItems(tx.items.map(item => ({ ...item })));
    setProductSearchQuery('');
    setIsProductDropdownOpen(false);
  };

  const matchedProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return [];
    const query = productSearchQuery.toLowerCase();
    return products.filter((p) => 
      p.name.toLowerCase().includes(query) ||
      (p.category && p.category.toLowerCase().includes(query))
    );
  }, [products, productSearchQuery]);

  // Expanded transactions map to display detailed rows
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(lang === 'ar' ? 'الكل' : 'All'); // 'الكل', 'اليوم', 'أمس', 'آخر_7_أيام', 'هذا_الشهر', 'مخصص'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Toggle expand transaction details row
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Check if a date falls within filtered period
  const filterByDateRange = (txDateStr: string) => {
    const txDate = new Date(txDateStr);
    const today = new Date();
    
    // Set hours to 0 to compare days properly
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    
    const startOf7DaysAgo = new Date(startOfToday);
    startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 7);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Normalize comparison based on mapped values
    const filterType = dateFilter;

    if (filterType === 'اليوم' || filterType === 'Today') {
      return txDate >= startOfToday;
    } else if (filterType === 'أمس' || filterType === 'Yesterday') {
      return txDate >= startOfYesterday && txDate < startOfToday;
    } else if (filterType === 'آخر_7_أيام' || filterType === 'Last 7 Days') {
      return txDate >= startOf7DaysAgo;
    } else if (filterType === 'هذا_الشهر' || filterType === 'This Month') {
      return txDate >= startOfMonth;
    } else if (filterType === 'مخصص' || filterType === 'Custom Range') {
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999); // include entire end day
        return txDate >= start && txDate <= end;
      }
      return true;
    } else {
      return true;
    }
  };

  // Filter Transactions based on search query & selected dates
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch =
        tx.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.notes && tx.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        tx.items.some((item) => item.productName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchDate = filterByDateRange(tx.date);

      return matchSearch && matchDate;
    });
  }, [transactions, searchQuery, dateFilter, customStartDate, customEndDate]);

  // Aggregate stats for the filtered period (for custom reports)
  const filteredTotals = useMemo(() => {
    let sales = 0;
    let cost = 0;
    let profit = 0;
    
    filteredTransactions.forEach((tx) => {
      sales += tx.totalAmount;
      cost += tx.totalCost;
      profit += tx.totalProfit;
    });

    const margin = sales > 0 ? (profit / sales) * 100 : 0;

    return {
      sales,
      cost,
      profit,
      margin,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Theme styling helpers
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

  const summaryBgClass = 
    theme === 'dark' 
      ? 'bg-zinc-950 border-zinc-850 text-white' 
      : theme === 'eye-care' 
      ? 'bg-[#ebdcc3] border-[#dfca9e] text-[#433422]' 
      : 'bg-slate-800 text-white';

  const drawerBgClass = 
    theme === 'dark' 
      ? 'bg-zinc-950/60 border-zinc-800/80' 
      : theme === 'eye-care' 
      ? 'bg-[#faf2e4] border-[#dfca9e]' 
      : 'bg-slate-50 border-slate-100/80';

  const dividerClass = 
    theme === 'dark' 
      ? 'divide-zinc-800' 
      : theme === 'eye-care' 
      ? 'divide-[#dfca9e]' 
      : 'divide-slate-100';

  const localeCode = lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US';

  // Filters mapping array for tabs
  const filterTabs = [
    { key: lang === 'ar' ? 'الكل' : 'All', label: lang === 'ar' ? 'الكل' : 'All' },
    { key: lang === 'ar' ? 'اليوم' : 'Today', label: lang === 'ar' ? 'اليوم' : 'Today' },
    { key: lang === 'ar' ? 'أمس' : 'Yesterday', label: lang === 'ar' ? 'أمس' : 'Yesterday' },
    { key: lang === 'ar' ? 'آخر_7_أيام' : 'Last 7 Days', label: lang === 'ar' ? 'آخر 7 أيام' : 'Last 7 Days' },
    { key: lang === 'ar' ? 'هذا_الشهر' : 'This Month', label: lang === 'ar' ? 'هذا الشهر' : 'This Month' },
    { key: lang === 'ar' ? 'مخصص' : 'Custom Range', label: lang === 'ar' ? 'فترة مخصصة' : 'Custom Range' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. Filter Control Panel */}
      <div className={`rounded-2xl p-6 border shadow-sm space-y-4 ${cardBgClass}`}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className={`text-lg font-bold ${textPrimaryClass}`}>{t.txTitle}</h3>
            <p className={`text-xs ${textSecondaryClass}`}>{t.txDesc}</p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs ${textSecondaryClass}`}>{lang === 'ar' ? 'تصفية الفترة:' : 'Period:'}</span>
            <div className={`inline-flex rounded-lg p-1 ${theme === 'dark' ? 'bg-zinc-950' : theme === 'eye-care' ? 'bg-[#ebdcc3]' : 'bg-slate-100'}`}>
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setDateFilter(tab.key)}
                  type="button"
                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-md transition cursor-pointer ${
                    dateFilter === tab.key
                      ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500'
                      : `${theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-800' : theme === 'eye-care' ? 'text-[#786144] hover:bg-[#f3e5ca]' : 'text-slate-600 hover:bg-slate-200/50'}`
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Date Inputs if 'مخصص' is active */}
        {(dateFilter === 'مخصص' || dateFilter === 'Custom Range') && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border max-w-lg ${
            theme === 'dark' ? 'bg-zinc-950 border-zinc-850' : theme === 'eye-care' ? 'bg-[#ebdcc3] border-[#dfca9e]' : 'bg-slate-50 border-slate-100'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${textSecondaryClass}`}>{lang === 'ar' ? 'من:' : 'From:'}</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className={`border rounded-lg p-1.5 text-xs focus:outline-none ${
                  theme === 'dark' ? 'bg-zinc-800 text-white border-zinc-750' : theme === 'eye-care' ? 'bg-[#faf5ea] text-[#433422] border-[#dfca9e]' : 'bg-white text-slate-800 border-slate-200'
                }`}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${textSecondaryClass}`}>{lang === 'ar' ? 'إلى:' : 'To:'}</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className={`border rounded-lg p-1.5 text-xs focus:outline-none ${
                  theme === 'dark' ? 'bg-zinc-800 text-white border-zinc-750' : theme === 'eye-care' ? 'bg-[#faf5ea] text-[#433422] border-[#dfca9e]' : 'bg-white text-slate-800 border-slate-200'
                }`}
              />
            </div>
          </div>
        )}

        {/* Search Bar Input */}
        <div className="relative max-w-xl">
          <input
            type="text"
            placeholder={t.txSearchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full text-xs rounded-xl px-4 py-3.5 focus:outline-none transition ${inputClass} ${
              lang === 'ar' ? 'pr-10' : 'pl-10'
            }`}
          />
          <Search className={`w-4.5 h-4.5 text-slate-400 absolute top-3.5 ${lang === 'ar' ? 'right-3.5' : 'left-3.5'}`} />
        </div>
      </div>

      {/* 2. Dynamic Report Statistics Bar for the Selected Period */}
      <div className={`rounded-2xl p-6 shadow-md grid grid-cols-2 md:grid-cols-4 gap-6 ${summaryBgClass}`}>
        
        <div>
          <p className={`${theme === 'eye-care' ? 'text-[#786144]' : 'text-slate-400'} text-xs font-semibold mb-1`}>{lang === 'ar' ? 'عدد عمليات الفترة' : 'Invoices Period'}</p>
          <div className="text-2xl font-bold tracking-tight">
            {filteredTotals.count} <span className={`text-xs ${theme === 'eye-care' ? 'text-[#786144]' : 'text-slate-400'}`}>{lang === 'ar' ? 'فاتورة' : 'invoices'}</span>
          </div>
        </div>

        <div>
          <p className={`${theme === 'eye-care' ? 'text-[#786144]' : 'text-slate-400'} text-xs font-semibold mb-1`}>{lang === 'ar' ? 'مبيعات الفترة' : 'Sales Period'}</p>
          <div className="text-2xl font-bold text-indigo-400 dark:text-indigo-300 tracking-tight">
            {filteredTotals.sales.toLocaleString(localeCode, { maximumFractionDigits: 1 })} <span className={`text-xs ${theme === 'eye-care' ? 'text-[#786144]' : 'text-slate-400'}`}>{t.currency}</span>
          </div>
        </div>

        <div>
          <p className={`${theme === 'eye-care' ? 'text-[#786144]' : 'text-slate-400'} text-xs font-semibold mb-1`}>{lang === 'ar' ? 'تكلفة الفترة' : 'Cost Period'}</p>
          <div className="text-2xl font-bold text-amber-500 dark:text-amber-400 tracking-tight">
            {filteredTotals.cost.toLocaleString(localeCode, { maximumFractionDigits: 1 })} <span className={`text-xs ${theme === 'eye-care' ? 'text-[#786144]' : 'text-slate-400'}`}>{t.currency}</span>
          </div>
        </div>

        <div>
          <p className={`${theme === 'eye-care' ? 'text-[#786144]' : 'text-slate-400'} text-xs font-semibold mb-1`}>{lang === 'ar' ? 'صافي أرباح الفترة' : 'Net Profits Period'}</p>
          <div className="text-2xl font-bold text-sky-400 dark:text-sky-300 tracking-tight flex items-center gap-1.5 flex-wrap">
            {filteredTotals.profit >= 0 ? '+' : ''}
            {filteredTotals.profit.toLocaleString(localeCode, { maximumFractionDigits: 1 })} 
            <span className={`text-xs ${theme === 'eye-care' ? 'text-[#786144]' : 'text-slate-400'}`}>{t.currency}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : theme === 'eye-care' ? 'bg-[#faf2e4] text-[#433422]' : 'bg-slate-700 text-slate-100'
            }`}>
              {filteredTotals.margin.toFixed(0)}% {lang === 'ar' ? 'هامش' : 'margin'}
            </span>
          </div>
        </div>

      </div>

      {/* 3. Ledger table listing */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${cardBgClass}`}>
        {filteredTransactions.length === 0 ? (
          <div className={`text-center py-16 flex flex-col items-center justify-center ${textSecondaryClass}`}>
            <PackageOpen className="w-16 h-16 text-slate-200 dark:text-zinc-800 mb-4" />
            <p className="text-sm font-semibold">{t.txNoTransactions}</p>
          </div>
        ) : (
          <div className={`divide-y ${dividerClass}`}>
            {filteredTransactions.map((tx) => {
              const isExpanded = !!expandedIds[tx.id];
              const transactionDate = new Date(tx.date);
              
              return (
                <div key={tx.id} className={`p-5 transition ${
                  theme === 'dark' ? 'hover:bg-zinc-800/10' : theme === 'eye-care' ? 'hover:bg-[#f3e5ca]/20' : 'hover:bg-slate-50/30'
                }`}>
                  {/* Ledger Row Header */}
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    
                    <div className="flex items-start gap-3">
                      <div className="bg-slate-100 dark:bg-zinc-800 p-2.5 rounded-xl text-slate-600 dark:text-zinc-300 hidden sm:block">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {tx.orderNumber && (
                            <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full select-none">
                              {lang === 'ar' ? `طلب #${tx.orderNumber}` : `Order #${tx.orderNumber}`}
                            </span>
                          )}
                          {tx.isDelivery && (
                            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full select-none flex items-center gap-1 shadow-sm">
                              <span>🛵 {lang === 'ar' ? 'دليفري' : 'Delivery'}</span>
                              {tx.deliveryDriver && <span className="opacity-90">({tx.deliveryDriver})</span>}
                            </span>
                          )}
                          <h4 className={`font-bold text-sm sm:text-base ${textPrimaryClass}`}>{tx.customerName}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            theme === 'dark' ? 'bg-zinc-850 text-zinc-400' : theme === 'eye-care' ? 'bg-[#ebdcc3] text-[#433422]' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {tx.items.reduce((acc, i) => acc + i.quantity, 0)} {lang === 'ar' ? 'منتجات' : 'items'}
                          </span>
                        </div>
                        <div className={`flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs ${textSecondaryClass}`}>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                            {transactionDate.toLocaleDateString(localeCode, { dateStyle: 'medium' })}
                            {' - '}
                            {transactionDate.toLocaleTimeString(localeCode, { timeStyle: 'short' })}
                          </span>
                          {tx.notes && <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded text-[10px]">{tx.notes}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Monetary aggregate */}
                    <div className="flex items-center gap-6 flex-wrap">
                      <div className={lang === 'ar' ? 'text-left lg:text-right' : 'text-right lg:text-left'}>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-400">{lang === 'ar' ? 'قيمة البيع' : 'Sale Value'}</div>
                        <div className={`font-extrabold ${textPrimaryClass}`}>{tx.totalAmount.toLocaleString(localeCode, { maximumFractionDigits: 1 })} {t.currency}</div>
                      </div>

                      <div className={lang === 'ar' ? 'text-left lg:text-right' : 'text-right lg:text-left'}>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-400">{lang === 'ar' ? 'الأرباح المحتسبة' : 'Profit Yield'}</div>
                        <div className={`font-mono font-extrabold ${tx.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {tx.totalProfit >= 0 ? '+' : ''}{tx.totalProfit.toLocaleString(localeCode, { maximumFractionDigits: 1 })} {t.currency}
                        </div>
                      </div>



                      {/* Expand / delete buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleExpand(tx.id)}
                          type="button"
                          className={`rounded-lg p-2 transition flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                            theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300' : theme === 'eye-care' ? 'bg-[#ebdcc3] hover:bg-[#f3e5ca] text-[#433422]' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          {lang === 'ar' ? 'تفاصيل الفاتورة' : 'Details'}
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        
                        <button
                          onClick={() => handleStartEdit(tx)}
                          type="button"
                          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition cursor-pointer"
                          title={lang === 'ar' ? 'تعديل الفاتورة وتصحيح الحساب' : 'Edit Invoice'}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setTransactionToDelete(tx.id)}
                          type="button"
                          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                          title={lang === 'ar' ? 'حذف الفاتورة وإرجاع الكمية للمخزن' : 'Undo invoice & return stock'}
                        >
                          <Undo2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Expanded receipt products drawer */}
                  {isExpanded && (
                    <div className={`mt-4 rounded-xl p-4 border animate-fade-in text-xs space-y-3 ${drawerBgClass}`}>
                      <h5 className={`font-bold border-b pb-2 flex items-center gap-1.5 ${theme === 'dark' ? 'text-zinc-300 border-zinc-800' : theme === 'eye-care' ? 'text-[#433422] border-[#dfca9e]' : 'text-slate-600 border-slate-200'}`}>
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        {lang === 'ar' ? 'المنتجات المسجلة في الفاتورة:' : 'Registered products in this invoice:'}
                      </h5>
                      
                      <div className={`divide-y ${theme === 'dark' ? 'divide-zinc-900' : theme === 'eye-care' ? 'divide-[#dfca9e]' : 'divide-slate-100'}`}>
                        {tx.items.map((item, index) => {
                          const itemTotalCost = item.costPrice * item.quantity;
                          const itemTotalSale = item.sellingPrice * item.quantity;
                          const itemProfit = itemTotalSale - itemTotalCost;
                          
                          return (
                            <div key={index} className="py-2.5 flex justify-between items-center flex-wrap gap-2 first:pt-0 last:pb-0">
                              <div>
                                <span className={`font-bold text-sm ${textPrimaryClass}`}>{item.productName}</span>
                                <span className="text-slate-400 dark:text-zinc-400 mx-2">({item.quantity} × {item.sellingPrice.toLocaleString(localeCode)} {t.currency})</span>
                              </div>
                              <div className="flex gap-4 text-[11px] flex-wrap">
                                <span className={textSecondaryClass}>{lang === 'ar' ? 'تكلفة عليك:' : 'Cost Price:'} {itemTotalCost.toLocaleString(localeCode, { maximumFractionDigits: 1 })} {t.currency}</span>
                                <span className={textPrimaryClass}>{lang === 'ar' ? 'مبيعات:' : 'Retail Sale:'} {itemTotalSale.toLocaleString(localeCode, { maximumFractionDigits: 1 })} {t.currency}</span>
                                <span className={`font-bold ${itemProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                  {lang === 'ar' ? 'ربح:' : 'Profit:'} {itemProfit.toLocaleString(localeCode, { maximumFractionDigits: 1 })} {t.currency}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {tx.isDelivery && (
                        <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                          theme === 'dark' ? 'bg-zinc-950/40 border-zinc-850' : theme === 'eye-care' ? 'bg-[#ebdcc3]/30 border-[#dfca9e]' : 'bg-indigo-50/30 border-indigo-100/60'
                        }`}>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-400 dark:text-zinc-500">{lang === 'ar' ? 'سعر المواد:' : 'Products Subtotal:'}</span>
                            <span className={`font-semibold ${textPrimaryClass}`}>{tx.totalAmount.toLocaleString(localeCode)} {t.currency}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{lang === 'ar' ? 'تكلفة التوصيل الدليفري:' : 'Delivery Fee:'}</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{(tx.deliveryFee || 0).toLocaleString(localeCode)} {t.currency}</span>
                          </div>
                          {tx.deliveryAddress && (
                            <div className="flex justify-between items-start text-[11px] gap-2 border-t border-dashed border-slate-200/55 pt-1.5 mt-1.5">
                              <span className="text-slate-400 dark:text-zinc-500 shrink-0">{lang === 'ar' ? 'العنوان وتفاصيل الاتصال للتوصيل:' : 'Delivery Address & Contact:'}</span>
                              <span className={`font-medium ${textPrimaryClass} text-left break-all`}>{tx.deliveryAddress}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className={`pt-2 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        theme === 'dark' ? 'border-zinc-800' : theme === 'eye-care' ? 'border-[#dfca9e]' : 'border-slate-200'
                      }`}>
                        <div className={`flex flex-wrap gap-4 text-[11px] font-bold ${
                          theme === 'dark' ? 'text-zinc-300' : theme === 'eye-care' ? 'text-[#433422]' : 'text-slate-500'
                        }`}>
                          <span>
                            {tx.isDelivery ? (lang === 'ar' ? 'إجمالي الطلب الكلي:' : 'Grand Total:') : t.posTotalAmount}:{' '}
                            {(tx.totalAmount + (tx.isDelivery && tx.deliveryFee ? tx.deliveryFee : 0)).toLocaleString(localeCode, { maximumFractionDigits: 1 })}{' '}
                            {t.currency}
                          </span>
                          <span>{t.posTotalCost}: {tx.totalCost.toLocaleString(localeCode, { maximumFractionDigits: 1 })} {t.currency}</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{t.posNetProfit}: {tx.totalProfit.toLocaleString(localeCode, { maximumFractionDigits: 1 })} {t.currency}</span>
                        </div>
                        
                        <button
                          onClick={() => onPrintTransaction(tx, tx.totalAmount)}
                          type="button"
                          className="px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700 shadow-sm"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'طباعة الفاتورة' : 'Print Invoice'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal for Transaction Cancel/Deletion */}
      {transactionToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl border animate-scale-up ${cardBgClass} ${
            lang === 'ar' ? 'text-right' : 'text-left'
          }`}>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mb-4 animate-bounce">
                <Undo2 className="h-6 w-6" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${textPrimaryClass}`}>{lang === 'ar' ? 'تأكيد إلغاء وحذف الفاتورة' : 'Confirm Invoice Cancellation'}</h3>
              <p className={`text-sm mb-6 leading-relaxed ${textSecondaryClass}`}>
                {lang === 'ar' 
                  ? 'تنبيه: هل أنت متأكد من رغبتك في إلغاء هذه العملية وحذف الفاتورة وإرجاع الكميات المبيعة إلى مخزن المنتجات؟' 
                  : 'Are you sure you want to cancel this sale? The invoice will be deleted, and all quantities will be put back into inventory.'
                }
                <br />
                <span className="text-rose-600 dark:text-rose-400 font-bold">{lang === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.' : 'This action is permanent and cannot be undone.'}</span>
              </p>
            </div>
            <div className={`flex gap-3 ${lang === 'ar' ? 'flex-col sm:flex-row-reverse' : 'flex-col sm:flex-row'}`}>
              <button
                type="button"
                onClick={() => {
                  onDeleteTransaction(transactionToDelete);
                  setTransactionToDelete(null);
                }}
                className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2.5 bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition cursor-pointer"
              >
                {lang === 'ar' ? 'نعم، احذف الفاتورة وأرجع المخزون' : 'Confirm & Restore Stock'}
              </button>
              <button
                type="button"
                onClick={() => setTransactionToDelete(null)}
                className={`w-full inline-flex justify-center rounded-xl border shadow-sm px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                  theme === 'dark' ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {lang === 'ar' ? 'إلغاء التراجع' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Edit Transaction Modal */}
      {editingTx && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className={`rounded-2xl max-w-2xl w-full p-6 shadow-2xl border animate-scale-up ${cardBgClass} flex flex-col max-h-[90vh] ${
            lang === 'ar' ? 'text-right' : 'text-left'
          }`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            
            <div className="flex justify-between items-center border-b pb-4 mb-4 border-dashed border-zinc-700/30">
              <div>
                <h3 className={`text-lg font-bold ${textPrimaryClass}`}>
                  {lang === 'ar' ? '📝 تعديل بيانات الفاتورة وتصحيح الأخطاء' : '📝 Edit Invoice & Correct Errors'}
                </h3>
                <p className={`text-xs mt-1 ${textSecondaryClass}`}>
                  {lang === 'ar' ? `رقم الطلب اليومي: #${editingTx.orderNumber}` : `Daily Order: #${editingTx.orderNumber}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="text-slate-400 hover:text-rose-500 transition p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="space-y-4 overflow-y-auto flex-1 pr-1.5 pl-1.5">
              
              {/* Customer and Notes Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${textSecondaryClass}`}>
                    {lang === 'ar' ? 'اسم الزبون:' : 'Customer Name:'}
                  </label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className={`w-full text-xs rounded-xl px-4 py-2.5 focus:outline-none transition ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${textSecondaryClass}`}>
                    {lang === 'ar' ? 'ملاحظات إضافية:' : 'Additional Notes:'}
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className={`w-full text-xs rounded-xl px-4 py-2.5 focus:outline-none transition ${inputClass}`}
                  />
                </div>
              </div>

              {/* Add Product Search Input */}
              <div className="relative z-[40] mt-1">
                <label className={`block text-xs font-bold mb-1.5 ${textSecondaryClass}`}>
                  {lang === 'ar' ? '🔍 إضافة منتج جديد للفاتورة:' : '🔍 Add new product to invoice:'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={lang === 'ar' ? 'اكتب اسم المنتج أو التصنيف للبحث والإضافة الفورية...' : 'Type product name or category to search & add instantly...'}
                    value={productSearchQuery}
                    onChange={(e) => {
                      setProductSearchQuery(e.target.value);
                      setIsProductDropdownOpen(true);
                    }}
                    onFocus={() => setIsProductDropdownOpen(true)}
                    className={`w-full text-xs rounded-xl px-4 py-2.5 focus:outline-none transition ${inputClass}`}
                  />
                  {productSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setProductSearchQuery('');
                        setIsProductDropdownOpen(false);
                      }}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown list for search results */}
                {isProductDropdownOpen && matchedProducts.length > 0 && (
                  <div className={`absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-lg z-50 divide-y ${
                    theme === 'dark' 
                      ? 'bg-zinc-900 border-zinc-850 divide-zinc-800' 
                      : theme === 'eye-care' 
                      ? 'bg-[#faf2e4] border-[#dfca9e] divide-[#dfca9e]' 
                      : 'bg-white border-slate-200 divide-slate-100'
                  }`}>
                    {matchedProducts.map((p) => {
                      const exists = editItems.some((item) => item.productId === p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (exists) {
                              setEditItems(editItems.map(item => {
                                if (item.productId === p.id) {
                                  return { ...item, quantity: item.quantity + 1 };
                                }
                                return item;
                              }));
                            } else {
                              setEditItems([
                                ...editItems,
                                {
                                  productId: p.id,
                                  productName: p.name,
                                  quantity: 1,
                                  costPrice: p.costPrice,
                                  sellingPrice: p.sellingPrice,
                                }
                              ]);
                            }
                            setProductSearchQuery('');
                            setIsProductDropdownOpen(false);
                          }}
                          className={`w-full text-right px-4 py-3 text-xs transition flex items-center justify-between cursor-pointer ${
                            theme === 'dark' 
                              ? 'hover:bg-zinc-800/80 text-zinc-200' 
                              : theme === 'eye-care' 
                              ? 'hover:bg-[#ebdcc3] text-[#433422]' 
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                          dir={lang === 'ar' ? 'rtl' : 'ltr'}
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-bold text-sm">{p.name}</span>
                            {p.category && (
                              <span className="text-[9px] text-indigo-500 opacity-80">{p.category}</span>
                            )}
                          </div>
                          <div className="text-left font-medium">
                            <div className="text-[11px] text-emerald-500 font-bold">{p.sellingPrice.toLocaleString()} {t.currency}</div>
                            <div className={`text-[9px] ${textSecondaryClass}`}>
                              {lang === 'ar' ? `المخزون الحالي: ${p.quantityInStock}` : `Current Stock: ${p.quantityInStock}`}
                              {exists && <span className="text-indigo-500 font-bold ml-1 mr-1">({lang === 'ar' ? 'مضاف بالفعل' : 'Already in invoice'})</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {isProductDropdownOpen && productSearchQuery.trim() && matchedProducts.length === 0 && (
                  <div className={`absolute left-0 right-0 mt-1 p-4 text-xs text-center rounded-xl border shadow-lg z-50 ${
                    theme === 'dark' 
                      ? 'bg-zinc-900 border-zinc-850 text-zinc-400' 
                      : theme === 'eye-care' 
                      ? 'bg-[#faf2e4] border-[#dfca9e] text-[#786144]' 
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}>
                    {lang === 'ar' ? 'لم يتم العثور على منتجات مطابقة للبحث 😕' : 'No matching products found 😕'}
                  </div>
                )}
              </div>

              {/* Items List Header */}
              <h4 className={`text-xs font-bold border-b pb-1.5 mt-2 flex items-center gap-1.5 ${textSecondaryClass}`}>
                <PackageOpen className="w-4 h-4 text-indigo-500" />
                {lang === 'ar' ? 'المنتجات والكميات المسجلة بالفاتورة:' : 'Registered items in this invoice:'}
              </h4>

              {/* Items Table / Row */}
              <div className="space-y-2.5">
                {editItems.length === 0 ? (
                  <div className={`text-center py-6 text-xs ${textSecondaryClass}`}>
                    {lang === 'ar' ? 'لا توجد سلع بالفاتورة. يرجى إلغاء التعديل أو حذف الفاتورة بالكامل.' : 'No items in the invoice. Please cancel or delete the invoice instead.'}
                  </div>
                ) : (
                  editItems.map((item, index) => {
                    const itemCostTotal = item.costPrice * item.quantity;
                    const itemSaleTotal = item.sellingPrice * item.quantity;
                    const itemProfit = itemSaleTotal - itemCostTotal;

                    return (
                      <div 
                        key={index} 
                        className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          theme === 'dark' ? 'bg-zinc-950/40 border-zinc-850' : theme === 'eye-care' ? 'bg-[#faf5ea] border-[#dfca9e]' : 'bg-slate-50/50 border-slate-200'
                        }`}
                      >
                        <div className="flex-1">
                          <span className={`font-bold text-sm block ${textPrimaryClass}`}>{item.productName}</span>
                          <span className={`text-[10px] ${textSecondaryClass}`}>
                            {lang === 'ar' ? 'تكلفة الحبة:' : 'Cost per unit:'} {item.costPrice.toLocaleString()} {t.currency}
                          </span>
                        </div>

                        {/* Adjust qty and sellingPrice fields */}
                        <div className="flex flex-wrap items-center gap-4">
                          {/* Qty field */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">{lang === 'ar' ? 'الكمية:' : 'Qty:'}</span>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                const updated = [...editItems];
                                updated[index].quantity = val;
                                setEditItems(updated);
                              }}
                              className={`w-14 text-center text-xs font-bold rounded-lg py-1.5 px-1 focus:outline-none border ${
                                theme === 'dark' ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            />
                          </div>

                          {/* Price field */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">{lang === 'ar' ? 'السعر:' : 'Price:'}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.sellingPrice}
                              onChange={(e) => {
                                const val = Math.max(0, parseFloat(e.target.value) || 0);
                                const updated = [...editItems];
                                updated[index].sellingPrice = val;
                                setEditItems(updated);
                              }}
                              className={`w-20 text-center text-xs font-bold rounded-lg py-1.5 px-1 focus:outline-none border ${
                                theme === 'dark' ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            />
                            <span className={`text-[10px] ${textSecondaryClass}`}>{t.currency}</span>
                          </div>

                          {/* Line Profit Info */}
                          <div className="text-right min-w-[70px]">
                            <span className={`text-xs font-extrabold block ${itemProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {itemProfit >= 0 ? '+' : ''}{itemProfit.toLocaleString()}
                            </span>
                            <span className="text-[9px] text-slate-400 block">{lang === 'ar' ? 'صافي الربح' : 'Net Profit'}</span>
                          </div>

                          {/* Remove Item Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editItems.filter((_, i) => i !== index);
                              setEditItems(updated);
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition"
                            title={lang === 'ar' ? 'إزالة السلعة' : 'Remove Item'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dynamic Math Summary */}
              {editItems.length > 0 && (
                (() => {
                  let totalAmount = 0;
                  let totalCost = 0;
                  editItems.forEach(i => {
                    totalAmount += i.sellingPrice * i.quantity;
                    totalCost += i.costPrice * i.quantity;
                  });
                  const totalProfit = totalAmount - totalCost;
                  const margin = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;

                  return (
                    <div className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-4 text-center mt-3 ${
                      theme === 'dark' ? 'bg-zinc-950 border-zinc-850' : theme === 'eye-care' ? 'bg-[#ebdcc3] border-[#dfca9e]' : 'bg-slate-100 border-slate-200'
                    }`}>
                      <div>
                        <span className={`text-[10px] block font-bold ${textSecondaryClass}`}>{lang === 'ar' ? 'إجمالي المبيعات الجديد' : 'New Sales Total'}</span>
                        <span className={`text-sm font-extrabold ${textPrimaryClass}`}>{totalAmount.toLocaleString()} {t.currency}</span>
                      </div>
                      <div>
                        <span className={`text-[10px] block font-bold ${textSecondaryClass}`}>{lang === 'ar' ? 'التكلفة الإجمالية' : 'Total Cost'}</span>
                        <span className={`text-sm font-bold text-amber-500`}>{totalCost.toLocaleString()} {t.currency}</span>
                      </div>
                      <div>
                        <span className={`text-[10px] block font-bold ${textSecondaryClass}`}>{lang === 'ar' ? 'صافي الربح / الهامش' : 'Net Profit / Margin'}</span>
                        <span className={`text-sm font-extrabold ${totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {totalProfit >= 0 ? '+' : ''}{totalProfit.toLocaleString()} {t.currency} ({margin.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  );
                })()
              )}

            </div>

            <div className="flex gap-3 mt-5 pt-3 border-t border-dashed border-zinc-700/30 justify-end">
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  theme === 'dark' ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {lang === 'ar' ? 'إلغاء التعديل' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={editItems.length === 0}
                onClick={() => {
                  if (editItems.length === 0) return;
                  let totalAmount = 0;
                  let totalCost = 0;
                  editItems.forEach(i => {
                    totalAmount += i.sellingPrice * i.quantity;
                    totalCost += i.costPrice * i.quantity;
                  });

                  const updatedTx: Transaction = {
                    ...editingTx,
                    customerName: editCustomerName.trim() || (lang === 'ar' ? 'زبون عام' : 'General Customer'),
                    notes: editNotes.trim() || undefined,
                    items: editItems,
                    totalAmount,
                    totalCost,
                    totalProfit: totalAmount - totalCost,
                  };

                  onEditTransaction?.(editingTx, updatedTx);
                  setEditingTx(null);
                }}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs text-white transition flex items-center gap-1.5 cursor-pointer ${
                  editItems.length === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {lang === 'ar' ? 'حفظ التعديلات والتصحيح' : 'Save Changes & Recalculate'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
