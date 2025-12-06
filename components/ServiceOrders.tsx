
import React, { useState, useEffect, useContext } from 'react';
import { ServiceOrder, Service, TransactionStatus, FinancialAccount, KpiGoals, ServiceOrderStatus } from '../types';
import { AuthContext } from '../contexts/AuthContext';
import { formatCurrencyNumber, formatName, formatPhone, validateName, validatePhone, formatRegister } from '../validation';

// Declare html2canvas
declare global {
    interface Window {
        html2canvas: any;
    }
}

const CostPaymentModal: React.FC<{
    order: ServiceOrder,
    accounts: FinancialAccount[],
    onClose: () => void,
    onConfirm: (costDetails: any) => void
}> = ({ order, accounts, onClose, onConfirm }) => {
    const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.PENDING);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); 
    const [selectedAccountId, setSelectedAccountId] = useState('cash-box');
    const [selectedMethodId, setSelectedMethodId] = useState('');
    const [installments, setInstallments] = useState(1);

    const today = new Date().toISOString().split('T')[0];

    const isCashBox = selectedAccountId === 'cash-box';
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const selectedMethod = selectedAccount?.paymentMethods.find(m => (m.id || (m as any)._id) === selectedMethodId);
    const isCreditCard = !isCashBox && selectedMethod?.type === 'Credit';

    const handleConfirm = () => {
        if (status === TransactionStatus.PAID && !isCashBox && !selectedMethodId) {
            alert("Selecione um método de pagamento.");
            return;
        }
        if (!date) {
            alert("Selecione uma data.");
            return;
        }

        const costPayload = {
            status,
            financialAccountId: selectedAccountId,
            paymentMethodId: selectedMethodId,
            date,
            installments: isCreditCard ? installments : 1
        };

        onConfirm(costPayload);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md animate-fade-in">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Pagamento do Custo do Serviço</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Este serviço tem um custo de <strong className="text-red-500">R$ {formatCurrencyNumber(order.totalCost)}</strong>.
                    Como deseja registrar essa saída?
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Status do Pagamento</label>
                        <select 
                            value={status} 
                            onChange={(e) => setStatus(e.target.value as TransactionStatus)}
                            className="w-full rounded p-2 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        >
                            <option value={TransactionStatus.PENDING}>Pendente (A Pagar)</option>
                            <option value={TransactionStatus.PAID}>Pago (Realizado)</option>
                        </select>
                    </div>

                    {status === TransactionStatus.PENDING && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Vencimento</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded p-2 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                        </div>
                    )}

                    {status === TransactionStatus.PAID && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-1">Conta de Saída</label>
                                <select 
                                    value={selectedAccountId} 
                                    onChange={(e) => { setSelectedAccountId(e.target.value); setSelectedMethodId(''); }}
                                    className="w-full rounded p-2 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                >
                                    <option value="cash-box">Dinheiro do Caixa</option>
                                    <optgroup label="Bancos">
                                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.bankName}</option>)}
                                    </optgroup>
                                </select>
                            </div>

                            {!isCashBox && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Método</label>
                                    <select 
                                        value={selectedMethodId} 
                                        onChange={(e) => setSelectedMethodId(e.target.value)}
                                        className="w-full rounded p-2 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
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

                            {isCreditCard && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded border border-yellow-200 dark:border-yellow-700">
                                    <label className="block text-sm font-medium mb-1 text-yellow-800 dark:text-yellow-400">Parcelamento</label>
                                    <select 
                                        value={installments} 
                                        onChange={(e) => setInstallments(Number(e.target.value))}
                                        className="w-full rounded p-2 bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-600"
                                    >
                                        {Array.from({length: 12}, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}x</option>)}
                                    </select>
                                </div>
                            )}

                            {!isCreditCard && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Data do Pagamento</label>
                                    <input 
                                        type="date" 
                                        value={date} 
                                        onChange={e => setDate(e.target.value)} 
                                        max={today}
                                        className="w-full rounded p-2 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600" 
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded text-gray-800 dark:text-white">Cancelar</button>
                    <button onClick={handleConfirm} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

interface OSModalProps {
    services: Service[];
    orderToEdit?: ServiceOrder | null;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
}

const OSModal: React.FC<OSModalProps> = ({ services, orderToEdit, onClose, onSave }) => {
    const [customerName, setCustomerName] = useState('');
    const [customerWhatsapp, setCustomerWhatsapp] = useState('');
    const [customerCnpjCpf, setCustomerCnpjCpf] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [description, setDescription] = useState('');
    const [totalPrice, setTotalPrice] = useState('');
    const [otherCosts, setOtherCosts] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (orderToEdit) {
            setCustomerName(orderToEdit.customerName);
            setCustomerWhatsapp(formatPhone(orderToEdit.customerWhatsapp));
            setCustomerCnpjCpf(orderToEdit.customerCnpjCpf ? formatRegister(orderToEdit.customerCnpjCpf) : '');
            setSelectedServiceId(orderToEdit.serviceId);
            setDescription(orderToEdit.serviceDescription);
            setTotalPrice(formatCurrencyNumber(orderToEdit.totalPrice));
            setOtherCosts(formatCurrencyNumber(orderToEdit.otherCosts));
        }
    }, [orderToEdit]);

    const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const serviceId = e.target.value;
        setSelectedServiceId(serviceId);
        const service = services.find(s => s.id === serviceId);
        if (service) {
            setDescription(`${service.brand} ${service.model} - ${service.name}`);
            setTotalPrice(formatCurrencyNumber(service.price));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!customerName || !customerWhatsapp || !selectedServiceId) {
            setError('Preencha os campos obrigatórios.');
            return;
        }

        const service = services.find(s => s.id === selectedServiceId);
        if (!service) return;

        const parseVal = (val: string) => parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
        const price = parseVal(totalPrice);
        const others = parseVal(otherCosts);
        const cost = service.partCost + service.serviceCost + service.shippingCost + others;

        const payload: any = {
            customerName: formatName(customerName),
            customerWhatsapp: formatPhone(customerWhatsapp),
            customerCnpjCpf: formatRegister(customerCnpjCpf),
            serviceId: selectedServiceId,
            serviceDescription: description,
            totalPrice: price,
            otherCosts: others,
            totalCost: cost
        };

        if (orderToEdit) payload.id = orderToEdit.id;

        await onSave(payload);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6 dark:text-white">{orderToEdit ? 'Editar OS' : 'Nova Ordem de Serviço'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" placeholder="Nome Cliente" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-2 rounded border" />
                    <input type="text" placeholder="Whatsapp" value={customerWhatsapp} onChange={e => setCustomerWhatsapp(formatPhone(e.target.value))} className="w-full p-2 rounded border" />
                    <input type="text" placeholder="CPF/CNPJ (Opcional)" value={customerCnpjCpf} onChange={e => setCustomerCnpjCpf(formatRegister(e.target.value))} className="w-full p-2 rounded border" />
                    
                    <select value={selectedServiceId} onChange={handleServiceChange} className="w-full p-2 rounded border">
                        <option value="">Selecione Serviço...</option>
                        {services.map(s => <option key={s.id} value={s.id}>{s.name} - {s.brand} {s.model}</option>)}
                    </select>
                    
                    <input type="text" placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 rounded border" />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Preço (R$)" value={totalPrice} onChange={e => setTotalPrice(e.target.value)} className="w-full p-2 rounded border" />
                        <input type="text" placeholder="Outros Custos (R$)" value={otherCosts} onChange={e => setOtherCosts(e.target.value)} className="w-full p-2 rounded border" />
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div className="flex justify-end gap-3 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Salvar OS</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface ServiceOrdersProps {
    services: Service[];
    serviceOrders: ServiceOrder[];
    onAddServiceOrder: (data: any) => Promise<void>;
    onUpdateServiceOrder: (data: any) => Promise<void>;
    onDeleteServiceOrder: (id: string) => Promise<void>;
    onToggleStatus: (id: string, paymentData?: any) => Promise<void>;
    setActivePage: (page: string) => void;
    goals: KpiGoals;
}

