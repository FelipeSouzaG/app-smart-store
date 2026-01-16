
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { API_BASE_URL, SAAS_LOGIN_URL, SAAS_API_URL } from './config';
import Layout from './components/Layout';
import { AuthContext } from './contexts/AuthContext';
import type { User } from './types';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null); 
    const [isLoading, setIsLoading] = useState(true);
    
    const processingCode = useRef(false);

    const logout = async () => {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        } catch (e) { console.error(e); }
        
        localStorage.removeItem('token');
        // FIX: Limpa a chave correta para re-testar o fluxo de Growth
        sessionStorage.removeItem('growthAlertSeen');
        sessionStorage.removeItem('googleAlertSeen'); // Limpa a legada também por garantia
        
        setUser(null);
        setToken(null);
        window.location.href = SAAS_LOGIN_URL;
    };

    useEffect(() => {
        const initializeAuth = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const authCode = urlParams.get('code');
            
            if (authCode) {
                if (processingCode.current) return;
                processingCode.current = true;

                try {
                    const exchangeResponse = await fetch(`${SAAS_API_URL}/auth/exchange-code`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: authCode })
                    });

                    if (exchangeResponse.ok) {
                        const data = await exchangeResponse.json();
                        const tempToken = data.token;
                        
                        if (tempToken) {

                            await performHandshake(tempToken);
                            window.history.replaceState({}, document.title, window.location.pathname);
                        }
                    } else {
                        alert("Código de autorização inválido.");
                        logout();
                        return;
                    }
                } catch (error) {
                    console.error("Code exchange error:", error);
                    logout();
                    return;
                }
            } else {

                await performHandshake(null);
            }
            setIsLoading(false);
        };

        initializeAuth();
    }, []);

    const performHandshake = async (bearerToken: string | null) => {
        try {
            const headers: any = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            };

            if (bearerToken) {
                headers['Authorization'] = `Bearer ${bearerToken}`;
            }

            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers,
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();

                setUser(data.user);

                if (data.token) {
                    setToken(data.token);
                }
            } else {
                if (bearerToken) { 
                    alert("Erro ao validar sessão com o servidor.");
                    logout();
                } else {
                    // Silent fail if no token provided (initial load without session)
                    if (response.status === 401 || response.status === 403) {
                         window.location.href = SAAS_LOGIN_URL;
                    }
                }
            }
        } catch (error) {
            console.error("Handshake failed", error);
            if (bearerToken) logout();
        }
    };

    const login = (userData: User, userToken: string) => {
        setUser(userData);
        setToken(userToken);
    };

    const updateUser = (newUserData: User) => {
        setUser(newUserData);
    };

    const apiCall = async (endpoint: string, method: string, body?: any): Promise<any | null> => {
        try {
            const headers: any = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const options: RequestInit = {
                method,
                headers,
                credentials: 'include'
            };
            
            if (body) {
                options.body = JSON.stringify(body);
            }
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);

            if (response.status === 401 || response.status === 403) {

                logout();
                return null;
            }

            if (response.status === 204 || response.headers.get('content-length') === '0') {
                return { success: true };
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'A chamada à API falhou');
            }
            
            return data;

        } catch (error) {
            console.error(`Error with ${method} ${endpoint}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

            if (errorMessage.includes('Email já cadastrado') || errorMessage.includes('já cadastrado')) {
                throw error; 
            }

            if (!(error instanceof Error && error.message.includes('não encontrado'))) {
                 console.warn(`API Error: ${errorMessage}`);
            }
            return null;
        }
    };

    const authContextValue = useMemo(() => ({
        user,
        token,
        login,
        logout,
        apiCall,
        updateUser,
    }), [user, token]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Conectando com segurança...</p>
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={authContextValue}>
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                {user && <Layout />}
            </div>
        </AuthContext.Provider>
    );
};

export default App;
