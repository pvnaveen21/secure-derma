type RuntimeEnv = {
    BASEURL_API?: string;
};

declare global {
    interface Window {
        __SECURE_DERMA_ENV__?: RuntimeEnv;
    }
}

const runtimeEnv = window.__SECURE_DERMA_ENV__ ?? {};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');
const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const runtimeEnvironment = {
    BASEURL_API: trimTrailingSlash(
        runtimeEnv.BASEURL_API ?? (
            isLocalHost
                ? 'http://127.0.0.1:8000/api/admin'
                : 'https://secure-derma-backend.onrender.com/api/admin'
        )
    )
};
