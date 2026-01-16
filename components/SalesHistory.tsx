
import React, { useState, useEffect, useMemo } from 'react';
import type { TicketSale, KpiGoals } from '../types';
import { formatCurrencyNumber, formatPhone } from '../validation';

interface SalesHistoryProps {
    sales: TicketSale[];
    goals: KpiGoals;
}

const ReceiptModal: React.FC<{ imageData: string; fileName: string; onClose: () => void }> = ({ imageData, fileName, onClose }) => {
    const handleDownload = () => {
        try {
            const link = document.createElement('a');
            link.href = imageData;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error downloading:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-150 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md flex flex-col items-center">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Comprovante de Venda</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-6 max-h-[60vh] overflow-y-auto bg-white">
                    <img src={imageData} alt="Comprovante" className="max-w-full shadow-sm" />
                </div>
                <div className="flex gap-4 w-full">
                    <button onClick={onClose} className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300">Fechar</button>
                    <button onClick={handleDownload} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 font-semibold">
                        Baixar
                    </button>
                </div>
            </div>
        </div>
    );
};

const generateTicketReceipt = async (sale: TicketSale, goals: KpiGoals): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    const width = 380;
    canvas.width = width;
    canvas.height = 1200; 

    // Background
    ctx.fillStyle = '#fde0bc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';

    const padding = 20;
    const lineHeight = 20;
    const fontRegular = '12px "Courier New", monospace';
    const fontBold = 'bold 12px "Courier New", monospace';
    const fontHeader = 'bold 20px "Courier New", monospace';
    const fontSmall = '11px "Courier New", monospace';

    let y = padding;

    const drawText = (text: string, font: string, x: number, align: 'left' | 'center' | 'right' = 'left') => {
        ctx.font = font;
        const metrics = ctx.measureText(text);
        let drawX = x;
        if (align === 'center') drawX = x - (metrics.width / 2);
        if (align === 'right') drawX = x - metrics.width;
        ctx.fillText(text, drawX, y);
    };

    const drawDivider = () => {
        y += 5;
        ctx.beginPath();
        ctx.setLineDash([4, 2]);
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        ctx.setLineDash([]); 
        y += 15;
    };

    // Header
    const titleText = "SmartStore";
    const titleMetrics = ctx.measureText(titleText);
    const headerX = (width - titleMetrics.width) / 2;

    drawText(titleText, fontHeader, width / 2, 'center');
    y += 30;

    drawText("COMPROVANTE DE VENDA", fontSmall, width / 2, 'center');
    y += 10;
    
    drawDivider();

    const dateStr = new Date(sale.timestamp).toLocaleString('pt-BR');
    drawText("DATA:", fontBold, padding);
    drawText(dateStr, fontRegular, width - padding, 'right');
    y += lineHeight;

    drawText("CLIENTE:", fontBold, padding);
    drawText(sale.customerName.substring(0, 25), fontRegular, width - padding, 'right');
    y += lineHeight;

    if (sale.customerWhatsapp) {
        drawText("TEL:", fontBold, padding);
        // FIX: Applied formatPhone here
        drawText(formatPhone(sale.customerWhatsapp), fontRegular, width - padding, 'right');
        y += lineHeight;
    }

    drawText("VENDEDOR:", fontBold, padding);
    drawText(sale.userName.split(' ')[0], fontRegular, width - padding, 'right');
    y += lineHeight;

    drawText("TICKET:", fontBold, padding);
    drawText(sale.id.split('-').slice(0, 3).join('-'), fontRegular, width - padding, 'right');
    y += lineHeight;

    drawDivider();

    // Items List
    drawText("ITENS DA VENDA", fontBold, padding);
    y += lineHeight + 5;

    sale.items.forEach(item => {
        drawText(item.item.name.substring(0, 35), fontBold, padding);
        y += lineHeight;
        
        const details = `${item.quantity} un x R$ ${formatCurrencyNumber(item.unitPrice)}`;
        drawText(details, fontRegular, padding);
        const subtotal = `R$ ${formatCurrencyNumber(item.quantity * item.unitPrice)}`;
        drawText(subtotal, fontBold, width - padding, 'right');
        
        if (item.uniqueIdentifier) {
            y += lineHeight;
            drawText(`ID: ${item.uniqueIdentifier}`, fontSmall, padding);
        }
        
        y += lineHeight + 5;
    });

    drawDivider();

    // Totals
    const subtotalBruto = sale.total + (sale.discount || 0);
    drawText("SUBTOTAL:", fontBold, padding);
    drawText(`R$ ${formatCurrencyNumber(subtotalBruto)}`, fontRegular, width - padding, 'right');
    y += lineHeight;

    if (sale.discount && sale.discount > 0) {
        drawText("DESCONTO:", fontBold, padding);
        drawText(`- R$ ${formatCurrencyNumber(sale.discount)}`, fontRegular, width - padding, 'right');
        y += lineHeight;
    }

    y += 5;
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText("TOTAL PAGO:", padding, y);
    const totalStr = `R$ ${formatCurrencyNumber(sale.total)}`;
    const tMetrics = ctx.measureText(totalStr);
    ctx.fillText(totalStr, width - padding - tMetrics.width, y);
    y += lineHeight * 1.5;

    if (sale.paymentMethod) {
        drawText(`Forma: ${sale.paymentMethod}`, fontSmall, width / 2, 'center');
        y += lineHeight;
    }

    // Store Footer
    if (goals.companyInfo?.name) {
        drawDivider();
        drawText(goals.companyInfo.name.toUpperCase(), fontBold, width / 2, 'center');
        y += lineHeight;
        
        const addr = goals.companyInfo.address;
        if (addr && addr.street) {
            const line1 = `${addr.street}, ${addr.number}${addr.complement ? ' - ' + addr.complement : ''}`;
            const line2 = `${addr.neighborhood} - ${addr.city}/${addr.state}`;
            drawText(line1, fontSmall, width / 2, 'center');
            y += lineHeight - 5;
            drawText(line2, fontSmall, width / 2, 'center');
            y += lineHeight - 5;
        }
        if (goals.companyInfo.phone) {
            drawText(`Tel: ${formatPhone(goals.companyInfo.phone)}`, fontSmall, width / 2, 'center');
            y += lineHeight;
        }
    }

    y += padding;

    // Crop
    const finalData = ctx.getImageData(0, 0, width, y);
    canvas.height = y;
    ctx.putImageData(finalData, 0, 0);

    return canvas.toDataURL('image/png');
};

