
import React, { useState, useMemo, useEffect, useContext, useRef } from 'react';
import { Product, PurchaseOrder, PurchaseItem, PaymentMethod, Bank, Installment, PaymentDetails, SupplierInfo, Supplier, FinancialAccount, TransactionStatus } from '../types';
import { AuthContext } from '../contexts/AuthContext';
import { formatName, validateName, formatRegister, validateRegister, formatPhone, validatePhone, formatCurrencyNumber, formatMoney } from '../validation';

// Declare ZXing attached to window via CDN
declare global {
    interface Window {
        ZXing: any;
    }
}

const ScannerModal: React.FC<{ onClose: () => void; onScan: (code: string) => void }> = ({ onClose, onScan }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const codeReader = new window.ZXing.BrowserMultiFormatReader();
        
        const startScanning = async () => {
            try {
                // Attempts to find the back camera (environment)
                await codeReader.decodeFromVideoDevice(
                    undefined, // deviceId: undefined lets the library choose, or use video input ID
                    videoRef.current,
                    (result: any, err: any) => {
                        if (result) {
                            if (navigator.vibrate) navigator.vibrate(200);
                            onScan(result.getText());
                            codeReader.reset(); // Stop scanning once found
                        }
                        // err is typically "NotFoundException" while scanning, which is normal
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
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
            <div className="relative w-full max-w-lg p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                    <div className="p-4 text-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scanner de Código de Barras</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Aponte a câmera para o código do produto</p>
                    </div>
                    
                    <div className="relative aspect-[4/3] bg-black">
                        <video 
                            ref={videoRef} 
                            className="w-full h-full object-cover" 
                            style={{ transform: 'scaleX(1)' }} // Prevent mirroring if back camera
                        />
                        {/* Scanning Line Animation */}
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

interface PurchaseModalProps {
    products: Product[];
    purchaseToEdit?: PurchaseOrder | null;
    onClose: () => void;
    onSave: (purchase: Omit<PurchaseOrder, 'id' | 'createdAt'> | PurchaseOrder) => void;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ products, purchaseToEdit, onClose, onSave }) => {
    const { apiCall } = useContext(AuthContext);
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [quantity, setQuantity] = useState('1');
    const [unitCost, setUnitCost] = useState('');
    const [freightCost, setFreightCost] = useState('');
    const [otherCost, setOtherCost] = useState('');
    const [error, setError] = useState('');
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

    // New search state
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Supplier & Reference State
    const [supplierName, setSupplierName] = useState('');
    const [supplierCnpjCpf, setSupplierCnpjCpf] = useState('');
    const [supplierContactPerson, setSupplierContactPerson] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [reference, setReference] = useState('');
    const [validationErrors, setValidationErrors] = useState<{ name?: string; cnpjCpf?: string; phone?: string }>({});
    const [isSupplierLoading, setIsSupplierLoading] = useState(false);
    const [isValidatingPhone, setIsValidatingPhone] = useState(false);
    const [foundSupplier, setFoundSupplier] = useState<Supplier | null>(null);


    // Payment State (Updated for Financial Accounts)
    const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.PENDING);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]); // For Cash/Paid
    const [dueDate, setDueDate] = useState(''); // For Pending/Boleto
    
    // Financial Account Selection
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [selectedMethodId, setSelectedMethodId] = useState('');
    const [installmentsCount, setInstallmentsCount] = useState(1);
    
    // Legacy support for manual bank slip dates
    const [installments, setInstallments] = useState<Installment[]>([]);

    useEffect(() => {
        const fetchAccounts = async () => {
            const data = await apiCall('financial', 'GET');
            if (data) setAccounts(data);
        };
        fetchAccounts();
    }, [apiCall]);

    // Derived Financial Logic
    const isCashBox = selectedAccountId === 'cash-box';
    const selectedAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId), [accounts, selectedAccountId]);
    const selectedMethod = useMemo(() => selectedAccount?.paymentMethods.find(m => (m.id || (m as any)._id) === selectedMethodId), [selectedAccount, selectedMethodId]);
    const isCreditCard = !isCashBox && selectedMethod?.type === 'Credit';

    const handleCurrencyChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        setter(formatMoney(value));
    };

    const parseCurrency = (value: string): number => {
        if (!value) return 0;
        const numericString = value.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
        return parseFloat(numericString) || 0;
    };

    const subTotal = useMemo(() => items.reduce((sum, item) => sum + item.unitCost * item.quantity, 0), [items]);
    const totalCost = useMemo(() => subTotal + parseCurrency(freightCost) + parseCurrency(otherCost), [subTotal, freightCost, otherCost]);

    useEffect(() => {
        if (purchaseToEdit) {
            setItems(purchaseToEdit.items);
            setFreightCost(formatMoney(String(purchaseToEdit.freightCost * 100)));
            setOtherCost(formatMoney(String(purchaseToEdit.otherCost * 100)));
            
            setSupplierName(purchaseToEdit.supplierInfo?.name || '');
            setSupplierCnpjCpf(purchaseToEdit.supplierInfo?.cnpjCpf || '');
            setSupplierContactPerson(purchaseToEdit.supplierInfo?.contactPerson || '');
            setSupplierPhone(purchaseToEdit.supplierInfo?.phone || '');
            setReference(purchaseToEdit.reference || '');

            const pd = purchaseToEdit.paymentDetails;
            
            // Populate financial details if available (New structure)
            if ((pd as any).financialAccountId) {
                setSelectedAccountId((pd as any).financialAccountId);
                setSelectedMethodId((pd as any).paymentMethodId || '');
                if ((pd as any).installmentCount) setInstallmentsCount((pd as any).installmentCount || 1);
            } else {
                // Fallback for legacy data visualization
                setSelectedAccountId('');
                setSelectedMethodId('');
            }

            if ('paymentDate' in pd && pd.paymentDate) {
                setPaymentDate(new Date(pd.paymentDate).toISOString().split('T')[0]);
                setStatus(TransactionStatus.PAID);
            } else if (pd.method === PaymentMethod.BANK_SLIP) {
                setStatus(TransactionStatus.PENDING);
                setInstallments(pd.installments.map(i => ({...i, dueDate: new Date(i.dueDate)})));
                // Assume first installment due date for general viewing
                if(pd.installments[0]) setDueDate(new Date(pd.installments[0].dueDate).toISOString().split('T')[0]);
            }
        } else {
            setItems([]);
            setSearchTerm('');
            setSelectedProduct(null);
            setQuantity('1');
            setUnitCost('');
            setFreightCost('');
            setOtherCost('');
            setEditingItemIndex(null);
            setSupplierName('');
            setSupplierCnpjCpf('');
            setSupplierContactPerson('');
            setSupplierPhone('');
            setReference('');
            
            setStatus(TransactionStatus.PENDING);
            setSelectedAccountId('');
            setSelectedMethodId('');
            setInstallmentsCount(1);
            setInstallments([]);
            setFoundSupplier(null);
        }
         setValidationErrors({});
    }, [purchaseToEdit]);

    // Debounce for supplier search (CNPJ)
    useEffect(() => {
        const handler = setTimeout(async () => {
            const cleanedCnpjCpf = supplierCnpjCpf.replace(/\D/g, '');

            // Do not search if the field is empty
            if (!cleanedCnpjCpf) {
                setFoundSupplier(null);
                return;
            }

            if (validateRegister(supplierCnpjCpf)) {
                setIsSupplierLoading(true);
                const supplier: Supplier | null = await apiCall(`suppliers/${cleanedCnpjCpf}`, 'GET');
                
                if (supplier) {
                    setFoundSupplier(supplier);
                    setSupplierName(supplier.name);
                    setSupplierContactPerson(supplier.contactPerson || '');
                    setSupplierPhone(supplier.phone);
                    setValidationErrors({});
                } else {
                    setFoundSupplier(null);
                }
                setIsSupplierLoading(false);
            } else {
                setFoundSupplier(null);
            }
        }, 500);

        return () => clearTimeout(handler);
    }, [supplierCnpjCpf, apiCall]);

    const handleSupplierNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSupplierName(value);
        setValidationErrors(prev => {
            const newErrors = { ...prev };
            if (!validateName(value)) {
                newErrors.name = 'Nome inválido.';
            } else {
                delete newErrors.name;
            }
            return newErrors;
        });
    };
    
    const handleCnpjCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formattedValue = formatRegister(e.target.value);
        setSupplierCnpjCpf(formattedValue);
        setValidationErrors(prev => {
            const newErrors = { ...prev };
            if (!validateRegister(formattedValue)) {
                newErrors.cnpjCpf = 'CPF/CNPJ inválido.';
            } else {
                delete newErrors.cnpjCpf;
            }
            return newErrors;
        });
    };
    
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formattedValue = formatPhone(e.target.value);
        setSupplierPhone(formattedValue);
        setValidationErrors(prev => {
            const newErrors = { ...prev };
            if (!validatePhone(formattedValue)) {
                newErrors.phone = 'Telefone inválido.';
            } else {
                delete newErrors.phone;
            }
            return newErrors;
        });
    };

    const handlePhoneBlur = async () => {
        const cleanPhone = supplierPhone.replace(/\D/g, '');
        const cleanCurrentCnpj = supplierCnpjCpf.replace(/\D/g, '');

        if (!cleanPhone) return;

        setIsValidatingPhone(true);
        try {
            const existingSupplier = await apiCall(`suppliers/by-phone/${cleanPhone}`, 'GET');
            if (existingSupplier) {
                const dbCnpj = existingSupplier.cnpjCpf.replace(/\D/g, '');
                
                if (dbCnpj !== cleanCurrentCnpj) {
                    setValidationErrors(prev => ({
                        ...prev,
                        phone: `Telefone já pertence a: ${existingSupplier.name} (CNPJ: ${formatRegister(existingSupplier.cnpjCpf)})`
                    }));
                } else {
                    setValidationErrors(prev => {
                        const newErr = {...prev};
                        delete newErr.phone;
                        return newErr;
                    });
                }
            }
        } catch (err) {
            console.error('Error validating phone', err);
        } finally {
            setIsValidatingPhone(false);
        }
    };

     const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        setSelectedProduct(null); // Clear selection when typing

        if (value.length < 1) {
            setSearchResults([]);
            return;
        }

        const lowerCaseValue = value.toLowerCase();
        const results = products.filter(p => 
            p.name.toLowerCase().includes(lowerCaseValue) ||
            p.barcode.toLowerCase().includes(lowerCaseValue) ||
            p.category.toLowerCase().includes(lowerCaseValue) ||
            (p.location && p.location.toLowerCase().includes(lowerCaseValue))
        );
        setSearchResults(results);
    };

    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product);
        setSearchTerm(product.name);
        setSearchResults([]); 
        searchInputRef.current?.focus();
    };

    const handleScan = (code: string) => {
        setIsScannerOpen(false);
        const product = products.find(p => p.barcode === code || p.id === code);
        if (product) {
            handleSelectProduct(product);
        } else {
            setError(`Produto com código "${code}" não encontrado.`);
            setTimeout(() => setError(''), 3000);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveItem();
        }
    };

    const handleSaveItem = () => {
        setError('');
        
        let productToAdd = selectedProduct;
        if (!productToAdd) {
            const foundByBarcode = products.find(p => p.barcode === searchTerm);
            if (foundByBarcode) {
                productToAdd = foundByBarcode;
            }
        }
        
        if (!productToAdd) {
            setError('Selecione um produto da lista ou use um código de barras válido.');
            return;
        }

        const numericQuantity = parseFloat(quantity);
        const numericUnitCost = parseCurrency(unitCost);

        if (!numericQuantity || numericQuantity <= 0 || !numericUnitCost || numericUnitCost < 0) {
             setError('Quantidade e Custo Unitário devem ser valores positivos.');
            return;
        }

        const newItem: PurchaseItem = {
            productId: productToAdd.id,
            productName: productToAdd.name,
            quantity: numericQuantity,
            unitCost: numericUnitCost,
        };

        if (editingItemIndex !== null) {
            const updatedItems = [...items];
            updatedItems[editingItemIndex] = newItem;
            setItems(updatedItems);
        } else {
            setItems([...items, newItem]);
        }
        
        setSearchTerm('');
        setSelectedProduct(null);
        setSearchResults([]);
        setQuantity('1');
        setUnitCost('');
        setEditingItemIndex(null);
        searchInputRef.current?.focus();
    }
    
    const handleEditItem = (indexToEdit: number) => {
        const item = items[indexToEdit];
        const product = products.find(p => p.id === item.productId);
        if (product) {
            setSelectedProduct(product);
            setSearchTerm(product.name);
        }
        setQuantity(String(item.quantity));
        setUnitCost(formatMoney(String(item.unitCost * 100)));
        setEditingItemIndex(indexToEdit);
    };

    const handleRemoveItem = (indexToRemove: number) => {
        setItems(currentItems => currentItems.filter((_, index) => index !== indexToRemove));
        if (editingItemIndex === indexToRemove) {
            setSearchTerm('');
            setSelectedProduct(null);
            setQuantity('1');
            setUnitCost('');
            setEditingItemIndex(null);
        }
    };
    
    const isSaveDisabled = Object.keys(validationErrors).length > 0 || items.length === 0 || !supplierName || !supplierCnpjCpf || !supplierPhone || !reference || isValidatingPhone;
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const currentErrors: { name?: string; cnpjCpf?: string; phone?: string } = {};
        if (!validateName(supplierName)) currentErrors.name = 'Nome inválido.';
        if (!validateRegister(supplierCnpjCpf)) currentErrors.cnpjCpf = 'CPF/CNPJ inválido.';
        if (!validatePhone(supplierPhone)) currentErrors.phone = 'Telefone inválido.';

        if (Object.keys(currentErrors).length > 0) {
            setValidationErrors(currentErrors);
            setError('Por favor, corrija os erros nos dados do fornecedor.');
            return;
        }

        if (items.length === 0) {
            setError('Adicione pelo menos um item à nota de compra.');
            return;
        }

        // --- PAYMENT VALIDATION ---
        
        // 1. Status Paid
        if (status === TransactionStatus.PAID) {
            if (!selectedAccountId) {
                setError('Selecione a Conta de Saída (Dinheiro ou Banco).');
                return;
            }
            if (!isCashBox && !selectedMethodId) {
                setError('Selecione o Método de Pagamento do Banco.');
                return;
            }
            if (!isCreditCard && !paymentDate) {
                setError('Data do Pagamento é obrigatória.');
                return;
            }
        } 
        
        // 2. Status Pending
        if (status === TransactionStatus.PENDING) {
            if (!dueDate) {
                setError('Data de Vencimento é obrigatória para pendências.');
                return;
            }
        }

        // Construct Payment Details Object to match backend expectations
        let paymentDetails: any = {
            financialAccountId: selectedAccountId,
            paymentMethodId: selectedMethodId,
            // For credit card, we send installmentCount instead of installments array to avoid CastError on backend
            installmentCount: isCreditCard ? installmentsCount : 1
        };

        if (isCashBox) {
            paymentDetails.method = PaymentMethod.CASH;
            paymentDetails.paymentDate = status === TransactionStatus.PAID ? new Date(`${paymentDate}T12:00:00`) : undefined;
        } else if (isCreditCard) {
            paymentDetails.method = PaymentMethod.CREDIT_CARD;
            // Dates are handled by backend transaction generator for CC
        } else {
            // General Bank Payment
            paymentDetails.method = selectedMethod?.type === 'Pix' ? PaymentMethod.PIX : PaymentMethod.BANK_TRANSFER; // Approximate mapping
            if (status === TransactionStatus.PAID) {
                paymentDetails.paymentDate = new Date(`${paymentDate}T12:00:00`);
            } else {
                paymentDetails.method = PaymentMethod.BANK_SLIP; // Force logic for pending bank items if needed, or backend handles it
                // Logic: Pending + Bank Account = Bank Slip / Payable
                paymentDetails.installments = [{
                    installmentNumber: 1,
                    amount: totalCost,
                    dueDate: new Date(`${dueDate}T12:00:00`)
                }];
            }
        }

        const supplierInfo: SupplierInfo = {
            name: supplierName,
            cnpjCpf: supplierCnpjCpf,
            contactPerson: supplierContactPerson,
            phone: supplierPhone,
        }

        const purchaseData = {
            items,
            freightCost: parseCurrency(freightCost),
            otherCost: parseCurrency(otherCost),
            totalCost,
            paymentDetails,
            supplierInfo,
            reference,
            // Pass flat status/dates for backend utility
            status: isCreditCard ? TransactionStatus.PENDING : status,
            paymentDate: (!isCreditCard && status === TransactionStatus.PAID) ? paymentDate : undefined,
            dueDate: (!isCreditCard && status === TransactionStatus.PENDING) ? dueDate : undefined
        };
        
        if (purchaseToEdit) {
            onSave({ ...purchaseToEdit, ...purchaseData });
        } else {
            onSave(purchaseData);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            {isScannerOpen && <ScannerModal onClose={() => setIsScannerOpen(false)} onScan={handleScan} />}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">{purchaseToEdit ? 'Editar Compra' : 'Incluir Nova Compra'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Item Entry Section */}
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Adicionar Itens</h3>
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="md:col-span-2 relative">
                                <label className="block text-sm">Buscar Produto</label>
                                <div className="mt-1 flex rounded-md shadow-sm">
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchTerm}
                                        onChange={handleSearchChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Cód., nome, local, categoria..."
                                        className="block w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 rounded-l-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        autoComplete="off"
                                    />
                                    <button type="button" onClick={() => setIsScannerOpen(true)} className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 dark:bg-gray-500 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm10 0a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM3 13a2 2 0 012-2h2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                                {searchResults.length > 0 && (
                                    <ul className="absolute z-10 w-full bg-white dark:bg-gray-900 border dark:border-gray-600 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                                        {searchResults.map(product => (
                                            <li 
                                                key={product.id} 
                                                onClick={() => handleSelectProduct(product)} 
                                                className="p-2 text-sm hover:bg-indigo-500 hover:text-white cursor-pointer"
                                            >
                                                <p className="font-semibold">{product.name}</p>
                                                <p className="text-xs text-gray-400">Cód: {product.barcode} | Estoque: {product.stock}</p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm">Quantidade</label>
                                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} onKeyDown={handleKeyDown} className="mt-1 w-full rounded-md bg-white dark:bg-gray-600 border-gray-300 shadow-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm">Custo Unit.</label>
                                    <input type="text" value={unitCost} onChange={e => handleCurrencyChange(e.target.value, setUnitCost)} onKeyDown={handleKeyDown} className="mt-1 w-full rounded-md bg-white dark:bg-gray-600 border-gray-300 shadow-sm p-2" />
                                </div>
                            </div>
                            <button type="button" onClick={handleSaveItem} className="bg-blue-600 text-white rounded-md px-4 py-2 h-10 hover:bg-blue-700">
                                {editingItemIndex !== null ? 'Atualizar' : 'Adicionar'}
                            </button>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="max-h-40 overflow-y-auto border dark:border-gray-600 rounded-lg p-2 space-y-2">
                        {items.length === 0 && <p className="text-gray-500 text-center">Nenhum item adicionado</p>}
                        {items.map((item, index) => (
                             <div key={`${item.productId}-${index}`} className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded">
                                <div>
                                    <span className="font-medium">{item.quantity}x {item.productName}</span>
                                    <span className="text-sm text-gray-600 dark:text-gray-400"> @ R$ {formatCurrencyNumber(item.unitCost)}</span>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <span className="font-semibold">R$ {formatCurrencyNumber(item.quantity * item.unitCost)}</span>
                                    <div className="flex items-center space-x-2">
                                        <button type="button" onClick={() => handleEditItem(index)} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline text-xs">Editar</button>
                                        <button type="button" onClick={() => handleRemoveItem(index)} className="font-medium text-red-600 dark:text-red-500 hover:underline text-xs">Remover</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Supplier and Reference Section */}
                    <div className="pt-4 border-t dark:border-gray-600">
                        <h3 className="font-semibold mb-2">Dados do Fornecedor e Documento</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm">CNPJ/CPF</label>
                                <input type="text" value={supplierCnpjCpf} onChange={handleCnpjCpfChange} required className={`mt-1 w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2 ${validationErrors.cnpjCpf ? 'border-red-500' : ''}`}/>
                                {isSupplierLoading && <p className="text-xs text-blue-400 mt-1">Buscando...</p>}
                                {foundSupplier && <p className="text-xs text-green-500 mt-1">Fornecedor encontrado!</p>}
                                {validationErrors.cnpjCpf && <p className="text-xs text-red-500 mt-1">{validationErrors.cnpjCpf}</p>}
                            </div>
                            <div>
                                <label className="block text-sm">Nome do Fornecedor</label>
                                <input type="text" value={supplierName} onChange={handleSupplierNameChange} onBlur={() => setSupplierName(formatName(supplierName))} required className={`mt-1 w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2 ${validationErrors.name ? 'border-red-500' : ''}`}/>
                                {validationErrors.name && <p className="text-xs text-red-500 mt-1">{validationErrors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm">Responsável</label>
                                <input type="text" value={supplierContactPerson} onChange={e => setSupplierContactPerson(e.target.value)} onBlur={() => setSupplierContactPerson(formatName(supplierContactPerson))} className="mt-1 w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2"/>
                            </div>
                            <div>
                                <label className="block text-sm">Telefone</label>
                                <input type="text" value={supplierPhone} onChange={handlePhoneChange} onBlur={handlePhoneBlur} className={`mt-1 w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2 ${validationErrors.phone ? 'border-red-500' : ''}`}/>
                                {isValidatingPhone && <p className="text-xs text-blue-500 mt-1 animate-pulse">Verificando...</p>}
                                {validationErrors.phone && <p className="text-xs text-red-500 mt-1">{validationErrors.phone}</p>}
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-sm">Referência (NF-e, Cupom, etc.)</label>
                                <input type="text" value={reference} onChange={e => setReference(e.target.value)} required className="mt-1 w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2"/>
                            </div>
                        </div>
                    </div>

                    {/* Costs and Payment (NEW: Financial Account Logic) */}
                    <div className="pt-4 border-t dark:border-gray-600">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold">Custos Adicionais e Pagamento</h3>
                            <div className="text-right font-bold text-lg text-green-600 dark:text-green-400">
                                Total: R$ {formatCurrencyNumber(totalCost)}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div>
                                <label className="block text-sm">Frete (R$)</label>
                                <input type="text" value={freightCost} onChange={e => handleCurrencyChange(e.target.value, setFreightCost)} className="mt-1 w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2"/>
                            </div>
                            <div>
                                <label className="block text-sm">Outros Custos (R$)</label>
                                <input type="text" value={otherCost} onChange={e => handleCurrencyChange(e.target.value, setOtherCost)} className="mt-1 w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2"/>
                            </div>
                        </div>

                        {/* Financial Account Selection (Similar to CostModal) */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Status do Pagamento</label>
                                    <select 
                                        value={status} 
                                        onChange={(e) => {
                                            setStatus(e.target.value as TransactionStatus);
                                            if (e.target.value === TransactionStatus.PENDING) {
                                                setSelectedAccountId('');
                                                setSelectedMethodId('');
                                            }
                                        }} 
                                        className="w-full rounded-md bg-white dark:bg-gray-600 border-gray-300 shadow-sm p-2 font-bold"
                                    >
                                        <option value={TransactionStatus.PENDING}>🔴 Pendente (A Pagar)</option>
                                        <option value={TransactionStatus.PAID}>🟢 Pago (Realizado)</option>
                                    </select>
                                </div>
                            </div>

                            {status === TransactionStatus.PAID && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conta de Origem</label>
                                        <select 
                                            value={selectedAccountId} 
                                            onChange={(e) => { setSelectedAccountId(e.target.value); setSelectedMethodId(''); }} 
                                            className="w-full rounded-md bg-white dark:bg-gray-600 border-gray-300 shadow-sm p-2"
                                        >
                                            <option value="">Selecione...</option>
                                            <option value="cash-box">💵 Dinheiro do Caixa</option>
                                            <optgroup label="Bancos">
                                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.bankName}</option>)}
                                            </optgroup>
                                        </select>
                                    </div>

                                    {!isCashBox && selectedAccountId && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Método de Pagto</label>
                                            <select 
                                                value={selectedMethodId} 
                                                onChange={e => setSelectedMethodId(e.target.value)} 
                                                className="w-full rounded-md bg-white dark:bg-gray-600 border-gray-300 shadow-sm p-2"
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
                            )}

                            {/* Credit Card Specifics */}
                            {isCreditCard && (
                                <div className="mt-4 p-3 bg-indigo-50 dark:bg-gray-800 rounded border border-indigo-200 animate-fade-in">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold text-indigo-600">Parcelamento no Cartão</label>
                                        <select 
                                            value={installmentsCount} 
                                            onChange={e => setInstallmentsCount(parseInt(e.target.value))}
                                            className="text-sm rounded p-1 border border-indigo-300"
                                        >
                                            {Array.from({length: 12}, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}x</option>)}
                                        </select>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">As parcelas serão geradas automaticamente na fatura do cartão.</p>
                                </div>
                            )}

                            {/* Date Fields */}
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {status === TransactionStatus.PENDING && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-yellow-600">Vencimento</label>
                                        <input 
                                            type="date" 
                                            value={dueDate} 
                                            onChange={e => setDueDate(e.target.value)} 
                                            className="w-full rounded-md bg-white dark:bg-gray-600 border-yellow-300 shadow-sm p-2"
                                        />
                                    </div>
                                )}
                                {status === TransactionStatus.PAID && !isCreditCard && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-green-600">Data do Pagamento</label>
                                        <input 
                                            type="date" 
                                            value={paymentDate} 
                                            onChange={e => setPaymentDate(e.target.value)} 
                                            className="w-full rounded-md bg-white dark:bg-gray-600 border-green-300 shadow-sm p-2"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {error && <p className="text-red-500 text-sm text-center mt-2 font-bold">{error}</p>}

                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300">Cancelar</button>
                        <button type="submit" disabled={isSaveDisabled} className="px-6 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">Salvar Compra</button>
                    </div>
                </form>
            </div>
        </div>
    )
};

const ConfirmationModal: React.FC<{ message: string; onConfirm: () => void; onCancel: () => void }> = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
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

interface PurchasesProps {
    products: Product[];
    purchaseOrders: PurchaseOrder[];
    onAddPurchase: (purchase: Omit<PurchaseOrder, 'id' | 'createdAt'>) => void;
    onUpdatePurchase: (purchase: PurchaseOrder) => void;
    onDeletePurchase: (purchaseId: string) => void;
}

const Purchases: React.FC<PurchasesProps> = ({ products, purchaseOrders, onAddPurchase, onUpdatePurchase, onDeletePurchase }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<PurchaseOrder | null>(null);
    const [deletingPurchaseId, setDeletingPurchaseId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 15;


    const handleOpenCreateModal = () => {
        setEditingPurchase(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (purchase: PurchaseOrder) => {
        setEditingPurchase(purchase);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingPurchase(null);
        setIsModalOpen(false);
    };

    const handleSave = (purchaseData: Omit<PurchaseOrder, 'id' | 'createdAt'> | PurchaseOrder) => {
        if ('id' in purchaseData) {
            onUpdatePurchase(purchaseData);
        } else {
            onAddPurchase(purchaseData);
        }
        handleCloseModal();
    };
    
    const handleDeleteRequest = (purchaseId: string) => {
        setDeletingPurchaseId(purchaseId);
    };

    const handleDeleteConfirm = () => {
        if (deletingPurchaseId) {
            onDeletePurchase(deletingPurchaseId);
        }
        setDeletingPurchaseId(null);
    };

    const filteredAndSortedPurchases = useMemo(() => {
        return purchaseOrders
            .filter(po => {
                const poDate = new Date(po.createdAt);
                
                if (startDate) {
                    const start = new Date(startDate);
                    start.setHours(0, 0, 0, 0); // Beginning of the day
                    if (poDate < start) return false;
                }
                
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999); // End of the day
                    if (poDate > end) return false;
                }
                
                const lowerCaseSearchTerm = searchTerm.toLowerCase();
                if (lowerCaseSearchTerm) {
                    const matchesSupplier = po.supplierInfo?.name.toLowerCase().includes(lowerCaseSearchTerm);
                    const matchesReference = po.reference?.toLowerCase().includes(lowerCaseSearchTerm);
                    const matchesTotal = po.totalCost.toFixed(2).includes(lowerCaseSearchTerm);
                    return matchesSupplier || matchesReference || matchesTotal;
                }
                
                return true;
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [purchaseOrders, searchTerm, startDate, endDate]);

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredAndSortedPurchases.slice(indexOfFirstRecord, indexOfLastRecord);
    const nPages = Math.ceil(filteredAndSortedPurchases.length / recordsPerPage);

    const nextPage = () => {
        if (currentPage < nPages) setCurrentPage(currentPage + 1);
    };
    const prevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, startDate, endDate]);


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
                        placeholder="Fornecedor, Referência, Valor..."
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
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            (po.paymentDetails as any).financialAccountId 
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                            : po.paymentDetails.method === PaymentMethod.BANK_SLIP 
                                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' 
                                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                        }`}>
                                            {(po.paymentDetails as any).financialAccountId ? 'Financeiro' : po.paymentDetails.method}
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
};

export default Purchases;
