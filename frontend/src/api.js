const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getToken = () => localStorage.getItem('token') || localStorage.getItem('hrToken');

const setToken = (newToken) => {
    if (localStorage.getItem('hrToken')) {
        localStorage.setItem('hrToken', newToken);
    } else {
        localStorage.setItem('token', newToken);
    }
};

const originalFetch = window.fetch;

export const setupGlobalFetchInterceptor = () => {
    window.fetch = async (url, options = {}) => {
        // Only intercept requests to our own API 
        if (typeof url === 'string' && url.includes('/api/')) {
            let token = getToken();
            let headers = { ...options.headers };

            // Inject the active token
            if (token && !url.includes('/api/auth/refresh')) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Perform the original fetch
            let response = await originalFetch(url, { ...options, headers });

            // If 401 Unauthorized, attempt to refresh exactly once
            if (response.status === 401 && !options._retry && !url.includes('/api/auth/refresh')) {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    try {
                        const refreshRes = await originalFetch(`${API_URL}/api/auth/refresh`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ refreshToken })
                        });

                        if (refreshRes.ok) {
                            const data = await refreshRes.json();
                            if (data.success && data.token) {
                                setToken(data.token);
                                // Retry original request with the new token
                                headers['Authorization'] = `Bearer ${data.token}`;
                                return await originalFetch(url, { ...options, headers, _retry: true });
                            }
                        }
                    } catch (err) {
                        console.error('Silent refresh failed:', err);
                    }
                }

                // If refresh fails or doesn't exist, force logout
                localStorage.removeItem('token');
                localStorage.removeItem('hrToken');
                localStorage.removeItem('refreshToken');
                if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                    window.location.href = '/login';
                }
            }

            return response;
        }

        // For all non-API external requests (like Cloudinary), use native fetch
        return originalFetch(url, options);
    };
};

export const fetchWithAuth = window.fetch;
