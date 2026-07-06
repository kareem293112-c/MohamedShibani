import React, { useMemo } from 'react';
import { Product, Transaction, Expense } from '../types';
import { DollarSign, TrendingUp, TrendingDown, Package, ShoppingCart, Percent, Award } from 'lucide-react';
import { translations } from '../translations';

interface DashboardProps {
  transactions: Transaction[];
  products: Product[];
  expenses: Expense[];
  lang: 'ar' | 'en';
  theme: 'light' | 'dark' | 'eye-care';
}

export default function Dashboard({ transactions, products, expenses, lang, theme }: DashboardProps) {
  const t = translations[lang];

  // 1. Calculate General Statistics including expenses
  const stats = useMemo(() => {
    let totalSales = 0;
    let totalCost = 0;
    let totalProfitBeforeExpenses = 0;
    let salesCount = transactions.length;

    transactions.forEach((tx) => {
      totalSales += tx.totalAmount;
      totalCost += tx.totalCost;
      totalProfitBeforeExpenses += tx.totalProfit;
    });

    const totalExpenses = expenses ? expenses.reduce((acc, exp) => acc + exp.amount, 0) : 0;
    const totalProfit = totalProfitBeforeExpenses - totalExpenses;
    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    return {
      totalSales,
      totalCost,
      totalExpenses,
      totalProfit,
      salesCount,
      profitMargin,
    };
  }, [transactions, expenses]);

  // 2. Calculate Top Products (by units sold and by profit generated)
  const topProducts = useMemo(() => {
    const productStats: Record<string, { name: string; quantity: number; profit: number; revenue: number }> = {};

    transactions.forEach((tx) => {
      tx.items.forEach((item) => {
        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            name: item.productName,
            quantity: 0,
            profit: 0,
            revenue: 0,
          };
        }
        const itemCost = item.costPrice * item.quantity;
        const itemRevenue = item.sellingPrice * item.quantity;
        const itemProfit = itemRevenue - itemCost;

        productStats[item.productId].quantity += item.quantity;
        productStats[item.productId].revenue += itemRevenue;
        productStats[item.productId].profit += itemProfit;
      });
    });

    const sortedByQty = Object.values(productStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const sortedByProfit = Object.values(productStats)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    return {
      byQty: sortedByQty,
      byProfit: sortedByProfit,
    };
  }, [transactions]);

  // 3. Prepare Last 7 Days Daily Sales & Profits Data for custom SVG graph
  const dailyData = useMemo(() => {
    const last7Days: { dateStr: string; label: string; sales: number; profit: number }[] = [];
    
    // Generate last 7 days keys
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { weekday: 'short', day: 'numeric', month: 'numeric' });
      last7Days.push({ dateStr, label, sales: 0, profit: 0 });
    }

    transactions.forEach((tx) => {
      const txDateStr = tx.date.split('T')[0];
      const dayObj = last7Days.find((day) => day.dateStr === txDateStr);
      if (dayObj) {
        dayObj.sales += tx.totalAmount;
        dayObj.profit += tx.totalProfit;
      }
    });

    // Deduct daily operational expenses from daily profits
    if (expenses) {
      expenses.forEach((exp) => {
        const expDateStr = exp.date.split('T')[0];
        const dayObj = last7Days.find((day) => day.dateStr === expDateStr);
        if (dayObj) {
          dayObj.profit -= exp.amount;
        }
      });
    }

    return last7Days;
  }, [transactions, expenses, lang]);

  // Max value for scaling SVG chart
  const maxChartValue = useMemo(() => {
    const maxVal = Math.max(...dailyData.map((d) => Math.max(d.sales, d.profit, 100)));
    return Math.ceil(maxVal / 10) * 10; // Round up to nearest 10
  }, [dailyData]);

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

  const svgGridColor = 
    theme === 'dark' 
      ? '#27272a' 
      : theme === 'eye-care' 
      ? '#ebdcc3' 
      : '#f1f5f9';

  const svgAxisColor = 
    theme === 'dark' 
      ? '#3f3f46' 
      : theme === 'eye-care' 
      ? '#dfca9e' 
      : '#e2e8f0';

  const svgTextColor = 
    theme === 'dark' 
      ? '#a1a1aa' 
      : theme === 'eye-care' 
      ? '#786144' 
      : '#94a3b8';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Upper Cards section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        
        {/* Card 1: Total Sales */}
        <div className={`rounded-2xl p-6 border shadow-sm transition hover:shadow-md relative overflow-hidden group ${cardBgClass}`}>
          <div className="absolute top-0 right-0 left-0 h-1.5 w-full bg-indigo-600"></div>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm font-medium mb-1 ${textSecondaryClass}`}>{t.dashSalesTitle}</p>
              <h3 className={`text-3xl font-bold tracking-tight ${textPrimaryClass}`}>
                {stats.totalSales.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{t.currency}</span>
              </h3>
            </div>
            <div className="bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 p-3.5 rounded-xl group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className={`mt-4 flex items-center text-xs ${textTertiaryClass}`}>
            <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 mx-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {t.dashChartLegendSales}
            </span>
            {t.dashSalesDesc}
          </div>
        </div>

        {/* Card 2: Total Cost */}
        <div className={`rounded-2xl p-6 border shadow-sm transition hover:shadow-md relative overflow-hidden group ${cardBgClass}`}>
          <div className="absolute top-0 right-0 left-0 h-1.5 w-full bg-slate-500"></div>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm font-medium mb-1 ${textSecondaryClass}`}>{t.dashCostTitle}</p>
              <h3 className={`text-3xl font-bold tracking-tight ${textPrimaryClass}`}>
                {stats.totalCost.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t.currency}</span>
              </h3>
            </div>
            <div className="bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 p-3.5 rounded-xl group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <div className={`mt-4 flex items-center text-xs ${textTertiaryClass}`}>
            <span className="text-slate-500 dark:text-slate-400 font-medium mx-1">
              {lang === 'ar' ? 'رأس المال' : 'Capital'}
            </span>
            {t.dashCostDesc}
          </div>
        </div>

        {/* Card 2.5: Operational Expenses */}
        <div className={`rounded-2xl p-6 border shadow-sm transition hover:shadow-md relative overflow-hidden group ${cardBgClass}`}>
          <div className="absolute top-0 right-0 left-0 h-1.5 w-full bg-rose-500"></div>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm font-medium mb-1 ${textSecondaryClass}`}>
                {lang === 'ar' ? 'نفقات المواد والمصاريف' : 'Expenses & Material Costs'}
              </p>
              <h3 className={`text-3xl font-bold tracking-tight ${textPrimaryClass}`}>
                {stats.totalExpenses.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-sm font-semibold text-rose-500">{t.currency}</span>
              </h3>
            </div>
            <div className="bg-rose-50 dark:bg-zinc-800 text-rose-600 dark:text-rose-400 p-3.5 rounded-xl group-hover:scale-110 transition-transform">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
          <div className={`mt-4 flex items-center text-xs ${textTertiaryClass}`}>
            <span className="text-rose-500 font-medium mx-1">
              {lang === 'ar' ? 'سحوبات الصندوق' : 'Drawer Withdrawals'}
            </span>
            {lang === 'ar' ? 'إجمالي المبالغ المسحوبة لشراء المواد' : 'Total cash drawn for materials'}
          </div>
        </div>

        {/* Card 3: Net Profit */}
        <div className={`rounded-2xl p-6 border shadow-sm transition hover:shadow-md relative overflow-hidden group ${cardBgClass}`}>
          <div className="absolute top-0 right-0 left-0 h-1.5 w-full bg-emerald-500"></div>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm font-medium mb-1 ${textSecondaryClass}`}>{t.dashProfitTitle}</p>
              <h3 className={`text-3xl font-bold tracking-tight ${textPrimaryClass}`}>
                {stats.totalProfit.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-sm font-semibold text-emerald-500">{t.currency}</span>
              </h3>
            </div>
            <div className="bg-emerald-50 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-xl group-hover:scale-110 transition-transform">
              {stats.totalProfit >= 0 ? <TrendingUp className="w-6 h-6 text-emerald-600" /> : <TrendingDown className="w-6 h-6 text-rose-600" />}
            </div>
          </div>
          <div className={`mt-4 flex items-center text-xs ${textTertiaryClass}`}>
            <span className={`${stats.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} font-medium mx-1`}>
              {stats.totalProfit >= 0 ? t.dashProfitDescProfit : t.dashProfitDescLoss}
            </span>
            {t.dashProfitSub}
          </div>
        </div>

        {/* Card 4: Profit Margin */}
        <div className={`rounded-2xl p-6 border shadow-sm transition hover:shadow-md relative overflow-hidden group ${cardBgClass}`}>
          <div className="absolute top-0 right-0 left-0 h-1.5 w-full bg-sky-500"></div>
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm font-medium mb-1 ${textSecondaryClass}`}>{t.dashMarginTitle}</p>
              <h3 className={`text-3xl font-bold tracking-tight ${textPrimaryClass}`}>
                {stats.profitMargin.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { maximumFractionDigits: 1 })} <span className="text-sm font-semibold text-sky-500">%</span>
              </h3>
            </div>
            <div className="bg-sky-50 dark:bg-zinc-800 text-sky-650 dark:text-sky-400 p-3.5 rounded-xl group-hover:scale-110 transition-transform">
              <Percent className="w-6 h-6" />
            </div>
          </div>
          <div className={`mt-4 flex items-center text-xs ${textTertiaryClass}`}>
            <span className="text-sky-600 dark:text-sky-400 font-medium mx-1">
              {lang === 'ar' ? 'بمعدل ربح' : 'Profit rate'}
            </span>
            {t.dashMarginDesc}
          </div>
        </div>

      </div>

      {/* Main Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Custom SVG Bar Chart - Last 7 Days Sales vs Profit */}
        <div className={`rounded-2xl p-6 border shadow-sm lg:col-span-2 ${cardBgClass}`}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className={`text-lg font-bold ${textPrimaryClass}`}>{t.dashChartTitle}</h3>
              <p className={`text-xs ${textSecondaryClass}`}>{t.dashChartSub}</p>
            </div>
            <div className={`flex items-center gap-4 text-xs ${lang === 'ar' ? 'flex-row' : 'flex-row'}`}>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
                <span>{t.dashChartLegendSales}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span>{t.dashChartLegendProfit}</span>
              </div>
            </div>
          </div>

          {/* Render Custom SVG Chart */}
          <div className="w-full h-72 relative">
            <svg viewBox="0 0 700 280" className="w-full h-full">
              {/* Grid Lines */}
              <line x1="50" y1="40" x2="680" y2="40" stroke={svgGridColor} strokeWidth="1" />
              <line x1="50" y1="90" x2="680" y2="90" stroke={svgGridColor} strokeWidth="1" />
              <line x1="50" y1="140" x2="680" y2="140" stroke={svgGridColor} strokeWidth="1" />
              <line x1="50" y1="190" x2="680" y2="190" stroke={svgGridColor} strokeWidth="1" strokeDasharray="3 3" />
              <line x1="50" y1="240" x2="680" y2="240" stroke={svgAxisColor} strokeWidth="1.5" />

              {/* Y Axis Labels */}
              <text x="40" y="45" fill={svgTextColor} fontSize="10" textAnchor="end">{(maxChartValue).toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US')}</text>
              <text x="40" y="145" fill={svgTextColor} fontSize="10" textAnchor="end">{(maxChartValue / 2).toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US')}</text>
              <text x="40" y="245" fill={svgTextColor} fontSize="10" textAnchor="end">0</text>

              {/* Columns for 7 Days */}
              {dailyData.map((day, idx) => {
                const xCenter = 50 + idx * 90 + 45; // X position of day group
                
                // Calculate height of bars based on maxChartValue
                const salesHeight = (day.sales / maxChartValue) * 200;
                const profitHeight = (Math.max(0, day.profit) / maxChartValue) * 200;

                // Max heights to prevent overflow
                const sHeight = Math.min(salesHeight, 200);
                const pHeight = Math.min(profitHeight, 200);

                const sY = 240 - sHeight;
                const pY = 240 - pHeight;

                return (
                  <g key={day.dateStr} className="group/bar">
                    {/* Tooltip background & text (hover trigger) */}
                    <g className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200">
                      <rect
                        x={xCenter - 60}
                        y="10"
                        width="120"
                        height="45"
                        rx="6"
                        fill="#1e293b"
                      />
                      <text x={xCenter} y="26" fill="#ffffff" fontSize="9" textAnchor="middle" fontWeight="bold">
                        {lang === 'ar' ? 'بيع' : 'Sale'}: {day.sales.toFixed(1)} {t.currency}
                      </text>
                      <text x={xCenter} y="40" fill="#10b981" fontSize="9" textAnchor="middle" fontWeight="bold">
                        {lang === 'ar' ? 'ربح' : 'Profit'}: {day.profit.toFixed(1)} {t.currency}
                      </text>
                    </g>

                    {/* Sales Bar (Indigo) */}
                    <rect
                      x={xCenter - 18}
                      y={sY}
                      width="14"
                      height={sHeight}
                      rx="3"
                      fill="#4f46e5"
                      className="transition-all hover:fill-indigo-700 duration-300"
                    />

                    {/* Profit Bar (Emerald) */}
                    <rect
                      x={xCenter + 2}
                      y={pY}
                      width="14"
                      height={pHeight}
                      rx="3"
                      fill="#10b981"
                      className="transition-all hover:fill-emerald-600 duration-300"
                    />

                    {/* Day label */}
                    <text
                      x={xCenter}
                      y="262"
                      fill={svgTextColor}
                      fontSize="10"
                      textAnchor="middle"
                      fontWeight="medium"
                    >
                      {day.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className={`text-center text-xs mt-2 ${textSecondaryClass}`}>
            {t.dashChartTip}
          </div>
        </div>

        {/* Top selling & Profitable lists */}
        <div className="space-y-6">
          
          {/* Top selling list */}
          <div className={`rounded-2xl p-6 border shadow-sm ${cardBgClass}`}>
            <div className={`flex items-center gap-2 mb-4 ${lang === 'ar' ? 'flex-row' : 'flex-row'}`}>
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h3 className={`text-md font-bold ${textPrimaryClass}`}>{t.dashTopByQty}</h3>
            </div>

            {topProducts.byQty.length === 0 ? (
              <div className={`text-center py-8 text-sm ${textSecondaryClass}`}>
                {t.dashNoData}
              </div>
            ) : (
              <div className="space-y-3.5">
                {topProducts.byQty.map((item, idx) => (
                  <div key={item.name} className={`flex items-center justify-between p-2.5 rounded-xl transition ${
                    theme === 'dark' ? 'hover:bg-zinc-800/50' : theme === 'eye-care' ? 'hover:bg-[#f3e5ca]/50' : 'hover:bg-slate-50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                        theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : theme === 'eye-care' ? 'bg-[#ebdcc3] text-[#433422]' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className={`text-sm font-semibold truncate max-w-[140px] md:max-w-[180px] ${textPrimaryClass}`}>
                        {item.name}
                      </span>
                    </div>
                    <div className={`${lang === 'ar' ? 'text-left' : 'text-right'}`}>
                      <div className={`text-sm font-bold ${textPrimaryClass}`}>{item.quantity} {t.dashUnit}</div>
                      <div className={`text-[10px] ${textSecondaryClass}`}>{t.dashRevenue} {item.revenue.toFixed(1)} {t.currency}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top profitable list */}
          <div className={`rounded-2xl p-6 border shadow-sm ${cardBgClass}`}>
            <div className={`flex items-center gap-2 mb-4 ${lang === 'ar' ? 'flex-row' : 'flex-row'}`}>
              <div className="p-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
                <Award className="w-5 h-5" />
              </div>
              <h3 className={`text-md font-bold ${textPrimaryClass}`}>{t.dashTopByProfit}</h3>
            </div>

            {topProducts.byProfit.length === 0 ? (
              <div className={`text-center py-8 text-sm ${textSecondaryClass}`}>
                {t.dashNoData}
              </div>
            ) : (
              <div className="space-y-3.5">
                {topProducts.byProfit.map((item, idx) => (
                  <div key={item.name} className={`flex items-center justify-between p-2.5 rounded-xl transition ${
                    theme === 'dark' ? 'hover:bg-zinc-800/50' : theme === 'eye-care' ? 'hover:bg-[#f3e5ca]/50' : 'hover:bg-[#faf2e4]/50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                        theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : theme === 'eye-care' ? 'bg-[#ebdcc3] text-[#433422]' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className={`text-sm font-semibold truncate max-w-[140px] md:max-w-[180px] ${textPrimaryClass}`}>
                        {item.name}
                      </span>
                    </div>
                    <div className={`${lang === 'ar' ? 'text-left' : 'text-right'}`}>
                      <div className={`text-sm font-bold text-emerald-600 dark:text-emerald-400`}>+{item.profit.toFixed(1)} {t.currency}</div>
                      <div className={`text-[10px] ${textSecondaryClass}`}>{item.quantity} {t.dashUnit}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>



        </div>

      </div>

    </div>
  );
}
