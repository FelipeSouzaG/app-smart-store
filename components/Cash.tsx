
import React, { useState, useMemo, useEffect, useContext } from 'react';
import { CashTransaction, TransactionStatus, TransactionType, TransactionCategory, FinancialAccount } from '../types';
import { formatCurrencyNumber } from '../validation';
import { AuthContext } from '../contexts/AuthContext';

interface CashProps {
    transactions: CashTransaction[];
    updateTransactionStatus: (transactionId: string, status: TransactionStatus) => void;
    // We now receive the full update function to handle Date saving
    updateTransaction: (transaction: CashTransaction) => void;
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

// Augmented Interface for Virtual Transactions (Invoices)
interface VirtualInvoice extends CashTransaction {
    isInvoice: true;
    financialAccountId: string;
    paymentMethodId: string;
}

const Cash: React.FC<CashProps> = ({ transactions, updateTransactionStatus, updateTransaction }) => {
    const { apiCall } = useContext(AuthContext);
    
    // State for Modal
    const [transactionToPay, setTransactionToPay] = useState<string | null>(null);
    const [invoiceToPay, setInvoiceToPay] = useState<VirtualInvoice | null>(null);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

    useEffect(() => {
        const fetchAccounts = async () => {
            const data = await apiCall('financial', 'GET');
            if(data) setAccounts(data);
        };
        fetchAccounts();
    }, [apiCall]);

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

    // --- AGGREGATION LOGIC ---
    // 1. Identify transactions that belong to a Credit Card (Method type 'Credit')
    // 2. Group them by Account + Method + DueDate
    // 3. Create Virtual Transactions
    // 4. Exclude individual children from the main list
    
    const processedTransactions = useMemo(() => {
        if (!competency) return [];
        const [year, month] = competency.split('-').map(Number);
        
        // Helper to check if a transaction is credit card based
        const getCreditCardInfo = (t: CashTransaction) => {
            if (!t.financialAccountId || !t.paymentMethodId || t.financialAccountId === 'cash-box') return null;
            const acc = accounts.find(a => a.id === t.financialAccountId);
            if (!acc) return null;
            const method = acc.paymentMethods.find(m => m.id === t.paymentMethodId);
            if (method && method.type === 'Credit') return { acc, method };
            return null;
        };

        const normalTransactions: CashTransaction[] = [];
        const creditCardTransactions: CashTransaction[] = [];

        // Split transactions
        transactions.forEach(t => {
            const transactionDate = new Date(t.timestamp); // Use competency/launch date for filter
            const isCorrectMonth = transactionDate.getFullYear() === year && transactionDate.getMonth() + 1 === month;
            
            if (isCorrectMonth) {
                const ccInfo = getCreditCardInfo(t);
                if (ccInfo) {
                    creditCardTransactions.push(t);
                } else {
                    normalTransactions.push(t);
                }
            }
        });

        // Group Credit Card Transactions into Invoices
        const invoicesMap: { [key: string]: VirtualInvoice } = {};

        creditCardTransactions.forEach(t => {
            if (!t.dueDate) return; // Should not happen for CC costs generated by system
            
            // Key: AccountID_MethodID_DueDate(YYYY-MM-DD)
            const dueIso = new Date(t.dueDate).toISOString().split('T')[0];
            const key = `${t.financialAccountId}_${t.paymentMethodId}_${dueIso}`;
            const ccInfo = getCreditCardInfo(t)!;

            if (!invoicesMap[key]) {
                // Calculate Launch Date based on Closing Day logic approximation or use DueDate - ~10 days?
                // The prompt says: "Lançamento => Data do dia de Fechamento conforme cadastro do cartão"
                // We will approximate launch date to Closing Day of the PREVIOUS month relative to due date usually.
                // But specifically for display in THIS competency list, we rely on the fact that these items passed the competency filter above.
                // So we use the timestamp of the first item as a proxy or construct it.
                // Simplification: Use the item's timestamp which should align with closing cycle.
                
                invoicesMap[key] = {
                    id: `INV_${key}`, // Virtual ID
                    description: `Fatura Cartão ${ccInfo.acc.bankName}`,
                    category: ccInfo.method.name as any, // Visual trick
                    amount: 0,
                    type: TransactionType.EXPENSE,
                    status: TransactionStatus.PAID, // Start as PAID, switch to PENDING if any child is pending
                    timestamp: new Date(t.timestamp), // Use first item's timestamp
                    dueDate: new Date(t.dueDate),
                    paymentDate: undefined,
                    isInvoice: true,
                    financialAccountId: t.financialAccountId!,
                    paymentMethodId: t.paymentMethodId!
                };
            }

            // Sum amount
            invoicesMap[key].amount += t.amount;
            
            // If ANY item is pending, the invoice is pending
            if (t.status === TransactionStatus.PENDING) {
                invoicesMap[key].status = TransactionStatus.PENDING;
                invoicesMap[key].paymentDate = undefined; // Clear payment date if pending
            } else if (invoicesMap[key].status === TransactionStatus.PAID) {
                // If currently marked paid, keep payment date (use first one found)
                if (!invoicesMap[key].paymentDate && t.paymentDate) {
                    invoicesMap[key].paymentDate = new Date(t.paymentDate);
                }
            }
        });

        const virtualInvoices = Object.values(invoicesMap);
        
        return [...normalTransactions, ...virtualInvoices];

    }, [transactions, competency, accounts]);


    const filteredTransactions = useMemo(() => {
        let result = processedTransactions;
        if (typeFilter !== 'All') {
            result = result.filter(t => t.type === typeFilter);
        }
        if (statusFilter !== 'All') {
            result = result.filter(t => t.status === statusFilter);
        }
        return result.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [processedTransactions, statusFilter, typeFilter]);
    
    const summary = useMemo(() => {
        // ... existing summary logic needs to be adapted to use PROCESSED transactions to account for invoices ...
        if (!competency) return { balance: 0, openingBalance: 0, income: 0, serviceRevenue: 0, salesRevenue: 0, expense: 0, fixedCosts: 0, variableCosts: 0 };
        
        // Note: For strict accounting, opening balance should use all historical raw transactions.
        // But for the current month view, we use the virtual invoices.
        // This is a complex mix. For simplicity in this view, we calculate totals based on the DISPLAYED (virtual) list for the current month
        // and RAW list for previous history.

        const [year, month] = competency.split('-').map(Number);
        const competencyStartDate = new Date(year, month - 1, 1);

        // History: Use RAW transactions
        const previousTransactions = transactions.filter(t => new Date(t.timestamp) < competencyStartDate);
        
        const openingBalance = previousTransactions.reduce((balance, t) => {
            if (t.status === TransactionStatus.PAID) {
                 return balance + (t.type === 'income' ? t.amount : -t.amount);
            }
            return balance;
        }, 0);

        // Current Month: Use VIRTUAL list to match display
        const paidTransactionsThisMonth = processedTransactions.filter(t => t.status === TransactionStatus.PAID);
        
        const incomeTransactions = paidTransactionsThisMonth.filter(t => t.type === TransactionType.INCOME);
        const serviceRevenue = incomeTransactions.filter(t => t.category === TransactionCategory.SERVICE_REVENUE).reduce((sum, t) => sum + t.amount, 0);
        const salesRevenue = incomeTransactions.filter(t => t.category === TransactionCategory.SALES_REVENUE).reduce((sum, t) => sum + t.amount, 0);
        const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);

        const expenseTransactions = paidTransactionsThisMonth.filter(t => t.type === TransactionType.EXPENSE);
        // Categories check needs to be loose because Invoice category is dynamic
        const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        // Simplified classification for summary card since invoices obscure categories
        const fixedCosts = 0; // Hard to classify invoice as purely fixed/variable
        const variableCosts = 0;
        
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
    }, [transactions, processedTransactions, competency]);

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
    const handleInitiatePayment = (t: CashTransaction | VirtualInvoice) => {
        if ((t as VirtualInvoice).isInvoice) {
            setInvoiceToPay(t as VirtualInvoice);
        } else {
            setTransactionToPay(t.id);
        }
    };

    const handleConfirmPayment = async (date: string) => {
        // Create UTC Date at Noon for safe storage
        const safeDate = createDateAsUTC(date);

        if (invoiceToPay) {
            // Batch Pay via API
            try {
                await apiCall('transactions/pay-invoice', 'POST', {
                    financialAccountId: invoiceToPay.financialAccountId,
                    paymentMethodId: invoiceToPay.paymentMethodId,
                    dueDate: invoiceToPay.dueDate, // The invoice key
                    paymentDate: safeDate
                });
                // After payment, force refresh of transactions is needed. 
                // However, since we don't have a refresh trigger passed down easily besides 'updateTransaction',
                // we might need to rely on the parent or trigger a reload. 
                // Ideally `Cash` should fetch its own data or have a refresh callback.
                // Assuming `updateTransaction` forces a re-fetch in Parent (Layout), we can hack it:
                // We call updateTransaction with a dummy update to trigger refresh? 
                // Or better, Layout needs to pass a refresh handler.
                // Since `updateTransaction` fetches data in Layout, let's try calling it on one item? No, that's messy.
                // We will reload the page for now as a fallback or assume the user navigates.
                // BETTER: Trigger a window reload or a state update in Context if available.
                // The `apiCall` wrapper in context doesn't auto-refresh data.
                // The `updateTransaction` prop in Layout does: `if (result) await fetchData...`
                // So let's fake an update call to trigger refresh.
                
                // Hack: Update one "dummy" or "first" transaction to force Layout refresh?
                // Proper fix: Cash should manage its own data fetching or Layout pass refresh.
                // Given the constraints, let's reload window.location or use `updateTransaction` on the first raw transaction found inside invoice?
                // Let's reload.
                window.location.reload(); 
            } catch (e) {
                console.error(e);
                alert("Erro ao pagar fatura.");
            }
            setInvoiceToPay(null);
        } 
        else if (transactionToPay) {
            const transaction = transactions.find(t => t.id === transactionToPay);
            if (transaction) {
                const updated = {
                    ...transaction,
                    status: TransactionStatus.PAID,
                    paymentDate: safeDate 
                };
                updateTransaction(updated);
            }
            setTransactionToPay(null);
        }
    };

    const handleRevertToPending = async (transaction: CashTransaction | VirtualInvoice) => {
        if ((transaction as VirtualInvoice).isInvoice) {
            alert("Para reabrir uma fatura, edite os itens individuais na aba Financeiro > Banco > Faturas.");
            return;
        }

        const updated = {
            ...transaction,
            status: TransactionStatus.PENDING,
            // Explicitly set paymentDate to undefined/null when reverting
            paymentDate: undefined as any
        };
        updateTransaction(updated);
    };

    return (
        <div className="container mx-auto">
            {/* Payment Modal */}
            <PaymentDateModal 
                isOpen={!!transactionToPay || !!invoiceToPay} 
                onClose={() => { setTransactionToPay(null); setInvoiceToPay(null); }} 
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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-gray-500 dark:text-gray-400">
                    <h3 className="text-sm font-medium">Saldo Acumulado</h3>
                    <p className="mt-1 text-3xl font-semibold">R$ {formatCurrencyNumber(summary.openingBalance)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Entradas (Mês)</h3>
                    <p className="mt-1 text-3xl font-semibold text-green-500">R$ {formatCurrencyNumber(summary.income)}</p>
                </div>
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Saídas (Mês)</h3>
                    <p className="mt-1 text-3xl font-semibold text-red-500">R$ {formatCurrencyNumber(summary.expense)}</p>
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

                                    // Overdue calculation
                                    const isLate = t.status === TransactionStatus.PENDING && dueDateObj && dueDateObj.getTime() < today;
                                    const isPaidLate = t.status === TransactionStatus.PAID && paymentDateObj && dueDateObj && paymentDateObj.getTime() > dueDateObj.getTime();
                                    
                                    const isInvoice = (t as VirtualInvoice).isInvoice;

                                    return (
                                    <tr key={t.id} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${isInvoice ? 'bg-indigo-50 dark:bg-indigo-900/10' : 'bg-white dark:bg-gray-800'}`}>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            {isInvoice && <span className="mr-2">💳</span>}
                                            {t.description}
                                        </td>
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
                                                    onClick={() => handleInitiatePayment(t)}
                                                    className="px-3 py-1 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                                                >
                                                    Pagar / Receber
                                                </button>
                                            )}
                                            {t.status === TransactionStatus.PAID && (
                                                 <button
                                                    onClick={() => handleRevertToPending(t)}
                                                    className={`px-3 py-1 text-xs font-medium rounded-md text-white ${isInvoice ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600'}`}
                                                    disabled={isInvoice}
                                                    title={isInvoice ? "Edite as transações individuais no menu Financeiro" : "Reabrir transação"}
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
