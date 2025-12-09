import React, { useState, useEffect, useContext, useMemo } from 'react';
import { PurchaseOrder, Product, TransactionStatus, PaymentMethod, PurchaseItem, FinancialAccount, Supplier } from '../types';
import { formatCurrencyNumber, formatMoney, formatRegister, formatPhone, validateRegister } from '../validation';
import { AuthContext } from '../contexts/AuthContext';

// Notification Modal Component (Internal)
interface ModalProps {
    isOpen: boolean;
    type: 'success' | 'error';
    message: string;
    onClose: () => void;
}

const NotificationModal: React.FC<ModalProps> = ({ isOpen, type, message, onClose }) => {
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

interface PurchaseModalProps {
    purchaseToEdit?: PurchaseOrder | null;
    products: Product[];
    accounts: FinancialAccount[];
    onClose: () => void;
    onSave: (purchaseData: any) => void;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ purchaseToEdit, products, accounts, onClose, onSave }) => {
    // State management
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [supplierName, setSupplierName] = useState('');
    const [supplierCnpj, setSupplierCnpj] = useState('');
    const [supplierContact, setSupplierContact] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [reference, setReference] = useState('');
    const [freightCost, setFreightCost] = useState('');
    const [otherCost, setOtherCost] = useState('');
    
    // Status & Payment
    const [status, setStatus] = useState<TransactionStatus | ''>('');
    const [statusError, setStatusError] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.PIX); // Default
    const [selectedAccountId, setSelectedAccountId] = useState('cash-box');
    const [selectedMethodId, setSelectedMethodId] = useState('');
    const [installments, setInstallments] = useState(1);
    
    const today = new Date().toISOString().split('T')[0];
    const [paymentDate, setPaymentDate] = useState(today);
    const [dueDate, setDueDate] = useState(today);

    // Item adding state
    const [selectedProductId, setSelectedProductId] = useState('');
    const [itemQuantity, setItemQuantity] = useState(1);
    const [itemCost, setItemCost] = useState('');

    const [notification, setNotification] = useState<{isOpen: boolean; type: 'success' | 'error'; message: string}>({
        isOpen: false, type: 'error', message: ''
    });

    useEffect(() => {
        if (purchaseToEdit) {
            setItems(purchaseToEdit.items);
            setSupplierName(purchaseToEdit.supplierInfo.name);
            setSupplierCnpj(formatRegister(purchaseToEdit.supplierInfo.cnpjCpf));
            setSupplierContact(purchaseToEdit.supplierInfo.contactPerson || '');
            setSupplierPhone(formatPhone(purchaseToEdit.supplierInfo.phone));
            setReference(purchaseToEdit.reference);
            setFreightCost(formatMoney((purchaseToEdit.freightCost * 100).toFixed(0)));
            setOtherCost(formatMoney((purchaseToEdit.otherCost * 100).toFixed(0)));
            
            // Payment Logic Reconstruction
            // Since backend doesn't store 'status' directly on PurchaseOrder (it's in transactions),
            // usually we infer or pass it. But here let's assume we might receive it if we extended PurchaseOrder type or handle logic differently.
            // For now, we mimic updateTransaction which likely updates parent state
            
            // Re-mapping payment details from PO if available
            if (purchaseToEdit.paymentDetails) {
                if ('installments' in purchaseToEdit.paymentDetails && purchaseToEdit.paymentDetails.method === PaymentMethod.BANK_SLIP) {
                    setStatus(TransactionStatus.PENDING);
                    setSelectedAccountId('boleto');
                    if (purchaseToEdit.paymentDetails.installments.length > 0) {
                        setInstallments(purchaseToEdit.paymentDetails.installments.length);
                        setDueDate(new Date(purchaseToEdit.paymentDetails.installments[0].dueDate).toISOString().split('T')[0]);
                    }
                } else if ('paymentDate' in purchaseToEdit.paymentDetails && purchaseToEdit.paymentDetails.paymentDate) {
                    setStatus(TransactionStatus.PAID);
                    setPaymentDate(new Date(purchaseToEdit.paymentDetails.paymentDate).toISOString().split('T')[0]);
                    if ('financialAccountId' in purchaseToEdit.paymentDetails) {
                         setSelectedAccountId((purchaseToEdit.paymentDetails as any).financialAccountId || 'cash-box');
                         setSelectedMethodId((purchaseToEdit.paymentDetails as any).paymentMethodId || '');
                    }
                } else {
                    setStatus(TransactionStatus.PENDING);
                }
            }
        }
    }, [purchaseToEdit]);

    const handleCurrencyChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        if (value === '' || value === 'R$ ') { setter(''); return; }
        setter(formatMoney(value));
    };

    const parseMoney = (value: string): number => {
        if (!value) return 0;
        const numericString = value.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
        return parseFloat(numericString) || 0;
    };

    const handleAddItem = () => {
        if (!selectedProductId || itemQuantity <= 0 || !itemCost) return;
        const product = products.find(p => p.id === selectedProductId);
        if (!product) return;

        const newItem: PurchaseItem = {
            productId: product.id,
            productName: product.name,
            quantity: itemQuantity,
            unitCost: parseMoney(itemCost)
        };

        setItems([...items, newItem]);
        setSelectedProductId('');
        setItemQuantity(1);
        setItemCost('');
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    // Derived Financials
    const totalItemsCost = items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);
    const totalPurchaseCost = totalItemsCost + parseMoney(freightCost) + parseMoney(otherCost);

    const isCashBox = selectedAccountId === 'cash-box';
    const isBoletoAccount = selectedAccountId === 'boleto';
    // Boleto Mode is inferred if user selected Boleto account explicitly
    const isBoletoMode = isBoletoAccount;

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const selectedMethod = selectedAccount?.paymentMethods.find(m => (m.id || (m as any)._id) === selectedMethodId);
    
    // Credit Card logic
    const isCredit = !isCashBox && !isBoletoAccount && selectedMethod?.type === 'Credit';

    const boletoPreview = useMemo(() => {
        if (status !== TransactionStatus.PENDING || !isBoletoAccount || installments <= 1) return [];
        if (totalPurchaseCost <= 0) return [];

        const preview = [];
        const amountPerInstallment = totalPurchaseCost / installments;
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
    }, [status, isBoletoAccount, installments, totalPurchaseCost, dueDate]);

    const handleSubmit = () => {
        // Validation: Status must be selected
        if (status === '') {
            setStatusError(true);
            return;
        } else {
            setStatusError(false);
        }

        if (items.length === 0) { alert("Adicione pelo menos um item."); return; }
        if (!supplierName) { alert("Nome do fornecedor obrigatório."); return; }
        if (!supplierCnpj) { alert("CPF/CNPJ do fornecedor obrigatório."); return; }

        const isBoleto = selectedAccountId === 'boleto' && status === TransactionStatus.PENDING;
        const isBank = !isCashBox && !isBoletoMode;

        // Validation: If Paid via Bank, Method is mandatory
        if (status === TransactionStatus.PAID && isBank && !selectedMethodId) {
            setNotification({
                isOpen: true,
                type: 'error',
                message: 'Para pagamentos em Banco, é obrigatório selecionar o Método (Ex: Pix, Débito).'
            });
            return;
        }

        const payload = {
            items,
            supplierInfo: {
                name: supplierName,
                cnpjCpf: supplierCnpj,
                contactPerson: supplierContact,
                phone: supplierPhone
            },
            reference,
            freightCost: parseMoney(freightCost),
            otherCost: parseMoney(otherCost),
            totalCost: totalPurchaseCost,
            // Payment Data
            paymentDetails: {
                method: isBoleto ? PaymentMethod.BANK_SLIP : paymentMethod,
                financialAccountId: isBoleto ? undefined : selectedAccountId, // Don't send 'boleto' as account ID
                paymentMethodId: isBoleto ? undefined : selectedMethodId,
                paymentDate: status === TransactionStatus.PAID ? new Date(paymentDate) : null,
                installmentCount: isCredit ? installments : 1, // Pass this to backend logic for Credit Card
                installments: isBoleto ? boletoPreview.map(p => ({
                    installmentNumber: p.number,
                    amount: p.amount,
                    dueDate: p.date
                })) : []
            },
            status,
            paymentDate: status === TransactionStatus.PAID ? paymentDate : null,
            // Ensure proper due date logic: If Paid, Due Date matches Payment Date
            dueDate: status === TransactionStatus.PAID ? paymentDate : dueDate,
            installments: isCredit ? installments : 1
        };

        onSave(payload);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <NotificationModal 
                isOpen={notification.isOpen} 
                type={notification.type} 
                message={notification.message} 
                onClose={() => setNotification({ ...notification, isOpen: false })} 
            />
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {purchaseToEdit ? 'Editar Compra' : 'Nova Compra'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Supplier & Items */}
                    <div className="space-y-6">
                        {/* Supplier Info */}
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border dark:border-gray-700">
                            <h3 className="font-bold mb-3 text-gray-700 dark:text-gray-300">Fornecedor</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-xs font-medium">Razão Social / Nome</label>
                                    <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full rounded border p-1.5 text-sm bg-white dark:bg-gray-700 dark:border-gray-600" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium">CNPJ / CPF</label>
                                    <input type="text" value={supplierCnpj} onChange={e => setSupplierCnpj(formatRegister(e.target.value))} className="w-full rounded border p-1.5 text-sm bg-white dark:bg-gray-700 dark:border-gray-600" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium">Telefone</label>
                                    <input type="text" value={supplierPhone} onChange={e => setSupplierPhone(formatPhone(e.target.value))} className="w-full rounded border p-1.5 text-sm bg-white dark:bg-gray-700 dark:border-gray-600" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium">Contato (Pessoa)</label>
                                    <input type="text" value={supplierContact} onChange={e => setSupplierContact(e.target.value)} className="w-full rounded border p-1.5 text-sm bg-white dark:bg-gray-700 dark:border-gray-600" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium">Nº Nota / Ref.</label>
                                    <input type="text" value={reference} onChange={e => setReference(e.target.value)} className="w-full rounded border p-1.5 text-sm bg-white dark:bg-gray-700 dark:border-gray-600" />
                                </div>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border dark:border-gray-700">
                            <h3 className="font-bold mb-3 text-gray-700 dark:text-gray-300">Itens da Compra</h3>
                            <div className="flex flex-wrap gap-2 mb-3 items-end">
                                <div className="flex-1 min-w-[120px]">
                                    <label className="text-xs font-medium">Produto</label>
                                    <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full rounded border p-1.5 text-sm bg-white dark:bg-gray-700 dark:border-gray-600">
                                        <option value="">Selecione...</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="w-20">
                                    <label className="text-xs font-medium">Qtd</label>
                                    <input type="number" min="1" value={itemQuantity} onChange={e => setItemQuantity(parseInt(e.target.value))} className="w-full rounded border p-1.5 text-sm bg-white dark:bg-gray-700 dark:border-gray-600" />
                                </div>
                                <div className="w-24">
                                    <label className="text-xs font-medium">Custo Un.</label>
                                    <input type="text" value={itemCost} onChange={e => handleCurrencyChange(e.target.value, setItemCost)} className="w-full rounded border p-1.5 text-sm bg-white dark:bg-gray-700 dark:border-gray-600" placeholder="R$ 0,00" />
                                </div>
                                <button onClick={handleAddItem} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">+</button>
                            </div>

                            <div className="max-h-40 overflow-y-auto border rounded bg-white dark:bg-gray-800 dark:border-gray-600">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                                        <tr>
                                            <th className="p-2">Produto</th>
                                            <th className="p-2 text-right">Qtd</th>
                                            <th className="p-2 text-right">Custo</th>
                                            <th className="p-2 text-right">Total</th>
                                            <th className="p-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, idx) => (
                                            <tr key={idx} className="border-b dark:border-gray-700">
                                                <td className="p-2">{item.productName}</td>
                                                <td className="p-2 text-right">{item.quantity}</td>
                                                <td className="p-2 text-right">R$ {formatCurrencyNumber(item.unitCost)}</td>
                                                <td className="p-2 text-right">R$ {formatCurrencyNumber(item.quantity * item.unitCost)}</td>
                                                <td className="p-2 text-right"><button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">×</button></td>
                                            </tr>
                                        ))}
                                        {items.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">Nenhum item adicionado</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Financials & Payment */}
                    <div className="space-y-6">
                        {/* Costs Breakdown */}
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border dark:border-gray-700">
                            <h3 className="font-bold mb-3 text-gray-700 dark:text-gray-300">Custos Totais</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Soma dos Itens:</span>
                                    <span>R$ {formatCurrencyNumber(totalItemsCost)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Frete:</span>
                                    <input type="text" value={freightCost} onChange={e => handleCurrencyChange(e.target.value, setFreightCost)} className="w-24 text-right rounded border p-1 bg-white dark:bg-gray-700 dark:border-gray-600" placeholder="R$ 0,00" />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Outros:</span>
                                    <input type="text" value={otherCost} onChange={e => handleCurrencyChange(e.target.value, setOtherCost)} className="w-24 text-right rounded border p-1 bg-white dark:bg-gray-700 dark:border-gray-600" placeholder="R$ 0,00" />
                                </div>
                                <div className="flex justify-between text-lg font-bold border-t dark:border-gray-600 pt-2 mt-2">
                                    <span>Total Final:</span>
                                    <span className="text-indigo-600 dark:text-indigo-400">R$ {formatCurrencyNumber(totalPurchaseCost)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Config */}
                        <div className={`p-4 rounded-lg border ${statusError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800`}>
                            <h3 className="font-bold mb-3 text-gray-700 dark:text-gray-300">Pagamento</h3>
                            
                            <div className="mb-4">
                                <label className="block text-xs font-medium mb-1">Status</label>
                                <select 
                                    value={status} 
                                    onChange={e => {
                                        const newStatus = e.target.value as TransactionStatus | '';
                                        setStatus(newStatus);
                                        if(newStatus) setStatusError(false);
                                        // Auto-select cash if paid, or boleto if pending (optional UX)
                                        if (newStatus === TransactionStatus.PAID) setSelectedAccountId('cash-box');
                                        if (newStatus === TransactionStatus.PENDING) setSelectedAccountId('boleto');
                                        setSelectedMethodId('');
                                    }}
                                    className="w-full rounded border p-2 bg-white dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="">Selecione...</option>
                                    <option value={TransactionStatus.PAID}>Pago (À Vista/Pix)</option>
                                    <option value={TransactionStatus.PENDING}>Pendente (A Pagar/Boleto)</option>
                                </select>
                                {statusError && <p className="text-xs text-red-500 mt-1">Selecione um status.</p>}
                            </div>

                            {status !== '' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">
                                                {status === TransactionStatus.PAID ? 'Data Pagamento' : 'Vencimento (1ª)'}
                                            </label>
                                            <input 
                                                type="date" 
                                                value={status === TransactionStatus.PAID ? paymentDate : dueDate}
                                                onChange={e => status === TransactionStatus.PAID ? setPaymentDate(e.target.value) : setDueDate(e.target.value)}
                                                className="w-full rounded border p-2 bg-white dark:bg-gray-700 dark:border-gray-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Conta de Saída</label>
                                            <select 
                                                value={selectedAccountId} 
                                                onChange={e => { setSelectedAccountId(e.target.value); setSelectedMethodId(''); }}
                                                className="w-full rounded border p-2 bg-white dark:bg-gray-700 dark:border-gray-600"
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

                                    {/* Bank Method Selection (If Paid via Bank) */}
                                    {status === TransactionStatus.PAID && !isCashBox && (
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Método</label>
                                            <select 
                                                value={selectedMethodId} 
                                                onChange={e => setSelectedMethodId(e.target.value)}
                                                className="w-full rounded border p-2 bg-white dark:bg-gray-700 dark:border-gray-600"
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

                                    {/* Installments (Credit Card OR Pending Boleto) */}
                                    {(isCredit || (status === TransactionStatus.PENDING && isBoletoAccount)) && (
                                        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded border border-yellow-200 dark:border-yellow-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-xs font-bold text-yellow-800 dark:text-yellow-400">Parcelamento</label>
                                                <select 
                                                    value={installments} 
                                                    onChange={e => setInstallments(parseInt(e.target.value))}
                                                    className="w-20 p-1 rounded border text-sm"
                                                >
                                                    {Array.from({length: 12}, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}x</option>)}
                                                </select>
                                            </div>
                                            {isBoletoAccount && installments > 1 && (
                                                <div className="max-h-24 overflow-y-auto text-[10px]">
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
                                            {isCredit && <p className="text-[10px] text-gray-500">Lançado na fatura do cartão.</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3 sticky bottom-0">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-bold">Salvar Compra</button>
                </div>
            </div>
        </div>
    );
};

// Main Component
interface PurchasesProps {
    products: Product[];
    purchaseOrders: PurchaseOrder[];
    onAddPurchase: (purchaseData: any) => void;
    onUpdatePurchase: (purchase: PurchaseOrder) => void;
    onDeletePurchase: (purchaseId: string) => void;
}

const Purchases: React.FC<PurchasesProps> = ({ products, purchaseOrders, onAddPurchase, onUpdatePurchase, onDeletePurchase }) => {
    const { apiCall } = useContext(AuthContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<PurchaseOrder | null>(null);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

    useEffect(() => {
        const fetchAccounts = async () => {
            const data = await apiCall('financial', 'GET');
            if (data) setAccounts(data);
        };
        fetchAccounts();
    }, [apiCall, isModalOpen]); // Refresh accounts when modal opens

    const handleSavePurchase = (purchaseData: any) => {
        if (editingPurchase) {
            onUpdatePurchase({ ...editingPurchase, ...purchaseData });
        } else {
            onAddPurchase(purchaseData);
        }
        setIsModalOpen(false);
        setEditingPurchase(null);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Tem certeza? Isso reverterá o estoque e removerá as transações financeiras.")) {
            onDeletePurchase(id);
        }
    };

    return (
        <div className="container mx-auto">
            {isModalOpen && (
                <PurchaseModal 
                    purchaseToEdit={editingPurchase} 
                    products={products} 
                    accounts={accounts}
                    onClose={() => { setIsModalOpen(false); setEditingPurchase(null); }} 
                    onSave={handleSavePurchase} 
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Compras</h1>
                <button onClick={() => { setEditingPurchase(null); setIsModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md">
                    Nova Compra (Estoque)
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3">Data</th>
                                <th className="px-6 py-3">Fornecedor</th>
                                <th className="px-6 py-3">Ref. / Nota</th>
                                <th className="px-6 py-3 text-right">Total</th>
                                <th className="px-6 py-3">Status / Pagto</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchaseOrders.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-8">Nenhuma compra registrada.</td></tr>
                            ) : (
                                purchaseOrders.map(po => {
                                    // Status isn't direct field in PO usually, we infer or check payment details
                                    // Assuming logic: if paymentDetails.paymentDate exists => Paid
                                    const isPaid = po.paymentDetails && (('paymentDate' in po.paymentDetails && po.paymentDetails.paymentDate) || ('status' in po && (po as any).status === 'Pago'));
                                    
                                    return (
                                        <tr key={po.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <td className="px-6 py-4">{new Date(po.createdAt).toLocaleDateString('pt-BR')}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{po.supplierInfo.name}</td>
                                            <td className="px-6 py-4">{po.reference}</td>
                                            <td className="px-6 py-4 text-right font-bold text-red-600 dark:text-red-400">
                                                R$ {formatCurrencyNumber(po.totalCost)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {isPaid ? 'PAGO' : 'PENDENTE'}
                                                </span>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {po.paymentDetails.method}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-3">
                                                <button onClick={() => { setEditingPurchase(po); setIsModalOpen(true); }} className="text-indigo-600 hover:underline">Editar</button>
                                                <button onClick={() => handleDelete(po.id)} className="text-red-600 hover:underline">Excluir</button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Purchases;
