import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, of, map } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { InterfaceService } from '@app/services/core/interface.service';


@Injectable({
  providedIn: 'root'
})
export class CacheService extends InterfaceService {

  // Cache store using Map
  private cache = new Map<string, any>();
  // Timestamps for cache entries
  private cacheTimestamps = new Map<string, number>();
  // Cache expiry time: 5 minutes (300,000 milliseconds)
  private readonly CACHE_EXPIRY_MS = 5 * 60 * 1000;
  // BehaviorSubject to hold current page data
  private dataSubject = new BehaviorSubject<any>(null);

  constructor(
    http: HttpClient,
  ) {
    super('', http);
  }

  // Get observable for datatable
  getDataObservable(): Observable<any> {
    return this.dataSubject.asObservable();
  }

  // Fetch data for a page, with optional revalidation
  fetchData(
    method: 'get' | 'post',
    url: string,
    body: any = null,
    params: HttpParams = new HttpParams(),
    key: string | null = null,
    page: number = 0,
    pageSize: number = 0,
    revalidate: boolean = false,
  ): Observable<any> {

    const cacheKey = this.getCacheKey(url, page, params);
    const now = Date.now();
    const cachedTime = this.cacheTimestamps.get(cacheKey);
    const isCacheStale = cachedTime ? (now - cachedTime) > this.CACHE_EXPIRY_MS : true;

    if (revalidate || isCacheStale) {
      this.cache.delete(cacheKey);
      this.cacheTimestamps.delete(cacheKey);
    }

    if (this.cache.has(cacheKey)) {
      const cachedData = this.cache.get(cacheKey)!;
      const paginatedData: any = {
        page,
        data: key ? cachedData[key] : cachedData,
        totalRecords: cachedData.count || (key ? cachedData[key].length : cachedData.length)
      };
      this.dataSubject.next(paginatedData);
      return of(paginatedData);
    }

    return this.simulateApiCall(method, url, body, params, page, pageSize).pipe(
      map(data => {
        this.cache.set(cacheKey, data);
        this.cacheTimestamps.set(cacheKey, Date.now());
        const paginatedData: any = {
          page,
          data: key ? data[key] : data,
          totalRecords: data.count || (key ? data[key].length : data.length)
        };
        this.dataSubject.next(paginatedData);
        return paginatedData;
      }),
      catchError(this.handleError)
    );

  }


  // Simulate API call to fetch 100 records for a page
  private simulateApiCall(
    method: 'get' | 'post',
    url: string,
    body: any = null,
    params: HttpParams = new HttpParams(),
    page: number,
    pageSize: number
  ): Observable<any> {
    if (page) {
      params = params.set('offset', (page - 1) * pageSize);
      params = params.set('limit', pageSize);
    }
    return this.http.request(method, this.getApiUrl(url), {
      body: method === 'post' ? body : null,
      params: params,
      headers: this.getHttpOptions().headers
    }).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  private getCacheKey(url: string, page: number, params: HttpParams): string {
    return `${url}|page=${page}|${params.toString()}`;
  }

  // Clear entire cache if needed
  private cleanupCache(): void {
    const now = Date.now();
    this.cacheTimestamps.forEach((timestamp, key) => {
      if (now - timestamp > this.CACHE_EXPIRY_MS) {
        this.cache.delete(key);
        this.cacheTimestamps.delete(key);
      }
    });
  }

}
