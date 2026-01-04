
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
            <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-100">
                <div className="relative w-full max-w-lg p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                        <div className="p-4 text-center">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scanner de Código de Barras</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Aponte a câmera para o código</p>
                        </div>
                        
                        <div className="relative aspect-4/3 bg-black">
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

    const Tooltip: React.FC<{ text: React.ReactNode }> = ({ text }) => {
        const [isModalOpen, setIsModalOpen] = useState(false);

        const handleOpen = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsModalOpen(true);
        };

        const handleClose = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsModalOpen(false);
        };

        const handleContentClick = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
        };

        return (
            <>
                <div className="group relative inline-block ml-2 align-middle">
                    <button
                        type="button"
                        onClick={handleOpen}
                        className="text-gray-400 hover:text-indigo-500 transition-colors focus:outline-none cursor-help p-1"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                    
                    {/* Desktop Hover Tooltip - CSS Controlled */}
                    <div className="hidden md:group-hover:block absolute bottom-full right-0 mb-2 w-48 p-3 bg-gray-900 text-white text-[10px] rounded-lg shadow-xl z-50 text-center leading-relaxed pointer-events-none">
                        {text}
                    </div>
                </div>

                {/* Mobile/Tablet Modal */}
                {isModalOpen && (
                    <div 
                        className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm md:hidden"
                        onClick={handleClose}
                    >
                        <div 
                            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl max-w-xs w-full text-center relative border border-gray-200 dark:border-gray-700 animate-fade-in"
                            onClick={handleContentClick}
                        >
                             <div className="mb-4 text-indigo-600 dark:text-indigo-400 flex justify-center">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Detalhes</h4>
                            <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                                {text}
                            </div>
                            <button 
                                type="button"
                                onClick={handleClose}
                                className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-md active:scale-95 transform"
                            >
                                Entendi
                            </button>
                        </div>
                    </div>
                )}
            </>
        );
    };

    interface ProductModalProps {
        productToEdit?: Product | null;
        existingProducts: Product[]; 
        goals: KpiGoals; // Added goals for access control
        onClose: () => void;
        onSave: (productData: Omit<Product, 'stock' | 'lastSold'> | Product, adjustmentReason?: string) => void;
    }

    const ProductModal: React.FC<ProductModalProps> = ({ productToEdit, existingProducts, goals, onClose, onSave }) => {
        const [barcode, setBarcode] = useState('');
        const [brand, setBrand] = useState('');
        const [model, setModel] = useState('');
        const [category, setCategory] = useState(''); 
        const [location, setLocation] = useState('');
        const [price, setPrice] = useState('');
        const [requiresUniqueIdentifier, setRequiresUniqueIdentifier] = useState(false);
        const [publishToWeb, setPublishToWeb] = useState(false); // Default FALSE now
        const [image, setImage] = useState<string>(''); // Base64 image
        const [averageCost, setAverageCost] = useState('');
        const [isScannerOpen, setIsScannerOpen] = useState(false);
        const [isProcessingImage, setIsProcessingImage] = useState(false);
        
        // Ecommerce Pricing
        const [ecomPriceSold, setEcomPriceSold] = useState('');
        const [ecomInstallmentCount, setEcomInstallmentCount] = useState(12);
        const [ecomPriceCash, setEcomPriceCash] = useState('');
        
        const [errors, setErrors] = useState<{ barcode?: string }>({});
        const [stock, setStock] = useState(0);
        const [adjustmentReason, setAdjustmentReason] = useState('');
        
        // E-commerce Check
        const hasEcommerceAccess = goals.googleBusiness?.hasExternalEcommerce === true;

        const imageInputRef = useRef<HTMLInputElement>(null);

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

        // --- Pricing Suggestion Helpers ---
        const calculateTargetPrice = (costVal: number) => {
            if (!costVal) return 0;
            const taxDecimal = goals.effectiveTaxRate / 100;
            const feeDecimal = goals.feeCreditInstallment / 100;
            const targetMarginDecimal = goals.predictedAvgMargin / 100;
            const denominator = 1 - (taxDecimal + feeDecimal + targetMarginDecimal);
            return denominator > 0 ? costVal / denominator : 0;
        };

        const calculateCashPrice = (listPrice: number) => {
            const discountPercent = Math.max(0, goals.feeCreditInstallment - goals.feePix);
            return listPrice * (1 - discountPercent / 100);
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
                setPublishToWeb(productToEdit.publishToWeb || false); 
                setImage(productToEdit.image || '');
                setAverageCost(formatMoney((productToEdit.cost * 100).toFixed(0)));
                
                // Load existing Ecom Details OR Calculate Defaults based on existing price
                if (productToEdit.ecommerceDetails) {
                    setEcomPriceSold(formatMoney((productToEdit.ecommerceDetails.priceSold * 100).toFixed(0)));
                    setEcomPriceCash(formatMoney((productToEdit.ecommerceDetails.priceCash * 100).toFixed(0)));
                    setEcomInstallmentCount(productToEdit.ecommerceDetails.installmentCount);
                } else {
                    // Default Logic if enabled but no data yet
                    const target = calculateTargetPrice(productToEdit.cost);
                    setEcomPriceSold(formatMoney((target * 100).toFixed(0)));
                    
                    const cash = calculateCashPrice(target > 0 ? target : productToEdit.price);
                    setEcomPriceCash(formatMoney((cash * 100).toFixed(0)));
                    setEcomInstallmentCount(12);
                }
            } else {
                setBarcode('');
                setBrand('');
                setModel('');
                setCategory('');
                setLocation('');
                setPrice('');
                setStock(0);
                setAdjustmentReason('');
                setRequiresUniqueIdentifier(false);
                setPublishToWeb(false);
                setImage('');
                setAverageCost('');
                setEcomPriceSold('');
                setEcomPriceCash('');
                setEcomInstallmentCount(12);
            }
            setErrors({});
        }, [productToEdit]);

        // Auto-fill suggestions when creating new product or changing cost
        useEffect(() => {
             // Only auto-suggest if fields are empty or user is actively editing cost
             if (!productToEdit && averageCost) {
                 const costVal = parseCurrency(averageCost);
                 const target = calculateTargetPrice(costVal);
                 
                 // If Sold price is empty, fill it
                 if (!ecomPriceSold) setEcomPriceSold(formatMoney((target * 100).toFixed(0)));
                 
                 // If Cash price is empty, calculate based on Target
                 if (!ecomPriceCash) {
                     const cash = calculateCashPrice(target);
                     setEcomPriceCash(formatMoney((cash * 100).toFixed(0)));
                 }
             }
        }, [averageCost]);

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

        const compressImage = (file: File): Promise<string> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target?.result as string;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 800; // Limit to 800px for storage efficiency
                        const MAX_HEIGHT = 800;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0, width, height);
                        
                        // Compress to JPEG 70% quality
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                        resolve(dataUrl);
                    };
                    img.onerror = (err) => reject(err);
                };
                reader.onerror = (err) => reject(err);
            });
        };

        const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files[0]) {
                setIsProcessingImage(true);
                try {
                    const base64 = await compressImage(e.target.files[0]);
                    setImage(base64);
                } catch (e) {
                    alert("Erro ao processar imagem.");
                } finally {
                    setIsProcessingImage(false);
                }
            }
        };

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
                id: barcode, 
                barcode,
                brand: formattedBrand,
                model: formattedModel,
                name: `${formattedBrand} ${formattedModel}`,
                category: formattedCategory as string, // Cast as string to allow custom categories
                location,
                price: parseCurrency(price),
                requiresUniqueIdentifier,
                publishToWeb: hasEcommerceAccess ? publishToWeb : false, // Force false if no access
                image: (hasEcommerceAccess && publishToWeb) ? image : undefined, // Only save image if enabled
                ecommerceDetails: (hasEcommerceAccess && publishToWeb) ? {
                    priceSold: parseCurrency(ecomPriceSold),
                    priceCash: parseCurrency(ecomPriceCash),
                    installmentCount: ecomInstallmentCount
                } : undefined
            };

            if (productToEdit) {
                const updatedProduct = {
                    ...productToEdit,
                    ...commonData,
                    cost: parseCurrency(averageCost),
                    stock, 
                };
                onSave(updatedProduct, adjustmentReason);
            } else {
                const newProductData = {
                    ...commonData,
                    cost: 0, 
                } as Product; // Explicit cast for new product creation
                onSave(newProductData);
            }
        };
        
        const isSaveDisabled = Object.keys(errors).length > 0 || isProcessingImage;

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
                        
                        {/* Toggles */}
                        <div className="space-y-2">
                            {/* E-commerce Toggle & Image - Restricted */}
                            {hasEcommerceAccess ? (
                                <div className={`space-y-4 bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-lg border ${publishToWeb ? 'border-indigo-300 dark:border-indigo-700' : 'border-gray-200 dark:border-gray-600'}`}>
                                    <div className="flex items-center space-x-2">
                                        <input 
                                            type="checkbox" 
                                            id="publishToWeb" 
                                            checked={publishToWeb} 
                                            onChange={e => setPublishToWeb(e.target.checked)} 
                                            className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <label htmlFor="publishToWeb" className="text-sm font-bold text-gray-800 dark:text-white flex items-center">
                                            Exibir na Loja Online?
                                            <Tooltip text="Se marcado e o produto tiver estoque (>0), ele aparecerá na vitrine." />
                                        </label>
                                    </div>
                                    
                                    {publishToWeb && (
                                        <div className="pl-2 space-y-4 animate-fade-in">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-1">
                                                        Preço Parcelado (De) <Tooltip text="Valor base para cálculo de parcelas. Sugestão: Preço Alvo." />
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={ecomPriceSold} 
                                                        onChange={e => handleCurrencyChange(e.target.value, setEcomPriceSold)} 
                                                        className="w-full rounded bg-white dark:bg-gray-700 border border-indigo-200 dark:border-indigo-700 p-2 text-sm focus:ring-indigo-500"
                                                        placeholder="R$ 0,00"
                                                    />
                                                </div>
                                                <div>
                                                     <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-1">Max. Parcelas</label>
                                                     <select 
                                                        value={ecomInstallmentCount} 
                                                        onChange={e => setEcomInstallmentCount(Number(e.target.value))}
                                                        className="w-full rounded bg-white dark:bg-gray-700 border border-indigo-200 dark:border-indigo-700 p-2 text-sm"
                                                     >
                                                         {[1,2,3,4,5,6,7,8,9,10,11,12].map((n: number) => <option key={n} value={n}>{n}x sem juros</option>)}
                                                     </select>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-bold text-green-700 dark:text-green-400 mb-1">
                                                        Preço à Vista (Pix) <Tooltip text="Valor com desconto máximo para atrair vendas à vista." />
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={ecomPriceCash} 
                                                        onChange={e => handleCurrencyChange(e.target.value, setEcomPriceCash)} 
                                                        className="w-full rounded bg-white dark:bg-gray-700 border border-green-200 dark:border-green-800 p-2 text-sm font-bold text-green-700 dark:text-green-400 focus:ring-green-500"
                                                        placeholder="R$ 0,00"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Imagem do Produto (Opcional)</label>
                                                <div className="flex items-center gap-3">
                                                    {image && (
                                                        <div className="relative w-16 h-16 rounded border overflow-hidden shrink-0 group">
                                                            <img src={image} alt="Preview" className="w-full h-full object-cover"/>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setImage('')} 
                                                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold text-xs"
                                                            >
                                                                X
                                                            </button>
                                                        </div>
                                                    )}
                                                    <button 
                                                        type="button"
                                                        onClick={() => imageInputRef.current?.click()}
                                                        disabled={isProcessingImage}
                                                        className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                                    >
                                                        {isProcessingImage ? 'Processando...' : (image ? 'Trocar Foto' : 'Adicionar Foto')}
                                                    </button>
                                                    <input 
                                                        type="file" 
                                                        ref={imageInputRef} 
                                                        onChange={handleImageChange} 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-gray-100 dark:bg-gray-700/30 p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 opacity-60">
                                    <div className="flex items-center space-x-2">
                                        <input type="checkbox" disabled className="h-5 w-5 rounded border-gray-300 bg-gray-200 cursor-not-allowed" />
                                        <span className="text-sm font-medium text-gray-500">Exibir na Loja Online? (Requer plano E-commerce)</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                                <input 
                                    type="checkbox" 
                                    id="uniqueIdentifier" 
                                    checked={requiresUniqueIdentifier} 
                                    onChange={e => setRequiresUniqueIdentifier(e.target.checked)} 
                                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="uniqueIdentifier" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                                    Exigir identificador único na venda?
                                    <Tooltip text="O sistema solicitará Serial/IMEI único de cada unidade no momento da venda." />
                                </label>
                            </div>
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
        initialFilterLowMargin?: boolean; // NEW PROP
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


    const Products: React.FC<ProductsProps> = ({ products, ticketSales, onAddProduct, onUpdateProduct, onDeleteProduct, goals, initialFilterLowMargin }) => {
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [editingProduct, setEditingProduct] = useState<Product | null>(null);
        const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
        const [searchTerm, setSearchTerm] = useState('');
        const [minMargin, setMinMargin] = useState('');
        const [maxMargin, setMaxMargin] = useState('');
        const [statusFilter, setStatusFilter] = useState<ProductStatus | 'All'>('All');
        const [currentPage, setCurrentPage] = useState(1);
        const recordsPerPage = 15;

        // Effect to apply initial filter if prop is true
        useEffect(() => {
            if (initialFilterLowMargin) {
                // Set max margin to minimum acceptable margin to show only low margin products
                setMaxMargin(goals.minContributionMargin.toString());
            }
        }, [initialFilterLowMargin, goals.minContributionMargin]);


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

                // 2. Floor Price (PROFIT LOCK) & Target Price (GROWTH)
                const taxDecimal = goals.effectiveTaxRate / 100;
                const feeDecimal = goals.feeCreditInstallment / 100;
                const minMarginDecimal = goals.minContributionMargin / 100;
                const targetMarginDecimal = goals.predictedAvgMargin / 100;
                
                // Denominators
                const floorDenominator = 1 - (taxDecimal + feeDecimal + minMarginDecimal);
                const targetDenominator = 1 - (taxDecimal + feeDecimal + targetMarginDecimal);

                // Calculations (Avoid division by zero or negative denominator)
                const floorPrice = (floorDenominator > 0) ? p.cost / floorDenominator : 0;
                const targetPrice = (targetDenominator > 0) ? p.cost / targetDenominator : 0;

                return { 
                    ...p, 
                    status, 
                    daysOfSupply,
                    turnoverRate, 
                    realMarginPercent,
                    floorPrice,
                    targetPrice
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
                    existingProducts={products} 
                    goals={goals} // Pass Goals
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
                        <div className="grow min-w-50">
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
                            <button key={status} onClick={() => setStatusFilter(status as ProductStatus | 'All')} className={`px-3 py-1 text-sm rounded-full shrink-0 ${statusFilter === status ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'}`}>
                                {status === 'All' ? 'Todos' : status}
                            </button>
                        ))}
                        {initialFilterLowMargin && (
                            <button onClick={() => { setMaxMargin(''); }} className="px-3 py-1 text-sm rounded-full bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 ml-auto">
                                Limpar Filtro de Risco
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3 min-w-200px">Produto</th>
                                    <th scope="col" className="px-6 py-3 whitespace-nowrap">Preço</th>
                                    <th scope="col" className="px-6 py-3 whitespace-nowrap">Custo</th>
                                    <th scope="col" className="px-6 py-3 whitespace-nowrap" title="Lucro Real">Margem</th>
                                    <th scope="col" className="px-6 py-3 whitespace-nowrap">Qtd.</th>
                                    <th scope="col" className="px-6 py-3 whitespace-nowrap" title="Giro">Giro</th>
                                    <th scope="col" className="px-6 py-3 whitespace-nowrap" title="Status">Status</th>
                                    <th scope="col" className="px-6 py-3 text-right whitespace-nowrap">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-8 text-gray-500">
                                            Nenhum produto encontrado para os filtros aplicados.
                                        </td>
                                    </tr>
                                ) : (
                                    currentRecords.map(product => {
                                        // Margin Color Logic
                                        let marginColorClass = 'text-green-600 dark:text-green-400';
                                        if (product.realMarginPercent < 0) {
                                            marginColorClass = 'text-gray-900 dark:text-white font-black bg-red-100 dark:bg-red-900/50 rounded px-1'; // Black/Warning for Negative
                                        } else if (product.realMarginPercent < goals.minContributionMargin) {
                                            marginColorClass = 'text-red-600 dark:text-red-400 font-bold'; // Below Minimum
                                        } else if (product.realMarginPercent < goals.predictedAvgMargin) {
                                            marginColorClass = 'text-yellow-600 dark:text-yellow-400 font-bold'; // Below Target
                                        }

                                        return (
                                        <tr key={product.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                    {product.brand} {product.model}
                                                    {product.publishToWeb && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 rounded" title="Visível Online">WEB</span>}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate max-w-37.5">{product.barcode}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">R$ {formatCurrencyNumber(product.price)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">R$ {formatCurrencyNumber(product.cost)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <span className={marginColorClass}>
                                                        {product.realMarginPercent.toFixed(1)}%
                                                    </span>
                                                    <Tooltip text={
                                                        <>
                                                            <div className="mb-1 font-bold text-indigo-300">Sugestão de Preços</div>
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-gray-400">Piso (Mín):</span>
                                                                <span className="text-white">R$ {formatCurrencyNumber(product.floorPrice)}</span>
                                                            </div>
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-gray-400">Alvo (Meta):</span>
                                                                <span className="text-green-400">R$ {formatCurrencyNumber(product.targetPrice)}</span>
                                                            </div>
                                                        </>
                                                    } />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold whitespace-nowrap">{product.stock}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-blue-500 font-medium">{product.turnoverRate.toFixed(2)}x</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge status={product.status!} days={product.daysOfSupply!} />
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
