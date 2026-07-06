import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { Plus, Edit2, Trash2, Search, Filter, AlertCircle, Percent, PackageOpen } from 'lucide-react';
import { translations } from '../translations';

interface InventoryProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  lang: 'ar' | 'en';
  theme: 'light' | 'dark' | 'eye-care';
}

export default function Inventory({ products, onAddProduct, onUpdateProduct, onDeleteProduct, lang, theme }: InventoryProps) {
  const t = translations[lang];

  // Custom alerts and deletion state
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Local state for add/edit form
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [quantityInStock, setQuantityInStock] = useState<string>('');
  const [category, setCategory] = useState('');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(lang === 'ar' ? 'الكل' : 'All');
  const [stockFilter, setStockFilter] = useState(lang === 'ar' ? 'الكل' : 'All');

  // Categories extracted dynamically from products
  const categories = useMemo(() => {
    const list = new Set<string>();
    products.forEach((p) => {
      if (p.category) list.add(p.category);
    });
    return [lang === 'ar' ? 'الكل' : 'All', ...Array.from(list)];
  }, [products, lang]);

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || costPrice.trim() === '' || sellingPrice.trim() === '') {
      setErrorToast(t.invToastFillFields);
      return;
    }

    const itemCost = parseFloat(costPrice);
    const itemSale = parseFloat(sellingPrice);
    const itemStock = 999999;

    if (itemCost < 0 || itemSale < 0 || itemStock < 0) {
      setErrorToast(t.invToastNegative);
      return;
    }

    const payload = {
      name: name.trim(),
      costPrice: itemCost,
      sellingPrice: itemSale,
      quantityInStock: itemStock,
      category: category.trim() || (lang === 'ar' ? 'عام' : 'General'),
    };

    if (editId) {
      onUpdateProduct({
        ...payload,
        id: editId,
        createdAt: products.find((p) => p.id === editId)?.createdAt || new Date().toISOString(),
      });
    } else {
      onAddProduct(payload);
    }

    // Reset Form fields
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setCostPrice('');
    setSellingPrice('');
    setQuantityInStock('');
    setCategory('');
    setEditId(null);
    setIsEditing(false);
  };

  const handleEditClick = (prod: Product) => {
    setName(prod.name);
    setCostPrice(prod.costPrice.toString());
    setSellingPrice(prod.sellingPrice.toString());
    setQuantityInStock(prod.quantityInStock === 999999 ? '' : prod.quantityInStock.toString());
    setCategory(prod.category || '');
    setEditId(prod.id);
    setIsEditing(true);
    
    // Scroll smoothly to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter products by search terms, category, and stock levels
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCategory = selectedCategory === 'الكل' || selectedCategory === 'All' || p.category === selectedCategory;
      
      let matchStock = true;
      if (stockFilter === 'منخفض' || stockFilter === 'Low') {
        matchStock = p.quantityInStock > 0 && p.quantityInStock <= 5;
      } else if (stockFilter === 'نفذ' || stockFilter === 'Out') {
        matchStock = p.quantityInStock <= 0;
      }

      return matchSearch && matchCategory && matchStock;
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

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

  const toolbarBgClass = 
    theme === 'dark' 
      ? 'bg-zinc-950/40 border-b border-zinc-800' 
      : theme === 'eye-care' 
      ? 'bg-[#f3e5ca] border-b border-[#dfca9e]' 
      : 'bg-slate-50/50 border-b border-slate-100';

  const tableHeaderBgClass = 
    theme === 'dark' 
      ? 'bg-zinc-950/60 border-b border-zinc-800' 
      : theme === 'eye-care' 
      ? 'bg-[#ebdcc3] border-b border-[#dfca9e]' 
      : 'bg-slate-100/60 border-b border-slate-100';

  const tableRowHoverClass = 
    theme === 'dark' 
      ? 'hover:bg-zinc-800/30' 
      : theme === 'eye-care' 
      ? 'hover:bg-[#f3e5ca]/40' 
      : 'hover:bg-slate-50/50';

  const dividerClass = 
    theme === 'dark' 
      ? 'divide-zinc-800' 
      : theme === 'eye-care' 
      ? 'divide-[#dfca9e]' 
      : 'divide-slate-100';

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Toast Alert */}
      {errorToast && (
        <div className={`border px-4 py-3 rounded-xl flex items-center justify-between text-sm animate-fade-in ${
          theme === 'dark' ? 'bg-zinc-900 border-rose-900/60 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-700'
        }`}>
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <span>{errorToast}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setErrorToast(null)} 
            className={`font-bold text-xs px-2 py-1 border rounded-lg cursor-pointer transition ${
              theme === 'dark' ? 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-white hover:bg-rose-50 border-rose-100 text-rose-400'
            }`}
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      )}
      
      {/* 1. Add / Edit Product form segment */}
      <div className={`rounded-2xl p-6 border shadow-sm ${cardBgClass}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-lg font-bold ${textPrimaryClass}`}>
            {editId ? `📝 ${t.invEditTitle}` : `➕ ${t.invAddTitle}`}
          </h3>
          {isEditing && (
            <button
              onClick={resetForm}
              type="button"
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              {lang === 'ar' ? 'إلغاء التعديل والعودة للإضافة' : 'Cancel Edit and Create New'}
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Product Name */}
          <div className="md:col-span-2 lg:col-span-2">
            <label className={`block text-xs font-bold mb-1.5 ${textSecondaryClass}`}>
              {t.invFieldName} *
            </label>
            <input
              type="text"
              placeholder={lang === 'ar' ? 'مثال: علبة زيت، كيس سكر 5كغ' : 'e.g. Can of oil, sugar bag'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition ${inputClass}`}
              required
              id="new_product_name_input"
            />
          </div>

          {/* Cost Price */}
          <div>
            <label className={`block text-xs font-bold mb-1.5 ${textSecondaryClass}`}>
              {t.invFieldCost} *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder={t.invFieldCostPlaceholder}
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className={`w-full rounded-xl py-2.5 text-sm focus:outline-none transition ${inputClass} ${
                  lang === 'ar' ? 'pl-10 pr-4' : 'pr-10 pl-4'
                }`}
                required
                id="new_product_cost_input"
              />
              <span className={`absolute top-2.5 text-xs text-slate-400 font-semibold ${lang === 'ar' ? 'left-3.5' : 'right-3.5'}`}>{t.currency}</span>
            </div>
          </div>

          {/* Selling Price */}
          <div>
            <label className={`block text-xs font-bold mb-1.5 ${textSecondaryClass}`}>
              {t.invFieldSelling} *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder={t.invFieldSellingPlaceholder}
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className={`w-full rounded-xl py-2.5 text-sm focus:outline-none transition ${inputClass} ${
                  lang === 'ar' ? 'pl-10 pr-4' : 'pr-10 pl-4'
                }`}
                required
                id="new_product_selling_input"
              />
              <span className={`absolute top-2.5 text-xs text-slate-400 font-semibold ${lang === 'ar' ? 'left-3.5' : 'right-3.5'}`}>{t.currency}</span>
            </div>
          </div>

          {/* Category */}
          <div className="md:col-span-1 lg:col-span-1">
            <label className={`block text-xs font-bold mb-1.5 ${textSecondaryClass}`}>
              {t.invFieldCategory}
            </label>
            <input
              type="text"
              placeholder={lang === 'ar' ? 'مثال: مواد غذائية، ملابس' : 'e.g. Foodstuff, clothing'}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition ${inputClass}`}
              id="new_product_category_input"
            />
          </div>

          {/* Calculations Helper Display (Unit profit and yield margin) */}
          <div className={`md:col-span-2 lg:col-span-3 flex items-center justify-start rounded-xl p-3 border mt-1 ${
            theme === 'dark' 
              ? 'bg-zinc-950/40 border-zinc-800' 
              : theme === 'eye-care' 
              ? 'bg-[#ebdcc3] border-[#dfca9e]' 
              : 'bg-indigo-50/60 border-indigo-100/50'
          }`}>
            <Percent className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mx-2" />
             <div className="text-xs">
               {costPrice !== '' && sellingPrice !== '' ? (
                 (() => {
                   const profit = parseFloat(sellingPrice.toString()) - parseFloat(costPrice.toString());
                   const margin = parseFloat(sellingPrice.toString()) > 0 ? (profit / parseFloat(sellingPrice.toString())) * 100 : 0;
                   const markup = parseFloat(costPrice.toString()) > 0 ? (profit / parseFloat(costPrice.toString())) * 100 : 100;
                   return (
                     <span className={theme === 'eye-care' ? 'text-[#433422]' : 'text-indigo-800 dark:text-indigo-300'}>
                       {t.invProfitEstimate} <strong className="font-bold text-indigo-700 dark:text-indigo-400">{profit.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { maximumFractionDigits: 1 })} {t.currency}</strong>
                       {' '}({lang === 'ar' ? 'هامش البيع:' : 'Margin:'} <strong className="font-bold text-indigo-700 dark:text-indigo-400">{margin.toFixed(0)}%</strong>,{' '}
                       {lang === 'ar' ? 'مربح التكلفة:' : 'Markup:'} <strong className="font-bold text-indigo-700 dark:text-indigo-400">{markup.toFixed(0)}%</strong>)
                     </span>
                   );
                 })()
               ) : (
                 <span className={textSecondaryClass}>{t.dashMarginDesc}</span>
               )}
             </div>
          </div>
          {/* Submit Button */}
          <div className="md:col-span-2 lg:col-span-5 flex justify-end gap-3 pt-2">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-8 py-3 rounded-xl shadow-md shadow-indigo-100 dark:shadow-none hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              {editId ? t.invBtnUpdate : t.invBtnAdd}
            </button>
          </div>

        </form>
      </div>

      {/* 2. Inventory Listing section with search filters */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${cardBgClass}`}>
        
        {/* Filter Toolbar */}
        <div className={`p-6 space-y-4 ${toolbarBgClass}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className={`text-lg font-bold ${textPrimaryClass}`}>{t.invTableTitle}</h3>
              <p className={`text-xs ${textSecondaryClass}`}>{lang === 'ar' ? 'عرض المنتجات المسجلة ومستويات الربحية والمخزون' : 'Display stored items, profits and stock levels'}</p>
            </div>
            <div className="flex items-center gap-2 text-xs bg-indigo-50 dark:bg-zinc-800 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-full font-bold">
              <span>{lang === 'ar' ? 'إجمالي الأنواع:' : 'Total Items:'}</span>
              <span>{products.length} {lang === 'ar' ? 'عناصر' : 'items'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder={t.invSearchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition ${
                  theme === 'dark' ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : theme === 'eye-care' ? 'bg-[#faf5ea] text-[#433422] border-[#dfca9e]' : 'bg-white text-slate-800 border-slate-200'
                } ${
                  lang === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'
                }`}
              />
              <Search className={`w-4 h-4 text-slate-400 absolute top-3.5 ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`w-full text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition cursor-pointer appearance-none ${
                  theme === 'dark' ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : theme === 'eye-care' ? 'bg-[#faf5ea] text-[#433422] border-[#dfca9e]' : 'bg-white text-slate-800 border-slate-200'
                }`}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'الكل' || cat === 'All' ? `${t.invFilterCategory}: ${cat}` : `${t.invFilterCategory}: ${cat}`}
                  </option>
                ))}
              </select>
              <Filter className={`w-3.5 h-3.5 text-slate-400 absolute top-3.5 pointer-events-none ${lang === 'ar' ? 'left-3' : 'right-3'}`} />
            </div>
          </div>
        </div>

        {/* Inventory Table Container */}
        <div className="overflow-x-auto">
          {filteredProducts.length === 0 ? (
            <div className={`text-center py-16 flex flex-col items-center justify-center ${textSecondaryClass}`}>
              <PackageOpen className="w-16 h-16 text-slate-200 dark:text-zinc-800 mb-4" />
              <p className="text-sm font-semibold">{t.invNoProducts}</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(lang === 'ar' ? 'الكل' : 'All');
                  setStockFilter(lang === 'ar' ? 'الكل' : 'All');
                }}
                className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
              >
                {lang === 'ar' ? 'إعادة ضبط خيارات البحث' : 'Reset Search Filters'}
              </button>
            </div>
          ) : (
            <table className={`w-full border-collapse ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
              <thead>
                <tr className={`text-xs font-bold ${tableHeaderBgClass} ${textSecondaryClass}`}>
                  <th className="p-4">{t.invTableHeaderName}</th>
                  <th className="p-4">{t.invTableHeaderCategory}</th>
                  <th className={`p-4 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{t.invTableHeaderCost}</th>
                  <th className={`p-4 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{t.invTableHeaderSelling}</th>
                  <th className={`p-4 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{t.invTableHeaderProfit}</th>
                  <th className="p-4 text-center">{t.invTableHeaderActions}</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-sm ${dividerClass}`}>
                {filteredProducts.map((prod) => {
                  const profitUnit = prod.sellingPrice - prod.costPrice;
                  const isLow = prod.quantityInStock <= 5;
                  const isOut = prod.quantityInStock <= 0;
                  
                  return (
                    <tr key={prod.id} className={`transition ${tableRowHoverClass}`}>
                      {/* Name */}
                      <td className="p-4">
                        <div className={`font-semibold ${textPrimaryClass}`}>{prod.name}</div>
                        <div className={`text-[10px] mt-0.5 ${textTertiaryClass}`}>
                          {t.invAddedDate} {new Date(prod.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US')}
                        </div>
                      </td>

                      {/* Group */}
                      <td className="p-4 text-xs">
                        <span className="bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 px-2.5 py-1 rounded-full font-medium">
                          {prod.category || t.dashGeneralCat}
                        </span>
                      </td>

                      {/* Cost Price */}
                      <td className={`p-4 font-mono ${lang === 'ar' ? 'text-left' : 'text-right'} ${textSecondaryClass}`}>
                        {prod.costPrice.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { maximumFractionDigits: 1 })} {t.currency}
                      </td>

                      {/* Selling Price */}
                      <td className={`p-4 font-mono font-bold ${lang === 'ar' ? 'text-left' : 'text-right'} text-indigo-600 dark:text-indigo-400`}>
                        {prod.sellingPrice.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { maximumFractionDigits: 1 })} {t.currency}
                      </td>

                      {/* Net profit unit */}
                      <td className={`p-4 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>
                        <div className={`font-mono font-bold ${profitUnit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {profitUnit >= 0 ? '+' : ''}{profitUnit.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { maximumFractionDigits: 1 })} {t.currency}
                        </div>
                        <div className={`text-[10px] ${textTertiaryClass} mt-1 space-y-0.5`}>
                          <div>
                            {lang === 'ar' ? 'هامش (من البيع):' : 'Margin (of Sale):'}{' '}
                            <span className="font-bold text-slate-700 dark:text-zinc-300">
                              {prod.sellingPrice > 0 ? ((profitUnit / prod.sellingPrice) * 100).toFixed(0) : 0}%
                            </span>
                          </div>
                          <div>
                            {lang === 'ar' ? 'مربح (من التكلفة):' : 'Markup (of Cost):'}{' '}
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {prod.costPrice > 0 ? ((profitUnit / prod.costPrice) * 100).toFixed(0) : 100}%
                            </span>
                          </div>
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditClick(prod)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 rounded transition cursor-pointer"
                            title={t.invBtnEdit}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setProductToDelete(prod)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition cursor-pointer"
                            title={t.invBtnDelete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Custom Confirmation Modal for Product Deletion */}
      {productToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl border animate-scale-up ${cardBgClass} ${
            lang === 'ar' ? 'text-right' : 'text-left'
          }`}>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mb-4 animate-pulse">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${textPrimaryClass}`}>{t.invDeleteConfirmTitle}</h3>
              <p className={`text-sm mb-6 leading-relaxed ${textSecondaryClass}`}>
                {t.invDeleteConfirmDesc} <strong className={textPrimaryClass}>"{productToDelete.name}"</strong>?
                <br />
                <span className="text-rose-500 font-semibold text-xs">{t.invDeleteConfirmWarn}</span>
              </p>
            </div>
            <div className={`flex gap-3 ${lang === 'ar' ? 'flex-col sm:flex-row-reverse' : 'flex-col sm:flex-row'}`}>
              <button
                type="button"
                onClick={() => {
                  onDeleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2.5 bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition cursor-pointer"
              >
                {t.invDeleteConfirmYes}
              </button>
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className={`w-full inline-flex justify-center rounded-xl border shadow-sm px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                  theme === 'dark' ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t.invDeleteConfirmCancel}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
