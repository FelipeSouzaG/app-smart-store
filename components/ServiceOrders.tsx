
import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Service, ServiceOrder, ServiceOrderStatus, KpiGoals, TransactionStatus, FinancialAccount, PaymentMethod } from '../types';
import { formatCurrencyNumber, formatPhone, formatName, validateName, validatePhone, formatRegister } from '../validation';
import { AuthContext } from '../contexts/AuthContext';

interface ServiceOrdersProps {
    services: Service[];
    serviceOrders: ServiceOrder[];
    onAddServiceOrder: (order: any) => Promise<void>;
    onUpdateServiceOrder: (order: ServiceOrder) => Promise<void>;
    onDeleteServiceOrder: (id: string) => Promise<void>;
    onToggleStatus: (id: string, paymentData?: any) => Promise<any>;
    setActivePage: (page: string) => void;
    goals: KpiGoals;
}

const OSStatusBadge: React.FC<{ status: ServiceOrderStatus }> = ({ status }) => {
    const isCompleted = status === ServiceOrderStatus.COMPLETED;
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isCompleted ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
            {status}
        </span>
    );
};

const ServiceOrderModal: React.FC<{ 
    services: Service[]; 
    orderToEdit?: ServiceOrder | null; 
    onClose: () => void; 
    onSave: (data: any) => void;
}> = ({ services, orderToEdit, onClose, onSave }) => {
    const [customerName, setCustomerName] = useState('');
    const [customerWhatsapp, setCustomerWhatsapp] = useState('');
    const [customerCnpjCpf, setCustomerCnpjCpf] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [overridePrice, setOverridePrice] = useState(''); // Allow custom price
    const [overrideCost, setOverrideCost] = useState(''); // Allow custom cost
    const [otherCosts, setOtherCosts] = useState('');
    const [description, setDescription] = useState(''); // Extra details

    useEffect(() => {
        if (orderToEdit) {
            setCustomerName(orderToEdit.customerName);
            setCustomerWhatsapp(formatPhone(orderToEdit.customerWhatsapp));
            setCustomerCnpjCpf(orderToEdit.customerCnpjCpf ? formatRegister(orderToEdit.customerCnpjCpf) : '');
            setSelectedServiceId(orderToEdit.serviceId);
            setOverridePrice((orderToEdit.totalPrice).toFixed(2));
            setOverrideCost((orderToEdit.totalCost).toFixed(2));
            setOtherCosts((orderToEdit.otherCosts || 0).toFixed(2));
            setDescription(orderToEdit.serviceDescription);
        } else {
            setCustomerName('');
            setCustomerWhatsapp('');
            setCustomerCnpjCpf('');
            setSelectedServiceId('');
            setOverridePrice('');
            setOverrideCost('');
            setOtherCosts('');
            setDescription('');
        }
    }, [orderToEdit]);

    // Auto-fill price/cost when service selected
    useEffect(() => {
        if (selectedServiceId && !orderToEdit) {
            const svc = services.find(s => s.id === selectedServiceId);
            if (svc) {
                // Calculate total cost (Part + Service + Shipping)
                const cost = svc.partCost + svc.serviceCost + svc.shippingCost;
                
                // If fields are empty or user hasn't heavily modified them, auto-fill
                if (!overridePrice) setOverridePrice(svc.price.toFixed(2));
                if (!overrideCost) setOverrideCost(cost.toFixed(2));
                if (!description) setDescription(`${svc.name} - ${svc.brand} ${svc.model}`);
            }
        }
    }, [selectedServiceId, services, orderToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const service = services.find(s => s.id === selectedServiceId);
        // Fallback for description if service not found (shouldn't happen if required)
        const finalDesc = description || (service ? `${service.name} - ${service.brand} ${service.model}` : 'Serviço Personalizado');

        const payload = {
            ...(orderToEdit || {}),
            customerName: formatName(customerName),
            customerWhatsapp: formatPhone(customerWhatsapp),
            customerCnpjCpf: formatRegister(customerCnpjCpf),
            serviceId: selectedServiceId,
            serviceDescription: finalDesc,
            totalPrice: parseFloat(overridePrice) || 0,
            totalCost: parseFloat(overrideCost) || 0,
            otherCosts: parseFloat(otherCosts) || 0,
        };
        onSave(payload);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold dark:text-white">{orderToEdit ? 'Editar OS' : 'Nova Ordem de Serviço'}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Customer Info */}
                    <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-bold text-gray-500 uppercase">Cliente</h4>
                        <div>
                            <label className="block text-sm font-medium mb-1">Nome</label>
                            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} required className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Whatsapp</label>
                                <input type="text" value={customerWhatsapp} onChange={e => setCustomerWhatsapp(formatPhone(e.target.value))} required className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">CPF/CNPJ</label>
                                <input type="text" value={customerCnpjCpf} onChange={e => setCustomerCnpjCpf(formatRegister(e.target.value))} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"/>
                            </div>
                        </div>
                    </div>

                    {/* Service Info */}
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Serviço Base</label>
                            <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} required className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600">
                                <option value="">Selecione...</option>
                                {services.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} - {s.brand} {s.model}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Descrição Detalhada</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Troca de Tela iPhone 11 (Vidro quebrado)" className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"/>
                        </div>
                    </div>

                    {/* Financials */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Preço (R$)</label>
                            <input type="number" step="0.01" value={overridePrice} onChange={e => setOverridePrice(e.target.value)} required className="w-full p-2 rounded border border-green-300 dark:bg-gray-700 dark:border-green-800"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Custo (R$)</label>
                            <input type="number" step="0.01" value={overrideCost} onChange={e => setOverrideCost(e.target.value)} required className="w-full p-2 rounded border border-red-300 dark:bg-gray-700 dark:border-red-800"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Outros (R$)</label>
                            <input type="number" step="0.01" value={otherCosts} onChange={e => setOtherCosts(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"/>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Salvar OS</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CompletionModal: React.FC<{ 
    order: ServiceOrder; 
    accounts: FinancialAccount[];
    onClose: () => void; 
    onConfirm: (paymentData: any) => void;
}> = ({ order, accounts, onClose, onConfirm }) => {
    const [finalPrice, setFinalPrice] = useState(order.totalPrice.toString());
    const [discount, setDiscount] = useState('0');
    const [paymentMethod, setPaymentMethod] = useState('');
    
    // Cost Handling
    const [costStatus, setCostStatus] = useState<TransactionStatus>(TransactionStatus.PENDING);
    const [costAccountId, setCostAccountId] = useState('');
    const [costMethodId, setCostMethodId] = useState('');
    const [costDate, setCostDate] = useState(new Date().toISOString().split('T')[0]);
    const [installments, setInstallments] = useState(1);

    // Derived
    const selectedAccount = accounts.find(a => a.id === costAccountId);
    const isCostCredit = selectedAccount?.paymentMethods.find(m => (m.id || (m as any)._id) === costMethodId)?.type === 'Credit';

    const handleSubmit = () => {
        if (!paymentMethod) return alert('Selecione a forma de pagamento do cliente.');
        
        // Prepare Revenue Data (Simplified for CashTransaction - always Paid/CashBox in MVP)
        // If advanced revenue tracking is needed (bank deposit), extend this.
        // Currently revenue goes to 'cash-box' automatically in backend logic for simplicity on OS.

        // Prepare Cost Data
        const costPaymentDetails = {
            status: costStatus,
            financialAccountId: costAccountId || undefined,
            paymentMethodId: costMethodId || undefined,
            date: costStatus === TransactionStatus.PAID ? costDate : undefined, // DueDate logic handled by backend based on status
            installments: isCostCredit ? installments : 1
        };

        onConfirm({
            finalPrice: parseFloat(finalPrice),
            discount: parseFloat(discount),
            paymentMethod, // String for display
            costPaymentDetails
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4 dark:text-white">Concluir OS #{order.id}</h3>
                
                <div className="space-y-6">
                    {/* Revenue Section */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-green-600 uppercase border-b pb-1">Recebimento (Cliente)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm mb-1">Valor Final</label>
                                <input type="number" step="0.01" value={finalPrice} onChange={e => setFinalPrice(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"/>
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Desconto</label>
                                <input type="number" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Forma de Pagamento</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600">
                                <option value="">Selecione...</option>
                                {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Cost Section */}
                    {order.totalCost > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-red-600 uppercase border-b pb-1 flex justify-between">
                                <span>Pagamento de Custos (Peças/Serviço)</span>
                                <span>R$ {formatCurrencyNumber(order.totalCost)}</span>
                            </h4>
                            
                            <div>
                                <label className="block text-sm mb-1">Status do Custo</label>
                                <select value={costStatus} onChange={e => setCostStatus(e.target.value as TransactionStatus)} className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 font-bold">
                                    <option value={TransactionStatus.PENDING}>Pendente (A Pagar)</option>
                                    <option value={TransactionStatus.PAID}>Pago (Realizado)</option>
                                </select>
                            </div>

                            {costStatus === TransactionStatus.PAID && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-1">Conta de Saída</label>
                                        <select value={costAccountId} onChange={e => { setCostAccountId(e.target.value); setCostMethodId(''); }} className="w-full p-2 text-sm rounded border dark:bg-gray-700 dark:border-gray-600">
                                            <option value="">Selecione...</option>
                                            <option value="cash-box">Caixa (Dinheiro)</option>
                                            <optgroup label="Bancos">
                                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.bankName}</option>)}
                                            </optgroup>
                                        </select>
                                    </div>
                                    {costAccountId && costAccountId !== 'cash-box' && (
                                        <div>
                                            <label className="block text-xs font-bold uppercase mb-1">Método</label>
                                            <select value={costMethodId} onChange={e => setCostMethodId(e.target.value)} className="w-full p-2 text-sm rounded border dark:bg-gray-700 dark:border-gray-600">
                                                <option value="">Selecione...</option>
                                                {selectedAccount?.paymentMethods.map(m => (
                                                    <option key={m.id || (m as any)._id} value={m.id || (m as any)._id}>{m.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {isCostCredit && (
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold uppercase mb-1">Parcelas</label>
                                            <select value={installments} onChange={e => setInstallments(parseInt(e.target.value))} className="w-full p-2 text-sm rounded border dark:bg-gray-700 dark:border-gray-600">
                                                {[1,2,3,4,5,6,10,12].map(n => <option key={n} value={n}>{n}x</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {!isCostCredit && (
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold uppercase mb-1">Data Pagamento</label>
                                            <input type="date" value={costDate} onChange={e => setCostDate(e.target.value)} className="w-full p-2 text-sm rounded border dark:bg-gray-700 dark:border-gray-600"/>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                        <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300">Cancelar</button>
                        <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Concluir OS</button>
                    </div>
                </div>
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

const ServiceOrders: React.FC<ServiceOrdersProps> = ({ 
    services, serviceOrders, onAddServiceOrder, onUpdateServiceOrder, onDeleteServiceOrder, onToggleStatus, setActivePage, goals 
}) => {
    const { user, apiCall } = useContext(AuthContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
    const [completingOrder, setCompletingOrder] = useState<ServiceOrder | null>(null);
    const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

    useEffect(() => {
        const fetchAccounts = async () => {
            const data = await apiCall('financial', 'GET');
            if (data) setAccounts(data);
        };
        fetchAccounts();
    }, [apiCall, isCompletionModalOpen]);

    const handleOpenCreateModal = () => {
        setEditingOrder(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (order: ServiceOrder) => {
        setEditingOrder(order);
        setIsModalOpen(true);
    };

    const handleSaveOrder = async (orderData: any) => {
        if (editingOrder) {
            await onUpdateServiceOrder(orderData);
        } else {
            await onAddServiceOrder(orderData);
        }
        setIsModalOpen(false);
        setEditingOrder(null);
    };

    const handleInitiateCompletion = (order: ServiceOrder) => {
        setCompletingOrder(order);
        setIsCompletionModalOpen(true);
    };

    const handleConfirmCompletion = async (paymentData: any) => {
        if (completingOrder) {
            await onToggleStatus(completingOrder.id, paymentData);
            setIsCompletionModalOpen(false);
            setCompletingOrder(null);
        }
    };

    const handleDeleteConfirm = async () => {
        if (deletingOrderId) {
            await onDeleteServiceOrder(deletingOrderId);
            setDeletingOrderId(null);
        }
    };

    const filteredOrders = useMemo(() => {
        return serviceOrders.filter(o => 
            o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.serviceDescription.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [serviceOrders, searchTerm]);

    const canEdit = user?.role === 'owner' || user?.role === 'manager' || user?.role === 'technician';
    const canDelete = user?.role === 'owner' || user?.role === 'manager';

    return (
        <div className="container mx-auto">
            {isModalOpen && <ServiceOrderModal services={services} orderToEdit={editingOrder} onClose={() => setIsModalOpen(false)} onSave={handleSaveOrder} />}
            {isCompletionModalOpen && completingOrder && <CompletionModal order={completingOrder} accounts={accounts} onClose={() => setIsCompletionModalOpen(false)} onConfirm={handleConfirmCompletion} />}
            {deletingOrderId && (
                <ConfirmationModal 
                    message="Tem certeza que deseja excluir esta OS? Isso removerá quaisquer registros financeiros associados."
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeletingOrderId(null)}
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ordens de Serviço</h1>
                <button onClick={handleOpenCreateModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md">Nova OS</button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg mb-6">
                <input
                    type="text"
                    placeholder="Buscar OS, Cliente, Descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm px-3 py-2"
                />
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">ID</th>
                                <th scope="col" className="px-6 py-3">Cliente</th>
                                <th scope="col" className="px-6 py-3">Serviço</th>
                                <th scope="col" className="px-6 py-3">Valor</th>
                                <th scope="col" className="px-6 py-3">Data</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-8 text-gray-500">Nenhuma OS encontrada.</td></tr>
                            ) : (
                                filteredOrders.map(order => {
                                    const isPending = order.status === ServiceOrderStatus.PENDING;
                                    const canReopen = (user?.role === 'owner' || user?.role === 'manager') && !isPending;
                                    const displayPrice = order.finalPrice || order.totalPrice;

                                    return (
                                        <tr key={order.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{order.id}</td>
                                            <td className="px-6 py-4">
                                                <div>{order.customerName}</div>
                                                <div className="text-xs text-gray-500">{order.customerWhatsapp}</div>
                                            </td>
                                            <td className="px-6 py-4">{order.serviceDescription}</td>
                                            <td className="px-6 py-4 font-semibold text-green-500">R$ {formatCurrencyNumber(displayPrice)}</td>
                                            <td className="px-6 py-4">{new Date(order.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                                            <td className="px-6 py-4"><OSStatusBadge status={order.status} /></td>
                                            <td className="px-6 py-4 space-x-4 whitespace-nowrap">
                                                {isPending ? (
                                                    <button onClick={() => handleInitiateCompletion(order)} className="font-medium text-green-600 dark:text-green-500 hover:underline">Concluir</button>
                                                ) : (
                                                    canReopen && (<button onClick={() => onToggleStatus(order.id)} className="font-medium text-yellow-500 dark:text-yellow-400 hover:underline">Reabrir</button>)
                                                )}
                                                {isPending && (
                                                    <button onClick={() => handleOpenEditModal(order)} disabled={!canEdit} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed disabled:no-underline">Editar</button>
                                                )}
                                                <button onClick={() => setDeletingOrderId(order.id)} disabled={!canDelete} className="font-medium text-red-600 dark:text-red-500 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed disabled:no-underline">Excluir</button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ServiceOrders;
