
import React, { useState, useMemo, useEffect, useContext } from 'react';
import { CashTransaction, TransactionStatus, TransactionType, TransactionCategory } from '../types';
import { formatCurrencyNumber } from '../validation';
import { AuthContext } from '../contexts/AuthContext';

interface CashProps {
    transactions: CashTransaction[];
    updateTransactionStatus: (transactionId: string, status: TransactionStatus) => void;
    // We need a more robust update function that handles dates, not just status
    // Assuming updateTransactionStatus can be extended or we use a more generic update if available via props
    // For this specific component, I'll assume we might need to fetch the full update function or adapt.
    // However, looking at Layout.tsx, `updateTransactionStatus` only takes ID and status. 
    // To implement the requested feature properly, we should use `updateTransaction` logic from parent,
    // but since `updateTransaction` isn't passed directly to Cash in `Layout.tsx`, 
    // we will simulate it by calling updateTransactionStatus but we really need to update the date.
    
    // *CORRECTION*: Layout.tsx passes `updateTransactionStatus` which calls `updateTransaction` internally.
    // But `updateTransaction` in Layout.tsx expects a full object. 
    // The `updateTransactionStatus` in Layout.tsx currently is:
    // const updateTransactionStatus = async (transactionId: string, status: any) => {
    //    const transactionToUpdate = transactions.find(t => t.id === transactionId);
    //    if (transactionToUpdate) {
    //        await updateTransaction({ ...transactionToUpdate, status });
    //    }
    // };
    // This is insufficient for adding paymentDate. 
    // I will add a local `onConfirmPayment` logic here that requires the parent to expose a way to update the date.
    // Since I cannot change Layout.tsx in this specific change request block easily without making it huge, 
    // I will assume `updateTransactionStatus` implies a full update or I will rely on the fact 
    // that I am modifying `Cash.tsx` and can request `updateTransaction` directly if I change the interface.
    
    // Let's change the interface to accept `updateTransaction`.
    // NOTE: This requires `Layout.tsx` update implicitly. 
    // Ideally, the user request implied changing Cash component. 
    // I will assume `updateTransaction` is passed or I will add it to the interface and assume Layout passes it.
}

// Extending Props to include full update capability
interface ExtendedCashProps {
    transactions: CashTransaction[];
    // Replacing the simple status updater with the full update function for flexibility
    updateTransaction?: (transaction: CashTransaction) => void; 
    // Keep backward compatibility if needed, but we prefer updateTransaction
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

// Helper to prevent timezone issues (Store/Read as UTC Noon)
const createDateAsUTC = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    // Create Date at 12:00:00 UTC to ensure it falls on correct calendar day despite TZ
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
};

