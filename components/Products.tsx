
    import React, { useState, useEffect, useMemo, useRef } from 'react';
    import { Product, ProductCategory, TicketSale, ProductStatus, KpiGoals, TurnoverPeriod } from '../types';
    import { formatCurrencyNumber, formatMoney, formatName } from '../validation';

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

    const Tooltip: React.FC<{ text: string }> = ({ text }) => (
        <div className="group relative inline-block ml-2 align-middle">
            <svg className="w-5 h-5 text-gray-400 cursor-help hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {/* 
                Adjusted Positioning:
                - `right-[-20px]`: Aligns the tooltip box mainly to the left of the icon (growing leftwards), 
                  preventing overflow on the right edge of modals/screens.
                - Arrow is manually positioned with `right-6` to align with the icon.
            */}
            <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible absolute bottom-full right-[-20px] mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50 transition-all duration-200 pointer-events-none text-center leading-relaxed">
                {text}
                <div className="absolute top-full right-6 -mt-[1px] border-4 border-transparent border-t-gray-900"></div>
            </div>
        </div>
    );

    interface ProductModalProps {
        productToEdit?: Product | null;
        existingProducts: Product[]; // Added to check for duplicates
        onClose: () => void;
        onSave: (productData: Omit<Product, 'stock' | 'lastSold'> | Product, adjustmentReason?: string) => void;
    }

    const ProductModal: React.FC<ProductModalProps> = ({ productToEdit, existingProducts, onClose, onSave }) => {
        const [barcode, setBarcode] = useState('');
        const [brand, setBrand] = useState('');
        const [model, setModel] = useState('');
        const [category, setCategory] = useState(''); // Changed to string for generic input
        const [location, setLocation] = useState('');
        const [price, setPrice] = useState('');
        const [requiresUniqueIdentifier, setRequiresUniqueIdentifier] = useState(false);
        const [averageCost, setAverageCost] = useState('');
        const [isScannerOpen, setIsScannerOpen] = useState(false);
        
        // Validation State
        const [errors, setErrors] = useState<{ barcode?: string }>({});

        // For stock adjustment
        const [stock, setStock] = useState(0);
        const [adjustmentReason, setAdjustmentReason] = useState('');
        
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
            if (productToEdit) {
                setBarcode(productToEdit.barcode);
                setBrand(productToEdit.brand);
                setModel(productToEdit.model);
                setCategory(productToEdit.category);
                setLocation(productToEdit.location || '');
                setPrice(formatMoney((productToEdit.price * 100).toFixed(0)));
                setStock(productToEdit.stock);
                setRequiresUniqueIdentifier(productToEdit.requiresUniqueIdentifier || false);
                setAverageCost(formatMoney((productToEdit.cost * 100).toFixed(0)));
            } else {
                // Reset form for new product
                setBarcode('');
                setBrand('');
                setModel('');
                setCategory('');
                setLocation('');
                setPrice('');
                setStock(0);
                setAdjustmentReason('');
                setRequiresUniqueIdentifier(false);
                setAverageCost('');
            }
            setErrors({});
        }, [productToEdit]);

        // Real-time Barcode Validation
        useEffect(() => {
            if (barcode) {
                const duplicate = existingProducts.find(p => 
                    p.barcode === barcode && 
                    (!productToEdit || p.id !== productToEdit.id)
                );

                if (duplicate) {
                    setErrors(prev => ({ ...prev, barcode: 'Um produto com este código de barras já existe.' }));
                } else {
                    setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.barcode;
                        return newErrors;
                    });
                }
            } else {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.barcode;
                    return newErrors;
                });
            }
        }, [barcode, existingProducts, productToEdit]);

        const handleScan = (code: string) => {
            setBarcode(code);
            setIsScannerOpen(false);
        };

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            
            if (errors.barcode) return;

            const formattedBrand = formatName(brand);
            const formattedModel = formatName(model);
            const formattedCategory = formatName(category);

            const commonData = {
                id: barcode, // ID is the barcode
                barcode,
                brand: formattedBrand,
                model: formattedModel,
                name: `${formattedBrand} ${formattedModel}`,
                category: formattedCategory as ProductCategory, // Cast or keep string if backend supports
                location,
                price: parseCurrency(price),
                requiresUniqueIdentifier,
            };

            if (productToEdit) {
                const updatedProduct = {
                    ...productToEdit,
                    ...commonData,
                    cost: parseCurrency(averageCost),
                    stock, // Update stock from the adjustment field
                };
                onSave(updatedProduct, adjustmentReason);
            } else {
                const newProductData = {
                    ...commonData,
                    cost: 0, // Cost is calculated on backend from purchases
                };
                onSave(newProductData);
            }
        };
        
        const isSaveDisabled = Object.keys(errors).length > 0;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                {isScannerOpen && <ScannerModal onClose={() => setIsScannerOpen(false)} onScan={handleScan} />}
                
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <h2 className="text-2xl font-bold mb-6">{productToEdit ? 'Editar Produto' : 'Adicionar Novo Produto'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">ID / Código de Barras</label>
                            <div className="flex mt-1 rounded-md shadow-sm">
                                <input 
                                    type="text" 
                                    value={barcode} 
                                    onChange={e => setBarcode(e.target.value)} 
                                    required 
                                    disabled={!!productToEdit} 
                                    className={`flex-1 min-w-0 block w-full rounded-none rounded-l-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 disabled:opacity-50 ${errors.barcode ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => !productToEdit && setIsScannerOpen(true)}
                                    disabled={!!productToEdit}
                                    className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 cursor-pointer"
                                    title="Escanear Código de Barras"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
                                        <path d="M11 4a1 1 0 10-2 0v1a1 1 0 102 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3zM17 13a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zM16 17a1 1 0 100-2h-3a1 1 0 100 2h3z" />
                                    </svg>
                                </button>
                            </div>
                            {errors.barcode && <p className="text-xs text-red-500 mt-1">{errors.barcode}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Marca</label>
                                <input type="text" value={brand} onChange={e => setBrand(e.target.value)} onBlur={() => setBrand(formatName(brand))} required className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Modelo</label>
                                <input type="text" value={model} onChange={e => setModel(e.target.value)} onBlur={() => setModel(formatName(model))} required className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"/>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Categoria</label>
                                <input 
                                    type="text" 
                                    value={category} 
                                    onChange={e => setCategory(e.target.value)} 
                                    onBlur={() => setCategory(formatName(category))} 
                                    placeholder="Ex: Vestuário, Eletrônicos..."
                                    required 
                                    className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Localização</label>
                                <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex: Prateleira B" className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"/>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Preço de Venda (R$)</label>
                                <input type="text" value={price} onChange={e => handleCurrencyChange(e.target.value, setPrice)} required className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"/>
                            </div>
                            {productToEdit && (
                                <div>
                                    <label className="block text-sm font-medium">Custo Médio (R$)</label>
                                    <input type="text" value={averageCost} onChange={e => handleCurrencyChange(e.target.value, setAverageCost)} required className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"/>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                            <input 
                                type="checkbox" 
                                id="uniqueIdentifier" 
                                checked={requiresUniqueIdentifier} 
                                onChange={e => setRequiresUniqueIdentifier(e.target.checked)} 
                                className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="uniqueIdentifier" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                                Exigir identificador único do produto na venda?
                                <Tooltip text="Ao marcar esta opção, o sistema solicitará o Serial/IMEI/Código único de cada unidade deste produto no momento da venda. Essencial para controle de garantias e rastreabilidade." />
                            </label>
                        </div>

                        {productToEdit && (
                            <div className="pt-4 border-t dark:border-gray-600">
                                <h3 className="text-lg font-semibold mb-2">Ajuste de Estoque</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">Estoque Físico</label>
                                        <input type="number" value={stock} onChange={e => setStock(parseInt(e.target.value, 10))} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm px-3 py-2"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Motivo do Ajuste</label>
                                        <input type="text" value={adjustmentReason} onChange={e => setAdjustmentReason(e.target.value)} placeholder="Ex: Inventário, avaria..." className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm px-3 py-2"/>
                                    </div>
                                </div>
                            </div>
                        )}


                        <div className="flex justify-end space-x-4 pt-4">
                            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                            <button type="submit" disabled={isSaveDisabled} className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">Salvar Produto</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const ConfirmationModal: React.FC<{ message: string; onConfirm: () => void; onCancel: () => void }> = ({ message, onConfirm, onCancel }) => (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
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


    interface ProductsProps {
        products: Product[];
        ticketSales: TicketSale[];
        onAddProduct: (productData: Omit<Product, 'cost' | 'stock' | 'lastSold'>) => void;
        onUpdateProduct: (product: Product, adjustmentReason?: string) => void;
        onDeleteProduct: (productId: string) => void;
        goals: KpiGoals;
    }

    const StatusBadge: React.FC<{ status: ProductStatus, days: number }> = ({ status, days }) => {
        const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full flex flex-col items-center justify-center min-w-[80px]";
        const statusClasses = {
            [ProductStatus.RUPTURA]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
            [ProductStatus.RISCO]: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
            [ProductStatus.SEGURANCA]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
            [ProductStatus.EXCESSO]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
        };
        
        const daysText = days === Infinity ? '> 365d' : days === 0 ? '0d' : `${Math.round(days)}d`;

        return (
            <div className={`${baseClasses} ${statusClasses[status]}`}>
                <span>{status}</span>
                <span className="text-[10px] opacity-80">{daysText}</span>
            </div>
        );
    };


    const Products: React.FC<ProductsProps> = ({ products, ticketSales, onAddProduct, onUpdateProduct, onDeleteProduct, goals }) => {
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [editingProduct, setEditingProduct] = useState<Product | null>(null);
        const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
        const [searchTerm, setSearchTerm] = useState('');
        const [minMargin, setMinMargin] = useState('');
        const [maxMargin, setMaxMargin] = useState('');
        const [statusFilter, setStatusFilter] = useState<ProductStatus | 'All'>('All');
        const [currentPage, setCurrentPage] = useState(1);
        const recordsPerPage = 15;


        const handleOpenCreateModal = () => {
            setEditingProduct(null);
            setIsModalOpen(true);
        };

        const handleOpenEditModal = (product: Product) => {
            setEditingProduct(product);
            setIsModalOpen(true);
        };
        
        const handleCloseModal = () => {
            setIsModalOpen(false);
            setEditingProduct(null);
        };

        const handleSaveProduct = (productData: Omit<Product, 'stock' | 'lastSold'> | Product, adjustmentReason?: string) => {
            if ('stock' in productData && editingProduct) { 
                onUpdateProduct(productData as Product, adjustmentReason);
            } else {
                onAddProduct(productData as Omit<Product, 'cost' | 'stock' | 'lastSold'>);
            }
            handleCloseModal();
        };

        const handleDeleteRequest = (productId: string) => {
            setDeletingProductId(productId);
        };

        const handleDeleteConfirm = () => {
            if (deletingProductId) {
                onDeleteProduct(deletingProductId);
            }
            setDeletingProductId(null);
        };
        
        const productsWithMetrics = useMemo(() => {
            const now = new Date();
            
            // Determine historical period based on goals.turnoverPeriod
            let periodDays = 30;
            switch(goals.turnoverPeriod) {
                case TurnoverPeriod.MONTHLY: periodDays = 30; break;
                case TurnoverPeriod.BIMONTHLY: periodDays = 60; break;
                case TurnoverPeriod.QUARTERLY: periodDays = 90; break;
                case TurnoverPeriod.SEMIANNUAL: periodDays = 180; break;
                case TurnoverPeriod.ANNUAL: periodDays = 365; break;
            }

            const startDate = new Date();
            startDate.setDate(now.getDate() - periodDays);

            const salesInPeriod = ticketSales.filter(sale => new Date(sale.timestamp) >= startDate);

            const productSalesMap = new Map<string, number>();
            salesInPeriod.forEach(sale => sale.items.forEach(item => {
                if (item.type === 'product') {
                    productSalesMap.set(item.item.id, (productSalesMap.get(item.item.id) || 0) + item.quantity);
                }
            }));
            
            
            return products.map(p => {
                let status: ProductStatus;
                const soldQty = productSalesMap.get(p.id) || 0;
                
                // Turnover Rate = Units Sold / Avg Inventory (approximated by current stock for simplicity)
                const turnoverRate = p.stock > 0 ? soldQty / p.stock : soldQty > 0 ? soldQty : 0; // Simple ratio

                // Days of Supply = Stock / Daily Sales Rate
                const dailyRate = soldQty / periodDays;
                const daysOfSupply = dailyRate > 0 ? p.stock / dailyRate : (p.stock > 0 ? Infinity : 0);

                // Status classification based on days of supply
                if (p.stock <= 0) {
                    status = ProductStatus.RUPTURA;
                } else if (daysOfSupply === Infinity) {
                    status = ProductStatus.EXCESSO; // Stock but no sales
                } else if (daysOfSupply <= goals.stockThresholds.riskMin) {
                    status = ProductStatus.RUPTURA; // Close to 0
                } else if (daysOfSupply <= goals.stockThresholds.riskMax) {
                    status = ProductStatus.RISCO;
                } else if (daysOfSupply <= goals.stockThresholds.safetyMax) {
                    status = ProductStatus.SEGURANCA;
                } else {
                    status = ProductStatus.EXCESSO;
                }
                
                // --- STRATEGIC PRICING CALCULATIONS ---
                
                // 1. Real Margin (Net Profit on Sale)
                // Price - Cost - Taxes - Worst Case Fees (Credit Installment)
                const taxAmount = p.price * (goals.effectiveTaxRate / 100);
                const maxFeeAmount = p.price * (goals.feeCreditInstallment / 100);
                const realMarginValue = p.price - p.cost - taxAmount - maxFeeAmount;
                const realMarginPercent = p.price > 0 ? (realMarginValue / p.price) * 100 : 0;

                // 2. Floor Price (PROFIT LOCK)
                // Floor Price = Cost / (1 - (Tax% + Fee% + MinMargin%))
                // This guarantees the minimum required contribution margin.
                const requiredMarginDecimal = goals.minContributionMargin / 100;
                const taxDecimal = goals.effectiveTaxRate / 100;
                const feeDecimal = goals.feeCreditInstallment / 100;
                
                const denominator = 1 - (taxDecimal + feeDecimal + requiredMarginDecimal);
                // If denominator is 0 or negative, it means costs+margin > 100%, impossible to price without loss. Handle gracefully.
                const floorPrice = (denominator > 0) ? p.cost / denominator : 0;

                return { 
                    ...p, 
                    status, 
                    daysOfSupply,
                    turnoverRate, 
                    realMarginPercent,
                    floorPrice
                };
            });

        }, [products, ticketSales, goals]);

        
        const filteredProducts = useMemo(() => {
            return productsWithMetrics.filter(product => {
                const lowerCaseSearch = searchTerm.toLowerCase();
                
                const matchesSearch = lowerCaseSearch === '' ||
                    product.barcode.toLowerCase().includes(lowerCaseSearch) ||
                    product.name.toLowerCase().includes(lowerCaseSearch) ||
                    product.brand.toLowerCase().includes(lowerCaseSearch) ||
                    product.model.toLowerCase().includes(lowerCaseSearch) ||
                    (product.location && product.location.toLowerCase().includes(lowerCaseSearch));

                const matchesMinMargin = minMargin === '' || product.realMarginPercent >= parseFloat(minMargin);
                const matchesMaxMargin = maxMargin === '' || product.realMarginPercent <= parseFloat(maxMargin);

                const matchesStatus = statusFilter === 'All' || product.status === statusFilter;

                return matchesSearch && matchesMinMargin && matchesMaxMargin && matchesStatus;
            });
        }, [productsWithMetrics, searchTerm, minMargin, maxMargin, statusFilter]);

        useEffect(() => {
            setCurrentPage(1);
        }, [searchTerm, minMargin, maxMargin, statusFilter]);

        const indexOfLastRecord = currentPage * recordsPerPage;
        const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
        const currentRecords = filteredProducts.slice(indexOfFirstRecord, indexOfLastRecord);
        const nPages = Math.ceil(filteredProducts.length / recordsPerPage);

        const nextPage = () => {
            if (currentPage < nPages) setCurrentPage(currentPage + 1);
        };
        const prevPage = () => {
            if (currentPage > 1) setCurrentPage(currentPage - 1);
        };

        return (
            <div className="container mx-auto">
                {isModalOpen && <ProductModal 
                    productToEdit={editingProduct} 
                    existingProducts={products} // Pass existing products for duplicate check
                    onClose={handleCloseModal} 
                    onSave={handleSaveProduct} 
                />}
                {deletingProductId && (
                    <ConfirmationModal
                        message="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
                        onConfirm={handleDeleteConfirm}
                        onCancel={() => setDeletingProductId(null)}
                    />
                )}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Produtos</h1>
                    <button onClick={handleOpenCreateModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md">+ Produto</button>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg mb-6 flex flex-col gap-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-grow min-w-[200px]">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar</label>
                            <input
                                type="text"
                                placeholder="Cód., Nome, Marca, Modelo, Local..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                            />
                        </div>
                        <div className="flex items-end gap-2 w-full sm:w-auto">
                            <div className="w-1/2 sm:w-auto">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Margem Mín</label>
                                <input
                                    type="number"
                                    placeholder="%"
                                    value={minMargin}
                                    onChange={(e) => setMinMargin(e.target.value)}
                                    className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                                />
                            </div>
                            <div className="w-1/2 sm:w-auto">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Máx</label>
                                <input
                                    type="number"
                                    placeholder="%"
                                    value={maxMargin}
                                    onChange={(e) => setMaxMargin(e.target.value)}
                                    className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t dark:border-gray-700 overflow-x-auto pb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Status:</span>
                        {(['All', ...Object.values(ProductStatus)]).map(status => (
                            <button key={status} onClick={() => setStatusFilter(status as ProductStatus | 'All')} className={`px-3 py-1 text-sm rounded-full flex-shrink-0 ${statusFilter === status ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'}`}>
                                {status === 'All' ? 'Todos' : status}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Produto</th>
                                    <th scope="col" className="px-6 py-3">Preço</th>
                                    <th scope="col" className="px-6 py-3 hidden md:table-cell">Custo</th>
                                    <th scope="col" className="px-6 py-3 hidden lg:table-cell" title="Lucro Real">Margem</th>
                                    <th scope="col" className="px-6 py-3">Qtd.</th>
                                    <th scope="col" className="px-6 py-3 hidden lg:table-cell" title="Giro">Giro</th>
                                    <th scope="col" className="px-6 py-3" title="Status">Status</th>
                                    <th scope="col" className="px-6 py-3 hidden xl:table-cell" title="Preço Piso">Piso</th>
                                    <th scope="col" className="px-6 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-8 text-gray-500">
                                            Nenhum produto encontrado para os filtros aplicados.
                                        </td>
                                    </tr>
                                ) : (
                                    currentRecords.map(product => {
                                        return (
                                        <tr key={product.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">{product.brand} {product.model}</div>
                                                <div className="text-xs text-gray-500 truncate max-w-[150px]">{product.barcode}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">R$ {formatCurrencyNumber(product.price)}</td>
                                            <td className="px-6 py-4 hidden md:table-cell whitespace-nowrap">R$ {formatCurrencyNumber(product.cost)}</td>
                                            <td className={`px-6 py-4 hidden lg:table-cell font-bold ${product.realMarginPercent < goals.minContributionMargin ? 'text-red-600' : 'text-green-600'}`}>
                                                {product.realMarginPercent.toFixed(1)}%
                                            </td>
                                            <td className="px-6 py-4 font-bold">{product.stock}</td>
                                            <td className="px-6 py-4 hidden lg:table-cell text-blue-500 font-medium">{product.turnoverRate.toFixed(2)}x</td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={product.status} days={product.daysOfSupply} />
                                            </td>
                                            <td className="px-6 py-4 hidden xl:table-cell">
                                                <div className="font-bold text-gray-700 dark:text-gray-300">R$ {formatCurrencyNumber(product.floorPrice)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button onClick={() => handleOpenEditModal(product)} className="text-indigo-600 dark:text-indigo-400 hover:underline mr-3 font-medium">Editar</button>
                                                <button onClick={() => handleDeleteRequest(product.id)} className="text-red-600 dark:text-red-400 hover:underline font-medium">Excluir</button>
                                            </td>
                                        </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {nPages > 1 && (
                        <div className="p-4 flex justify-between items-center flex-wrap gap-2">
                            <span className="text-sm text-gray-700 dark:text-gray-400">
                                Pág {currentPage} de {nPages}
                            </span>
                            <div className="flex space-x-2">
                                <button
                                    onClick={prevPage}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    Ant
                                </button>
                                <button
                                    onClick={nextPage}
                                    disabled={currentPage === nPages || nPages === 0}
                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    Prox
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    export default Products;
    