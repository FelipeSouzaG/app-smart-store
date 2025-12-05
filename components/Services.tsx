
import React, { useState, useMemo, useEffect } from 'react';
import { Service, KpiGoals } from '../types';
import { formatCurrencyNumber, formatMoney, formatName } from '../validation';

interface ServiceModalProps {
    serviceToEdit?: Service | null;
    existingServices: Service[];
    onClose: () => void;
    onSave: (serviceData: Omit<Service, 'id'> | Service) => void;
}

const ServiceModal: React.FC<ServiceModalProps> = ({ serviceToEdit, existingServices, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [price, setPrice] = useState('');
    const [partCost, setPartCost] = useState('');
    const [serviceCost, setServiceCost] = useState('');
    const [shippingCost, setShippingCost] = useState('');
    const [duplicateError, setDuplicateError] = useState('');

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
        if (serviceToEdit) {
            setName(serviceToEdit.name);
            setBrand(serviceToEdit.brand);
            setModel(serviceToEdit.model);
            setPrice(formatMoney((serviceToEdit.price * 100).toFixed(0)));
            setPartCost(formatMoney((serviceToEdit.partCost * 100).toFixed(0)));
            setServiceCost(formatMoney((serviceToEdit.serviceCost * 100).toFixed(0)));
            setShippingCost(formatMoney((serviceToEdit.shippingCost * 100).toFixed(0)));
        } else {
            // Reset form
            setName('');
            setBrand('');
            setModel('');
            setPrice('');
            setPartCost('');
            setServiceCost('');
            setShippingCost('');
        }
        setDuplicateError('');
    }, [serviceToEdit]);
    
    // Duplicate Check Logic
    const checkDuplicates = (currentName: string, currentBrand: string, currentModel: string) => {
        const cleanName = formatName(currentName).toLowerCase();
        const cleanBrand = formatName(currentBrand).toLowerCase();
        const cleanModel = formatName(currentModel).toLowerCase();

        if (!cleanName || !cleanBrand || !cleanModel) return false;

        return existingServices.some(s => 
            s.name.toLowerCase() === cleanName &&
            s.brand.toLowerCase() === cleanBrand &&
            s.model.toLowerCase() === cleanModel &&
            (!serviceToEdit || s.id !== serviceToEdit.id) // Ignore self when editing
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setDuplicateError('');
        
        const formattedBrand = formatName(brand);

        if (checkDuplicates(name, formattedBrand, model)) {
            setDuplicateError('Este serviço (Tipo + Marca + Modelo) já está cadastrado.');
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
        };

        if (serviceToEdit) {
            onSave({ ...serviceToEdit, ...payload });
        } else {
            onSave(payload);
        }
    };

    const isSaveDisabled = !!duplicateError;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6">{serviceToEdit ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Tipo de Serviço</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => {
                                setName(e.target.value);
                                setDuplicateError('');
                            }} 
                            onBlur={() => setName(formatName(name))} 
                            required 
                            className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                        />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium">Marca</label>
                            <input 
                                type="text" 
                                value={brand} 
                                onChange={e => {
                                    setBrand(e.target.value);
                                    setDuplicateError('');
                                }} 
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
                                onChange={e => {
                                    setModel(e.target.value);
                                    setDuplicateError('');
                                }} 
                                onBlur={() => setModel(formatName(model))} 
                                required 
                                className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium">Preço Base (R$)</label>
                        <input type="text" value={price} onChange={e => handleCurrencyChange(e.target.value, setPrice)} required className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    
                    {duplicateError && <p className="text-sm text-red-500 font-bold text-center animate-pulse">{duplicateError}</p>}

                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                        <button type="submit" disabled={isSaveDisabled} className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">Salvar Serviço</button>
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
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 15;

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
    
    const filteredServices = useMemo(() => {
        return services.filter(service => {
            const lowerCaseSearch = searchTerm.toLowerCase();
            
            return lowerCaseSearch === '' ||
                service.name.toLowerCase().includes(lowerCaseSearch) ||
                service.brand.toLowerCase().includes(lowerCaseSearch) ||
                service.model.toLowerCase().includes(lowerCaseSearch);
        });
    }, [services, searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredServices.slice(indexOfFirstRecord, indexOfLastRecord);
    const nPages = Math.ceil(filteredServices.length / recordsPerPage);

    const nextPage = () => {
        if (currentPage < nPages) setCurrentPage(currentPage + 1);
    };
    const prevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };


    return (
        <div className="container mx-auto">
            {isModalOpen && <ServiceModal 
                serviceToEdit={editingService} 
                existingServices={services} // Pass existing services for duplicate check
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
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg mb-6 flex flex-wrap items-end gap-4">
                <div className="flex-grow">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar Serviço</label>
                    <input
                        type="text"
                        placeholder="Tipo, Marca ou Modelo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Tipo de Serviço</th>
                                <th scope="col" className="px-6 py-3">Marca / Modelo</th>
                                <th scope="col" className="px-6 py-3">Preço Base</th>
                                <th scope="col" className="px-6 py-3" title="Tributação + Taxas Maquininha">Taxas de Venda</th>
                                <th scope="col" className="px-6 py-3 font-bold" title="Preço Base + Taxas">Preço Final</th>
                                <th scope="col" className="px-6 py-3 font-bold">Margem</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-gray-500">
                                        Nenhum serviço encontrado.
                                    </td>
                                </tr>
                            ) : (
                                currentRecords.map(service => {
                                    // Calculate Tax Amount (Tax + Fee) based on Base Price
                                    const taxPercent = goals.effectiveTaxRate + goals.feeCreditInstallment;
                                    const taxAmount = service.price * (taxPercent / 100);
                                    const finalPrice = service.price + taxAmount;

                                    const totalCost = service.partCost + service.serviceCost + service.shippingCost;
                                    
                                    const realMargin = finalPrice > 0 ? ((service.price - totalCost) / finalPrice) * 100 : 0;

                                    return (
                                    <tr key={service.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{service.name}</td>
                                        <td className="px-6 py-4">
                                            <div>{service.brand}</div>
                                            <div className="text-xs text-gray-500">{service.model}</div>
                                        </td>
                                        <td className="px-6 py-4">R$ {formatCurrencyNumber(service.price)}</td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            R$ {formatCurrencyNumber(taxAmount)} ({taxPercent.toFixed(1)}%)
                                        </td>
                                        <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">R$ {formatCurrencyNumber(finalPrice)}</td>
                                        <td className={`px-6 py-4 font-semibold ${realMargin >= 30 ? 'text-green-500' : 'text-orange-500'}`}>{realMargin.toFixed(1)}%</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button onClick={() => handleOpenEditModal(service)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline mr-4">Editar</button>
                                            <button onClick={() => handleDeleteRequest(service.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Excluir</button>
                                        </td>
                                    </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                 {nPages > 1 && (
                    <div className="p-4 flex justify-between items-center flex-wrap gap-2">
                         <span className="text-sm text-gray-700 dark:text-gray-400">
                            Página {currentPage} de {nPages} ({filteredServices.length} registros)
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

export default Services;
