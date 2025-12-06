
import React from 'react';

interface NotificationModalProps {
    isOpen: boolean;
    type: 'success' | 'error';
    message: string;
    onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, type, message, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6 max-w-sm w-full transform transition-all scale-100">
                <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${type === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                    {type === 'success' ? (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                </div>
                <h3 className={`text-lg leading-6 font-bold text-center mb-2 ${type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {type === 'success' ? 'Sucesso!' : 'Atenção'}
                </h3>
                <p className="text-sm text-gray-300 text-center mb-6">
                    {message}
                </p>
                <button
                    onClick={onClose}
                    className={`w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm transition-colors ${
                        type === 'success' 
                        ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                        : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    }`}
                >
                    {type === 'success' ? 'Continuar' : 'Fechar'}
                </button>
            </div>
        </div>
    );
};

export default NotificationModal;
