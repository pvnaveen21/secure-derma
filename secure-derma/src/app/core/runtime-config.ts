type RuntimeConfig = {
    BASEURL_API?: string;
    GOOGLE_CLIENT_ID?: string;
    SITE_URL?: string;
    DEFAULT_OG_IMAGE?: string;
    GOOGLE_SITE_VERIFICATION?: string;
};

declare global {
    interface Window {
        __SECURE_DERMA_CONFIG__?: RuntimeConfig;
    }
}

const normalizeValue = (value: string | undefined, fallback: string): string => {
    if (typeof value !== 'string') {
        return fallback;
    }

    const normalized = value.trim();
    return normalized || fallback;
};

const readRuntimeConfig = (): RuntimeConfig => {
    if (typeof window === 'undefined') {
        return {};
    }

    return window.__SECURE_DERMA_CONFIG__ ?? {};
};

const isLocalHost = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    return ['localhost', '127.0.0.1'].includes(window.location.hostname);
};

const config = readRuntimeConfig();

export const runtimeConfig = {
    BASEURL_API: normalizeValue(
        config.BASEURL_API,
        isLocalHost() ? 'http://127.0.0.1:8000/api' : 'https://secure-derma-backend.onrender.com/api'
    ),
    GOOGLE_CLIENT_ID: normalizeValue(config.GOOGLE_CLIENT_ID, ''),
    SITE_URL: normalizeValue(
        config.SITE_URL,
        isLocalHost() ? 'http://localhost:4200' : 'https://www.securederma.com'
    ),
    DEFAULT_OG_IMAGE: normalizeValue(config.DEFAULT_OG_IMAGE, '/assets/secure-derma/SecureDerma_LightMode.png'),
    GOOGLE_SITE_VERIFICATION: normalizeValue(config.GOOGLE_SITE_VERIFICATION, '')
} as const;
