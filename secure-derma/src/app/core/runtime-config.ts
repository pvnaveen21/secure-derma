type RuntimeConfig = {
    BASEURL_API?: string;
    GOOGLE_CLIENT_ID?: string;
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

const config = readRuntimeConfig();

export const runtimeConfig = {
    BASEURL_API: normalizeValue(config.BASEURL_API, '/api'),
    GOOGLE_CLIENT_ID: normalizeValue(config.GOOGLE_CLIENT_ID, '')
} as const;
