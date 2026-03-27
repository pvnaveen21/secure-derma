import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, catchError } from 'rxjs';
import { InterfaceService } from './core/interface.service';

@Injectable({
  providedIn: 'root'
})
export class VisitTrackingService extends InterfaceService {
  private readonly visitorStorageKey = 'secure_derma_visitor_key';
  private initialized = false;

  constructor(
    http: HttpClient,
    @Inject(PLATFORM_ID) private readonly platformId: object,
    @Inject(DOCUMENT) private readonly document: Document
  ) {
    super('', http);
  }

  init(): void {
    this.initialized = true;
  }

  trackPageView(path: string) {
    if (!isPlatformBrowser(this.platformId) || !this.initialized) {
      return EMPTY;
    }

    const normalizedPath = this.normalizePath(path);
    return this.http.post(
      this.getApiUrl('/visits/'),
      {
        path: normalizedPath,
        referrer: this.document.referrer || '',
        visitor_key: this.getVisitorKey()
      },
      this.getHttpOptions('json', { auth: false })
    ).pipe(
      catchError(() => EMPTY)
    );
  }

  private getVisitorKey(): string {
    const storage = window.localStorage;
    const existing = storage.getItem(this.visitorStorageKey)?.trim();
    if (existing) {
      return existing;
    }

    const nextValue = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    storage.setItem(this.visitorStorageKey, nextValue);
    return nextValue;
  }

  private normalizePath(path: string): string {
    const rawValue = String(path || '').trim();
    if (!rawValue) {
      return '/';
    }

    try {
      const url = new URL(rawValue, window.location.origin);
      return url.pathname || '/';
    } catch {
      return rawValue.startsWith('/') ? rawValue : `/${rawValue}`;
    }
  }
}
