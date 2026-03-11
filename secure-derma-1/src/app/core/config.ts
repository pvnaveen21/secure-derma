import { environment } from 'src/environments/environment';

const baseUrl = environment.BASEURL_API;

export const appDetails = {
    name: 'Emerald TEJ',
    description: '',
    year: new Date().getFullYear(),
    dbName: 'tej',
    dbVersion: 1
};

// Get API URL with query params
// export function GetApiUrl(path: string, params?: Record<string, string | number | boolean>): string {
//     const url = new URL(baseUrl + path);

//     if (params) {
//         Object.entries(params).forEach(([key, value]) => {
//             url.searchParams.append(key, String(value));
//         });
//     }

//     return url.toString();
// }
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


export const authTokenId = 'access_token';
export const refreshTokenId = 'refresh_token';
