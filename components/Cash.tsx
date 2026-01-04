
import React, { useState, useMemo, useEffect, useContext } from 'react';
import { CashTransaction, TransactionStatus, TransactionType, TransactionCategory, FinancialAccount, PaymentMethodConfig } from '../types';
import { formatCurrencyNumber } from '../validation';
import { AuthContext } from '../contexts/AuthContext';

interface CashProps {
    transactions: CashTransaction[];
    creditTransactions: any[]; // Individual Credit Card Items (Expenses)
    accounts: FinancialAccount[]; 
    updateTransactionStatus: (transactionId: string, status: TransactionStatus) => void;
    updateTransaction: (transaction: CashTransaction) => void;
    onSaveAccount: (data: any) => Promise<void>;
    onDeleteAccount: (id: string) => Promise<void>;
    onRefreshData: () => Promise<void>; // New callback to trigger refresh in parent
}

// --- HELPERS ---
const createDateAsUTC = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
};

const formatDateUTC = (dateString: Date | string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

// --- MODALS ---

// Confirm Payment Modal
const ConfirmPaymentModal: React.FC<{ 
    isOpen: boolean; 
    transaction: any | null;
    accounts: FinancialAccount[];
    onClose: () => void; 
    onConfirm: (payload: any) => void; 
}> = ({ isOpen, transaction, accounts, onClose, onConfirm }) => {
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(today);
    const [selectedAccountId, setSelectedAccountId] = useState('cash-box');
    const [futureDateError, setFutureDateError] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setDate(today);
            // Default to matching the source account if possible, or cash-box
            if (transaction?.financialAccountId === 'bank-main') {
                setSelectedAccountId('bank-main');
            } else {
                setSelectedAccountId('cash-box');
            }
            setFutureDateError(false);
        }
    }, [isOpen, transaction]);

    const isInvoice = transaction?.isInvoice;
    // For Invoice Payment: Can pay with Cash or Bank
    
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        if (newDate > today) {
            setFutureDateError(true);
            setTimeout(() => setDate(today), 1500); 
        } else {
            setFutureDateError(false);
            setDate(newDate);
        }
    };

    const handleConfirm = () => {
        if (!date) return;
        
        if (isInvoice) {
            const payload = {
                action: 'pay-invoice',
                financialAccountId: transaction.financialAccountId, 
                paymentMethodId: transaction.paymentMethodId,     
                dueDate: transaction.dueDate,
                paymentDate: createDateAsUTC(date),
                sourceAccountId: selectedAccountId,
                sourceMethodId: undefined // Logic simplified: Bank/Cash direct debit
            };
            onConfirm(payload);
        } else {
            // Regular Transaction Payment
            const payload: any = {
                ...transaction,
                status: TransactionStatus.PAID,
                paymentDate: createDateAsUTC(date),
                financialAccountId: selectedAccountId,
                paymentMethodId: undefined, // Cleared on payment if it was pending
                installmentNumber: transaction?.installmentNumber,
                isSurgical: true // CRITICAL: Tells backend to just update status
            };
            onConfirm(payload);
        }
    };

    if (!isOpen || !transaction) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-70 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-sm animate-fade-in relative">
                {futureDateError && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-xl z-50 p-4 text-center">
                        <div className="bg-white p-4 rounded-lg">
                            <div className="text-red-500 text-3xl mb-2">⚠️</div>
                            <h4 className="font-bold text-gray-900 mb-1">Data Futura Não Permitida</h4>
                            <p className="text-sm text-gray-600">O pagamento deve ser realizado hoje ou em data retroativa.</p>
                        </div>
                    </div>
                )}

                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
                    {isInvoice ? 'Pagar Fatura de Cartão' : transaction.installmentNumber ? `Baixar Parcela ${transaction.installmentNumber}` : 'Baixar Lançamento'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">{transaction.description}</p>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Data do Pagamento</label>
                        <input 
                            type="date" 
                            value={date} 
                            max={today}
                            onChange={handleDateChange} 
                            className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2 focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                            {isInvoice ? 'Origem do Recurso' : 'Confirmar Saída/Entrada em'}
                        </label>
                        <select 
                            value={selectedAccountId} 
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2 focus:ring-2 focus:ring-green-500 outline-none"
                        >
                            <option value="cash-box">Dinheiro do Caixa</option>
                            <option value="bank-main">Conta Bancária (Pix/Débito)</option>
                        </select>
                    </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-gray-200">Cancelar</button>
                    <button 
                        onClick={handleConfirm} 
                        className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold shadow-md transition-all"
                    >
                        Confirmar Baixa
                    </button>
                </div>
            </div>
        </div>
    );
};

