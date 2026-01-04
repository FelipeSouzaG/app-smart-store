const isProd = window.location.hostname === 'smart-store.fluxoclean.com.br';

export const API_BASE_URL = isProd
  ? 'https://api-smart-store.fluxoclean.com.br/api'
  : 'https://api-smart-store.local.fluxoclean.com.br/api';

export const SAAS_LOGIN_URL = isProd
  ? 'https://fluxoclean.com.br/login'
  : 'https://app.local.fluxoclean.com.br/login';

export const SAAS_API_URL = isProd
  ? 'https://api.fluxoclean.com.br/api'
  : 'https://api.local.fluxoclean.com.br/api';
