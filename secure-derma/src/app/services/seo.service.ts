import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';

export interface SeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  robots?: string;
  image?: string;
  type?: string;
  keywords?: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly siteName = 'Secure Derma';
  private readonly siteUrl = environment.SITE_URL.replace(/\/$/, '');

  constructor(
    private readonly title: Title,
    private readonly meta: Meta,
    @Inject(DOCUMENT) private readonly document: Document,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  updateSeo(config: SeoConfig): void {
    const normalizedTitle = config.title.replace(new RegExp(`\\s*\\|?\\s*${this.siteName}`, 'ig'), '').trim();
    const fullTitle = normalizedTitle ? `${this.siteName} | ${normalizedTitle}` : this.siteName;
    const resolvedCanonical = this.resolveCanonicalUrl(config.canonicalPath);
    const resolvedImage = this.resolveAssetUrl(config.image || environment.DEFAULT_OG_IMAGE);

    this.title.setTitle(fullTitle);
    this.updateTag('name', 'description', config.description);
    this.updateTag('name', 'robots', config.robots || 'index,follow');
    this.updateTag('name', 'application-name', this.siteName);
    this.updateTag('name', 'apple-mobile-web-app-title', this.siteName);
    if (environment.GOOGLE_SITE_VERIFICATION) {
      this.updateTag('name', 'google-site-verification', environment.GOOGLE_SITE_VERIFICATION);
    }
    this.updateTag('property', 'og:title', fullTitle);
    this.updateTag('property', 'og:description', config.description);
    this.updateTag('property', 'og:type', config.type || 'website');
    this.updateTag('property', 'og:site_name', this.siteName);
    this.updateTag('property', 'og:locale', 'en_IN');
    this.updateTag('property', 'og:url', resolvedCanonical);
    this.updateTag('name', 'twitter:card', resolvedImage ? 'summary_large_image' : 'summary');
    this.updateTag('name', 'twitter:title', fullTitle);
    this.updateTag('name', 'twitter:description', config.description);

    if (config.keywords) {
      this.updateTag('name', 'keywords', config.keywords);
    } else {
      this.meta.removeTag("name='keywords'");
    }

    this.setCanonical(resolvedCanonical);

    if (resolvedImage) {
      this.updateTag('property', 'og:image', resolvedImage);
      this.updateTag('name', 'twitter:image', resolvedImage);
    } else {
      this.meta.removeTag("property='og:image'");
      this.meta.removeTag("name='twitter:image'");
    }

    if (config.structuredData) {
      this.setStructuredData('page', config.structuredData);
    } else {
      this.removeStructuredData('page');
    }
  }

  setSiteStructuredData(): void {
    this.setStructuredData('organization', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: this.siteName,
      url: this.siteUrl,
      logo: this.resolveAssetUrl('/assets/secure-derma/SecureDerma_LightMode.png'),
      email: 'support@securederma.in'
    });

    this.setStructuredData('website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: this.siteName,
      url: this.siteUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${this.siteUrl}/collections?search={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    });
  }

  private updateTag(attr: 'name' | 'property', value: string, content: string): void {
    this.meta.updateTag({ [attr]: value, content });
  }

  private resolveCanonicalUrl(canonicalPath?: string): string {
    const fallbackPath = isPlatformBrowser(this.platformId)
      ? `${this.document.location.pathname}${this.document.location.search}`
      : '/';

    return this.resolveUrl(canonicalPath || fallbackPath);
  }

  private resolveAssetUrl(path?: string): string | undefined {
    if (!path) {
      return undefined;
    }

    return this.resolveUrl(path);
  }

  private resolveUrl(path: string): string {
    try {
      return new URL(path, this.siteUrl).toString();
    } catch {
      return this.siteUrl;
    }
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setStructuredData(id: string, value: Record<string, unknown> | Array<Record<string, unknown>>): void {
    let script = this.document.head.querySelector(`script[data-seo-ld="${id}"]`) as HTMLScriptElement | null;
    if (!script) {
      script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset['seoLd'] = id;
      this.document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(value);
  }

  private removeStructuredData(id: string): void {
    this.document.head.querySelector(`script[data-seo-ld="${id}"]`)?.remove();
  }
}
