
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { FinancialAccount, ReceivingRule, PaymentMethodConfig } from '../types';

const methodTypes = {
    'Pix': 'Pix',
    'Debit': 'Débito',
    'Credit': 'Crédito',
    'Boleto': 'Boleto'
};

const Finance: React.FC = () => {
    const { apiCall } = useContext(AuthContext);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
    const [loading, setLoading] = useState(false);

    // Form State
    const [bankName, setBankName] = useState('');
    const [receivingRules, setReceivingRules] = useState<ReceivingRule[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);

    useEffect(() => {
        fetchAccounts();
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
        if (!window.confirm('Tem certeza? Isso pode afetar relatórios financeiros.')) return;
        await apiCall(`financial/${id}`, 'DELETE');
        fetchAccounts();
    };

    // Helper functions for internal array management
    const addReceivingRule = () => {
        setReceivingRules([...receivingRules, { type: 'Credit', installmentsMin: 1, installmentsMax: 1, taxRate: 0, daysToReceive: 1 }]);
    };
    
    const updateReceivingRule = (index: number, field: keyof ReceivingRule, value: any) => {
        const updated = [...receivingRules];
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
        const safeValue = typeof value === 'number' && isNaN(value) ? 0 : value;
        updated[index] = { ...updated[index], [field]: safeValue };
        setPaymentMethods(updated);
    };

    const removePaymentMethod = (index: number) => {
        setPaymentMethods(paymentMethods.filter((_, i) => i !== index));
    };

    return (
        <div className="container mx-auto p-4 space-y-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Contas Bancárias</h1>
                <button 
                    onClick={() => handleOpenModal()} 
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md"
                >
                    + Nova Conta
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
                                <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Formas de Pagamento (Custos)</h4>
                                {acc.paymentMethods.length === 0 ? <p className="text-xs text-gray-500 italic">Nenhum configurado</p> : (
                                    <ul className="space-y-2">
                                        {acc.paymentMethods.map((pm, i) => (
                                            <li key={i} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-700 dark:text-gray-300 font-medium">{pm.name}</span>
                                                    <span className="text-[10px] text-gray-500 bg-gray-200 dark:bg-gray-600 px-1.5 rounded">{methodTypes[pm.type]}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
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
                                        <h3 className="text-lg font-bold text-red-500 dark:text-red-400">Formas de Pagamento (Custos)</h3>
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
