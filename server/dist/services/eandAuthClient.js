import axios from 'axios';
import { env } from '../config/env';
// In-memory token cache
let cachedAccessToken = null;
let cachedRefreshToken = null;
/**
 * Get access token, using cache if available
 * @param forceRefresh - If true, force a new login even if token is cached
 * @returns Access token string
 */
export async function getAccessToken(forceRefresh = false) {
    // Return cached token if available and not forcing refresh
    if (!forceRefresh && cachedAccessToken) {
        return cachedAccessToken;
    }
    // Validate required environment variables
    if (!env.EAND_API_EMAIL) {
        throw new Error('EAND_API_EMAIL environment variable is required');
    }
    if (!env.EAND_API_PASSWORD) {
        throw new Error('EAND_API_PASSWORD environment variable is required');
    }
    const loginUrl = env.EAND_LOGIN_URL || 'https://nexus.eandenterprise.com/api/v1/accounts/users/login';
    try {
        const response = await axios.post(loginUrl, {
            email: env.EAND_API_EMAIL,
            password: env.EAND_API_PASSWORD,
        }, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
        // Store tokens in cache
        cachedAccessToken = response.data.access_token;
        cachedRefreshToken = response.data.refresh_token;
        console.log('[EAND_AUTH] Successfully logged in and cached access token');
        return cachedAccessToken;
    }
    catch (err) {
        // Clear cache on login failure
        cachedAccessToken = null;
        cachedRefreshToken = null;
        let errorMessage = 'Failed to login to E& Nexus API';
        if (err.response?.data) {
            const data = err.response.data;
            if (data.message) {
                errorMessage = data.message;
            }
            else if (typeof data === 'string') {
                errorMessage = data;
            }
            else {
                errorMessage = JSON.stringify(data);
            }
        }
        else if (err.message) {
            errorMessage = err.message;
        }
        console.error('[EAND_AUTH] Login failed:', {
            statusCode: err.response?.status,
            error: errorMessage,
            url: loginUrl,
        });
        throw new Error(`EAND_AUTH_ERROR: ${errorMessage}`);
    }
}
/**
 * Clear cached tokens (useful for testing or forced logout)
 */
export function clearTokenCache() {
    cachedAccessToken = null;
    cachedRefreshToken = null;
}