const ServiceOrders: React.FC<ServiceOrdersProps> = ({ services, serviceOrders, onAddServiceOrder, onUpdateServiceOrder, onDeleteServiceOrder, onToggleStatus }) => {
    const { apiCall } = useContext(AuthContext);
    const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
    const [completingOrder, setCompletingOrder] = useState<ServiceOrder | null>(null);

    useEffect(() => {
        const fetchAccounts = async () => {
            const data = await apiCall('financial', 'GET');
            if (data) setAccounts(data);
        };
        fetchAccounts();
    }, []);

    const handleEdit = (order: ServiceOrder) => {
        setEditingOrder(order);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if(window.confirm('Excluir OS?')) await onDeleteServiceOrder(id);
    };

    const handleToggle = async (order: ServiceOrder) => {
        if (order.status === ServiceOrderStatus.PENDING && order.totalCost > 0) {
            setCompletingOrder(order); // Open cost modal
        } else {
            await onToggleStatus(order.id); // Toggle directly if no cost or reopening
        }
    };

    const confirmCostPayment = async (costDetails: any) => {
        if (completingOrder) {
            await onToggleStatus(completingOrder.id, { costPaymentDetails: costDetails });
            setCompletingOrder(null);
        }
    };

    return (
        <div className="container mx-auto">
            {isModalOpen && <OSModal services={services} orderToEdit={editingOrder} onClose={() => setIsModalOpen(false)} onSave={async (data) => {
                if (data.id) await onUpdateServiceOrder(data);
                else await onAddServiceOrder(data);
            }} />}
            
            {completingOrder && <CostPaymentModal order={completingOrder} accounts={accounts} onClose={() => setCompletingOrder(null)} onConfirm={confirmCostPayment} />}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold dark:text-white">Ordens de Serviço</h1>
                <button onClick={() => { setEditingOrder(null); setIsModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md">+ Nova OS</button>
            </div>

            <div className="grid gap-4">
                {serviceOrders.map(order => (
                    <div key={order.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-indigo-500 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">{order.serviceDescription}</h3>
                            <p className="text-sm text-gray-500">{order.customerName} - {order.customerWhatsapp}</p>
                            <p className="text-xs text-gray-400 mt-1">ID: {order.id}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-lg text-indigo-600">R$ {formatCurrencyNumber(order.totalPrice)}</p>
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => handleToggle(order)} className={`px-3 py-1 text-xs font-bold rounded ${order.status === 'Concluído' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {order.status}
                                </button>
                                <button onClick={() => handleEdit(order)} className="text-blue-500 text-sm hover:underline">Editar</button>
                                <button onClick={() => handleDelete(order.id)} className="text-red-500 text-sm hover:underline">Excluir</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ServiceOrders;
