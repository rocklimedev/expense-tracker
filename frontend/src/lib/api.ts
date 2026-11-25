const DEFAULT_API_URL = import.meta.env.PROD
  ? 'https://expense-api.spsyndicate.net'
  : 'http://localhost:3000';
export const BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
const TOKEN_KEY = 'expense_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};
