import { environment } from "../../../environments/environment";

function getOrigin(): string {
    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
    }

    return 'http://localhost';
}

function resolveBaseUrl(): string {
    const configuredBaseUrl = environment.BASEURL_API?.trim() || '/api';

    try {
        const configuredUrl = new URL(configuredBaseUrl, getOrigin());
        if (typeof window !== 'undefined' && (configuredUrl.hostname === "127.0.0.1" || configuredUrl.hostname === "localhost")) {
            configuredUrl.hostname = window.location.hostname;
        }
        return configuredUrl.toString().replace(/\/$/, "");
    } catch {
        return new URL('/api', getOrigin()).toString().replace(/\/$/, '');
    }
}

const baseUrl = resolveBaseUrl();

export const appDetails = {
    name: 'Emerald TEJ',
    description: '',
    year: new Date().getFullYear(),
    dbName: 'tej',
    dbVersion: 1
};

export function GetApiUrl(
    path: string,
    params?: Record<string, string | number | boolean | (string | number | boolean)[]>
): string {
    const url = new URL(baseUrl + path);

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach(v => url.searchParams.append(key, String(v)));
            } else {
                url.searchParams.append(key, String(value));
            }
        });
    }

    return url.toString();
}


export const authTokenId = 'tej_access_token';
export const refreshTokenId = 'tej_refresh_token';
