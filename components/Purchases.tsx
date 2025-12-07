
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { PurchaseOrder, Product, Supplier, PurchaseItem, PaymentMethod, FinancialAccount, TransactionStatus } from '../types';
import { formatCurrencyNumber, formatMoney, formatRegister, formatPhone, formatName } from '../validation';
import { AuthContext } from '../contexts/AuthContext';

interface PurchaseModalProps {
    products: Product[];
    suppliers: Supplier[];
    accounts: FinancialAccount[];
    purchaseToEdit?: PurchaseOrder | null;
    onClose: () => void;
    onSave: (data: any) => void;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ products, suppliers, accounts, purchaseToEdit, onClose, onSave }) => {
    // Supplier Info
    const [supplierName, setSupplierName] = useState('');
    const [supplierDoc, setSupplierDoc] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [supplierContact, setSupplierContact] = useState('');
    
    // Items
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [itemQty, setItemQty] = useState(1);
    const [itemCost, setItemCost] = useState('');
    
    // Costs
    const [freightCost, setFreightCost] = useState('');
    const [otherCost, setOtherCost] = useState('');
    const [reference, setReference] = useState('');

    // Payment
    const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.PENDING);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountId, setAccountId] = useState('');
    const [methodId, setMethodId] = useState('');
    const [installments, setInstallments] = useState(1);

    // Search
    const [productSearch, setProductSearch] = useState('');
    const [supplierSearch, setSupplierSearch] = useState('');
    const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);

    useEffect(() => {
        if (purchaseToEdit) {
            setSupplierName(purchaseToEdit.supplierInfo.name);
            setSupplierDoc(formatRegister(purchaseToEdit.supplierInfo.cnpjCpf));
            setSupplierPhone(formatPhone(purchaseToEdit.supplierInfo.phone));
            setSupplierContact(purchaseToEdit.supplierInfo.contactPerson || '');
            
            setItems(purchaseToEdit.items);
            setFreightCost(formatMoney((purchaseToEdit.freightCost * 100).toFixed(0)));
            setOtherCost(formatMoney((purchaseToEdit.otherCost * 100).toFixed(0)));
            setReference(purchaseToEdit.reference || '');

            // Payment restoration would depend on how backend returns details. 
            // Simplified for this view:
            if ((purchaseToEdit.paymentDetails as any).financialAccountId) {
                setStatus(TransactionStatus.PAID);
                setAccountId((purchaseToEdit.paymentDetails as any).financialAccountId);
                setMethodId((purchaseToEdit.paymentDetails as any).paymentMethodId || '');
            }
        }
    }, [purchaseToEdit]);

    const handleCurrencyChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        if (value === '' || value === 'R$ ') { setter(''); return; }
        setter(formatMoney(value));
    };

    const parseCurrency = (value: string) => {
        if (!value) return 0;
        return parseFloat(value.replace('R$ ', '').replace(/\./g, '').replace(',', '.')) || 0;
    };

    const handleAddItem = () => {
        if (!selectedProductId) return;
        const product = products.find(p => p.id === selectedProductId);
        if (!product) return;

        const cost = parseCurrency(itemCost);
        if (cost <= 0) return alert('Custo deve ser maior que zero');

        const newItem: PurchaseItem = {
            productId: product.id,
            productName: product.name,
            quantity: itemQty,
            unitCost: cost
        };

        setItems([...items, newItem]);
        setSelectedProductId('');
        setProductSearch('');
        setItemQty(1);
        setItemCost('');
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const filteredProducts = useMemo(() => {
        if (!productSearch) return [];
        return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.barcode.includes(productSearch));
    }, [products, productSearch]);

    const filteredSuppliers = useMemo(() => {
        if (!supplierSearch) return [];
        return suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()));
    }, [suppliers, supplierSearch]);

    const selectSupplier = (s: Supplier) => {
        setSupplierName(s.name);
        setSupplierDoc(formatRegister(s.cnpjCpf));
        setSupplierPhone(formatPhone(s.phone));
        setSupplierContact(s.contactPerson || '');
        setSupplierSearch('');
        setShowSupplierSuggestions(false);
    };

    const totalItemsCost = items.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
    const totalOrderCost = totalItemsCost + parseCurrency(freightCost) + parseCurrency(otherCost);

    const selectedAccount = accounts.find(a => a.id === accountId);
    const isCredit = selectedAccount?.paymentMethods.find(m => (m.id || (m as any)._id) === methodId)?.type === 'Credit';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) return alert('Adicione pelo menos um item');
        if (!supplierName) return alert('Nome do fornecedor obrigatório');

        const paymentDetails: any = {
            method: 'Outros', // Default fallback
            financialAccountId: accountId || undefined,
            paymentMethodId: methodId || undefined,
            paymentDate: status === TransactionStatus.PAID ? new Date(paymentDate) : undefined,
            installments: isCredit ? installments : undefined,
            installmentCount: isCredit ? installments : undefined
        };

        const payload = {
            ...purchaseToEdit,
            items,
            supplierInfo: {
                name: supplierName,
                cnpjCpf: supplierDoc,
                phone: supplierPhone,
                contactPerson: supplierContact
            },
            freightCost: parseCurrency(freightCost),
            otherCost: parseCurrency(otherCost),
            totalCost: totalOrderCost,
            reference: reference || `Auto-${Date.now()}`,
            status,
            paymentDate: status === TransactionStatus.PAID ? paymentDate : undefined,
            dueDate: dueDate,
            paymentDetails
        };

        onSave(payload);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold dark:text-white">{purchaseToEdit ? 'Editar Compra' : 'Nova Compra'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Supplier Section */}
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <h3 className="font-bold mb-3 text-indigo-600 dark:text-indigo-400">Fornecedor</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <label className="block text-xs font-bold uppercase mb-1">Nome / Busca</label>
                                <input 
                                    type="text" 
                                    value={supplierName} 
                                    onChange={e => { setSupplierName(e.target.value); setSupplierSearch(e.target.value); setShowSupplierSuggestions(true); }}
                                    onBlur={() => setTimeout(() => setShowSupplierSuggestions(false), 200)}
                                    className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="Digite para buscar..."
                                />
                                {showSupplierSuggestions && filteredSuppliers.length > 0 && (
                                    <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border dark:border-gray-600 mt-1 max-h-40 overflow-y-auto shadow-lg rounded-md">
                                        {filteredSuppliers.map(s => (
                                            <li key={s.id} onClick={() => selectSupplier(s)} className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900 cursor-pointer text-sm">
                                                {s.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">CNPJ/CPF</label>
                                <input type="text" value={supplierDoc} onChange={e => setSupplierDoc(formatRegister(e.target.value))} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Telefone</label>
                                <input type="text" value={supplierPhone} onChange={e => setSupplierPhone(formatPhone(e.target.value))} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Ref. Externa (NFe)</label>
                                <input type="text" value={reference} onChange={e => setReference(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"/>
                            </div>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-indigo-600 dark:text-indigo-400">Itens da Compra</h3>
                        <div className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                            <div className="flex-grow relative min-w-[200px]">
                                <label className="block text-xs font-bold uppercase mb-1">Produto</label>
                                <input 
                                    type="text" 
                                    value={productSearch} 
                                    onChange={e => { setProductSearch(e.target.value); setSelectedProductId(''); }}
                                    className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="Buscar produto..."
                                />
                                {productSearch && !selectedProductId && filteredProducts.length > 0 && (
                                    <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border dark:border-gray-600 mt-1 max-h-40 overflow-y-auto shadow-lg rounded-md">
                                        {filteredProducts.map(p => (
                                            <li key={p.id} onClick={() => { setSelectedProductId(p.id); setProductSearch(p.name); }} className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900 cursor-pointer text-sm">
                                                {p.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="w-20">
                                <label className="block text-xs font-bold uppercase mb-1">Qtd</label>
                                <input type="number" min="1" value={itemQty} onChange={e => setItemQty(parseInt(e.target.value) || 1)} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"/>
                            </div>
                            <div className="w-32">
                                <label className="block text-xs font-bold uppercase mb-1">Custo Un.</label>
                                <input type="text" value={itemCost} onChange={e => handleCurrencyChange(e.target.value, setItemCost)} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"/>
                            </div>
                            <button onClick={handleAddItem} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold">Add</button>
                        </div>

                        <div className="border rounded-lg overflow-hidden dark:border-gray-600">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 dark:bg-gray-700">
                                    <tr>
                                        <th className="p-2">Produto</th>
                                        <th className="p-2">Qtd</th>
                                        <th className="p-2">Custo Un.</th>
                                        <th className="p-2">Total</th>
                                        <th className="p-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => (
                                        <tr key={idx} className="border-b dark:border-gray-700">
                                            <td className="p-2">{item.productName}</td>
                                            <td className="p-2">{item.quantity}</td>
                                            <td className="p-2">R$ {formatCurrencyNumber(item.unitCost)}</td>
                                            <td className="p-2">R$ {formatCurrencyNumber(item.quantity * item.unitCost)}</td>
                                            <td className="p-2 text-right">
                                                <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">✕</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {items.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">Nenhum item adicionado</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Financials */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t dark:border-gray-700">
                        <div className="space-y-4">
                            <h3 className="font-bold text-indigo-600 dark:text-indigo-400">Custos Adicionais</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Frete</label>
                                    <input type="text" value={freightCost} onChange={e => handleCurrencyChange(e.target.value, setFreightCost)} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Outros</label>
                                    <input type="text" value={otherCost} onChange={e => handleCurrencyChange(e.target.value, setOtherCost)} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"/>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-right">
                                <p className="text-sm text-gray-500">Total da Compra</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">R$ {formatCurrencyNumber(totalOrderCost)}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-bold text-indigo-600 dark:text-indigo-400">Pagamento</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Status</label>
                                    <select value={status} onChange={e => setStatus(e.target.value as TransactionStatus)} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600">
                                        <option value={TransactionStatus.PENDING}>Pendente</option>
                                        <option value={TransactionStatus.PAID}>Pago</option>
                                    </select>
                                </div>
                                {status === TransactionStatus.PAID ? (
                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-1">Data Pagamento</label>
                                        <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"/>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-1">Vencimento</label>
                                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"/>
                                    </div>
                                )}
                            </div>

                            {status === TransactionStatus.PAID && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-1">Conta de Saída</label>
                                        <select value={accountId} onChange={e => { setAccountId(e.target.value); setMethodId(''); }} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 text-sm">
                                            <option value="">Selecione...</option>
                                            <option value="cash-box">Caixa (Dinheiro)</option>
                                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.bankName}</option>)}
                                        </select>
                                    </div>
                                    {accountId && accountId !== 'cash-box' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase mb-1">Método</label>
                                                <select value={methodId} onChange={e => setMethodId(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 text-sm">
                                                    <option value="">Selecione...</option>
                                                    {selectedAccount?.paymentMethods.map(m => (
                                                        <option key={m.id || (m as any)._id} value={m.id || (m as any)._id}>{m.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {isCredit && (
                                                <div>
                                                    <label className="block text-xs font-bold uppercase mb-1">Parcelas</label>
                                                    <input type="number" min="1" value={installments} onChange={e => setInstallments(parseInt(e.target.value))} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"/>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900">
                    <button onClick={onClose} className="px-6 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleSubmit} className="px-6 py-2 rounded bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg">Salvar Compra</button>
                </div>
            </div>
        </div>
    );
};

interface PurchasesProps {
    products: Product[];
    purchaseOrders: PurchaseOrder[];
    suppliers?: Supplier[];
    onAddPurchase: (data: any) => Promise<void>;
    onUpdatePurchase: (data: PurchaseOrder) => Promise<void>;
    onDeletePurchase: (id: string) => Promise<void>;
}

const Purchases: React.FC<PurchasesProps> = ({ products, purchaseOrders, suppliers = [], onAddPurchase, onUpdatePurchase, onDeletePurchase }) => {
    const { apiCall } = useContext(AuthContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<PurchaseOrder | null>(null);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

    useEffect(() => {
        const fetchAccounts = async () => {
            const data = await apiCall('financial', 'GET');
            if (data) setAccounts(data);
        };
        if (isModalOpen) fetchAccounts();
    }, [isModalOpen, apiCall]);

    const handleOpenCreateModal = () => {
        setEditingPurchase(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (purchase: PurchaseOrder) => {
        setEditingPurchase(purchase);
        setIsModalOpen(true);
    };

    const handleSavePurchase = async (data: any) => {
        if (editingPurchase) {
            await onUpdatePurchase(data);
        } else {
            await onAddPurchase(data);
        }
        setIsModalOpen(false);
        setEditingPurchase(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza? Isso reverterá o estoque e cancelará transações financeiras.')) {
            await onDeletePurchase(id);
        }
    };

    const filteredPurchases = useMemo(() => {
        return purchaseOrders.filter(po => 
            po.supplierInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            po.reference.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [purchaseOrders, searchTerm]);

    // Helper for labels in table
    const getPaymentLabel = (details: any) => {
        if (!details) return '-';
        if ((details as any).financialAccountId) return 'Pago';
        if (details.method === PaymentMethod.BANK_SLIP) return 'Boleto (Pend)';
        return details.method || '-';
    };

    return (
        <div className="container mx-auto">
            {isModalOpen && (
                <PurchaseModal 
                    products={products} 
                    suppliers={suppliers} 
                    accounts={accounts}
                    purchaseToEdit={editingPurchase} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={handleSavePurchase} 
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Compras e Estoque</h1>
                <button onClick={handleOpenCreateModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md">Nova Compra</button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg mb-6">
                <input
                    type="text"
                    placeholder="Buscar por Fornecedor ou Referência..."
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
                                <th scope="col" className="px-6 py-3">Data</th>
                                <th scope="col" className="px-6 py-3">Fornecedor</th>
                                <th scope="col" className="px-6 py-3">Referência</th>
                                <th scope="col" className="px-6 py-3">Itens</th>
                                <th scope="col" className="px-6 py-3">Total</th>
                                <th scope="col" className="px-6 py-3">Status Pagto</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPurchases.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-8 text-gray-500">Nenhuma compra registrada.</td></tr>
                            ) : (
                                filteredPurchases.map(po => (
                                    <tr key={po.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4">{new Date(po.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{po.supplierInfo.name}</td>
                                        <td className="px-6 py-4">{po.reference}</td>
                                        <td className="px-6 py-4">{po.items.length}</td>
                                        <td className="px-6 py-4 font-bold">R$ {formatCurrencyNumber(po.totalCost)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                                ((po.paymentDetails as any).financialAccountId || po.paymentDetails.paymentDate) 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {getPaymentLabel(po.paymentDetails)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button onClick={() => handleOpenEditModal(po)} className="text-indigo-600 hover:underline mr-4 font-medium">Editar</button>
                                            <button onClick={() => handleDelete(po.id)} className="text-red-600 hover:underline font-medium">Excluir</button>
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

export default Purchases;
