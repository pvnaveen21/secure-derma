import { jwtDecode } from 'jwt-decode';
import { authTokenId, refreshTokenId } from './config';

export const ACCESS_TOKEN = authTokenId;
export const REFRESH_TOKEN = refreshTokenId;

const isUsableToken = (token: string | null | undefined): token is string => {
    if (typeof token !== 'string') {
        return false;
    }

    const normalized = token.trim();
    return normalized !== '' && normalized !== 'undefined' && normalized !== 'null';
};

// Store token in local storage
export const setToken = (token: string, flag: string): void => {
    if (!isUsableToken(token)) {
        localStorage.removeItem(flag);
        return;
    }

    localStorage.setItem(flag, token);
};

// Get token from local storage
export const getToken = (flag: string): string | null => {
    const token = localStorage.getItem(flag);
    if (!isUsableToken(token)) {
        localStorage.removeItem(flag);
        return null;
    }

    return token;
};

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
            console.error('Invalid token format', error);
            return null;
        }
    }
    return null;
};

// Check if token is expired
export const isTokenExpired = (flag: string): boolean => {
    const expiration = getTokenExpiration(flag);
    return !expiration || expiration.getTime() <= Date.now();
};
