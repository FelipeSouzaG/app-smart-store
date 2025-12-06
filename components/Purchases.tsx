
import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { PurchaseOrder, Product, PurchaseItem, TransactionStatus, FinancialAccount, PaymentMethod } from '../types';
import { AuthContext } from '../contexts/AuthContext';
import { formatCurrencyNumber, formatMoney } from '../validation';

declare global { interface Window { ZXing: any; } }
const ScannerModal: React.FC<{ onClose: () => void; onScan: (code: string) => void }> = ({ onClose, onScan }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string>('');
    useEffect(() => {
        const codeReader = new window.ZXing.BrowserMultiFormatReader();
        const startScanning = async () => {
            try {
                await codeReader.decodeFromVideoDevice(undefined, videoRef.current, (result: any, err: any) => {
                    if (result) { if (navigator.vibrate) navigator.vibrate(200); onScan(result.getText()); codeReader.reset(); }
                });
            } catch (err) { setError("Erro ao iniciar a câmera."); }
        };
        startScanning();
        return () => { codeReader.reset(); };
    }, [onScan]);
    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[100]">
            <div className="relative w-full max-w-lg p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                    <div className="p-4 text-center"><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scanner</h3></div>
                    <div className="relative aspect-[4/3] bg-black"><video ref={videoRef} className="w-full h-full object-cover" style={{ transform: 'scaleX(1)' }} /></div>
                    {error && <p className="text-center text-red-500 p-2 text-sm">{error}</p>}
                    <div className="p-4"><button onClick={onClose} className="w-full py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold rounded-lg">Cancelar</button></div>
                </div>
            </div>
        </div>
    );
};

