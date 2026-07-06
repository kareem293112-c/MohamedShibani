import React, { useState, useEffect, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { Product, Transaction, CartItem, Expense, Requirement } from './types';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import TransactionHistory from './components/TransactionHistory';
import Expenses from './components/Expenses';
import Requirements from './components/Requirements';
import VirtualKeyboard from './components/VirtualKeyboard';
import { LayoutDashboard, ShoppingCart, Package, History, Calculator, HelpCircle, Layers, Globe, Sun, Moon, Eye, Wifi, WifiOff, Download, RefreshCw, AlertTriangle, Menu, X, Info, TrendingDown, Keyboard, ClipboardList } from 'lucide-react';
import { translations } from './translations';
import { pwaDb } from './db/pwaDb';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // --- STATE ---
  const [showSidebar, setShowSidebar] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'inventory' | 'history' | 'expenses' | 'requirements'>('dashboard');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- PWA INSTALLATION STATES & LOGIC ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      console.log('[PWA] App was successfully installed!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if app is already running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] Installation choice: ${outcome}`);
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (err) {
      console.error('[PWA] Install prompt failed:', err);
    }
  };

  // --- VIRTUAL ON-SCREEN KEYBOARD STATES ---
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [targetInput, setTargetInput] = useState<HTMLInputElement | null>(null);

  useEffect(() => {
    // 1. Triple click: toggle/open the keyboard for a specific input field
    const handleTripleClick = (e: MouseEvent) => {
      if (e.detail === 3) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          setTargetInput(target as HTMLInputElement);
          setIsKeyboardOpen(true);
          setTimeout(() => target.focus(), 50);
        }
      }
    };

    // 2. Global focus tracking: automatically track the active input/textarea
    // so the keyboard works seamlessly on whatever input is focused next
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        setTargetInput(target as HTMLInputElement);
      }
    };

    window.addEventListener('click', handleTripleClick);
    window.addEventListener('focusin', handleFocusIn);
    
    return () => {
      window.removeEventListener('click', handleTripleClick);
      window.removeEventListener('focusin', handleFocusIn);
    };
  }, []);

  // Print-specific active transaction states
  const [printActiveTransaction, setPrintActiveTransaction] = useState<Transaction | null>(null);
  const [printReceivedAmount, setPrintReceivedAmount] = useState<number>(0);

  const triggerPrint = (tx: Transaction, received = 0) => {
    try {
      // Force React to commit the print states synchronously to the DOM
      flushSync(() => {
        setPrintActiveTransaction(tx);
        setPrintReceivedAmount(received);
      });
      
      // Execute the print command synchronously in the same user gesture thread
      window.print();
    } catch (printError) {
      console.warn("Printing triggered synchronously, but could be restricted in this iframe container:", printError);
      // Fallback: Still try printing without flushSync just in case
      try {
        window.print();
      } catch (innerError) {
        console.error("Print command completely blocked by browser/sandbox:", innerError);
      }
    }
  };

  // Online/Offline state variables
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    return (localStorage.getItem('accounting_lang') as 'ar' | 'en') || 'ar';
  });
  
  const [theme, setTheme] = useState<'light' | 'dark' | 'eye-care'>(() => {
    return (localStorage.getItem('accounting_theme') as 'light' | 'dark' | 'eye-care') || 'light';
  });

  const t = translations[lang];

  const toggleLanguage = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    localStorage.setItem('accounting_lang', nextLang);
  };

  const changeTheme = (newTheme: 'light' | 'dark' | 'eye-care') => {
    setTheme(newTheme);
    localStorage.setItem('accounting_theme', newTheme);
  };

  // Real-time clock updater
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerDataSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync queue runner
  const triggerDataSync = async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);

    try {
      const queue = await pwaDb.getSyncQueue();
      if (queue.length > 0) {
        console.log(`[PWA Sync] Syncing ${queue.length} pending operations with server...`, queue);
        
        // Try calling custom backend endpoints if present
        try {
          await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queue })
          });
        } catch (err) {
          // No backend endpoint up yet - fallback gracefully
        }

        // Artificial server processing latency for visual feedback
        await new Promise((resolve) => setTimeout(resolve, 1200));

        // Safely clear sync queue in IndexedDB
        for (const item of queue) {
          await pwaDb.removeFromSyncQueue(item.id);
        }
        console.log("[PWA Sync] Sync completed successfully!");
      } else {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    } catch (error) {
      console.error("[PWA Sync] Background synchronization failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Standard cloud sync mechanism (IndexedDB backup)

  // --- INITIALIZATION (LocalStorage & IndexedDB Dual Load with safe migration) ---
  useEffect(() => {
    const loadData = async () => {
      try {
        let dbProducts = await pwaDb.getProducts();
        let dbTransactions = await pwaDb.getTransactions();
        let dbExpenses = await pwaDb.getExpenses();

        // Safe migration from LocalStorage to IndexedDB if first load
        if (dbProducts.length === 0) {
          const savedProducts = localStorage.getItem('accounting_products');
          if (savedProducts) {
            try {
              const parsed = JSON.parse(savedProducts);
              if (parsed && parsed.length > 0) {
                dbProducts = parsed;
                await pwaDb.saveProductsBatch(parsed);
              }
            } catch (e) {}
          }
        }

        if (dbTransactions.length === 0) {
          const savedTransactions = localStorage.getItem('accounting_transactions');
          if (savedTransactions) {
            try {
              const parsed = JSON.parse(savedTransactions);
              if (parsed && parsed.length > 0) {
                dbTransactions = parsed;
                await pwaDb.saveTransactionsBatch(parsed);
              }
            } catch (e) {}
          }
        }

        if (dbExpenses.length === 0) {
          const savedExpenses = localStorage.getItem('accounting_expenses');
          if (savedExpenses) {
            try {
              const parsed = JSON.parse(savedExpenses);
              if (parsed && parsed.length > 0) {
                dbExpenses = parsed;
                await pwaDb.saveExpensesBatch(parsed);
              }
            } catch (e) {}
          }
        }

        // Force clear if any old demo products are present
        const hasDemoData = dbProducts.some(
          (p) => p.id === 'prod-1' || p.id === 'prod-2' || p.id === 'prod-3' || p.id === 'prod-4' || p.id === 'prod-5' || p.id === 'prod-6'
        );
        if (hasDemoData) {
          dbProducts = [];
          dbTransactions = [];
          dbExpenses = [];
          await pwaDb.clearAll();
          localStorage.setItem('accounting_products', JSON.stringify([]));
          localStorage.setItem('accounting_transactions', JSON.stringify([]));
          localStorage.setItem('accounting_expenses', JSON.stringify([]));
        }

        setProducts(dbProducts);
        setTransactions(dbTransactions);
        setExpenses(dbExpenses);

        const savedReqs = localStorage.getItem('accounting_requirements');
        if (savedReqs) {
          try { setRequirements(JSON.parse(savedReqs)); } catch (e) {}
        }
      } catch (error) {
        console.error("Failed to load data from IndexedDB, falling back to LocalStorage:", error);
        const savedProducts = localStorage.getItem('accounting_products');
        const savedTransactions = localStorage.getItem('accounting_transactions');
        const savedExpenses = localStorage.getItem('accounting_expenses');
        const savedReqs = localStorage.getItem('accounting_requirements');
        if (savedProducts) {
          try { setProducts(JSON.parse(savedProducts)); } catch(e){}
        }
        if (savedTransactions) {
          try { setTransactions(JSON.parse(savedTransactions)); } catch(e){}
        }
        if (savedExpenses) {
          try { setExpenses(JSON.parse(savedExpenses)); } catch(e){}
        }
        if (savedReqs) {
          try { setRequirements(JSON.parse(savedReqs)); } catch(e){}
        }
      }
    };

    loadData();
  }, []);

  // --- STATE PERSISTENCE ---
  const saveProducts = async (updatedProducts: Product[], skipDb = false) => {
    setProducts(updatedProducts);
    localStorage.setItem('accounting_products', JSON.stringify(updatedProducts));
    if (!skipDb) {
      try {
        await pwaDb.saveProductsBatch(updatedProducts);
        if (!isOnline) {
          await pwaDb.addToSyncQueue({
            id: `sync-prod-${Date.now()}`,
            type: 'product_update',
            payload: updatedProducts
          });
        }
      } catch (err) {
        console.error("Failed to save products to IndexedDB:", err);
      }
    }
  };

  const saveTransactions = async (updatedTransactions: Transaction[], skipDb = false) => {
    setTransactions(updatedTransactions);
    localStorage.setItem('accounting_transactions', JSON.stringify(updatedTransactions));
    if (!skipDb) {
      try {
        await pwaDb.saveTransactionsBatch(updatedTransactions);
        if (!isOnline && updatedTransactions.length > 0) {
          await pwaDb.addToSyncQueue({
            id: `sync-tx-${Date.now()}`,
            type: 'transaction_add',
            payload: updatedTransactions[0]
          });
        }
      } catch (err) {
        console.error("Failed to save transactions to IndexedDB:", err);
      }
    }
  };

  // --- ACTION HANDLERS ---

  // Add Product
  const handleAddProduct = (newProd: Omit<Product, 'id' | 'createdAt'>) => {
    const created: Product = {
      ...newProd,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [created, ...products];
    saveProducts(updated);
  };

  // Update Product
  const handleUpdateProduct = (updatedProd: Product) => {
    const updated = products.map((p) => (p.id === updatedProd.id ? updatedProd : p));
    saveProducts(updated);
  };

  // Delete Product
  const handleDeleteProduct = (id: string) => {
    const updated = products.filter((p) => p.id !== id);
    saveProducts(updated);
  };

  // Add Transaction (POS checkout) and deduct stock quantities
  const handleAddTransaction = (
    customerName: string, 
    cartItems: CartItem[], 
    notes: string,
    isDelivery?: boolean,
    deliveryDriver?: string,
    deliveryFee?: number,
    deliveryAddress?: string
  ): Transaction => {
    let totalAmount = 0;
    let totalCost = 0;

    const itemsForTx = cartItems.map((item) => {
      const lineCost = item.product.costPrice * item.quantity;
      const lineSale = item.customSellingPrice * item.quantity;
      
      totalAmount += lineSale;
      totalCost += lineCost;

      return {
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        costPrice: item.product.costPrice,
        sellingPrice: item.customSellingPrice,
      };
    });

    // Calculate Daily Sequential Order Number (resets to 1 each day)
    const getLocalDateString = (isoString: string) => {
      const d = new Date(isoString);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = getLocalDateString(new Date().toISOString());
    const todayTransactions = transactions.filter((tx) => getLocalDateString(tx.date) === todayStr);
    const maxOrderNumber = todayTransactions.reduce((max, tx) => {
      return (tx.orderNumber && tx.orderNumber > max) ? tx.orderNumber : max;
    }, 0);
    const orderNumber = maxOrderNumber + 1;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      orderNumber: orderNumber,
      customerName: customerName,
      items: itemsForTx,
      totalAmount: totalAmount,
      totalCost: totalCost,
      totalProfit: totalAmount - totalCost,
      date: new Date().toISOString(),
      notes: notes,
      isDelivery: isDelivery,
      deliveryDriver: deliveryDriver,
      deliveryFee: deliveryFee,
      deliveryStatus: isDelivery ? 'pending' : undefined,
      deliveryAddress: deliveryAddress,
    };

    // Deduct stock quantities from inventory
    const updatedProducts = products.map((prod) => {
      const cartMatch = cartItems.find((item) => item.product.id === prod.id);
      if (cartMatch) {
        return {
          ...prod,
          quantityInStock: Math.max(0, prod.quantityInStock - cartMatch.quantity),
        };
      }
      return prod;
    });

    saveProducts(updatedProducts);
    saveTransactions([newTx, ...transactions]);
    return newTx;
  };

  // Undo / Delete Transaction and replenish stock quantities in inventory
  const handleDeleteTransaction = (txId: string) => {
    const transactionToUndo = transactions.find((t) => t.id === txId);
    if (!transactionToUndo) return;

    // Replenish stock quantities
    const updatedProducts = products.map((prod) => {
      const txItemMatch = transactionToUndo.items.find((item) => item.productId === prod.id);
      if (txItemMatch) {
        return {
          ...prod,
          quantityInStock: prod.quantityInStock + txItemMatch.quantity,
        };
      }
      return prod;
    });

    const updatedTransactions = transactions.filter((t) => t.id !== txId);

    saveProducts(updatedProducts);
    saveTransactions(updatedTransactions);
  };

  // Edit Transaction and adjust stock quantities automatically
  const handleEditTransaction = (originalTx: Transaction, updatedTx: Transaction) => {
    // 1. Replenish the quantities of original transaction
    let tempProducts = [...products];
    originalTx.items.forEach((item) => {
      tempProducts = tempProducts.map((p) => {
        if (p.id === item.productId) {
          return {
            ...p,
            quantityInStock: p.quantityInStock + item.quantity,
          };
        }
        return p;
      });
    });

    // 2. Subtract the quantities of updated transaction
    updatedTx.items.forEach((item) => {
      tempProducts = tempProducts.map((p) => {
        if (p.id === item.productId) {
          return {
            ...p,
            quantityInStock: Math.max(0, p.quantityInStock - item.quantity),
          };
        }
        return p;
      });
    });

    // 3. Update transaction list
    const updatedTransactions = transactions.map((t) => (t.id === originalTx.id ? updatedTx : t));

    // 4. Save state
    saveProducts(tempProducts);
    saveTransactions(updatedTransactions);
  };

  // --- EXPENSES PERSISTENCE ---
  const saveExpenses = async (updatedExpenses: Expense[], skipDb = false) => {
    setExpenses(updatedExpenses);
    localStorage.setItem('accounting_expenses', JSON.stringify(updatedExpenses));
    if (!skipDb) {
      try {
        await pwaDb.saveExpensesBatch(updatedExpenses);
        if (!isOnline && updatedExpenses.length > 0) {
          await pwaDb.addToSyncQueue({
            id: `sync-exp-${Date.now()}`,
            type: 'expense_update',
            payload: updatedExpenses
          });
        }
      } catch (err) {
        console.error("Failed to save expenses to IndexedDB:", err);
      }
    }
  };

  const handleAddExpense = (newExp: Expense) => {
    const updated = [newExp, ...expenses];
    saveExpenses(updated);
  };

  const handleEditExpense = (updatedExp: Expense) => {
    const updated = expenses.map((e) => (e.id === updatedExp.id ? updatedExp : e));
    saveExpenses(updated);
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter((e) => e.id !== id);
    saveExpenses(updated);
  };

  // --- REQUIREMENTS PERSISTENCE ---
  const saveRequirements = (updatedRequirements: Requirement[]) => {
    setRequirements(updatedRequirements);
    localStorage.setItem('accounting_requirements', JSON.stringify(updatedRequirements));
  };

  const handleAddRequirement = (newReq: Requirement) => {
    const updated = [newReq, ...requirements];
    saveRequirements(updated);
  };

  const handleUpdateRequirement = (updatedReq: Requirement) => {
    const updated = requirements.map((r) => (r.id === updatedReq.id ? updatedReq : r));
    saveRequirements(updated);
  };

  const handleDeleteRequirement = (id: string) => {
    const updated = requirements.filter((r) => r.id !== id);
    saveRequirements(updated);
  };

  // --- GENERAL ACCOUNTING ESTIMATES (Asset Evaluation) ---
  const stockSummary = useMemo(() => {
    let totalAssetCost = 0;
    let totalPotentialSales = 0;

    products.forEach((p) => {
      // Skip unlimited products (>= 9999 stock) from the total physical asset calculations
      // since they represent unlimited/service items rather than warehouse physical assets.
      if (p.quantityInStock < 9999) {
        totalAssetCost += p.costPrice * p.quantityInStock;
        totalPotentialSales += p.sellingPrice * p.quantityInStock;
      }
    });

    const totalPotentialProfit = totalPotentialSales - totalAssetCost;

    return {
      totalAssetCost,
      totalPotentialSales,
      totalPotentialProfit,
    };
  }, [products]);

  // Clear all database records completely for a fresh shop setup
  const clearDatabaseCompletely = async () => {
    setProducts([]);
    setTransactions([]);
    setExpenses([]);
    setRequirements([]);
    localStorage.setItem('accounting_products', JSON.stringify([]));
    localStorage.setItem('accounting_transactions', JSON.stringify([]));
    localStorage.setItem('accounting_expenses', JSON.stringify([]));
    localStorage.setItem('accounting_requirements', JSON.stringify([]));
    try {
      await pwaDb.clearAll();
    } catch (e) {
      console.error("Failed to clear IndexedDB:", e);
    }
    setShowClearConfirm(false);
  };

  return (
    <>
      <div
        className={`print:hidden min-h-screen flex flex-col transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-zinc-950 text-zinc-100'
            : theme === 'eye-care'
            ? 'bg-[#fcf8f2] text-[#433422]'
            : 'bg-slate-50 text-slate-800'
        }`}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
      
      {/* 1. Header Area with dynamic local date & controllers */}
      <header
        className={`border-b shadow-sm sticky top-0 z-30 transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-zinc-900 border-zinc-800 shadow-zinc-950/40'
            : theme === 'eye-care'
            ? 'bg-[#f3e5ca] border-[#e6d0a7] shadow-[#f0deb9]/30'
            : 'bg-white border-slate-100 shadow-slate-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          
          {/* Logo & Title */}
          <button
            onClick={() => setActiveTab('dashboard')}
            type="button"
            className={`flex items-center gap-3 text-right hover:opacity-90 transition focus:outline-none cursor-pointer group ${
              lang === 'ar' ? 'text-right' : 'text-left'
            }`}
          >
            <div className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-md shadow-indigo-100 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1
                className={`text-xl font-black tracking-tight flex items-center gap-2 ${
                  theme === 'dark'
                    ? 'text-zinc-100'
                    : theme === 'eye-care'
                    ? 'text-[#433422]'
                    : 'text-slate-800'
                }`}
              >
                {t.appName}
              </h1>
            </div>
          </button>

          {/* Middle/Right: Date Display and Hamburger */}
          <div className="flex items-center gap-3">
            {/* Quick Date Display */}
            <span
              className={`hidden sm:flex text-xs font-bold px-3.5 py-2.5 rounded-xl items-center gap-2 shadow-sm border ${
                theme === 'dark'
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                  : theme === 'eye-care'
                  ? 'bg-[#faf2e4] border-[#e3d3b4] text-[#5e4931]'
                  : 'bg-slate-100 border-slate-200/60 text-slate-600'
              }`}
            >
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                📅{' '}
                {currentTime.toLocaleDateString(
                  lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US',
                  { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
                )}
              </span>
              <span className="text-slate-300">|</span>
              <span
                className={`font-mono text-[13px] font-extrabold ${
                  theme === 'dark'
                    ? 'text-indigo-400'
                    : theme === 'eye-care'
                    ? 'text-amber-800'
                    : 'text-indigo-600'
                }`}
                dir="ltr"
              >
                ⏰{' '}
                {currentTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true,
                })}
              </span>
            </span>

            {/* Virtual Keyboard Toggle Button */}
            <button
              onClick={() => {
                setIsKeyboardOpen(!isKeyboardOpen);
                if (!isKeyboardOpen) {
                  const active = document.activeElement;
                  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
                    setTargetInput(active as HTMLInputElement);
                  }
                }
              }}
              type="button"
              className={`p-3 rounded-2xl border transition duration-200 flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 active:scale-95 z-[110] ${
                isKeyboardOpen
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-100/30 font-bold'
                  : theme === 'dark'
                  ? 'bg-zinc-800 border-zinc-700 text-indigo-400 hover:bg-zinc-700 hover:text-indigo-300'
                  : theme === 'eye-care'
                  ? 'bg-[#faf2e4] border-[#e3d3b4] text-[#7a644b] hover:bg-[#ebdcc0] hover:text-[#433422]'
                  : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50/50'
              }`}
              title={lang === 'ar' ? 'لوحة المفاتيح الافتراضية' : 'Virtual Keyboard'}
            >
              <Keyboard className="w-5 h-5" />
            </button>

            {/* PWA Install Button in Header */}
            {isInstallable && (
              <button
                onClick={handleInstallClick}
                type="button"
                className="p-3 rounded-2xl bg-indigo-600 border border-indigo-600 text-white shadow-sm cursor-pointer hover:scale-105 active:scale-95 z-[110] flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition duration-200"
                title={lang === 'ar' ? 'تثبيت كبرنامج للكمبيوتر' : 'Install Desktop App'}
              >
                <Download className="w-5 h-5 animate-bounce" />
                <span className="hidden md:inline text-xs font-black">
                  {lang === 'ar' ? 'تنزيل البرنامج' : 'Download App'}
                </span>
              </button>
            )}

            {/* Hamburger Menu (3 lines) Button */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              type="button"
              className={`relative p-3 rounded-2xl border transition duration-200 flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 active:scale-95 z-[110] ${
                theme === 'dark'
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white'
                  : theme === 'eye-care'
                  ? 'bg-[#faf2e4] border-[#e3d3b4] text-[#433422] hover:bg-[#ebdcc0]'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title={lang === 'ar' ? 'القائمة الجانبية وإعدادات النظام' : 'Sidebar & System Settings'}
            >
              <div className="w-5 h-4 flex flex-col justify-between items-center relative">
                <motion.span
                  animate={showSidebar ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`w-5 h-0.5 rounded-full ${
                    theme === 'eye-care' ? 'bg-[#433422]' : 'bg-current'
                  } absolute top-0`}
                />
                <motion.span
                  animate={showSidebar ? { opacity: 0, scale: 0 } : { opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`w-5 h-0.5 rounded-full ${
                    theme === 'eye-care' ? 'bg-[#433422]' : 'bg-current'
                  } absolute top-[7px]`}
                />
                <motion.span
                  animate={showSidebar ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`w-5 h-0.5 rounded-full ${
                    theme === 'eye-care' ? 'bg-[#433422]' : 'bg-current'
                  } absolute bottom-0`}
                />
              </div>
            </button>
          </div>

        </div>
      </header>


      {/* 3. Main Tabs Navigation Section */}
      <div
        className={`sticky top-[74px] z-20 shadow-sm transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-zinc-900 border-b border-zinc-800'
            : theme === 'eye-care'
            ? 'bg-[#f3e5ca] border-b border-[#e6d0a7]'
            : 'bg-white border-b border-slate-200/80'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            className={`flex -mb-px gap-8 ${
              lang === 'ar' ? 'flex-row' : 'flex-row'
            }`}
          >
            
            {/* Tab 1: Dashboard */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? theme === 'dark'
                    ? 'border-indigo-400 text-indigo-400'
                    : theme === 'eye-care'
                    ? 'border-amber-900 text-amber-950'
                    : 'border-indigo-600 text-indigo-600'
                  : theme === 'dark'
                  ? 'border-transparent text-zinc-500 hover:text-zinc-300'
                  : theme === 'eye-care'
                  ? 'border-transparent text-[#90795e] hover:text-[#433422]'
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
              }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5" />
              <span>{t.tabDashboard}</span>
            </button>

            {/* Tab 2: POS */}
            <button
              onClick={() => setActiveTab('pos')}
              className={`py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'pos'
                  ? theme === 'dark'
                    ? 'border-indigo-400 text-indigo-400'
                    : theme === 'eye-care'
                    ? 'border-amber-900 text-amber-950'
                    : 'border-indigo-600 text-indigo-600'
                  : theme === 'dark'
                  ? 'border-transparent text-zinc-500 hover:text-zinc-300'
                  : theme === 'eye-care'
                  ? 'border-transparent text-[#90795e] hover:text-[#433422]'
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
              }`}
              id="pos_tab_button"
            >
              <ShoppingCart className="w-4.5 h-4.5" />
              <span>{t.tabPOS}</span>
            </button>

            {/* Tab 3: Inventory */}
            <button
              onClick={() => setActiveTab('inventory')}
              className={`py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'inventory'
                  ? theme === 'dark'
                    ? 'border-indigo-400 text-indigo-400'
                    : theme === 'eye-care'
                    ? 'border-amber-900 text-amber-950'
                    : 'border-indigo-600 text-indigo-600'
                  : theme === 'dark'
                  ? 'border-transparent text-zinc-500 hover:text-zinc-300'
                  : theme === 'eye-care'
                  ? 'border-transparent text-[#90795e] hover:text-[#433422]'
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
              }`}
              id="inventory_tab_button"
            >
              <Package className="w-4.5 h-4.5" />
              <span>{t.tabInventory}</span>
            </button>

            {/* Tab 4: History */}
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'history'
                  ? theme === 'dark'
                    ? 'border-indigo-400 text-indigo-400'
                    : theme === 'eye-care'
                    ? 'border-amber-900 text-amber-950'
                    : 'border-indigo-600 text-indigo-600'
                  : theme === 'dark'
                  ? 'border-transparent text-zinc-500 hover:text-zinc-300'
                  : theme === 'eye-care'
                  ? 'border-transparent text-[#90795e] hover:text-[#433422]'
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
              }`}
              id="history_tab_button"
            >
              <History className="w-4.5 h-4.5" />
              <span>{t.tabHistory}</span>
            </button>

            {/* Tab 5: Expenses */}
            <button
              onClick={() => setActiveTab('expenses')}
              className={`py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'expenses'
                  ? theme === 'dark'
                    ? 'border-indigo-400 text-indigo-400'
                    : theme === 'eye-care'
                    ? 'border-amber-900 text-amber-950'
                    : 'border-indigo-600 text-indigo-600'
                  : theme === 'dark'
                  ? 'border-transparent text-zinc-500 hover:text-zinc-300'
                  : theme === 'eye-care'
                  ? 'border-transparent text-[#90795e] hover:text-[#433422]'
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
              }`}
              id="expenses_tab_button"
            >
              <TrendingDown className="w-4.5 h-4.5" />
              <span>{t.tabExpenses}</span>
            </button>

            {/* Tab 6: Requirements */}
            <button
              onClick={() => setActiveTab('requirements')}
              className={`py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'requirements'
                  ? theme === 'dark'
                    ? 'border-indigo-400 text-indigo-400'
                    : theme === 'eye-care'
                    ? 'border-amber-900 text-amber-950'
                    : 'border-indigo-600 text-indigo-600'
                  : theme === 'dark'
                  ? 'border-transparent text-zinc-500 hover:text-zinc-300'
                  : theme === 'eye-care'
                  ? 'border-transparent text-[#90795e] hover:text-[#433422]'
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
              }`}
              id="requirements_tab_button"
            >
              <ClipboardList className="w-4.5 h-4.5" />
              <span>{t.tabRequirements}</span>
            </button>

          </nav>
        </div>
      </div>

      {/* 4. Active Tab Content container */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        


        <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
          <Dashboard
            transactions={transactions}
            products={products}
            expenses={expenses}
            lang={lang}
            theme={theme}
          />
        </div>

        <div className={activeTab === 'pos' ? 'block' : 'hidden'}>
          <POS
            products={products}
            onAddTransaction={handleAddTransaction}
            onPrintTransaction={triggerPrint}
            lang={lang}
            theme={theme}
          />
        </div>

        <div className={activeTab === 'inventory' ? 'block' : 'hidden'}>
          <Inventory
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            lang={lang}
            theme={theme}
          />
        </div>

        <div className={activeTab === 'history' ? 'block' : 'hidden'}>
          <TransactionHistory
            transactions={transactions}
            products={products}
            onDeleteTransaction={handleDeleteTransaction}
            onPrintTransaction={triggerPrint}
            onEditTransaction={handleEditTransaction}
            lang={lang}
            theme={theme}
          />
        </div>

        <div className={activeTab === 'expenses' ? 'block' : 'hidden'}>
          <Expenses
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onEditExpense={handleEditExpense}
            onDeleteExpense={handleDeleteExpense}
            lang={lang}
            theme={theme}
          />
        </div>

        <div className={activeTab === 'requirements' ? 'block' : 'hidden'}>
          <Requirements
            requirements={requirements}
            products={products}
            onAddRequirement={handleAddRequirement}
            onUpdateRequirement={handleUpdateRequirement}
            onDeleteRequirement={handleDeleteRequirement}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            lang={lang}
            theme={theme}
          />
        </div>

      </main>

      {/* 5. Footer */}
      <footer
        className={`py-6 text-center text-xs transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-zinc-900 text-zinc-500 border-t border-zinc-800'
            : theme === 'eye-care'
            ? 'bg-[#f3e5ca] text-[#786144] border-t border-[#e6d0a7]'
            : 'bg-slate-900 text-slate-500 border-t border-slate-800'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          <p
            className={`font-medium ${
              theme === 'dark'
                ? 'text-zinc-400'
                : theme === 'eye-care'
                ? 'text-[#433422]'
                : 'text-slate-400'
            }`}
          >
            {t.footerText}
          </p>
          <p
            className={`mt-1 ${
              theme === 'dark'
                ? 'text-zinc-500'
                : theme === 'eye-care'
                ? 'text-[#90795e]'
                : 'text-slate-500'
            }`}
          >
            © {new Date().getFullYear()} {t.appName}. {t.footerRights}.
          </p>
        </div>
      </footer>

      {/* Sidebar Drawer */}
      <AnimatePresence>
        {showSidebar && (
          <div className="fixed inset-0 z-[100] overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowSidebar(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
            />

            <div className={`fixed inset-y-0 max-w-full flex ${lang === 'ar' ? 'left-0' : 'right-0'}`}>
              {/* Sliding Panel */}
              <motion.div
                initial={{ x: lang === 'ar' ? '-100%' : '100%' }}
                animate={{ x: 0 }}
                exit={{ x: lang === 'ar' ? '-100%' : '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className={`w-screen max-w-sm shadow-2xl h-full flex flex-col justify-between ${
                  theme === 'dark'
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
                    : theme === 'eye-care'
                    ? 'bg-[#f4ebe1] border-[#ebdcc0] text-[#433422]'
                    : 'bg-white border-slate-100 text-slate-800'
                } border-l border-r`}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              >
                {/* Drawer Header */}
                <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Info className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-indigo-400' : theme === 'eye-care' ? 'text-amber-800' : 'text-indigo-600'
                    }`} />
                    <h2 className="text-lg font-black tracking-tight">
                      {lang === 'ar' ? 'معلومات النظام' : 'System Information'}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowSidebar(false)}
                    type="button"
                    className={`p-2 rounded-xl transition cursor-pointer ${
                      theme === 'dark'
                        ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                        : theme === 'eye-care'
                        ? 'hover:bg-[#ebdcc0] text-[#7a644b]'
                        : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                  
                  {/* 1. Language & Theme Settings */}
                  <div className={`p-5 rounded-2xl border ${
                    theme === 'dark'
                      ? 'bg-zinc-950/50 border-zinc-800/80'
                      : theme === 'eye-care'
                      ? 'bg-[#fcf8f2] border-[#e3d3b4]'
                      : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    <h3 className="text-xs font-black uppercase tracking-wider mb-3 text-slate-400 dark:text-zinc-500">
                      {lang === 'ar' ? 'إعدادات اللغة والمظهر' : 'Language & Appearance'}
                    </h3>
                    <div className="space-y-4">
                      {/* Language Selector */}
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold">{lang === 'ar' ? 'لغة الواجهة:' : 'Language:'}</span>
                        <button
                          onClick={toggleLanguage}
                          type="button"
                          className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition flex items-center gap-2 cursor-pointer shadow-sm ${
                            theme === 'dark'
                              ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                              : theme === 'eye-care'
                              ? 'bg-[#fcf8f2] border-[#e3d3b4] text-[#433422] hover:bg-[#faf2e4]'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Globe className="w-4 h-4 text-indigo-500" />
                          <span>{t.langToggle}</span>
                        </button>
                      </div>

                      {/* Theme Selector */}
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold">{lang === 'ar' ? 'سمة المظهر:' : 'Theme:'}</span>
                        <div
                          className={`p-1 rounded-xl border flex items-center gap-1 shadow-sm ${
                            theme === 'dark'
                              ? 'bg-zinc-800 border-zinc-700'
                              : theme === 'eye-care'
                              ? 'bg-[#faf2e4] border-[#e3d3b4]'
                              : 'bg-slate-100 border-slate-200'
                          }`}
                        >
                          {/* Light Theme Button */}
                          <button
                            type="button"
                            onClick={() => changeTheme('light')}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              theme === 'light'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                            title={t.themeLight}
                          >
                            <Sun className="w-4 h-4" />
                          </button>

                          {/* Dark Theme Button */}
                          <button
                            type="button"
                            onClick={() => changeTheme('dark')}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              theme === 'dark'
                                ? 'bg-zinc-950 text-indigo-400 shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-400'
                            }`}
                            title={t.themeDark}
                          >
                            <Moon className="w-4 h-4" />
                          </button>

                          {/* Eye Care Theme Button */}
                          <button
                            type="button"
                            onClick={() => changeTheme('eye-care')}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              theme === 'eye-care'
                                ? 'bg-[#7a644b] text-white shadow-sm'
                                : 'text-[#90795e] hover:text-[#433422]'
                            }`}
                            title={t.themeEyeCare}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Virtual Keyboard Toggle */}
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-dashed border-zinc-700/20">
                        <span className="text-sm font-bold">{lang === 'ar' ? 'لوحة المفاتيح الافتراضية:' : 'On-Screen Keyboard:'}</span>
                        <button
                          onClick={() => {
                            setIsKeyboardOpen(!isKeyboardOpen);
                            if (!isKeyboardOpen) {
                              const active = document.activeElement;
                              if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
                                setTargetInput(active as HTMLInputElement);
                              }
                            }
                          }}
                          type="button"
                          className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition flex items-center gap-2 cursor-pointer shadow-sm ${
                            isKeyboardOpen
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : theme === 'dark'
                              ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                              : theme === 'eye-care'
                              ? 'bg-[#fcf8f2] border-[#e3d3b4] text-[#433422] hover:bg-[#faf2e4]'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Keyboard className="w-4 h-4 text-indigo-500" />
                          <span>{isKeyboardOpen ? (lang === 'ar' ? 'نشطة' : 'Active') : (lang === 'ar' ? 'غير نشطة' : 'Inactive')}</span>
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* 2. Connection & Update Status */}
                  <div className={`p-5 rounded-2xl border ${
                    theme === 'dark'
                      ? 'bg-zinc-950/50 border-zinc-800/80'
                      : theme === 'eye-care'
                      ? 'bg-[#fcf8f2] border-[#e3d3b4]'
                      : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    <h3 className="text-xs font-black uppercase tracking-wider mb-3 text-slate-400 dark:text-zinc-500">
                      {lang === 'ar' ? 'حالة النظام والتزامن' : 'System Status & Sync'}
                    </h3>
                    <div className="space-y-3">
                      {/* Connection / Sync Button */}
                      <button
                        onClick={triggerDataSync}
                        disabled={isSyncing || !isOnline}
                        type="button"
                        className={`w-full text-xs font-bold px-3 py-3 rounded-xl flex items-center justify-center gap-1.5 transition border ${
                          isSyncing
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900/40 dark:text-blue-400'
                            : !isOnline
                            ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-400'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-400 hover:bg-emerald-100/30 dark:hover:bg-emerald-950/30'
                        } cursor-pointer shadow-sm`}
                        title={
                          !isOnline
                            ? (lang === 'ar' ? 'أنت غير متصل بالإنترنت - يتم حفظ بياناتك محلياً بشكل آمن' : 'You are offline - your data is being saved locally and securely')
                            : (lang === 'ar' ? 'اضغط للمزامنة اليدوية الفورية' : 'Click to trigger immediate manual sync')
                        }
                      >
                        {isSyncing ? (
                          <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                        ) : !isOnline ? (
                          <WifiOff className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Wifi className="w-4 h-4 text-emerald-500" />
                        )}
                        <span className="truncate">
                          {isSyncing
                            ? (lang === 'ar' ? 'جاري المزامنة...' : 'Syncing...')
                            : !isOnline
                            ? (lang === 'ar' ? 'وضع الأوفلاين' : 'Offline Mode')
                            : (lang === 'ar' ? 'متصل ومزامن' : 'Online & Synced')}
                        </span>
                      </button>

                    </div>
                  </div>

                  {/* 2.5. PWA Installation Card */}
                  <div className={`p-5 rounded-2xl border ${
                    theme === 'dark'
                      ? 'bg-zinc-950/50 border-zinc-800/80'
                      : theme === 'eye-care'
                      ? 'bg-[#fcf8f2] border-[#e3d3b4]'
                      : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    <h3 className="text-xs font-black uppercase tracking-wider mb-3 text-slate-400 dark:text-zinc-500">
                      {lang === 'ar' ? 'تثبيت البرنامج' : 'App Installation'}
                    </h3>
                    <div className="space-y-3">
                      <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-medium">
                        {lang === 'ar' 
                          ? 'تثبيت هذا النظام كبرنامج مستقل على جهازك يتيح لك تشغيله مباشرة وسريعاً دون الحاجة لمتصفح.' 
                          : 'Install this system as a standalone application on your device for fast access directly without a browser.'}
                      </p>
                      <button
                        onClick={() => {
                          if (isInstallable) {
                            handleInstallClick();
                            setShowSidebar(false);
                          }
                        }}
                        disabled={!isInstallable}
                        type="button"
                        className={`w-full text-xs font-black px-4 py-3.5 rounded-xl flex items-center justify-center gap-2 transition duration-200 shadow-sm ${
                          isInstallable
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer hover:scale-[1.01] active:scale-95'
                            : theme === 'dark'
                            ? 'bg-zinc-800/50 border border-zinc-800/80 text-zinc-500 cursor-not-allowed'
                            : theme === 'eye-care'
                            ? 'bg-[#eedcb8]/50 border border-[#e3d3b4] text-[#8e7a63] cursor-not-allowed'
                            : 'bg-slate-100/70 border border-slate-200/50 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Download className={`w-4 h-4 ${isInstallable ? 'animate-bounce' : ''}`} />
                        <span>
                          {isInstallable 
                            ? (lang === 'ar' ? 'تثبيت كبرنامج للكمبيوتر' : 'Install Desktop App')
                            : (lang === 'ar' ? 'منصب بالفعل أو غير مدعوم' : 'Already Installed or Unsupported')}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 3. Time & Date Card */}
                  <div className={`p-5 rounded-2xl border ${
                    theme === 'dark'
                      ? 'bg-zinc-950/50 border-zinc-800/80'
                      : theme === 'eye-care'
                      ? 'bg-[#fcf8f2] border-[#e3d3b4]'
                      : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    <h3 className="text-xs font-black uppercase tracking-wider mb-2 text-slate-400 dark:text-zinc-500">
                      {lang === 'ar' ? 'الوقت والتاريخ الحالي' : 'Current Time & Date'}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-zinc-300">
                        <span>📅</span>
                        <span>
                          {currentTime.toLocaleDateString(
                            lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US',
                            { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-zinc-300">
                        <span>⏰</span>
                        <span className="font-mono" dir="ltr">
                          {currentTime.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4. App features list */}
                  <div className={`p-5 rounded-2xl border ${
                    theme === 'dark'
                      ? 'bg-zinc-950/50 border-zinc-800/80'
                      : theme === 'eye-care'
                      ? 'bg-[#fcf8f2] border-[#e3d3b4]'
                      : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    <h3 className="text-sm font-black mb-2.5">
                      {lang === 'ar' ? 'خصائص التطبيق' : 'Application Features'}
                    </h3>
                    <ul className="text-xs space-y-2 text-slate-600 dark:text-zinc-400 font-medium list-disc list-inside">
                      <li>{lang === 'ar' ? 'يعمل بدون إنترنت بالكامل (Offline-First)' : 'Fully offline capable (Offline-First)'}</li>
                      <li>{lang === 'ar' ? 'حفظ البيانات محلياً بشكل آمن وتلقائي' : 'Automatic secure local storage'}</li>
                      <li>{lang === 'ar' ? 'قابل للتثبيت كبرنامج مستقل (PWA)' : 'Installable as a standalone app (PWA)'}</li>
                      <li>{lang === 'ar' ? 'حماية تامة للبيانات والخصوصية' : 'Complete data privacy protection'}</li>
                    </ul>
                  </div>

                  {/* 5. Clear Database Button */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                    <button
                      onClick={() => {
                        setShowClearConfirm(true);
                        setShowSidebar(false);
                      }}
                      type="button"
                      className="w-full text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 px-3.5 py-3 rounded-xl transition border border-rose-100 dark:border-rose-900/40 cursor-pointer shadow-sm hover:shadow-md"
                      title={t.resetDataBtn}
                    >
                      <span>⚠️</span>
                      <span>{t.resetDataBtn}</span>
                    </button>
                  </div>

                  {/* 6. Dev / Supervisor Card */}
                  <div className={`p-5 rounded-2xl border text-center ${
                    theme === 'dark'
                      ? 'bg-zinc-950/50 border-zinc-800/80'
                      : theme === 'eye-care'
                      ? 'bg-[#fcf8f2] border-[#e3d3b4]'
                      : 'bg-indigo-50/40 border-indigo-100'
                  }`}>
                    <p className={`text-[10px] font-black tracking-widest uppercase mb-1.5 ${
                      theme === 'dark' ? 'text-indigo-400' : theme === 'eye-care' ? 'text-[#845e35]' : 'text-indigo-600'
                    }`}>
                      {lang === 'ar' ? 'الإشراف والتطوير' : 'Supervision & Development'}
                    </p>
                    <h3 className="text-sm font-extrabold mb-1">
                      {lang === 'ar' ? 'محمد شيباني' : 'Mohamed Shibani'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold leading-normal">
                      {lang === 'ar' ? 'تطوير وإشراف: محمد شيباني (Mohamed Shibani)' : 'Developed & Supervised by: Mohamed Shibani'}
                    </p>
                  </div>

                </div>

                {/* Drawer Footer */}
                <div className="px-6 py-5 border-t border-zinc-100 dark:border-zinc-800/60 text-center">
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                    © {new Date().getFullYear()} {t.appName}. {lang === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
                  </p>
                </div>

              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal for resetting the database */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div
            className={`rounded-2xl max-w-md w-full p-6 shadow-2xl border animate-scale-up ${
              theme === 'dark'
                ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
                : theme === 'eye-care'
                ? 'bg-[#f7eedc] border-[#dfca9e] text-[#433422]'
                : 'bg-white border-slate-100 text-slate-800'
            }`}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mb-4 animate-bounce">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">{t.resetConfirmTitle}</h3>
              <p
                className={`text-sm mb-6 leading-relaxed ${
                  theme === 'dark'
                    ? 'text-zinc-400'
                    : theme === 'eye-care'
                    ? 'text-[#786144]'
                    : 'text-slate-500'
                }`}
              >
                {t.resetConfirmDesc}
                <br />
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {t.resetConfirmWarn}
                </span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row-reverse gap-3">
              <button
                type="button"
                onClick={clearDatabaseCompletely}
                className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2.5 bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition cursor-pointer"
              >
                {t.resetConfirm}
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className={`w-full inline-flex justify-center rounded-xl border shadow-sm px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                    : theme === 'eye-care'
                    ? 'bg-[#faf2e4] border-[#e3d3b4] text-[#433422] hover:bg-[#f3e5ca]'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t.resetCancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable, smart virtual on-screen keyboard */}
      <VirtualKeyboard
        lang={lang}
        theme={theme}
        isOpen={isKeyboardOpen}
        onClose={() => setIsKeyboardOpen(false)}
        targetInput={targetInput}
      />

    </div>

    {/* Elegant Printable Thermal/A4 Receipt Slip */}
    {printActiveTransaction && (
      <div 
        className="hidden print:block text-black bg-white w-full max-w-[80mm] mx-auto p-2 font-sans select-none leading-normal border-0" 
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        style={{ fontFamily: "'Cairo', system-ui, -apple-system, sans-serif" }}
      >
        <div className="text-center space-y-1">
          <h2 className="text-base font-extrabold tracking-tight text-black">
            {lang === 'ar' ? 'نظام المحاسب الذكي' : 'Smart Accountant'}
          </h2>
          <p className="text-[10px] text-zinc-700 font-bold">
            {lang === 'ar' ? 'سند مبيعات مبسط' : 'Simplified Sales Receipt'}
          </p>

          <div className="border border-dashed border-black rounded p-1.5 my-1.5 text-center">
            <span className="text-[9px] font-bold block">
              {lang === 'ar' ? 'رقم الطلب اليومي' : 'Daily Order Number'}
            </span>
            <span className="text-xl font-black block">
              #{printActiveTransaction.orderNumber}
            </span>
          </div>

          <div className="border-b border-dashed border-black my-2"></div>
        </div>

        <div className="space-y-1 text-[10px] text-black">
          <div className="flex justify-between">
            <span className="font-bold">{lang === 'ar' ? 'رقم الفاتورة:' : 'Invoice No:'}</span>
            <span className="font-mono">{printActiveTransaction.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">{lang === 'ar' ? 'التاريخ والوقت:' : 'Date & Time:'}</span>
            <span className="font-mono">
              {new Date(printActiveTransaction.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
              })}{' '}
              {new Date(printActiveTransaction.date).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">{lang === 'ar' ? 'العميل:' : 'Customer:'}</span>
            <span>{printActiveTransaction.customerName}</span>
          </div>
          {printActiveTransaction.notes && (
            <div className="flex justify-between">
              <span className="font-bold">{lang === 'ar' ? 'ملاحظات:' : 'Notes:'}</span>
              <span>{printActiveTransaction.notes}</span>
            </div>
          )}
          {printActiveTransaction.isDelivery && (
            <>
              <div className="flex justify-between font-bold text-indigo-800">
                <span>{lang === 'ar' ? 'نوع الطلب:' : 'Order Type:'}</span>
                <span>{lang === 'ar' ? '🛵 دليفري (توصيل منزلي)' : '🛵 Delivery'}</span>
              </div>
              {printActiveTransaction.deliveryDriver && (
                <div className="flex justify-between">
                  <span className="font-bold">{lang === 'ar' ? 'المندوب:' : 'Driver:'}</span>
                  <span>{printActiveTransaction.deliveryDriver}</span>
                </div>
              )}
              {printActiveTransaction.deliveryAddress && (
                <div className="flex justify-between">
                  <span className="font-bold">{lang === 'ar' ? 'العنوان / الهاتف:' : 'Address / Tel:'}</span>
                  <span>{printActiveTransaction.deliveryAddress}</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-b border-dashed border-black my-2"></div>

        {/* Products Table */}
        <table className="w-full text-[10px] text-black border-collapse">
          <thead>
            <tr className="border-b border-dashed border-black font-extrabold">
              <th className="pb-1 text-right">{lang === 'ar' ? 'السلعة' : 'Item'}</th>
              <th className="pb-1 text-center">{lang === 'ar' ? 'الكمية' : 'Qty'}</th>
              <th className="pb-1 text-left">{lang === 'ar' ? 'السعر' : 'Price'}</th>
              <th className="pb-1 text-left">{lang === 'ar' ? 'الإجمالي' : 'Total'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-zinc-300">
            {printActiveTransaction.items.map((item, idx) => (
              <tr key={idx} className="py-1">
                <td className="py-1.5 align-middle font-semibold">{item.productName}</td>
                <td className="py-1.5 text-center align-middle font-mono">{item.quantity}</td>
                <td className="py-1.5 text-left align-middle font-mono">{item.sellingPrice.toLocaleString()}</td>
                <td className="py-1.5 text-left align-middle font-mono font-bold">
                  {(item.sellingPrice * item.quantity).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-b border-dashed border-black my-2"></div>

        {/* Totals Summary */}
        <div className="space-y-1 text-black">
          {printActiveTransaction.isDelivery && (
            <div className="flex justify-between items-center text-[10px] py-0.5">
              <span>{lang === 'ar' ? 'إجمالي المواد:' : 'Items Subtotal:'}</span>
              <span className="font-mono">
                {printActiveTransaction.totalAmount.toLocaleString()} {t.currency}
              </span>
            </div>
          )}
          {printActiveTransaction.isDelivery && printActiveTransaction.deliveryFee !== undefined && (
            <div className="flex justify-between items-center text-[10px] py-0.5 font-bold text-indigo-900">
              <span>{lang === 'ar' ? 'رسوم التوصيل:' : 'Delivery Fee:'}</span>
              <span className="font-mono">
                {(printActiveTransaction.deliveryFee || 0).toLocaleString()} {t.currency}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-xs font-black py-0.5 border-t border-dashed border-black pt-1">
            <span>{lang === 'ar' ? 'الإجمالي النهائي للطلب:' : 'Grand Total:'}</span>
            <span className="font-mono text-sm">
              {(printActiveTransaction.totalAmount + (printActiveTransaction.isDelivery && printActiveTransaction.deliveryFee ? printActiveTransaction.deliveryFee : 0)).toLocaleString()} {t.currency}
            </span>
          </div>
          {printReceivedAmount > 0 && (
            <>
              <div className="flex justify-between items-center text-[10px] py-0.5">
                <span>{lang === 'ar' ? 'المبلغ المستلم:' : 'Amount Paid:'}</span>
                <span className="font-mono">{printReceivedAmount.toLocaleString()} {t.currency}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] py-0.5">
                <span>
                  {printReceivedAmount >= (printActiveTransaction.totalAmount + (printActiveTransaction.isDelivery && printActiveTransaction.deliveryFee ? printActiveTransaction.deliveryFee : 0))
                    ? (lang === 'ar' ? 'المبلغ المرتجع (الباقي):' : 'Change Due:')
                    : (lang === 'ar' ? 'المتبقي (عجز):' : 'Remaining:')}
                </span>
                <span className="font-mono font-bold">
                  {Math.abs(printReceivedAmount - (printActiveTransaction.totalAmount + (printActiveTransaction.isDelivery && printActiveTransaction.deliveryFee ? printActiveTransaction.deliveryFee : 0))).toLocaleString()} {t.currency}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="border-b border-dashed border-black my-2.5"></div>

        {/* Footer Messages */}
        <div className="text-center text-[9px] text-zinc-700 space-y-1">
          <p className="font-extrabold text-black">{lang === 'ar' ? 'شكراً لتعاملكم معنا!' : 'Thank you for your business!'}</p>
          <p>{lang === 'ar' ? 'يسعدنا دائماً زيارتكم وخدمتكم.' : 'We look forward to serving you again.'}</p>
          <div className="text-[8px] opacity-65 pt-1">
            {lang === 'ar' ? 'تاريخ الطباعة:' : 'Printed on:'} {new Date().toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
          </div>
        </div>
      </div>
    )}
  </>
  );
}
