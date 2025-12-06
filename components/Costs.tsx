
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { CashTransaction, TransactionType, TransactionCategory, TransactionStatus, FinancialAccount } from '../types';
import { formatCurrencyNumber, formatMoney } from '../validation';
import { AuthContext } from '../contexts/AuthContext';

interface CostModalProps {
    costToEdit?: CashTransaction | null;
    accounts: FinancialAccount[];
    onClose: () => void;
    onSave: (transaction: any) => Promise<void>;
}

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
    const [isSaving, setIsSaving] = useState(false);

    // Get today's date for max attribute
    const today = new Date().toISOString().split('T')[0];

    const allowedCategories = Object.values(TransactionCategory).filter(c => 
        c !== TransactionCategory.SALES_REVENUE && c !== TransactionCategory.SERVICE_REVENUE
    );

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
            setPurchaseDate(new Date(costToEdit.timestamp).toISOString().split('T')[0]);
            
            if (costToEdit.dueDate) setDueDate(new Date(costToEdit.dueDate).toISOString().split('T')[0]);
            if (costToEdit.paymentDate) setPaymentDate(new Date(costToEdit.paymentDate).toISOString().split('T')[0]);
            
            if (costToEdit.financialAccountId) setSelectedAccountId(costToEdit.financialAccountId);
            if (costToEdit.paymentMethodId) setSelectedMethodId(costToEdit.paymentMethodId);
        } else {
            setDescription('');
            setAmount('');
            setCategory(TransactionCategory.OTHER);
            setStatus(TransactionStatus.PENDING);
            setPurchaseDate(new Date().toISOString().split('T')[0]);
            setDueDate('');
            setPaymentDate('');
            setSelectedAccountId('');
            setSelectedMethodId('');
            setInstallments(1);
        }
        setError('');
    }, [costToEdit]);

    const isCashBox = selectedAccountId === 'cash-box';
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const selectedMethod = selectedAccount?.paymentMethods.find(m => (m.id || (m as any)._id) === selectedMethodId);
    const isCreditCard = !isCashBox && selectedMethod?.type === 'Credit';

    const creditCardPreview = useMemo(() => {
        if (!isCreditCard || !selectedMethod) return [];
        const numAmount = parseCurrency(amount);
        if (numAmount <= 0) return [];

        const closingDay = selectedMethod.closingDay || 1;
        const dueDay = selectedMethod.dueDay || 10;
        
        const previews = [];
        const purchase = new Date(purchaseDate);
        const installmentValue = numAmount / installments;

        // Logic to determine first due date
        const purchaseDay = purchase.getUTCDate();
        let targetMonth = purchase.getUTCMonth();
        let targetYear = purchase.getUTCFullYear();

        if (purchaseDay >= closingDay) {
            targetMonth += 1;
            if (targetMonth > 11) { targetMonth = 0; targetYear += 1; }
        }

        for (let i = 0; i < installments; i++) {
            let m = targetMonth + i;
            let y = targetYear;
            while (m > 11) { m -= 12; y += 1; }
            
            const autoDueDate = new Date(Date.UTC(y, m, dueDay, 12, 0, 0));
            previews.push({
                number: i + 1,
                date: autoDueDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
                amount: installmentValue
            });
        }
        return previews;
    }, [isCreditCard, selectedMethod, amount, installments, purchaseDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!description || !amount) {
            setError('Preencha descrição e valor.');
            return;
        }

        if (status === TransactionStatus.PENDING && !dueDate) {
            setError('Data de vencimento é obrigatória para contas pendentes.');
            return;
        }

        if (status === TransactionStatus.PAID) {
            if (!selectedAccountId) {
                setError('Selecione a conta de origem para pagamentos realizados.');
                return;
            }
            if (!isCashBox && !selectedMethodId) {
                setError('Selecione o método de pagamento.');
                return;
            }
            if (!isCreditCard && !paymentDate) {
                setError('Data do pagamento é obrigatória.');
                return;
            }
        }

        setIsSaving(true);
        try {
            const payload: any = {
                description,
                amount: parseCurrency(amount),
                category,
                status,
                timestamp: purchaseDate,
                type: TransactionType.EXPENSE
            };

            if (costToEdit) payload.id = costToEdit.id;

            if (status === TransactionStatus.PENDING) {
                payload.dueDate = dueDate;
            } else {
                payload.financialAccountId = selectedAccountId;
                payload.paymentMethodId = selectedMethodId;
                
                if (isCreditCard) {
                    payload.installments = installments;
                    // Due dates handled by backend for Credit Card
                } else {
                    payload.dueDate = dueDate || paymentDate; // Default to payment date if no due date set
                    payload.paymentDate = paymentDate;
                }
            }

            await onSave(payload);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar.');
        } finally {
            setIsSaving(false);
        }
    };

    const isSaveDisabled = !description || !amount || isSaving;

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
                    <div>
                        <label className="block text-sm font-medium mb-1">Descrição</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Aluguel, Internet..."/>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Valor Total (R$)</label>
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

                                {!isCashBox && selectedAccountId && (
                                    <div>
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
                            </div>

                            {isCreditCard && (
                                <div className="p-3 bg-white dark:bg-gray-800 rounded border border-indigo-200 dark:border-indigo-800 shadow-sm animate-fade-in">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Parcelamento no Cartão</label>
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
                                    
                                    {creditCardPreview.length > 0 && (
                                        <div className="max-h-32 overflow-y-auto border-t border-gray-100 dark:border-gray-700 pt-2">
                                            <table className="w-full text-xs">
                                                <thead className="text-gray-500 dark:text-gray-400 text-left">
                                                    <tr>
                                                        <th className="py-1">Parc.</th>
                                                        <th className="py-1">Vencimento</th>
                                                        <th className="py-1 text-right">Valor</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {creditCardPreview.map((item) => (
                                                        <tr key={item.number} className="border-b border-gray-50 dark:border-gray-700 last:border-0">
                                                            <td className="py-1 font-medium">{item.number}x</td>
                                                            <td className="py-1 text-gray-600 dark:text-gray-300">{item.date}</td>
                                                            <td className="py-1 text-right font-medium">R$ {formatCurrencyNumber(item.amount)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-orange-500 font-medium mt-2 text-center">
                                        ⚠ Serão geradas {installments} contas "Pendente" para cada vencimento.
                                    </p>
                                </div>
                            )}

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
                                            max={today}
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
                            {isSaving ? 'Salvando...' : 'Salvar Lançamento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

interface CostsProps {
    transactions: CashTransaction[];
    addTransaction: (t: any) => Promise<void>;
    updateTransaction: (t: any) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
}

const Costs: React.FC<CostsProps> = ({ transactions, addTransaction, updateTransaction, deleteTransaction }) => {
    const { apiCall } = useContext(AuthContext);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCost, setEditingCost] = useState<CashTransaction | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchAccounts = async () => {
            const data = await apiCall('financial', 'GET');
            if (data) setAccounts(data);
        };
        fetchAccounts();
    }, []);

    const handleEdit = (cost: CashTransaction) => {
        setEditingCost(cost);
        setIsModalOpen(true);
    };

    const handleSave = async (transaction: any) => {
        if (transaction.id) {
            await updateTransaction(transaction);
        } else {
            await addTransaction(transaction);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Tem certeza que deseja excluir este custo?")) {
            await deleteTransaction(id);
        }
    };

    const costs = transactions.filter(t => t.type === TransactionType.EXPENSE).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    const filteredCosts = costs.filter(c => 
        c.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto">
            {isModalOpen && <CostModal costToEdit={editingCost} accounts={accounts} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Custos</h1>
                <button onClick={() => { setEditingCost(null); setIsModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md">
                    + Novo Custo
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg mb-6">
                <input
                    type="text"
                    placeholder="Buscar por descrição ou categoria..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm px-3 py-2"
                />
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3">Data</th>
                                <th className="px-6 py-3">Descrição</th>
                                <th className="px-6 py-3">Categoria</th>
                                <th className="px-6 py-3">Valor</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCosts.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-8">Nenhum custo registrado.</td></tr>
                            ) : (
                                filteredCosts.map(cost => (
                                    <tr key={cost.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4">{new Date(cost.timestamp).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{cost.description}</td>
                                        <td className="px-6 py-4">{cost.category}</td>
                                        <td className="px-6 py-4 font-bold text-red-500">R$ {formatCurrencyNumber(cost.amount)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${cost.status === TransactionStatus.PAID ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {cost.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleEdit(cost)} className="text-indigo-600 hover:underline mr-3">Editar</button>
                                            <button onClick={() => handleDelete(cost.id)} className="text-red-600 hover:underline">Excluir</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Costs;
