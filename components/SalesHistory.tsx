
import React, { useState, useEffect, useMemo } from 'react';
import type { TicketSale } from '../types';
import { formatCurrencyNumber } from '../validation';

interface SalesHistoryProps {
    ticketSales: TicketSale[];
    onDeleteSale: (saleId: string) => void;
    setActivePage: (page: string) => void;
}

const SaleDetailsModal: React.FC<{ sale: TicketSale; onClose: () => void }> = ({ sale, onClose }) => {
    const totalCost = sale.totalCost || 0;
    const grossTotal = sale.total + (sale.discount || 0); // Reconstruct original total before discount if needed, or just show stored totals
    const profit = sale.total - totalCost;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Detalhes da Venda - {sale.id}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-3xl leading-none">&times;</button>
                </div>
                <div className="space-y-2 text-sm mb-4">
                    <p><strong>Data:</strong> {new Date(sale.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
                    <p><strong>Cliente:</strong> {sale.customerName || 'N/A'}</p>
                    <p><strong>Whatsapp:</strong> {sale.customerWhatsapp || 'N/A'}</p>
                    <p><strong>Vendido por:</strong> {sale.userName || 'N/A'}</p>
                    <p><strong>Forma de Pagamento:</strong> {sale.paymentMethod || 'N/A'}</p>
                </div>
                <div className="border-t dark:border-gray-600 pt-4">
                    <h4 className="font-semibold mb-2">Itens:</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {sale.items.map((item, index) => (
                            <div key={index} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                                <div>
                                    <p className="font-medium">{item.item.name}</p>
                                    {item.uniqueIdentifier && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">ID: {item.uniqueIdentifier}</p>
                                    )}
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {item.quantity} x R$ {formatCurrencyNumber(item.unitPrice)}
                                    </p>
                                </div>
                                <p className="font-semibold">R$ {formatCurrencyNumber(item.quantity * item.unitPrice)}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="border-t dark:border-gray-600 pt-4 mt-4 space-y-1 text-sm">
                     <div className="flex justify-between">
                        <span>Subtotal (Bruto):</span>
                        <span>R$ {formatCurrencyNumber(grossTotal)}</span>
                    </div>
                    {sale.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span>Desconto:</span>
                            <span>- R$ {formatCurrencyNumber(sale.discount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span>Total Final:</span>
                        <span>R$ {formatCurrencyNumber(sale.total)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-dashed border-gray-300 dark:border-gray-600">
                        <span>Custo Total (CMV):</span>
                        <span>R$ {formatCurrencyNumber(totalCost)}</span>
                    </div>
                     <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Lucro Bruto:</span>
                        <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>R$ {formatCurrencyNumber(profit)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ConfirmationModal: React.FC<{ message: string; onConfirm: () => void; onCancel: () => void }> = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Confirmar Exclusão</h3>
            <p className="mb-6">{message}</p>
            <div className="flex justify-end space-x-4">
                <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-300 dark:bg-gray-600 hover:bg-gray-400">Cancelar</button>
                <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">Confirmar</button>
            </div>
        </div>
    </div>
);


const SalesHistory: React.FC<SalesHistoryProps> = ({ ticketSales, onDeleteSale, setActivePage }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedSale, setSelectedSale] = useState<TicketSale | null>(null);
    const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
    const recordsPerPage = 15;

    const filteredSales = useMemo(() => {
        return ticketSales.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                if (saleDate < start) return false;
            }
             if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (saleDate > end) return false;
            }
            if (searchTerm && 
                !sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) && 
                !sale.customerWhatsapp.includes(searchTerm)) {
                return false;
            }
            return true;
        }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [ticketSales, searchTerm, startDate, endDate]);

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredSales.slice(indexOfFirstRecord, indexOfLastRecord);
    const nPages = Math.ceil(filteredSales.length / recordsPerPage);

    const nextPage = () => {
        if (currentPage < nPages) setCurrentPage(currentPage + 1);
    };
    const prevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, startDate, endDate]);
    
    const handleDeleteRequest = (e: React.MouseEvent, saleId: string) => {
        e.stopPropagation(); // Prevent detail modal from opening
        setDeletingSaleId(saleId);
    };

    const handleDeleteConfirm = () => {
        if (deletingSaleId) {
            onDeleteSale(deletingSaleId);
        }
        setDeletingSaleId(null);
    };

    return (
        <div className="container mx-auto space-y-8">
            {selectedSale && <SaleDetailsModal sale={selectedSale} onClose={() => setSelectedSale(null)} />}
            {deletingSaleId && (
                <ConfirmationModal
                    message="Tem certeza que deseja excluir esta venda? Esta ação é irreversível e irá reajustar o estoque e as transações financeiras."
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeletingSaleId(null)}
                />
            )}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Histórico de Vendas</h1>
                <button 
                    onClick={() => setActivePage('customers')}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                    Clientes
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg mb-6 flex flex-wrap items-end gap-4">
                <div className="flex-grow min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar Cliente</label>
                    <input type="text" placeholder="Nome ou Whatsapp..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm px-3 py-2"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Inicial</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm px-3 py-2"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Final</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm px-3 py-2"/>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Ticket</th>
                                <th scope="col" className="px-6 py-3">Data</th>
                                <th scope="col" className="px-6 py-3">Cliente</th>
                                <th scope="col" className="px-6 py-3">Forma Pagto</th>
                                <th scope="col" className="px-6 py-3">Usuário</th>
                                <th scope="col" className="px-6 py-3">Desc.</th>
                                <th scope="col" className="px-6 py-3">Total</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentRecords.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-8">Nenhuma venda encontrada.</td></tr>
                            ) : (
                                currentRecords.map(sale => (
                                    <tr key={sale.id} onClick={() => setSelectedSale(sale)} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                                        <td className="px-6 py-4 font-mono">{sale.id}</td>
                                        <td className="px-6 py-4">
                                            <div>{new Date(sale.timestamp).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>
                                            <div className="text-xs text-gray-500">{String(sale.saleHour).padStart(2, '0')}:00</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>{sale.customerName || 'N/A'}</div>
                                            <div className="text-xs text-gray-500">{sale.customerWhatsapp || ''}</div>
                                        </td>
                                        <td className="px-6 py-4">{sale.paymentMethod || '-'}</td>
                                        <td className="px-6 py-4">{sale.userName}</td>
                                        <td className="px-6 py-4">{sale.discount ? `R$ ${formatCurrencyNumber(sale.discount)}` : '-'}</td>
                                        <td className="px-6 py-4 font-semibold">R$ {formatCurrencyNumber(sale.total)}</td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={(e) => handleDeleteRequest(e, sale.id)}
                                                className="font-medium text-red-600 dark:text-red-500 hover:underline"
                                            >
                                                Excluir
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {nPages > 1 && (
                    <div className="p-4 flex justify-between items-center flex-wrap gap-2">
                         <span className="text-sm text-gray-700 dark:text-gray-400">
                            Página {currentPage} de {nPages} ({filteredSales.length} registros)
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

export default SalesHistory;
