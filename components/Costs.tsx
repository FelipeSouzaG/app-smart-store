
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
    const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.PENDING);
    
    // Dates
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]); // Data da Compra
    const [dueDate, setDueDate] = useState(''); // Vencimento (Boleto ou Fatura)
    const [paymentDate, setPaymentDate] = useState(''); // Pagamento (Caixa)
    
    // Financial Config
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [selectedMethodId, setSelectedMethodId] = useState('');
    const [installments, setInstallments] = useState(1);
    
    const [error, setError] = useState('');

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
    const selectedAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId), [accounts, selectedAccountId]);
    const selectedMethod = useMemo(() => selectedAccount?.paymentMethods.find(m => m.id === selectedMethodId), [selectedAccount, selectedMethodId]);
    const isCreditCard = !isCashBox && selectedMethod?.type === 'Credit';

    const handleCurrencyChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        if (value === '' || value === 'R$ ') { setter(''); return; }
        setter(formatMoney(value));
    };
    
    const parseCurrency = (value: string): number => {
        if (!value) return 0;
        const numericString = value.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
        return parseFloat(numericString) || 0;
    };

    useEffect(() => {
        if (costToEdit) {
            setDescription(costToEdit.description);
            setAmount(formatMoney((costToEdit.amount * 100).toFixed(0)));
            setCategory(costToEdit.category);
            setStatus(costToEdit.status);
            
            setPurchaseDate(costToEdit.timestamp ? new Date(costToEdit.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
            setDueDate(costToEdit.dueDate ? new Date(costToEdit.dueDate).toISOString().split('T')[0] : '');
            setPaymentDate(costToEdit.paymentDate ? new Date(costToEdit.paymentDate).toISOString().split('T')[0] : '');
            
            if (costToEdit.financialAccountId === 'cash-box') {
                setSelectedAccountId('cash-box');
            } else {
                setSelectedAccountId(costToEdit.financialAccountId || '');
                setSelectedMethodId(costToEdit.paymentMethodId || '');
            }
        } else {
            // Defaults
            setDescription('');
            setAmount('');
            setCategory(TransactionCategory.OTHER);
            setStatus(TransactionStatus.PENDING);
            setPurchaseDate(new Date().toISOString().split('T')[0]);
            setDueDate('');
            setPaymentDate(new Date().toISOString().split('T')[0]); 
            setSelectedAccountId('');
            setSelectedMethodId('');
            setInstallments(1);
        }
        setError('');
    }, [costToEdit]);

    // Calculate Estimated Due Date for Credit Card UI feedback
    const creditCardEstimate = useMemo(() => {
        if (isCreditCard && selectedMethod && selectedMethod.closingDay && selectedMethod.dueDay) {
            const pDate = new Date(purchaseDate);
            // Fix timezone offset for day calculation
            // We pretend the date string is UTC to get the correct day number regardless of timezone
            const pDay = parseInt(purchaseDate.split('-')[2]); 
            
            let targetMonth = pDate.getMonth();
            let targetYear = pDate.getFullYear();

            // If bought ON or AFTER closing day, bill goes to NEXT month
            if (pDay >= selectedMethod.closingDay) {
                targetMonth += 1;
                if (targetMonth > 11) {
                    targetMonth = 0;
                    targetYear += 1;
                }
            }
            
            // Determine Due Date
            const estDate = new Date(targetYear, targetMonth, selectedMethod.dueDay);
            return estDate.toLocaleDateString('pt-BR');
        }
        return null;
    }, [isCreditCard, selectedMethod, purchaseDate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseCurrency(amount);
        if (numericAmount <= 0) { setError('O valor deve ser um número positivo.'); return; }
        
        // --- VALIDATION RULES --- //

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

            // If NOT Credit Card (CashBox, Pix, Debit), dates are mandatory
            if (!isCreditCard) {
                if (!dueDate && !paymentDate) { setError('Data de Pagamento ou Vencimento é obrigatória.'); return; }
                if (!paymentDate) { setError('Data de Pagamento é obrigatória.'); return; }
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
            // FORCE PENDING if Credit Card, otherwise use selected status
            // Reasoning: A credit card purchase is "Paid" at the store, but "Pending" in the bank account until the bill is paid.
            status: isCreditCard ? TransactionStatus.PENDING : status, 
            timestamp: createDateAsUTC(purchaseDate), // Competence
            financialAccountId: selectedAccountId || undefined,
            paymentMethodId: (!isCashBox && selectedMethodId) ? selectedMethodId : undefined,
            installments: isCreditCard ? installments : 1
        };

        // --- DATE LOGIC --- //
        
        if (isCreditCard) {
            // Backend handles due date calculation based on closing day.
            // Payment date is null until bill is paid.
            transactionPayload.dueDate = null; 
            transactionPayload.paymentDate = null;
        } else {
            // Manual Dates (CashBox, Bank-Debit, Bank-Pix, or Pending)
            if (status === TransactionStatus.PENDING) {
                transactionPayload.dueDate = createDateAsUTC(dueDate);
                transactionPayload.paymentDate = null;
            } else {
                // PAID (Cash/Pix/Debit)
                // Use payment date as due date if due date is missing (immediate payment)
                transactionPayload.dueDate = createDateAsUTC(dueDate || paymentDate); 
                transactionPayload.paymentDate = createDateAsUTC(paymentDate);
            }
        }

        if (costToEdit) {
            onSave({ ...costToEdit, ...transactionPayload });
        } else {
            onSave(transactionPayload);
        }
    };
    
    const isSaveDisabled = !description || !amount || parseCurrency(amount) <= 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {costToEdit ? 'Editar Custo' : 'Novo Custo / Despesa'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Basic Info */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Descrição</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Aluguel, Internet..."/>
                    </div>
                    
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Data da Compra</label>
                            <input 
                                type="date" 
                                value={purchaseDate} 
                                onChange={e => setPurchaseDate(e.target.value)} 
                                className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Status</label>
                            <select 
                                value={status} 
                                onChange={e => {
                                    setStatus(e.target.value as TransactionStatus);
                                    // Reset payment selections if going back to pending
                                    if(e.target.value === TransactionStatus.PENDING) {
                                        setSelectedAccountId('');
                                        setSelectedMethodId('');
                                    }
                                }} 
                                className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 font-semibold"
                            >
                                <option value={TransactionStatus.PENDING}>🔴 Pendente (A Pagar)</option>
                                <option value={TransactionStatus.PAID}>🟢 Pago (Realizado)</option>
                            </select>
                        </div>
                    </div>

                    {/* --- DYNAMIC SECTION: BASED ON STATUS --- */}
                    
                    {/* SCENARIO 1: PENDING (Simple) */}
                    {status === TransactionStatus.PENDING && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 animate-fade-in">
                            <label className="block text-sm font-medium text-yellow-800 dark:text-yellow-500 mb-1">Data de Vencimento <span className="text-red-500">*</span></label>
                            <input 
                                type="date" 
                                value={dueDate} 
                                onChange={e => setDueDate(e.target.value)} 
                                required
                                className="w-full rounded-lg bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-600 p-2.5"
                            />
                        </div>
                    )}

                    {/* SCENARIO 2: PAID (Complex) */}
                    {status === TransactionStatus.PAID && (
                        <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-200 dark:border-green-800 space-y-4 animate-fade-in">
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conta de Origem <span className="text-red-500">*</span></label>
                                    <select 
                                        value={selectedAccountId} 
                                        onChange={e => { setSelectedAccountId(e.target.value); setSelectedMethodId(''); }} 
                                        className="w-full rounded-lg text-sm p-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="cash-box">💵 Dinheiro do Caixa</option>
                                        <optgroup label="Bancos Cadastrados">
                                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.bankName}</option>)}
                                        </optgroup>
                                    </select>
                                </div>

                                {/* SUB-SCENARIO 2A: Bank Selected (Not Cash Box) */}
                                {!isCashBox && selectedAccountId && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Forma de Pagto (Banco) <span className="text-red-500">*</span></label>
                                        <select 
                                            value={selectedMethodId} 
                                            onChange={e => setSelectedMethodId(e.target.value)} 
                                            className="w-full rounded-lg text-sm p-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                                        >
                                            <option value="">Selecione...</option>
                                            {selectedAccount?.paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name} ({m.type})</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* SUB-SCENARIO 2B: Credit Card Logic */}
                            {isCreditCard && (
                                <div className="p-3 bg-white dark:bg-gray-800 rounded border border-indigo-200 dark:border-indigo-800 shadow-sm animate-fade-in">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Parcelamento</label>
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
                                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                        <p>📅 <strong>Vencimento da Fatura:</strong> {creditCardEstimate || 'Calculando...'}</p>
                                        <p className="text-orange-500 font-medium">⚠ O sistema agendará o pagamento para o dia da fatura.</p>
                                    </div>
                                </div>
                            )}

                            {/* SUB-SCENARIO 2C: Immediate Payment (Cash Box OR Debit/Pix) */}
                            {((isCashBox) || (!isCreditCard && selectedMethodId)) && (
                                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Vencimento Original <span className="text-red-500">*</span></label>
                                        <input 
                                            type="date" 
                                            value={dueDate} 
                                            onChange={e => setDueDate(e.target.value)} 
                                            className="w-full rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 p-2.5"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-green-600 dark:text-green-400">Data do Pagamento <span className="text-red-500">*</span></label>
                                        <input 
                                            type="date" 
                                            value={paymentDate} 
                                            onChange={e => setPaymentDate(e.target.value)} 
                                            className="w-full rounded-lg bg-white dark:bg-gray-800 border-green-300 dark:border-green-600 p-2.5 ring-1 ring-green-100"
                                        />
                                    </div>
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
                const transactionDate = new Date(t.timestamp);
                return transactionDate.getFullYear() === year && transactionDate.getMonth() + 1 === month;
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
                                <th scope="col" className="px-6 py-3">Compra</th>
                                <th scope="col" className="px-6 py-3">Vencimento</th>
                                <th scope="col" className="px-6 py-3">Pagamento</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                             {currentRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-gray-500">Nenhum custo encontrado.</td>
                                </tr>
                             ) : (
                                currentRecords.map(t => {
                                    const today = new Date().setHours(0,0,0,0);
                                    const dueDateObj = t.dueDate ? new Date(t.dueDate) : null;
                                    const paymentDateObj = t.paymentDate ? new Date(t.paymentDate) : null;
                                    
                                    const isLatePending = t.status === TransactionStatus.PENDING && dueDateObj && dueDateObj.getTime() < today;
                                    const isPaidLate = t.status === TransactionStatus.PAID && paymentDateObj && dueDateObj && paymentDateObj.getTime() > dueDateObj.getTime();

                                    return (
                                    <tr key={t.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t.description}</td>
                                        <td className="px-6 py-4">{t.category}</td>
                                        <td className={`px-6 py-4 font-semibold text-red-500`}>
                                            - R$ {formatCurrencyNumber(t.amount)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                t.status === TransactionStatus.PAID 
                                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                            }`}>{t.status}</span>
                                        </td>
                                        <td className="px-6 py-4">{formatDateUTC(t.timestamp)}</td>
                                        
                                        <td className="px-6 py-4">
                                            {t.dueDate ? (
                                                <div className={isLatePending ? "text-red-500 font-bold" : ""}>
                                                    {formatDateUTC(t.dueDate)}
                                                    {isLatePending && <span className="block text-[10px] uppercase">Vencido</span>}
                                                </div>
                                            ) : '-'}
                                        </td>

                                        <td className={`px-6 py-4 font-medium ${isPaidLate ? "text-red-500 font-bold" : "text-green-600"}`}>
                                            {t.status === TransactionStatus.PAID && t.paymentDate ? (
                                                <div>
                                                    {formatDateUTC(t.paymentDate)}
                                                    {isPaidLate && <span className="block text-[10px] uppercase text-red-500">Atraso</span>}
                                                </div>
                                            ) : '-'}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button onClick={() => { setEditingCost(t); setIsModalOpen(true); }} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline mr-4">Editar</button>
                                            <button onClick={() => setDeletingCostId(t.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Excluir</button>
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
