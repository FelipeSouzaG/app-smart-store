
import React, { useState, useMemo, useEffect, useContext } from 'react';
import getManagementInsights from '../services/geminiService';
import type { KPIs, KpiGoals, CashTransaction, TicketSale, Product, StockLevelSummary, TopProduct, SalesPeak, MarginMetrics } from '../types';
import { TransactionCategory, TransactionType, TransactionStatus, TurnoverPeriod, ProductStatus } from '../types';
import { formatCurrencyNumber } from '../validation';
import GoalsModal from './GoalsModal';
import SystemStatusModal from './SystemStatusModal';
import { AuthContext } from '../contexts/AuthContext';

const KpiCard: React.FC<{ title: string; value: string; note?: string; colorClass?: string }> = ({ title, value, note, colorClass = "text-gray-900 dark:text-white" }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col justify-between">
         <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
            <p className={`mt-1 text-3xl font-semibold ${colorClass}`}>{value}</p>
        </div>
        {note && <p className="mt-2 text-xs text-gray-400">{note}</p>}
    </div>
);

// NEW: Card de Fluxo de Caixa Destaque
const CashFlowCard: React.FC<{ balance: number; in: number; out: number }> = ({ balance, in: inflows, out: outflows }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col justify-between border-l-4 border-indigo-500">
         <div>
            <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                SALDO EM CAIXA (REAL)
            </h3>
            <p className={`mt-2 text-3xl font-black ${balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                R$ {formatCurrencyNumber(balance)}
            </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
            <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Entradas</p>
                <p className="text-sm font-semibold text-green-600">R$ {formatCurrencyNumber(inflows)}</p>
            </div>
            <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Saídas</p>
                <p className="text-sm font-semibold text-red-500">R$ {formatCurrencyNumber(outflows)}</p>
            </div>
        </div>
    </div>
);

const ProgressKpiCard: React.FC<{ title: string; mainValue: string; progress: number; note: string }> = ({ title, mainValue, progress, note }) => {
    const clampedProgress = Math.min(Math.max(progress, 0), 100);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col justify-between">
            <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
                <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{mainValue}</p>
                <p className="mt-1 text-xs text-gray-400">{note}</p>
            </div>
            <div className="mt-6 mb-2">
                 <div className="relative">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                            className={`h-3 rounded-full transition-all duration-500 ${clampedProgress < 50 ? 'bg-red-500' : clampedProgress < 90 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${clampedProgress}%` }}
                        />
                    </div>
                    {/* Scale Ticks */}
                    {Array.from({ length: 11 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute top-full h-1.5 w-px bg-gray-300 dark:bg-gray-500"
                            style={{ left: `${i * 10}%` }}
                        />
                    ))}
                    {/* Scale Labels (every 20%) */}
                    {Array.from({ length: 6 }).map((_, i) => (
                        <span
                            key={i}
                            className="absolute top-full mt-2 text-[10px] text-gray-400 -translate-x-1/2"
                            style={{ left: `${i * 20}%` }}
                        >
                            {i * 20}%
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};


const StockLevelCard: React.FC<{ title: string; summary: StockLevelSummary }> = ({ title, summary }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">{title}</h3>
        <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
            <div>
                <p className="text-xl sm:text-2xl font-bold text-red-500">{summary.ruptura}</p>
                <p className="text-[10px] sm:text-xs text-gray-400">Ruptura</p>
            </div>
            <div>
                <p className="text-xl sm:text-2xl font-bold text-orange-500">{summary.risco}</p>
                <p className="text-[10px] sm:text-xs text-gray-400">Risco</p>
            </div>
            <div>
                <p className="text-xl sm:text-2xl font-bold text-green-500">{summary.seguranca}</p>
                <p className="text-[10px] sm:text-xs text-gray-400">Segurança</p>
            </div>
            <div>
                <p className="text-xl sm:text-2xl font-bold text-yellow-500">{summary.excesso}</p>
                <p className="text-[10px] sm:text-xs text-gray-400">Excesso</p>
            </div>
        </div>
        <p className="mt-4 text-xs text-center text-gray-400">Produtos por status de estoque</p>
    </div>
);

interface DashboardProps {
    transactions: CashTransaction[];
    ticketSales: TicketSale[];
    products: Product[];
    goals: KpiGoals;
    onSaveGoals: (goals: KpiGoals) => Promise<void>;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, ticketSales, products, goals, onSaveGoals }) => {
    const { apiCall } = useContext(AuthContext); 
    const getCurrentCompetency = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        return `${year}-${month}`;
    };

    const [competency, setCompetency] = useState<string>(getCurrentCompetency());
    const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [insights, setInsights] = useState<string>('');
    const [isLoadingInsights, setIsLoadingInsights] = useState(false);

    const handleCompetencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCompetency(e.target.value);
    };

    const handleSystemStatus = () => {
        setIsStatusModalOpen(true);
    };

    const { kpis, top10SoldProducts, top10LowestTurnoverProducts, top5SalesPeaks } = useMemo(() => {
        const [year, month] = competency.split('-').map(Number);
        const now = new Date();
        
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

        const salesThisMonth = ticketSales.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate >= startOfMonth && saleDate <= endOfMonth;
        });

        const transactionsThisMonth = transactions.filter(t => {
            const tDate = new Date(t.timestamp);
            return tDate >= startOfMonth && tDate <= endOfMonth;
        });
        
        const isCurrentMonth = now.getFullYear() === year && now.getMonth() === (month - 1);
        const daysInMonth = endOfMonth.getDate();
        const daysPassed = isCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;

        // --- CASH FLOW CALCULATION (Realidade Financeira) ---
        const totalInflows = transactionsThisMonth
            .filter(t => t.type === TransactionType.INCOME && t.status === TransactionStatus.PAID)
            .reduce((sum, t) => sum + t.amount, 0);

        const totalOutflows = transactionsThisMonth
            .filter(t => t.type === TransactionType.EXPENSE && t.status === TransactionStatus.PAID)
            .reduce((sum, t) => sum + t.amount, 0);

        const cashBalance = totalInflows - totalOutflows;
        // ----------------------------------------------------

        // --- ACCRUAL CALCULATION (Lucro Operacional) ---
        const currentRevenue = salesThisMonth.reduce((sum, sale) => sum + sale.total, 0);
        const fixedCostCategories = [TransactionCategory.RENT, TransactionCategory.SALARY, TransactionCategory.TAXES, TransactionCategory.INTERNET, TransactionCategory.WATER, TransactionCategory.ELECTRICITY, TransactionCategory.OTHER];
        const fixedCosts = transactionsThisMonth
            .filter(t => t.type === TransactionType.EXPENSE && fixedCostCategories.includes(t.category as TransactionCategory) && t.status === TransactionStatus.PAID)
            .reduce((sum, t) => sum + t.amount, 0);
        
        // CMV: Considera apenas o que foi VENDIDO
        const variableCostOfProductsSold = salesThisMonth.reduce((cogs, sale) => cogs + sale.items.reduce((itemCost, saleItem) => saleItem.type === 'product' && 'cost' in saleItem.item ? itemCost + (saleItem.item.cost * saleItem.quantity) : itemCost, 0), 0);
        const variableCostOfServices = transactionsThisMonth.filter(t => t.category === TransactionCategory.SERVICE_COST && t.status === TransactionStatus.PAID).reduce((sum, t) => sum + t.amount, 0);
        
        const totalVariableCosts = variableCostOfProductsSold + variableCostOfServices;
        const currentAvgContributionMargin = currentRevenue > 0 ? ((currentRevenue - totalVariableCosts) / currentRevenue) * 100 : 0;
        
        // Lucro Líquido Operacional (Ignora compra de estoque que não foi vendido)
        const currentNetProfit = currentRevenue - totalVariableCosts - fixedCosts;
        
        const predictedMarginRatio = goals.predictedAvgMargin / 100;
        const breakEvenPoint = predictedMarginRatio > 0 ? fixedCosts / predictedMarginRatio : 0;
        const totalRevenueGoal = breakEvenPoint + goals.netProfit;
        const progressPercentage = totalRevenueGoal > 0 ? (currentRevenue / totalRevenueGoal) * 100 : 0;
        
        const monthlyForecast = daysPassed > 0 ? (currentRevenue / daysPassed) * daysInMonth : 0;

        // Inventory Metrics
        const monthlyCOGS = variableCostOfProductsSold;
        const averageInventoryValue = products.reduce((sum, p) => sum + (p.cost * p.stock), 0);
        const actualInventoryTurnover = averageInventoryValue > 0 ? monthlyCOGS / averageInventoryValue : 0;
        const projectedInventoryTurnover = averageInventoryValue > 0 && daysPassed > 0 ? (monthlyCOGS / averageInventoryValue) * (daysInMonth / daysPassed) : 0;

        // ... (Existing Stock Logic)
        let periodDays = 30;
        switch(goals.turnoverPeriod) {
            case TurnoverPeriod.MONTHLY: periodDays = 30; break;
            case TurnoverPeriod.BIMONTHLY: periodDays = 60; break;
            case TurnoverPeriod.QUARTERLY: periodDays = 90; break;
            case TurnoverPeriod.SEMIANNUAL: periodDays = 180; break;
            case TurnoverPeriod.ANNUAL: periodDays = 365; break;
        }
        const turnoverStartDate = new Date();
        turnoverStartDate.setDate(now.getDate() - periodDays);
        const salesInPeriod = ticketSales.filter(sale => new Date(sale.timestamp) >= turnoverStartDate);
        const productSalesMap = new Map<string, number>();
        salesInPeriod.forEach(sale => sale.items.forEach(item => {
            if (item.type === 'product') {
                productSalesMap.set(item.item.id, (productSalesMap.get(item.item.id) || 0) + item.quantity);
            }
        }));

        let sumActiveMargins = 0; 
        let countActiveProducts = 0;
        let sumTotalMargins = 0;
        let countTotalProducts = products.length;

        const stockLevelSummary: StockLevelSummary = { ruptura: 0, risco: 0, seguranca: 0, excesso: 0 };

        products.forEach(p => {
            const taxAmount = p.price * (goals.effectiveTaxRate / 100);
            const maxFeeAmount = p.price * (goals.feeCreditInstallment / 100);
            const realMarginValue = p.price - p.cost - taxAmount - maxFeeAmount;
            const realMarginPercent = p.price > 0 ? (realMarginValue / p.price) * 100 : 0;
            
            sumTotalMargins += realMarginPercent;

            const soldQty = productSalesMap.get(p.id) || 0;
            const dailyRate = soldQty / periodDays;
            const daysOfSupply = dailyRate > 0 ? p.stock / dailyRate : (p.stock > 0 ? Infinity : 0);
            
            let status: ProductStatus;
            if (p.stock <= 0) {
                status = ProductStatus.RUPTURA;
                stockLevelSummary.ruptura++;
            } else if (daysOfSupply === Infinity) {
                status = ProductStatus.EXCESSO;
                stockLevelSummary.excesso++;
            } else if (daysOfSupply <= goals.stockThresholds.riskMin) {
                status = ProductStatus.RUPTURA;
                stockLevelSummary.ruptura++;
            } else if (daysOfSupply <= goals.stockThresholds.riskMax) {
                status = ProductStatus.RISCO;
                stockLevelSummary.risco++;
            } else if (daysOfSupply <= goals.stockThresholds.safetyMax) {
                status = ProductStatus.SEGURANCA;
                stockLevelSummary.seguranca++;
            } else {
                status = ProductStatus.EXCESSO;
                stockLevelSummary.excesso++;
            }

            if (status !== ProductStatus.EXCESSO) {
                sumActiveMargins += realMarginPercent;
                countActiveProducts++;
            }
        });

        const marginMetrics: MarginMetrics = {
            activeMarginAvg: countActiveProducts > 0 ? sumActiveMargins / countActiveProducts : 0,
            activeProductPercentage: countTotalProducts > 0 ? (countActiveProducts / countTotalProducts) * 100 : 0,
            overallMarginAvg: countTotalProducts > 0 ? sumTotalMargins / countTotalProducts : 0
        };


        const productSalesMapMonth = new Map<string, number>();
        salesThisMonth.forEach(sale => sale.items.forEach(item => {
            if (item.type === 'product') {
                productSalesMapMonth.set(item.item.id, (productSalesMapMonth.get(item.item.id) || 0) + item.quantity);
            }
        }));

        const top10SoldProducts: TopProduct[] = Array.from(productSalesMapMonth.entries())
            .map(([productId, quantitySold]) => ({
                id: productId,
                name: products.find(p => p.id === productId)?.name || 'N/A',
                quantitySold,
                currentStock: products.find(p => p.id === productId)?.stock || 0,
            }))
            .sort((a, b) => b.quantitySold - a.quantitySold)
            .slice(0, 10);
            
        const top10LowestTurnoverProducts: TopProduct[] = products
            .filter(p => p.stock > 0)
            .map(p => ({
                id: p.id,
                name: p.name,
                quantitySold: productSalesMapMonth.get(p.id) || 0,
                currentStock: p.stock,
                turnoverRatio: (productSalesMapMonth.get(p.id) || 0) / p.stock
            }))
            .sort((a,b) => a.turnoverRatio! - b.turnoverRatio!)
            .slice(0, 10);
            

        const salesByDay = new Map<string, number>();
        salesThisMonth.forEach(sale => {
            const day = new Date(sale.timestamp).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            salesByDay.set(day, (salesByDay.get(day) || 0) + sale.total);
        });
        const top5SalesPeaks: SalesPeak[] = Array.from(salesByDay.entries())
            .map(([date, total]) => ({date, total}))
            .sort((a,b) => b.total - a.total)
            .slice(0, 5);


        const calculatedKpis: KPIs = { 
            fixedCosts, 
            currentRevenue, 
            currentAvgContributionMargin, 
            breakEvenPoint, 
            currentNetProfit, 
            totalRevenueGoal, 
            progressPercentage, 
            monthlyForecast, 
            goals,
            actualInventoryTurnover,
            projectedInventoryTurnover,
            stockLevelSummary,
            top10SoldProducts,
            lowestTurnoverProducts: top10LowestTurnoverProducts,
            topSalesDays: top5SalesPeaks,
            marginMetrics,
            cashBalance,    // Added
            totalInflows,   // Added
            totalOutflows   // Added
        };
        
        return { kpis: calculatedKpis, top10SoldProducts, top10LowestTurnoverProducts, top5SalesPeaks };

    }, [transactions, ticketSales, goals, products, competency]);


    const handleGetInsights = async () => {
        if (!kpis) return;
        setIsLoadingInsights(true);
        setInsights('');
        try {
            // FIX: Agora passamos a função apiCall do contexto para garantir a segurança da requisição
            const result = await getManagementInsights(kpis, apiCall);
            setInsights(result);
        } catch (error) {
            setInsights('Ocorreu um erro ao buscar os insights.');
        } finally {
            setIsLoadingInsights(false);
        }
    };

    if (!kpis) {
        return <div className="p-8 text-center text-gray-500">Carregando Dashboard...</div>;
    }

    return (
        <>
            {isGoalsModalOpen && <GoalsModal currentGoals={goals} onSave={onSaveGoals} onClose={() => setIsGoalsModalOpen(false)}/>}
            {isStatusModalOpen && <SystemStatusModal onClose={() => setIsStatusModalOpen(false)} />}
            
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                     <div className="flex flex-wrap items-center gap-2">
                        <label htmlFor="competency-picker" className="text-sm font-medium text-gray-700 dark:text-gray-300">Competência:</label>
                        <input 
                            type="month" 
                            id="competency-picker"
                            value={competency}
                            onChange={handleCompetencyChange}
                            className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <div className="flex gap-2 mt-2 sm:mt-0">
                             <button onClick={handleSystemStatus} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 shadow-md transition-transform transform hover:scale-105">
                                Status
                            </button>
                             <button onClick={() => setIsGoalsModalOpen(true)} className="px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 shadow-md transition-transform transform hover:scale-105">
                                Configurar
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                     {/* Financial Highlight Card (New) */}
                     <CashFlowCard balance={kpis.cashBalance} in={kpis.totalInflows} out={kpis.totalOutflows} />

                     <KpiCard 
                        title="Lucro Líquido (Operacional)" 
                        value={`R$ ${formatCurrencyNumber(kpis.currentNetProfit)}`} 
                        note={`Objetivo: R$ ${formatCurrencyNumber(kpis.goals.netProfit)}`} 
                        colorClass={kpis.currentNetProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
                     />
                     <KpiCard title="Custos Fixos do Mês" value={`R$ ${formatCurrencyNumber(kpis.fixedCosts)}`} note="Soma das despesas fixas pagas" />
                     <KpiCard title="Margem de Contribuição" value={`${kpis.currentAvgContributionMargin.toFixed(2)}%`} note={`Previsto: ${kpis.goals.predictedAvgMargin}%`} />
                     
                     <KpiCard title="Projeção de Faturamento" value={`R$ ${formatCurrencyNumber(kpis.monthlyForecast)}`} note="Baseado no ritmo de vendas" />
                     <ProgressKpiCard 
                        title="Progresso da Meta de Faturamento" 
                        mainValue={`R$ ${formatCurrencyNumber(kpis.currentRevenue)}`}
                        progress={kpis.progressPercentage}
                        note={`Meta: R$ ${formatCurrencyNumber(kpis.totalRevenueGoal)} (${kpis.progressPercentage.toFixed(1)}%)`}
                    />
                    <ProgressKpiCard 
                        title="Progresso da Meta de Giro" 
                        mainValue={kpis.projectedInventoryTurnover.toFixed(2)}
                        progress={(kpis.projectedInventoryTurnover / kpis.goals.inventoryTurnoverGoal) * 100} 
                        note={`Giro Projetado | Meta: ${kpis.goals.inventoryTurnoverGoal.toFixed(2)}`} 
                    />
                    <StockLevelCard title="Nível de Estoque" summary={kpis.stockLevelSummary} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col justify-between">
                        <div>
                            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Margem Estoque/Produto</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Média Margem Real (Ativos)</p>
                            <p className="mt-2 text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                                {kpis.marginMetrics.activeMarginAvg.toFixed(2)}%
                            </p>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Representa <span className="font-bold text-gray-700 dark:text-gray-300">{kpis.marginMetrics.activeProductPercentage.toFixed(1)}%</span> do mix de produtos (Ruptura, Risco, Segurança).
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Média Geral (Todos):</span>
                                <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">{kpis.marginMetrics.overallMarginAvg.toFixed(2)}%</span>
                            </div>
                        </div>
                    </div>

                     <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-xl font-semibold mb-4">Top 10 Mais Vendidos</h2>
                         <div className="space-y-3 max-h-96 overflow-y-auto">
                            {top10SoldProducts.length === 0 ? <p className="text-gray-500">Nenhuma venda de produto no período.</p> : top10SoldProducts.map((p, i) => (
                                <div key={p.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="flex items-center overflow-hidden">
                                        <span className="text-sm font-bold w-8 shrink-0">{i + 1}.</span>
                                        <div className="truncate">
                                            <p className="font-medium text-sm truncate">{p.name}</p>
                                            <p className="text-xs text-gray-400">Estoque: {p.currentStock}</p>
                                        </div>
                                    </div>
                                    <p className="font-bold text-indigo-500 ml-2 shrink-0">{p.quantitySold} <span className="font-normal text-xs">unid.</span></p>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-xl font-semibold mb-4">Top 10 Menor Giro</h2>
                         <div className="space-y-3 max-h-96 overflow-y-auto">
                            {top10LowestTurnoverProducts.length === 0 ? <p className="text-gray-500">Nenhum produto com estoque.</p> : top10LowestTurnoverProducts.map((p, i) => (
                                 <div key={p.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="flex items-center overflow-hidden">
                                        <span className="text-sm font-bold w-8 shrink-0">{i + 1}.</span>
                                        <div className="truncate">
                                            <p className="font-medium text-sm truncate">{p.name}</p>
                                            <p className="text-xs text-gray-400">Vendidos: {p.quantitySold} | Estoque: {p.currentStock}</p>
                                        </div>
                                    </div>
                                    <p className={`font-bold text-xs shrink-0 ml-2 ${p.turnoverRatio! === 0 ? 'text-red-500' : 'text-yellow-500'}`}>Giro: {p.turnoverRatio!.toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                 <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-semibold mb-4">Insights de Gestão com IA</h2>
                    <button
                        onClick={handleGetInsights}
                        disabled={isLoadingInsights}
                        className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300"
                    >
                        {isLoadingInsights ? 'Analisando...' : 'Gerar Análise Estratégica'}
                    </button>
                    {isLoadingInsights && <div className="mt-4 text-center animate-pulse text-indigo-500">Analisando dados e gerando recomendações... 🧠</div>}
                    {insights && (
                        <div className="mt-4 p-4 bg-indigo-50 dark:bg-gray-700 rounded-lg">
                            <pre className="whitespace-pre-wrap font-sans text-sm sm:text-base text-gray-700 dark:text-gray-200">
                               {insights}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Dashboard;
