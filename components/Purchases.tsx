
import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { PurchaseOrder, Product, PaymentMethod, FinancialAccount, PurchaseItem, Bank, TransactionStatus, Supplier } from '../types';
import { formatCurrencyNumber, formatMoney, formatRegister, formatPhone, validateRegister } from '../validation';
import { AuthContext } from '../contexts/AuthContext';

// Declare ZXing attached to window via CDN
declare global {
    interface Window {
        ZXing: any;
    }
}

const NotificationModal: React.FC<{ isOpen: boolean; type: 'success' | 'error'; message: string; onClose: () => void }> = ({ isOpen, type, message, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-fade-in">
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

const ScannerModal: React.FC<{ onClose: () => void; onScan: (code: string) => void }> = ({ onClose, onScan }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const codeReader = new window.ZXing.BrowserMultiFormatReader();
        
        const startScanning = async () => {
            try {
                await codeReader.decodeFromVideoDevice(
                    undefined,
                    videoRef.current,
                    (result: any, err: any) => {
                        if (result) {
                            if (navigator.vibrate) navigator.vibrate(200);
                            onScan(result.getText());
                            codeReader.reset();
                        }
                    }
                );
            } catch (err) {
                console.error("Error starting scanner:", err);
                setError("Erro ao iniciar a câmera. Verifique as permissões.");
            }
        };

        startScanning();

        return () => {
            codeReader.reset();
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[100]">
            <div className="relative w-full max-w-lg p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                    <div className="p-4 text-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scanner de Código de Barras</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Aponte a câmera para o código</p>
                    </div>
                    
                    <div className="relative aspect-[4/3] bg-black">
                        <video 
                            ref={videoRef} 
                            className="w-full h-full object-cover" 
                            style={{ transform: 'scaleX(1)' }} 
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-3/4 h-0.5 bg-red-500 animate-[pulse_2s_infinite] shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                        </div>
                        <div className="absolute inset-0 border-2 border-white/30 rounded-lg m-8 pointer-events-none"></div>
                    </div>

                    {error && <p className="text-center text-red-500 p-2 text-sm">{error}</p>}

                    <div className="p-4">
                        <button
                            onClick={onClose}
                            className="w-full py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

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
    
    // Notification State
    const [notification, setNotification] = useState<{isOpen: boolean; type: 'success' | 'error'; message: string}>({
        isOpen: false, type: 'error', message: ''
    });

    // Supplier Info
    const [supplierCnpj, setSupplierCnpj] = useState('');
    const [reference, setReference] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [supplierContact, setSupplierContact] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [isSupplierLoading, setIsSupplierLoading] = useState(false);

    // Items Logic
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [quantity, setQuantity] = useState(1);
    const [unitCost, setUnitCost] = useState('');
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    
    // Costs
    const [freightCost, setFreightCost] = useState('');
    const [otherCost, setOtherCost] = useState('');

    // Payment
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedAccountId, setSelectedAccountId] = useState('cash-box');
    const [selectedMethodId, setSelectedMethodId] = useState('');
    const [installments, setInstallments] = useState(1); // Credit Card Installments
    const [boletoInstallmentsCount, setBoletoInstallmentsCount] = useState(1); // Boleto Installments
    
    // Status can be empty string initially to force user selection
    const [status, setStatus] = useState<TransactionStatus | ''>('');
    const [statusError, setStatusError] = useState(false);

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
            
            // Logic to restore state from edit
            if (pd.method === PaymentMethod.BANK_SLIP) {
                setStatus(TransactionStatus.PENDING);
                setSelectedAccountId('boleto');
                if (pd.installments && pd.installments.length > 0) {
                    setBoletoInstallmentsCount(pd.installments.length);
                    // Set due date to the first installment
                    setDueDate(new Date(pd.installments[0].dueDate).toISOString().split('T')[0]);
                }
            } else {
                if (pd.financialAccountId === 'cash-box') {
                    setSelectedAccountId('cash-box');
                } else if (pd.financialAccountId) {
                    setSelectedAccountId(pd.financialAccountId);
                    setSelectedMethodId(pd.paymentMethodId || '');
                }
                
                if (pd.paymentDate) {
                    setStatus(TransactionStatus.PAID);
                    setPaymentDate(new Date(pd.paymentDate).toISOString().split('T')[0]);
                } else if (pd.installments && pd.installments.length > 0) {
                    // Logic for Credit card or other pending logic if applicable
                    setStatus(TransactionStatus.PENDING); // Or PAID depending on how you view Credit Card
                    // But in this logic, we use status to determine UI.
                    // If it was credit card, it's technically "Paid" to supplier, but "Pending" in user finance (Invoice).
                    // Usually purchases via CC are considered PAID in PurchaseOrder but generate CC Transaction.
                    setStatus(TransactionStatus.PAID); 
                } else if (pd.method === PaymentMethod.CREDIT_CARD) {
                     setStatus(TransactionStatus.PAID);
                } else {
                     // Default fallback, try to infer from data
                     setStatus(pd.paymentDate ? TransactionStatus.PAID : TransactionStatus.PENDING);
                }
                
                if (pd.method) setPaymentMethod(pd.method);
            }
        }
    }, [purchaseToEdit]);

    const parseMoney = (val: string) => parseFloat(val.replace('R$ ', '').replace(/\./g, '').replace(',', '.')) || 0;

    const totalItemsCost = items.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
    const totalPurchaseCost = totalItemsCost + parseMoney(freightCost) + parseMoney(otherCost);

    // Boleto Calculation Logic
    const boletoPreview = useMemo(() => {
        if (selectedAccountId !== 'boleto' || status !== TransactionStatus.PENDING) return [];
        
        const preview = [];
        const amountPerInstallment = totalPurchaseCost / boletoInstallmentsCount;
        const baseDate = new Date(dueDate);
        
        for (let i = 0; i < boletoInstallmentsCount; i++) {
            const instDate = new Date(baseDate);
            instDate.setMonth(baseDate.getMonth() + i);
            preview.push({
                number: i + 1,
                date: instDate,
                amount: amountPerInstallment
            });
        }
        return preview;
    }, [selectedAccountId, status, boletoInstallmentsCount, totalPurchaseCost, dueDate]);


    // Validation for Future Payment Date
    const handlePaymentDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        const today = new Date().toISOString().split('T')[0];
        
        if (status === TransactionStatus.PAID && newDate > today) {
            setNotification({
                isOpen: true,
                type: 'error',
                message: 'Para status "Pago", a data não pode ser futura. Se deseja agendar, altere o status para "Pendente" e defina o Vencimento.'
            });
            // Reset to today
            setPaymentDate(today);
            return;
        }
        setPaymentDate(newDate);
    };

    // Supplier Lookup Function
    const handleCnpjBlur = async () => {
        const cleanCnpj = supplierCnpj.replace(/\D/g, '');
        if (!cleanCnpj) return;

        if (validateRegister(supplierCnpj)) {
            setIsSupplierLoading(true);
            try {
                const supplier: Supplier | null = await apiCall(`suppliers/${cleanCnpj}`, 'GET');
                if (supplier) {
                    setSupplierName(supplier.name);
                    setSupplierContact(supplier.contactPerson || '');
                    setSupplierPhone(formatPhone(supplier.phone));
                }
            } catch (err) {
                console.error("Error fetching supplier:", err);
            } finally {
                setIsSupplierLoading(false);
            }
        }
    };

    // Product Search Logic
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        setSelectedProductId('');

        if (value.length < 1) {
            setSearchResults([]);
            return;
        }

        const lowerCaseValue = value.toLowerCase();
        const results = products.filter(p => 
            p.name.toLowerCase().includes(lowerCaseValue) ||
            p.barcode.toLowerCase().includes(lowerCaseValue) ||
            p.brand.toLowerCase().includes(lowerCaseValue) ||
            p.model.toLowerCase().includes(lowerCaseValue) ||
            p.category.toLowerCase().includes(lowerCaseValue) ||
            (p.location && p.location.toLowerCase().includes(lowerCaseValue))
        );
        setSearchResults(results);
    };

    const handleSelectProduct = (product: Product) => {
        setSelectedProductId(product.id);
        setSearchTerm(product.name);
        setSearchResults([]);
        setQuantity(1);
        setUnitCost(formatMoney((product.cost * 100).toFixed(0)));
    };

    const handleScan = (code: string) => {
        setIsScannerOpen(false);
        const product = products.find(p => p.barcode === code || p.id === code);
        if (product) {
            handleSelectProduct(product);
        } else {
            alert(`Produto com código "${code}" não encontrado.`);
        }
    };

    const handleAddItem = () => {
        if (!selectedProductId || quantity <= 0) {
            const directProduct = products.find(p => p.barcode === searchTerm || p.id === searchTerm);
            if (directProduct) {
                setSelectedProductId(directProduct.id);
                const numericCost = parseFloat(unitCost.replace('R$ ', '').replace(/\./g, '').replace(',', '.')) || 0;
                const newItem: PurchaseItem = {
                    productId: directProduct.id,
                    productName: directProduct.name,
                    quantity: quantity,
                    unitCost: numericCost
                };
                setItems([...items, newItem]);
                setSearchTerm('');
                setSelectedProductId('');
                setQuantity(1);
                setUnitCost('');
                return;
            }
            return alert("Selecione um produto válido.");
        }

        const prod = products.find(p => p.id === selectedProductId);
        if (!prod) return;

        const numericCost = parseFloat(unitCost.replace('R$ ', '').replace(/\./g, '').replace(',', '.')) || 0;

        const newItem: PurchaseItem = {
            productId: prod.id,
            productName: prod.name,
            quantity: quantity,
            unitCost: numericCost
        };

        setItems([...items, newItem]);
        setSearchTerm('');
        setSelectedProductId('');
        setQuantity(1);
        setUnitCost('');
    };

    const handleEditItem = (index: number) => {
        const itemToEdit = items[index];
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
        setSelectedProductId(itemToEdit.productId);
        setSearchTerm(itemToEdit.productName);
        setQuantity(itemToEdit.quantity);
        setUnitCost(formatMoney((itemToEdit.unitCost * 100).toFixed(0)));
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        // Validation: Status must be selected
        if (status === '') {
            setStatusError(true);
            return;
        } else {
            setStatusError(false);
        }

        if (items.length === 0) return alert("Adicione pelo menos um item.");
        if (!supplierName) return alert("Nome do fornecedor obrigatório.");
        if (!supplierCnpj) return alert("CPF/CNPJ do fornecedor obrigatório.");

        const isBoleto = selectedAccountId === 'boleto' && status === TransactionStatus.PENDING;

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
                installmentCount: isCredit ? installments : 1, // Pass this to backend logic
                installments: isBoleto ? boletoPreview.map(p => ({
                    installmentNumber: p.number,
                    amount: p.amount,
                    dueDate: p.date
                })) : []
            },
            status,
            paymentDate: status === TransactionStatus.PAID ? paymentDate : null,
            dueDate: dueDate,
            installments: isCredit ? installments : 1 // Credit Card logic from parent
        };

        onSave(payload);
    };

    // Helper for accounts
    const isCashBox = selectedAccountId === 'cash-box';
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const availableMethods = selectedAccount?.paymentMethods || [];
    const isCredit = availableMethods.find(m => (m.id || (m as any)._id) === selectedMethodId)?.type === 'Credit';
    const isBoletoMode = selectedAccountId === 'boleto';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            {isScannerOpen && <ScannerModal onClose={() => setIsScannerOpen(false)} onScan={handleScan} />}
            
            <NotificationModal 
                isOpen={notification.isOpen} 
                type={notification.type} 
                message={notification.message} 
                onClose={() => setNotification({ ...notification, isOpen: false })} 
            />

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {purchaseToEdit ? 'Editar Compra' : 'Nova Compra'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
                </div>

                {/* 1. SEÇÃO FORNECEDOR (Topo) */}
                <div className="mb-6 border-b dark:border-gray-700 pb-6">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">1. Fornecedor</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium mb-1">CPF/CNPJ <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={supplierCnpj} 
                                        onChange={e => setSupplierCnpj(formatRegister(e.target.value))} 
                                        onBlur={handleCnpjBlur}
                                        className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" 
                                        placeholder="Busca automática..."
                                    />
                                    {isSupplierLoading && <span className="absolute right-2 top-2 text-xs text-indigo-500 animate-pulse">Buscando...</span>}
                                </div>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium mb-1">Ref. Externa (NFe) <span className="text-red-500">*</span></label>
                                <input type="text" value={reference} onChange={e => setReference(e.target.value)} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Nome / Razão Social <span className="text-red-500">*</span></label>
                            <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nome do Contato</label>
                                <input type="text" value={supplierContact} onChange={e => setSupplierContact(e.target.value)} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" placeholder="Opcional" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Telefone</label>
                                <input type="text" value={supplierPhone} onChange={e => setSupplierPhone(formatPhone(e.target.value))} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. SEÇÃO ITENS DA COMPRA (Meio) */}
                <div className="mb-6 border-b dark:border-gray-700 pb-6">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">2. Itens da Compra</h3>
                    
                    <div className="flex gap-2 mb-4 items-end flex-wrap">
                        <div className="flex-grow min-w-[200px] relative">
                            <label className="block text-sm font-medium mb-1">Produto (Busca/Scan)</label>
                            <div className="flex rounded-md shadow-sm">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    placeholder="Cód., Nome, Marca..."
                                    className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-l-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsScannerOpen(true)}
                                    className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                            {searchResults.length > 0 && (
                                <ul className="absolute z-10 w-full bg-white dark:bg-gray-900 border dark:border-gray-600 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                                    {searchResults.map(product => (
                                        <li 
                                            key={product.id} 
                                            onClick={() => handleSelectProduct(product)} 
                                            className="p-2 text-sm hover:bg-indigo-500 hover:text-white cursor-pointer"
                                        >
                                            <p className="font-semibold">{product.name}</p>
                                            <p className="text-xs text-gray-400">Cód: {product.barcode} | Atual: {product.stock}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="w-24">
                            <label className="block text-sm font-medium mb-1">Qtd.</label>
                            <input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
                        </div>
                        <div className="w-32">
                            <label className="block text-sm font-medium mb-1">Custo Unit.</label>
                            <input type="text" value={unitCost} onChange={e => setUnitCost(formatMoney(e.target.value))} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" placeholder="R$ 0,00" />
                        </div>
                        <button onClick={handleAddItem} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 h-[42px]">Add</button>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 mb-4">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                <tr>
                                    <th className="px-4 py-2">Produto</th>
                                    <th className="px-4 py-2">Qtd</th>
                                    <th className="px-4 py-2">Custo Unit.</th>
                                    <th className="px-4 py-2">Total</th>
                                    <th className="px-4 py-2 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx} className="border-t dark:border-gray-600">
                                        <td className="px-4 py-2">{item.productName}</td>
                                        <td className="px-4 py-2">{item.quantity}</td>
                                        <td className="px-4 py-2">R$ {formatCurrencyNumber(item.unitCost)}</td>
                                        <td className="px-4 py-2">R$ {formatCurrencyNumber(item.unitCost * item.quantity)}</td>
                                        <td className="px-4 py-2 text-right space-x-2">
                                            <button onClick={() => handleEditItem(idx)} className="text-indigo-600 dark:text-indigo-400 hover:underline">Editar</button>
                                            <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700 hover:underline">Excluir</button>
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && <tr><td colSpan={5} className="text-center py-4 text-gray-500">Nenhum item adicionado.</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals moved inside Items Section area */}
                    <div className="flex flex-col md:flex-row justify-between items-end bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex gap-4">
                            <div>
                                <label className="block text-xs font-medium mb-1">Frete (R$)</label>
                                <input type="text" value={freightCost} onChange={e => setFreightCost(formatMoney(e.target.value))} className="w-24 p-2 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Outros (R$)</label>
                                <input type="text" value={otherCost} onChange={e => setOtherCost(formatMoney(e.target.value))} className="w-24 p-2 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm" />
                            </div>
                        </div>
                        <div className="text-right mt-2 md:mt-0">
                            <p className="text-sm text-gray-500">Total da Compra</p>
                            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">R$ {formatCurrencyNumber(totalPurchaseCost)}</p>
                        </div>
                    </div>
                </div>

                {/* 3. SEÇÃO PAGAMENTO (Fundo) */}
                <div className="mb-6">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">3. Pagamento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-medium mb-1">Status <span className="text-red-500">*</span></label>
                                <select 
                                    value={status} 
                                    onChange={e => {
                                        const newStatus = e.target.value as TransactionStatus | '';
                                        setStatus(newStatus);
                                        setStatusError(false);
                                        // Reset special logic if status changes
                                        // If PENDING, default to cash-box, reset method
                                        // If PAID, default to cash-box, reset method
                                        setSelectedAccountId('cash-box');
                                        setSelectedMethodId('');
                                    }} 
                                    className={`w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border ${statusError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                >
                                    <option value="">Selecione...</option>
                                    <option value={TransactionStatus.PAID}>Pago</option>
                                    <option value={TransactionStatus.PENDING}>Pendente</option>
                                </select>
                                {statusError && <p className="text-xs text-red-500 mt-1">Selecione um status.</p>}
                            </div>
                            
                            {status === TransactionStatus.PENDING ? (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Vencimento (1ª Parc.)</label>
                                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />
                                </div>
                            ) : status === TransactionStatus.PAID ? (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Data Pagto.</label>
                                    <input 
                                        type="date" 
                                        value={paymentDate} 
                                        onChange={handlePaymentDateChange}
                                        max={new Date().toISOString().split('T')[0]} 
                                        className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600" 
                                    />
                                </div>
                            ) : <div className="bg-gray-100 dark:bg-gray-700 rounded w-full"></div>}
                        </div>

                        {status !== '' && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Conta de Saída</label>
                                <select 
                                    value={selectedAccountId} 
                                    onChange={e => { setSelectedAccountId(e.target.value); setSelectedMethodId(''); }} 
                                    className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600"
                                >
                                    <option value="cash-box">Dinheiro do Caixa</option>
                                    
                                    {status === TransactionStatus.PENDING && (
                                        <option value="boleto">Boleto Bancário</option>
                                    )}
                                    
                                    {status === TransactionStatus.PAID && (
                                        <optgroup label="Bancos">
                                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.bankName}</option>)}
                                        </optgroup>
                                    )}
                                </select>
                            </div>
                        )}

                        {/* Boleto specific UI */}
                        {isBoletoMode && status === TransactionStatus.PENDING && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded border border-yellow-200 dark:border-yellow-700 animate-fade-in md:col-span-2">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-bold text-yellow-800 dark:text-yellow-400">Parcelamento</label>
                                    <select 
                                        value={boletoInstallmentsCount} 
                                        onChange={e => setBoletoInstallmentsCount(Number(e.target.value))}
                                        className="text-sm rounded p-1 bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-600"
                                    >
                                        {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}x</option>)}
                                    </select>
                                </div>
                                
                                {totalPurchaseCost > 0 && (
                                    <div className="max-h-32 overflow-y-auto text-xs border-t border-yellow-200 dark:border-yellow-700 pt-2">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-gray-500 dark:text-gray-400">
                                                    <th>#</th>
                                                    <th>Vencimento</th>
                                                    <th className="text-right">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {boletoPreview.map((p) => (
                                                    <tr key={p.number} className="border-b border-dashed border-gray-200 dark:border-gray-700/50">
                                                        <td className="py-1">{p.number}x</td>
                                                        <td className="py-1">{p.date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                                        <td className="py-1 text-right font-semibold">R$ {formatCurrencyNumber(p.amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Method Selection for Paid Banks */}
                        {!isCashBox && !isBoletoMode && status === TransactionStatus.PAID && (
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
                                <label className="block text-sm font-medium mb-1">Parcelas (Cartão)</label>
                                <select value={installments} onChange={e => setInstallments(Number(e.target.value))} className="w-full p-2 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                                    {Array.from({length: 12}, (_, i) => i+1).map(n => <option key={n} value={n}>{n}x</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-gray-700">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded">Cancelar</button>
                    <button onClick={handleSubmit} disabled={status === ''} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">Salvar Compra</button>
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
        if (pd.financialAccountId === 'cash-box') {
            return pd.paymentDate ? 'Pago - Caixa' : 'Pendente - Caixa';
        }
        
        if (pd.financialAccountId) {
            const acc = accounts.find(a => a.id === pd.financialAccountId);
            if (acc) {
                const method = acc.paymentMethods.find(m => (m.id || (m as any)._id) === pd.paymentMethodId);
                // Status Paid - Bank (Type)
                // If it's a credit card transaction, it might be Pending in terms of invoice, but purchase is done.
                if (method) return `Pago - ${acc.bankName} (${method.type})`;
                return `Pago - ${acc.bankName}`;
            }
        }
        
        if (pd.method === PaymentMethod.BANK_SLIP) return 'Pendente - Boleto';
        
        // If pending and no special account
        if (pd.paymentDate === null) return 'Pendente - Caixa';
        
        return pd.method;
    };

    const getBadgeStyle = (pd: any) => {
        if (pd.method === PaymentMethod.BANK_SLIP || pd.paymentDate === null) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
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