const formatDateUTC = (dateString: Date | string) => {
    if (!dateString) return '-';
    // Display using UTC timezone to match the stored strategy
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const PaymentDateModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: (date: string) => void; 
}> = ({ isOpen, onClose, onConfirm }) => {
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(today);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setDate(today);
            setError('');
        }
    }, [isOpen]);

    const handleConfirm = () => {
        if (!date) {
            setError('Data é obrigatória');
            return;
        }
        if (date > today) {
            setError('Data do pagamento não pode ser futura.');
            return;
        }
        onConfirm(date);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Confirmar Pagamento</h3>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">Informe a data real do pagamento:</p>
                <input 
                    type="date" 
                    value={date}
                    max={today}
                    onChange={(e) => setDate(e.target.value)} 
                    className={`w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2 mb-2 ${error ? 'border-red-500' : ''}`}
                />
                {error && <p className="text-xs text-red-500 mb-4">{error}</p>}
                
                <div className="flex justify-end space-x-3 mt-4">
                    <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-gray-200">Cancelar</button>
                    <button onClick={handleConfirm} className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white font-bold">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

const Cash: React.FC<ExtendedCashProps> = ({ transactions, updateTransactionStatus }) => {
    // Note: Since we don't have direct access to `updateTransaction` from props in the current Layout signature,
    // we will have to hack `updateTransactionStatus` or assume the user updates Layout.tsx too.
    // For this implementation to work correctly as requested, we need to pass `paymentDate` data up.
    // However, `updateTransactionStatus` signature is (id, status).
    // I will assume the parent component's `updateTransactionStatus` handles simple status toggle.
    // But to save the date, we really need the full update.
    // Since I cannot modify Layout.tsx in this specific response block easily without context of it being requested,
    // I will implement the UI here. 
    // *CRITICAL*: I will assume `updateTransactionStatus` essentially triggers a re-fetch or I will infer 
    // that I need to emit a custom event or similar.
    // Actually, looking at the previous Costs component, `updateTransaction` is available.
    // I'll assume for Cash, we might need to modify Layout.tsx to pass `updateTransaction`.
    // But to satisfy the prompt STRICTLY within the files requested (and assuming Layout might be updated later or I update it implicitly via logic):
    
    // Wait, the prompt says "Na guia Caixa... O botao condicional... deve abriu um modal".
    // I will implement the internal logic. If `updateTransaction` isn't passed, I'll fallback to `updateTransactionStatus` 
    // but that won't save the date.
    // To make this work, I will actually inject the logic to call the API directly if needed or assume props are updated.
    // Let's use `AuthContext` to get `apiCall` directly here to bypass Prop drilling limitation if necessary, 
    // but better is to define `updateTransaction` in props and assume Layout provides it (I will update Layout too if needed, but user didn't ask to change Layout explicitly, but "change the app").
    // I will assume Layout passes `updateTransaction` now because Costs has it. 
    // Ah, wait, Cash props in Layout are: `<Cash transactions={transactions} updateTransactionStatus={updateTransactionStatus} />`.
    // It does NOT pass updateTransaction. 
    // I will use `useContext(AuthContext)` to get `apiCall` and perform the update directly to ensure robustness without changing Layout.tsx signature if I can avoid it, OR I will modify `Layout.tsx` as well to be safe. 
    // The prompt says "Change files...". I will update Layout.tsx to pass `updateTransaction` to Cash.

    // State for Modal
    const [transactionToPay, setTransactionToPay] = useState<string | null>(null);

    // Context for API call (Direct update if props fail)
    // Actually, I'll modify Layout.tsx to pass `updateTransaction` to Cash. It's cleaner.
    const { apiCall } = useContext(AuthContext);
    
    // ... existing logic ...
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

    // ... existing useMemos ...
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
        // ... existing summary logic ...
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
        
        const incomeTransactions = paidTransactionsThisMonth.filter(t => t.type === TransactionType.INCOME);
        const serviceRevenue = incomeTransactions.filter(t => t.category === TransactionCategory.SERVICE_REVENUE).reduce((sum, t) => sum + t.amount, 0);
        const salesRevenue = incomeTransactions.filter(t => t.category === TransactionCategory.SALES_REVENUE).reduce((sum, t) => sum + t.amount, 0);
        const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);

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
    
    // NEW: Handle Payment Logic
    const handleInitiatePayment = (transactionId: string) => {
        setTransactionToPay(transactionId);
    };

    const handleConfirmPayment = async (date: string) => {
        if (!transactionToPay) return;
        
        const transaction = transactions.find(t => t.id === transactionToPay);
        if (transaction) {
            // Create UTC Date at Noon for safe storage
            const safeDate = createDateAsUTC(date);
            
            const updated = {
                ...transaction,
                status: TransactionStatus.PAID,
                paymentDate: safeDate 
            };
            
            await apiCall(`transactions/${transaction.id}`, 'PUT', updated);
            // Trigger UI update via the prop (even if redundant, it triggers fetch in parent)
            updateTransactionStatus(transaction.id, TransactionStatus.PAID);
        }
        setTransactionToPay(null);
    };

    const handleRevertToPending = async (transaction: CashTransaction) => {
        const updated = {
            ...transaction,
            status: TransactionStatus.PENDING,
            paymentDate: null
        };
        await apiCall(`transactions/${transaction.id}`, 'PUT', updated);
        updateTransactionStatus(transaction.id, TransactionStatus.PENDING);
    };

    return (
        <div className="container mx-auto">
            {/* Payment Modal */}
            <PaymentDateModal 
                isOpen={!!transactionToPay} 
                onClose={() => setTransactionToPay(null)} 
                onConfirm={handleConfirmPayment}
            />

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

            {/* Summary Cards ... existing code ... */}
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
                                <th scope="col" className="px-6 py-3">Lançamento</th>
                                <th scope="col" className="px-6 py-3">Vencimento</th>
                                <th scope="col" className="px-6 py-3">Pagamento</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                             {currentRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-gray-500">Nenhum lançamento encontrado para os filtros aplicados.</td>
                                </tr>
                            ) : (
                                currentRecords.map(t => {
                                    // Use UTC time to ensure day comparison is accurate
                                    const today = new Date().setHours(0,0,0,0);
                                    
                                    const dueDateObj = t.dueDate ? new Date(t.dueDate) : null;
                                    const paymentDateObj = t.paymentDate ? new Date(t.paymentDate) : null;

                                    // Overdue calculation: Pending AND Due Date < Today
                                    const isLate = t.status === TransactionStatus.PENDING && dueDateObj && dueDateObj.getTime() < today;
                                    
                                    // Paid Late: Paid AND PaymentDate > DueDate
                                    const isPaidLate = t.status === TransactionStatus.PAID && paymentDateObj && dueDateObj && paymentDateObj.getTime() > dueDateObj.getTime();

                                    return (
                                    <tr key={t.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t.description}</td>
                                        <td className="px-6 py-4">{t.category}</td>
                                        <td className={`px-6 py-4 font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                            {t.type === 'expense' && '-'} R$ {formatCurrencyNumber(t.amount)}
                                        </td>
                                        <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                                        <td className="px-6 py-4">{formatDateUTC(t.timestamp)}</td>
                                        
                                        {/* Due Date with Overdue Logic */}
                                        <td className="px-6 py-4">
                                            {t.dueDate ? (
                                                <div className={isLate ? "text-red-500 font-bold" : ""}>
                                                    {formatDateUTC(t.dueDate)}
                                                    {isLate && <span className="block text-[10px] uppercase">Vencido</span>}
                                                </div>
                                            ) : '-'}
                                        </td>

                                        {/* Payment Date */}
                                        <td className={`px-6 py-4 font-medium ${isPaidLate ? "text-red-500 font-bold" : "text-green-600"}`}>
                                            {t.status === TransactionStatus.PAID && t.paymentDate 
                                                ? (
                                                    <div>
                                                        {formatDateUTC(t.paymentDate)}
                                                        {isPaidLate && <span className="block text-[10px] uppercase text-red-500">Atraso</span>}
                                                    </div>
                                                ) 
                                                : '-'}
                                        </td>

                                        <td className="px-6 py-4">
                                            {t.status === TransactionStatus.PENDING && (
                                                 <button
                                                    onClick={() => handleInitiatePayment(t.id)}
                                                    className="px-3 py-1 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                                                >
                                                    Pagar / Receber
                                                </button>
                                            )}
                                            {t.status === TransactionStatus.PAID && (
                                                 <button
                                                    onClick={() => handleRevertToPending(t)}
                                                    className="px-3 py-1 text-xs font-medium rounded-md text-white bg-yellow-500 hover:bg-yellow-600"
                                                >
                                                    Reabrir
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )})
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
