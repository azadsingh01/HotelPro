import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'hotelpro-token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data?.success === true && Object.hasOwn(response.data, 'data')) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    const requestUrl = error.config?.url ?? '';
    const isLoginRequest = requestUrl.endsWith('/auth/login') || requestUrl.endsWith('/auth/admin-login');
    const requestAuthorization = error.config?.headers?.Authorization
      ?? error.config?.headers?.get?.('Authorization');
    const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (
      error.response?.status === 401
      && !isLoginRequest
      && requestAuthorization === `Bearer ${currentToken}`
    ) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(new Event('hotelpro:session-expired'));
    }

    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const responseData = error.response?.data;
  const firstDetail = (responseData?.data?.details ?? responseData?.details)?.[0]?.message;

  return firstDetail || responseData?.message || error.message || fallback;
}
