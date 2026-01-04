
import React, { useState, useContext, useEffect } from 'react';
import { API_BASE_URL, SAAS_LOGIN_URL } from '../config';
import { AuthContext } from '../contexts/AuthContext';
import { User, UserRole } from '../types';
import { validateEmail } from '../validation';

// Componente de Modal Interno
interface ModalProps {
    isOpen: boolean;
    type: 'success' | 'error';
    message: string;
    onClose: () => void;
}

const NotificationModal: React.FC<ModalProps> = ({ isOpen, type, message, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-6 max-w-sm w-full transform transition-all scale-100">
                <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${type === 'success' ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'}`}>
                    {type === 'success' ? (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
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

// Modal específico para bloqueio de tenant
const BlockedAccessModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 border-2 border-red-600 dark:border-red-500 rounded-xl shadow-2xl p-8 max-w-sm w-full text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-6 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
                    <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Acesso Bloqueado!</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-8">
                    Solicite ao responsável para desbloquear o acesso.
                </p>
                <button
                    onClick={onClose}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105"
                >
                    Entendido
                </button>
            </div>
        </div>
    );
};

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const [isFirstTimeSetup, setIsFirstTimeSetup] = useState<boolean | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    
    // Modal States
    const [showBlockedModal, setShowBlockedModal] = useState(false);
    const [modalState, setModalState] = useState<{ isOpen: boolean; type: 'success' | 'error'; message: string }>({
        isOpen: false,
        type: 'success',
        message: ''
    });

    useEffect(() => {
        const checkSystemStatus = async () => {
            try {
                // Check if any users exist to determine if it's the first setup
                const response = await fetch(`${API_BASE_URL}/auth/system-status`);
                if (response.ok) {
                    const { userCount } = await response.json();
                    setIsFirstTimeSetup(userCount === 0);
                } else {
                     setIsFirstTimeSetup(null);
                     // Não bloqueia com modal aqui, deixa falhar silenciosamente ou mostra msg discreta
                }
            } catch (err) {
                // Erro de conexão silencioso na inicialização para não assustar o usuário
                setIsFirstTimeSetup(null);
            }
        };
        checkSystemStatus();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateEmail(email)) {
            setModalState({ isOpen: true, type: 'error', message: 'Por favor, insira um endereço de e-mail válido.' });
            return;
        }

        setIsLoading(true);

        try {
            const url = isFirstTimeSetup 
                ? `${API_BASE_URL}/users/setup-owner` 
                : `${API_BASE_URL}/auth/login`;

            const payload = isFirstTimeSetup
                ? { name: email.split('@')[0], email, password }
                : { email, password };
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            
            const data = await response.json();

            if (response.ok) {
                login(data.user, data.token);
            } else {
                // Tratamento específico para Tenant Bloqueado (Manager/Technician)
                if (data.code === 'TENANT_BLOCKED') {
                    setShowBlockedModal(true);
                } else {
                    throw new Error(data.message || 'Falha na autenticação.');
                }
            }

        } catch (err) {
            setModalState({ 
                isOpen: true, 
                type: 'error', 
                message: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido ao tentar fazer login.' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBlockedModalClose = () => {
        setShowBlockedModal(false);
        // Redireciona para a home do FluxoClean (Login central)
        window.location.href = SAAS_LOGIN_URL;
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4">
            <NotificationModal 
                isOpen={modalState.isOpen} 
                type={modalState.type} 
                message={modalState.message} 
                onClose={() => setModalState({ ...modalState, isOpen: false })} 
            />

            <BlockedAccessModal 
                isOpen={showBlockedModal} 
                onClose={handleBlockedModalClose} 
            />

            <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl animate-fade-in">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <svg className="mr-3" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M2.5 5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m2 0a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m7.5-.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m1.5.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m-7-1a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1zm5.5 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"/>
                        <path d="M11.5 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5m0-1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3M5 10.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"/>
                        <path d="M7 10.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0m-1 0a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0"/>
                        <path d="M14 0a.5.5 0 0 1 .5.5V2h.5a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h12.5V.5A.5.5 0 0 1 14 0M1 3v3h14V3zm14 4H1v7h14z"/>
                      </svg>
                      SmartStore
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Bem-vindo ao seu painel de gestão inteligente.</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-t-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm transition-all"
                                placeholder="Email"
                            />
                        </div>
                        <div className="relative">
                            <label htmlFor="password-input" className="sr-only">Senha</label>
                            <input
                                id="password-input"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-b-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10 transition-all"
                                placeholder="Senha"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 z-10 pr-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-indigo-500 transition-colors"
                                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zM9 4.803A7.968 7.968 0 0110 5c3.453 0 6.545 2.057 7.938 5.127a9.406 9.406 0 01-1.394 2.531l-1.493-1.493A3.013 3.013 0 0012.015 9.5l-1.07-1.071A5.004 5.004 0 009 4.803zM4.83 5.06A9.95 9.95 0 00.458 10c1.274 4.057 5.064 7 9.542 7a9.95 9.95 0 004.18-1.031l-1.424-1.424A5.013 5.013 0 0110.01 13a5 5 0 01-4.242-4.242l-1.939-1.94z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-[1.02] active:scale-100 disabled:bg-indigo-400 disabled:cursor-not-allowed shadow-md"
                        >
                            {isLoading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Entrando...
                                </span>
                            ) : 'Entrar'}
                        </button>
                    </div>
                </form>
                <div className="text-xs text-center text-gray-500 dark:text-gray-400 p-2 bg-indigo-50 dark:bg-gray-700/50 rounded-lg">
                   {isFirstTimeSetup === true && (
                        <p>✨ <strong>Primeiro Acesso!</strong> ✨<br/>Insira o email e senha desejados para criar a conta de Administrador (Owner).</p>
                    )}
                    {isFirstTimeSetup === false && (
                        <p>Faça login para acessar seu painel.</p>
                    )}
                    {isFirstTimeSetup === null && (
                         <p>Verificando o sistema...</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
