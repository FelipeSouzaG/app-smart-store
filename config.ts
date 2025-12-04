const isProd = (import.meta as any).env.PROD;

export const API_BASE_URL = isProd 
  ? 'https://api-smart-store.onrender.com/api'
  : 'http://localhost:4001/api';

export const SAAS_LOGIN_URL = isProd
  ? 'https://fluxoclean.com.br/login'
  : 'http://localhost:3000/login';

export const SAAS_API_URL = isProd
  ? 'https://api-fluxoclean.onrender.com/api'
  : 'http://localhost:4000/api';
