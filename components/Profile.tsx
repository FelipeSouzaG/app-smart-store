
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { User } from '../types';
import { formatName, validateName, validateEmail, checkPasswordStrength, validatePassword } from '../validation';

interface ProfileProps {
    onUpdateProfile: (userData: Partial<User> & { password?: string }) => Promise<any>;
}

// Modal Component
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
                    {type === 'success' ? 'OK' : 'Fechar'}
                </button>
            </div>
        </div>
    );
};

const PasswordStrengthIndicator: React.FC<{ password: string }> = ({ password }) => {
    const strength = checkPasswordStrength(password);
    
    const Item = ({ valid, text }: { valid: boolean; text: string }) => (
        <li className={`text-xs flex items-center space-x-2 ${valid ? 'text-green-600' : 'text-gray-400'}`}>
            <span>{valid ? '✔' : '○'}</span>
            <span>{text}</span>
        </li>
    );

    if (!password) return null;

    return (
        <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
            <Item valid={strength.length} text="Mínimo 8 caracteres" />
            <Item valid={strength.uppercase} text="Letra Maiúscula" />
            <Item valid={strength.lowercase} text="Letra Minúscula" />
            <Item valid={strength.number} text="Número" />
            <Item valid={strength.symbol} text="Símbolo (!@#$)" />
        </ul>
    );
};

const Profile: React.FC<ProfileProps> = ({ onUpdateProfile }) => {
    const { user } = useContext(AuthContext);
    
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [modalState, setModalState] = useState<{ isOpen: boolean; type: 'success' | 'error'; message: string }>({
        isOpen: false,
        type: 'success',
        message: ''
    });


    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
        }
    }, [user]);

    const validateForm = () => {
        const newErrors: { name?: string; email?: string; password?: string } = {};
        if (!validateName(name)) {
            newErrors.name = 'Nome inválido. Insira nome e sobrenome.';
        }
        if (!validateEmail(email)) {
            newErrors.email = 'Formato de email inválido.';
        }

        // Password validation logic
        if (password) { // User is typing a new password
            if (!validatePassword(password)) {
                newErrors.password = 'A senha não atende aos requisitos de segurança.';
            } else if (confirmPassword && password !== confirmPassword) {
                // Only check for mismatch if the confirmation field is also filled.
                newErrors.password = 'As senhas não coincidem.';
            }
        } else if (confirmPassword) {
            // User typed in confirmation but not the new password itself.
            newErrors.password = 'Por favor, preencha o campo "Nova Senha" primeiro.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        const payload: Partial<User> & { password?: string } = {
            name: formatName(name),
            email,
        };
        if (password) {
            payload.password = password;
        }

        try {
            await onUpdateProfile(payload);
            setModalState({ isOpen: true, type: 'success', message: 'Perfil atualizado com sucesso!' });
            // Optional: clear password fields after success
            setPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setModalState({ isOpen: true, type: 'error', message: err.message || 'Erro ao atualizar perfil.' });
        }
    };
    
    const isSaveDisabled = !name || !email || Object.keys(errors).length > 0;

    const PasswordToggleIcon = ({ isVisible }: { isVisible: boolean }) => isVisible ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zM9 4.803A7.968 7.968 0 0110 5c3.453 0 6.545 2.057 7.938 5.127a9.406 9.406 0 01-1.394 2.531l-1.493-1.493A3.013 3.013 0 0012.015 9.5l-1.07-1.071A5.004 5.004 0 009 4.803zM4.83 5.06A9.95 9.95 0 00.458 10c1.274 4.057 5.064 7 9.542 7a9.95 9.95 0 004.18-1.031l-1.424-1.424A5.013 5.013 0 0110.01 13a5 5 0 01-4.242-4.242l-1.939-1.94z" clipRule="evenodd" />
        </svg>
    );

    return (
        <div className="container mx-auto max-w-2xl">
            <NotificationModal 
                isOpen={modalState.isOpen} 
                type={modalState.type} 
                message={modalState.message} 
                onClose={() => setModalState({ ...modalState, isOpen: false })} 
            />
            
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Dados do Usuário</h1>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium">Nome Completo</label>
                        <input 
                            id="name"
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            onBlur={() => { setName(formatName(name)); validateForm(); }} 
                            required 
                            className={`mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-3 ${errors.name ? 'border-red-500' : ''}`}
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>
                     <div>
                        <label htmlFor="email" className="block text-sm font-medium">Email</label>
                        <input 
                            id="email"
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            onBlur={validateForm} 
                            required 
                            className={`mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-3 ${errors.email ? 'border-red-500' : ''}`}
                        />
                        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                         <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Preencha os campos abaixo apenas se desejar alterar sua senha.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="relative">
                                <label htmlFor="password"  className="block text-sm font-medium">Nova Senha</label>
                                <input 
                                    id="password"
                                    type={showPassword ? 'text' : 'password'} 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    onKeyUp={validateForm}
                                    className={`mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-3 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 top-6 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400"
                                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                >
                                   <PasswordToggleIcon isVisible={showPassword} />
                                </button>
                            </div>
                            <div className="relative">
                                <label htmlFor="confirm-password"  className="block text-sm font-medium">Confirmar Nova Senha</label>
                                <input 
                                    id="confirm-password"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword} 
                                    onChange={e => setConfirmPassword(e.target.value)} 
                                    onKeyUp={validateForm}
                                    className={`mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-3 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                                />
                                 <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 top-6 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400"
                                    aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                                >
                                   <PasswordToggleIcon isVisible={showConfirmPassword} />
                                </button>
                            </div>
                        </div>
                        {/* Password Requirement Visuals */}
                        <div className="mt-2">
                            <PasswordStrengthIndicator password={password} />
                        </div>
                        {errors.password && <p className="text-xs text-red-500 mt-2 text-center md:text-left">{errors.password}</p>}
                    </div>

                     <div className="flex justify-end pt-4">
                        <button 
                            type="submit" 
                            disabled={isSaveDisabled} 
                            className="px-6 py-3 rounded-md text-white font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-transform transform hover:scale-105"
                        >
                            Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile;
