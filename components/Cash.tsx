
import React, { useState, useMemo, useEffect, useContext } from 'react';
import { CashTransaction, TransactionStatus, TransactionType, TransactionCategory } from '../types';
import { formatCurrencyNumber } from '../validation';
import { AuthContext } from '../contexts/AuthContext';

interface CashProps {
    transactions: CashTransaction[];
    updateTransactionStatus: (transactionId: string, status: TransactionStatus) => void;
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

const createDateAsUTC = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
};

const formatDateUTC = (dateString: Date | string) => {
    if (!dateString) return '-';
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
        onConfirm(date);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Confirmar Pagamento</h3>
                <input 
                    type="date" 
                    value={date}
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

const Cash: React.FC<CashProps> = ({ transactions, updateTransactionStatus, updateTransaction }) => {
    const { apiCall } = useContext(AuthContext);
    const [transactionToPay, setTransactionToPay] = useState<string | null>(null);
    const [installmentToPay, setInstallmentToPay] = useState<number | null>(null);

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

    // Filter AND Expand Transactions
    // Note: 'transactions' prop contains only CashTransaction records (Cash, Boleto, Bank Transfer, Invoice Payments).
    // Credit Card Costs are stored in CreditCardTransaction and fetched separately for Finance/Costs views, so they don't appear here by default.
    const filteredTransactions = useMemo(() => {
        let result: any[] = [];
        const [compYear, compMonth] = competency ? competency.split('-').map(Number) : [0, 0];

        transactions.forEach(t => {
            // Check for expanded installments
            if (t.installments && t.installments.length > 0) {
                // Iterate installments to find matching ones for this view
                t.installments.forEach((inst: any) => {
                    const refDate = inst.dueDate ? new Date(inst.dueDate) : new Date();
                    
                    // Filter by Competency
                    if (competency && (refDate.getUTCFullYear() !== compYear || (refDate.getUTCMonth() + 1) !== compMonth)) {
                        return; // Skip if not in month
                    }

                    // Create Virtual Transaction Object
                    const virtualT = {
                        ...t, // Copy parent props
                        id: t.id, // Keep parent ID
                        amount: inst.amount,
                        status: inst.status,
                        dueDate: inst.dueDate,
                        paymentDate: inst.paymentDate,
                        description: `${t.description} (${inst.number}/${t.installments.length})`,
                        isVirtual: true,
                        installmentNumber: inst.number
                    };

                    // Filter by Type/Status on virtual object
                    if (typeFilter !== 'All' && virtualT.type !== typeFilter) return;
                    if (statusFilter !== 'All' && virtualT.status !== statusFilter) return;

                    result.push(virtualT);
                });
            } else {
                // Standard Single Transaction
                const refDate = t.dueDate ? new Date(t.dueDate) : new Date(t.timestamp);
                
                if (competency && (refDate.getUTCFullYear() !== compYear || (refDate.getUTCMonth() + 1) !== compMonth)) {
                    return;
                }
                if (typeFilter !== 'All' && t.type !== typeFilter) return;
                if (statusFilter !== 'All' && t.status !== statusFilter) return;

                result.push(t);
            }
        });

        // Sort by date descending
        return result.sort((a,b) => {
             const dateA = a.dueDate ? new Date(a.dueDate) : new Date(a.timestamp);
             const dateB = b.dueDate ? new Date(b.dueDate) : new Date(b.timestamp);
             return dateB.getTime() - dateA.getTime();
        });
    }, [transactions, competency, statusFilter, typeFilter]);
    
    const summary = useMemo(() => {
        if (!competency) return { balance: 0, openingBalance: 0, income: 0, expense: 0 };
        
        const openingBalance = 0; // Future implementation

        // Current Month Stats
        const paidTransactionsThisMonth = filteredTransactions.filter(t => t.status === TransactionStatus.PAID);
        
        const income = paidTransactionsThisMonth.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
        const expense = paidTransactionsThisMonth.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
        
        return {
            balance: openingBalance + income - expense,
            openingBalance,
            income,
            expense
        };
    }, [filteredTransactions, competency]);

    useEffect(() => {
        setCurrentPage(1);
    }, [competency, statusFilter, typeFilter]);

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredTransactions.slice(indexOfFirstRecord, indexOfLastRecord);
    const nPages = Math.ceil(filteredTransactions.length / recordsPerPage);

    const nextPage = () => { if (currentPage < nPages) setCurrentPage(currentPage + 1); };
    const prevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
    
    const handleConfirmPayment = async (date: string) => {
        const safeDate = createDateAsUTC(date);
        if (transactionToPay) {
            const transaction = transactions.find(t => t.id === transactionToPay);
            if (transaction) {
                // Check if it's a virtual installment payment
                if (installmentToPay) {
                    const payload = {
                        ...transaction,
                        status: TransactionStatus.PAID,
                        paymentDate: safeDate,
                        installmentNumber: installmentToPay // Critical for backend to know which sub-item to update
                    };
                    // Use standard update, backend handles the logic based on installmentNumber presence
                    await apiCall(`transactions/${transaction.id}`, 'PUT', payload);
                    // Force refresh context handled by parent usually, but here we optimistically rely on prop update
                    // Ideally trigger a refresh callback if provided
                    // For now, we mimic updateTransaction which likely updates parent state
                    updateTransaction(payload);
                } else {
                    // Standard single update
                    const updated = {
                        ...transaction,
                        status: TransactionStatus.PAID,
                        paymentDate: safeDate 
                    };
                    updateTransaction(updated);
                }
            }
            setTransactionToPay(null);
            setInstallmentToPay(null);
        }
    };

    const handleRevertToPending = async (transaction: any) => {
        // If virtual, we need to send installment number
        const payload = {
            ...transaction,
            status: TransactionStatus.PENDING,
            paymentDate: null,
            installmentNumber: transaction.isVirtual ? transaction.installmentNumber : undefined
        };
        
        if (transaction.isVirtual) {
             await apiCall(`transactions/${transaction.id}`, 'PUT', payload);
             updateTransaction(payload); // Trigger UI refresh via parent
        } else {
             updateTransaction(payload);
        }
    };

    return (
        <div className="container mx-auto">
            <PaymentDateModal 
                isOpen={!!transactionToPay} 
                onClose={() => { setTransactionToPay(null); setInstallmentToPay(null); }} 
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
                                <th scope="col" className="px-6 py-3">Vencimento</th>
                                <th scope="col" className="px-6 py-3">Pagamento</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                             {currentRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-gray-500">Nenhum lançamento encontrado para os filtros aplicados.</td>
                                </tr>
                            ) : (
                                currentRecords.map((t, idx) => {
                                    const today = new Date().setHours(0,0,0,0);
                                    const dueDateObj = t.dueDate ? new Date(t.dueDate) : null;
                                    const paymentDateObj = t.paymentDate ? new Date(t.paymentDate) : null;

                                    const isLate = t.status === TransactionStatus.PENDING && dueDateObj && dueDateObj.getTime() < today;
                                    const isPaidLate = t.status === TransactionStatus.PAID && paymentDateObj && dueDateObj && paymentDateObj.getTime() > dueDateObj.getTime();
                                    
                                    // Check explicit flag for visual distinction
                                    const isInvoice = (t as any).isInvoice;
                                    // Key must be unique even for virtual rows
                                    const rowKey = t.isVirtual ? `${t.id}-inst-${t.installmentNumber}` : t.id;

                                    return (
                                    <tr key={rowKey} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${isInvoice ? 'bg-indigo-50 dark:bg-indigo-900/10' : 'bg-white dark:bg-gray-800'}`}>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            {isInvoice && <span className="mr-2 text-xl">💳</span>}
                                            {t.description}
                                        </td>
                                        <td className="px-6 py-4">{isInvoice ? 'Fatura Cartão' : t.category}</td>
                                        <td className={`px-6 py-4 font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                            {t.type === 'expense' && '-'} R$ {formatCurrencyNumber(t.amount)}
                                        </td>
                                        <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                                        
                                        <td className="px-6 py-4">
                                            {t.dueDate ? (
                                                <div className={isLate ? "text-red-500 font-bold" : ""}>
                                                    {formatDateUTC(t.dueDate)}
                                                    {isLate && <span className="block text-[10px] uppercase">Vencido</span>}
                                                </div>
                                            ) : '-'}
                                        </td>

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
                                                    onClick={() => {
                                                        setTransactionToPay(t.id);
                                                        if(t.isVirtual) setInstallmentToPay(t.installmentNumber);
                                                    }}
                                                    className="px-3 py-1 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                                                >
                                                    Pagar / Receber
                                                </button>
                                            )}
                                            {t.status === TransactionStatus.PAID && (
                                                 <button
                                                    onClick={() => handleRevertToPending(t)}
                                                    className={`px-3 py-1 text-xs font-medium rounded-md text-white ${isInvoice ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600'}`}
                                                    disabled={isInvoice} // Disable direct reopen for invoices to enforce flow consistency if desired
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