// Revert Invoice Modal
const RevertInvoiceModal: React.FC<{ 
    isOpen: boolean; 
    transaction: any | null; 
    onClose: () => void; 
    onConfirm: (transaction: any) => void; 
}> = ({ isOpen, transaction, onClose, onConfirm }) => {
    if (!isOpen || !transaction) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-70 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-sm animate-fade-in border-2 border-red-500">
                <div className="flex items-center justify-center mb-4 text-red-500">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold mb-2 text-center text-gray-900 dark:text-white">
                    Reverter Pagamento?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-6">
                    Você está prestes a desfazer o pagamento da <strong>{transaction.description}</strong>.
                    <br/><br/>
                    Isso fará com que a fatura volte para o status <strong>Pendente (Fechada/Atrasada)</strong>.
                </p>
                <div className="flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-gray-200 font-medium">Cancelar</button>
                    <button 
                        onClick={() => onConfirm(transaction)} 
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold shadow-md transition-all"
                    >
                        Sim, Reverter
                    </button>
                </div>
            </div>
        </div>
    );
};

// Invoice History Modal (Refactored to consume props for real-time updates)
const InvoiceHistoryModal: React.FC<{ 
    isOpen: boolean;
    transactions: CashTransaction[]; // NEW PROP: Consume from parent
    onClose: () => void;
    onReopen: (invoice: any) => void;
    onPay: (invoice: any) => void;
}> = ({ isOpen, transactions, onClose, onReopen, onPay }) => {
    // Filter invoices from current props for instant sync
    const invoices = useMemo(() => {
        return transactions.filter((t: any) => 
            t.isInvoice && 
            t.financialAccountId === 'credit-main'
        ).sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    }, [transactions]);

    if (!isOpen) return null;

    const getStatusLabel = (inv: any) => {
        const today = new Date().setHours(0,0,0,0);
        const due = new Date(inv.dueDate).getTime();
        
        if (inv.status === TransactionStatus.PAID) return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">Paga</span>;
        if (inv.invoiceStatus === 'Open') return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">Aberta</span>;
        if (due < today) return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold">Atrasada</span>;
        return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">Fechada</span>;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-60 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold dark:text-white">Gerenciar Faturas</h3>
                        <p className="text-sm text-gray-500">Histórico de fechamentos e pagamentos.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl">&times;</button>
                </div>
                
                <div className="overflow-y-auto p-0">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                            <tr>
                                <th className="px-6 py-4">Vencimento</th>
                                <th className="px-6 py-4 text-right">Total da Fatura</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.length === 0 ? <tr><td colSpan={4} className="text-center py-8">Nenhuma fatura gerada ainda.</td></tr> :
                                invoices.map(inv => (
                                <tr key={inv.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{formatDateUTC(inv.dueDate)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-lg">R$ {formatCurrencyNumber(inv.amount)}</td>
                                    <td className="px-6 py-4 text-center">{getStatusLabel(inv)}</td>
                                    <td className="px-6 py-4 text-center">
                                        {inv.status === TransactionStatus.PAID ? (
                                            <button 
                                                onClick={() => onReopen(inv)}
                                                className="text-orange-500 hover:text-orange-700 font-bold text-xs uppercase"
                                            >
                                                Reverter
                                            </button>
                                        ) : (
                                            inv.invoiceStatus !== 'Open' && (
                                                <button 
                                                    onClick={() => onPay(inv)}
                                                    className="px-3 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700"
                                                >
                                                    Pagar
                                                </button>
                                            )
                                        )}
                                    </td>
                                </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    ); 
};

// --- MAIN CASH COMPONENT ---

const StatusBadge: React.FC<{ status: TransactionStatus }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
    const statusClasses = {
        [TransactionStatus.PAID]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        [TransactionStatus.PENDING]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    };
    return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

const Cash: React.FC<CashProps> = ({ transactions, creditTransactions, accounts, updateTransactionStatus, updateTransaction, onSaveAccount, onDeleteAccount, onRefreshData }) => {
    const { apiCall } = useContext(AuthContext);
    const [activeView, setActiveView] = useState<'flow' | 'credit'>('flow');
    
    // Flow State
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
    
    // Credit Tab State
    const [creditCompetency, setCreditCompetency] = useState<string>(getCurrentCompetency());
    const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);

    // Pay Modal State
    const [itemToPay, setItemToPay] = useState<any | null>(null);
    const [itemToRevert, setItemToRevert] = useState<any | null>(null);

    // --- DATA PROCESSING ---

    const filteredTransactions = useMemo(() => {
        let result: any[] = [];
        const [compYear, compMonth] = competency ? competency.split('-').map(Number) : [0, 0];

        transactions.forEach(t => {
            // FILTER: 
            // 1. Exclude Credit Card Transactions (Items) - they belong to Credit Tab
            // 2. Include Invoices (the bill to be paid) if they match status criteria
            
            const isCreditAccount = t.financialAccountId === 'credit-main';
            const isInvoice = (t as any).isInvoice;

            if (isCreditAccount && !isInvoice) {
                return; // Skip individual credit card items in Cash Flow
            }

            // Logic for Invoices visibility in Flow
            if (isInvoice) {
                const invoiceStatus = (t as any).invoiceStatus || 'Open'; 
                // Only show in Flow if Paid OR (Pending AND (Closed or Late/due passed))
                if (invoiceStatus === 'Open' && t.status !== TransactionStatus.PAID) {
                    return; // Skip open accumulating invoices
                }
            }

            // Check for expanded installments (Boleto or Split Costs)
            if (t.installments && t.installments.length > 0) {
                t.installments.forEach((inst: any) => {
                    const refDate = inst.paymentDate ? new Date(inst.paymentDate) : (inst.dueDate ? new Date(inst.dueDate) : new Date());
                    
                    if (competency && (refDate.getUTCFullYear() !== compYear || (refDate.getUTCMonth() + 1) !== compMonth)) {
                        return;
                    }

                    const virtualT = {
                        ...t, 
                        id: t.id, 
                        amount: inst.amount,
                        status: inst.status,
                        dueDate: inst.dueDate,
                        paymentDate: inst.paymentDate,
                        description: `${t.description} (${inst.number}/${t.installments.length})`,
                        isVirtual: true,
                        installmentNumber: inst.number
                    };

                    if (typeFilter !== 'All' && virtualT.type !== typeFilter) return;
                    if (statusFilter !== 'All' && virtualT.status !== statusFilter) return;

                    result.push(virtualT);
                });
            } else {
                // Single Transaction
                const refDate = t.status === TransactionStatus.PAID && t.paymentDate 
                    ? new Date(t.paymentDate) 
                    : (t.dueDate ? new Date(t.dueDate) : new Date(t.timestamp));
                
                if (competency && (refDate.getUTCFullYear() !== compYear || (refDate.getUTCMonth() + 1) !== compMonth)) {
                    return;
                }
                if (typeFilter !== 'All' && t.type !== typeFilter) return;
                if (statusFilter !== 'All' && t.status !== statusFilter) return;

                result.push(t);
            }
        });

        return result.sort((a,b) => {
             const dateA = a.paymentDate ? new Date(a.paymentDate) : (a.dueDate ? new Date(a.dueDate) : new Date(a.timestamp));
             const dateB = b.paymentDate ? new Date(b.paymentDate) : (b.dueDate ? new Date(b.dueDate) : new Date(b.timestamp));
             return dateB.getTime() - dateA.getTime();
        });
    }, [transactions, competency, statusFilter, typeFilter]);
    
    // Credit Card Tab Filtering
    const { currentInvoiceItems, currentInvoiceTotal } = useMemo(() => {
        if (!creditTransactions) return { currentInvoiceItems: [], currentInvoiceTotal: 0 };
        
        const [compYear, compMonth] = creditCompetency.split('-').map(Number);
        
        const items = creditTransactions.filter(t => {
            if (!t.dueDate) return false;
            const d = new Date(t.dueDate);
            return d.getUTCFullYear() === compYear && (d.getUTCMonth() + 1) === compMonth;
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const total = items.reduce((sum, item) => sum + item.amount, 0);
        return { currentInvoiceItems: items, currentInvoiceTotal: total };
    }, [creditTransactions, creditCompetency]);

    // Find the actual invoice record for the selected credit competency to show status
    const selectedInvoiceRecord = useMemo(() => {
        const [compYear, compMonth] = creditCompetency.split('-').map(Number);
        return transactions.find(t => {
            if (!t.isInvoice) return false;
            const d = new Date(t.dueDate!);
            return d.getUTCFullYear() === compYear && (d.getUTCMonth() + 1) === compMonth;
        });
    }, [transactions, creditCompetency]);


    const summary = useMemo(() => {
        if (!competency) return { balance: 0, openingBalance: 0, income: 0, expense: 0 };
        
        const openingBalance = 0; 

        // CRITICAL: Summary only counts PAID transactions for true Cash Flow
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

    useEffect(() => { setCurrentPage(1); }, [competency, statusFilter, typeFilter]);

    // --- HANDLERS ---

    const handlePayClick = (item: any) => {
        setItemToPay(item);
    };

    const confirmPayment = async (payload: any) => {
        let result;
        if (payload.action === 'pay-invoice') {
            result = await apiCall('transactions/pay-invoice', 'POST', payload); 
        } else {
            result = await apiCall(`transactions/${payload.id}`, 'PUT', payload);
        }

        if (result) {
            await onRefreshData();
        }
        setItemToPay(null);
        // REMOVED: Auto-close setShowInvoiceHistory(false) so user sees status updated in modal
    };

    const handleRevertClick = (item: any) => {
        setItemToRevert(item);
    }

    const confirmRevertInvoice = async (invoice: any) => {
        // Re-open logic assumes setting it back to pending and clearing paymentDate
        const result = await apiCall(`transactions/${invoice.id}`, 'PUT', {
            status: TransactionStatus.PENDING,
            paymentDate: null,
            invoiceStatus: 'Closed' // Keep it closed so it doesn't disappear, just unpaid
        });

        if (result) {
            setItemToRevert(null);
            await onRefreshData();
        }
    }

    // --- RENDER ---

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredTransactions.slice(indexOfFirstRecord, indexOfLastRecord);
    const nPages = Math.ceil(filteredTransactions.length / recordsPerPage);

    const nextPage = () => { if (currentPage < nPages) setCurrentPage(currentPage + 1); };
    const prevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

    return (
        <div className="container mx-auto">
            {/* Modals */}
            {itemToPay && (
                <ConfirmPaymentModal 
                    isOpen={!!itemToPay}
                    transaction={itemToPay}
                    accounts={accounts}
                    onClose={() => setItemToPay(null)}
                    onConfirm={confirmPayment}
                />
            )}
            {itemToRevert && (
                <RevertInvoiceModal 
                    isOpen={!!itemToRevert}
                    transaction={itemToRevert}
                    onClose={() => setItemToRevert(null)}
                    onConfirm={confirmRevertInvoice}
                />
            )}
            
            <InvoiceHistoryModal 
                isOpen={showInvoiceHistory}
                transactions={transactions} // PASSING CURRENT TRANSACTIONS FOR SYNC
                onClose={() => setShowInvoiceHistory(false)}
                onReopen={handleRevertClick}
                onPay={handlePayClick}
            />

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Caixa</h1>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveView('flow')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeView === 'flow' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Fluxo de Caixa
                        </button>
                        <button 
                            onClick={() => setActiveView('credit')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeView === 'credit' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Cartão de Crédito
                        </button>
                    </div>
                </div>
            </div>

            {/* FLOW VIEW */}
            {activeView === 'flow' && (
                <div className="animate-fade-in space-y-6">
                    <div className="flex justify-end">
                        <div className="flex items-center gap-2">
                            <label htmlFor="competency-picker" className="text-sm font-medium text-gray-700 dark:text-gray-300">Competência:</label>
                            <input 
                                type="month" 
                                id="competency-picker"
                                value={competency}
                                onChange={(e) => setCompetency(e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

                    <div className="flex flex-wrap gap-x-6 gap-y-4">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">Tipo:</span>
                            <button onClick={() => setTypeFilter('All')} className={`px-3 py-1 text-sm rounded-full ${typeFilter === 'All' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Todos</button>
                            <button onClick={() => setTypeFilter(TransactionType.INCOME)} className={`px-3 py-1 text-sm rounded-full ${typeFilter === TransactionType.INCOME ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Faturamentos</button>
                            <button onClick={() => setTypeFilter(TransactionType.EXPENSE)} className={`px-3 py-1 text-sm rounded-full ${typeFilter === TransactionType.EXPENSE ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Custos</button>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">Status:</span>
                            <button onClick={() => setStatusFilter('All')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'All' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Todos</button>
                            <button onClick={() => setStatusFilter(TransactionStatus.PAID)} className={`px-3 py-1 text-sm rounded-full ${statusFilter === TransactionStatus.PAID ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Pago</button>
                            <button onClick={() => setStatusFilter(TransactionStatus.PENDING)} className={`px-3 py-1 text-sm rounded-full ${statusFilter === TransactionStatus.PENDING ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Pendente</button>
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
                                        <th scope="col" className="px-6 py-3">Ação</th>
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
                                            
                                            const isInvoice = (t as any).isInvoice;
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
                                                            onClick={() => handlePayClick(t)}
                                                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded shadow transition-all hover:scale-105 active:scale-95"
                                                        >
                                                            Pagar
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
                                    <button onClick={prevPage} disabled={currentPage === 1} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Anterior</button>
                                    <button onClick={nextPage} disabled={currentPage === nPages || nPages === 0} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Próximo</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CREDIT CARD VIEW */}
            {activeView === 'credit' && (
                <div className="animate-fade-in space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 gap-4">
                        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                            <div className="flex flex-col w-full md:w-auto">
                                <label className="text-sm text-gray-500 dark:text-gray-400 font-medium">Vencimento Fatura</label>
                                <input 
                                    type="month" 
                                    value={creditCompetency}
                                    onChange={(e) => setCreditCompetency(e.target.value)}
                                    className="bg-transparent text-xl font-bold text-indigo-600 dark:text-indigo-400 outline-none w-full md:w-auto"
                                />
                            </div>
                            <div className="hidden md:block h-10 w-px bg-gray-300 dark:bg-gray-600"></div>
                            <div className="w-full md:w-auto">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total da Fatura</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    R$ {formatCurrencyNumber(currentInvoiceTotal)}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                            {selectedInvoiceRecord ? (
                                selectedInvoiceRecord.status === TransactionStatus.PAID ? (
                                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold">Fatura Paga</span>
                                ) : (
                                    selectedInvoiceRecord.invoiceStatus === 'Closed' ? (
                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold">Fechada - A Pagar</span>
                                    ) : (
                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">Em Aberto</span>
                                    )
                                )
                            ) : (
                                <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">Prevista</span>
                            )}
                            
                            <button 
                                onClick={() => setShowInvoiceHistory(true)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md transition-all text-sm"
                            >
                                Gerenciar Faturas
                            </button>
                        </div>
                    </div>

                    {/* Detailed List of Credit Card Expenses */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                        <div className="p-4 border-b dark:border-gray-700">
                            <h3 className="font-bold text-gray-700 dark:text-gray-300">Detalhamento da Fatura</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        <th className="px-6 py-3">Descrição</th>
                                        <th className="px-6 py-3">Categoria</th>
                                        <th className="px-6 py-3">Data Compra</th>
                                        <th className="px-6 py-3">Parcela</th>
                                        <th className="px-6 py-3 text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentInvoiceItems.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-8 text-gray-500">Nenhum lançamento nesta fatura.</td></tr>
                                    ) : (
                                        currentInvoiceItems.map((item: any) => (
                                            <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.description}</td>
                                                <td className="px-6 py-4">{item.category}</td>
                                                <td className="px-6 py-4">{formatDateUTC(item.timestamp)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    {item.totalInstallments > 1 ? `${item.installmentNumber}/${item.totalInstallments}` : 'À vista'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-gray-800 dark:text-gray-200">
                                                    R$ {formatCurrencyNumber(item.amount)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cash;
