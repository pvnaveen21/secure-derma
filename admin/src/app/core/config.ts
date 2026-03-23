import { environment } from 'src/environments/environment';

export const apiBaseUrl = environment.BASEURL_API;

export function GetApiUrl(
    path: string,
    params?: Record<string, string | number | boolean | (string | number | boolean)[]>
): string {
    const normalizedPath = path.replace(/^\/+/, '');
    const url = new URL(normalizedPath, `${apiBaseUrl}/`);

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

export const authTokenId = 'access_token';
export const refreshTokenId = 'refresh_token';
