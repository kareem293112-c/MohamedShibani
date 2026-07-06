import React, { useState, useMemo } from 'react';
import { Product, Requirement } from '../types';
import { 
  Plus, Trash2, Edit2, Check, Printer, Search, 
  AlertTriangle, ClipboardList, Package, ArrowRight, X, ArrowUpRight, CheckCircle2, Circle
} from 'lucide-react';
import { translations } from '../translations';
import { motion, AnimatePresence } from 'motion/react';

interface RequirementsProps {
  requirements: Requirement[];
  products: Product[];
  onAddRequirement: (req: Requirement) => void;
  onUpdateRequirement: (req: Requirement) => void;
  onDeleteRequirement: (id: string) => void;
  onAddProduct: (prod: Omit<Product, 'id' | 'createdAt'>) => void;
  onUpdateProduct: (prod: Product) => void;
  lang: 'ar' | 'en';
  theme: 'light' | 'dark' | 'eye-care';
}

export default function Requirements({
  requirements,
  products,
  onAddRequirement,
  onUpdateRequirement,
  onDeleteRequirement,
  onAddProduct,
  onUpdateProduct,
  lang,
  theme
}: RequirementsProps) {
  const t = translations[lang];

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'to_buy' | 'purchased'>('all');

  // Form states
  const [editingReq, setEditingReq] = useState<Requirement | null>(null);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [notes, setNotes] = useState('');

  // Mapping / Add to inventory modal states
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState<Requirement | null>(null);
  const [inventoryMappingType, setInventoryMappingType] = useState<'existing' | 'new'>('existing');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newProdSellingPrice, setNewProdSellingPrice] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('');
  const [newProdCostPrice, setNewProdCostPrice] = useState('');

  // Toast / feedback states
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filter low stock items from inventory that aren't already added as active requirements
  const lowStockSuggestions = useMemo(() => {
    return products.filter(prod => {
      // Threshold for low stock is 5 (or 0)
      const isLow = prod.quantityInStock <= 5;
      const isAlreadyAdded = requirements.some(
        req => req.status === 'to_buy' && req.name.toLowerCase() === prod.name.toLowerCase()
      );
      return isLow && !isAlreadyAdded;
    });
  }, [products, requirements]);

  // Form submission (Add or Edit)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || quantity.trim() === '') {
      setErrorToast(t.reqToastFillFields);
      setTimeout(() => setErrorToast(null), 3000);
      return;
    }

    const valQty = parseFloat(quantity);
    if (isNaN(valQty) || valQty <= 0) {
      setErrorToast(lang === 'ar' ? 'يجب أن تكون الكمية أكبر من صفر' : 'Quantity must be greater than zero');
      setTimeout(() => setErrorToast(null), 3000);
      return;
    }

    const valCost = estimatedCost.trim() !== '' ? parseFloat(estimatedCost) : undefined;
    if (valCost !== undefined && (isNaN(valCost) || valCost < 0)) {
      setErrorToast(lang === 'ar' ? 'التكلفة لا يمكن أن تكون قيمة سالبة' : 'Cost cannot be negative');
      setTimeout(() => setErrorToast(null), 3000);
      return;
    }

    if (editingReq) {
      // Edit requirement
      const updated: Requirement = {
        ...editingReq,
        name: name.trim(),
        quantity: valQty,
        estimatedCost: valCost,
        priority,
        notes: notes.trim() || undefined,
      };
      onUpdateRequirement(updated);
      setEditingReq(null);
      setSuccessToast(lang === 'ar' ? '🎉 تم تحديث المتطلب بنجاح!' : '🎉 Requirement updated successfully!');
    } else {
      // Add requirement
      const newReq: Requirement = {
        id: `req-${Date.now()}`,
        name: name.trim(),
        quantity: valQty,
        estimatedCost: valCost,
        priority,
        notes: notes.trim() || undefined,
        status: 'to_buy',
        createdAt: new Date().toISOString(),
      };
      onAddRequirement(newReq);
      setSuccessToast(t.reqToastSuccess);
    }

    // Reset Form fields
    setName('');
    setQuantity('');
    setEstimatedCost('');
    setPriority('medium');
    setNotes('');

    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleStartEdit = (req: Requirement) => {
    setEditingReq(req);
    setName(req.name);
    setQuantity(req.quantity.toString());
    setEstimatedCost(req.estimatedCost !== undefined ? req.estimatedCost.toString() : '');
    setPriority(req.priority);
    setNotes(req.notes || '');
  };

  const handleCancelEdit = () => {
    setEditingReq(null);
    setName('');
    setQuantity('');
    setEstimatedCost('');
    setPriority('medium');
    setNotes('');
  };

  // Add low-stock item directly from suggestions
  const handleAddFromSuggestion = (prod: Product) => {
    // Check if there is already a "purchased" requirement, if yes we can reuse it or create a new "to_buy"
    const newReq: Requirement = {
      id: `req-${Date.now()}`,
      name: prod.name,
      quantity: prod.quantityInStock <= 0 ? 10 : 5, // default reorder quantity
      estimatedCost: prod.costPrice > 0 ? prod.costPrice * (prod.quantityInStock <= 0 ? 10 : 5) : undefined,
      priority: 'high',
      status: 'to_buy',
      notes: lang === 'ar' ? `نقص تلقائي - مخزون حالي: ${prod.quantityInStock === 999999 ? 'غير محدود' : prod.quantityInStock}` : `Auto shortage - Current stock: ${prod.quantityInStock === 999999 ? 'Infinite' : prod.quantityInStock}`,
      createdAt: new Date().toISOString(),
    };
    onAddRequirement(newReq);
    setSuccessToast(t.reqToastSuccess);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Change status of requirement
  const handleToggleStatus = (req: Requirement) => {
    const newStatus = req.status === 'to_buy' ? 'purchased' : 'to_buy';
    const updated: Requirement = {
      ...req,
      status: newStatus
    };
    onUpdateRequirement(updated);
    if (newStatus === 'purchased') {
      setSuccessToast(t.reqToastMarkPurchasedSuccess);
    } else {
      setSuccessToast(lang === 'ar' ? 'تمت إعادة المتطلب إلى قائمة الشراء' : 'Requirement moved back to purchasing list');
    }
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Trigger mapping/modal for pushing to Inventory
  const handleOpenInventoryModal = (req: Requirement) => {
    setSelectedReq(req);
    // Find matching product in stock
    const match = products.find(p => p.name.toLowerCase() === req.name.toLowerCase());
    if (match) {
      setInventoryMappingType('existing');
      setSelectedProductId(match.id);
    } else {
      setInventoryMappingType('new');
      setSelectedProductId('');
      setNewProdCostPrice(req.estimatedCost ? (req.estimatedCost / req.quantity).toString() : '');
      setNewProdSellingPrice('');
      setNewProdCategory('');
    }
    setShowInventoryModal(true);
  };

  // Confirm mapping and add to inventory
  const handleConfirmInventoryPush = () => {
    if (!selectedReq) return;

    if (inventoryMappingType === 'existing') {
      const targetProd = products.find(p => p.id === selectedProductId);
      if (!targetProd) {
        setErrorToast(lang === 'ar' ? 'الرجاء اختيار المنتج من القائمة' : 'Please select a valid product');
        return;
      }
      // Add quantity to existing
      const updatedProd: Product = {
        ...targetProd,
        quantityInStock: (targetProd.quantityInStock === 999999 ? 0 : targetProd.quantityInStock) + selectedReq.quantity
      };
      onUpdateProduct(updatedProd);
      setSuccessToast(t.reqAddedToInventorySuccess);
    } else {
      // Create new product
      if (!newProdSellingPrice.trim()) {
        setErrorToast(lang === 'ar' ? 'الرجاء إدخال سعر البيع للمنتج الجديد' : 'Please enter the selling price for the new product');
        return;
      }
      const cost = newProdCostPrice.trim() !== '' ? parseFloat(newProdCostPrice) : 0;
      const sale = parseFloat(newProdSellingPrice);
      if (isNaN(sale) || sale < 0 || isNaN(cost) || cost < 0) {
        setErrorToast(t.invToastNegative);
        return;
      }

      onAddProduct({
        name: selectedReq.name,
        costPrice: cost,
        sellingPrice: sale,
        quantityInStock: selectedReq.quantity,
        category: newProdCategory.trim() || (lang === 'ar' ? 'عام' : 'General')
      });
      setSuccessToast(t.reqAddedToInventorySuccess);
    }

    // Remove or keep requirement? We can keep it as 'purchased' or safely update its notes to indicate added to stock
    const updatedReq: Requirement = {
      ...selectedReq,
      notes: selectedReq.notes 
        ? `${selectedReq.notes} (${lang === 'ar' ? 'تم تنزيله بالمستودع ✔' : 'Added to stock ✔'})` 
        : (lang === 'ar' ? 'تم تنزيله بالمستودع ✔' : 'Added to stock ✔')
    };
    onUpdateRequirement(updatedReq);

    setShowInventoryModal(false);
    setSelectedReq(null);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Statistics & budget
  const totals = useMemo(() => {
    let toBuyCost = 0;
    let purchasedCost = 0;
    let toBuyCount = 0;
    let purchasedCount = 0;

    requirements.forEach(req => {
      const cost = req.estimatedCost || 0;
      if (req.status === 'to_buy') {
        toBuyCost += cost;
        toBuyCount++;
      } else {
        purchasedCost += cost;
        purchasedCount++;
      }
    });

    return {
      toBuyCost,
      purchasedCost,
      toBuyCount,
      purchasedCount,
      totalCount: requirements.length,
      totalCost: toBuyCost + purchasedCost
    };
  }, [requirements]);

  // Filtered Requirements
  const filteredRequirements = useMemo(() => {
    return requirements.filter(req => {
      const matchesSearch = req.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (req.notes && req.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requirements, searchQuery, statusFilter]);

  // Handle local print trigger
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(lang === 'ar' ? 'يرجى السماح بالنوافذ المنبثقة للطباعة' : 'Please allow popups to print');
      return;
    }

    const titleText = lang === 'ar' ? 'قائمة متطلبات ونواقص المحل' : 'Shop Requirements List';
    const dateStr = new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
    const currencyText = t.currency;

    let itemsHtml = '';
    filteredRequirements.forEach((req, idx) => {
      const priorityText = req.priority === 'high' 
        ? (lang === 'ar' ? 'عاجل' : 'Urgent') 
        : req.priority === 'medium' 
          ? (lang === 'ar' ? 'متوسط' : 'Medium') 
          : (lang === 'ar' ? 'منخفض' : 'Low');

      const statusText = req.status === 'purchased' 
        ? (lang === 'ar' ? 'تم الشراء' : 'Purchased') 
        : (lang === 'ar' ? 'قيد الشراء' : 'To Buy');

      itemsHtml += `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px; font-weight: bold;">${req.name}</td>
          <td style="padding: 10px; text-align: center;">${req.quantity}</td>
          <td style="padding: 10px; text-align: center;">${priorityText}</td>
          <td style="padding: 10px; text-align: right;">${req.estimatedCost ? req.estimatedCost.toLocaleString() + ' ' + currencyText : '-'}</td>
          <td style="padding: 10px; text-align: center;">${statusText}</td>
          <td style="padding: 10px; font-size: 11px; color: #555;">${req.notes || '-'}</td>
        </tr>
      `;
    });

    const isRtl = lang === 'ar';
    printWindow.document.write(`
      <html>
        <head>
          <title>${titleText}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; margin: 30px; direction: ${isRtl ? 'rtl' : 'ltr'}; color: #222; }
            h1 { font-size: 24px; text-align: center; margin-bottom: 5px; }
            h3 { font-size: 14px; text-align: center; color: #666; margin-top: 0; margin-bottom: 25px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #f5f5f5; padding: 12px 10px; border-bottom: 2px solid #ccc; font-weight: bold; }
            .totals { margin-top: 30px; border-top: 2px dashed #999; padding-top: 15px; text-align: ${isRtl ? 'left' : 'right'}; font-size: 16px; }
            @media print {
              body { margin: 10px; }
            }
          </style>
        </head>
        <body>
          <h1>${titleText}</h1>
          <h3>${lang === 'ar' ? 'تم التصدير بتاريخ:' : 'Exported on:'} ${dateStr}</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th style="text-align: ${isRtl ? 'right' : 'left'};">${lang === 'ar' ? 'المادة المطلوبة' : 'Item Name'}</th>
                <th>${lang === 'ar' ? 'الكمية' : 'Qty'}</th>
                <th>${lang === 'ar' ? 'الأهمية' : 'Priority'}</th>
                <th style="text-align: right;">${lang === 'ar' ? 'التكلفة التقديرية' : 'Estimated Cost'}</th>
                <th>${lang === 'ar' ? 'الحالة' : 'Status'}</th>
                <th style="text-align: ${isRtl ? 'right' : 'left'};">${lang === 'ar' ? 'الملاحظات والتفاصيل' : 'Notes'}</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml || `<tr><td colspan="7" style="text-align: center; padding: 30px; color: #888;">${lang === 'ar' ? 'القائمة فارغة حالياً' : 'List is currently empty'}</td></tr>`}
            </tbody>
          </table>
          <div class="totals">
            <strong>${lang === 'ar' ? 'إجمالي الميزانية التقديرية للبنود المعروضة:' : 'Total Estimated Budget for Shown Items:'} </strong>
            <span style="font-size: 18px; font-weight: bold; color: #4f46e5;">
              ${filteredRequirements.reduce((sum, r) => sum + (r.estimatedCost || 0), 0).toLocaleString()} ${currencyText}
            </span>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Theme adaptabilities
  const containerBgClass =
    theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : theme === 'eye-care' ? 'bg-[#fcf8f2] border-[#e6d0a7] text-[#433422]' : 'bg-slate-50 border-slate-100 text-slate-800';

  const cardBgClass =
    theme === 'dark' ? 'bg-zinc-900 border-zinc-800/80 text-zinc-200' : theme === 'eye-care' ? 'bg-[#fbf7f0] border-[#ebdcc3] text-[#4a3b2c]' : 'bg-white border-slate-200/60 text-slate-700';

  const inputClass =
    theme === 'dark' ? 'bg-zinc-850 border-zinc-700 text-zinc-100 focus:border-indigo-500 focus:ring-zinc-800' : theme === 'eye-care' ? 'bg-[#faf6ee] border-[#ebd9b9] text-[#433422] focus:border-amber-800 focus:ring-[#f5ebdb]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-600 focus:ring-slate-100';

  const textPrimaryClass =
    theme === 'dark' ? 'text-zinc-100' : theme === 'eye-care' ? 'text-[#433422]' : 'text-slate-800';

  const textSecondaryClass =
    theme === 'dark' ? 'text-zinc-400' : theme === 'eye-care' ? 'text-[#877259]' : 'text-slate-500';

  const trBorderClass =
    theme === 'dark' ? 'border-zinc-800/60' : theme === 'eye-care' ? 'border-[#ebdcc3]/40' : 'border-slate-100';

  const tableHeaderClass =
    theme === 'dark' ? 'bg-zinc-850 text-zinc-300 border-zinc-800' : theme === 'eye-care' ? 'bg-[#faf2e4] text-[#433422] border-[#ebdcc3]' : 'bg-slate-50 text-slate-700 border-slate-100';

  const secondaryBtnClass =
    theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700' : theme === 'eye-care' ? 'bg-[#f5e6cf] hover:bg-[#ebd9bd] text-[#433422] border border-[#ebdcc3]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200';

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* 1. Header & Description */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-black tracking-tight ${textPrimaryClass}`}>{t.tabRequirements}</h2>
          <p className={`text-xs mt-1.5 leading-relaxed font-medium max-w-2xl ${textSecondaryClass}`}>
            {t.reqDesc}
          </p>
        </div>

        {/* Print Shopping List trigger */}
        <button
          onClick={handlePrint}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${secondaryBtnClass}`}
        >
          <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>{t.reqPrintBtn}</span>
        </button>
      </div>

      {/* 2. Stats Summary Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Cost To Buy */}
        <div className={`p-4 rounded-2xl border shadow-sm ${cardBgClass} flex items-center justify-between`}>
          <div>
            <span className={`text-xs font-semibold ${textSecondaryClass}`}>{lang === 'ar' ? 'ميزانية المشتريات المعلقة' : 'Pending Purchasing Budget'}</span>
            <h3 className="text-xl font-bold mt-1 text-amber-500">{totals.toBuyCost.toLocaleString()} {t.currency}</h3>
            <p className="text-[10px] mt-0.5 text-slate-400">{totals.toBuyCount} {lang === 'ar' ? 'مواد قيد الشراء' : 'items to buy'}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-500">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        {/* Total Cost Purchased */}
        <div className={`p-4 rounded-2xl border shadow-sm ${cardBgClass} flex items-center justify-between`}>
          <div>
            <span className={`text-xs font-semibold ${textSecondaryClass}`}>{lang === 'ar' ? 'تكلفة المواد المشتراة' : 'Purchased Items Total Cost'}</span>
            <h3 className="text-xl font-bold mt-1 text-emerald-500">{totals.purchasedCost.toLocaleString()} {t.currency}</h3>
            <p className="text-[10px] mt-0.5 text-slate-400">{totals.purchasedCount} {lang === 'ar' ? 'مواد تم شراؤها' : 'items purchased'}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Counter Alert */}
        <div className={`p-4 rounded-2xl border shadow-sm ${cardBgClass} flex items-center justify-between sm:col-span-2 lg:col-span-1`}>
          <div>
            <span className={`text-xs font-semibold ${textSecondaryClass}`}>{lang === 'ar' ? 'سلع منخفضة في المخزن حالياً' : 'Items Low in Stock Now'}</span>
            <h3 className={`text-xl font-bold mt-1 ${lowStockSuggestions.length > 0 ? 'text-rose-500' : 'text-indigo-500'}`}>
              {lowStockSuggestions.length} {lang === 'ar' ? 'سلع' : 'products'}
            </h3>
            <p className="text-[10px] mt-0.5 text-slate-400">
              {lowStockSuggestions.length > 0 
                ? (lang === 'ar' ? 'بحاجة لإعادة ملء من المستودع' : 'Needs urgent procurement') 
                : (lang === 'ar' ? 'جميع المستويات ممتازة ✔' : 'All stock levels are optimal')}
            </p>
          </div>
          <div className={`p-3 rounded-xl ${lowStockSuggestions.length > 0 ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-500' : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500'}`}>
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Success & Error Toasts */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-4 py-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{successToast}</span>
          </motion.div>
        )}
        {errorToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 px-4 py-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-sm"
          >
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>{errorToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Split Layout: Forms & Auto Suggestions vs Requirements Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* COLUMN 1: Form & Automatic short stock suggestions */}
        <div className="space-y-6 lg:col-span-1">
          {/* Requirement Add / Edit Form */}
          <div className={`rounded-2xl border p-5 shadow-sm ${cardBgClass}`}>
            <h3 className={`text-sm font-bold border-b pb-3 mb-4 flex items-center gap-2 ${trBorderClass} ${textPrimaryClass}`}>
              <ClipboardList className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
              <span>{editingReq ? t.reqBtnUpdate : t.reqAddNew}</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Item Name */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${textSecondaryClass}`}>{t.reqFieldName}</label>
                <input
                  type="text"
                  placeholder={t.reqFieldNamePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full rounded-xl py-2.5 px-4 text-xs font-medium focus:outline-none transition ${inputClass}`}
                  required
                />
              </div>

              {/* Quantity */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${textSecondaryClass}`}>{t.reqFieldQty}</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder={t.reqFieldQtyPlaceholder}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={`w-full rounded-xl py-2.5 px-4 text-xs font-medium focus:outline-none transition ${inputClass}`}
                  required
                />
              </div>

              {/* Estimated cost */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${textSecondaryClass}`}>{t.reqFieldEstimatedCost}</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder={t.reqFieldEstimatedCostPlaceholder}
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  className={`w-full rounded-xl py-2.5 px-4 text-xs font-medium focus:outline-none transition ${inputClass}`}
                />
              </div>

              {/* Priority level */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${textSecondaryClass}`}>{t.reqFieldPriority}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((p) => {
                    const isActive = priority === p;
                    let activeBtnStyle = '';
                    if (isActive) {
                      if (p === 'high') activeBtnStyle = 'bg-rose-500 text-white';
                      else if (p === 'medium') activeBtnStyle = 'bg-amber-500 text-white';
                      else activeBtnStyle = 'bg-sky-500 text-white';
                    } else {
                      activeBtnStyle = theme === 'dark' ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 'bg-slate-100 text-slate-500 border border-slate-200';
                    }

                    const labelMap = {
                      low: t.reqPriorityLow,
                      medium: t.reqPriorityMedium,
                      high: t.reqPriorityHigh,
                    };

                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-2 px-1 rounded-xl text-[11px] font-bold transition text-center cursor-pointer ${activeBtnStyle}`}
                      >
                        {labelMap[p]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${textSecondaryClass}`}>{t.reqFieldNotes}</label>
                <textarea
                  rows={2}
                  placeholder={t.reqFieldNotesPlaceholder}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full rounded-xl py-2.5 px-4 text-xs font-medium focus:outline-none transition ${inputClass}`}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-grow bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
                >
                  {editingReq ? t.reqBtnUpdate : t.reqBtnAdd}
                </button>
                {editingReq && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer ${secondaryBtnClass}`}
                  >
                    {t.reqBtnCancel}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Low Stock suggestions card */}
          <div className={`rounded-2xl border p-5 shadow-sm ${cardBgClass}`}>
            <h3 className={`text-sm font-bold border-b pb-3 mb-3 flex items-center gap-2 ${trBorderClass} ${textPrimaryClass}`}>
              <AlertTriangle className="w-4.5 h-4.5 text-rose-500 animate-pulse" />
              <span className="text-xs leading-snug">{t.reqLowStockHeader}</span>
            </h3>

            {lowStockSuggestions.length === 0 ? (
              <p className={`text-xs text-center py-4 ${textSecondaryClass}`}>
                {lang === 'ar' ? '✨ ممتاز! لا توجد سلع مهددة بالنفاد غير مسجلة.' : '✨ Excellent! No unlisted shortages detected.'}
              </p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {lowStockSuggestions.map(prod => (
                  <div 
                    key={prod.id} 
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${trBorderClass} hover:bg-slate-500/5 transition`}
                  >
                    <div>
                      <h4 className="font-bold">{prod.name}</h4>
                      <p className="text-[10px] text-rose-500 font-bold mt-0.5">
                        {lang === 'ar' ? 'متبقي:' : 'Left:'} {prod.quantityInStock === 0 ? t.dashOutOfStock : `${prod.quantityInStock} ${t.invUnitPiece}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddFromSuggestion(prod)}
                      className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 p-2 rounded-xl transition cursor-pointer"
                      title={t.reqLowStockBtnAdd}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2 & 3: Filtered requirements ledger list */}
        <div className="space-y-4 lg:col-span-2">
          
          {/* Controls Bar */}
          <div className={`rounded-2xl border p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between ${cardBgClass}`}>
            {/* Search */}
            <div className="relative w-full md:max-w-xs">
              <input
                type="text"
                placeholder={lang === 'ar' ? 'ابحث في قائمة النواقص...' : 'Search missing items list...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full rounded-xl py-2 px-3 text-xs focus:outline-none transition ${inputClass} ${
                  lang === 'ar' ? 'pl-9 pr-4' : 'pr-9 pl-4'
                }`}
              />
              <Search className={`w-4 h-4 text-slate-400 absolute top-2.5 ${lang === 'ar' ? 'left-3' : 'right-3'}`} />
            </div>

            {/* Status Filter Tab buttons */}
            <div className={`p-1 rounded-xl flex border gap-1 w-full md:w-auto ${trBorderClass}`}>
              {(['all', 'to_buy', 'purchased'] as const).map(status => {
                const isActive = statusFilter === status;
                const labels = {
                  all: t.reqStatusAll,
                  to_buy: t.reqStatusToBuy,
                  purchased: t.reqStatusPurchased
                };
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`flex-grow md:flex-none text-center py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200'
                    }`}
                  >
                    {labels[status]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Requirements Ledger table */}
          <div className={`rounded-2xl border shadow-sm overflow-hidden ${cardBgClass}`}>
            {filteredRequirements.length === 0 ? (
              <div className={`text-center py-16 flex flex-col items-center justify-center ${textSecondaryClass}`}>
                <ClipboardList className="w-12 h-12 text-slate-300 dark:text-zinc-700 mb-3" />
                <p className="text-sm font-bold">{t.reqNoRequirements}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right whitespace-nowrap">
                  <thead>
                    <tr className={`border-b text-slate-500 font-bold ${tableHeaderClass}`}>
                      <th className={`p-3.5 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t.reqTableHeaderItem}</th>
                      <th className="p-3.5 text-center">{t.reqTableHeaderQty}</th>
                      <th className="p-3.5 text-center">{t.reqTableHeaderPriority}</th>
                      <th className="p-3.5 text-left">{t.reqTableHeaderCost}</th>
                      <th className="p-3.5 text-center">{t.reqTableHeaderStatus}</th>
                      <th className="p-3.5 text-center">{t.reqTableHeaderActions}</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${trBorderClass}`}>
                    {filteredRequirements.map((req) => {
                      // Check priority colors
                      let priorityBadge = '';
                      if (req.priority === 'high') {
                        priorityBadge = 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40';
                      } else if (req.priority === 'medium') {
                        priorityBadge = 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40';
                      } else {
                        priorityBadge = 'bg-sky-50 text-sky-600 border border-sky-100 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/40';
                      }

                      // Label priority
                      const pLabel = req.priority === 'high' ? t.reqPriorityHigh : req.priority === 'medium' ? t.reqPriorityMedium : t.reqPriorityLow;

                      return (
                        <tr 
                          key={req.id} 
                          className={`hover:bg-slate-500/5 transition ${
                            req.status === 'purchased' ? 'opacity-80' : ''
                          }`}
                        >
                          {/* Item Name */}
                          <td className={`p-3.5 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                            <div className="font-bold text-slate-900 dark:text-zinc-100 text-sm">{req.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 max-w-xs overflow-hidden text-ellipsis whitespace-normal leading-tight">
                              {req.notes || '-'}
                            </div>
                          </td>

                          {/* Quantity */}
                          <td className="p-3.5 text-center font-mono font-bold text-slate-800 dark:text-zinc-200">
                            {req.quantity}
                          </td>

                          {/* Priority */}
                          <td className="p-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold inline-block ${priorityBadge}`}>
                              {pLabel}
                            </span>
                          </td>

                          {/* Estimated cost */}
                          <td className="p-3.5 text-left font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {req.estimatedCost !== undefined 
                              ? `${req.estimatedCost.toLocaleString()} ${t.currency}` 
                              : '-'}
                          </td>

                          {/* Status */}
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => handleToggleStatus(req)}
                              className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-[10px] font-black tracking-tight transition cursor-pointer mx-auto ${
                                req.status === 'purchased'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {req.status === 'purchased' ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span>{t.reqStatusPurchased}</span>
                                </>
                              ) : (
                                <>
                                  <Circle className="w-2.5 h-2.5 fill-current text-amber-500 animate-pulse" />
                                  <span>{t.reqStatusToBuy}</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* 📥 Add stock to Inventory (Visible only when purchased) */}
                              {req.status === 'purchased' && (
                                <button
                                  onClick={() => handleOpenInventoryModal(req)}
                                  className="p-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg transition flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                                  title={t.reqBtnAddToInventory}
                                >
                                  <Package className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">{t.reqBtnAddToInventory}</span>
                                </button>
                              )}

                              {/* Edit */}
                              <button
                                onClick={() => handleStartEdit(req)}
                                className="p-1.5 hover:bg-slate-500/10 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-lg transition cursor-pointer"
                                title={lang === 'ar' ? 'تعديل' : 'Edit'}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => {
                                  if (confirm(t.reqDeleteConfirmDesc)) {
                                    onDeleteRequirement(req.id);
                                    if (editingReq && editingReq.id === req.id) {
                                      handleCancelEdit();
                                    }
                                  }
                                }}
                                className="p-1.5 hover:bg-rose-500/10 text-rose-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                                title={lang === 'ar' ? 'حذف' : 'Delete'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 📥 5. Integration Modal: Map & push purchased requirement to warehouse stock */}
      {showInventoryModal && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInventoryModal(false)}></div>
          
          {/* Modal Content */}
          <div className={`relative max-w-md w-full rounded-2xl border p-6 shadow-xl z-10 space-y-5 ${cardBgClass}`}>
            <div className="flex justify-between items-center pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className={`text-md font-black flex items-center gap-2 ${textPrimaryClass}`}>
                <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>{t.reqBtnAddToInventory}</span>
              </h3>
              <button onClick={() => setShowInventoryModal(false)} className={`p-1 rounded-lg hover:bg-slate-500/15 transition cursor-pointer ${textSecondaryClass}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-2 leading-relaxed">
              <p>
                {lang === 'ar' ? 'أنت على وشك إضافة المادة:' : 'You are about to transfer the purchased item:'}{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">{selectedReq.name}</strong>
              </p>
              <p>
                {lang === 'ar' ? 'الكمية المستلمة للشحن:' : 'Quantity to load into warehouse:'}{' '}
                <strong className="font-mono text-emerald-500">{selectedReq.quantity}</strong>
              </p>
            </div>

            {/* Selection between mapping to existing OR creating new product */}
            <div className={`grid grid-cols-2 gap-2 p-1 border rounded-xl ${trBorderClass}`}>
              <button
                type="button"
                onClick={() => setInventoryMappingType('existing')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                  inventoryMappingType === 'existing' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200'
                }`}
              >
                {lang === 'ar' ? 'تحديث سلعة حالية' : 'Update Existing Item'}
              </button>
              <button
                type="button"
                onClick={() => setInventoryMappingType('new')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                  inventoryMappingType === 'new' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200'
                }`}
              >
                {lang === 'ar' ? 'تسجيل كمنتج جديد' : 'Register New Product'}
              </button>
            </div>

            {/* Existing product selection form */}
            {inventoryMappingType === 'existing' ? (
              <div className="space-y-3">
                <label className={`block text-xs font-bold ${textSecondaryClass}`}>
                  {lang === 'ar' ? 'اختر المنتج من المستودع لتحديث رصيده:' : 'Choose warehouse item to restock:'}
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className={`w-full rounded-xl py-2.5 px-4 text-xs font-medium focus:outline-none transition ${inputClass}`}
                >
                  <option value="">{lang === 'ar' ? '-- اختر منتجاً --' : '-- Choose a product --'}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({lang === 'ar' ? 'المخزون الحالي:' : 'Current:'} {p.quantityInStock === 999999 ? '∞' : p.quantityInStock})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              // New product detailed input form
              <div className="space-y-4">
                {/* Cost Price */}
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${textSecondaryClass}`}>{t.invFieldCost}</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={t.invFieldCostPlaceholder}
                    value={newProdCostPrice}
                    onChange={(e) => setNewProdCostPrice(e.target.value)}
                    className={`w-full rounded-xl py-2.5 px-4 text-xs font-medium focus:outline-none transition ${inputClass}`}
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${textSecondaryClass}`}>{t.invFieldSelling}</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={t.invFieldSellingPlaceholder}
                    value={newProdSellingPrice}
                    onChange={(e) => setNewProdSellingPrice(e.target.value)}
                    className={`w-full rounded-xl py-2.5 px-4 text-xs font-medium focus:outline-none transition ${inputClass}`}
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${textSecondaryClass}`}>{t.invFieldCategory}</label>
                  <input
                    type="text"
                    placeholder={lang === 'ar' ? 'مثال: بقالة، منظفات...' : 'e.g., Grocery, Detergents...'}
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className={`w-full rounded-xl py-2.5 px-4 text-xs font-medium focus:outline-none transition ${inputClass}`}
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-2.5 pt-3">
              <button
                type="button"
                onClick={handleConfirmInventoryPush}
                className="flex-grow bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
              >
                {lang === 'ar' ? 'إضافة إلى المستودع' : 'Confirm Stock Receipt'}
              </button>
              <button
                type="button"
                onClick={() => setShowInventoryModal(false)}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer ${secondaryBtnClass}`}
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
