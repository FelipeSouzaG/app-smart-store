
import React, { useState, useMemo, useEffect, useContext } from 'react';
import { CashTransaction, TransactionStatus, TransactionType, TransactionCategory, FinancialAccount } from '../types';
import { formatCurrencyNumber, formatMoney, formatName } from '../validation';
import { AuthContext } from '../contexts/AuthContext';

interface CostsProps {
    transactions: CashTransaction[];
    addTransaction: (transaction: Omit<CashTransaction, 'id' | 'timestamp'>) => void;
    updateTransaction: (transaction: CashTransaction) => void;
    deleteTransaction: (transactionId: string) => void;
}

interface CostModalProps {
    costToEdit?: CashTransaction | null;
    accounts: FinancialAccount[];
    onClose: () => void;
    onSave: (transaction: any) => void; 
}

// Internal Notification Modal
const NotificationModal: React.FC<{ isOpen: boolean; type: 'success' | 'error'; message: string; onClose: () => void }> = ({ isOpen, type, message, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-6 max-w-sm w-full transform transition-all scale-100">
                <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${type === 'success' ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'}`}>
                    {type === 'success' ? (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    )}
                </div>
                <h3 className={`text-lg leading-6 font-bold text-center mb-2 ${type === 'success' ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'}`}>
                    {type === 'success' ? 'Sucesso!' : 'Atenção'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-300 text-center mb-6">
                    {message}
                </p>
                <button
                    onClick={onClose}
                    className={`w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm transition-colors ${type === 'success' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'}`}
                >
                    Entendi
                </button>
            </div>
        </div>
    );
};

// Date helpers
const createDateAsUTC = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
};

const formatDateUTC = (dateString: Date | string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const CostModal: React.FC<CostModalProps> = ({ costToEdit, accounts, onClose, onSave }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<TransactionCategory>(TransactionCategory.OTHER);
    const [status, setStatus] = useState<TransactionStatus | ''>(''); // Changed default to empty
    
    const today = new Date().toISOString().split('T')[0];

    // Dates
    const [purchaseDate, setPurchaseDate] = useState(today); // Data da Compra (Competência)
    const [dueDate, setDueDate] = useState(today); // Vencimento
    const [paymentDate, setPaymentDate] = useState(today); // Pagamento (Caixa)
    
    // Financial Config
    const [selectedAccountId, setSelectedAccountId] = useState('cash-box');
    const [selectedMethodId, setSelectedMethodId] = useState('');
    const [installments, setInstallments] = useState(1);
    
    const [error, setError] = useState('');
    const [notification, setNotification] = useState<{isOpen: boolean; type: 'success' | 'error'; message: string}>({
        isOpen: false, type: 'error', message: ''
    });

    const allowedCategories = useMemo(() => Object.values(TransactionCategory).filter(cat =>
        ![
            TransactionCategory.PRODUCT_PURCHASE,
            TransactionCategory.SERVICE_REVENUE,
            TransactionCategory.SALES_REVENUE,
            TransactionCategory.SERVICE_COST,
        ].includes(cat)
    ), []);

    // Derived Logic
    const isCashBox = selectedAccountId === 'cash-box';
    const isBoletoAccount = selectedAccountId === 'boleto';
    const selectedAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId), [accounts, selectedAccountId]);
    const selectedMethod = useMemo(() => selectedAccount?.paymentMethods.find(m => (m.id || (m as any)._id) === selectedMethodId), [selectedAccount, selectedMethodId]);
    const isCreditCard = !isCashBox && !isBoletoAccount && selectedMethod?.type === 'Credit';

    const handleCurrencyChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        if (value === '' || value === 'R$ ') { setter(''); return; }
        setter(formatMoney(value));
    };
    
    const parseCurrency = (value: string): number => {
        if (!value) return 0;
        const numericString = value.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
        return parseFloat(numericString) || 0;
    };

    const handlePaymentDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        if (newDate > today) {
            setNotification({
                isOpen: true,
                type: 'error',
                message: 'Data de pagamento não pode ser futura. Para agendamentos, utilize o status "Pendente" com a data de vencimento desejada.'
            });
            return;
        }
        setPaymentDate(newDate);
    };

    // Boleto Split Preview
    const boletoPreview = useMemo(() => {
        if (status !== TransactionStatus.PENDING || selectedAccountId !== 'boleto' || installments <= 1) return [];
        const numericAmount = parseCurrency(amount);
        if (numericAmount <= 0) return [];

        const preview = [];
        const amountPerInstallment = numericAmount / installments;
        const baseDate = new Date(dueDate);

        for (let i = 0; i < installments; i++) {
            const instDate = new Date(baseDate);
            instDate.setMonth(baseDate.getMonth() + i);
            preview.push({
                number: i + 1,
                date: instDate,
                amount: amountPerInstallment
            });
        }
        return preview;
    }, [status, selectedAccountId, installments, amount, dueDate]);


    useEffect(() => {
        if (costToEdit) {
            setDescription(costToEdit.description);
            setAmount(formatMoney((costToEdit.amount * 100).toFixed(0)));
            setCategory(costToEdit.category);
            setStatus(costToEdit.status);
            
            setPurchaseDate(costToEdit.timestamp ? new Date(costToEdit.timestamp).toISOString().split('T')[0] : today);
            setDueDate(costToEdit.dueDate ? new Date(costToEdit.dueDate).toISOString().split('T')[0] : '');
            setPaymentDate(costToEdit.paymentDate ? new Date(costToEdit.paymentDate).toISOString().split('T')[0] : '');
            
            if (costToEdit.financialAccountId === 'cash-box' || costToEdit.financialAccountId === 'boleto') {
                setSelectedAccountId(costToEdit.financialAccountId);
            } else {
                setSelectedAccountId(costToEdit.financialAccountId || 'cash-box');
                setSelectedMethodId(costToEdit.paymentMethodId || '');
            }
        } else {
            // Defaults for New Cost
            setDescription('');
            setAmount('');
            setCategory(TransactionCategory.OTHER);
            setStatus(''); // Force selection
            setPurchaseDate(today);
            setDueDate(today);
            setPaymentDate(today); 
            setSelectedAccountId('cash-box');
            setSelectedMethodId('');
            setInstallments(1);
        }
        setError('');
    }, [costToEdit]);

    // Calculate Estimated Due Date for Credit Card UI feedback
    const creditCardEstimate = useMemo(() => {
        if (isCreditCard && selectedMethod && selectedMethod.closingDay && selectedMethod.dueDay) {
            const pDate = new Date(paymentDate); // Using payment/purchase date for CC simulation
            // Fix timezone offset for day calculation
            const purchaseDay = parseInt(paymentDate.split('-')[2]); 
            
            let targetMonth = pDate.getMonth();
            let targetYear = pDate.getFullYear();

            // If bought ON or AFTER closing day, bill goes to NEXT month
            if (purchaseDay >= selectedMethod.closingDay) {
                targetMonth += 1;
            }
            
            // Determine Due Date
            const estDate = new Date(targetYear, targetMonth, selectedMethod.dueDay);
            return estDate.toLocaleDateString('pt-BR');
        }
        return null;
    }, [isCreditCard, selectedMethod, paymentDate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseCurrency(amount);
        if (numericAmount <= 0) { setError('O valor deve ser um número positivo.'); return; }
        
        if (status === '') { setError('Selecione um status.'); return; }

        // 1. Status Paid Validation
        if (status === TransactionStatus.PAID) {
            if (!selectedAccountId) {
                setError('Selecione a Conta de origem (Dinheiro ou Banco).');
                return;
            }

            if (!isCashBox && !selectedMethodId) {
                setError('Selecione o Método de Pagamento do banco.');
                return;
            }

            // If NOT Credit Card (CashBox, Pix, Debit), payment date is mandatory
            if (!isCreditCard) {
                if (!paymentDate) { setError('Data de Pagamento é obrigatória.'); return; }
                if (paymentDate > today) {
                    setNotification({ isOpen: true, type: 'error', message: 'Data de pagamento futura não permitida.' });
                    return;
                }
            }
        }

        // 2. Status Pending Validation
        if (status === TransactionStatus.PENDING) {
            if (!dueDate) { setError('Data de Vencimento é obrigatória para pendências.'); return; }
        }

        setError('');

         const transactionPayload: any = {
            description: formatName(description),
            amount: numericAmount,
            type: TransactionType.EXPENSE,
            category,
            status: status, 
            timestamp: createDateAsUTC(purchaseDate), // Competence
            financialAccountId: selectedAccountId || undefined,
            paymentMethodId: (!isCashBox && !isBoletoAccount && selectedMethodId) ? selectedMethodId : undefined,
            installments: (isCreditCard || isBoletoAccount) ? installments : 1
        };

        // --- DATE LOGIC --- //
        
        if (isCreditCard) {
            // Backend handles CC due date. Clear fields.
            transactionPayload.dueDate = null; 
            transactionPayload.paymentDate = createDateAsUTC(paymentDate); // Used as transaction date for CC
        } else if (isBoletoAccount) {
             // Backend handles Boleto Split. Base Due Date passed.
             transactionPayload.dueDate = createDateAsUTC(dueDate);
             transactionPayload.paymentDate = null;
        } else {
            // Manual Dates
            transactionPayload.dueDate = createDateAsUTC(dueDate);
            
            if (status === TransactionStatus.PAID) {
                transactionPayload.paymentDate = createDateAsUTC(paymentDate);
            } else {
                transactionPayload.paymentDate = null;
            }
        }

        if (costToEdit) {
            onSave({ ...costToEdit, ...transactionPayload });
        } else {
            onSave(transactionPayload);
        }
    };
    
    const isSaveDisabled = !description || !amount || parseCurrency(amount) <= 0 || status === '';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <NotificationModal 
                isOpen={notification.isOpen} 
                type={notification.type} 
                message={notification.message} 
                onClose={() => setNotification({ ...notification, isOpen: false })} 
            />

            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {costToEdit ? 'Editar Custo' : 'Novo Custo / Despesa'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {/* 1. Descrição */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Descrição</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Aluguel, Internet..."/>
                    </div>
                    
                    {/* 2. Valor e Categoria */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Valor (R$)</label>
                            <input type="text" value={amount} onChange={e => handleCurrencyChange(e.target.value, setAmount)} className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 font-bold text-red-500 focus:ring-2 focus:ring-red-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Categoria</label>
                            <select value={category} onChange={e => setCategory(e.target.value as TransactionCategory)} className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 focus:ring-2 focus:ring-indigo-500">
                                {allowedCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* 3. Status - Controls Visibility */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Status <span className="text-red-500">*</span></label>
                        <select 
                            value={status} 
                            onChange={e => {
                                const newStatus = e.target.value as TransactionStatus | '';
                                setStatus(newStatus);
                                // Default account selection based on status
                                if (newStatus === TransactionStatus.PAID) {
                                    setSelectedAccountId('cash-box');
                                } else if (newStatus === TransactionStatus.PENDING) {
                                    setSelectedAccountId('cash-box');
                                }
                                setSelectedMethodId('');
                            }} 
                            className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 font-semibold"
                        >
                            <option value="">Selecione...</option>
                            <option value={TransactionStatus.PENDING}>🔴 Pendente (A Pagar)</option>
                            <option value={TransactionStatus.PAID}>🟢 Pago (Realizado)</option>
                        </select>
                    </div>

                    {/* DYNAMIC SECTION BASED ON STATUS */}
                    {status !== '' && (
                        <div className={`p-4 rounded-lg border animate-fade-in ${status === TransactionStatus.PAID ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'}`}>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                {/* Date Fields */}
                                {status === TransactionStatus.PAID ? (
                                    <div>
                                        <label className="block text-sm font-medium text-green-800 dark:text-green-400 mb-1">Data Pagto. <span className="text-red-500">*</span></label>
                                        <input 
                                            type="date" 
                                            value={paymentDate} 
                                            onChange={handlePaymentDateChange} 
                                            max={today}
                                            className="w-full rounded-lg bg-white dark:bg-gray-800 border-green-300 dark:border-green-600 p-2.5"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-yellow-800 dark:text-yellow-500 mb-1">Vencimento (1ª Parc.) <span className="text-red-500">*</span></label>
                                        <input 
                                            type="date" 
                                            value={dueDate} 
                                            onChange={e => setDueDate(e.target.value)} 
                                            className="w-full rounded-lg bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-600 p-2.5"
                                        />
                                    </div>
                                )}

                                {/* Account Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conta de Saída <span className="text-red-500">*</span></label>
                                    <select 
                                        value={selectedAccountId} 
                                        onChange={e => { setSelectedAccountId(e.target.value); setSelectedMethodId(''); }} 
                                        className="w-full rounded-lg p-2.5 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                                    >
                                        <option value="cash-box">Dinheiro do Caixa</option>
                                        
                                        {status === TransactionStatus.PAID && (
                                            <optgroup label="Bancos">
                                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.bankName}</option>)}
                                            </optgroup>
                                        )}

                                        {status === TransactionStatus.PENDING && (
                                            <option value="boleto">Boleto Bancário</option>
                                        )}
                                    </select>
                                </div>
                            </div>

                            {/* Sub-Logic: Paid + Bank => Method Selection */}
                            {status === TransactionStatus.PAID && !isCashBox && (
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Forma de Pagto (Banco) <span className="text-red-500">*</span></label>
                                    <select 
                                        value={selectedMethodId} 
                                        onChange={e => setSelectedMethodId(e.target.value)} 
                                        className="w-full rounded-lg text-sm p-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                                    >
                                        <option value="">Selecione...</option>
                                        {selectedAccount?.paymentMethods.map(m => (
                                            <option key={m.id || (m as any)._id} value={m.id || (m as any)._id}>
                                                {m.name} ({m.type})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Sub-Logic: Installments (Credit Card OR Pending Boleto) */}
                            {(isCreditCard || (status === TransactionStatus.PENDING && isBoletoAccount)) && (
                                <div className="p-3 bg-white dark:bg-gray-800 rounded border shadow-sm animate-fade-in">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                            {isCreditCard ? "Parcelas (Cartão)" : "Parcelas (Boleto)"}
                                        </label>
                                        <select 
                                            value={installments} 
                                            onChange={e => setInstallments(parseInt(e.target.value))}
                                            className="text-sm rounded p-1 border border-indigo-300 bg-indigo-50 dark:bg-gray-700"
                                        >
                                            {Array.from({length: 12}, (_, i) => i + 1).map(n => (
                                                <option key={n} value={n}>{n}x</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {isCreditCard && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                            <p>📅 <strong>Vencimento da Fatura:</strong> {creditCardEstimate || 'Calculando...'}</p>
                                            <p className="text-orange-500 font-medium">ℹ️ Registrado na tabela do Cartão.</p>
                                        </div>
                                    )}

                                    {isBoletoAccount && installments > 1 && (
                                        <div className="max-h-24 overflow-y-auto text-xs border-t border-gray-200 mt-2 pt-2">
                                            <table className="w-full text-left">
                                                <thead><tr><th>#</th><th>Vencimento</th><th className="text-right">Valor</th></tr></thead>
                                                <tbody>
                                                    {boletoPreview.map(p => (
                                                        <tr key={p.number}>
                                                            <td>{p.number}x</td>
                                                            <td>{p.date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                                            <td className="text-right">R$ {formatCurrencyNumber(p.amount)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded text-center">{error}</p>}

                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 font-medium">Cancelar</button>
                        <button type="submit" disabled={isSaveDisabled} className="px-5 py-2.5 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed font-bold shadow-lg transition-transform hover:scale-105">
                            Salvar Lançamento
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

const ConfirmationModal: React.FC<{ message: string; onConfirm: () => void; onCancel: () => void }> = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Confirmar Ação</h3>
            <p className="mb-6">{message}</p>
            <div className="flex justify-end space-x-4">
                <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-300 dark:bg-gray-600 hover:bg-gray-400">Cancelar</button>
                <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">Confirmar</button>
            </div>
        </div>
    </div>
);

const Costs: React.FC<CostsProps> = ({ transactions, addTransaction, updateTransaction, deleteTransaction }) => {
    const { apiCall } = useContext(AuthContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCost, setEditingCost] = useState<CashTransaction | null>(null);
    const [deletingCostId, setDeletingCostId] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

    useEffect(() => {
        const fetchAccounts = async () => {
            const data = await apiCall('financial', 'GET');
            if (data) setAccounts(data);
        };
        fetchAccounts();
    }, [apiCall, isModalOpen]);

    const getCurrentCompetency = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        return `${year}-${month}`;
    };

    const [competency, setCompetency] = useState<string>(getCurrentCompetency());
    const [categoryFilter, setCategoryFilter] = useState<TransactionCategory | 'All'>('All');
    const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'All'>('All');
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 15;
    
    const allowedCategories = useMemo(() => Object.values(TransactionCategory).filter(cat =>
        ![
            TransactionCategory.PRODUCT_PURCHASE,
            TransactionCategory.SERVICE_REVENUE,
            TransactionCategory.SALES_REVENUE,
            TransactionCategory.SERVICE_COST,
        ].includes(cat)
    ), []);

    const manualCostTransactions = useMemo(() => {
        const excludedCategories = [TransactionCategory.PRODUCT_PURCHASE, TransactionCategory.SERVICE_COST, TransactionCategory.SALES_REVENUE, TransactionCategory.SERVICE_REVENUE];
        return transactions
            .filter(t => t.type === TransactionType.EXPENSE && !excludedCategories.includes(t.category))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [transactions]);
    
     const filteredCosts = useMemo(() => {
        let result = manualCostTransactions;
        
        if (competency) {
            const [year, month] = competency.split('-').map(Number);
            result = result.filter(t => {
                // Determine which date to use for filtering. For invoices, use dueDate (billing date).
                const refDate = t.dueDate ? new Date(t.dueDate) : new Date(t.timestamp);
                return refDate.getUTCFullYear() === year && (refDate.getUTCMonth() + 1) === month;
            });
        }

        if (categoryFilter !== 'All') {
            result = result.filter(t => t.category === categoryFilter);
        }

        if (statusFilter !== 'All') {
            result = result.filter(t => t.status === statusFilter);
        }
        
        return result;
    }, [manualCostTransactions, competency, categoryFilter, statusFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [competency, categoryFilter, statusFilter]);
    
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredCosts.slice(indexOfFirstRecord, indexOfLastRecord);
    const nPages = Math.ceil(filteredCosts.length / recordsPerPage);

    const nextPage = () => { if (currentPage < nPages) setCurrentPage(currentPage + 1); };
    const prevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

    const handleSaveCost = (transactionData: Omit<CashTransaction, 'id' | 'timestamp'> | CashTransaction) => {
        if ('id' in transactionData) {
            updateTransaction(transactionData as CashTransaction);
        } else {
            addTransaction(transactionData as Omit<CashTransaction, 'id' | 'timestamp'>);
        }
        setIsModalOpen(false);
        setEditingCost(null);
    }

    // Helper for table display
    const getAccountLabel = (t: CashTransaction) => {
        if (t.financialAccountId === 'cash-box') {
            return t.status === TransactionStatus.PAID ? 'Pago - Caixa' : 'Pendente - Caixa';
        }
        if (t.financialAccountId === 'boleto') return 'Pendente - Boleto';
        
        if (t.financialAccountId) {
            const acc = accounts.find(a => a.id === t.financialAccountId);
            if (acc) {
                const method = acc.paymentMethods.find(m => (m.id || (m as any)._id) === t.paymentMethodId);
                // Simple Payment
                if (method) return `Pago - ${acc.bankName} (${method.type})`;
                return `Pago - ${acc.bankName}`;
            }
        }
        return '-';
    };

    return (
        <div className="container mx-auto">
            {isModalOpen && <CostModal costToEdit={editingCost} accounts={accounts} onClose={() => { setIsModalOpen(false); setEditingCost(null); }} onSave={handleSaveCost} />}
            {deletingCostId && (
                <ConfirmationModal 
                    message="Tem certeza que deseja excluir este custo?"
                    onConfirm={() => { deleteTransaction(deletingCostId); setDeletingCostId(null); }}
                    onCancel={() => setDeletingCostId(null)}
                />
            )}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Custos Fixos</h1>
                <button onClick={() => { setEditingCost(null); setIsModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg transition-transform hover:scale-105">
                    Adicionar Custo
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg mb-6 space-y-4">
                <div className="flex items-center gap-2">
                    <label htmlFor="competency-picker" className="text-sm font-medium">Competência:</label>
                    <input 
                        type="month" 
                        id="competency-picker"
                        value={competency}
                        onChange={(e) => setCompetency(e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
                    />
                </div>
                 <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">Categoria:</span>
                    <button onClick={() => setCategoryFilter('All')} className={`px-3 py-1 text-sm rounded-full ${categoryFilter === 'All' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Todas</button>
                    {allowedCategories.map(cat => (
                         <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-3 py-1 text-sm rounded-full ${categoryFilter === cat ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{cat}</button>
                    ))}
                </div>
                 <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    <button onClick={() => setStatusFilter('All')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'All' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Todos</button>
                    {Object.values(TransactionStatus).map(st => (
                         <button key={st} onClick={() => setStatusFilter(st)} className={`px-3 py-1 text-sm rounded-full ${statusFilter === st ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{st}</button>
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
                                <th scope="col" className="px-6 py-3">Data</th>
                                <th scope="col" className="px-6 py-3">Conta / Forma</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                             {currentRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-gray-500">Nenhum custo encontrado.</td>
                                </tr>
                             ) : (
                                currentRecords.map(t => {
                                    const isInvoice = (t as any).isInvoice;
                                    
                                    return (
                                    <tr key={t.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            {isInvoice && <span className="mr-2">💳</span>}
                                            {t.description}
                                        </td>
                                        <td className="px-6 py-4">{t.category}</td>
                                        <td className={`px-6 py-4 font-semibold text-red-500`}>
                                            - R$ {formatCurrencyNumber(t.amount)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {isInvoice ? (
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                                    Fatura Cartão
                                                </span>
                                            ) : (
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    t.status === TransactionStatus.PAID 
                                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                                }`}>{t.status}</span>
                                            )}
                                        </td>
                                        
                                        <td className="px-6 py-4">
                                            {/* Show Due Date for Pending, Payment Date for Paid */}
                                            {t.status === TransactionStatus.PENDING 
                                                ? (t.dueDate ? formatDateUTC(t.dueDate) : '-') 
                                                : (t.paymentDate ? formatDateUTC(t.paymentDate) : '-')
                                            }
                                        </td>

                                        <td className="px-6 py-4 text-xs font-medium">
                                            {getAccountLabel(t)}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {!isInvoice && (
                                                <>
                                                    <button onClick={() => { setEditingCost(t); setIsModalOpen(true); }} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline mr-4">Editar</button>
                                                    <button onClick={() => setDeletingCostId(t.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Excluir</button>
                                                </>
                                            )}
                                            {isInvoice && <span className="text-xs text-gray-400">Gerenciado via Fatura</span>}
                                        </td>
                                    </tr>
                                    );
                                })
                             )}
                        </tbody>
                    </table>
                </div>
                 {nPages > 1 && (
                    <div className="p-4 flex justify-between items-center gap-2">
                        <button onClick={prevPage} disabled={currentPage === 1} className="px-4 py-2 border rounded-md">Anterior</button>
                        <button onClick={nextPage} disabled={currentPage === nPages} className="px-4 py-2 border rounded-md">Próximo</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Costs;
