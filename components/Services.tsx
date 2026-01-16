
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Service, KpiGoals } from '../types';
import { formatCurrencyNumber, formatMoney, formatName } from '../validation';

// --- COMPONENTS ---

interface ModalProps {
    isOpen: boolean;
    type: 'success' | 'error';
    message: string;
    onClose: () => void;
}

const NotificationModal: React.FC<ModalProps> = ({ isOpen, type, message, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-fade-in">
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
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Informação</h4>
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

interface ServiceModalProps {
    serviceToEdit?: Service | null;
    existingServices: Service[];
    onClose: () => void;
    onSave: (serviceData: Omit<Service, 'id'> | Service) => void;
    goals: KpiGoals;
}

const ServiceModal: React.FC<ServiceModalProps> = ({ serviceToEdit, existingServices, onClose, onSave, goals }) => {
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [price, setPrice] = useState('');
    const [partCost, setPartCost] = useState('');
    const [serviceCost, setServiceCost] = useState('');
    const [shippingCost, setShippingCost] = useState('');
    
    // E-commerce States
    const [publishToWeb, setPublishToWeb] = useState(false);
    const [image, setImage] = useState<string>('');
    const [ecomPriceSold, setEcomPriceSold] = useState('');
    const [ecomInstallmentCount, setEcomInstallmentCount] = useState(12);
    const [ecomPriceCash, setEcomPriceCash] = useState('');
    const [isProcessingImage, setIsProcessingImage] = useState(false);

    const [notification, setNotification] = useState<{isOpen: boolean; type: 'success' | 'error'; message: string}>({
        isOpen: false, type: 'error', message: ''
    });

    const imageInputRef = useRef<HTMLInputElement>(null);
    const hasEcommerceAccess = goals.googleBusiness?.hasExternalEcommerce === true;

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

    const calculateCashPrice = (listPrice: number) => {
        const discountPercent = Math.max(0, goals.feeCreditInstallment - goals.feePix);
        return listPrice * (1 - discountPercent / 100);
    };

    useEffect(() => {
        if (serviceToEdit) {
            setName(serviceToEdit.name);
            setBrand(serviceToEdit.brand);
            setModel(serviceToEdit.model);
            setPrice(formatMoney((serviceToEdit.price * 100).toFixed(0)));
            setPartCost(formatMoney((serviceToEdit.partCost * 100).toFixed(0)));
            setServiceCost(formatMoney((serviceToEdit.serviceCost * 100).toFixed(0)));
            setShippingCost(formatMoney((serviceToEdit.shippingCost * 100).toFixed(0)));
            
            setPublishToWeb(serviceToEdit.publishToWeb || false);
            setImage(serviceToEdit.image || '');
            
            if (serviceToEdit.ecommerceDetails) {
                setEcomPriceSold(formatMoney((serviceToEdit.ecommerceDetails.priceSold * 100).toFixed(0)));
                setEcomPriceCash(formatMoney((serviceToEdit.ecommerceDetails.priceCash * 100).toFixed(0)));
                setEcomInstallmentCount(serviceToEdit.ecommerceDetails.installmentCount);
            } else {
                setEcomPriceSold(formatMoney((serviceToEdit.price * 100).toFixed(0)));
                setEcomPriceCash(formatMoney((calculateCashPrice(serviceToEdit.price) * 100).toFixed(0)));
                setEcomInstallmentCount(12);
            }
        } else {
            setName('');
            setBrand('');
            setModel('');
            setPrice('');
            setPartCost('');
            setServiceCost('');
            setShippingCost('');
            setPublishToWeb(false);
            setImage('');
            setEcomPriceSold('');
            setEcomPriceCash('');
            setEcomInstallmentCount(12);
        }
    }, [serviceToEdit]);

    useEffect(() => {
        if (!serviceToEdit && price) {
            const priceVal = parseCurrency(price);
            if (!ecomPriceSold) setEcomPriceSold(formatMoney((priceVal * 100).toFixed(0)));
            if (!ecomPriceCash) setEcomPriceCash(formatMoney((calculateCashPrice(priceVal) * 100).toFixed(0)));
        }
    }, [price]);
    
    const checkDuplicates = (currentName: string, currentBrand: string, currentModel: string) => {
        const cleanName = formatName(currentName).toLowerCase();
        const cleanBrand = formatName(currentBrand).toLowerCase();
        const cleanModel = formatName(currentModel).toLowerCase();

        if (!cleanName || !cleanBrand || !cleanModel) return false;

        // FIX: Ensure existingServices is an array
        const list = existingServices || [];

        return list.some(s => 
            s.name.toLowerCase() === cleanName &&
            s.brand.toLowerCase() === cleanBrand &&
            s.model.toLowerCase() === cleanModel &&
            (!serviceToEdit || s.id !== serviceToEdit.id) 
        );
    };

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800; 
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
                setNotification({ isOpen: true, type: 'error', message: "Erro ao processar imagem." });
            } finally {
                setIsProcessingImage(false);
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const formattedBrand = formatName(brand);

        if (checkDuplicates(name, formattedBrand, model)) {
            setNotification({ 
                isOpen: true, 
                type: 'error', 
                message: 'Este serviço (Tipo + Marca + Modelo) já está cadastrado.' 
            });
            return;
        }

        const payload = {
            name: formatName(name),
            brand: formattedBrand,
            model: formatName(model),
            price: parseCurrency(price),
            partCost: parseCurrency(partCost),
            serviceCost: parseCurrency(serviceCost),
            shippingCost: parseCurrency(shippingCost),
            // E-commerce Data
            publishToWeb: hasEcommerceAccess ? publishToWeb : false,
            image: (hasEcommerceAccess && publishToWeb) ? image : undefined,
            ecommerceDetails: (hasEcommerceAccess && publishToWeb) ? {
                priceSold: parseCurrency(ecomPriceSold),
                priceCash: parseCurrency(ecomPriceCash),
                installmentCount: ecomInstallmentCount
            } : undefined
        };

        if (serviceToEdit) {
            onSave({ ...serviceToEdit, ...payload });
        } else {
            onSave(payload);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <NotificationModal 
                isOpen={notification.isOpen} 
                type={notification.type} 
                message={notification.message} 
                onClose={() => setNotification({ ...notification, isOpen: false })} 
            />

            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">{serviceToEdit ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Tipo de Serviço</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            onBlur={() => setName(formatName(name))} 
                            required 
                            placeholder="Ex: Troca de Tela, Troca de Bateria"
                            className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                        />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium">Marca</label>
                            <input 
                                type="text" 
                                value={brand} 
                                onChange={e => setBrand(e.target.value)} 
                                onBlur={() => setBrand(formatName(brand))} 
                                required 
                                className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Modelo</label>
                            <input 
                                type="text" 
                                value={model} 
                                onChange={e => setModel(e.target.value)} 
                                onBlur={() => setModel(formatName(model))} 
                                required 
                                className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium">Preço Base (Balcão) (R$)</label>
                        <input type="text" value={price} onChange={e => handleCurrencyChange(e.target.value, setPrice)} required className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"/>
                    </div>

                    {/* E-COMMERCE SECTION */}
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
                                    <Tooltip text="Permite que o cliente contrate ou agende este serviço pelo site." />
                                </label>
                            </div>
                            
                            {publishToWeb && (
                                <div className="pl-2 space-y-4 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-1">
                                                Preço Parcelado (De)
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
                                                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x sem juros</option>)}
                                                </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-green-700 dark:text-green-400 mb-1">
                                                Preço à Vista (Pix)
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
                                        <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Imagem Representativa (Opcional)</label>
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
                                    <div className="text-xs text-indigo-700 dark:text-indigo-300 italic">
                                        ℹ️ A compra do serviço no site gera um pedido pendente. O agendamento deve ser combinado via WhatsApp.
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t dark:border-gray-700">
                        <div>
                           <label className="block text-sm font-medium">Custo da Peça (R$)</label>
                           <input type="text" value={partCost} onChange={e => handleCurrencyChange(e.target.value, setPartCost)} required className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"/>
                        </div>
                        <div>
                           <label className="block text-sm font-medium">Custo do Serviço (R$)</label>
                           <input type="text" value={serviceCost} onChange={e => handleCurrencyChange(e.target.value, setServiceCost)} required className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"/>
                        </div>
                        <div>
                           <label className="block text-sm font-medium">Custo Frete (R$)</label>
                           <input type="text" value={shippingCost} onChange={e => handleCurrencyChange(e.target.value, setShippingCost)} required className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"/>
                        </div>
                    </div>
                    
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                        <button type="submit" disabled={isProcessingImage} className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">Salvar Serviço</button>
                    </div>
                </form>
            </div>
        </div>
    );
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

interface ServicesProps {
    services: Service[];
    onAddService: (serviceData: Omit<Service, 'id'>) => void;
    onUpdateService: (service: Service) => void;
    onDeleteService: (serviceId: string) => void;
    goals: KpiGoals;
}

const Services: React.FC<ServicesProps> = ({ services, onAddService, onUpdateService, onDeleteService, goals }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleOpenCreateModal = () => {
        setEditingService(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (service: Service) => {
        setEditingService(service);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingService(null);
    };

    const handleSaveService = (serviceData: Omit<Service, 'id'> | Service) => {
        if ('id' in serviceData) {
            onUpdateService(serviceData as Service);
        } else {
            onAddService(serviceData as Omit<Service, 'id'>);
        }
        handleCloseModal();
    };

    const handleDeleteRequest = (serviceId: string) => {
        setDeletingServiceId(serviceId);
    };

    const handleDeleteConfirm = () => {
        if (deletingServiceId) {
            onDeleteService(deletingServiceId);
        }
        setDeletingServiceId(null);
    };
    
    const filteredServices = services.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.model.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto">
            {isModalOpen && <ServiceModal 
                serviceToEdit={editingService} 
                existingServices={services} 
                goals={goals}
                onClose={handleCloseModal} 
                onSave={handleSaveService} 
            />}
            {deletingServiceId && (
                <ConfirmationModal
                    message="Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita."
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeletingServiceId(null)}
                />
            )}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Serviços</h1>
                <button onClick={handleOpenCreateModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Adicionar Serviço</button>
            </div>

             <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg mb-6">
                <input
                    type="text"
                    placeholder="Buscar por Tipo, Marca ou Modelo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                />
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Tipo</th>
                                <th scope="col" className="px-6 py-3">Marca</th>
                                <th scope="col" className="px-6 py-3">Modelo</th>
                                <th scope="col" className="px-6 py-3">Preço Balcão</th>
                                <th scope="col" className="px-6 py-3">Custo Total</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredServices.length > 0 ? filteredServices.map(service => {
                                const totalCost = service.partCost + service.serviceCost + service.shippingCost;
                                return (
                                <tr key={service.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                        {service.name}
                                        {(service as any).publishToWeb && <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 rounded" title="Visível Online">WEB</span>}
                                    </td>
                                    <td className="px-6 py-4">{service.brand}</td>
                                    <td className="px-6 py-4">{service.model}</td>
                                    <td className="px-6 py-4 font-bold text-green-600 dark:text-green-400">R$ {formatCurrencyNumber(service.price)}</td>
                                    <td className="px-6 py-4">R$ {formatCurrencyNumber(totalCost)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button onClick={() => handleOpenEditModal(service)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline mr-4">Editar</button>
                                        <button onClick={() => handleDeleteRequest(service.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Excluir</button>
                                    </td>
                                </tr>
                            )}) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-gray-500">
                                        Nenhum serviço encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Services;
