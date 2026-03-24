import { jwtDecode } from 'jwt-decode';
import { authTokenId, refreshTokenId } from './config';

export const ACCESS_TOKEN = authTokenId;
export const REFRESH_TOKEN = refreshTokenId;

// Store token in local storage
export const setToken = (token: string, flag: string): void => {
    localStorage.setItem(flag, token);
};

// Get token from local storage
export const getToken = (flag: string): string | null => localStorage.getItem(flag) || null;

// Remove tokens from local storage
export const unsetToken = (): void => {
    return [ACCESS_TOKEN, REFRESH_TOKEN].forEach((token) => localStorage.removeItem(token));
};

// Get token expiration date
export const getTokenExpiration = (flag: string): Date | null => {
    const token = getToken(flag);

    if (token) {
        try {
            const { exp } = jwtDecode<{ exp: number }>(token);
            return exp ? new Date(exp * 1000) : null;
        } catch (error) {
            return null;
        }
    }
    return null;
};

// Check if token is expired
export const isTokenExpired = (flag: string, bufferSeconds = 30): boolean => {
    const expiration = getTokenExpiration(flag);
    if (!expiration) return true;

    return (expiration.getTime() - (bufferSeconds * 1000)) <= Date.now();
};
