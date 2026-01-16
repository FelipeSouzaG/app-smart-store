
import React, { useState, useMemo, useEffect } from 'react';
import { Customer, TicketSale, ServiceOrder, ServiceOrderStatus } from '../types';
import { formatName, validateName, formatRegister, validateRegister, formatPhone, validatePhone, formatCurrencyNumber } from '../validation';

interface CustomerModalProps {
    customerToEdit?: Customer | null;
    existingCustomers: Customer[];
    onClose: () => void;
    onSave: (customerData: (Omit<Customer, 'id'> & { phone: string }) | Customer) => void;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ customerToEdit, existingCustomers, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [cnpjCpf, setCnpjCpf] = useState('');
    const [errors, setErrors] = useState<{ name?: string; phone?: string; cnpjCpf?: string }>({});

    const isEditing = !!customerToEdit;

    useEffect(() => {
        if (customerToEdit) {
            setName(customerToEdit.name);
            // Use the correct 'phone' field, not the ID
            setPhone(formatPhone(customerToEdit.phone));
            setCnpjCpf(customerToEdit.cnpjCpf ? formatRegister(customerToEdit.cnpjCpf) : '');
        } else {
            setName('');
            setPhone('');
            setCnpjCpf('');
        }
        setErrors({});
    }, [customerToEdit]);