interface PurchaseModalProps {
    products: Product[];
    purchaseToEdit?: PurchaseOrder | null;
    onClose: () => void;
    onSave: (purchaseData: any) => Promise<void>;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ products, purchaseToEdit, onClose, onSave }) => {
    const { apiCall } = useContext(AuthContext);
    const [items, setItems] = useState<PurchaseItem[]>([]);
    
    const [supplierName, setSupplierName] = useState('');
    const [supplierCnpj, setSupplierCnpj] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [supplierContact, setSupplierContact] = useState('');
    const [reference, setReference] = useState('');

    const [freightCost, setFreightCost] = useState('');
    const [otherCost, setOtherCost] = useState('');

    const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.PENDING);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]); 
    const [dueDate, setDueDate] = useState(''); 
    
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [selectedMethodId, setSelectedMethodId] = useState('');
    const [installmentsCount, setInstallmentsCount] = useState(1);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [unitCost, setUnitCost] = useState('');
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchAccounts = async () => {
            const data = await apiCall('financial', 'GET');
            if (data) setAccounts(data);
        };
        fetchAccounts();
    }, []);

    useEffect(() => {
        if (purchaseToEdit) {
            setItems(purchaseToEdit.items);
            setSupplierName(purchaseToEdit.supplierInfo.name);
            setSupplierCnpj(purchaseToEdit.supplierInfo.cnpjCpf);
            setSupplierPhone(purchaseToEdit.supplierInfo.phone);
            setSupplierContact(purchaseToEdit.supplierInfo.contactPerson || '');
            setReference(purchaseToEdit.reference);
            setFreightCost(formatMoney((purchaseToEdit.freightCost * 100).toFixed(0)));
            setOtherCost(formatMoney((purchaseToEdit.otherCost * 100).toFixed(0)));
        }
    }, [purchaseToEdit]);

    const handleCurrencyChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        if (value === '' || value === 'R$ ') { setter(''); return; }
        setter(formatMoney(value));
    };

    const parseCurrency = (value: string): number => {
        if (!value) return 0;
        const numericString = value.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
        return parseFloat(numericString) || 0;
    };

    const handleAddItem = () => {
        if (!selectedProduct || quantity <= 0 || !unitCost) {
            alert('Selecione produto, quantidade e custo.');
            return;
        }
        const newItem: PurchaseItem = {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            quantity: quantity,
            unitCost: parseCurrency(unitCost)
        };
        setItems([...items, newItem]);
        setSelectedProduct(null);
        setSearchTerm('');
        setQuantity(1);
        setUnitCost('');
    };

    const handleScan = (code: string) => {
        setIsScannerOpen(false);
        const product = products.find(p => p.barcode === code);
        if (product) {
            setSelectedProduct(product);
            setSearchTerm(product.name);
        } else {
            alert('Produto não encontrado.');
        }
    };

    const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0) + parseCurrency(freightCost) + parseCurrency(otherCost);

    const isCashBox = selectedAccountId === 'cash-box';
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const selectedMethod = selectedAccount?.paymentMethods.find(m => (m.id || (m as any)._id) === selectedMethodId);
    const isCreditCard = !isCashBox && selectedMethod?.type === 'Credit';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (items.length === 0) { setError('Adicione itens.'); return; }
        if (!supplierName) { setError('Nome do fornecedor obrigatório.'); return; }
        
        if (status === TransactionStatus.PAID) {
            if (!selectedAccountId) { setError('Selecione conta de pagamento.'); return; }
            if (!isCashBox && !selectedMethodId) { setError('Selecione método de pagamento.'); return; }
            
            if (!isCreditCard) {
                if (!paymentDate) { setError('Data do pagamento obrigatória.'); return; }
            }
        }

        setIsSaving(true);
        try {
            const payload: any = {
                items,
                supplierInfo: { name: supplierName, cnpjCpf: supplierCnpj, phone: supplierPhone, contactPerson: supplierContact },
                reference,
                freightCost: parseCurrency(freightCost),
                otherCost: parseCurrency(otherCost),
                totalCost,
                status,
                paymentDate: status === TransactionStatus.PAID ? paymentDate : undefined,
                dueDate: status === TransactionStatus.PENDING ? dueDate : undefined,
                paymentDetails: {
                    method: isCashBox ? 'Dinheiro' : selectedMethod?.name,
                    financialAccountId: selectedAccountId,
                    paymentMethodId: selectedMethodId,
                    installments: isCreditCard ? installmentsCount : 1,
                    paymentDate: status === TransactionStatus.PAID ? paymentDate : undefined
                }
            };
            if (purchaseToEdit) payload.id = purchaseToEdit.id;
            
            await onSave(payload);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar.');
        } finally {
            setIsSaving(false);
        }
    };

    const isSaveDisabled = items.length === 0 || !supplierName || isSaving;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            {isScannerOpen && <ScannerModal onClose={() => setIsScannerOpen(false)} onScan={handleScan} />}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold dark:text-white">{purchaseToEdit ? 'Editar Compra' : 'Nova Compra'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Items & Search */}
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Itens</h3>
                        <div className="flex gap-2 mb-2">
                            <div className="flex-1 relative">
                                <input type="text" placeholder="Buscar produto..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); const found = products.find(p => p.name.toLowerCase() === e.target.value.toLowerCase()); if(found) setSelectedProduct(found); }} className="w-full p-2 rounded border"/>
                                <button type="button" onClick={() => setIsScannerOpen(true)} className="absolute right-2 top-2 text-gray-500">📷</button>
                            </div>
                            <input type="number" placeholder="Qtd" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-20 p-2 rounded border" />
                            <input type="text" placeholder="Custo Un." value={unitCost} onChange={e => handleCurrencyChange(e.target.value, setUnitCost)} className="w-24 p-2 rounded border" />
                            <button type="button" onClick={handleAddItem} className="bg-green-600 text-white px-4 rounded">+</button>
                        </div>
                        <ul className="space-y-1 max-h-40 overflow-y-auto">
                            {items.map((item, i) => (<li key={i} className="flex justify-between text-sm p-2 bg-white dark:bg-gray-600 rounded"><span>{item.productName} ({item.quantity}x)</span><span>R$ {formatCurrencyNumber(item.quantity * item.unitCost)}</span></li>))}
                        </ul>
                    </div>

                    {/* Supplier */}
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Fornecedor" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="p-2 rounded border" />
                        <input type="text" placeholder="Referência/NF" value={reference} onChange={e => setReference(e.target.value)} className="p-2 rounded border" />
                    </div>

                    {/* Financials */}
                    <div className="pt-4 border-t dark:border-gray-600">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold">Custos e Pagamento</h3>
                            <div className="text-right font-bold text-lg text-green-600 dark:text-green-400">Total: R$ {formatCurrencyNumber(totalCost)}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <input type="text" placeholder="Frete" value={freightCost} onChange={e => handleCurrencyChange(e.target.value, setFreightCost)} className="p-2 rounded border" />
                            <input type="text" placeholder="Outros" value={otherCost} onChange={e => handleCurrencyChange(e.target.value, setOtherCost)} className="p-2 rounded border" />
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Status</label>
                                    <select value={status} onChange={(e) => { setStatus(e.target.value as TransactionStatus); if (e.target.value === TransactionStatus.PENDING) { setSelectedAccountId(''); setSelectedMethodId(''); } }} className="w-full rounded-md bg-white dark:bg-gray-600 border-gray-300 shadow-sm p-2 font-bold">
                                        <option value={TransactionStatus.PENDING}>🔴 Pendente (A Pagar)</option>
                                        <option value={TransactionStatus.PAID}>🟢 Pago (Realizado)</option>
                                    </select>
                                </div>
                            </div>

                            {status === TransactionStatus.PAID && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conta de Origem</label>
                                        <select value={selectedAccountId} onChange={(e) => { setSelectedAccountId(e.target.value); setSelectedMethodId(''); }} className="w-full rounded-md bg-white dark:bg-gray-600 border-gray-300 shadow-sm p-2">
                                            <option value="">Selecione...</option>
                                            <option value="cash-box">💵 Dinheiro do Caixa</option>
                                            <optgroup label="Bancos">{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.bankName}</option>)}</optgroup>
                                        </select>
                                    </div>
                                    {!isCashBox && selectedAccountId && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Método de Pagto</label>
                                            <select value={selectedMethodId} onChange={e => setSelectedMethodId(e.target.value)} className="w-full rounded-md bg-white dark:bg-gray-600 border-gray-300 shadow-sm p-2">
                                                <option value="">Selecione...</option>
                                                {selectedAccount?.paymentMethods.map(m => (<option key={m.id || (m as any)._id} value={m.id || (m as any)._id}>{m.name} ({m.type})</option>))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

                            {isCreditCard && (
                                <div className="mt-4 p-3 bg-indigo-50 dark:bg-gray-800 rounded border border-indigo-200 animate-fade-in">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold text-indigo-600">Parcelamento no Cartão</label>
                                        <select value={installmentsCount} onChange={e => setInstallmentsCount(parseInt(e.target.value))} className="text-sm rounded p-1 border border-indigo-300">
                                            {Array.from({length: 12}, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}x</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {status === TransactionStatus.PENDING && (
                                    <div><label className="block text-sm font-medium mb-1 text-yellow-600">Vencimento</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full rounded-md bg-white dark:bg-gray-600 border-yellow-300 shadow-sm p-2"/></div>
                                )}
                                {status === TransactionStatus.PAID && !isCreditCard && (
                                    <div><label className="block text-sm font-medium mb-1 text-green-600">Data do Pagamento</label><input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full rounded-md bg-white dark:bg-gray-600 border-green-300 shadow-sm p-2"/></div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {error && <p className="text-red-500 text-sm text-center mt-2 font-bold">{error}</p>}

                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300">Cancelar</button>
                        <button type="submit" disabled={isSaveDisabled} className="px-6 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400">Salvar Compra</button>
                    </div>
                </form>
            </div>
        </div>
    )
};

// ... Purchase list component ...
interface PurchasesProps { products: Product[]; purchaseOrders: PurchaseOrder[]; onAddPurchase: (data: any) => Promise<void>; onUpdatePurchase: (data: any) => Promise<void>; onDeletePurchase: (id: string) => Promise<void>; }
const Purchases: React.FC<PurchasesProps> = ({ products, purchaseOrders, onAddPurchase, onUpdatePurchase, onDeletePurchase }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<PurchaseOrder | null>(null);
    const handleEdit = (po: PurchaseOrder) => { setEditingPurchase(po); setIsModalOpen(true); };
    const handleDelete = (id: string) => { if(window.confirm('Excluir compra?')) onDeletePurchase(id); };

    return (
        <div className="container mx-auto">
            {isModalOpen && <PurchaseModal products={products} purchaseToEdit={editingPurchase} onClose={() => setIsModalOpen(false)} onSave={async (data) => { if (data.id) await onUpdatePurchase(data); else await onAddPurchase(data); }} />}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold dark:text-white">Compras</h1>
                <button onClick={() => { setEditingPurchase(null); setIsModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md">+ Nova Compra</button>
            </div>
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"><tr><th className="px-6 py-3">Data</th><th className="px-6 py-3">Fornecedor</th><th className="px-6 py-3">Itens</th><th className="px-6 py-3">Total</th><th className="px-6 py-3">Ações</th></tr></thead>
                    <tbody>
                        {purchaseOrders.map(po => (
                            <tr key={po.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4">{new Date(po.createdAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4">{po.supplierInfo.name}</td>
                                <td className="px-6 py-4">{po.items.length} itens</td>
                                <td className="px-6 py-4 font-bold text-red-500">R$ {formatCurrencyNumber(po.totalCost)}</td>
                                <td className="px-6 py-4"><button onClick={() => handleEdit(po)} className="text-indigo-600 hover:underline mr-3">Editar</button><button onClick={() => handleDelete(po.id)} className="text-red-600 hover:underline">Excluir</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
export default Purchases;