const SaleDetailsModal: React.FC<{ sale: TicketSale; goals: KpiGoals; onClose: () => void }> = ({ sale, goals, onClose }) => {
    const totalCost = sale.totalCost || 0;
    const grossTotal = sale.total + (sale.discount || 0); 
    const profit = sale.total - totalCost;
    const [receiptImage, setReceiptImage] = useState<string | null>(null);

    const handleGenerateReceipt = async () => {
        try {
            const image = await generateTicketReceipt(sale, goals);
            setReceiptImage(image);
        } catch (error) {
            alert('Erro ao gerar comprovante.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            {receiptImage && (
                <ReceiptModal 
                    imageData={receiptImage} 
                    fileName={`Recibo-${sale.id}.png`} 
                    onClose={() => setReceiptImage(null)} 
                />
            )}

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold dark:text-white">Detalhes da Venda - {sale.id.split('-').slice(0, 3).join('-')}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-3xl leading-none">&times;</button>
                </div>
                <div className="space-y-2 text-sm mb-4 dark:text-gray-300">
                    <p><strong>Data:</strong> {new Date(sale.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
                    <p><strong>Cliente:</strong> {sale.customerName || 'N/A'}</p>
                    <p><strong>Whatsapp:</strong> {sale.customerWhatsapp ? formatPhone(sale.customerWhatsapp) : 'N/A'}</p>
                    <p><strong>Vendido por:</strong> {sale.userName || 'N/A'}</p>
                    <p><strong>Forma de Pagamento:</strong> {sale.paymentMethod || 'N/A'}</p>
                </div>
                <div className="border-t dark:border-gray-600 pt-4">
                    <h4 className="font-semibold mb-2 dark:text-white">Itens:</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {sale.items.map((item, index) => (
                            <div key={index} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                                <div>
                                    <p className="font-medium dark:text-white">{item.item.name}</p>
                                    {item.uniqueIdentifier && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">ID: {item.uniqueIdentifier}</p>
                                    )}
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {item.quantity} x R$ {formatCurrencyNumber(item.unitPrice)}
                                    </p>
                                </div>
                                <p className="font-semibold dark:text-white">R$ {formatCurrencyNumber(item.quantity * item.unitPrice)}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="border-t dark:border-gray-600 pt-4 mt-4 space-y-1 text-sm dark:text-gray-300">
                     <div className="flex justify-between">
                        <span>Subtotal (Bruto):</span>
                        <span>R$ {formatCurrencyNumber(grossTotal)}</span>
                    </div>
                    {sale.discount && sale.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span>Desconto:</span>
                            <span>- R$ {formatCurrencyNumber(sale.discount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200 dark:border-gray-700 dark:text-white">
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

                <div className="mt-6 pt-4 border-t dark:border-gray-700">
                    <button 
                        onClick={handleGenerateReceipt}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Gerar Comprovante
                    </button>
                </div>
            </div>
        </div>
    );
};

const SalesHistory: React.FC<SalesHistoryProps> = ({ sales, goals }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 15;
    
    const [selectedSale, setSelectedSale] = useState<TicketSale | null>(null);

    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            if (startDate) {
                 const start = new Date(startDate);
                 if (saleDate < start) return false;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (saleDate > end) return false;
            }
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return (
                    sale.customerName.toLowerCase().includes(term) ||
                    sale.id.toLowerCase().includes(term) ||
                    (sale.customerWhatsapp && sale.customerWhatsapp.includes(term))
                );
            }
            return true;
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [sales, searchTerm, startDate, endDate]);

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredSales.slice(indexOfFirstRecord, indexOfLastRecord);
    const nPages = Math.ceil(filteredSales.length / recordsPerPage);

    const nextPage = () => { if (currentPage < nPages) setCurrentPage(currentPage + 1); };
    const prevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

    return (
        <div className="container mx-auto">
            {/* Details Modal */}
            {selectedSale && (
                <SaleDetailsModal 
                    sale={selectedSale} 
                    goals={goals} 
                    onClose={() => setSelectedSale(null)} 
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Histórico de Vendas</h1>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg mb-6 flex flex-wrap items-end gap-4">
                <div className="grow min-w-50">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar</label>
                    <input type="text" placeholder="Cliente, Ticket, Telefone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Inicial</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Final</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2" />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3">Ticket</th>
                                <th className="px-6 py-3">Data</th>
                                <th className="px-6 py-3">Cliente</th>
                                <th className="px-6 py-3">Itens</th>
                                <th className="px-6 py-3">Total</th>
                                <th className="px-6 py-3">Pagamento</th>
                                <th className="px-6 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-8 text-gray-500">Nenhuma venda encontrada.</td></tr>
                            ) : (
                                currentRecords.map(sale => (
                                    <tr 
                                        key={sale.id} 
                                        onClick={() => setSelectedSale(sale)}
                                        className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
                                    >
                                        <td className="px-6 py-4 font-mono font-medium">{sale.id.split('-').slice(0, 3).join('-')}</td>
                                        <td className="px-6 py-4">{new Date(sale.timestamp).toLocaleString('pt-BR')}</td>
                                        <td className="px-6 py-4">
                                            <div>{sale.customerName}</div>
                                            <div className="text-xs text-gray-500">{sale.customerWhatsapp ? formatPhone(sale.customerWhatsapp) : ''}</div>
                                        </td>
                                        <td className="px-6 py-4">{sale.items.length}</td>
                                        <td className="px-6 py-4 font-bold text-green-600 dark:text-green-400">R$ {formatCurrencyNumber(sale.total)}</td>
                                        <td className="px-6 py-4">{sale.paymentMethod || 'N/A'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-xs uppercase"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedSale(sale);
                                                }}
                                            >
                                                Detalhes
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
                        <span className="text-sm text-gray-700 dark:text-gray-400">Página {currentPage} de {nPages} ({filteredSales.length} vendas)</span>
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
