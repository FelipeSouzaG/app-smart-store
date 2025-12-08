
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { PurchaseOrder, Product, PaymentMethod, FinancialAccount, PurchaseItem, Bank, TransactionStatus } from '../types';
import { formatCurrencyNumber, formatMoney, formatRegister, formatPhone } from '../validation';
import { AuthContext } from '../contexts/AuthContext';

// --- PurchaseModal Component ---
interface PurchaseModalProps {
    products: Product[];
    purchaseToEdit?: PurchaseOrder | null;
    onClose: () => void;
    onSave: (purchaseData: any) => void;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ products, purchaseToEdit, onClose, onSave }) => {
    const { apiCall } = useContext(AuthContext);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    
    // Supplier Info
    const [supplierName, setSupplierName] = useState('');
    const [supplierCnpj, setSupplierCnpj] = useState('');
    const [supplierContact, setSupplierContact] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [reference, setReference] = useState('');

    // Items
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [quantity, setQuantity] = useState(1);
    const [unitCost, setUnitCost] = useState('');

    // Costs
    const [freightCost, setFreightCost] = useState('');
    const [otherCost, setOtherCost] = useState('');

    // Payment
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]); // Used if pending or bank slip
    const [selectedAccountId, setSelectedAccountId] = useState('cash-box');
    const [selectedMethodId, setSelectedMethodId] = useState('');
    const [installments, setInstallments] = useState(1);
    const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.PAID);

    useEffect(() => {
        const fetchAccounts = async () => {
            const data = await apiCall('financial', 'GET');
            if (data) setAccounts(data);
        };
        fetchAccounts();
    }, [apiCall]);

    useEffect(() => {
        if (purchaseToEdit) {
            setSupplierName(purchaseToEdit.supplierInfo.name);
            setSupplierCnpj(purchaseToEdit.supplierInfo.cnpjCpf);
            setSupplierContact(purchaseToEdit.supplierInfo.contactPerson || '');
            setSupplierPhone(purchaseToEdit.supplierInfo.phone);
            setReference(purchaseToEdit.reference);
            setItems(purchaseToEdit.items);
            setFreightCost(formatMoney((purchaseToEdit.freightCost * 100).toFixed(0)));
            setOtherCost(formatMoney((purchaseToEdit.otherCost * 100).toFixed(0)));
            
            // Map payment details
            const pd = purchaseToEdit.paymentDetails as any;
            if (pd.financialAccountId === 'cash-box') {
                setSelectedAccountId('cash-box');
            } else if (pd.financialAccountId) {
                setSelectedAccountId(pd.financialAccountId);
                setSelectedMethodId(pd.paymentMethodId || '');
            }
            if (pd.method) setPaymentMethod(pd.method);
            
            // Try to set dates if available
            // Note: PurchaseOrder type might be simpler in frontend vs backend, assuming backend structure:
            // For editing, we might simplify or just allow editing non-financial fields if complicated.
            // For now, we populate what we can.
        }
    }, [purchaseToEdit]);

    const handleAddItem = () => {
        if (!selectedProduct || quantity <= 0) return;
        const prod = products.find(p => p.id === selectedProduct);
        if (!prod) return;

        const numericCost = parseFloat(unitCost.replace('R$ ', '').replace(/\./g, '').replace(',', '.')) || 0;

        const newItem: PurchaseItem = {
            productId: prod.id,
            productName: prod.name,
            quantity: quantity,
            unitCost: numericCost
        };

        setItems([...items, newItem]);
        setSelectedProduct('');
        setQuantity(1);
        setUnitCost('');
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const parseMoney = (val: string) => parseFloat(val.replace('R$ ', '').replace(/\./g, '').replace(',', '.')) || 0;

    const totalItemsCost = items.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
    const totalPurchaseCost = totalItemsCost + parseMoney(freightCost) + parseMoney(otherCost);

    const handleSubmit = () => {
        if (items.length === 0) return alert("Adicione pelo menos um item.");
        if (!supplierName) return alert("Nome do fornecedor obrigatório.");

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
            // Payment Data structure expected by backend
            paymentDetails: {
                method: paymentMethod,
                financialAccountId: selectedAccountId,
                paymentMethodId: selectedMethodId,
                paymentDate: status === TransactionStatus.PAID ? new Date(paymentDate) : null,
                installments: [] // Should be handled if method is Bank Slip or Credit
            },
            status, // Pass status explicitly
            paymentDate: status === TransactionStatus.PAID ? paymentDate : null,
            dueDate: dueDate,
            installments: installments // for Credit Card logic
        };

        onSave(payload);
    };

    // Helper for accounts
    const isCashBox = selectedAccountId === 'cash-box';
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const availableMethods = selectedAccount?.paymentMethods || [];
    const isCredit = availableMethods.find(m => (m.id || (m as any)._id) === selectedMethodId)?.type === 'Credit';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {purchaseToEdit ? 'Editar Compra' : 'Nova Compra'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Supplier Info */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 pb-2">Fornecedor</h3>
                        <div>
                            <label className="block text-sm font-medium mb-1">Nome / Razão Social</label>
                            <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-medium mb-1">CPF/CNPJ</label>
                                <input type="text" value={supplierCnpj} onChange={e => setSupplierCnpj(formatRegister(e.target.value))} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Telefone</label>
                                <input type="text" value={supplierPhone} onChange={e => setSupplierPhone(formatPhone(e.target.value))} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Ref. Externa (NFe/Pedido)</label>
                            <input type="text" value={reference} onChange={e => setReference(e.target.value)} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 pb-2">Pagamento</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-medium mb-1">Status</label>
                                <select 
                                    value={status} 
                                    onChange={e => setStatus(e.target.value as TransactionStatus)} 
                                    className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600"
                                >
                                    <option value={TransactionStatus.PAID}>Pago</option>
                                    <option value={TransactionStatus.PENDING}>Pendente</option>
                                </select>
                            </div>
                            {status === TransactionStatus.PENDING ? (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Vencimento</label>
                                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Data Pagto.</label>
                                    <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Conta de Saída</label>
                            <select value={selectedAccountId} onChange={e => { setSelectedAccountId(e.target.value); setSelectedMethodId(''); }} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                                <option value="cash-box">Dinheiro do Caixa</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.bankName}</option>)}
                            </select>
                        </div>

                        {!isCashBox && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Método</label>
                                <select value={selectedMethodId} onChange={e => setSelectedMethodId(e.target.value)} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                                    <option value="">Selecione...</option>
                                    {availableMethods.map(m => (
                                        <option key={m.id || (m as any)._id} value={m.id || (m as any)._id}>{m.name} ({m.type})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {isCredit && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Parcelas</label>
                                <select value={installments} onChange={e => setInstallments(Number(e.target.value))} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                                    {Array.from({length: 12}, (_, i) => i+1).map(n => <option key={n} value={n}>{n}x</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Items Section */}
                <div className="mb-6">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 pb-2 mb-4">Itens da Compra</h3>
                    <div className="flex gap-2 mb-4 items-end flex-wrap">
                        <div className="flex-grow min-w-[200px]">
                            <label className="block text-sm font-medium mb-1">Produto</label>
                            <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                                <option value="">Selecione um produto...</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name} (Estoque: {p.stock})</option>)}
                            </select>
                        </div>
                        <div className="w-24">
                            <label className="block text-sm font-medium mb-1">Qtd.</label>
                            <input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
                        </div>
                        <div className="w-32">
                            <label className="block text-sm font-medium mb-1">Custo Unit.</label>
                            <input type="text" value={unitCost} onChange={e => setUnitCost(formatMoney(e.target.value))} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" placeholder="R$ 0,00" />
                        </div>
                        <button onClick={handleAddItem} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                <tr>
                                    <th className="px-4 py-2">Produto</th>
                                    <th className="px-4 py-2">Qtd</th>
                                    <th className="px-4 py-2">Custo Unit.</th>
                                    <th className="px-4 py-2">Total</th>
                                    <th className="px-4 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx} className="border-t dark:border-gray-600">
                                        <td className="px-4 py-2">{item.productName}</td>
                                        <td className="px-4 py-2">{item.quantity}</td>
                                        <td className="px-4 py-2">R$ {formatCurrencyNumber(item.unitCost)}</td>
                                        <td className="px-4 py-2">R$ {formatCurrencyNumber(item.unitCost * item.quantity)}</td>
                                        <td className="px-4 py-2 text-right">
                                            <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">&times;</button>
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && <tr><td colSpan={5} className="text-center py-4 text-gray-500">Nenhum item adicionado.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Totals */}
                <div className="flex flex-col md:flex-row justify-between items-end border-t dark:border-gray-700 pt-4 gap-4">
                    <div className="flex gap-4">
                        <div>
                            <label className="block text-xs font-medium mb-1">Frete (R$)</label>
                            <input type="text" value={freightCost} onChange={e => setFreightCost(formatMoney(e.target.value))} className="w-24 p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">Outros (R$)</label>
                            <input type="text" value={otherCost} onChange={e => setOtherCost(formatMoney(e.target.value))} className="w-24 p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm" />
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Total da Compra</p>
                        <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">R$ {formatCurrencyNumber(totalPurchaseCost)}</p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-gray-700">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded">Cancelar</button>
                    <button onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700">Salvar Compra</button>
                </div>
            </div>
        </div>
    );
};