    const validateForm = () => {
        const newErrors: { name?: string; phone?: string; cnpjCpf?: string } = {};
        if (!validateName(name)) newErrors.name = 'Nome inválido.';
        if (!validatePhone(phone)) newErrors.phone = 'Telefone inválido.';
        if (!validateRegister(cnpjCpf)) newErrors.cnpjCpf = 'CPF/CNPJ inválido.';

        // Duplicate checks
        // 1. Phone
        const cleanPhone = phone.replace(/\D/g, '');
        const duplicatePhone = existingCustomers.find(c => {
            const cPhone = c.phone.replace(/\D/g, '');
            return cPhone === cleanPhone && (!isEditing || c.id !== customerToEdit?.id);
        });
        
        if (duplicatePhone) newErrors.phone = 'Telefone já cadastrado para outro cliente.';

        // 2. CNPJ/CPF
        if (cnpjCpf) {
            const cleanInput = cnpjCpf.replace(/\D/g, '');
            
            const duplicateDoc = existingCustomers.find(c => {
                if (!c.cnpjCpf) return false;
                const cleanStored = c.cnpjCpf.replace(/\D/g, '');
                return cleanStored === cleanInput && (!isEditing || c.id !== customerToEdit?.id);
            });

            if (duplicateDoc) newErrors.cnpjCpf = 'CPF/CNPJ já cadastrado para outro cliente.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Real-time validation for duplicates
    useEffect(() => {
        const newErrors = { ...errors };
        let hasUpdates = false;

        if (phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.length >= 10) { 
                const duplicatePhone = existingCustomers.find(c => {
                    const cPhone = c.phone.replace(/\D/g, '');
                    return cPhone === cleanPhone && (!isEditing || c.id !== customerToEdit?.id);
                });

                if (duplicatePhone) {
                    newErrors.phone = 'Telefone já cadastrado.';
                    hasUpdates = true;
                } else if (newErrors.phone === 'Telefone já cadastrado.') {
                    delete newErrors.phone;
                    hasUpdates = true;
                }
            }
        }

        if (cnpjCpf) {
            const cleanInput = cnpjCpf.replace(/\D/g, '');
            if (cleanInput.length >= 11) {
                const duplicateDoc = existingCustomers.find(c => {
                    if (!c.cnpjCpf) return false;
                    const cleanStored = c.cnpjCpf.replace(/\D/g, '');
                    return cleanStored === cleanInput && (!isEditing || c.id !== customerToEdit?.id);
                });

                if (duplicateDoc) {
                    newErrors.cnpjCpf = 'CPF/CNPJ já cadastrado.';
                    hasUpdates = true;
                } else if (newErrors.cnpjCpf === 'CPF/CNPJ já cadastrado.') {
                    delete newErrors.cnpjCpf;
                    hasUpdates = true;
                }
            }
        }

        if (hasUpdates) setErrors(newErrors);
    }, [phone, cnpjCpf, existingCustomers, isEditing, customerToEdit]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        const payload = {
            name: formatName(name),
            phone: formatPhone(phone),
            cnpjCpf: formatRegister(cnpjCpf),
        };

        if (isEditing && customerToEdit) {
            onSave({ ...customerToEdit, ...payload, id: customerToEdit.id });
        } else {
            onSave(payload);
        }
    };

    const isSaveDisabled = Object.keys(errors).length > 0 || !name || !phone;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6">{isEditing ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Telefone (Whatsapp)</label>
                        <input type="text" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} onBlur={validateForm} required className={`mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2 ${errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}/>
                        {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Nome Completo</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} onBlur={() => { setName(formatName(name)); validateForm(); }} required className={`mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2 ${errors.name ? 'border-red-500' : ''}`}/>
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">CPF/CNPJ (Opcional)</label>
                        <input type="text" value={cnpjCpf} onChange={e => setCnpjCpf(formatRegister(e.target.value))} onBlur={validateForm} className={`mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2 ${errors.cnpjCpf ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}/>
                        {errors.cnpjCpf && <p className="text-xs text-red-500 mt-1">{errors.cnpjCpf}</p>}
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300">Cancelar</button>
                        <button type="submit" disabled={isSaveDisabled} className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">Salvar</button>
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


interface CustomersProps {
    customers: Customer[];
    ticketSales: TicketSale[];
    serviceOrders: ServiceOrder[];
    onAddCustomer: (customerData: Omit<Customer, 'id'> & { phone: string }) => void;
    onUpdateCustomer: (customerData: Customer) => void;
    onDeleteCustomer: (customerId: string) => void;
}

const Customers: React.FC<CustomersProps> = ({ customers, ticketSales, serviceOrders, onAddCustomer, onUpdateCustomer, onDeleteCustomer }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const customerData = useMemo(() => {
        return customers.map(customer => {
            const totalPurchases = ticketSales
                .filter(sale => sale.customerId === customer.id)
                .reduce((sum, sale) => sum + sale.total, 0);

            const totalServices = serviceOrders
                .filter(order => order.customerId === customer.id && order.status === ServiceOrderStatus.COMPLETED)
                .reduce((sum, order) => sum + order.totalPrice, 0);

            return { ...customer, totalPurchases, totalServices };
        });
    }, [customers, ticketSales, serviceOrders]);


    const filteredCustomers = useMemo(() => {
         return customerData.filter(c => {
            const lowerSearch = searchTerm.toLowerCase();
            return c.name.toLowerCase().includes(lowerSearch) ||
                   c.phone.includes(lowerSearch) || // Use phone property for search
                   (c.cnpjCpf && c.cnpjCpf.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')));
        });
    }, [customerData, searchTerm]);


    const handleOpenCreateModal = () => {
        setEditingCustomer(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (customer: Customer) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCustomer(null);
    };

    const handleSaveCustomer = (customerData: (Omit<Customer, 'id'> & { phone: string }) | Customer) => {
        if ('id' in customerData && isModalOpen && editingCustomer) { // Check if it's an existing customer
            onUpdateCustomer(customerData as Customer);
        } else {
            onAddCustomer(customerData as Omit<Customer, 'id'> & { phone: string });
        }
        handleCloseModal();
    };

    const handleDeleteRequest = (customerId: string) => {
        setDeletingCustomerId(customerId);
    };

    const handleDeleteConfirm = () => {
        if (deletingCustomerId) {
            onDeleteCustomer(deletingCustomerId);
        }
        setDeletingCustomerId(null);
    };

    return (
        <div className="container mx-auto">
            {isModalOpen && <CustomerModal 
                customerToEdit={editingCustomer}
                existingCustomers={customers} 
                onClose={handleCloseModal} 
                onSave={handleSaveCustomer} 
            />}
            {deletingCustomerId && (
                <ConfirmationModal
                    message="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita e não removerá o histórico de vendas associado."
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeletingCustomerId(null)}
                />
            )}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Clientes</h1>
                <button onClick={handleOpenCreateModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Adicionar Cliente</button>
            </div>

             <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg mb-6">
                <input
                    type="text"
                    placeholder="Buscar por Nome, CPF/CNPJ ou Telefone..."
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
                                <th scope="col" className="px-6 py-3">Nome</th>
                                <th scope="col" className="px-6 py-3">Telefone</th>
                                <th scope="col" className="px-6 py-3">CPF / CNPJ</th>
                                <th scope="col" className="px-6 py-3">Compras (R$)</th>
                                <th scope="col" className="px-6 py-3">Serviços (R$)</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
                                <tr key={customer.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{customer.name}</td>
                                    <td className="px-6 py-4">{formatPhone(customer.phone)}</td>
                                    <td className="px-6 py-4">{customer.cnpjCpf ? formatRegister(customer.cnpjCpf) : 'N/A'}</td>
                                    <td className="px-6 py-4">R$ {formatCurrencyNumber(customer.totalPurchases)}</td>
                                    <td className="px-6 py-4">R$ {formatCurrencyNumber(customer.totalServices)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button onClick={() => handleOpenEditModal(customer)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline mr-4">Editar</button>
                                        <button onClick={() => handleDeleteRequest(customer.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Excluir</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-gray-500">
                                        Nenhum cliente encontrado.
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

export default Customers;
