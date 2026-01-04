
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
    onClose: () => void;
    onSave: (transaction: any) => void; 
    onDelete?: (transactionId: string) => void; 
}

// Helper: Date UTC
const createDateAsUTC = (dateString: string) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
};

const formatDateUTC = (dateString: Date | string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

// Warning Modal
const ActionConfirmationModal: React.FC<{ 
    isOpen: boolean; 
    title: string; 
    message: React.ReactNode; 
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void; 
    onCancel: () => void 
}> = ({ isOpen, title, message, confirmText, confirmColor, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-90 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm animate-fade-in border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">{title}</h3>
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-6">{message}</div>
                <div className="flex justify-end space-x-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white">Cancelar</button>
                    <button onClick={onConfirm} className={`px-4 py-2 rounded-md text-white font-bold shadow-md ${confirmColor}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

const CostModal: React.FC<CostModalProps> = ({ costToEdit, onClose, onSave, onDelete }) => {
    const { user } = useContext(AuthContext);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<TransactionCategory>(TransactionCategory.OTHER);
    
    // Financial State (RESET ON OPEN IF EDITING)
    const [status, setStatus] = useState<TransactionStatus | ''>(''); 
    
    const today = new Date().toISOString().split('T')[0];
    const [dueDate, setDueDate] = useState(today); 
    const [paymentDate, setPaymentDate] = useState(today); 
    const [selectedAccountId, setSelectedAccountId] = useState('cash-box');
    const [installments, setInstallments] = useState(1);
    
    const [error, setError] = useState('');
    const [showHistoryWarning, setShowHistoryWarning] = useState(false);
    const [showDeleteWarning, setShowDeleteWarning] = useState(false);
    const [pendingPayload, setPendingPayload] = useState<any>(null);

    const allowedCategories = useMemo(() => Object.values(TransactionCategory).filter(cat =>
        ![
            TransactionCategory.PRODUCT_PURCHASE,
            TransactionCategory.SERVICE_REVENUE,
            TransactionCategory.SALES_REVENUE,
            TransactionCategory.SERVICE_COST,
        ].includes(cat)
    ), []);

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
            setCategory(costToEdit.category as any);
            // CRITICAL: Financials start empty on edit to force Clean Slate
            setStatus(''); 
            setSelectedAccountId('cash-box');
        } else {
            setDescription('');
            setAmount('');
            setCategory(TransactionCategory.OTHER);
            setStatus('');
            setSelectedAccountId('cash-box');
        }
        setError('');
    }, [costToEdit]);

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as TransactionStatus | '';
        setStatus(newStatus);
        
        // Conditional Defaults
        if (newStatus === TransactionStatus.PENDING) {
            setDueDate(today);
            setSelectedAccountId('cash-box');
            setInstallments(1);
        } else if (newStatus === TransactionStatus.PAID) {
            setPaymentDate(today);
            setSelectedAccountId('cash-box');
            setInstallments(1);
        }
    };

    const handleConfirmSave = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseCurrency(amount);
        if (numericAmount <= 0) { setError('Valor inválido.'); return; }
        if (status === '') { setError('Selecione o status do pagamento.'); return; }

        const transactionPayload: any = {
            description: formatName(description),
            amount: numericAmount,
            type: TransactionType.EXPENSE,
            category,
            status: status, 
            timestamp: new Date(), 
            financialAccountId: selectedAccountId,
            installments: (selectedAccountId === 'boleto' || selectedAccountId === 'credit-main') ? Math.max(1, installments) : 1
        };

        if (status === TransactionStatus.PAID) {
            transactionPayload.paymentDate = createDateAsUTC(paymentDate);
            transactionPayload.dueDate = createDateAsUTC(paymentDate);
        } else {
            transactionPayload.dueDate = createDateAsUTC(dueDate);
            transactionPayload.paymentDate = null;
        }

        if (costToEdit) {
            setPendingPayload({ ...transactionPayload, id: costToEdit.id });
            setShowHistoryWarning(true);
        } else {
            onSave(transactionPayload);
        }
    };

    const confirmOverwrite = () => {
        if (pendingPayload) onSave(pendingPayload);
        setShowHistoryWarning(false);
    };

    // Style for Select Options to ensure visibility
    const optionClass = "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <ActionConfirmationModal 
                isOpen={showHistoryWarning}
                title="Redefinir Lançamento?"
                message="Ao salvar, o registro anterior e suas parcelas serão excluídos e substituídos por esta nova configuração. Deseja prosseguir?"
                confirmText="Sim, Redefinir"
                confirmColor="bg-indigo-600 hover:bg-indigo-700"
                onConfirm={confirmOverwrite}
                onCancel={() => setShowHistoryWarning(false)}
            />

            <ActionConfirmationModal 
                isOpen={showDeleteWarning}
                title="Excluir Custo"
                message="Deseja excluir este lançamento permanentemente?"
                confirmText="Sim, Excluir"
                confirmColor="bg-red-600 hover:bg-red-700"
                onConfirm={() => { if(costToEdit) onDelete!(costToEdit.id); onClose(); }}
                onCancel={() => setShowDeleteWarning(false)}
            />

            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {costToEdit ? 'Editar Custo' : 'Novo Custo / Despesa'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl">&times;</button>
                </div>

                <form onSubmit={handleConfirmSave} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium mb-1">Descrição</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} required className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"/>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Valor Total (R$)</label>
                            <input type="text" value={amount} onChange={e => handleCurrencyChange(e.target.value, setAmount)} required className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 font-bold text-red-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Categoria</label>
                            <select value={category} onChange={e => setCategory(e.target.value as TransactionCategory)} className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 text-gray-900 dark:text-white">
                                {allowedCategories.map(cat => <option key={cat} value={cat} className={optionClass}>{cat}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Status do Pagamento <span className="text-red-500">*</span></label>
                        <select value={status} onChange={handleStatusChange} required className="w-full rounded-lg bg-white dark:bg-gray-700 border-indigo-300 dark:border-indigo-600 p-2.5 font-semibold text-white dark:text-white">
                            <option value="" className={optionClass}>Selecione...</option>
                            <option value={TransactionStatus.PENDING} className={optionClass}>Pendente (A Pagar)</option>
                            <option value={TransactionStatus.PAID} className={optionClass}>Pago (Realizado)</option>
                        </select>
                    </div>

                    {status !== '' && (
                        <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/10 border border-gray-100 dark:border-gray-300 animate-fade-in space-y-4 text-gray-900 dark:text-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Forma de Pagamento</label>
                                    <select value={selectedAccountId} onChange={e => { setSelectedAccountId(e.target.value); setInstallments(1); }} className="w-full rounded-lg p-2.5 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                                        <option value="cash-box" className={optionClass}>Dinheiro do Caixa</option>
                                        {status === TransactionStatus.PENDING && <option value="boleto" className={optionClass}>Boleto Bancário</option>}
                                        {status === TransactionStatus.PAID && (
                                            <>
                                                <option value="bank-main" className={optionClass}>Pix / Débito</option>
                                                <option value="credit-main" className={optionClass}>Cartão de Crédito</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                {status === TransactionStatus.PAID ? (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Data Pagamento</label>
                                        <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} max={today} className="w-full rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 text-gray-900 dark:text-white"/>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Data Vencimento</label>
                                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 p-2.5 text-gray-900 dark:text-white"/>
                                    </div>
                                )}
                            </div>

                            {(selectedAccountId === 'boleto' || selectedAccountId === 'credit-main') && (
                                <div className="pt-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-bold">Parcelamento ({installments}x)</label>
                                        <select value={installments} onChange={e => setInstallments(parseInt(e.target.value))} className="rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                            {Array.from({length: 12}, (_, i) => i + 1).map((n: number) => <option key={n} value={n} className={optionClass}>{n}x</option>)}
                                        </select>
                                    </div>
                                    <p className="text-xs text-gray-100 italic">
                                        Parcela: R$ {formatCurrencyNumber(parseCurrency(amount) / installments)}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded text-center">{error}</p>}

                    <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
                        {costToEdit && <button type="button" onClick={() => setShowDeleteWarning(true)} className="px-5 py-2.5 rounded-lg bg-gray-200 dark:bg-red-700 hover:bg-red-500 dark:text-gray-200 font-bold">Excluir</button>}
                        <div className="flex space-x-3 ml-auto">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold">Cancelar</button>
                            <button type="submit" disabled={!description || !amount || status === ''} className="px-5 py-2.5 rounded-lg bg-indigo-800 hover:bg-indigo-600 text-white font-bold disabled:opacity-50">Salvar</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

const Costs: React.FC<CostsProps> = ({ transactions, addTransaction, updateTransaction, deleteTransaction }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCost, setEditingCost] = useState<CashTransaction | null>(null);
    
    const getCurrentCompetency = () => {
        const now = new Date();
        return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    };

    const [competency, setCompetency] = useState<string>(getCurrentCompetency());
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 15;

    const filteredCosts = useMemo(() => {
        const [year, month] = competency.split('-').map(Number);
        let result = transactions.filter(t => 
            t.type === TransactionType.EXPENSE && 
            !(t as any).isInvoice && 
            t.category !== TransactionCategory.PRODUCT_PURCHASE && 
            t.category !== TransactionCategory.SERVICE_COST
        );

        if (competency) {
            result = result.filter(t => {
                const d = new Date(t.timestamp);
                return d.getUTCFullYear() === year && (d.getUTCMonth() + 1) === month;
            });
        }

        if (statusFilter !== 'All') {
            result = result.filter(t => {
                if (statusFilter === 'Pendente-Caixa') return t.status === TransactionStatus.PENDING && t.financialAccountId === 'cash-box';
                if (statusFilter === 'Pendente-Boleto') return t.status === TransactionStatus.PENDING && t.financialAccountId === 'boleto';
                if (statusFilter === 'Pago-Caixa') return t.status === TransactionStatus.PAID && t.financialAccountId === 'cash-box';
                if (statusFilter === 'Pago-Boleto') return t.status === TransactionStatus.PAID && t.financialAccountId === 'boleto';
                if (statusFilter === 'Pago-Pix/Débito') return t.status === TransactionStatus.PAID && t.financialAccountId === 'bank-main';
                if (statusFilter === 'Pago-Crédito') return t.financialAccountId === 'credit-main';
                return true;
            });
        }
        return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [transactions, competency, statusFilter]);

    const renderDetailedStatus = (t: CashTransaction) => {
        const isPaid = t.status === TransactionStatus.PAID;
        const acc = t.financialAccountId;
        const instCount = (t as any).installments?.length || 1;
        const ccInst = (t as any).installments && (t as any).installments.length > 0 ? (t as any).installments[0].number : 1;

        if (acc === 'boleto') {
            return isPaid 
                ? <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700">Pago - Boleto</span>
                : <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700">Pendente - Boleto ({instCount}x)</span>;
        }
        if (acc === 'credit-main') {
            return <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700">Pago - Crédito ({ccInst}x)</span>;
        }
        if (acc === 'cash-box') {
            return isPaid 
                ? <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700">Pago - Caixa</span>
                : <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700">Pendente - Caixa</span>;
        }
        if (acc === 'bank-main') {
            return <span className="px-2 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700">Pago - Pix/Débito</span>;
        }
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-700">{t.status}</span>;
    };

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredCosts.slice(indexOfFirstRecord, indexOfLastRecord);
    const nPages = Math.ceil(filteredCosts.length / recordsPerPage);

    return (
        <div className="container mx-auto">
            {isModalOpen && (
                <CostModal 
                    costToEdit={editingCost} 
                    onClose={() => { setIsModalOpen(false); setEditingCost(null); }} 
                    onSave={(data) => { if(data.id) updateTransaction(data); else addTransaction(data); setIsModalOpen(false); }} 
                    onDelete={deleteTransaction} 
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Custos e Despesas</h1>
                <button onClick={() => { setEditingCost(null); setIsModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg">Adicionar Custo</button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg mb-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Mês:</label>
                    <input type="month" value={competency} onChange={(e) => setCompetency(e.target.value)} className="px-2 py-1 border rounded-md dark:bg-gray-700 text-gray-900 dark:text-white"/>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Filtro:</label>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border rounded-md p-1 dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="All">Todos os Status</option>
                        <option value="Pendente-Caixa">Pendente - Caixa</option>
                        <option value="Pendente-Boleto">Pendente - Boleto</option>
                        <option value="Pago-Caixa">Pago - Caixa</option>
                        <option value="Pago-Boleto">Pago - Boleto</option>
                        <option value="Pago-Pix/Débito">Pago - Pix/Débito</option>
                        <option value="Pago-Crédito">Pago - Crédito</option>
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-4">Descrição</th>
                                <th className="px-6 py-4">Categoria</th>
                                <th className="px-6 py-4">Valor</th>
                                <th className="px-6 py-4">Status / Forma</th>
                                <th className="px-6 py-4">Data Ref.</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentRecords.length === 0 ? <tr><td colSpan={6} className="text-center py-8">Nenhum lançamento encontrado.</td></tr> : currentRecords.map(t => (
                                <tr key={t.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t.description}</td>
                                    <td className="px-6 py-4">{t.category}</td>
                                    <td className="px-6 py-4 font-bold text-red-500">- R$ {formatCurrencyNumber(t.amount)}</td>
                                    <td className="px-6 py-4">{renderDetailedStatus(t)}</td>
                                    <td className="px-6 py-4">{formatDateUTC(t.timestamp)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => { setEditingCost(t); setIsModalOpen(true); }} className="text-indigo-600 hover:underline mr-4 font-bold">Editar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {nPages > 1 && (
                    <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1} className="px-3 py-1 border rounded disabled:opacity-50">Anterior</button>
                        <span className="text-xs uppercase font-bold">Página {currentPage} de {nPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(nPages, p+1))} disabled={currentPage===nPages} className="px-3 py-1 border rounded disabled:opacity-50">Próximo</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Costs;