const ConfirmationModal: React.FC<{ message: string; onConfirm: () => void; onCancel: () => void }> = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
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

// --- Main Component ---

interface PurchasesProps {
    products: Product[];
    purchaseOrders: PurchaseOrder[];
    onAddPurchase: (purchase: any) => Promise<void>;
    onUpdatePurchase: (purchase: PurchaseOrder) => Promise<void>;
    onDeletePurchase: (id: string) => Promise<void>;
}

const Purchases: React.FC<PurchasesProps> = ({ products, purchaseOrders, onAddPurchase, onUpdatePurchase, onDeletePurchase }) => {
    const { apiCall } = useContext(AuthContext);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    
    // Filter/Pagination state
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 15;

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<PurchaseOrder | null>(null);
    const [deletingPurchaseId, setDeletingPurchaseId] = useState<string | null>(null);

    useEffect(() => {
        const fetchAccounts = async () => {
            const data = await apiCall('financial', 'GET');
            if (data) setAccounts(data);
        };
        fetchAccounts();
    }, [apiCall]);

    // Helpers
    const getPaymentLabel = (pd: any) => {
        if (pd.financialAccountId === 'cash-box') return 'Dinheiro do Caixa';
        
        if (pd.financialAccountId) {
            const acc = accounts.find(a => a.id === pd.financialAccountId);
            if (acc) {
                const method = acc.paymentMethods.find(m => (m.id || (m as any)._id) === pd.paymentMethodId);
                if (method) return `${acc.bankName} - ${method.name}`;
                return acc.bankName;
            }
        }
        if (pd.method === PaymentMethod.BANK_SLIP) return 'Boleto (Pendente)';
        return pd.method;
    };

    const getBadgeStyle = (pd: any) => {
        if (pd.financialAccountId) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        if (pd.method === PaymentMethod.BANK_SLIP) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    };

    // Filter Logic
    const filteredAndSortedPurchases = useMemo(() => {
        return purchaseOrders.filter(po => {
            const poDate = new Date(po.createdAt);
            if (startDate && poDate < new Date(startDate)) return false;
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (poDate > end) return false;
            }
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return (
                    po.supplierInfo.name.toLowerCase().includes(term) ||
                    (po.reference && po.reference.toLowerCase().includes(term))
                );
            }
            return true;
        }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [purchaseOrders, searchTerm, startDate, endDate]);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, startDate, endDate]);

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredAndSortedPurchases.slice(indexOfFirstRecord, indexOfLastRecord);
    const nPages = Math.ceil(filteredAndSortedPurchases.length / recordsPerPage);

    const nextPage = () => { if (currentPage < nPages) setCurrentPage(currentPage + 1); };
    const prevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

    // Handlers
    const handleOpenCreateModal = () => {
        setEditingPurchase(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (purchase: PurchaseOrder) => {
        setEditingPurchase(purchase);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPurchase(null);
    };

    const handleSave = async (purchaseData: any) => {
        if (editingPurchase) {
            await onUpdatePurchase({ ...editingPurchase, ...purchaseData });
        } else {
            await onAddPurchase(purchaseData);
        }
        handleCloseModal();
    };

    const handleDeleteRequest = (id: string) => setDeletingPurchaseId(id);
    const handleDeleteConfirm = async () => {
        if (deletingPurchaseId) await onDeletePurchase(deletingPurchaseId);
        setDeletingPurchaseId(null);
    };

    return (
        <div className="container mx-auto">
            {isModalOpen && <PurchaseModal 
                products={products}
                purchaseToEdit={editingPurchase}
                onClose={handleCloseModal}
                onSave={handleSave} 
            />}

            {deletingPurchaseId && (
                <ConfirmationModal 
                    message="Tem certeza que deseja excluir esta compra? Esta ação irá reverter o estoque e remover as transações financeiras associadas."
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeletingPurchaseId(null)}
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Compras</h1>
                <button onClick={handleOpenCreateModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Incluir Compra</button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg mb-6 flex flex-wrap items-end gap-4">
                <div className="flex-grow min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar</label>
                    <input
                        type="text"
                        placeholder="Fornecedor, Referência..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Inicial</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Final</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">ID</th>
                                <th scope="col" className="px-6 py-3">Data</th>
                                <th scope="col" className="px-6 py-3">Fornecedor</th>
                                <th scope="col" className="px-6 py-3">Referência</th>
                                <th scope="col" className="px-6 py-3">Itens</th>
                                <th scope="col" className="px-6 py-3">Custo Total</th>
                                <th scope="col" className="px-6 py-3">Forma de Pagamento</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                             {filteredAndSortedPurchases.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-gray-500">
                                        {purchaseOrders.length === 0 ? "Nenhuma compra registrada." : "Nenhum resultado encontrado para os filtros aplicados."}
                                    </td>
                                </tr>
                            ) : (
                                currentRecords.map(po => (
                                <tr key={po.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{po.id}</td>
                                    <td className="px-6 py-4">{new Date(po.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                                    <td className="px-6 py-4">{po.supplierInfo?.name || 'N/A'}</td>
                                    <td className="px-6 py-4">{po.reference || 'N/A'}</td>
                                    <td className="px-6 py-4">{po.items.length}</td>
                                    <td className="px-6 py-4">R$ {formatCurrencyNumber(po.totalCost)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getBadgeStyle(po.paymentDetails)}`}>
                                            {getPaymentLabel(po.paymentDetails)}
                                        </span>
                                    </td>
                                     <td className="px-6 py-4 whitespace-nowrap">
                                        <button onClick={() => handleOpenEditModal(po)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline mr-4">Editar</button>
                                        <button onClick={() => handleDeleteRequest(po.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Excluir</button>
                                    </td>
                                </tr>
                            )))}
                        </tbody>
                    </table>
                </div>
                {nPages > 1 && (
                    <div className="p-4 flex justify-between items-center flex-wrap gap-2">
                         <span className="text-sm text-gray-700 dark:text-gray-400">
                            Página {currentPage} de {nPages} ({filteredAndSortedPurchases.length} registros)
                        </span>
                        <div className="flex space-x-2">
                            <button onClick={prevPage} disabled={currentPage === 1} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Anterior</button>
                            <button onClick={nextPage} disabled={currentPage === nPages} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Próximo</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Purchases;
