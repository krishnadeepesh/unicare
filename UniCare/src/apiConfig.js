/**
 * Centralized API configuration for UniCare.
 * Automatically switches between local development (http://localhost:8000)
 * and hosted production environment via VITE_BACKEND_URL.
 */
const getBackendUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, '');
  }
  return 'http://localhost:8000';
};

export const BACKEND_URL = getBackendUrl();
export const API_BASE_URL = `${BACKEND_URL}/api/super-admin`;
export const MEDIA_BASE_URL = `${BACKEND_URL}/media`;

export default {
  BACKEND_URL,
  API_BASE_URL,
  MEDIA_BASE_URL,
};
