import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { formatName, validateName, validateEmail, validatePassword, checkPasswordStrength } from '../validation';

interface UserModalProps {
    userToEdit?: User | null;
    onClose: () => void;
    onSave: (userData: (Omit<User, 'id'> | User) & { password?: string }) => Promise<void>;
}

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
        <ul className="mt-2 grid grid-cols-2 gap-1 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
            <Item valid={strength.length} text="Mín 8 chars" />
            <Item valid={strength.uppercase} text="Maiúscula" />
            <Item valid={strength.lowercase} text="Minúscula" />
            <Item valid={strength.number} text="Número" />
            <Item valid={strength.symbol} text="Símbolo" />
        </ul>
    );
};

const UserModal: React.FC<UserModalProps> = ({ userToEdit, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.TECHNICIAN);
    const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
    const [showPassword, setShowPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);


    const isEditing = !!userToEdit;

    useEffect(() => {
        if (userToEdit) {
            setName(userToEdit.name);
            setEmail(userToEdit.email);
            setRole(userToEdit.role);
            setPassword(''); // Clear password field for editing
        } else {
            setName('');
            setEmail('');
            setRole(UserRole.TECHNICIAN);
            setPassword('');
        }
        setErrors({});
    }, [userToEdit]);
    
    const validateForm = () => {
        const newErrors: { name?: string; email?: string; password?: string } = {};
        if (!validateName(name)) {
            newErrors.name = 'Nome inválido. Insira nome e sobrenome.';
        }
        if (!validateEmail(email)) {
            newErrors.email = 'Formato de email inválido.';
        }
        if ((!isEditing && !password) || (password && !validatePassword(password))) {
             newErrors.password = 'Senha fraca.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        
        const userData: (Omit<User, 'id'> | User) & { password?: string } = {
            ...(userToEdit || {}),
            name: formatName(name),
            email,
            role,
        };
        // Only include password if it's not empty
        if (password) {
            userData.password = password;
        }

        setIsSaving(true);
        setErrors({}); // Clear previous server errors

        try {
            await onSave(userData);
            // If successful, the parent calls handleCloseModal
        } catch (error: any) {
            // Handle specific server errors here
            const msg = error.message || '';
            if (msg.includes('Email já cadastrado') || msg.includes('já cadastrado')) {
                setErrors(prev => ({ ...prev, email: 'Este email já está em uso por outro usuário.' }));
            } else if (msg.includes('Senha')) {
                setErrors(prev => ({ ...prev, password: msg }));
            } else {
                alert('Erro ao salvar usuário: ' + msg);
            }
        } finally {
            setIsSaving(false);
        }
    };
    
    const isSaveDisabled = Object.keys(errors).length > 0 || !name || !email || (!isEditing && !password) || isSaving;

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6">{isEditing ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Nome Completo</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} onBlur={() => { setName(formatName(name)); validateForm(); }} required className={`mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2 ${errors.name ? 'border-red-500' : ''}`}/>
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Email</label>
                        <input type="email" value={email} onChange={e => { setEmail(e.target.value); if(errors.email) setErrors(prev => ({...prev, email: undefined})); }} onBlur={validateForm} required className={`mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2 ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}/>
                        {errors.email && <p className="text-xs text-red-500 mt-1 font-bold">{errors.email}</p>}
                    </div>
                     <div className="relative">
                        <label className="block text-sm font-medium">Senha</label>
                        <input 
                            type={showPassword ? 'text' : 'password'} 
                            value={password} 
                            onChange={e => { setPassword(e.target.value); validateForm(); }}
                            onKeyUp={validateForm}
                            required={!isEditing}
                            placeholder={isEditing ? "Deixe em branco para não alterar" : ""}
                            className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2 pr-10"
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
                    
                    {password && <PasswordStrengthIndicator password={password} />}
                    {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}

                    <div>
                        <label className="block text-sm font-medium">Função</label>
                        <select 
                            value={role} 
                            onChange={e => setRole(e.target.value as UserRole)} 
                            disabled={userToEdit?.role === UserRole.OWNER}
                            className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2 disabled:opacity-50"
                        >
                           {Object.values(UserRole).filter(r => r !== UserRole.OWNER).map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                           {userToEdit?.role === UserRole.OWNER && <option value={UserRole.OWNER} className="capitalize">{UserRole.OWNER}</option>}
                        </select>
                         {userToEdit?.role === UserRole.OWNER && <p className="text-xs text-yellow-500 mt-1">A função do "owner" não pode ser alterada.</p>}
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300">Cancelar</button>
                        <button type="submit" disabled={isSaveDisabled} className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">
                            {isSaving ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Usuário')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
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


interface UsersProps {
    users: User[];
    onAddUser: (userData: Omit<User, 'id'> & { password?: string }) => Promise<void>;
    onUpdateUser: (userData: User & { password?: string }) => Promise<void>;
    onDeleteUser: (userId: string) => void;
}

const Users: React.FC<UsersProps> = ({ users, onAddUser, onUpdateUser, onDeleteUser }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

    const handleOpenCreateModal = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleSaveUser = async (userData: (Omit<User, 'id'> | User) & { password?: string }) => {
        if ('id' in userData) {
            await onUpdateUser(userData as User & { password?: string });
        } else {
            await onAddUser(userData as Omit<User, 'id'> & { password?: string });
        }
        // Only close modal if no error was thrown above
        handleCloseModal();
    };

    const handleDeleteRequest = (user: User) => {
         if (user.role === UserRole.OWNER) {
            alert('O usuário "owner" não pode ser excluído.');
            return;
        }
        setDeletingUserId(user.id);
    };

    const handleDeleteConfirm = () => {
        if (deletingUserId) {
            onDeleteUser(deletingUserId);
        }
        setDeletingUserId(null);
    };

    return (
        <div className="container mx-auto">
            {isModalOpen && <UserModal userToEdit={editingUser} onClose={handleCloseModal} onSave={handleSaveUser} />}
            {deletingUserId && (
                <ConfirmationModal
                    message="Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita."
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeletingUserId(null)}
                />
            )}
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Usuários</h1>
                <button onClick={handleOpenCreateModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Adicionar Usuário</button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nome</th>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3">Função</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{user.name}</td>
                                    <td className="px-6 py-4">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`capitalize px-2 py-1 text-xs font-medium rounded-full ${
                                            user.role === UserRole.OWNER ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
                                            user.role === UserRole.MANAGER ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button onClick={() => handleOpenEditModal(user)} className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline mr-4">Editar</button>
                                        <button onClick={() => handleDeleteRequest(user)} className="font-medium text-red-600 dark:text-red-500 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed" disabled={user.role === UserRole.OWNER}>Excluir</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Users;
