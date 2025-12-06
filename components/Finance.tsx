
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { FinancialAccount, ReceivingRule, PaymentMethodConfig, CashTransaction, TransactionStatus } from '../types';
import { formatCurrencyNumber } from '../validation';

const methodTypes = {
    'Pix': 'Pix',
    'Debit': 'Débito',
    'Credit': 'Crédito',
    'Boleto': 'Boleto'
};

const formatDateUTC = (dateString: Date | string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

// Nova Tabela Específica para o Cartão de Crédito
const CreditCardStatementModal: React.FC<{ 
    account: FinancialAccount, 
    method: PaymentMethodConfig, 
    onClose: () => void 
}> = ({ account, method, onClose }) => {
    const { apiCall } = useContext(AuthContext);
    const [cardTransactions, setCardTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchItems = async () => {
            const data = await apiCall(`financial/statement?accountId=${account.id}&methodId=${method.id}`, 'GET');
            if (data) {
                setCardTransactions(data);
            }
            setLoading(false);
        };
        fetchItems();
    }, [account, method]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[70] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Extrato: {method.name}
                        </h2>
                        <p className="text-sm text-gray-500">{account.bankName} - Cartão de Crédito</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-white text-2xl">&times;</button>
                </div>

                <div className="p-6 overflow-x-auto">
                    {loading ? (
                        <p className="text-center text-gray-500 py-8">Carregando extrato...</p>
                    ) : cardTransactions.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">Nenhum custo lançado neste cartão ainda.</p>
                    ) : (
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-4 py-3">Descrição</th>
                                    <th className="px-4 py-3">Categoria</th>
                                    <th className="px-4 py-3">Valor</th>
                                    <th className="px-4 py-3">Data Compra</th>
                                    <th className="px-4 py-3">Vencimento Fatura</th>
                                    <th className="px-4 py-3">Parcela</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cardTransactions.map(item => (
                                    <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                            {item.description}
                                        </td>
                                        <td className="px-4 py-3">{item.category}</td>
                                        <td className="px-4 py-3 font-semibold text-red-500">
                                            R$ {formatCurrencyNumber(item.amount)}
                                        </td>
                                        <td className="px-4 py-3">{formatDateUTC(item.timestamp)}</td>
                                        <td className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300">
                                            {formatDateUTC(item.dueDate)}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {item.installmentNumber} / {item.totalInstallments}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-right">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg">Fechar Tabela</button>
                </div>
            </div>
        </div>
    );
};

const Finance: React.FC = () => {
    const { apiCall } = useContext(AuthContext);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [transactions, setTransactions] = useState<CashTransaction[]>([]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
    const [loading, setLoading] = useState(false);

    // Invoice View State
    const [statementViewer, setStatementViewer] = useState<{ account: FinancialAccount, method: PaymentMethodConfig } | null>(null);

    // Form State
    const [bankName, setBankName] = useState('');
    const [receivingRules, setReceivingRules] = useState<ReceivingRule[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);

    useEffect(() => {
        const loadData = async () => {
            const accs = await apiCall('financial', 'GET');
            if (accs) setAccounts(accs);
            
            const trans = await apiCall('transactions', 'GET');
            if (trans) setTransactions(trans);
        };
        loadData();
    }, []);

    const fetchAccounts = async () => {
        const data = await apiCall('financial', 'GET');
        if (data) setAccounts(data);
    };

    const handleOpenModal = (account?: FinancialAccount) => {
        if (account) {
            setEditingAccount(account);
            setBankName(account.bankName);
            setReceivingRules(account.receivingRules || []);
            setPaymentMethods(account.paymentMethods || []);
        } else {
            setEditingAccount(null);
            setBankName('');
            setReceivingRules([]);
            setPaymentMethods([]);
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!bankName) return alert('Nome do banco é obrigatório');
        
        setLoading(true);
        // Clean data before sending (remove temporary IDs if needed, handle numbers)
        const payload = { 
            bankName, 
            receivingRules: receivingRules.map(r => ({
                ...r,
                installmentsMin: r.installmentsMin || 1,
                installmentsMax: r.installmentsMax || 1,
                taxRate: r.taxRate || 0,
                daysToReceive: r.daysToReceive || 0
            })), 
            paymentMethods: paymentMethods.map(p => ({
                ...p,
                closingDay: p.closingDay || undefined,
                dueDay: p.dueDay || undefined
            }))
        };
        
        if (editingAccount) {
            await apiCall(`financial/${editingAccount.id}`, 'PUT', payload);
        } else {
            await apiCall('financial', 'POST', payload);
        }
        
        await fetchAccounts();
        setLoading(false);
        setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza? Isso pode afetar transações existentes.')) return;
        await apiCall(`financial/${id}`, 'DELETE');
        fetchAccounts();
    };

    // Helper functions for internal array management
    const addReceivingRule = () => {
        setReceivingRules([...receivingRules, { type: 'Credit', installmentsMin: 1, installmentsMax: 1, taxRate: 0, daysToReceive: 1 }]);
    };
    
    const updateReceivingRule = (index: number, field: keyof ReceivingRule, value: any) => {
        const updated = [...receivingRules];
        // Safe number parsing
        const safeValue = typeof value === 'number' && isNaN(value) ? 0 : value;
        updated[index] = { ...updated[index], [field]: safeValue };
        setReceivingRules(updated);
    };

    const removeReceivingRule = (index: number) => {
        setReceivingRules(receivingRules.filter((_, i) => i !== index));
    };

    const addPaymentMethod = () => {
        setPaymentMethods([...paymentMethods, { name: `${bankName} - Novo`, type: 'Pix' }]);
    };

    const updatePaymentMethod = (index: number, field: keyof PaymentMethodConfig, value: any) => {
        const updated = [...paymentMethods];
        // Safe number parsing
        const safeValue = typeof value === 'number' && isNaN(value) ? 0 : value;
        updated[index] = { ...updated[index], [field]: safeValue };
        setPaymentMethods(updated);
    };

    const removePaymentMethod = (index: number) => {
        setPaymentMethods(paymentMethods.filter((_, i) => i !== index));
    };

    // --- Unified Financial Table Logic ---
    const paidTransactions = useMemo(() => {
        return transactions
            .filter(t => t.status === TransactionStatus.PAID)
            .sort((a, b) => {
                const dateA = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
                const dateB = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
                return dateB - dateA; // Descending
            });
    }, [transactions]);

    const getPaymentMethodName = (t: CashTransaction) => {
        if (t.financialAccountId === 'cash-box') return 'Dinheiro / Caixa';
        
        const account = accounts.find(a => a.id === t.financialAccountId);
        if (!account) return 'Banco Desconhecido';

        const method = account.paymentMethods.find(m => m.id === t.paymentMethodId);
        if (!method) return `${account.bankName} (Manual)`;

        return `${account.bankName} - ${method.name}`;
    };

    return (
        <div className="container mx-auto p-4 space-y-8">
            {statementViewer && (
                <CreditCardStatementModal 
                    account={statementViewer.account} 
                    method={statementViewer.method} 
                    onClose={() => setStatementViewer(null)} 
                />
            )}

            {/* HEADER & BANKS */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Financeiro</h1>
                    <button 
                        onClick={() => handleOpenModal()} 
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md"
                    >
                        Inserir Banco
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {accounts.map(acc => (
                        <div key={acc.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{acc.bankName}</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenModal(acc)} className="text-gray-500 hover:text-indigo-500" title="Editar">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button onClick={() => handleDelete(acc.id)} className="text-gray-500 hover:text-red-500" title="Excluir">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-4 space-y-4 flex-1">
                                {/* Recebimentos Preview */}
                                <div>
                                    <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Recebimentos (Vendas)</h4>
                                    {acc.receivingRules.length === 0 ? <p className="text-xs text-gray-500 italic">Nenhum configurado</p> : (
                                        <div className="flex flex-wrap gap-2">
                                            {acc.receivingRules.map((rule, i) => (
                                                <span key={i} className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 px-2 py-1 rounded-full">
                                                    {methodTypes[rule.type]} {rule.type === 'Credit' ? `${rule.installmentsMin}-${rule.installmentsMax}x` : ''} ({rule.taxRate}%)
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Pagamentos Preview */}
                                <div>
                                    <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Pagamentos (Custos)</h4>
                                    {acc.paymentMethods.length === 0 ? <p className="text-xs text-gray-500 italic">Nenhum configurado</p> : (
                                        <ul className="space-y-2">
                                            {acc.paymentMethods.map((pm, i) => (
                                                <li key={i} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-700 dark:text-gray-300 font-medium">{pm.name}</span>
                                                        <span className="text-[10px] text-gray-500 bg-gray-200 dark:bg-gray-600 px-1.5 rounded">{methodTypes[pm.type]}</span>
                                                    </div>
                                                    {pm.type === 'Credit' && (
                                                        <button 
                                                            onClick={() => setStatementViewer({ account: acc, method: pm })}
                                                            className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition-colors"
                                                        >
                                                            Extrato
                                                        </button>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* UNIFIED FINANCIAL TABLE */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Movimentações Financeiras Realizadas (Pagos)</h2>
                    <p className="text-sm text-gray-500">Histórico unificado de todas as entradas e saídas efetivadas.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3">Data Pagto</th>
                                <th className="px-6 py-3">Descrição</th>
                                <th className="px-6 py-3">Categoria</th>
                                <th className="px-6 py-3">Forma de Pagamento</th>
                                <th className="px-6 py-3 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paidTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhuma movimentação realizada encontrada.</td>
                                </tr>
                            ) : (
                                paidTransactions.map(t => (
                                    <tr key={t.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4">{formatDateUTC(t.paymentDate)}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t.description}</td>
                                        <td className="px-6 py-4">{t.category}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs">
                                                {getPaymentMethodName(t)}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                            {t.type === 'expense' ? '-' : '+'} R$ {formatCurrencyNumber(t.amount)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for Bank Editing */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {editingAccount ? 'Editar Banco' : 'Novo Banco'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white text-2xl">&times;</button>
                        </div>

                        <div className="p-6 space-y-8">
                            {/* Bank Name */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Nome do Banco</label>
                                <input 
                                    type="text" 
                                    value={bankName} 
                                    onChange={e => setBankName(e.target.value)} 
                                    placeholder="Ex: Inter"
                                    className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* SECTION: RECEBIMENTOS */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-green-600 dark:text-green-400">Recebimentos (Vendas)</h3>
                                        <button onClick={addReceivingRule} className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold hover:bg-green-200">+ Regra</button>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-600 space-y-3">
                                        {receivingRules.map((rule, idx) => (
                                            <div key={idx} className="flex flex-col gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
                                                <div className="flex gap-2">
                                                    <select 
                                                        value={rule.type} 
                                                        onChange={(e) => updateReceivingRule(idx, 'type', e.target.value)}
                                                        className="flex-1 p-1 text-sm rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-500"
                                                    >
                                                        <option value="Pix">Pix</option>
                                                        <option value="Debit">Débito</option>
                                                        <option value="Credit">Crédito</option>
                                                    </select>
                                                    <div className="flex items-center gap-1 w-24">
                                                        <input type="number" value={rule.taxRate} onChange={(e) => updateReceivingRule(idx, 'taxRate', parseFloat(e.target.value))} className="w-full p-1 text-sm text-center rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-500" placeholder="%" />
                                                        <span className="text-xs">%</span>
                                                    </div>
                                                    <button onClick={() => removeReceivingRule(idx)} className="text-red-500 hover:text-red-700">&times;</button>
                                                </div>
                                                
                                                {rule.type === 'Credit' && (
                                                    <div className="flex gap-2 items-center text-xs text-gray-500">
                                                        <span>De:</span>
                                                        <input type="number" min="1" value={rule.installmentsMin} onChange={(e) => updateReceivingRule(idx, 'installmentsMin', parseInt(e.target.value))} className="w-12 p-1 text-center rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-500" />
                                                        <span>x até:</span>
                                                        <input type="number" min="1" value={rule.installmentsMax} onChange={(e) => updateReceivingRule(idx, 'installmentsMax', parseInt(e.target.value))} className="w-12 p-1 text-center rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-500" />
                                                        <span>x</span>
                                                    </div>
                                                )}
                                                
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <span>Receber em (Dias):</span>
                                                    <input type="number" value={rule.daysToReceive} onChange={(e) => updateReceivingRule(idx, 'daysToReceive', parseInt(e.target.value))} className="w-16 p-1 text-center rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-500" />
                                                </div>
                                            </div>
                                        ))}
                                        {receivingRules.length === 0 && <p className="text-center text-sm text-gray-400 py-4">Nenhuma taxa configurada</p>}
                                    </div>
                                </div>

                                {/* SECTION: PAGAMENTOS */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-red-500 dark:text-red-400">Pagamentos (Custos)</h3>
                                        <button onClick={addPaymentMethod} className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold hover:bg-red-200">+ Método</button>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-600 space-y-3">
                                        {paymentMethods.map((pm, idx) => (
                                            <div key={idx} className="flex flex-col gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        value={pm.name} 
                                                        onChange={(e) => updatePaymentMethod(idx, 'name', e.target.value)} 
                                                        placeholder="Nome (Ex: Crédito Inter)"
                                                        className="flex-1 p-1 text-sm rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-500"
                                                    />
                                                    <select 
                                                        value={pm.type} 
                                                        onChange={(e) => updatePaymentMethod(idx, 'type', e.target.value)}
                                                        className="w-24 p-1 text-sm rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-500"
                                                    >
                                                        <option value="Pix">Pix</option>
                                                        <option value="Debit">Débito</option>
                                                        <option value="Boleto">Boleto</option>
                                                        <option value="Credit">Crédito</option>
                                                    </select>
                                                    <button onClick={() => removePaymentMethod(idx)} className="text-red-500 hover:text-red-700">&times;</button>
                                                </div>

                                                {pm.type === 'Credit' && (
                                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded">
                                                        <div className="flex flex-col">
                                                            <span>Dia Fechamento:</span>
                                                            <input type="number" min="1" max="31" value={pm.closingDay || ''} onChange={(e) => updatePaymentMethod(idx, 'closingDay', parseInt(e.target.value))} className="p-1 rounded border border-gray-300" placeholder="Dia" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span>Dia Vencimento:</span>
                                                            <input type="number" min="1" max="31" value={pm.dueDay || ''} onChange={(e) => updatePaymentMethod(idx, 'dueDay', parseInt(e.target.value))} className="p-1 rounded border border-gray-300" placeholder="Dia" />
                                                        </div>
                                                        {/* Botão solicitado para ver lançamentos DENTRO do formulário de edição */}
                                                        {editingAccount && (
                                                            <button 
                                                                type="button"
                                                                onClick={() => setStatementViewer({ account: editingAccount, method: pm })}
                                                                className="col-span-2 mt-2 w-full py-2 bg-indigo-600 text-white rounded font-bold text-xs hover:bg-indigo-700 flex items-center justify-center gap-2"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                                                Ver Lançamentos (Fatura)
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {paymentMethods.length === 0 && <p className="text-center text-sm text-gray-400 py-4">Nenhum método configurado</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300">Cancelar</button>
                            <button onClick={handleSave} disabled={loading} className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                                {loading ? 'Salvando...' : 'Salvar Banco'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Finance;
