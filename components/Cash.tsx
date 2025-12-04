import React, { useState, useMemo, useEffect } from 'react';
import { CashTransaction, TransactionStatus, TransactionType, TransactionCategory } from '../types';
import { formatCurrencyNumber } from '../validation';

interface CashProps {
    transactions: CashTransaction[];
    updateTransactionStatus: (transactionId: string, status: TransactionStatus) => void;
}

const StatusBadge: React.FC<{ status: TransactionStatus }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
    const statusClasses = {
        [TransactionStatus.PAID]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        [TransactionStatus.PENDING]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    };
    return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

const Cash: React.FC<CashProps> = ({ transactions, updateTransactionStatus }) => {
    const getCurrentCompetency = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        return `${year}-${month}`;
    };

    const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'All'>('All');
    const [typeFilter, setTypeFilter] = useState<'All' | TransactionType>('All');
    const [competency, setCompetency] = useState<string>(getCurrentCompetency());
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 15;


    const handleCompetencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCompetency(e.target.value);
    };

    const transactionsForCompetency = useMemo(() => {
        if (!competency) return [];
        const [year, month] = competency.split('-').map(Number);
        return transactions.filter(t => {
            const transactionDate = new Date(t.timestamp);
            return transactionDate.getFullYear() === year && transactionDate.getMonth() + 1 === month;
        });
    }, [transactions, competency]);

    const filteredTransactions = useMemo(() => {
        let result = transactionsForCompetency;
        if (typeFilter !== 'All') {
            result = result.filter(t => t.type === typeFilter);
        }
        if (statusFilter !== 'All') {
            result = result.filter(t => t.status === statusFilter);
        }
        return result.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [transactionsForCompetency, statusFilter, typeFilter]);
    
    const summary = useMemo(() => {
        if (!competency) return { balance: 0, openingBalance: 0, income: 0, serviceRevenue: 0, salesRevenue: 0, expense: 0, fixedCosts: 0, variableCosts: 0 };
        
        const [year, month] = competency.split('-').map(Number);
        const competencyStartDate = new Date(year, month - 1, 1);

        const previousTransactions = transactions.filter(t => new Date(t.timestamp) < competencyStartDate);
        
        const openingBalance = previousTransactions.reduce((balance, t) => {
            if (t.status === TransactionStatus.PAID) {
                 return balance + (t.type === 'income' ? t.amount : -t.amount);
            }
            return balance;
        }, 0);

        const paidTransactionsThisMonth = transactionsForCompetency.filter(t => t.status === TransactionStatus.PAID);
        
        // Income breakdown
        const incomeTransactions = paidTransactionsThisMonth.filter(t => t.type === TransactionType.INCOME);
        const serviceRevenue = incomeTransactions.filter(t => t.category === TransactionCategory.SERVICE_REVENUE).reduce((sum, t) => sum + t.amount, 0);
        const salesRevenue = incomeTransactions.filter(t => t.category === TransactionCategory.SALES_REVENUE).reduce((sum, t) => sum + t.amount, 0);
        const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);

        // Expense breakdown
        const expenseTransactions = paidTransactionsThisMonth.filter(t => t.type === TransactionType.EXPENSE);
        const fixedCostCategories = [TransactionCategory.RENT, TransactionCategory.WATER, TransactionCategory.ELECTRICITY, TransactionCategory.INTERNET, TransactionCategory.TAXES, TransactionCategory.SALARY, TransactionCategory.OTHER];
        const variableCostCategories = [TransactionCategory.SERVICE_COST, TransactionCategory.PRODUCT_PURCHASE];
        
        const fixedCosts = expenseTransactions.filter(t => fixedCostCategories.includes(t.category)).reduce((sum, t) => sum + t.amount, 0);
        const variableCosts = expenseTransactions.filter(t => variableCostCategories.includes(t.category)).reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        return {
            balance: openingBalance + totalIncome - totalExpense,
            openingBalance,
            income: totalIncome,
            serviceRevenue,
            salesRevenue,
            expense: totalExpense,
            fixedCosts,
            variableCosts,
        };
    }, [transactions, competency]);

    useEffect(() => {
        setCurrentPage(1);
    }, [competency, statusFilter, typeFilter]);

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredTransactions.slice(indexOfFirstRecord, indexOfLastRecord);
    const nPages = Math.ceil(filteredTransactions.length / recordsPerPage);

    const nextPage = () => {
        if (currentPage < nPages) setCurrentPage(currentPage + 1);
    };
    const prevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };
    

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Fluxo de Caixa</h1>
                
                <div className="flex items-center gap-2">
                    <label htmlFor="competency-picker" className="text-sm font-medium text-gray-700 dark:text-gray-300">Competência:</label>
                    <input 
                        type="month" 
                        id="competency-picker"
                        value={competency}
                        onChange={handleCompetencyChange}
                        className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-gray-500 dark:text-gray-400">
                    <h3 className="text-sm font-medium">Saldo Acumulado</h3>
                    <p className="mt-1 text-3xl font-semibold">R$ {formatCurrencyNumber(summary.openingBalance)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Entradas (Mês)</h3>
                    <p className="mt-1 text-3xl font-semibold text-green-500">R$ {formatCurrencyNumber(summary.income)}</p>
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs space-y-1 text-gray-600 dark:text-gray-300">
                        <p>Serviços: R$ {formatCurrencyNumber(summary.serviceRevenue)}</p>
                        <p>Vendas: R$ {formatCurrencyNumber(summary.salesRevenue)}</p>
                    </div>
                </div>
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Saídas (Mês)</h3>
                    <p className="mt-1 text-3xl font-semibold text-red-500">R$ {formatCurrencyNumber(summary.expense)}</p>
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs space-y-1 text-gray-600 dark:text-gray-300">
                        <p>Custos Fixos: R$ {formatCurrencyNumber(summary.fixedCosts)}</p>
                        <p>Custos Variáveis: R$ {formatCurrencyNumber(summary.variableCosts)}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-blue-500">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Saldo Final (Realizado)</h3>
                    <p className="mt-1 text-3xl font-semibold">R$ {formatCurrencyNumber(summary.balance)}</p>
                </div>
            </div>

             <div className="mb-4 flex flex-wrap gap-x-6 gap-y-4">
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Tipo:</span>
                    <button onClick={() => setTypeFilter('All')} className={`px-3 py-1 text-sm rounded-full ${typeFilter === 'All' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Todos</button>
                    <button onClick={() => setTypeFilter(TransactionType.INCOME)} className={`px-3 py-1 text-sm rounded-full ${typeFilter === TransactionType.INCOME ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Faturamentos</button>
                    <button onClick={() => setTypeFilter(TransactionType.EXPENSE)} className={`px-3 py-1 text-sm rounded-full ${typeFilter === TransactionType.EXPENSE ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Custos</button>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Status:</span>
                    {(['All', ...Object.values(TransactionStatus)]).map(status => (
                        <button key={status} onClick={() => setStatusFilter(status as TransactionStatus | 'All')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === status ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                            {status === 'All' ? 'Todos' : status}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                         <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Descrição</th>
                                <th scope="col" className="px-6 py-3">Categoria</th>
                                <th scope="col" className="px-6 py-3">Valor</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Data Lançamento</th>
                                <th scope="col" className="px-6 py-3">Data Vencimento</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                             {currentRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-gray-500">Nenhum lançamento encontrado para os filtros aplicados.</td>
                                </tr>
                            ) : (
                                currentRecords.map(t => (
                                    <tr key={t.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t.description}</td>
                                        <td className="px-6 py-4">{t.category}</td>
                                        <td className={`px-6 py-4 font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                            {t.type === 'expense' && '-'} R$ {formatCurrencyNumber(t.amount)}
                                        </td>
                                        <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                                        <td className="px-6 py-4">{new Date(t.timestamp).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                                        <td className="px-6 py-4">{t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            {t.status === TransactionStatus.PENDING && (
                                                 <button
                                                    onClick={() => updateTransactionStatus(t.id, TransactionStatus.PAID)}
                                                    className="px-3 py-1 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                                                >
                                                    Alterar para Pago
                                                </button>
                                            )}
                                            {t.status === TransactionStatus.PAID && (
                                                 <button
                                                    onClick={() => updateTransactionStatus(t.id, TransactionStatus.PENDING)}
                                                    className="px-3 py-1 text-xs font-medium rounded-md text-white bg-yellow-500 hover:bg-yellow-600"
                                                >
                                                    Alterar para Pendente
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {nPages > 1 && (
                    <div className="p-4 flex justify-between items-center flex-wrap gap-2">
                         <span className="text-sm text-gray-700 dark:text-gray-400">
                            Página {currentPage} de {nPages} ({filteredTransactions.length} registros)
                        </span>
                        <div className="flex space-x-2">
                            <button
                                onClick={prevPage}
                                disabled={currentPage === 1}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={nextPage}
                                disabled={currentPage === nPages || nPages === 0}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                Próximo
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Cash;
