// frontend/src/config.js

const DEFAULT_DEV_BACKEND = 'http://127.0.0.1:3001/api';

/**
 * Central API Base URL configuration.
 * - Uses REACT_APP_API_BASE from .env if available.
 * - Fallback to DEFAULT_DEV_BACKEND in development mode.
 * - Fallback to relative /api for production on the same host.
 */
export const API_BASE = process.env.REACT_APP_API_BASE ||
    (process.env.NODE_ENV === 'development' ? DEFAULT_DEV_BACKEND : '/api');

export default {
    API_BASE
};
