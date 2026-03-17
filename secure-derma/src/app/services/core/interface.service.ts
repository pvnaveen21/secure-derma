import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ACCESS_TOKEN, getToken } from '@app/core/token';
import { catchError, Observable, throwError } from 'rxjs';
import { GetApiUrl } from './config';
// import { GetApiUrl } from '@app/core/config';

interface HttpOptionsConfig {
  auth?: boolean; // Default true
  allowCredentials?: boolean; // Default false
}

const HttpOptionDefaultValue: HttpOptionsConfig = {
  auth: true,
  allowCredentials: false
}
@Injectable({
  providedIn: 'root'
})
export class InterfaceService {

  constructor(@Inject(String) private endUrl: string, protected http: HttpClient) {
  }

  // Creates HTTP options for different data types
  protected getHttpOptions(type: 'json' | 'file' = 'json', _config?: HttpOptionsConfig): {
    headers: HttpHeaders;
    withCredentials: boolean
  } {
    const config: HttpOptionsConfig = Object.assign(JSON.parse(JSON.stringify(HttpOptionDefaultValue)), _config);
    let headers = new HttpHeaders();

    if (config.auth && getToken(ACCESS_TOKEN)) {
      headers = headers.set('Authorization', `Bearer ${getToken(ACCESS_TOKEN)}`);
    }

    if (type === 'json') {
      headers = headers.set('Content-Type', 'application/json');
    }

    return { headers, withCredentials: !!config.allowCredentials };
  }

  // Error handling
  protected handleError(error: any): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    if (error instanceof HttpErrorResponse) {
      if (error.error instanceof ErrorEvent) {
        // client-side or network error
        errorMessage = `Client-side error: ${error.error.message}`;
      } else {
        // backend returned an unsuccessful response code
        errorMessage = `Server-side error: ${error.status} ${error.message}`;
        if (error.error) {
          errorMessage = error.error;
        }
      }
    } else {
      // non-HTTP errors
      console.log('errrr', error)
      errorMessage = error?.detail || error;
    }
    const formattedError = errorMessage ? errorMessage : 'Internel server error.';
    console.error('An error occurred:', errorMessage);
    return throwError(() => formattedError);
  }


  // Build API URL
  protected getApiUrl(path: string, params?: any): string {
    return GetApiUrl(path, params);
  }

  list(params = {}, suffix = ''): Observable<any> {
    return this.http.get(this.getApiUrl(this.endUrl + suffix, params), this.getHttpOptions()).pipe(
      catchError(this.handleError)
    );
  }

  retrieve(id: number): Observable<any> {
    return this.http.get(this.getApiUrl(`${this.endUrl}${id}`), this.getHttpOptions()).pipe(
      catchError(this.handleError)
    );
  }

  create(resource: any, suffix = ''): Observable<any> {
    return this.http.post(this.getApiUrl(this.endUrl + suffix), resource, this.getHttpOptions()).pipe(
      catchError(this.handleError)
    );
  }

  update(resource: any, id?: number, suffix = ''): Observable<any> {
    return this.http.patch(this.getApiUrl(`${this.endUrl}${id}/${suffix}`), resource, this.getHttpOptions()).pipe(
      catchError(this.handleError)
    );
  }

  delete(resourceId: any, suffix = ''): Observable<any> {
    return this.http.delete(this.getApiUrl(`${this.endUrl + suffix}${resourceId}/`), this.getHttpOptions()).pipe(
      catchError(this.handleError)
    );
  }

  payloadWithFile(formValues: any, isPostRequest = true, url?: string, suffix = ''): Observable<any> {
    const formData = new FormData();
    Object.keys(formValues).forEach((key) => {
      const data = formValues[key];
      if (data instanceof File) {
        formData.append(key, data, data.name);
      } else {
        formData.append(key, data);
      }
    });

    const requestUrl = url || this.getApiUrl(this.endUrl + suffix);
    const options = { headers: this.getHttpOptions(undefined).headers };

    return isPostRequest
      ? this.http.post(requestUrl, formData, options).pipe(catchError(this.handleError))
      : this.http.put(requestUrl, formData, options).pipe(catchError(this.handleError));
  }

  deleteWithPayload(payload: any, url?: string): Observable<any> {
    const requestUrl = url || this.getApiUrl(this.endUrl);
    return this.http
      .request('DELETE', requestUrl, {
        headers: this.getHttpOptions().headers,
        body: payload
      })
      .pipe(catchError(this.handleError));
  }
}
