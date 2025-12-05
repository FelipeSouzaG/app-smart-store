
import React, { useState, useMemo, useEffect, useContext } from 'react';
import { CashTransaction, TransactionStatus, TransactionType, TransactionCategory, FinancialAccount, PaymentMethodConfig } from '../types';
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
    onSave: (transaction: any) => void; // Using any for flexible payload including custom installment logic
}

// Helper to prevent timezone issues (Store/Read as UTC Noon)
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
    
    // Separate Dates
    const [dueDate, setDueDate] = useState('');
    const [paymentDate, setPaymentDate] = useState('');
    
    // Financial Config
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [selectedMethodId, setSelectedMethodId] = useState('');
    const [installments, setInstallments] = useState(1);
    
    const [error, setError] = useState('');
    const [dateError, setDateError] = useState('');

    const allowedCategories = useMemo(() => Object.values(TransactionCategory).filter(cat =>
        ![
            TransactionCategory.PRODUCT_PURCHASE,
            TransactionCategory.SERVICE_REVENUE,
            TransactionCategory.SALES_REVENUE,
            TransactionCategory.SERVICE_COST,
        ].includes(cat)
    ), []);

    // Derived: Selected Payment Method details
    const selectedAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId), [accounts, selectedAccountId]);
    const selectedMethod = useMemo(() => selectedAccount?.paymentMethods.find(m => m.id === selectedMethodId), [selectedAccount, selectedMethodId]);
    const isCreditCard = selectedMethod?.type === 'Credit';

    const handleCurrencyChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        if (value === '' || value === 'R$ ') {
            setter('');
            return;
        }
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
            // Format dates back to YYYY-MM-DD for input value, ensuring correct day is picked from ISO string
            setDueDate(costToEdit.dueDate ? new Date(costToEdit.dueDate).toISOString().split('T')[0] : '');
            setPaymentDate(costToEdit.paymentDate ? new Date(costToEdit.paymentDate).toISOString().split('T')[0] : '');
            
            // Financial Info populate (if available in future backend update, for now manual or derived)
            // Assuming costToEdit might have these fields in future, for now defaulting empty
            setSelectedAccountId(costToEdit.financialAccountId || '');
            setSelectedMethodId(costToEdit.paymentMethodId || '');
        } else {
            setDescription('');
            setAmount('');
            setCategory(TransactionCategory.OTHER);
            setStatus(TransactionStatus.PENDING);
            setDueDate('');
            setPaymentDate(new Date().toISOString().split('T')[0]); // Default payment to today if shown
            setSelectedAccountId('');
            setSelectedMethodId('');
            setInstallments(1);
        }
        setError('');
        setDateError('');
    }, [costToEdit]);

    // Update status based on Payment Method choice logic
    useEffect(() => {
        // If selecting a payment method (meaning we are defining how it's paid)
        if (selectedMethod) {
            if (isCreditCard) {
                // Credit Card: Creates a Future Pending Transaction (waiting for bill)
                // Although user might say "Paid with Credit Card", the money leaves account on Due Date.
                // We lock status to Pending for future bill processing logic mostly, 
                // BUT user prompt said: "Se status = Pago devo selecionar forma de pagamento".
                // So we respect User's "Pago" selection but backend handles future dates.
                
                // However, standard logic:
                // Credit Card purchase -> Status is technically Pending until bill is paid.
                // We will trust the backend logic to set dates.
            } else {
                // Pix/Debit/Boleto -> Usually immediate payment if Status is Pago.
            }
        }
    }, [selectedMethod, isCreditCard]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseCurrency(amount);
        if (numericAmount <= 0) {
            setError('O valor deve ser um número positivo.');
            return;
        }
        if (dateError) return;
        
        // Due Date is ALWAYS mandatory
        if (!dueDate) {
             setDateError('A data de vencimento é obrigatória.');
             return;
        }

        // Payment Date is mandatory IF status is PAID
        // Exception: If using Credit Card, the backend calculates future dates, so manual payment date is irrelevant here
        // (It's determined by bill cycle).
        if (status === TransactionStatus.PAID && !paymentDate && !isCreditCard) {
            setDateError('A data do pagamento é obrigatória para contas pagas.');
            return;
        }
        
        // Financial Method Validation
        if (status === TransactionStatus.PAID && !selectedMethodId) {
            setError('Selecione a forma de pagamento utilizada.');
            return;
        }

        setError('');

         const transactionPayload: any = {
            description: formatName(description),
            amount: numericAmount,
            type: TransactionType.EXPENSE,
            category,
            status,
            dueDate: createDateAsUTC(dueDate),
            financialAccountId: selectedAccountId || undefined,
            paymentMethodId: selectedMethodId || undefined,
            installments: isCreditCard ? installments : 1
        };

        if (status === TransactionStatus.PAID && !isCreditCard) {
            transactionPayload.paymentDate = createDateAsUTC(paymentDate); 
        } else {
            transactionPayload.paymentDate = null; 
        }

        if (costToEdit) {
            onSave({
                ...costToEdit,
                ...transactionPayload,
            });
        } else {
            onSave(transactionPayload);
        }
    };
    
    const isSaveDisabled = !description || !amount || parseCurrency(amount) <= 0 || !!dateError || !dueDate;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">{costToEdit ? 'Editar Custo' : 'Novo Custo / Despesa'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium">Descrição</label>
                        <input id="description" type="text" value={description} onChange={e => setDescription(e.target.value)} onBlur={() => setDescription(formatName(description))} required className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"/>
                    </div>
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium">Valor (R$)</label>
                        <input id="amount" type="text" value={amount} onChange={e => { handleCurrencyChange(e.target.value, setAmount); setError(''); }} required className={`mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 ${error ? 'border-red-500' : ''}`}/>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium">Categoria</label>
                            <select id="category" value={category} onChange={e => setCategory(e.target.value as TransactionCategory)} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2">
                            {allowedCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium">Status</label>
                            <select id="status" value={status} onChange={e => setStatus(e.target.value as TransactionStatus)} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2">
                            {Object.values(TransactionStatus).map(st => <option key={st} value={st}>{st}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Financial Config Section */}
                    {status === TransactionStatus.PAID && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3 animate-fade-in">
                            <h4 className="text-xs font-bold uppercase text-gray-500">Detalhes do Pagamento</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1">Banco</label>
                                    <select 
                                        value={selectedAccountId} 
                                        onChange={e => { setSelectedAccountId(e.target.value); setSelectedMethodId(''); }} 
                                        className="w-full rounded text-sm p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500"
                                    >
                                        <option value="">Selecione...</option>
                                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.bankName}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Método</label>
                                    <select 
                                        value={selectedMethodId} 
                                        onChange={e => setSelectedMethodId(e.target.value)} 
                                        disabled={!selectedAccountId}
                                        className="w-full rounded text-sm p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 disabled:opacity-50"
                                    >
                                        <option value="">Selecione...</option>
                                        {selectedAccount?.paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {isCreditCard && (
                                <div className="animate-fade-in">
                                    <label className="block text-xs font-medium mb-1 text-indigo-600 dark:text-indigo-400">Parcelas</label>
                                    <select 
                                        value={installments} 
                                        onChange={e => setInstallments(parseInt(e.target.value))}
                                        className="w-full rounded text-sm p-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-300 dark:border-indigo-500"
                                    >
                                        {Array.from({length: 12}, (_, i) => i + 1).map(n => (
                                            <option key={n} value={n}>{n}x de {formatMoney(((parseCurrency(amount) || 0) / n).toFixed(0).replace('.', ''))}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        *Lançamentos serão criados nos vencimentos futuros da fatura.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="dueDate" className="block text-sm font-medium">Vencimento <span className="text-red-500">*</span></label>
                            <input 
                                id="dueDate" 
                                type="date" 
                                value={dueDate} 
                                onChange={e => setDueDate(e.target.value)} 
                                className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                            />
                        </div>

                        {status === TransactionStatus.PAID && !isCreditCard && (
                            <div className="animate-fade-in">
                                <label htmlFor="paymentDate" className="block text-sm font-medium text-green-600 dark:text-green-400">Pagamento <span className="text-red-500">*</span></label>
                                <input 
                                    id="paymentDate" 
                                    type="date" 
                                    value={paymentDate} 
                                    onChange={e => setPaymentDate(e.target.value)} 
                                    className={`mt-1 block w-full rounded-md bg-green-50 dark:bg-gray-700 border-green-300 dark:border-green-600 shadow-sm focus:border-green-500 focus:ring-green-500 px-3 py-2 ${dateError ? 'border-red-500' : ''}`}
                                />
                            </div>
                        )}
                    </div>

                    {dateError && <p className="text-xs text-red-500 mt-1">{dateError}</p>}
                    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                        <button type="submit" disabled={isSaveDisabled} className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">Salvar</button>
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
                <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">Confirmar Exclusão</button>
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
    }, [apiCall, isModalOpen]); // Refresh when modal opens

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

    const nextPage = () => {
        if (currentPage < nPages) setCurrentPage(currentPage + 1);
    };
    const prevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCost(null);
    };

    const handleOpenModalForCreate = () => {
        setEditingCost(null);
        setIsModalOpen(true);
    };
    
    const handleOpenModalForEdit = (cost: CashTransaction) => {
        setEditingCost(cost);
        setIsModalOpen(true);
    };

    const handleSaveCost = (transactionData: Omit<CashTransaction, 'id' | 'timestamp'> | CashTransaction) => {
        if ('id' in transactionData) {
            updateTransaction(transactionData as CashTransaction);
        } else {
            addTransaction(transactionData as Omit<CashTransaction, 'id' | 'timestamp'>);
        }
        handleCloseModal();
    }
    
    const handleDeleteRequest = (costId: string) => {
        setDeletingCostId(costId);
    };

    const handleDeleteConfirm = () => {
        if (deletingCostId) {
            deleteTransaction(deletingCostId);
        }
        setDeletingCostId(null);
    };


    return (
        <div className="container mx-auto">
            {isModalOpen && <CostModal costToEdit={editingCost} accounts={accounts} onClose={handleCloseModal} onSave={handleSaveCost} />}
            {deletingCostId && (
                <ConfirmationModal 
                    message="Tem certeza que deseja excluir este custo? Esta ação não pode ser desfeita."
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeletingCostId(null)}
                />
            )}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Custos</h1>
                <button onClick={handleOpenModalForCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Adicionar Custo</button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg mb-6 space-y-4">
                <div className="flex items-center gap-2">
                    <label htmlFor="competency-picker" className="text-sm font-medium">Competência:</label>
                    <input 
                        type="month" 
                        id="competency-picker"
                        value={competency}
                        onChange={(e) => setCompetency(e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                                <th scope="col" className="px-6 py-3" title="Data de Criação do Registro">Lançamento</th>
                                <th scope="col" className="px-6 py-3">Vencimento</th>
                                <th scope="col" className="px-6 py-3">Pagamento</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                             {currentRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-gray-500">Nenhum custo encontrado para os filtros aplicados.</td>
                                </tr>
                             ) : (
                                currentRecords.map(t => {
                                    // Calculate logic for visual feedback
                                    const today = new Date().setHours(0,0,0,0);
                                    
                                    // Handle UTC date conversion for accurate day comparison
                                    const dueDateObj = t.dueDate ? new Date(t.dueDate) : null;
                                    const paymentDateObj = t.paymentDate ? new Date(t.paymentDate) : null;
                                    
                                    // Is Late Pending: Status PENDING and DueDate < Today
                                    const isLatePending = t.status === TransactionStatus.PENDING && dueDateObj && dueDateObj.getTime() < today;
                                    
                                    // Paid Late: Status PAID and PaymentDate > DueDate
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
                                        
                                        {/* Due Date Column with Overdue Logic */}
                                        <td className="px-6 py-4">
                                            {t.dueDate ? (
                                                <div className={isLatePending ? "text-red-500 font-bold" : ""}>
                                                    {formatDateUTC(t.dueDate)}
                                                    {isLatePending && <span className="block text-[10px] uppercase">Atrasado</span>}
                                                </div>
                                            ) : '-'}
                                        </td>

                                        {/* Payment Date Column */}
                                        <td className={`px-6 py-4 font-medium ${isPaidLate ? "text-red-500 font-bold" : "text-green-600"}`}>
                                            {t.status === TransactionStatus.PAID && t.paymentDate 
                                                ? (
                                                    <div>
                                                        {formatDateUTC(t.paymentDate)}
                                                        {isPaidLate && <span className="block text-[10px] uppercase text-red-500">Atraso</span>}
                                                    </div>
                                                ) 
                                                : '-'
                                            }
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button onClick={() => handleOpenModalForEdit(t)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline mr-4">Editar</button>
                                            <button onClick={() => handleDeleteRequest(t.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Excluir</button>
                                        </td>
                                    </tr>
                                    );
                                })
                             )}
                        </tbody>
                    </table>
                </div>

                 {nPages > 1 && (
                    <div className="p-4 flex justify-between items-center flex-wrap gap-2">
                         <span className="text-sm text-gray-700 dark:text-gray-400">
                            Página {currentPage} de {nPages} ({filteredCosts.length} registros)
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
}

export default Costs;
