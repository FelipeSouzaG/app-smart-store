
import React from 'react';

interface BroadcastMessage {
    _id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success';
}

interface Props {
    messages: BroadcastMessage[];
    onRead: (id: string) => void;
}

const BroadcastModal: React.FC<Props> = ({ messages, onRead }) => {
    // Show only the first unread message
    const current = messages[0];

    if (!current) return null;

    const colors = {
        info: { bg: 'bg-blue-600', icon: 'text-blue-600', light: 'bg-blue-50' },
        warning: { bg: 'bg-yellow-600', icon: 'text-yellow-600', light: 'bg-yellow-50' },
        success: { bg: 'bg-green-600', icon: 'text-green-600', light: 'bg-green-50' },
    };

    const style = colors[current.type];

    return (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black bg-opacity-70 p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className={`${style.bg} p-4 text-white flex items-center justify-between`}>
                    <h3 className="font-bold text-lg">Comunicado Importante</h3>
                    <div className="bg-white/20 p-1.5 rounded-full">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                    </div>
                </div>
                
                <div className="p-6">
                    <h4 className={`text-xl font-bold mb-3 ${style.icon} dark:text-white`}>{current.title}</h4>
                    <div className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line max-h-64 overflow-y-auto">
                        {current.message}
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                        <button 
                            onClick={() => onRead(current._id)}
                            className={`px-6 py-2.5 rounded-lg text-white font-bold shadow-md transition-transform hover:scale-105 ${style.bg} hover:opacity-90`}
                        >
                            Entendido
                        </button>
                    </div>
                </div>
                
                {messages.length > 1 && (
                    <div className="bg-gray-50 dark:bg-gray-900 p-2 text-center text-xs text-gray-500">
                        +{messages.length - 1} outra(s) mensagem(ns) na fila.
                    </div>
                )}
            </div>
        </div>
    );
};

export default BroadcastModal;
