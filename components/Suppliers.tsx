
import React, { useState, useEffect } from 'react';
import { Supplier } from '../types';
import { formatName, validateName, formatRegister, validateRegister, formatPhone, validatePhone } from '../validation';


interface SupplierModalProps {
    supplierToEdit?: Supplier | null;
    existingSuppliers: Supplier[];
    onClose: () => void;
    onSave: (supplierData: Omit<Supplier, 'id'> | Supplier) => void;
}

const SupplierModal: React.FC<SupplierModalProps> = ({ supplierToEdit, existingSuppliers, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [cnpjCpf, setCnpjCpf] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [phone, setPhone] = useState('');
    const [errors, setErrors] = useState<{ name?: string; cnpjCpf?: string; phone?: string }>({});

    const isEditing = !!supplierToEdit;

    useEffect(() => {
        if (isEditing && supplierToEdit) {
            setName(supplierToEdit.name);
            // Use the correct cnpjCpf field, not the ID (which is now ObjectId)
            setCnpjCpf(formatRegister(supplierToEdit.cnpjCpf));
            setContactPerson(supplierToEdit.contactPerson || '');
            setPhone(formatPhone(supplierToEdit.phone));
        } else {
            setName('');
            setCnpjCpf('');
            setContactPerson('');
            setPhone('');
        }
        setErrors({});
    }, [supplierToEdit, isEditing]);

    const validateForm = () => {
        const newErrors: { name?: string; cnpjCpf?: string; phone?: string } = {};
        
        if (!validateName(name)) newErrors.name = 'Nome inválido.';
        if (!validateRegister(cnpjCpf)) newErrors.cnpjCpf = 'CPF/CNPJ inválido.';
        if (!validatePhone(phone)) newErrors.phone = 'Telefone inválido.';

        // Check for duplicate CNPJ/CPF against existing list
        const cleanDoc = cnpjCpf.replace(/\D/g, '');
        const duplicateDoc = existingSuppliers.find(s => 
            s.cnpjCpf.replace(/\D/g, '') === cleanDoc && 
            (!isEditing || s.id !== supplierToEdit?.id)
        );

        if (duplicateDoc) {
            newErrors.cnpjCpf = 'Este CPF/CNPJ já está cadastrado.';
        }

        // Check for duplicate Phone against existing list
        const cleanPhone = phone.replace(/\D/g, '');
        const duplicatePhone = existingSuppliers.find(s => 
            s.phone.replace(/\D/g, '') === cleanPhone && 
            (!isEditing || s.id !== supplierToEdit?.id)
        );

        if (duplicatePhone) {
            newErrors.phone = 'Este telefone já está cadastrado.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Trigger validation on change for critical fields to give immediate feedback
    useEffect(() => {
        const newErrors = { ...errors };
        let hasUpdates = false;

        if (cnpjCpf) {
             const cleanDoc = cnpjCpf.replace(/\D/g, '');
             if (cleanDoc.length >= 11) {
                 const duplicate = existingSuppliers.find(s => 
                    s.cnpjCpf.replace(/\D/g, '') === cleanDoc && 
                    (!isEditing || s.id !== supplierToEdit?.id)
                );
                if (duplicate) {
                    newErrors.cnpjCpf = 'Este CPF/CNPJ já está cadastrado.';
                    hasUpdates = true;
                } else if (newErrors.cnpjCpf === 'Este CPF/CNPJ já está cadastrado.') {
                    delete newErrors.cnpjCpf;
                    hasUpdates = true;
                }
             }
        }

        if (phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.length >= 10) {
                const duplicate = existingSuppliers.find(s => 
                    s.phone.replace(/\D/g, '') === cleanPhone && 
                    (!isEditing || s.id !== supplierToEdit?.id)
                );
                if (duplicate) {
                    newErrors.phone = 'Este telefone já está cadastrado.';
                    hasUpdates = true;
                } else if (newErrors.phone === 'Este telefone já está cadastrado.') {
                    delete newErrors.phone;
                    hasUpdates = true;
                }
            }
        }

        if (hasUpdates) setErrors(newErrors);
    }, [cnpjCpf, phone, existingSuppliers, isEditing, supplierToEdit]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        const payload = {
            name: formatName(name),
            cnpjCpf: formatRegister(cnpjCpf),
            contactPerson: formatName(contactPerson),
            phone: formatPhone(phone),
        };

        if (isEditing && supplierToEdit) {
            onSave({ ...supplierToEdit, ...payload, id: supplierToEdit.id });
        } else {
            onSave(payload);
        }
    };

    const isSaveDisabled = Object.keys(errors).length > 0 || !name || !cnpjCpf || !phone;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6">{isEditing ? 'Editar Fornecedor' : 'Adicionar Novo Fornecedor'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">CPF/CNPJ</label>
                        <input type="text" value={cnpjCpf} onChange={e => setCnpjCpf(formatRegister(e.target.value))} onBlur={validateForm} required disabled={isEditing} className={`mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2 disabled:opacity-50 ${errors.cnpjCpf ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}/>
                        {errors.cnpjCpf && <p className="text-xs text-red-500 mt-1">{errors.cnpjCpf}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Nome do Fornecedor</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} onBlur={() => { setName(formatName(name)); validateForm(); }} required className={`mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2 ${errors.name ? 'border-red-500' : ''}`}/>
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Telefone</label>
                            <input type="text" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} onBlur={validateForm} required className={`mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2 ${errors.phone ? 'border-red-500' : ''}`}/>
                            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Contato (Opcional)</label>
                            <input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} onBlur={() => setContactPerson(formatName(contactPerson))} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2"/>
                        </div>
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


interface SuppliersProps {
    suppliers: Supplier[];
    onAddSupplier: (supplierData: Omit<Supplier, 'id'>) => void;
    onUpdateSupplier: (supplierData: Supplier) => void;
    onDeleteSupplier: (supplierId: string) => void;
}

const Suppliers: React.FC<SuppliersProps> = ({ suppliers, onAddSupplier, onUpdateSupplier, onDeleteSupplier }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [deletingSupplierId, setDeletingSupplierId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleOpenCreateModal = () => {
        setEditingSupplier(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSupplier(null);
    };

    const handleSaveSupplier = (supplierData: Omit<Supplier, 'id'> | Supplier) => {
        if ('id' in supplierData) {
            onUpdateSupplier(supplierData as Supplier);
        } else {
            onAddSupplier(supplierData as Omit<Supplier, 'id'>);
        }
        handleCloseModal();
    };

    const handleDeleteRequest = (supplierId: string) => {
        setDeletingSupplierId(supplierId);
    };

    const handleDeleteConfirm = () => {
        if (deletingSupplierId) {
            onDeleteSupplier(deletingSupplierId);
        }
        setDeletingSupplierId(null);
    };
    
    const filteredSuppliers = suppliers.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.cnpjCpf && s.cnpjCpf.includes(searchTerm)) ||
        s.phone.includes(searchTerm)
    );

    return (
        <div className="container mx-auto">
            {isModalOpen && <SupplierModal 
                supplierToEdit={editingSupplier} 
                existingSuppliers={suppliers}
                onClose={handleCloseModal} 
                onSave={handleSaveSupplier} 
            />}
            {deletingSupplierId && (
                <ConfirmationModal
                    message="Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita."
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeletingSupplierId(null)}
                />
            )}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Fornecedores</h1>
                <button onClick={handleOpenCreateModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Adicionar Fornecedor</button>
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
                                <th scope="col" className="px-6 py-3">Nome / Razão Social</th>
                                <th scope="col" className="px-6 py-3">CPF / CNPJ</th>
                                <th scope="col" className="px-6 py-3">Telefone</th>
                                <th scope="col" className="px-6 py-3">Contato</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSuppliers.length > 0 ? filteredSuppliers.map(supplier => (
                                <tr key={supplier.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{supplier.name}</td>
                                    <td className="px-6 py-4">{formatRegister(supplier.cnpjCpf)}</td>
                                    <td className="px-6 py-4">{formatPhone(supplier.phone)}</td>
                                    <td className="px-6 py-4">{supplier.contactPerson || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button onClick={() => handleOpenEditModal(supplier)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline mr-4">Editar</button>
                                        <button onClick={() => handleDeleteRequest(supplier.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Excluir</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-gray-500">
                                        Nenhum fornecedor encontrado.
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

export default Suppliers;
