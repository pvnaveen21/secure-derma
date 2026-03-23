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

export const runtimeEnvironment = {
    BASEURL_API: trimTrailingSlash(runtimeEnv.BASEURL_API ?? '')
};
